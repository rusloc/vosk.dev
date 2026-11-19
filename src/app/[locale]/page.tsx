import type { Metadata } from "next";
import { Container } from "@/components/container";
import { HomeBackdrop } from "@/components/home-backdrop";
import { CodeTyper } from "@/components/code-typer";
import { HeroButton } from "@/components/hero-button";
import { JsonLd } from "@/components/json-ld";
import { homeGraph } from "@/lib/structured-data";
import { ga } from "@/lib/analytics";
import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { localizedPath, resolveLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = resolveLocale(locale);
  return buildMetadata({ path: "/", locale: l });
}

/**
 * The landing page is the hero and nothing else, and it fits the screen without scrolling (owner, 11-19; CLAUDE.md
 * "Landing page"). Case studies, prices, posts and contact live on their own pages.
 */
export default async function Home({ params }: Props) {
  const { locale } = await params;
  const l = resolveLocale(locale);
  const dict = getDictionary(l);
  const t = dict.home;

  return (
    <>
      <JsonLd data={homeGraph()} />
      <HomeBackdrop />
      <CodeTyper />
      {/* Fills the space between nav and footer and centres the hero in it: no scroll at 1280×720 and on phones. */}
      <Container className="home-hero flex flex-1 items-center py-6 sm:py-10">
        <div className="w-full max-w-3xl">
          {/* The H1 carries the topic words (SEO spec T-03, 11-18); the headline, brand voice that names nothing
              searchable, is the line under it, styled as before. */}
          <h1 className="text-muted-foreground text-sm font-semibold tracking-[0.14em] uppercase">
            {t.h1}
          </h1>
          <p className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            {t.headline.lead}
            <span className="text-primary italic">{t.headline.em1}</span>
            {t.headline.mid}
            <span className="text-primary italic">{t.headline.em2}</span>
            {t.headline.tail}
          </p>

          <p className="text-muted-foreground mt-6 max-w-2xl text-lg">
            {t.lede}
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <HeroButton
              href={localizedPath(l, "/work")}
              label={t.cta}
              ga={ga("cta_click", undefined, "work")}
            />
            <HeroButton
              href={localizedPath(l, "/services")}
              label={t.ctaSecondary}
              ga={ga("cta_click", undefined, "services")}
            />
          </div>

          {/* Proof bar: what a visitor can check. Further items only from the owner (I-04). */}
          <ul className="text-muted-foreground mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <a
                href={siteConfig.dp600Url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground underline underline-offset-4"
              >
                {t.proofDp600}
              </a>
            </li>
            <li>{t.proofHours}</li>
          </ul>
        </div>
      </Container>
    </>
  );
}
