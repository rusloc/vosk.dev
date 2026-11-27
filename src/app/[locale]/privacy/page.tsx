import type { Metadata } from "next";
import { Container } from "@/components/container";
import { PageHeader } from "@/components/page-header";
import { ChangeConsentButton } from "@/components/analytics";
import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLiveChatConfigured } from "@/lib/livechat/config";

type Props = { params: Promise<{ locale: string }> };

/**
 * DRAFT for the owner to approve (live chat spec, "Privacy", 11-26), checked against docs/livechat/README.md and
 * lib/livechat/handlers.ts. Shown only while the live chat is configured. Kept here, not in the dictionary: the
 * dictionary travels whole to the nav on every page, and a draft should not.
 */
const LIVE_CHAT_DRAFT = {
  title: "Live chat",
  body: [
    "Messages you type into the chat window, and your email address if you leave one, are stored in the site's database and relayed to me through Telegram, where my copy of the conversation stays until I delete it. With your first message the chat also records the page you wrote from, the site that sent you there, your country and the type of device.",
    "A cookie (__Host-vosk_chat) links your browser to your conversation; it is set only when you send your first message. Your browser also keeps two small notes on this device (which replies you have seen, and whether the email prompt was shown).",
    "To limit abuse, the site keeps a salted hash of your IP address, never the address itself. The site deletes a conversation 90 days after its last message.",
  ],
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = getDictionary(l).privacy;
  // A legal page, not a search target: reachable from the consent card and the ad landing pages, kept out of the index and the sitemap.
  return buildMetadata({
    title: t.title,
    description: t.metaDescription,
    path: "/privacy",
    locale: l,
    robots: { index: false, follow: true },
  });
}

/** What the site collects (readiness spec R-06, 11-19). Each line is a fact about the code; see the dictionary note. */
export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const t = getDictionary(l).privacy;
  const h2 = "text-lg font-semibold tracking-tight";

  return (
    <Container className="py-10 sm:py-12">
      <PageHeader title={t.title}>{t.lede}</PageHeader>
      <p className="text-muted-foreground mt-2 text-sm">{t.updated}</p>

      {[
        ...t.sections,
        ...(isLiveChatConfigured() ? [LIVE_CHAT_DRAFT] : []),
      ].map((s) => (
        <section key={s.title} className="mt-8 max-w-prose">
          <h2 className={h2}>{s.title}</h2>
          <div className="mt-3 space-y-3">
            {s.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-8 max-w-prose">
        <h2 className={h2}>{t.contactTitle}</h2>
        <p className="mt-3">
          {t.contactBody}{" "}
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="text-primary hover:underline"
          >
            {siteConfig.contactEmail}
          </a>
          .
        </p>
        <div className="mt-6">
          <ChangeConsentButton label={t.changeChoice} />
        </div>
      </section>
    </Container>
  );
}
