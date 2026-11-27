"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { LIVE_CHAT_OPEN_EVENT, isLiveChatOn } from "./open-event";

/**
 * A link to the contact page that opens the live chat instead while the chat is on (owner, 11-27). With the chat off
 * (its env unset), before hydration or without JS, it is a plain link to `href`. A modified click (new tab) keeps the
 * link.
 */
export function ContactChatLink({
  onClick,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          !isLiveChatOn()
        )
          return;
        e.preventDefault();
        window.dispatchEvent(new Event(LIVE_CHAT_OPEN_EVENT));
      }}
    />
  );
}
