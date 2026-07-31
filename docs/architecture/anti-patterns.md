# Anti-patterns catalogue

Recurring failure shapes, codified. Candidates carry `CAND-NNN` ids and are promoted on a second
sighting — or on a single high-cost hit, by judgment. Consult this file before reviewing code that
touches a known anti-pattern's surface.

---

## Promoted

_(none yet)_

---

## Candidates

### `CAND-001` — Catch-all middleware matcher swallows API routes

**Sighted:** 2026-07-31, [`src/middleware.ts`](../../src/middleware.ts) — **fixed same day**

A locale-routing middleware matched every path that was not a Next.js internal and contained no dot:

```
matcher: ["/((?!_next/|_vercel/|.*\\..*).*)"]
```

`/api/preset/guest-token` has no dot, so it matched, and the middleware rewrote it to
`/en/api/preset/guest-token` — a path with no route — which 404s. The existing `feed.xml` route
survived only by accident: it has a dot in its name.

**Why it stayed hidden:** the repo had no API routes when the middleware was written, so the defect
had no symptom until the first one was added. The failure then presents as "my new endpoint 404s",
which reads as a routing or filename mistake — and the middleware is the last place anyone looks.

**Shape of the bug:** an exclusion list written as "everything except the things that exist today".
Path-shape heuristics — "has a dot" standing in for "is a static asset" — encode an assumption that
silently expires.

**Fix applied:** `api/` named explicitly in the negative lookahead alongside `_next/` and `_vercel/`.

**Generalisation to watch for:** any catch-all matcher, rewrite rule, proxy config or route guard
whose exclusions were derived by enumerating current paths. When adding a new _class_ of route
(API, webhook, health check, auth callback), check the catch-alls before debugging the route itself.

---

### `CAND-002` — Superseded spec still reads as authoritative

**Sighted:** 2026-07-31, [`docs/01-solution-overview.md`](../01-solution-overview.md) and
[`docs/02-implementation-boilerplate.md`](../02-implementation-boilerplate.md)

Both documents open by instructing the reader — explicitly an AI assistant — to treat them as the
source of truth and not to invent alternative architectures. Both described self-hosted Superset in
confident, specific, immediately actionable detail: a config file to write, containers to restart,
roles to create, endpoints to call.

The deployment decision then changed to Preset.io managed (`ADR-0001`), invalidating roughly a third
of both documents. The prose gave no signal of this. A session following the instruction it was
given would have written a `superset_config.py` for a platform that exposes no config file, and
called an authentication endpoint that does not exist on that host.

**Shape of the bug:** confidence markers ("source of truth", "do not change", "do not redesign") are
written once and never re-earned. They make a document _harder_ to question exactly as it becomes
less correct, and they are most dangerous in a document aimed at an agent instructed to comply.

**Second-order form, sighted the same day:** the corrected docs were copied into a second repo while
the original repo still held them. Two authoritative copies, one of which will silently rot. Resolved
by making this repo canonical and retiring the other.

**Fix:** correct documents in place; mark superseded sections explicitly rather than deleting them,
so the delta itself stays discoverable. Keep exactly one copy.

**Generalisation to watch for:** any decision that invalidates part of a spec must be paired with an
edit to that spec in the same unit of work — not a follow-up task. An ADR that records a change
without amending what it contradicts leaves two sources of truth, and the more assertive one wins.

---

### `CAND-003` — Response shape assumed flat when the provider nests it

**Sighted:** 2026-07-31, `ADR-0001` (anticipated during the provider swap, guarded before first hit).
**Sighted again the same day, in the opposite direction:** `ADR-0003` reversed the vendor
choice, so the tokens moved back to the response root. The guard in
[`src/lib/superset.ts`](../../src/lib/superset.ts) was kept regardless — an assertion that
names the missing field costs nothing and survives the next envelope change too. Two
sightings in one day; promote on the third.

Self-hosted Superset returns `{ access_token }` and `{ token }` at the response root. Preset returns
the same values at `payload.access_token` and `data.payload.token`. Code ported between them parses
without error and yields `undefined`.

**Why it is worse than a parse failure:** `undefined` propagates. It becomes
`Authorization: Bearer undefined`, and the resulting 401 points at credentials — the one thing that
is actually correct — while the real defect is two lines earlier in a destructure.

**Fix applied:** [`src/lib/superset.ts`](../../src/lib/superset.ts) asserts a non-empty string at
each extraction point and fails with a message naming the exact field that was missing.

**Generalisation to watch for:** when swapping a provider for a compatible one, response _envelope_
differences are more dangerous than response _content_ differences — they fail late, far from the
cause, and with a misleading error. Assert at the boundary, and name the field in the message.

---

### `CAND-004` — Build-vs-buy decided without a number on the "buy" side

**Sighted:** 2026-07-31, `ADR-0001` → reversed by `ADR-0003` within hours

`ADR-0001` chose a managed vendor over self-hosting, comparing the two on operational
burden — config files, containers, TLS, patching — and concluding the managed option
deleted most of that category. All true. The section headed "Cost/effort reality check"
described the recurring cost as "a subscription instead of a VPS bill plus a
security-patch treadmill" and named **no figure**.

The figure was $500/month minimum, for embedded viewer licences, on a vendor pricing page
that states it plainly. Against a $12–24/month VPS, for a marketing showcase. Finding it
reversed the decision the same day.

**Why it stayed hidden:** the plan gate ("Professional or Enterprise") *looked* like the
answer to the cost question. It was a real constraint, it was documented, it was checked —
and it was the smaller of the two costs. A partial answer in the right shape stops the
search more effectively than no answer at all.

**Shape of the bug:** an architecture decision that compares options on the axis that is
easy to reason about (effort, elegance, ops burden) and treats the axis that requires
looking something up (price, quota, licence terms) as a footnote. The ADR reads as
complete because every section is filled in.

**Fix:** a build-vs-buy ADR must state a number for the buy side, with a source, or say
explicitly that it was not checked. "A subscription" is not a cost.

**Generalisation to watch for:** any decision whose consequences section describes a
trade-off in adjectives on one side and specifics on the other. Also: vendor gates found
*during implementation* ("this needs the Pro plan") are rarely the whole pricing story —
check the pricing page for add-ons attached to the specific feature, not just the tier.
