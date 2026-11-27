import { describe, expect, it } from "vitest";
import * as handlers from "@/lib/livechat/handlers";
import * as email from "./email/route";
import * as messages from "./messages/route";
import * as webhook from "../telegram/webhook/route";

// The live chat's route files only wire the handlers (src/lib/livechat/handlers.ts, tested there) and pin the runtime.

describe("live chat routes", () => {
  it.each([
    ["messages", messages],
    ["email", email],
    ["telegram webhook", webhook],
  ])("%s runs on Node, dynamic", (_, route) => {
    expect(route.runtime).toBe("nodejs");
    expect(route.dynamic).toBe("force-dynamic");
  });

  it("exports the contract's methods", () => {
    expect(messages.GET).toBe(handlers.getMessages);
    expect(messages.POST).toBe(handlers.postMessage);
    expect(email.POST).toBe(handlers.postEmail);
    expect(webhook.POST).toBe(handlers.telegramWebhook);
  });
});
