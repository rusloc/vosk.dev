import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The Tidewell data chat showcase stays hidden until its three server settings are set (lib/ceo-digest/config.ts)
 * and the chat is on (CHAT_ENABLED = "1", 11-17: the page's main button is Ask AI), so the code can ship before the
 * setup. `showcases` is computed when lib/work.ts loads, so each case stubs the env
 * and takes a fresh module registry (`vi.resetModules()` + a dynamic `import()`), as lib/cube.test.ts does.
 */

const KEYS = [
  "CEO_DIGEST_DATABASE_URL",
  "N8N_DIGEST_WEBHOOK_URL",
  "N8N_DIGEST_WEBHOOK_SECRET",
  "CHAT_ENABLED",
] as const;

const SET: Record<(typeof KEYS)[number], string> = {
  CEO_DIGEST_DATABASE_URL: "postgres://reader:pw@db.example.test:5432/postgres",
  N8N_DIGEST_WEBHOOK_URL: "https://n8n.example.test/webhook/digest",
  N8N_DIGEST_WEBHOOK_SECRET: "s3cret-value",
  CHAT_ENABLED: "1",
};

async function loadWork(env: Partial<typeof SET>) {
  vi.resetModules();
  for (const key of KEYS) vi.stubEnv(key, env[key] ?? "");
  return import("./work");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the ceo-digest showcase gate", () => {
  it("is hidden everywhere while nothing is set", async () => {
    const work = await loadWork({});
    expect(work.getShowcase("ceo-digest")).toBeUndefined();
    expect(work.getShowcaseSlugs()).not.toContain("ceo-digest");
    expect(work.getIndexableShowcaseSlugs()).not.toContain("ceo-digest");
    expect(work.showcases.map((s) => s.slug)).not.toContain("ceo-digest");
  });

  it.each(KEYS)("is hidden while only %s is missing", async (missing) => {
    const work = await loadWork({ ...SET, [missing]: undefined });
    expect(work.getShowcaseSlugs()).not.toContain("ceo-digest");
  });

  it("is hidden while the chat is off, even with the three settings in place", async () => {
    const work = await loadWork({ ...SET, CHAT_ENABLED: "0" });
    expect(work.getShowcaseSlugs()).not.toContain("ceo-digest");
    expect(work.getIndexableShowcaseSlugs()).not.toContain("ceo-digest");
  });

  it("is listed once all three are set and the chat is on, as an automation entry with a chat", async () => {
    const work = await loadWork(SET);
    expect(work.getShowcaseSlugs()).toContain("ceo-digest");
    expect(work.getIndexableShowcaseSlugs()).toContain("ceo-digest");
    const entry = work.getShowcase("ceo-digest");
    expect(entry?.platform).toBe("automation");
    const view = entry && work.localize(entry, "en");
    expect(view).toMatchObject({
      platform: "automation",
      workflow: "ceo-digest-email",
      chat: "ceo-digest",
    });
    expect(view?.details.length).toBe(3);
  });

  it("the other n8n showcases never depend on those settings", async () => {
    const work = await loadWork({});
    expect(work.getShowcaseSlugs()).toEqual(
      expect.arrayContaining(["inbox-to-sheet-ai", "invoice-pdf-parser"]),
    );
  });

  it("a webhook URL that is not https fails loudly", async () => {
    await expect(
      loadWork({ ...SET, N8N_DIGEST_WEBHOOK_URL: "http://n8n.example.test/x" }),
    ).rejects.toThrow();
  });
});

describe("the n8n canvas", () => {
  it("a flow whose export is missing reads as absent, not as a failure", async () => {
    const { hasN8nFlow } = await import("./n8n-flows");
    expect(await hasN8nFlow("inbox-to-sheet")).toBe(true);
    expect(await hasN8nFlow("invoice-pdf-to-sheet")).toBe(true);
    // true once data/n8n/ceo-digest-email.json is exported; either way the call must not throw
    expect(typeof (await hasN8nFlow("ceo-digest-email"))).toBe("boolean");
  });
});

describe("search snippets (11-17 SEO check)", () => {
  it("every listed showcase has a 120–160 character description and says where its figures come from", async () => {
    const work = await loadWork(SET);
    for (const s of work.showcases) {
      const view = work.localize(s, "en");
      const text = view.description ?? view.summary;
      expect(text.length, s.slug).toBeGreaterThanOrEqual(120);
      expect(text.length, s.slug).toBeLessThanOrEqual(160);
      expect(["synthetic", "client"], s.slug).toContain(view.data);
    }
  });
});
