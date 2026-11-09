import { isCubeConfigured } from "./cube";
import { env } from "./env";
import type { Locale } from "./i18n/config";
import type { JsReport } from "./js-reports";

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
 *  - JS        → not an embed either: a report built in this repo (components/<report>) that
 *                loads static Parquet files and computes every number in the browser
 *                (docs/<report>/). A JS showcase may also carry the same report's Power BI
 *                flavour, published to web: the page then offers both ("Power BI" / "Web report").
 *
 * Server-only in effect: lib/cube.ts is, and this imports it. Every importer is a Server
 * Component, a Route Handler or the sitemap — a client component reaching for this file
 * now fails the build, which is the right answer.
 */
export type ShowcasePlatform = "power-bi" | "superset" | "cube" | "js";

type ShowcaseBase<Text, Paragraphs> = {
  slug: string;
  // The sort key of the /work list, newest first. Internal only: never rendered on any page. The dates set the
  // owner's order (11-05: Cube, exec, P&L, mining, lender, marketing, oldest to newest), not history.
  published: `${number}-${number}-${number}`;
  title: Text;
  summary: Text; // concise — the list-card blurb
  details: Paragraphs; // the detail page's bullet summary (one point per item, 11-05), under the report buttons
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
  | (ShowcaseBase<Text, Paragraphs> & { platform: "cube" })
  // Three reports, so this one names its component (lib/js-reports.ts). The Power BI
  // flavour is optional: absent until the owner has published the report, and the page
  // shows its button only when it is set (owner's call, 10-31).
  | (ShowcaseBase<Text, Paragraphs> & {
      platform: "js";
      report: JsReport;
      powerBi?: PowerBiEmbed;
    });

/** A Power BI report published to web, as the `power-bi` platform carries it. */
export type PowerBiEmbed = { embedUrl: string; href: string };

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
    published: s.published,
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
    case "js":
      return {
        ...base,
        platform: s.platform,
        report: s.report,
        powerBi: s.powerBi,
      };
  }
}

