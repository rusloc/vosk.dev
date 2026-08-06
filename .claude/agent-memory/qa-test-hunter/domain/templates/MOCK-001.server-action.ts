// Template for MOCK-001 — testing a "use server" action with module-level state
// Last-tested: 2026-08-01
// Against: Vitest 4.1.10 / Next.js 16.2.10 / zod 4.4.3 / resend 6.17.1 / Node 24
//
// Key points: vi.hoisted() for stable spy identities across vi.resetModules();
// `function` (never arrow) for any mock the SUT calls with `new`; fresh dynamic
// import per test so module-scope state (rate-limit maps, caches) starts empty.

import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const send = vi.fn();
  return {
    send,
    // MUST be a `function` — the SUT does `new Resend(apiKey)`.
    resendCtor: vi.fn(function () {
      return { emails: { send } };
    }),
    headers: vi.fn(),
    getContactConfig: vi.fn(),
  };
});

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("resend", () => ({ Resend: mocks.resendCtor }));
// `@/lib/contact-config` imports `server-only`, which throws outside RSC —
// a factory mock is mandatory, an auto-mock is not enough.
vi.mock("@/lib/contact-config", () => ({
  getContactConfig: mocks.getContactConfig,
}));

beforeEach(() => {
  vi.resetModules(); // fresh module registry => empty module-scope state
  vi.clearAllMocks(); // clears calls, keeps hoisted identities
  mocks.getContactConfig.mockReturnValue({ apiKey: "re_test", to: "o@x", from: "f@x" });
  mocks.send.mockResolvedValue({ data: { id: "1" }, error: null });
  mocks.headers.mockResolvedValue(new Headers({ "x-forwarded-for": "203.0.113.7" }));
});

it("gets a clean module instance", async () => {
  const { submitContactForm } = await import("@/app/[locale]/contact/actions");
  const fd = new FormData();
  fd.set("email", "v@example.com");
  fd.set("message", "Hello, I would like a dashboard.");

  expect((await submitContactForm({ status: "idle" }, fd)).status).toBe("success");
});
