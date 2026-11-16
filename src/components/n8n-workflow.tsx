"use client";

import { useEffect, useRef, useState } from "react";
import type { N8nFlow } from "@/lib/n8n-flows";

/** Each workflow's JSON is its own chunk, fetched only when its popup opens. */
const FLOWS: Record<N8nFlow, () => Promise<{ default: unknown }>> = {
  "inbox-to-sheet": () => import("../../data/n8n/inbox-to-sheet.json"),
  "invoice-pdf-to-sheet": () =>
    import("../../data/n8n/invoice-pdf-to-sheet.json"),
};

/**
 * An n8n workflow drawn as n8n draws it: the <n8n-demo> web component (`@n8n_io/n8n-demo-component`) posts the
 * workflow JSON into an iframe of n8n's hosted preview service, which renders the canvas. Our own n8n server is never
 * involved and never named. The component (lit) and the JSON load on mount, which is when the popup opens, so the page
 * itself ships neither. Created imperatively: the element is defined only after the import, and its attributes are
 * read once on connect.
 */
export function N8nWorkflow({
  flow,
  loadingLabel,
  errorLabel,
}: {
  flow: N8nFlow;
  loadingLabel: string;
  errorLabel: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const host = box.current;
    if (!host) return;
    let cancelled = false;
    let demo: HTMLElement | null = null;
    // The component sizes its canvas from a CSS variable, in px: keep it at the popup's height.
    const fit = () =>
      demo?.style.setProperty(
        "--n8n-workflow-min-height",
        `${host.clientHeight}px`,
      );
    const resize = new ResizeObserver(fit);

    Promise.all([import("@n8n_io/n8n-demo-component"), FLOWS[flow]()])
      .then(([, json]) => {
        if (cancelled) return;
        demo = document.createElement("n8n-demo");
        demo.setAttribute("workflow", JSON.stringify(json.default));
        demo.setAttribute("theme", "light");
        demo.setAttribute("collapseformobile", "false"); // the popup is the place to look at it, phone or not
        demo.setAttribute("hidecanvaserrors", "true");
        demo.style.display = "block";
        host.appendChild(demo);
        fit();
        resize.observe(host);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      resize.disconnect();
      demo?.remove();
    };
  }, [flow]);

  return (
    <div ref={box} className="relative h-full overflow-hidden">
      {status !== "ready" && (
        <p
          role={status === "error" ? "alert" : "status"}
          className="text-muted-foreground absolute inset-0 grid place-items-center p-6 text-center text-sm"
        >
          {status === "loading" ? loadingLabel : errorLabel}
        </p>
      )}
    </div>
  );
}
