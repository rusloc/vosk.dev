"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { LIVE_CHAT_OPEN_EVENT } from "./open-event";

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
  // A "Contact me" click before the widget's chunk is in (open-event.ts): load it now and open it on mount.
  const [openFirst, setOpenFirst] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.livechat = "on";
    const onOpen = () => {
      setOpenFirst(true);
      setReady(true);
    };
    window.addEventListener(LIVE_CHAT_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener(LIVE_CHAT_OPEN_EVENT, onOpen);
      delete root.dataset.livechat;
    };
  }, []);

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

  return ready ? <LiveChat openFirst={openFirst} /> : null;
}
