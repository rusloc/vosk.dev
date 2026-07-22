import type { Metadata } from "next";
import { Container } from "@/components/container";
import { buildMetadata } from "@/lib/metadata";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).services;
  return buildMetadata({
    title: t.title,
    description: t.metaDescription,
    path: "/services",
    locale: l,
  });
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).services;

  return (
    <Container className="py-24">
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
      <p className="text-muted-foreground mt-4">{t.body}</p>
    </Container>
  );
}
