#!/usr/bin/env python3
"""
gtm_client.py — a small, quota-aware client for the Google Tag Manager API v2.

Auth (pick one via env):
  GTM_SERVICE_ACCOUNT_FILE=/path/sa.json        # headless (recommended)
  GTM_OAUTH_CLIENT_SECRETS=/path/client.json    # interactive, caches token at GTM_TOKEN_FILE
Optional: GTM_SCOPES=comma,separated  GTM_MIN_INTERVAL=4.2 (seconds between calls)

Library use:
  from gtm_client import GTM
  gtm = GTM()
  ws = gtm.get_or_create_workspace("accounts/1/containers/2", "feat: x")
  gtm.apply_spec(ws["path"], json.load(open("spec.json")))

CLI: python gtm_client.py --help
"""
from __future__ import annotations

import argparse
import copy
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from typing import Any

SCOPE_BASE = "https://www.googleapis.com/auth/"
DEFAULT_SCOPES = [
    SCOPE_BASE + "tagmanager.readonly",
    SCOPE_BASE + "tagmanager.edit.containers",
    SCOPE_BASE + "tagmanager.delete.containers",
    SCOPE_BASE + "tagmanager.edit.containerversions",
    SCOPE_BASE + "tagmanager.publish",
    SCOPE_BASE + "tagmanager.manage.users",
    SCOPE_BASE + "tagmanager.manage.accounts",
]

# Built-in triggers present in every web container (not returned by triggers.list).
BUILTIN_TRIGGERS = {
    "All Pages": "2147479553",
    "Initialization - All Pages": "2147479573",
    "Consent Initialization - All Pages": "2147479572",
}

# Built-in variable type -> display name used in {{...}} references.
BUILTIN_VAR_NAMES = {
    "pageUrl": "Page URL", "pageHostname": "Page Hostname", "pagePath": "Page Path",
    "referrer": "Referrer", "event": "Event", "clickElement": "Click Element",
    "clickClasses": "Click Classes", "clickId": "Click ID", "clickTarget": "Click Target",
    "clickUrl": "Click URL", "clickText": "Click Text", "formElement": "Form Element",
    "formClasses": "Form Classes", "formId": "Form ID", "formTarget": "Form Target",
    "formUrl": "Form URL", "formText": "Form Text", "errorMessage": "Error Message",
    "errorUrl": "Error URL", "errorLine": "Error Line",
    "newHistoryFragment": "New History Fragment", "oldHistoryFragment": "Old History Fragment",
    "newHistoryState": "New History State", "oldHistoryState": "Old History State",
    "historySource": "History Source", "containerId": "Container ID",
    "containerVersion": "Container Version", "debugMode": "Debug Mode",
    "randomNumber": "Random Number", "environmentName": "Environment Name", "htmlId": "HTML ID",
    "scrollDepthThreshold": "Scroll Depth Threshold", "scrollDepthUnits": "Scroll Depth Units",
    "scrollDirection": "Scroll Direction", "elementVisibilityRatio": "Percent Visible",
    "elementVisibilityTime": "On-Screen Duration",
    "elementVisibilityFirstTime": "On-Screen First Time",
    "elementVisibilityRecentTime": "On-Screen Recent Time",
    "videoProvider": "Video Provider", "videoUrl": "Video URL", "videoTitle": "Video Title",
    "videoDuration": "Video Duration", "videoPercent": "Video Percent",
    "videoVisible": "Video Visible", "videoStatus": "Video Status",
    "videoCurrentTime": "Video Current Time",
}
INTERNAL_REFS = {"_event", "_url", "_triggers", "_html", "_dataLayer"}
REF_RE = re.compile(r"\{\{([^{}]+)\}\}")


def norm_enum(v: Any) -> str:
    """PAGEVIEW == pageview == page_view for comparisons."""
    return re.sub(r"[^A-Z0-9]", "", str(v).upper())


