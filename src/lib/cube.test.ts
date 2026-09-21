import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the Cube client.
 *
 * `lib/env.ts` parses `process.env` once, at import. So every test stubs the env it wants
 * and then takes a fresh module registry (`vi.resetModules()` + dynamic `import()`) — the
 * same shape as `contact/actions.test.ts`. Nothing here reaches the network: `fetch` is a
 * stub, and there is no live Cube endpoint to call anyway.
 */

const API_URL = "https://example.cubecloudapp.dev/cubejs-api/v1";
const SECRET = "test-secret-not-a-real-one";

const fetchMock = vi.fn<typeof fetch>();

async function loadCube(env: { url?: string; secret?: string } = {}) {
  vi.stubEnv("CUBE_API_URL", env.url);
  vi.stubEnv("CUBE_API_SECRET", env.secret);
  return import("./cube");
}

const configured = () => loadCube({ url: API_URL, secret: SECRET });

const ndjson = (...lines: unknown[]) =>
  lines.map((line) => JSON.stringify(line)).join("\n");

const int = (name: string) => ({ name, column_type: "Int64" });

const OK_BODY = ndjson({ schema: [int("_n")] }, { data: [["1"]] });

const decode = (segment: string): unknown =>
  JSON.parse(Buffer.from(segment, "base64url").toString());

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("parseCubeSqlResponse", () => {
  it("parses the documented example", async () => {
    const { parseCubeSqlResponse } = await loadCube();
    const text = [
      '{"schema":[{"name":"value","column_type":"Int64"}]}',
      '{"data":[["789"]]}',
      '{"data":[["123"]]}',
    ].join("\n");

    expect(parseCubeSqlResponse(text)).toEqual([
      { value: 789 },
      { value: 123 },
    ]);
  });

  it("concatenates data chunks in order, several rows per chunk", async () => {
    const { parseCubeSqlResponse } = await loadCube();
    const text = ndjson(
      { schema: [int("_n")] },
      { data: [["1"], ["2"]] },
      { data: [] },
      { data: [["3"]] },
    );

    expect(parseCubeSqlResponse(text).map((row) => row._n)).toEqual([1, 2, 3]);
  });

  it("returns no rows for a schema with no data", async () => {
    const { parseCubeSqlResponse } = await loadCube();

    expect(parseCubeSqlResponse(ndjson({ schema: [int("_n")] }))).toEqual([]);
  });

  it.each([
    ["Int64", "42", 42],
    ["Int32", "-7", -7],
    ["Float64", "1.5", 1.5],
    ["Double", "4766371.12", 4766371.12],
    ["Decimal(38, 10)", "0.1250000000", 0.125],
    ["numeric", "10", 10],
    ["BIGINT", "9", 9],
    ["int64", 5, 5], // already a JSON number
    ["Boolean", "true", true],
    ["boolean", "false", false],
    ["Boolean", true, true], // already a JSON boolean
    ["Timestamp", "2025-06-01T00:00:00.000", "2025-06-01T00:00:00.000"],
    ["String", "Paid Search", "Paid Search"],
    ["String", "007", "007"], // a numeric-looking string stays a string
    ["SomethingNew", "x", "x"],
    // Starts with "Int" but is no integer — must not be run through Number().
    ["Interval(DayTime)", "1 day", "1 day"],
  ])("casts %s %j → %j", async (column_type, raw, expected) => {
    const { parseCubeSqlResponse } = await loadCube();
    const text = ndjson(
      { schema: [{ name: "_v", column_type }] },
      { data: [[raw]] },
    );

    expect(parseCubeSqlResponse(text)).toEqual([{ _v: expected }]);
  });

  it("accepts the schema line exactly as the live deployment sends it", async () => {
    // Verbatim shape from Cube Cloud Free, 2026-09-22 — note `lastRefreshTime` riding beside
    // `schema`. A strict envelope rejected this line and would have failed the first live build.
    const { parseCubeSqlResponse } = await loadCube();
    const text = ndjson(
      {
        schema: [
          { name: "_year", column_type: "Timestamp" },
          { name: "_channel", column_type: "String" },
          { name: "_net_amount", column_type: "Double" },
          { name: "_orders", column_type: "Int64" },
        ],
        lastRefreshTime: "2026-09-21T21:07:30.955Z",
      },
      { data: [["2024-01-01T00:00:00.000", "Direct", "199621.45", "1440"]] },
    );

    expect(parseCubeSqlResponse(text)).toEqual([
      {
        _year: "2024-01-01T00:00:00.000",
        _channel: "Direct",
        _net_amount: 199621.45,
        _orders: 1440,
      },
    ]);
  });

  it("keeps null as null whatever the column type", async () => {
    const { parseCubeSqlResponse } = await loadCube();
    const text = ndjson(
      {
        schema: [
          int("_n"),
          { name: "_b", column_type: "Boolean" },
          { name: "_s", column_type: "String" },
        ],
      },
      { data: [[null, null, null]] },
    );

    expect(parseCubeSqlResponse(text)).toEqual([
      { _n: null, _b: null, _s: null },
    ]);
  });

  it.each([
    ["a non-numeric string", "Int64", "abc"],
    ["an empty string", "Int64", ""], // Number("") is 0 — must not pass as a zero
    ["Infinity", "Float64", "Infinity"],
    ["a non-boolean", "Boolean", "yes"],
    ["an object in a string column", "String", { nested: 1 }],
  ])("throws on %s", async (_name, column_type, raw) => {
    const { parseCubeSqlResponse } = await loadCube();
    const text = ndjson(
      { schema: [{ name: "_v", column_type }] },
      { data: [[raw]] },
    );

    expect(() => parseCubeSqlResponse(text)).toThrow(/column "_v"/);
  });

  it("tolerates CRLF, blank lines and a trailing newline", async () => {
    const { parseCubeSqlResponse } = await loadCube();
    const text =
      '{"schema":[{"name":"_n","column_type":"Int64"}]}\r\n' +
      "\r\n" +
      '{"data":[["1"]]}\r\n' +
      "   \n" +
      '{"data":[["2"]]}\n';

    expect(parseCubeSqlResponse(text)).toEqual([{ _n: 1 }, { _n: 2 }]);
  });

  it("throws Cube's own message on an error line", async () => {
    const { parseCubeSqlResponse } = await loadCube();
    const text = ndjson(
      { schema: [int("_n")] },
      { data: [["1"]] },
      { error: "Unknown member: sales_overview.revenu" },
    );

    expect(() => parseCubeSqlResponse(text)).toThrow(
      "Cube SQL error: Unknown member: sales_overview.revenu",
    );
  });

  it("still surfaces the message when the error line carries extra fields", async () => {
    const { parseCubeSqlResponse } = await loadCube();

    expect(() =>
      parseCubeSqlResponse(ndjson({ error: "boom", requestId: "abc" })),
    ).toThrow("Cube SQL error: boom");
  });

  it("throws on malformed JSON", async () => {
    const { parseCubeSqlResponse } = await loadCube();

    expect(() =>
      parseCubeSqlResponse(`${ndjson({ schema: [int("_n")] })}\n{"data":[["1"`),
    ).toThrow(/not JSON/);
  });

  it("throws on a line that is none of schema / data / error", async () => {
    const { parseCubeSqlResponse } = await loadCube();

    expect(() => parseCubeSqlResponse(ndjson({ rows: [] }))).toThrow(
      /Unrecognised/,
    );
  });

  it("throws when data arrives before any schema", async () => {
    const { parseCubeSqlResponse } = await loadCube();

    expect(() => parseCubeSqlResponse(ndjson({ data: [["1"]] }))).toThrow(
      /before its schema/,
    );
  });

  it.each([
    ["an empty body", ""],
    ["only whitespace", "\n\r\n  \n"],
  ])("throws on %s — the schema line is missing", async (_name, text) => {
    const { parseCubeSqlResponse } = await loadCube();

    expect(() => parseCubeSqlResponse(text)).toThrow(/no schema line/);
  });

  it("throws when a row's width does not match the schema", async () => {
    const { parseCubeSqlResponse } = await loadCube();
    const text = ndjson({ schema: [int("_a"), int("_b")] }, { data: [["1"]] });

    expect(() => parseCubeSqlResponse(text)).toThrow(/1 values for 2 columns/);
  });
});

