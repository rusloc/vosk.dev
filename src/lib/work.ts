import { env } from "./env";
import type { Locale } from "./i18n/config";

/**
 * Work showcase data — client dashboards written up like case studies on /work.
 * Data lives here (not in the component) so pages stay thin renderers and a future
 * CMS/MDX swap is cheap. The list page shows concise cards; each links to a detail
 * page (/work/[slug]) with the write-up and the live report embedded.
 *
 * Two platforms, and they embed differently enough to be separate shapes (ADR-0002):
 *  - Power BI  → a public "publish to web" URL, dropped into an iframe as-is.
 *  - Superset  → no public URL at all; an embed UUID for which the server mints a
 *                short-lived guest token per viewer (see lib/superset.ts).
 */
export type ShowcasePlatform = "power-bi" | "superset";

type ShowcaseBase<Text, Paragraphs> = {
  slug: string;
  title: Text;
  summary: Text; // concise — the list-card blurb
  details: Paragraphs; // paragraphs shown on the detail page, above the report
  metric?: string; // headline figure for the list-card report illustration (e.g. "$4.2M")
  articleSlug?: string; // optional /blog/<slug> write-up linked from the detail page
};

/**
 * A discriminated union rather than one shape with optional fields: `embedUrl`/`href`
 * are meaningless for a guest-token dashboard, and `embedId` is meaningless for Power BI.
 * The union forces the detail page to branch instead of rendering an empty iframe.
 *
 * Copy is parameterised over its own shape so the same union describes both the
 * source entry (every locale) and the collapsed view a page renders.
 */
type ShowcaseOf<Text, Paragraphs> =
  | (ShowcaseBase<Text, Paragraphs> & {
      platform: "power-bi";
      embedUrl: string;
      href: string;
    })
  | (ShowcaseBase<Text, Paragraphs> & {
      platform: "superset";
      embedId: string;
    });

/** Source entry: copy carried in every locale. Adding a locale breaks this loudly. */
export type Showcase = ShowcaseOf<
  Record<Locale, string>,
  Record<Locale, string[]>
>;

/** One locale's view of an entry — what pages and cards actually render. */
export type LocalizedShowcase = ShowcaseOf<string, string[]>;

/** Collapse a source entry to a single locale. */
export function localize(s: Showcase, locale: Locale): LocalizedShowcase {
  const base = {
    slug: s.slug,
    title: s.title[locale],
    summary: s.summary[locale],
    details: s.details[locale],
    metric: s.metric,
    articleSlug: s.articleSlug,
  };
  return s.platform === "power-bi"
    ? { ...base, platform: "power-bi", embedUrl: s.embedUrl, href: s.href }
    : { ...base, platform: "superset", embedId: s.embedId };
}

export const PLATFORM_LABEL: Record<ShowcasePlatform, string> = {
  "power-bi": "Power BI",
  superset: "Superset",
};

/** Placeholder marker — an entry still carrying this is not publishable. */
const UNSET_EMBED_ID = "REPLACE-WITH-EMBED-UUID";

/**
 * DRAFT — placeholder case studies to populate the layout.
 * `embedUrl` on the first entry is Microsoft's public Power BI sample (frameable, always live).
 * Replace it with a real client report's publish-to-web `?r=…` URL, and flesh out
 * `details` with the actual story (goal → data → what the dashboard changed).
 */
