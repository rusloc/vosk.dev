import { afterEach, describe, expect, it, vi } from "vitest";
import { createReader } from "./reader";
import { artifactRoute } from "./route";

// The shared data route and reader (2026-11-18, one copy instead of five): the answers a visitor can get without a
// database. Reads that reach Supabase are verified by the load scripts (scripts/lib/load-report.ts).

const ENV = "REPORT_DATA_TEST_DATABASE_URL";
const reader = () =>
  createReader({
    envVar: ENV,
    resolveArtifact: (name) =>
      name === "manifest.json" ? { kind: "document", name } : null,
    runArtifact: async () => ({}),
    columns: true,
  });

afterEach(() => {
  delete process.env[ENV];
  vi.restoreAllMocks();
});

describe("createReader", () => {
  it("answers 404 for a name the report never reads, 503 when its URL is unset", async () => {
    const read = reader();
    expect(await read("../qbo")).toEqual({ status: 404 });
    expect(await read("manifest.json")).toEqual({ status: 503 });
  });

  it("refuses a Transaction pooler URL (port 6543) without naming the URL", async () => {
    process.env[ENV] = "postgres://u:secret@pooler.example.test:6543/db";
    const error = await reader()("manifest.json").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(
      `${ENV} must use the Session pooler`,
    );
    expect((error as Error).message).not.toContain("secret");
  });
});

describe("artifactRoute", () => {
  const call = (
    GET: ReturnType<typeof artifactRoute>,
    path: string[],
    ip = "203.0.113.7",
  ) =>
    GET(
      new Request(`https://example.test/api/x/${path.join("/")}`, {
        headers: { "x-forwarded-for": ip },
      }),
      { params: Promise.resolve({ path }) },
    );

  it("serves a body with the CDN cache header, 404 and 503 as plain text", async () => {
    const GET = artifactRoute({
      name: "test",
      maxPerWindow: 10,
      read: async (name) =>
        name === "manifest.json"
          ? { status: 200, body: { ok: 1 } }
          : name === "off.parquet"
            ? { status: 503 }
            : { status: 404 },
    });
    const ok = await call(GET, ["manifest.json"]);
    expect(ok.status).toBe(200);
    expect(ok.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    );
    expect(await ok.json()).toEqual({ ok: 1 });
    expect((await call(GET, ["nope"])).status).toBe(404);
    const off = await call(GET, ["off.parquet"]);
    expect([off.status, await off.text()]).toEqual([
      503,
      "Report data is not configured",
    ]);
  });

  it("answers 502 with a generic body when the read throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const GET = artifactRoute({
      name: "test",
      maxPerWindow: 10,
      read: async () => {
        throw new Error("connect ECONNREFUSED db.example.test");
      },
    });
    const res = await call(GET, ["detail", "a.parquet"]);
    expect([res.status, await res.text()]).toEqual([
      502,
      "Report data unavailable",
    ]);
    expect(log).toHaveBeenCalledWith(
      "test artifact detail/a.parquet: connect ECONNREFUSED db.example.test",
    );
  });

  it("limits one IP past maxPerWindow, not the next one", async () => {
    const GET = artifactRoute({
      name: "test",
      maxPerWindow: 2,
      read: async () => ({ status: 404 }),
    });
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await call(GET, ["x"])).status);
    expect(statuses).toEqual([404, 404, 429]);
    expect((await call(GET, ["x"], "198.51.100.1")).status).toBe(404);
  });
});
