"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const LiveChat = dynamic(() => import("./live-chat").then((m) => m.LiveChat), {
  ssr: false,
});

/**
 * The live chat's split point. Nothing of the widget is in the first paint: this wrapper renders nothing until the
 * browser is idle after hydration, and only then is the widget's chunk requested. Mounted by the site layout only
 * when `isLiveChatConfigured()` (docs/livechat/README.md).
 */
export function LiveChatLazy() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setReady(true), {
        timeout: 4000,
      });
      return () => window.cancelIdleCallback(id);
    }
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return ready ? <LiveChat /> : null;
}