describe("mintCubeToken", () => {
  it("is three unpadded base64url segments", async () => {
    const { mintCubeToken } = await configured();
    const token = mintCubeToken();

    expect(token.split(".")).toHaveLength(3);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(token).not.toContain("=");
  });

  it("declares HS256 and expires exactly five minutes after issue", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-21T12:00:00.500Z"));
    const { mintCubeToken } = await configured();
    const [header, payload] = mintCubeToken().split(".");

    expect(decode(header!)).toEqual({ alg: "HS256", typ: "JWT" });
    expect(decode(payload!)).toEqual({
      iat: 1789992000, // whole seconds — the .500 is floored away
      exp: 1789992000 + 300,
    });
  });

  it("carries a signature that verifies against the same secret — and no other", async () => {
    const { mintCubeToken } = await configured();
    const [header, payload, signature] = mintCubeToken().split(".");
    const sign = (secret: string) =>
      createHmac("sha256", secret)
        .update(`${header}.${payload}`)
        .digest("base64url");

    expect(signature).toBe(sign(SECRET));
    expect(signature).not.toBe(sign("some-other-secret"));
  });

  it("throws when Cube is not configured", async () => {
    const { mintCubeToken } = await loadCube();

    expect(() => mintCubeToken()).toThrow(/not configured/);
  });
});

