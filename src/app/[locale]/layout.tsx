import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { env } from "@/lib/env";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "@/lib/site";
import { locales, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { SiteNav } from "@/components/nav";
import { SiteFooter } from "@/components/footer";
import { Analytics } from "@/components/analytics";

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
      template: `%s · ${siteConfig.name}`,
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
      locale: "en_US",
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
        <SiteNav locale={locale as Locale} dict={dict} />
        <main className="flex-1">{children}</main>
        <SiteFooter locale={locale as Locale} dict={dict} />
        <Analytics gtmId={env.NEXT_PUBLIC_GTM_ID} />
      </body>
    </html>
  );
}
