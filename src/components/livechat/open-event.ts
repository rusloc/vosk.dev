/**
 * How a button elsewhere on the page opens the live chat (owner, 11-27: the orange "Contact now"). The widget's wrapper
 * marks `<html data-livechat="on">` once it is mounted and listens for this window event; a button checks the mark and
 * falls back to its own link when the chat is off.
 */
export const LIVE_CHAT_OPEN_EVENT = "vosk:livechat-open";

export function isLiveChatOn(): boolean {
  return document.documentElement.dataset.livechat === "on";
}
