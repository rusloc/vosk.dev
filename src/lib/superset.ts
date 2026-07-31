import "server-only";

/**
 * Superset guest-token minting against a self-hosted instance (ADR-0003).
 *
 * Server-only by construction: the service-account password must never reach the client
 * bundle, so these vars are read here rather than in lib/env.ts, which client components
 * import.
 *
 * Three calls, not two — self-hosted Superset protects its API with CSRF on top of the
 * bearer token, so a session is: log in → fetch a CSRF token → mint. The CSRF token is
 * bound to the `session` cookie issued alongside it, so the two must travel together;
 * sending the token without the cookie fails exactly like sending neither.
 *
 * The whole session is cached, because re-running the handshake for every viewer would
 * mean three round trips to the VPS every five minutes per visitor.
 *
 * INVARIANT: SESSION_TTL_MS must stay below `JWT_ACCESS_TOKEN_EXPIRES` in
 * deploy/superset/superset_config.py (currently 1 hour). If that config value is lowered,
 * lower this too — otherwise every mint pays for a doomed first attempt before retrying.
 */
const SESSION_TTL_MS = 45 * 60 * 1000;

type Session = {
  accessToken: string;
  csrfToken: string;
  cookie: string;
  expiresAt: number;
};

let cachedSession: Session | null = null;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function domain(): string {
  // Trailing slashes produce `//api/v1/...`, which Superset answers with a redirect that
  // drops the Authorization header — a 401 with nothing wrong with the credentials.
  return required("SUPERSET_DOMAIN").replace(/\/+$/, "");
}

/**
 * Self-hosted Superset returns its tokens at the response root (`access_token`, `result`,
 * `token`) — unlike Preset, which nested them. Assert anyway and name the field: a silent
 * `undefined` becomes `Bearer undefined` and surfaces as a 401 blaming the credentials,
 * which are the one thing that is actually correct. See CAND-003.
 */
function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || !value) {
    throw new Error(`Superset response missing ${path}`);
  }
  return value;
}

async function openSession(): Promise<Session> {
  const base = domain();

  const loginRes = await fetch(`${base}/api/v1/security/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: required("SUPERSET_SVC_USERNAME"),
      password: required("SUPERSET_SVC_PASSWORD"),
      provider: "db",
      refresh: true,
    }),
    cache: "no-store",
  });
  if (!loginRes.ok)
    throw new Error(`Superset login failed: ${loginRes.status}`);

  const accessToken = requireString(
    (await loginRes.json())?.access_token,
    "access_token",
  );

  const csrfRes = await fetch(`${base}/api/v1/security/csrf_token/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!csrfRes.ok)
    throw new Error(`Superset CSRF fetch failed: ${csrfRes.status}`);

  const csrfToken = requireString((await csrfRes.json())?.result, "result");

  // The CSRF token is only valid alongside the session cookie issued with it. Node's
  // fetch keeps no cookie jar, so carry it by hand.
  const cookie = csrfRes.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");

  return {
    accessToken,
    csrfToken,
    cookie,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
}

async function getSession(): Promise<{ session: Session; fromCache: boolean }> {
  if (cachedSession && cachedSession.expiresAt > Date.now()) {
    return { session: cachedSession, fromCache: true };
  }
  cachedSession = await openSession();
  return { session: cachedSession, fromCache: false };
}

/** Mints a guest token scoped to exactly one dashboard embed UUID. */
export async function mintGuestToken(embedId: string): Promise<string> {
  const body = JSON.stringify({
    user: {
      username: "site-visitor",
      first_name: "Site",
      last_name: "Visitor",
    },
    resources: [{ type: "dashboard", id: embedId }],
    rls: [],
  });

  const request = (session: Session) =>
    fetch(`${domain()}/api/v1/security/guest_token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
        "X-CSRFToken": session.csrfToken,
        Cookie: session.cookie,
      },
      body,
      cache: "no-store",
    });

  const { session, fromCache } = await getSession();
  let res = await request(session);

  // A cached session can go stale in more than one way — the JWT expires, the CSRF token
  // is rotated, Superset restarts — and each fails with a different status (401, 400,
  // 403). Rather than enumerate them, retry any failure once with a fresh session; if a
  // brand-new session fails too, the error is real and worth surfacing.
  if (!res.ok && fromCache) {
    cachedSession = null;
    res = await request((await getSession()).session);
  }
  if (!res.ok) {
    throw new Error(`Superset guest token failed: ${res.status}`);
  }

  return requireString((await res.json())?.token, "token");
}
