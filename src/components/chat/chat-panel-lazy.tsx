"use client";

import dynamic from "next/dynamic";

/**
 * The split point for the chat panel (11-25 review): imported straight into the showcase page, it shipped with every
 * showcase, chat or not, because a client component a route can reach ships with that route. As `SalesDashboardLazy`.
 */
export const ChatPanelLazy = dynamic(() =>
  import("./chat-panel").then((m) => m.ChatPanel),
);