export const PLATFORM_LABEL: Record<ShowcasePlatform, string> = {
  "power-bi": "Power BI",
  superset: "Superset",
  cube: "Cube + Tremor",
  js: "Custom JS",
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
    slug: "pnl-suite",
    published: "2026-10-30",
    platform: "js",
    report: "pnl",
    title: {
      en: "Management PnL report",
      ru: "Управленческий PnL-отчёт",
    },
    summary: {
      en: "Budget vs actual P&L for two companies: statement, KPIs, variances, bridges, profitability.",
      ru: "План против факта P&L двух компаний: отчёт, KPI, отклонения, мосты, прибыльность.",
    },
    metric: "$3.4B",
    // The page's text: what the report does, short on purpose. Spec and build notes: docs/pnl/.
    details: {
      en: [
        "Management P&L for a two-company group: consumer goods and e-commerce SaaS, one layout",
        "Period: month, quarter or year to date, last 12 months, full year",
        "Currency: USD, EUR or GBP, at actual or constant rates",
        "Statement: every line vs budget, latest estimate or prior year, from block down to account",
        "KPIs: net revenue, adjusted EBITDA, operating profit, gross margin %, opex % of revenue, status vs budget",
        "Drivers: units, revenue per unit, gross-to-net, A&P; GMV, take rate, active merchants, ARR",
        "Variances: every line ranked vs budget, FX share, by region, channel, category or price tier",
        "Bridges: net revenue and profit from budget to actual, by driver, then FX",
        "Profitability by region and category: revenue, contribution and EBITDA shares, growth vs margin",
        "Complex ETL under the hood and data prep",
      ],
      ru: [
        "Управленческий P&L группы из двух компаний: потребительские товары и e-commerce SaaS, единый макет",
        "Период: месяц, квартал или год с начала, последние 12 месяцев, полный год",
        "Валюта: USD, EUR или GBP, по фактическому или постоянному курсу",
        "Отчёт: каждая строка против бюджета, последней оценки или прошлого года, от блока до счёта",
        "KPI: чистая выручка, скорр. EBITDA, операционная прибыль, валовая маржа %, опер. расходы % от выручки, статус против бюджета",
        "Драйверы: штуки, выручка на штуку, gross-to-net, A&P; GMV, take rate, активные мерчанты, ARR",
        "Отклонения: каждая строка по отклонению от бюджета, доля FX, по региону, каналу, категории или ценовому сегменту",
        "Мосты: чистая выручка и прибыль от бюджета к факту по драйверам, затем FX",
        "Прибыльность по регионам и категориям: доли выручки, вклада и EBITDA, рост против маржи",
        "Сложный ETL и подготовка данных под капотом",
      ],
    },
  },
  {
    slug: "executive-dashboard",
    published: "2026-10-29",
    platform: "js",
    report: "nordmark",
    title: {
      en: "Retail executive dashboard",
      ru: "Дашборд руководителя розничной сети",
    },
    summary: {
      en: "Twelve retail KPIs vs budget, last year or previous period, by region and category.",
      ru: "Двенадцать розничных KPI против бюджета, прошлого года или периода, по регионам и категориям.",
    },
    metric: "€68.4M",
    // Spec and build notes: docs/nordmark/.
    details: {
      en: [
        "Executive dashboard for a multi-channel retailer: stores in the Netherlands and Belgium, online, wholesale",
        "Period on the 4-5-4 retail calendar: week, month, quarter or year to date",
        "Comparison: budget, last year or previous period",
        "Twelve KPI cards with on track, watch and off track status",
        "Lead KPIs: net sales, total margin, weeks of cover",
        "Also: markdown, availability, EBITDA, like-for-like growth, gross margin, sell-through, GMROI, supplier OTIF, channel mix",
        "Each card: value, delta, trend, target, formula, drill path",
        "Filters: region or format, category, KPI group, lever, owner",
        "Complex ETL under the hood and data prep",
      ],
      ru: [
        "Дашборд руководителя для ритейлера: магазины в Нидерландах и Бельгии, онлайн, опт",
        "Период по розничному календарю 4-5-4: неделя, месяц, квартал или год с начала",
        "Сравнение: бюджет, прошлый год или прошлый период",
        "Двенадцать карточек KPI со статусом: в норме, внимание, вне цели",
        "Ведущие KPI: чистые продажи, общая маржа, недели запаса",
        "Также: уценки, доступность, EBITDA, рост сопоставимых продаж, валовая маржа, sell-through, GMROI, OTIF поставщиков, структура каналов",
        "Каждая карточка: значение, отклонение, тренд, цель, формула, путь детализации",
        "Фильтры: регион или формат, категория, группа KPI, рычаг, ответственный",
        "Сложный ETL и подготовка данных под капотом",
      ],
    },
  },
  {
    slug: "online-sales-report",
    published: "2026-11-03",
    platform: "js",
    report: "mirelo",
    // Published-to-web Power BI flavour (owner, 11-03): the Mirelo Sales report, published 11-03
    // (replaced the owner's stand-in "Coal trucks" the same evening). Swapping it is these two URLs.
    powerBi: {
      embedUrl:
        "https://app.powerbi.com/view?r=eyJrIjoiMmVmNWU0MWUtNmE1ZS00OWRkLTk2ZTQtZTdlZjY3NjA0MDA3IiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9&embedImagePlaceholder=true",
      href: "https://app.powerbi.com/view?r=eyJrIjoiMmVmNWU0MWUtNmE1ZS00OWRkLTk2ZTQtZTdlZjY3NjA0MDA3IiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
    },
    title: {
      en: "Lender's Sales & Revenue report",
      ru: "Отчёт о продажах и выручке кредитора",
    },
    summary: {
      en: "Loans, clients, portfolio quality and revenue vs budget for an online lender in three markets.",
      ru: "Займы, клиенты, качество портфеля и выручка против бюджета онлайн-кредитора на трёх рынках.",
    },
    metric: "€12.0M",
    // Spec and build notes: docs/mirelo/ (the owner's four review rounds of 11-01; data live from Supabase since 11-03).
    details: {
      en: [
        "Sales and revenue for an online lender in Poland, Romania and Portugal, in EUR",
        "Five views: overview, loans, clients, portfolio quality, revenue",
        "Period: month, quarter, year or custom range; vs budget or prior year; by market",
        "Overview: loans, principal, new clients, returning share, 30+ DPD",
        "Loans: application funnel, budget-to-actual bridge, product × market heatmap, cycle time vs SLA, agent leaderboard vs quota",
        "Clients: acquisition by channel, approval rates, cohort repeat heatmap",
        "Portfolio: DPD buckets, vintage curves, roll rates, overdue by product",
        "Revenue: interest, fees, interchange, subscriptions vs budget; new vs churned subscribers",
        "Drill-down from any total to the loans and the client card, with CSV export",
        "Complex ETL under the hood and data prep",
      ],
      ru: [
        "Продажи и выручка онлайн-кредитора в Польше, Румынии и Португалии, в евро",
        "Пять представлений: обзор, займы, клиенты, качество портфеля, выручка",
        "Период: месяц, квартал, год или произвольный диапазон; против бюджета или прошлого года; по рынкам",
        "Обзор: займы, сумма выдач, новые клиенты, доля повторных, просрочка 30+",
        "Займы: воронка заявок, мост от бюджета к факту, тепловая карта продукт × рынок, срок рассмотрения против SLA, рейтинг агентов против квоты",
        "Клиенты: привлечение по каналам, уровень одобрения, тепловая карта повторных займов по когортам",
        "Портфель: корзины просрочки, кривые винтажей, переходы между корзинами, просрочка по продуктам",
        "Выручка: проценты, комиссии, интерчейндж, подписки против бюджета; новые и ушедшие подписчики",
        "Детализация от любого итога до займов и карточки клиента, с выгрузкой в CSV",
        "Сложный ETL и подготовка данных под капотом",
      ],
    },
  },
  {
    slug: "marketing-acquisition-dashboard",
    published: "2026-11-05",
    platform: "js",
    report: "marketing",
    // The ACME Marketing report published to web from Fabric (owner, 11-05). The web flavour reads Supabase schema
    // marketing_demo through /api/marketing; its button shows once MARKETING_DATABASE_URL is set (isJsReportLive).
    powerBi: {
      embedUrl:
        "https://app.fabric.microsoft.com/view?r=eyJrIjoiNTY2MTc5YjYtY2JkMy00YzM0LWE4ZmQtNTAwNmU3MDhjNTM0IiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
      href: "https://app.fabric.microsoft.com/view?r=eyJrIjoiNTY2MTc5YjYtY2JkMy00YzM0LWE4ZmQtNTAwNmU3MDhjNTM0IiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
    },
    title: {
      en: "Marketing dashboard for a SaaS",
      ru: "Маркетинговый дашборд SaaS-продукта",
    },
    summary: {
      en: "Spend, CAC, ROAS, conversion into paid and cohort payback by channel and campaign.",
      ru: "Расходы, CAC, ROAS, конверсия в оплату и окупаемость когорт по каналам и кампаниям.",
    },
    metric: "$188.4k",
    // Spec and build notes: docs/marketing/ (the pack of 11-05 and what changed here).
    details: {
      en: [
        "Paid acquisition across web, iOS and Android: 6 channels, 8 networks, 19 campaigns",
        "Vitals: spend, new clients, conversion into paid, time to activation, CAC, 90-day ROAS, each vs last year",
        "Daily dynamics per vital, against the same days last year",
        "Period: last 7 or 30 days, month or quarter to date, custom range; vs previous period, last year or plan",
        "Filters: platform, market, sales tier, channel, network, campaign, attribution model",
        "Overview: acquisition funnel, guardrails, anomalies, top movers by ROAS change, spend vs plan with paid CAC",
        "Channels: spend, CAC, ROAS, pacing, web vs app funnel, down to platform",
        "Campaigns: pacing, CPA, ROAS, CTR trend, frequency, fatigue flags; keywords and placements; churn and refunds",
        "Journey and cohorts: landing pages, onboarding steps, activation; payback, retention, LTV:CAC by channel",
        "Complex ETL under the hood and data prep",
      ],
      ru: [
        "Платное привлечение на вебе, iOS и Android: 6 каналов, 8 сетей, 19 кампаний",
        "Ключевые показатели: расходы, новые клиенты, конверсия в оплату, время до активации, CAC, ROAS за 90 дней, каждый против прошлого года",
        "Дневная динамика каждого показателя против тех же дней прошлого года",
        "Период: последние 7 или 30 дней, месяц или квартал с начала, произвольный диапазон; против прошлого периода, прошлого года или плана",
        "Фильтры: платформа, рынок, тип продаж, канал, сеть, кампания, модель атрибуции",
        "Обзор: воронка привлечения, контрольные метрики, аномалии, лидеры изменения ROAS, расходы против плана с платным CAC",
        "Каналы: расходы, CAC, ROAS, темп бюджета, воронка веб против приложения, до платформы",
        "Кампании: темп бюджета, CPA, ROAS, динамика CTR, частота, флаги выгорания; ключевые слова и площадки; отток и возвраты",
        "Путь и когорты: посадочные страницы, шаги онбординга, активация; окупаемость, удержание, LTV:CAC по каналам",
        "Сложный ETL и подготовка данных под капотом",
      ],
    },
  },
  {
    slug: "mining-time-utilization",
    published: "2026-10-31",
    platform: "js",
    report: "trucks",
    title: {
      en: "Coal mining machinery time utilization",
      ru: "Использование времени техники угольного разреза",
    },
    summary: {
      en: "Where a mining fleet's 24/7 hours go: from calendar time down to effective work, vs plan.",
      ru: "Куда уходят круглосуточные часы горной техники: от календарного времени до эффективной работы, против плана.",
    },
    metric: "100%",
    // The "Trucks" report, published to web from Fabric (owner, 11-04; replaced the earlier app.powerbi.com link). The
    // web flavour (11-09) reads Supabase schema trucks_demo through /api/trucks; its button shows once
    // TRUCKS_DATABASE_URL is set (isJsReportLive).
    powerBi: {
      embedUrl:
        "https://app.fabric.microsoft.com/view?r=eyJrIjoiODlkMmE2YzUtYmQ0Zi00ZmQwLTk5NjEtNjY3NzZiNTNiMjFkIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
      href: "https://app.fabric.microsoft.com/view?r=eyJrIjoiODlkMmE2YzUtYmQ0Zi00ZmQwLTk5NjEtNjY3NzZiNTNiMjFkIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
    },
    articleSlug: "power-bi-time-utilization-funnel",
    // The page's own text (the report is an iframe in a popup, opaque to crawlers):
    // short on purpose. The long-form story is the linked `articleSlug` write-up.
    details: {
      en: [
        "Fleet time utilization for a coal mining company: where each machine's 24/7 hours go",
        "Top-down waterfall from 100% of calendar time to effective work time",
        "Maintenance and every idle category deducted in turn, as a share of total time",
        "Breakpoints: ready for work, effective work time",
        "Linear utilization or weighted by excavator ladle volume",
        "Actuals vs weekly and monthly plans",
        "Complex ETL under the hood and data prep",
      ],
      ru: [
        "Использование времени техники угольного разреза: куда уходят круглосуточные часы каждой машины",
        "Водопад сверху вниз от 100% календарного времени до эффективной работы",
        "Обслуживание и каждая категория простоев вычитаются по очереди, как доля от общего времени",
        "Контрольные точки: готовность к работе, эффективное рабочее время",
        "Линейный расчёт или взвешенный по объёму ковша экскаватора",
        "Факт против недельного и месячного плана",
        "Сложный ETL и подготовка данных под капотом",
      ],
    },
  },
  {
    slug: "finance-pl-overview",
    published: "2026-07-31",
    platform: "superset",
    title: {
      en: "Finance P&L overview",
      ru: "Финансовый обзор P&L",
    },
    summary: {
      en: "Budget vs actual, margin waterfall and cost-centre variances for a finance team over three fiscal years.",
      ru: "План против факта, водопад маржи и отклонения по центрам затрат финансовой команды за три года.",
    },
    metric: "$18.4M",
    embedId: UNSET_EMBED_ID,
    details: {
      en: [
        "Monthly P&L over three fiscal years: actual, budget, forecast",
        "Budget vs actual by account and cost centre",
        "Margin waterfall from revenue down to operating profit",
        "Variances: the lines worth explaining",
        "Costs across 8 cost centres in four regions",
        "Filters: fiscal year, scenario, cost centre",
        "Complex ETL under the hood and data prep",
      ],
      ru: [
        "Ежемесячный P&L за три финансовых года: факт, бюджет, прогноз",
        "План против факта по счетам и центрам затрат",
        "Водопад маржи от выручки до операционной прибыли",
        "Отклонения: строки, которые стоит объяснить",
        "Затраты по 8 центрам затрат в четырёх регионах",
        "Фильтры: финансовый год, сценарий, центр затрат",
        "Сложный ETL и подготовка данных под капотом",
      ],
    },
  },
  {
    slug: "online-sales-cube",
    published: "2026-09-21",
    platform: "cube",
    title: {
      en: "Cube.dev for online sales reporting",
      ru: "Cube.dev для отчётности онлайн-продаж",
    },
    summary: {
      en: "Revenue, profit, orders and margin for an online shop by month, category, country and channel.",
      ru: "Выручка, прибыль, заказы и маржа интернет-магазина по месяцам, категориям, странам и каналам.",
    },
    metric: "$4.77M",
    articleSlug: "your-own-bi-front-end-with-cube",
    // Until the owner has signed off the write-up (docs/08 §9, phase 4).
    noindex: true,
    // The page's text since 10-22, when the dashboard moved into the popup like every
    // other showcase. Facts from docs/08 §7, the as-built dashboard.
    details: {
      en: [
        "Sales dashboard for an online shop, in USD",
        "KPIs: revenue, profit, orders, margin, each vs the same months last year",
        "Revenue, profit and orders by month",
        "Top 5 categories or countries by revenue, profit or margin",
        "Sales by channel: revenue, profit, orders, margin",
        "One definition per metric across every chart",
        "Filter: year",
        "Complex ETL under the hood and data prep",
      ],
      ru: [
        "Дашборд продаж интернет-магазина, в долларах",
        "KPI: выручка, прибыль, заказы, маржа, каждый против тех же месяцев прошлого года",
        "Выручка, прибыль и заказы по месяцам",
        "Топ-5 категорий или стран по выручке, прибыли или марже",
        "Продажи по каналам: выручка, прибыль, заказы, маржа",
        "Одно определение каждой метрики во всех графиках",
        "Фильтр: год",
        "Сложный ETL и подготовка данных под капотом",
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
export const showcases: Showcase[] = allShowcases
  .filter((s) => {
    switch (s.platform) {
      case "superset":
        return (
          !!env.NEXT_PUBLIC_SUPERSET_DOMAIN && s.embedId !== UNSET_EMBED_ID
        );
      case "cube":
        return isCubeConfigured();
      default:
        return true;
    }
  })
  // newest first; Array.prototype.sort is stable, so a day's entries keep their order above
  .sort((a, b) => b.published.localeCompare(a.published));

/**
 * The env var a JS report's data needs on the server, for the reports that read Supabase through a server route
 * (CLAUDE.md § Supabase). Without it the route answers 503, so the page leaves the "Web report" button out rather
 * than open a report that cannot load. Mirelo is not listed: it has been live since 11-03.
 */
const REPORT_DATA_ENV: Partial<Record<JsReport, string>> = {
  marketing: "MARKETING_DATABASE_URL",
  pnl: "PNL_DATABASE_URL", // 2026-11-09: the P&L rows moved to Supabase (pnl_demo)
  trucks: "TRUCKS_DATABASE_URL", // 2026-11-09
};

/** Whether the "Web report" of a JS showcase can open (read at build / regeneration, server-side only). */
export function isJsReportLive(report: JsReport): boolean {
  const key = REPORT_DATA_ENV[report];
  return key === undefined || !!process.env[key];
}

/** Platform labels of the showcases on the site, in list order — the /work intro names these. */
export function getShowcasePlatformLabels(): string[] {
  return [
    ...new Set(
      showcases.flatMap((s) => [
        PLATFORM_LABEL[s.platform],
        ...(s.platform === "js" && s.powerBi
          ? [PLATFORM_LABEL["power-bi"]]
          : []),
      ]),
    ),
  ];
}

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
