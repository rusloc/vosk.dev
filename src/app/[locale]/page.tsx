import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { HomeBackdrop } from "@/components/home-backdrop";
import { CodeTyper } from "@/components/code-typer";
import { JsonLd } from "@/components/json-ld";
import { homeGraph } from "@/lib/structured-data";
import { buildMetadata } from "@/lib/metadata";
import { isLocale, localizedPath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = isLocale(locale) ? locale : "en";
  return buildMetadata({ path: "/", locale: l });
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).home;

  return (
    <>
      <JsonLd data={homeGraph()} />
      <HomeBackdrop />
      <CodeTyper />
      <Container className="py-20 sm:py-28">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            {t.headline.lead}
            <span className="text-primary italic">{t.headline.em1}</span>
            {t.headline.mid}
            <span className="text-primary italic">{t.headline.em2}</span>
            {t.headline.tail}
          </h1>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href={localizedPath(l, "/work")}
              className="bg-foreground text-background inline-flex h-12 items-center justify-center gap-2 rounded-md px-7 text-sm font-medium transition-opacity hover:opacity-90"
            >
              {t.cta} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
