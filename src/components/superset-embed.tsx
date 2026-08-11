"use client";

import { embedDashboard } from "@superset-ui/embedded-sdk";
import { useEffect, useRef, useState } from "react";
import { env } from "@/lib/env";

/**
 * Mounts a self-hosted Superset dashboard in an iframe using a short-lived guest token.
 *
 * The SDK calls `fetchGuestToken` again before each expiry, so /api/superset/guest-token
 * must stay callable for the whole visit — a dashboard that dies after five minutes means
 * that refresh is failing, not that the initial mount was wrong. Verify on a real deploy
 * and leave the page open past the six-minute mark; anything shorter proves nothing.
 *
 * Copy is passed in rather than read here so this stays a locale-agnostic client component.
 */
export function SupersetEmbed({
  slug,
  embedId,
  title,
  loadingLabel,
  errorLabel,
}: {
  slug: string;
  embedId: string;
  title: string;
  loadingLabel: string;
  errorLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const supersetDomain = env.NEXT_PUBLIC_SUPERSET_DOMAIN;

  useEffect(() => {
    const mountPoint = ref.current;
    // Unconfigured instance: fail visibly rather than handing the SDK `undefined`, which
    // fails deep inside an iframe with no useful message. (lib/work.ts hides Superset
    // showcases entirely while this is unset, so reaching here means something is off.)
    if (!mountPoint || !supersetDomain) {
      setStatus("failed");
      return;
    }

    let cancelled = false;

    // No `referrerPolicy` here: unlike Preset, self-hosted Superset does not validate the
    // Referer against an allow-list. Who may frame the dashboard is decided by the CSP
    // `frame-ancestors` directive in superset_config.py instead.
    const embedded = embedDashboard({
      id: embedId,
      supersetDomain,
      mountPoint,
      dashboardUiConfig: {
        hideTitle: true,
        hideChartControls: true,
        filters: { expanded: false },
      },
      fetchGuestToken: async () => {
        const res = await fetch("/api/superset/guest-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        });
        if (!res.ok)
          throw new Error(`Guest token request failed: ${res.status}`);
        return (await res.json()).token;
      },
      iframeTitle: title,
    });

    embedded.then(
      () => {
        if (!cancelled) setStatus("ready");
      },
      () => {
        if (!cancelled) setStatus("failed");
      },
    );

    return () => {
      cancelled = true;
      embedded.then((e) => e.unmount()).catch(() => {});
    };
  }, [slug, embedId, title, supersetDomain]);

  return (
    /* Sized by the caller, not here: the showcase page pins the report box to the
       leftover viewport height, so a fixed height here would fight it. */
    <div className="relative h-full w-full">
      <div ref={ref} className="superset-container h-full w-full" />
      {status !== "ready" && (
        <p
          className="text-muted-foreground absolute inset-0 flex items-center justify-center p-6 text-center text-sm"
          role={status === "failed" ? "alert" : "status"}
        >
          {status === "failed" ? errorLabel : loadingLabel}
        </p>
      )}
    </div>
  );
}