const allShowcases: Showcase[] = [
  {
    slug: "retail-sales",
    platform: "power-bi",
    title: {
      en: "Retail sales performance",
      ru: "Результаты розничных продаж",
    },
    summary: {
      en: "Revenue sliced by region, product and time. Filter, cross-highlight and drill down exactly as the client does.",
      ru: "Выручка в разрезе региона, продукта и времени. Фильтруйте, используйте кросс-выделение и детализацию — ровно так же, как это делает клиент.",
    },
    metric: "$4.2M",
    embedUrl: "https://playground.powerbi.com/sampleReportEmbed",
    href: "https://playground.powerbi.com/sampleReportEmbed",
    details: {
      en: [
        "This is a placeholder case study. Replace it with a real engagement: the client's goal, the data sources behind it, and what the dashboard let them decide.",
        "The report below is embedded live from the Power BI service — filter, drill down, and interact with it exactly as the client does day to day.",
      ],
      ru: [
        "Это кейс-заглушка. Замените его реальным проектом: цель клиента, источники данных за ней и решения, которые дашборд позволил принять.",
        "Отчёт ниже встроен напрямую из сервиса Power BI — фильтруйте, проваливайтесь в детали и работайте с ним так же, как клиент делает это каждый день.",
      ],
    },
  },
  {
    slug: "mining-time-utilization",
    platform: "power-bi",
    title: {
      en: "Mining fleet time utilization",
      ru: "Использование времени горной техники",
    },
    summary: {
      en: "A top-down waterfall funnel for a coal-mining fleet — total 24/7 time deducted category by category down to effective work, with linear and ladle-weighted views.",
      ru: "Воронка-водопад сверху вниз для парка техники угольного разреза: из общего круглосуточного времени категория за категорией вычитаются простои — вплоть до эффективной работы. Доступны линейный расчёт и взвешенный по объёму ковша.",
    },
    metric: "100%",
    embedUrl:
      "https://app.powerbi.com/view?r=eyJrIjoiY2M3YzU2MjAtNjdlOC00NGU2LThlMTItMzc2MTE2Yjk0MDlkIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9&embedImagePlaceholder=true",
    href: "https://app.powerbi.com/view?r=eyJrIjoiY2M3YzU2MjAtNjdlOC00NGU2LThlMTItMzc2MTE2Yjk0MDlkIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9&embedImagePlaceholder=true",
    articleSlug: "power-bi-time-utilization-funnel",
    details: {
      en: [
        'A coal-mining company needed to see, at a glance, where a heavy-loader fleet\'s time actually goes. The funnel starts at 100% of the 24/7 clock and deducts each idle category in turn, with breakpoints marking equipment-readiness stages — "ready for work," then "effective work time."',
        "Every figure is a percentage of total available time, and a switcher flips between linear utilization and a weighted average (weighted by each excavator's ladle volume). It runs on Power BI's default stacked bar chart plus three DAX measures — all numbers here are altered to hide the client's real metrics.",
      ],
      ru: [
        "Угольной компании нужно было с одного взгляда понимать, куда на самом деле уходит время парка тяжёлых погрузчиков. Воронка стартует со 100% круглосуточного календарного времени и по очереди вычитает каждую категорию простоя, а контрольные точки отмечают стадии готовности техники — «готов к работе», затем «эффективное рабочее время».",
        "Каждая величина — процент от общего доступного времени, а переключатель меняет линейное использование на средневзвешенное (по объёму ковша каждого экскаватора). Всё построено на стандартной гистограмме с накоплением в Power BI и трёх мерах DAX; все числа здесь изменены, чтобы скрыть реальные метрики клиента.",
      ],
    },
  },
  {
    slug: "finance-pl-overview",
    platform: "superset",
    title: {
      en: "Finance P&L overview",
      ru: "Финансовый обзор P&L",
    },
    summary: {
      en: "Budget versus actual, margin waterfall and cost-centre breakdown across three fiscal years — built in Apache Superset on a Postgres warehouse.",
      ru: "План против факта, водопад маржи и разбивка по центрам затрат за три финансовых года — собрано в Apache Superset на хранилище Postgres.",
    },
    metric: "$18.4M",
    embedId: UNSET_EMBED_ID,
    details: {
      en: [
        "A finance team's monthly close, rebuilt as a single self-serve dashboard: budget versus actual by account and cost centre, a margin waterfall from revenue down to operating profit, and a variance view that surfaces the handful of lines actually worth explaining.",
        "The dashboard below is live — filter by fiscal year, scenario and cost centre exactly as the client does. It runs on Apache Superset against a Postgres star schema; the figures shown here are synthetic, generated from the versioned SQL in this repo, so no client data is exposed.",
      ],
      ru: [
        "Ежемесячное закрытие финансовой команды, пересобранное в один self-service дашборд: план против факта по счетам и центрам затрат, водопад маржи от выручки до операционной прибыли и представление отклонений, которое выделяет те немногие строки, что действительно стоит объяснять.",
        "Дашборд ниже живой — фильтруйте по финансовому году, сценарию и центру затрат ровно так же, как это делает клиент. Он работает на Apache Superset поверх схемы «звезда» в Postgres; показанные цифры синтетические, сгенерированы версионируемым SQL из этого репозитория, поэтому данные клиента не раскрываются.",
      ],
    },
  },
];

/**
 * Superset entries are hidden until the instance is configured and the entry carries a
 * real embed UUID — an unconfigured embed would render a dead frame on a page whose whole
 * job is to demonstrate competence. Filtering here (rather than at the call site) keeps
 * the list page, generateStaticParams, the sitemap and the 404 path automatically in sync.
 */
export const showcases: Showcase[] = allShowcases.filter(
  (s) =>
    s.platform !== "superset" ||
    (!!env.NEXT_PUBLIC_SUPERSET_DOMAIN && s.embedId !== UNSET_EMBED_ID),
);

export function getShowcaseSlugs(): string[] {
  return showcases.map((s) => s.slug);
}

export function getShowcase(slug: string): Showcase | undefined {
  return showcases.find((s) => s.slug === slug);
}
