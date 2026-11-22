import type { Metadata, Viewport } from "next";
import "../globals.css";
import { env } from "@/lib/env";
import { siteConfig } from "@/lib/site";
import { landingFontVariables } from "@/components/landing/landing-fonts";
import { Analytics } from "@/components/analytics";
import { LeadSourceCapture } from "@/components/lead-source-capture";

/**
 * The ad-only landing pages (owner, 11-20). A layout of their own, outside `[locale]`: no site nav and no site
 * footer, each page draws its own. They link one way, into the site (brand, contact, services, privacy); nothing on
 * the site links to them. Out of the index (`noindex, follow`) and out of the sitemap, but NOT disallowed in
 * robots.txt: Google has to crawl a page to read its noindex, and the Ads crawler has to reach the page.
 *
 * The consent card and the lead source (R-07) work as on the site: the source keeps `/lp/…` and the ad's `utm_*`
 * for the contact form, which the visitor reaches on /contact.
 */
export const metadata: Metadata = {
  authors: [{ name: siteConfig.author.name, url: siteConfig.url }],
  robots: { index: false, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#2a0c0f",
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={landingFontVariables}>
      <body className="antialiased">
        {children}
        <Analytics gtmId={env.NEXT_PUBLIC_GTM_ID} />
        <LeadSourceCapture />
      </body>
    </html>
  );
}
