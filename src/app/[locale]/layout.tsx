import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { env } from "@/lib/env";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";
import { withTitleSuffix } from "@/lib/metadata";
import { locales, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SiteNav } from "@/components/nav";
import { Analytics } from "@/components/analytics";
import { LeadSourceCapture } from "@/components/lead-source-capture";
import { LiveChatLazy } from "@/components/livechat/live-chat-lazy";
import { isLiveChatConfigured } from "@/lib/livechat/config";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).meta;

  return {
    // `metadataBase` lives in the root layout — the root segment's own metadata
    // files resolve before this one and need it already set.
    title: {
      default: t.title,
      template: withTitleSuffix("%s"),
    },
    description: t.description,
    // Authorship is an E-E-A-T signal on a one-person consultancy: the brand and
    // the accountable person are the same entity, and the JSON-LD says so too.
    authors: [{ name: siteConfig.author.name, url: siteConfig.url }],
    creator: siteConfig.author.name,
    publisher: siteConfig.name,
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: t.title,
      description: t.description,
      locale: siteConfig.locale,
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title: t.title,
      description: t.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#fff8e7",
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <html lang={locale} className={`${fontVariables} h-full`}>
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans antialiased">
        <SiteNav
          brand={siteConfig.name}
          locale={locale as Locale}
          dict={dict}
        />
        {/* Home only (its hero carries `home-hero`): a flex column, so the hero fills the space below the nav
            and the page doesn't scroll (CLAUDE.md "Landing page"). Other pages keep a plain block main. */}
        <main className="flex-1 has-[>.home-hero]:flex has-[>.home-hero]:flex-col">
          {children}
        </main>
        <Analytics gtmId={env.NEXT_PUBLIC_GTM_ID} />
        <LeadSourceCapture />
        {/* The Telegram live chat (docs/livechat): off until its five env vars are set; loads after idle. */}
        {isLiveChatConfigured() && <LiveChatLazy />}
      </body>
    </html>
  );
}