# --------------------------------------------------------------------------- auth
def _load_credentials(scopes: list[str]):
    sa = os.environ.get("GTM_SERVICE_ACCOUNT_FILE")
    secrets = os.environ.get("GTM_OAUTH_CLIENT_SECRETS")
    if sa:
        from google.oauth2 import service_account
        return service_account.Credentials.from_service_account_file(sa, scopes=scopes)
    if secrets:
        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        token_file = os.environ.get("GTM_TOKEN_FILE",
                                    os.path.expanduser("~/.gtm-manager/token.json"))
        creds = None
        if os.path.exists(token_file):
            creds = Credentials.from_authorized_user_file(token_file, scopes)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                creds = InstalledAppFlow.from_client_secrets_file(secrets, scopes).run_local_server(port=0)
            os.makedirs(os.path.dirname(token_file), exist_ok=True)
            with open(token_file, "w") as f:
                f.write(creds.to_json())
        return creds
    raise SystemExit("Set GTM_SERVICE_ACCOUNT_FILE or GTM_OAUTH_CLIENT_SECRETS "
                     "(see references/setup-from-zero.md)")


# --------------------------------------------------------------------------- client
class GTM:
    def __init__(self, credentials=None, min_interval: float | None = None):
        from googleapiclient.discovery import build
        scopes = [s.strip() for s in os.environ.get("GTM_SCOPES", "").split(",") if s.strip()] or DEFAULT_SCOPES
        creds = credentials or _load_credentials(scopes)
        self.svc = build("tagmanager", "v2", credentials=creds, cache_discovery=False)
        # Quota: 25 requests / 100 s per project -> 4 s; add margin.
        self.min_interval = float(min_interval or os.environ.get("GTM_MIN_INTERVAL", 4.2))
        self._last = 0.0
        self.log = lambda *a: print(*a, file=sys.stderr)

    # ---- transport ------------------------------------------------------------
    def call(self, request, retries: int = 5):
        """Execute a googleapiclient request with pacing and backoff."""
        from googleapiclient.errors import HttpError
        for attempt in range(retries + 1):
            wait = self.min_interval - (time.monotonic() - self._last)
            if wait > 0:
                time.sleep(wait)
            try:
                self._last = time.monotonic()
                return request.execute()
            except HttpError as e:
                status = e.resp.status
                body = e.content.decode("utf-8", "replace") if e.content else ""
                retryable = status in (429, 500, 502, 503, 504) or (status == 403 and "quota" in body.lower()) \
                    or (status == 403 and "rate" in body.lower())
                if not retryable or attempt == retries:
                    raise
                delay = min(120, 10 * (2 ** attempt))
                self.log(f"[gtm] HTTP {status}, retrying in {delay}s ({attempt + 1}/{retries})")
                time.sleep(delay)

    def _list_all(self, req_factory, key: str) -> list[dict]:
        """Paginate: req_factory(pageToken) -> request."""
        out, token = [], None
        while True:
            resp = self.call(req_factory(token)) or {}
            out.extend(resp.get(key, []))
            token = resp.get("nextPageToken")
            if not token:
                return out

    # ---- accounts / containers -------------------------------------------------
    def accounts(self) -> list[dict]:
        return self._list_all(lambda t: self.svc.accounts().list(pageToken=t), "account")

    def containers(self, account_path: str) -> list[dict]:
        return self._list_all(lambda t: self.svc.accounts().containers().list(parent=account_path, pageToken=t), "container")

    def find_container(self, account_path: str, name_or_public_id: str) -> dict | None:
        for c in self.containers(account_path):
            if c.get("name") == name_or_public_id or c.get("publicId") == name_or_public_id:
                return c
        return None

    def create_container(self, account_path: str, name: str, usage_context: str = "web", **extra) -> dict:
        body = {"name": name, "usageContext": [usage_context], **extra}
        return self.call(self.svc.accounts().containers().create(parent=account_path, body=body))

    def snippet(self, container_path: str) -> dict:
        return self.call(self.svc.accounts().containers().snippet(path=container_path))

    # ---- workspaces -------------------------------------------------------------
    def workspaces(self, container_path: str) -> list[dict]:
        return self._list_all(lambda t: self.svc.accounts().containers().workspaces().list(parent=container_path, pageToken=t), "workspace")

    def get_or_create_workspace(self, container_path: str, name: str, description: str = "") -> dict:
        for ws in self.workspaces(container_path):
            if ws.get("name") == name:
                return ws
        return self.call(self.svc.accounts().containers().workspaces().create(
            parent=container_path, body={"name": name, "description": description}))

    def delete_workspace(self, ws_path: str) -> None:
        self.call(self.svc.accounts().containers().workspaces().delete(path=ws_path))

    # ---- entities (3-4 list calls total) -----------------------------------------
    def entities(self, ws_path: str) -> dict[str, list[dict]]:
        W = self.svc.accounts().containers().workspaces()
        return {
            "variables": self._list_all(lambda t: W.variables().list(parent=ws_path, pageToken=t), "variable"),
            "triggers": self._list_all(lambda t: W.triggers().list(parent=ws_path, pageToken=t), "trigger"),
            "tags": self._list_all(lambda t: W.tags().list(parent=ws_path, pageToken=t), "tag"),
            "builtins": self._list_all(lambda t: W.built_in_variables().list(parent=ws_path, pageToken=t), "builtInVariable"),
            "folders": self._list_all(lambda t: W.folders().list(parent=ws_path, pageToken=t), "folder"),
        }

    def enable_builtins(self, ws_path: str, types: list[str], existing: list[dict] | None = None) -> list[dict]:
        have = {norm_enum(b.get("type")) for b in (existing if existing is not None else self.entities_builtins(ws_path))}
        missing = [t for t in types if norm_enum(t) not in have]
        if not missing:
            return []
        resp = self.call(self.svc.accounts().containers().workspaces().built_in_variables().create(parent=ws_path, type=missing))
        return resp.get("builtInVariable", [])

    def entities_builtins(self, ws_path: str) -> list[dict]:
        W = self.svc.accounts().containers().workspaces()
        return self._list_all(lambda t: W.built_in_variables().list(parent=ws_path, pageToken=t), "builtInVariable")

    def _res(self, kind: str):
        W = self.svc.accounts().containers().workspaces()
        return {"variable": W.variables(), "trigger": W.triggers(), "tag": W.tags(), "folder": W.folders()}[kind]

    @staticmethod
    def _strip(body: dict) -> dict:
        b = copy.deepcopy(body)
        for k in ("path", "accountId", "containerId", "workspaceId", "fingerprint", "tagManagerUrl",
                  "tagId", "triggerId", "variableId", "folderId", "workspaceChange"):
            b.pop(k, None)
        return b

    def upsert(self, kind: str, ws_path: str, body: dict, existing: list[dict] | None = None) -> dict:
        """Create or update by name. `existing` avoids an extra list call."""
        res = self._res(kind)
        if existing is None:
            existing = self.entities(ws_path)[kind + "s"]
        match = next((e for e in existing if e.get("name") == body.get("name")), None)
        clean = self._strip(body)
        if match:
            merged = {**self._strip(match), **clean}
            if self._strip(match) == merged:
                self.log(f"[gtm] {kind} unchanged: {body['name']}")
                return match
            self.log(f"[gtm] update {kind}: {body['name']}")
            return self.call(res.update(path=match["path"], fingerprint=match.get("fingerprint"), body=merged))
        self.log(f"[gtm] create {kind}: {body['name']}")
        return self.call(res.create(parent=ws_path, body=clean))

    def upsert_variable(self, ws_path, body, existing=None): return self.upsert("variable", ws_path, body, existing)
    def upsert_trigger(self, ws_path, body, existing=None): return self.upsert("trigger", ws_path, body, existing)
    def upsert_tag(self, ws_path, body, existing=None): return self.upsert("tag", ws_path, body, existing)
    def upsert_folder(self, ws_path, body, existing=None): return self.upsert("folder", ws_path, body, existing)

    def delete(self, kind: str, path: str) -> None:
        self.call(self._res(kind).delete(path=path))

    # ---- versions -----------------------------------------------------------------
    def quick_preview(self, ws_path: str) -> dict:
        return self.call(self.svc.accounts().containers().workspaces().quick_preview(path=ws_path))

    def create_version(self, ws_path: str, name: str, notes: str = "") -> dict:
        resp = self.call(self.svc.accounts().containers().workspaces().create_version(
            path=ws_path, body={"name": name, "notes": notes}))
        if resp.get("compilerError"):
            raise RuntimeError("Container failed to compile; nothing versioned. "
                               "Run quick_preview / open the workspace in the UI for details: " + json.dumps(resp)[:2000])
        if not resp.get("containerVersion"):
            raise RuntimeError("No containerVersion in response (merge conflict?): " + json.dumps(resp)[:2000])
        return resp["containerVersion"]

    def publish(self, version_path: str, fingerprint: str | None = None) -> dict:
        kw = {"path": version_path}
        if fingerprint:
            kw["fingerprint"] = fingerprint
        return self.call(self.svc.accounts().containers().versions().publish(**kw))

    def live_version(self, container_path: str) -> dict:
        return self.call(self.svc.accounts().containers().versions().live(parent=container_path))

    def export(self, container_path: str) -> dict:
        """UI-importable export of the live version."""
        v = self.live_version(container_path)
        return {"exportFormatVersion": 2,
                "exportTime": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                "containerVersion": v}

    # ---- declarative spec ------------------------------------------------------------
    def apply_spec(self, ws_path: str, spec: dict, dry_run: bool = False) -> dict:
        """
        spec = {
          "builtInVariables": ["pageUrl", ...],
          "folders":   [{"name": "GA4"}],
          "variables": [{"name":..., "type":..., "parameter":[...], "folder": "GA4"}],
          "triggers":  [{"name":..., "type":..., ...}],
          "tags":      [{"name":..., "type":..., "parameter":[...],
                         "firingTriggers": ["CE - purchase", "All Pages"],
                         "blockingTriggers": [...], "folder": "GA4", ...}]
        }
        Everything is matched by name. Returns a plan/result summary.
        """
        problems = validate_spec(spec)
        if problems:
            raise ValueError("Spec problems:\n  - " + "\n  - ".join(problems))
        if dry_run:
            return {"dry_run": True, "plan": plan_spec(spec)}

        ents = self.entities(ws_path)
        result = {"builtins": [], "folders": [], "variables": [], "triggers": [], "tags": []}

        result["builtins"] = self.enable_builtins(ws_path, spec.get("builtInVariables", []), ents["builtins"])
        ents["builtins"] += result["builtins"]

        folder_ids: dict[str, str] = {f["name"]: f["folderId"] for f in ents["folders"]}
        for f in spec.get("folders", []):
            out = self.upsert_folder(ws_path, f, ents["folders"])
            folder_ids[out["name"]] = out["folderId"]
            result["folders"].append(out["name"])

        def with_folder(body: dict) -> dict:
            b = dict(body)
            fname = b.pop("folder", None)
            if fname:
                if fname not in folder_ids:
                    raise ValueError(f"folder '{fname}' not found; declare it in spec.folders")
                b["parentFolderId"] = folder_ids[fname]
            return b

        for v in spec.get("variables", []):
            out = self.upsert_variable(ws_path, with_folder(v), ents["variables"])
            _replace_or_append(ents["variables"], out)
            result["variables"].append(out["name"])

        trig_ids: dict[str, str] = {**BUILTIN_TRIGGERS, **{t["name"]: t["triggerId"] for t in ents["triggers"]}}
        # Trigger groups reference other triggers by name via "triggerNames" -> resolve after first pass.
        deferred = []
        for t in spec.get("triggers", []):
            body = with_folder(t)
            names = body.pop("triggerNames", None)
            if names:
                deferred.append((body, names))
                continue
            out = self.upsert_trigger(ws_path, body, ents["triggers"])
            _replace_or_append(ents["triggers"], out)
            trig_ids[out["name"]] = out["triggerId"]
            result["triggers"].append(out["name"])
        for body, names in deferred:
            ids = [_need(trig_ids, n, "trigger") for n in names]
            body.setdefault("parameter", []).append({"type": "LIST", "key": "triggerIds",
                                                     "list": [{"type": "TRIGGER_REFERENCE", "value": i} for i in ids]})
            out = self.upsert_trigger(ws_path, body, ents["triggers"])
            _replace_or_append(ents["triggers"], out)
            trig_ids[out["name"]] = out["triggerId"]
            result["triggers"].append(out["name"])

        for tg in spec.get("tags", []):
            body = with_folder(tg)
            body["firingTriggerId"] = [_need(trig_ids, n, "trigger") for n in body.pop("firingTriggers", [])]
            blocking = [_need(trig_ids, n, "trigger") for n in body.pop("blockingTriggers", [])]
            if blocking:
                body["blockingTriggerId"] = blocking
            out = self.upsert_tag(ws_path, body, ents["tags"])
            _replace_or_append(ents["tags"], out)
            result["tags"].append(out["name"])

        # Post-check: every {{ref}} resolves.
        known = _known_refs(ents)
        unresolved = sorted(_collect_refs(spec) - known)
        if unresolved:
            result["warning_unresolved_refs"] = unresolved
        return result


