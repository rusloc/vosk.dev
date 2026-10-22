import { isCubeConfigured } from "./cube";
import { env } from "./env";
import type { Locale } from "./i18n/config";

/**
 * Work showcase data — client dashboards written up like case studies on /work.
 * Data lives here (not in the component) so pages stay thin renderers and a future
 * CMS/MDX swap is cheap. The list page shows concise cards; each links to a detail
 * page (/work/[slug]) with the write-up and the live report embedded.
 *
 * Three platforms, and they render differently enough to be separate shapes (ADR-0002):
 *  - Power BI  → a public "publish to web" URL, dropped into an iframe as-is.
 *  - Superset  → no public URL at all; an embed UUID for which the server mints a
 *                short-lived guest token per viewer (see lib/superset.ts).
 *  - Cube      → not an embed at all: the page queries Cube server-side and draws the
 *                dashboard itself with Tremor charts (docs/08-cube-sales-showcase.md).
 *
 * Server-only in effect: lib/cube.ts is, and this imports it. Every importer is a Server
 * Component, a Route Handler or the sitemap — a client component reaching for this file
 * now fails the build, which is the right answer.
 */
export type ShowcasePlatform = "power-bi" | "superset" | "cube";

type ShowcaseBase<Text, Paragraphs> = {
  slug: string;
  title: Text;
  summary: Text; // concise — the list-card blurb
  details: Paragraphs; // the detail page's text, under the button that opens the report
  metric?: string; // headline figure for the list-card report illustration (e.g. "$4.2M")
  articleSlug?: string; // optional /blog/<slug> write-up linked from the detail page
  // Reachable, but kept out of the index: an entry whose copy still says it's a
  // placeholder is a thin page advertising itself as one. Drop the flag the
  // moment the write-up describes a real engagement.
  noindex?: boolean;
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
    })
  // No fields of its own: there is one Cube dashboard and the detail page renders it by
  // name. A report id earns its place when a second one exists.
  | (ShowcaseBase<Text, Paragraphs> & { platform: "cube" });

/**
 * A locale the site no longer publishes but whose copy is kept in place. Russian
 * was removed from `locales`; the translations below are retained so re-adding it
 * is a one-line change in `lib/i18n/config.ts` rather than a re-translation.
 */
type RetiredLocale = "ru";

/**
 * Source entry: copy carried in every LIVE locale — adding a locale breaks this
 * loudly — plus optional copy for retired ones, which `localize` never reads.
 */
export type Showcase = ShowcaseOf<
  Record<Locale, string> & Partial<Record<RetiredLocale, string>>,
  Record<Locale, string[]> & Partial<Record<RetiredLocale, string[]>>
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
    noindex: s.noindex,
  };
  switch (s.platform) {
    case "power-bi":
      return {
        ...base,
        platform: s.platform,
        embedUrl: s.embedUrl,
        href: s.href,
      };
    case "superset":
      return { ...base, platform: s.platform, embedId: s.embedId };
    case "cube":
      return { ...base, platform: s.platform };
  }
}

export const PLATFORM_LABEL: Record<ShowcasePlatform, string> = {
  "power-bi": "Power BI",
  superset: "Superset",
  cube: "Cube + Tremor",
};

/** Placeholder marker — an entry still carrying this is not publishable. */
const UNSET_EMBED_ID = "REPLACE-WITH-EMBED-UUID";

/**
 * The showcase entries themselves. Adding one: a real client report's publish-to-web
 * `?r=…` URL for Power BI (or an embed UUID for Superset), plus `details` carrying the
 * actual story — goal → data → what the dashboard changed.
 */
