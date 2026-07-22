import type { Metadata } from "next";
import { Container } from "@/components/container";
import { ContactForm } from "@/components/contact-form";
import { buildMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/site";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const t = getDictionary(l).contact;
  return buildMetadata({
    title: t.title,
    description: t.metaDescription,
    path: "/contact",
    locale: l,
  });
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  const l = (isLocale(locale) ? locale : "en") as Locale;
  const dict = getDictionary(l);
  const t = dict.contact;

  return (
    <Container className="py-16 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight">{t.title}</h1>
      <p className="text-muted-foreground mt-4 max-w-xl">{t.intro}</p>

      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="max-w-xl">
          <ContactForm locale={l} dict={dict} />
        </div>

        <dl className="md:border-border space-y-3 text-sm md:border-l md:pl-8">
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-16">{t.labelName}</dt>
            <dd>
              <span className="font-medium">{siteConfig.author.name}</span>
              <span className="text-muted-foreground block text-xs">
                {siteConfig.author.jobTitle}
              </span>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-16">{t.labelEmail}</dt>
            <dd>
              <a
                href={`mailto:${siteConfig.contactEmail}`}
                className="text-primary hover:underline"
              >
                {siteConfig.contactEmail}
              </a>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-16">{t.labelPhone}</dt>
            <dd>
              <a
                href={`tel:${siteConfig.contactPhoneHref}`}
                className="text-primary hover:underline"
              >
                {siteConfig.contactPhone}
              </a>
            </dd>
          </div>
        </dl>
      </div>
    </Container>
  );
}