# --------------------------------------------------------------------------- spec helpers
def _need(mapping: dict, name: str, kind: str) -> str:
    if name not in mapping:
        raise ValueError(f"{kind} '{name}' not found. Known: {sorted(mapping)}")
    return mapping[name]


def _replace_or_append(lst: list[dict], item: dict) -> None:
    for i, e in enumerate(lst):
        if e.get("name") == item.get("name"):
            lst[i] = item
            return
    lst.append(item)


def _collect_refs(obj: Any) -> set[str]:
    refs: set[str] = set()
    if isinstance(obj, dict):
        for v in obj.values():
            refs |= _collect_refs(v)
    elif isinstance(obj, list):
        for v in obj:
            refs |= _collect_refs(v)
    elif isinstance(obj, str):
        refs |= {m.strip() for m in REF_RE.findall(obj)}
    return refs - INTERNAL_REFS


_BUILTIN_BY_NORM = {norm_enum(k): v for k, v in BUILTIN_VAR_NAMES.items()}


def builtin_display_name(type_or_name: str) -> str:
    """'pageUrl' / 'PAGE_URL' / 'Page URL' -> 'Page URL' (falls back to input)."""
    return _BUILTIN_BY_NORM.get(norm_enum(type_or_name), type_or_name)


def _known_refs(ents: dict) -> set[str]:
    names = {v["name"] for v in ents.get("variables", [])}
    for b in ents.get("builtins", []):
        if b.get("name"):
            names.add(b["name"])
        if b.get("type"):
            names.add(builtin_display_name(b["type"]))
    return names


