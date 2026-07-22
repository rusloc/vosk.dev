import type { Metadata } from "next";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { showcases } from "@/lib/work";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ShowcaseCard } from "./showcase-card";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).work;
  return buildMetadata({
    title: t.title,
    description: t.metaDescription,
    path: "/work",
    locale: l,
  });
}

export default async function WorkPage({ params }: Props) {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).work;

  return (
    <Container className="py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl">
        {t.intro.lead}
        <strong className="text-foreground font-medium">
          {t.intro.powerbi}
        </strong>
        {t.intro.and}
        <strong className="text-foreground font-medium">
          {t.intro.superset}
        </strong>
        {t.intro.tail}
      </p>

      {showcases.length === 0 ? (
        <p className="text-muted-foreground mt-12">{t.empty}</p>
      ) : (
        <ul className="mt-12 space-y-6">
          {showcases.map((showcase) => (
            <li key={showcase.slug}>
              <ShowcaseCard showcase={showcase} locale={l} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