const allShowcases: Showcase[] = [
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
    // The page's own text (the report is an iframe in a popup, opaque to crawlers):
    // short on purpose. The long-form story is the linked `articleSlug` write-up.
    details: {
      en: [
        "A fleet monitor for a large coal-mining company. The question behind it: of every hour the heavy machines exist, how many go into actual work, and where does the rest go?",
        "The report answers it as a top-down waterfall funnel. It starts at the full 24/7 clock, 100% of available time, and deducts maintenance and every other idle category in turn, each slice shown as a share of the total. Two breakpoints mark the stages that matter: \"Ready for work\", the time left once major maintenance is done, and \"Effective work time\", the time the machine spent on its main job.",
        "A switcher flips between linear utilization and an average weighted by each excavator's ladle volume, so a big machine standing idle costs what it should. Actuals and two plans, weekly and monthly, run through the same category hierarchy.",
        "Built in Power BI on a plain stacked bar chart and a handful of DAX measures, with no custom visual. All figures are altered to protect the client's data.",
      ],
      ru: [
        "Монитор парка техники крупной угледобывающей компании. Вопрос, на который он отвечает: сколько из каждого часа тяжёлая техника реально работает и куда уходит остальное время?",
        "Ответ — воронка-водопад сверху вниз. Она начинается с полного круглосуточного времени, 100% доступного, и по очереди вычитает обслуживание и все остальные категории простоев; каждый срез показан как доля от общего. Две контрольные точки отмечают важные этапы: «Готов к работе» — время, оставшееся после крупного обслуживания, и «Эффективное рабочее время» — время, которое машина занималась основной работой.",
        "Переключатель меняет линейный расчёт на средневзвешенный по объёму ковша каждого экскаватора, чтобы простой большой машины стоил столько, сколько должен. Факт и два плана, недельный и месячный, проходят через одну и ту же иерархию категорий.",
        "Сделано в Power BI на обычной линейчатой диаграмме с накоплением и нескольких мерах DAX, без кастомных визуалов. Все цифры изменены, чтобы защитить данные клиента.",
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
  {
    slug: "online-sales-cube",
    platform: "cube",
    title: {
      en: "Online sales on a semantic layer",
      ru: "Онлайн-продажи на семантическом слое",
    },
    summary: {
      en: "Revenue, orders, margin and channel mix for an online shop — a Postgres star schema, measures defined once in a Cube semantic layer, and a custom Tremor front end instead of a BI tool.",
      ru: "Выручка, заказы, маржа и структура каналов интернет-магазина — схема «звезда» в Postgres, меры, один раз определённые в семантическом слое Cube, и собственный фронтенд на Tremor вместо BI-инструмента.",
    },
    metric: "$4.77M",
    // Until the owner has signed off the write-up (docs/08 §9, phase 4).
    noindex: true,
    // Not rendered: since 09-27 the Cube page shows its header only (page.tsx). Kept
    // because the union requires it and the copy may return.
    details: {
      en: [
        "Postgres star schema → Cube semantic layer → this page. Every figure is a governed measure — revenue, orders and margin are defined once in the model, not re-derived per chart.",
        "Synthetic data, real stack. The page queries Cube on the server and caches the result for a day, so it shows governed numbers, not a live feed.",
      ],
      ru: [
        "Схема «звезда» в Postgres → семантический слой Cube → эта страница. Каждая цифра — управляемая мера: выручка, заказы и маржа определены один раз в модели, а не пересчитываются в каждом графике.",
        "Данные синтетические, стек настоящий. Страница запрашивает Cube на сервере и кэширует результат на сутки — это управляемые показатели, а не поток в реальном времени.",
      ],
    },
  },
];

/**
 * Superset entries are hidden until the instance is configured and the entry carries a
 * real embed UUID — an unconfigured embed would render a dead frame on a page whose whole
 * job is to demonstrate competence. Cube entries are hidden until CUBE_API_URL and
 * CUBE_API_SECRET are both set: without them the detail page cannot be built at all.
 * Filtering here (rather than at the call site) keeps the list page, generateStaticParams,
 * the sitemap and the 404 path automatically in sync.
 */
export const showcases: Showcase[] = allShowcases.filter((s) => {
  switch (s.platform) {
    case "superset":
      return !!env.NEXT_PUBLIC_SUPERSET_DOMAIN && s.embedId !== UNSET_EMBED_ID;
    case "cube":
      return isCubeConfigured();
    default:
      return true;
  }
});

export function getShowcaseSlugs(): string[] {
  return showcases.map((s) => s.slug);
}

/** Slugs safe to advertise in the sitemap — {@link getShowcaseSlugs} minus `noindex` entries. */
export function getIndexableShowcaseSlugs(): string[] {
  return showcases.filter((s) => !s.noindex).map((s) => s.slug);
}

export function getShowcase(slug: string): Showcase | undefined {
  return showcases.find((s) => s.slug === slug);
}