def validate_spec(spec: dict) -> list[str]:
    """Offline checks. Returns a list of problems (empty = ok)."""
    p: list[str] = []
    for section in ("variables", "triggers", "tags", "folders"):
        seen = set()
        for i, e in enumerate(spec.get(section, [])):
            if not isinstance(e, dict) or not e.get("name"):
                p.append(f"{section}[{i}] missing name")
                continue
            if e["name"] in seen:
                p.append(f"{section}: duplicate name '{e['name']}'")
            seen.add(e["name"])
            if section != "folders" and not e.get("type"):
                p.append(f"{section} '{e['name']}' missing type")
            for k in ("firingTriggerId", "blockingTriggerId", "parentFolderId"):
                if k in e:
                    p.append(f"{section} '{e['name']}': use names (firingTriggers/blockingTriggers/folder), not {k}")
    trig_names = set(BUILTIN_TRIGGERS) | {t["name"] for t in spec.get("triggers", []) if isinstance(t, dict)}
    folder_names = {f["name"] for f in spec.get("folders", []) if isinstance(f, dict)}
    for t in spec.get("tags", []):
        if not isinstance(t, dict):
            continue
        if not t.get("firingTriggers"):
            p.append(f"tag '{t.get('name')}' has no firingTriggers (it would never fire)")
        for n in t.get("firingTriggers", []) + t.get("blockingTriggers", []):
            if n not in trig_names:
                p.append(f"tag '{t.get('name')}' references unknown trigger '{n}'")
        if t.get("folder") and t["folder"] not in folder_names:
            p.append(f"tag '{t.get('name')}' references undeclared folder '{t['folder']}'")
    for t in spec.get("triggers", []):
        for n in t.get("triggerNames", []) if isinstance(t, dict) else []:
            if n not in trig_names:
                p.append(f"trigger '{t.get('name')}' group references unknown trigger '{n}'")
    # Variable references: must be declared variables, built-ins listed in spec, or internal.
    declared = {v["name"] for v in spec.get("variables", []) if isinstance(v, dict)}
    declared |= {builtin_display_name(b) for b in spec.get("builtInVariables", [])}
    for r in sorted(_collect_refs(spec) - declared):
        p.append(f"reference {{{{{r}}}}} is not declared in variables/builtInVariables "
                 f"(ok only if it already exists in the workspace — verify)")
    # Downgrade the reference warnings when spec says so.
    if spec.get("allowExternalRefs"):
        p = [x for x in p if not x.startswith("reference {{")]
    return p