describe("isCubeConfigured", () => {
  it.each([
    ["both set", { url: API_URL, secret: SECRET }, true],
    ["neither set", {}, false],
    ["only the URL", { url: API_URL }, false],
    ["only the secret", { secret: SECRET }, false],
    // The trap: `""` must read as unset, not fail the env parse at import.
    ["both empty strings", { url: "", secret: "" }, false],
    ["an empty secret", { url: API_URL, secret: "" }, false],
  ])("%s → %s", async (_name, env, expected) => {
    const { isCubeConfigured } = await loadCube(env);

    expect(isCubeConfigured()).toBe(expected);
  });

  it("fails the import loudly on a malformed URL", async () => {
    await expect(
      loadCube({ url: "cube.example.com", secret: SECRET }),
    ).rejects.toThrow();
  });
});

describe("cubeSql", () => {
  const respond = (status: number, body: string) =>
    Promise.resolve(new Response(body, { status }));

  it("POSTs the query to /cubesql with the raw token — no Bearer", async () => {
    fetchMock.mockImplementation(() => respond(200, OK_BODY));
    const { cubeSql } = await configured();

    await expect(cubeSql("select 1")).resolves.toEqual([{ _n: 1 }]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(url).toBe(`${API_URL}/cubesql`);
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ query: "select 1" }));
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("authorization")).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    // Guard for the comment in cube.ts: an explicit no-store de-opts the ISR page.
    expect(init).not.toHaveProperty("cache");
  });

  it("drops a trailing slash from CUBE_API_URL", async () => {
    fetchMock.mockImplementation(() => respond(200, OK_BODY));
    const { cubeSql } = await loadCube({ url: `${API_URL}//`, secret: SECRET });

    await cubeSql("select 1");

    expect(fetchMock.mock.calls[0]![0]).toBe(`${API_URL}/cubesql`);
  });

  it("retries once after a 5xx", async () => {
    fetchMock
      .mockImplementationOnce(() => respond(503, "waking up"))
      .mockImplementationOnce(() => respond(200, OK_BODY));
    const { cubeSql } = await configured();

    await expect(cubeSql("select 1")).resolves.toEqual([{ _n: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once after a network error or timeout", async () => {
    fetchMock
      .mockRejectedValueOnce(new DOMException("timed out", "TimeoutError"))
      .mockImplementationOnce(() => respond(200, OK_BODY));
    const { cubeSql } = await configured();

    await expect(cubeSql("select 1")).resolves.toEqual([{ _n: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after the second failure", async () => {
    fetchMock.mockImplementation(() => respond(502, "bad gateway"));
    const { cubeSql } = await configured();

    await expect(cubeSql("select 1")).rejects.toThrow(
      "Cube responded 502: bad gateway",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([400, 401, 403, 404])("does not retry a %i", async (status) => {
    fetchMock.mockImplementation(() => respond(status, "nope"));
    const { cubeSql } = await configured();

    await expect(cubeSql("select 1")).rejects.toThrow(
      `Cube responded ${status}`,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry an error line in a 200 — it is deterministic", async () => {
    fetchMock.mockImplementation(() =>
      respond(200, ndjson({ error: "bad SQL" })),
    );
    const { cubeSql } = await configured();

    await expect(cubeSql("selec 1")).rejects.toThrow("Cube SQL error: bad SQL");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws without touching the network when Cube is not configured", async () => {
    const { cubeSql } = await loadCube();

    await expect(cubeSql("select 1")).rejects.toThrow(/not configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
