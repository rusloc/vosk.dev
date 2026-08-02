import { linkedinTeaser } from "./summary";
import type { Adapter, PostResult, SyndicationItem } from "./types";

/**
 * LinkedIn adapter — posts to a *personal profile* via the consumer "Share on
 * LinkedIn" product (`w_member_social` + `POST /v2/ugcPosts`).
 *
 * Personal profile, not a Company Page, and that is the cheap direction: the
 * Company Page path runs through the Community Management API, which LinkedIn
 * gates behind a registered legal entity and a two-tier review and does not offer
 * to individuals at all (ADR-0004).
 *
 * The standing cost is token rot. Non-Marketing-Developer-Platform apps are issued
 * **no refresh token** and the access token expires after **60 days**, so
 * LINKEDIN_ACCESS_TOKEN has to be re-minted by hand roughly every two months. A
 * run that fails with 401 almost certainly means exactly that — see
 * docs/04-syndication.md. Credentials come from `process.env`, never `lib/env.ts`.
 */

const UGC_POSTS = "https://api.linkedin.com/v2/ugcPosts";
const USERINFO = "https://api.linkedin.com/v2/userinfo";

/** LinkedIn truncates commentary past 3000 characters. */
const MAX_COMMENTARY = 3000;

function token(): string | undefined {
  return process.env.LINKEDIN_ACCESS_TOKEN?.trim() || undefined;
}

/**
 * Post text — the teaser from `summary.ts`, capped. The link also rides in the
 * ARTICLE media block so LinkedIn renders a preview card, which is why every page
 * needed an `og:image` before this could be turned on.
 */
export function commentary(item: SyndicationItem): string {
  return linkedinTeaser(item).slice(0, MAX_COMMENTARY);
}

/**
 * The author URN. Set LINKEDIN_AUTHOR_URN to skip the lookup; otherwise it is read
 * from the OpenID userinfo endpoint, which needs the `openid`/`profile` scopes on
 * the same token.
 */
async function authorUrn(bearer: string): Promise<string> {
  const configured = process.env.LINKEDIN_AUTHOR_URN?.trim();
  if (configured) return configured;

  const res = await fetch(USERINFO, {
    headers: { authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) {
    throw new Error(
      `userinfo ${res.status} — set LINKEDIN_AUTHOR_URN, or add the "openid profile" scopes to the token`,
    );
  }
  const { sub } = (await res.json()) as { sub?: string };
  if (!sub) throw new Error("userinfo returned no `sub` to build a Person URN");
  return `urn:li:person:${sub}`;
}

function payload(item: SyndicationItem, author: string) {
  return {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: commentary(item) },
        shareMediaCategory: "ARTICLE",
        media: [
          {
            status: "READY",
            originalUrl: item.url,
            title: { text: item.title },
            description: { text: item.description },
          },
        ],
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };
}

export const linkedin: Adapter = {
  platform: "linkedin",

  configError() {
    return token() ? null : "LINKEDIN_ACCESS_TOKEN is not set";
  },

  /** Both kinds work — a showcase is a link with a blurb, which is all this is. */
  accepts() {
    return true;
  },

  preview(item) {
    return [
      `link:  ${item.url}`,
      `title: ${item.title}`,
      "commentary:",
      commentary(item)
        .split("\n")
        .map((l) => `  | ${l}`)
        .join("\n"),
    ].join("\n");
  },

  async publish(item): Promise<PostResult> {
    const bearer = token();
    if (!bearer)
      return { ok: false, error: "LINKEDIN_ACCESS_TOKEN is not set" };

    try {
      const author = await authorUrn(bearer);
      const res = await fetch(UGC_POSTS, {
        method: "POST",
        headers: {
          authorization: `Bearer ${bearer}`,
          "content-type": "application/json",
          "x-restli-protocol-version": "2.0.0",
        },
        body: JSON.stringify(payload(item, author)),
      });

      if (!res.ok) {
        const hint =
          res.status === 401
            ? " — the 60-day token has almost certainly expired; re-authorise it"
            : "";
        return {
          ok: false,
          error: `linkedin ${res.status} ${res.statusText}${hint}: ${(await res.text()).slice(0, 300)}`,
        };
      }

      const urn = res.headers.get("x-restli-id") ?? undefined;
      return {
        ok: true,
        externalId: urn,
        url: urn ? `https://www.linkedin.com/feed/update/${urn}/` : undefined,
      };
    } catch (err) {
      return { ok: false, error: `linkedin: ${(err as Error).message}` };
    }
  },
};