def plan_spec(spec: dict) -> dict:
    return {
        "enable_builtins": spec.get("builtInVariables", []),
        "folders": [f["name"] for f in spec.get("folders", [])],
        "variables": [f"{v['name']} ({v['type']})" for v in spec.get("variables", [])],
        "triggers": [f"{t['name']} ({t['type']})" for t in spec.get("triggers", [])],
        "tags": [f"{t['name']} ({t['type']}) <- {', '.join(t.get('firingTriggers', []))}" for t in spec.get("tags", [])],
    }


def export_to_spec(export: dict) -> dict:
    """Convert a UI/API export into the name-based spec format (portable across containers)."""
    cv = export.get("containerVersion", export)
    trig_by_id = {t["triggerId"]: t["name"] for t in cv.get("trigger", [])}
    trig_by_id.update({v: k for k, v in BUILTIN_TRIGGERS.items()})
    folder_by_id = {f["folderId"]: f["name"] for f in cv.get("folder", [])}
    strip = GTM._strip

    def fold(e: dict) -> dict:
        e = strip(e)
        fid = e.pop("parentFolderId", None)
        if fid and fid in folder_by_id:
            e["folder"] = folder_by_id[fid]
        return e

    tags = []
    for t in cv.get("tag", []):
        t = fold(t)
        t["firingTriggers"] = [trig_by_id.get(i, i) for i in t.pop("firingTriggerId", [])]
        b = [trig_by_id.get(i, i) for i in t.pop("blockingTriggerId", [])]
        if b:
            t["blockingTriggers"] = b
        tags.append(t)
    triggers = []
    for t in cv.get("trigger", []):
        t = fold(t)
        for prm in t.get("parameter", []):
            if prm.get("key") == "triggerIds":
                t["triggerNames"] = [trig_by_id.get(x["value"], x["value"]) for x in prm.get("list", [])]
        t["parameter"] = [prm for prm in t.get("parameter", []) if prm.get("key") != "triggerIds"] or None
        if t["parameter"] is None:
            t.pop("parameter")
        triggers.append(t)
    return {
        "builtInVariables": [b["type"] for b in cv.get("builtInVariable", [])],
        "folders": [{"name": f["name"]} for f in cv.get("folder", [])],
        "variables": [fold(v) for v in cv.get("variable", [])],
        "triggers": triggers,
        "tags": tags,
        "allowExternalRefs": True,
    }


# --------------------------------------------------------------------------- CLI
def _pj(obj: Any) -> None:
    print(json.dumps(obj, indent=2, ensure_ascii=False))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("whoami", help="Check auth; list accounts")
    sub.add_parser("accounts", help="List accounts")
    s = sub.add_parser("containers", help="List containers"); s.add_argument("--account", required=True)
    s = sub.add_parser("create-container"); s.add_argument("--account", required=True); s.add_argument("--name", required=True)
    s.add_argument("--context", default="web", help="web|server|android|ios|amp")
    s = sub.add_parser("snippet", help="Install snippet for a container"); s.add_argument("--container", required=True)
    s = sub.add_parser("workspaces"); s.add_argument("--container", required=True)
    s = sub.add_parser("get-or-create-workspace"); s.add_argument("--container", required=True); s.add_argument("--name", required=True)
    s.add_argument("--description", default="")
    s = sub.add_parser("delete-workspace"); s.add_argument("--workspace", required=True)
    s = sub.add_parser("entities", help="Dump tags/triggers/variables/builtins/folders of a workspace")
    s.add_argument("--workspace", required=True); s.add_argument("--out")
    s = sub.add_parser("export", help="Export live version (UI-importable JSON)")
    s.add_argument("--container", required=True); s.add_argument("--out"); s.add_argument("--as-spec", action="store_true")
    s = sub.add_parser("validate-spec", help="Offline spec validation (no API calls)"); s.add_argument("--spec", required=True)
    s = sub.add_parser("apply", help="Apply a spec to a workspace"); s.add_argument("--workspace", required=True)
    s.add_argument("--spec", required=True); s.add_argument("--dry-run", action="store_true")
    s = sub.add_parser("quick-preview", help="Compile check without creating a version"); s.add_argument("--workspace", required=True)
    s = sub.add_parser("create-version"); s.add_argument("--workspace", required=True); s.add_argument("--name", required=True)
    s.add_argument("--notes", default="")
    s = sub.add_parser("publish", help="Publish a version (ask the user first!)"); s.add_argument("--version", required=True)
    s = sub.add_parser("live", help="Show live version header"); s.add_argument("--container", required=True)
    s = sub.add_parser("delete", help="Delete one entity by path"); s.add_argument("--kind", required=True, choices=["tag", "trigger", "variable", "folder"])
    s.add_argument("--path", required=True)

    a = ap.parse_args(argv)

    if a.cmd == "validate-spec":  # offline
        spec = json.load(open(a.spec))
        problems = validate_spec(spec)
        _pj({"ok": not problems, "problems": problems, "plan": plan_spec(spec)})
        return 0 if not problems else 1
    if a.cmd == "apply" and a.dry_run:  # offline too
        spec = json.load(open(a.spec))
        problems = validate_spec(spec)
        _pj({"dry_run": True, "ok": not problems, "problems": problems, "plan": plan_spec(spec)})
        return 0 if not problems else 1

    gtm = GTM()
    if a.cmd in ("whoami", "accounts"):
        accts = gtm.accounts()
        if not accts:
            print("Auth OK but no accounts visible. Add this credential in GTM > Admin > User Management.", file=sys.stderr)
        _pj([{"path": x["path"], "name": x.get("name")} for x in accts])
    elif a.cmd == "containers":
        _pj([{"path": c["path"], "name": c.get("name"), "publicId": c.get("publicId"), "usageContext": c.get("usageContext")} for c in gtm.containers(a.account)])
    elif a.cmd == "create-container":
        _pj(gtm.create_container(a.account, a.name, a.context))
    elif a.cmd == "snippet":
        _pj(gtm.snippet(a.container))
    elif a.cmd == "workspaces":
        _pj([{"path": w["path"], "name": w.get("name"), "description": w.get("description")} for w in gtm.workspaces(a.container)])
    elif a.cmd == "get-or-create-workspace":
        _pj(gtm.get_or_create_workspace(a.container, a.name, a.description))
    elif a.cmd == "delete-workspace":
        gtm.delete_workspace(a.workspace); print("deleted", a.workspace)
    elif a.cmd == "entities":
        ents = gtm.entities(a.workspace)
        if a.out:
            json.dump(ents, open(a.out, "w"), indent=2); print("wrote", a.out)
        else:
            summary = {k: [{"id": e.get(f"{k[:-1]}Id") or e.get("type"), "name": e.get("name"), "type": e.get("type")} for e in v] for k, v in ents.items()}
            _pj(summary)
    elif a.cmd == "export":
        data = gtm.export(a.container)
        if a.as_spec:
            data = export_to_spec(data)
        if a.out:
            json.dump(data, open(a.out, "w"), indent=2); print("wrote", a.out)
        else:
            _pj(data)
    elif a.cmd == "apply":
        spec = json.load(open(a.spec))
        _pj(gtm.apply_spec(a.workspace, spec))
    elif a.cmd == "quick-preview":
        r = gtm.quick_preview(a.workspace)
        _pj({"compilerError": r.get("compilerError", False), "syncStatus": r.get("syncStatus"),
             "entities": {k: len(r.get("containerVersion", {}).get(k, [])) for k in ("tag", "trigger", "variable")}})
    elif a.cmd == "create-version":
        v = gtm.create_version(a.workspace, a.name, a.notes)
        _pj({"path": v["path"], "containerVersionId": v.get("containerVersionId"), "name": v.get("name"),
             "fingerprint": v.get("fingerprint"), "tagManagerUrl": v.get("tagManagerUrl")})
    elif a.cmd == "publish":
        r = gtm.publish(a.version)
        cv = r.get("containerVersion", {})
        _pj({"published": cv.get("path"), "containerVersionId": cv.get("containerVersionId"), "compilerError": r.get("compilerError")})
    elif a.cmd == "live":
        v = gtm.live_version(a.container)
        _pj({"path": v.get("path"), "containerVersionId": v.get("containerVersionId"), "name": v.get("name"),
             "tags": len(v.get("tag", [])), "triggers": len(v.get("trigger", [])), "variables": len(v.get("variable", []))})
    elif a.cmd == "delete":
        gtm.delete(a.kind, a.path); print("deleted", a.path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
