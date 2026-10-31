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
 *                flavour, published to web: the page then offers both ("Power BI" / "Custom").
 *
 * Server-only in effect: lib/cube.ts is, and this imports it. Every importer is a Server
 * Component, a Route Handler or the sitemap — a client component reaching for this file
 * now fails the build, which is the right answer.
 */
export type ShowcasePlatform = "power-bi" | "superset" | "cube" | "js";

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
    platform: "js",
    report: "pnl",
    title: {
      en: "Management P&L suite",
      ru: "Управленческий P&L",
    },
    summary: {
      en: "Budget vs actual for a consumer-goods company and an e-commerce SaaS company: statement, Vitals, revenue and profit bridges, largest variances and profitability, built in custom JavaScript.",
      ru: "Бюджет против факта для компании потребительских товаров и SaaS-компании: отчёт, Vitals, мосты выручки и прибыли, крупнейшие отклонения и рентабельность — на собственном JavaScript.",
    },
    metric: "$3.4B",
    // The page's text: what the report does, short on purpose. Spec and build notes: docs/pnl/.
    details: {
      en: [
        "A management P&L for a two-company group: a consumer-goods business and an e-commerce SaaS business, picked from the brand mark. One statement layout serves both, so every company reads the same way.",
        "Four views. The statement compares actual with budget and prior year line by line, with the full-year budget and latest estimate alongside; it opens collapsed and expands to the account. Vitals puts the key figures on one screen. Analysis walks net revenue and profit from budget to actual on one page and lists the largest variances on the next, top 8, 12 or all, grouped by block or by size, cut by region, channel, line or segment. Profitability breaks margins down by region, channel, category or segment, in actual or constant currency.",
        "Filters cover the period, the versions compared, the reporting currency and FX basis, units and display. Every state has a link: copy it and the report reopens exactly there.",
        "No BI tool and no backend: the browser loads three compressed data files and a TypeScript engine computes every number, reconciled to the source data's 552 control totals. The figures are synthetic.",
      ],
      ru: [
        "Управленческий P&L группы из двух компаний: бизнес потребительских товаров и SaaS-бизнес для e-commerce, выбираются по логотипу. Один макет отчёта для обеих, поэтому каждая компания читается одинаково.",
        "Четыре представления. Отчёт сравнивает факт с бюджетом и прошлым годом построчно, рядом — годовой бюджет и последний прогноз; открывается свёрнутым и раскрывается до счёта. Vitals — ключевые показатели на одном экране. Анализ раскладывает путь выручки и прибыли от бюджета к факту на одной странице и показывает крупнейшие отклонения на следующей: топ-8, 12 или все, по блокам или по величине, в разрезе региона, канала, линии или сегмента. Рентабельность раскладывает маржу по регионам, каналам, категориям или сегментам, в фактической или постоянной валюте.",
        "Фильтры: период, сравниваемые версии, валюта отчётности и курс, единицы и отображение. У каждого состояния есть ссылка: скопируйте её — и отчёт откроется ровно там же.",
        "Без BI-инструмента и без бэкенда: браузер загружает три сжатых файла данных, а движок на TypeScript считает каждое число и сверяется с 552 контрольными итогами исходных данных. Цифры синтетические.",
      ],
    },
  },
  {
    slug: "executive-dashboard",
    platform: "js",
    report: "nordmark",
    title: {
      en: "Retail executive dashboard",
      ru: "Дашборд руководителя ритейлера",
    },
    summary: {
      en: "Twelve trading metrics for a multi-category reseller on one screen: status at a glance, a retail-calendar period picker, Budget / Last year / Previous, region and category filters, built in custom JavaScript.",
      ru: "Двенадцать торговых метрик мультикатегорийного ритейлера на одном экране: статус с первого взгляда, выбор периода по торговому календарю, бюджет / прошлый год / предыдущий период, фильтры по региону и категории — на собственном JavaScript.",
    },
    metric: "€68.4M",
    // Spec and build notes: docs/nordmark/.
    details: {
      en: [
        "An executive dashboard for Nordmark Retail, a fictional multi-category reseller with stores in the Netherlands and Belgium, an online shop and a wholesale arm. Twelve trading metrics as cards: the three numbers that matter first, then what explains them. Each card carries a status chip, a sparkline and a delta against the comparator; the header counts how many are on track, to watch and off track.",
        "The period picker follows the 4-5-4 retail calendar: a week, a month, a quarter or a year, to date, with Budget, Last year or the previous period as the comparator. Region and category filters narrow every card; where a metric has no meaning for one category, the card says so. An ⓘ on every card explains the figure with its actual and target stacked, and a drill path shows what sits behind it. More KPIs wait on a bench.",
        "Every number is computed in the browser from 450 kB of data by a TypeScript engine, checked against 36,657 control rows from the data generator; the Power BI flavour of the same dashboard reconciles to the same totals, card for card. The data is synthetic.",
      ],
      ru: [
        "Дашборд руководителя Nordmark Retail — вымышленного мультикатегорийного ритейлера с магазинами в Нидерландах и Бельгии, интернет-магазином и оптовым направлением. Двенадцать торговых метрик в виде карточек: сначала три главных числа, затем то, что их объясняет. На каждой карточке — статус, спарклайн и отклонение от базы сравнения; в шапке — сколько метрик в норме, под наблюдением и вне плана.",
        "Выбор периода следует торговому календарю 4-5-4: неделя, месяц, квартал или год с начала, в сравнении с бюджетом, прошлым годом или предыдущим периодом. Фильтры по региону и категории сужают каждую карточку; если метрика не имеет смысла для категории, карточка так и говорит. ⓘ на каждой карточке объясняет показатель, факт и цель стоят рядом, а путь детализации показывает, что за ним стоит. Остальные KPI ждут на скамейке.",
        "Каждое число считается в браузере из 450 КБ данных движком на TypeScript и сверяется с 36 657 контрольными строками генератора данных; версия того же дашборда в Power BI сходится с теми же итогами, карточка к карточке. Данные синтетические.",
      ],
    },
  },
  {
    slug: "online-sales-report",
    platform: "js",
    report: "mirelo",
    title: {
      en: "Sales & revenue for a microlender",
      ru: "Продажи и выручка микрокредитора",
    },
    summary: {
      en: "Loans issued, clients, portfolio quality and revenue against targets for an online lender in three markets, with drill-downs to a market, an agent or a client, built in custom JavaScript.",
      ru: "Выданные займы, клиенты, качество портфеля и выручка против целей онлайн-кредитора на трёх рынках, с детализацией до рынка, агента или клиента — на собственном JavaScript.",
    },
    metric: "€12.0M",
    // Spec and build notes: docs/mirelo/. Content shipped as the owner accepted it on 10-30:
    // one placeholder card (channel attainment) and no cross-filtering yet.
    details: {
      en: [
        "A sales and revenue dashboard for Mirelo, a fictional neobank and microlender in Poland, Romania and Portugal. Five views: an overview, loans issued, clients, portfolio quality, and revenue against targets. The header switches market, period (month, quarter to date, year to date, rolling twelve months), anchor month and comparator, budget or prior year, and every view reads them.",
        "A row in a table opens a slide-over: a market, an agent with their loans and quota, or a client with their loan history. Clicking a month on a trend sets the month. The charts are inline SVG, no chart library; the loan sample behind the drill-downs loads only when first needed.",
        "The browser loads under a megabyte of data and a TypeScript engine computes every number, reconciled to the generator's control totals per market and month. The data is synthetic. One card still reads as a placeholder, channel attainment, because the dataset has no channel targets.",
      ],
      ru: [
        "Дашборд продаж и выручки Mirelo — вымышленного необанка и микрокредитора в Польше, Румынии и Португалии. Пять представлений: обзор, выданные займы, клиенты, качество портфеля и выручка против целей. Шапка переключает рынок, период (месяц, квартал с начала, год с начала, скользящие двенадцать месяцев), опорный месяц и базу сравнения, бюджет или прошлый год, и каждое представление их читает.",
        "Строка таблицы открывает боковую панель: рынок, агент с его займами и квотой или клиент с историей займов. Клик по месяцу на тренде выбирает месяц. Графики — встроенный SVG без библиотеки; выборка займов для детализации загружается только по первому запросу.",
        "Браузер загружает меньше мегабайта данных, а движок на TypeScript считает каждое число и сверяется с контрольными итогами генератора по рынкам и месяцам. Данные синтетические. Одна карточка пока заглушка — выполнение плана по каналам, потому что в данных нет целей по каналам.",
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
    // The page's own text (the report is an iframe in a popup, opaque to crawlers):
    // short on purpose. The long-form story is the linked `articleSlug` write-up.
    details: {
      en: [
        "A fleet monitor for a large coal-mining company. The question behind it: of every hour the heavy machines exist, how many go into actual work, and where does the rest go?",
        'The report answers it as a top-down waterfall funnel. It starts at the full 24/7 clock, 100% of available time, and deducts maintenance and every other idle category in turn, each slice shown as a share of the total. Two breakpoints mark the stages that matter: "Ready for work", the time left once major maintenance is done, and "Effective work time", the time the machine spent on its main job.',
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
    articleSlug: "your-own-bi-front-end-with-cube",
    // Until the owner has signed off the write-up (docs/08 §9, phase 4).
    noindex: true,
    // The page's text since 10-22, when the dashboard moved into the popup like every
    // other showcase. Facts from docs/08 §7, the as-built dashboard.
    details: {
      en: [
        "A sales dashboard for an online shop, built without a BI tool: revenue, profit, orders and margin, the monthly trend, the top five categories or countries, and sales by channel.",
        'The data sits in a Postgres star schema. A Cube semantic layer defines each measure once, and every chart asks Cube for it, so two charts can\'t disagree on what "margin" means. Margin is recomputed from summed revenue and profit at every level, never summed itself.',
        "The page queries Cube on the server, three queries and 240 rows, and draws the charts with Tremor on React. The browser never sees the database or Cube's credentials. Results are cached for a day: governed numbers, not a live feed.",
        "The data is synthetic, a generated sales history, so no client figures are shown.",
      ],
      ru: [
        "Дашборд продаж интернет-магазина, собранный без BI-инструмента: выручка, прибыль, заказы и маржа, помесячная динамика, топ-5 категорий или стран и продажи по каналам.",
        "Данные лежат в схеме «звезда» в Postgres. Семантический слой Cube определяет каждую меру один раз, и каждый график берёт её из Cube, поэтому два графика не могут по-разному понимать «маржу». Маржа пересчитывается из сумм выручки и прибыли на каждом уровне и никогда не суммируется сама.",
        "Страница запрашивает Cube на сервере — три запроса, 240 строк — и рисует графики на Tremor и React. Браузер не видит ни базу, ни ключи Cube. Результат кэшируется на сутки: управляемые показатели, а не поток в реальном времени.",
        "Данные синтетические — сгенерированная история продаж, поэтому цифр клиентов здесь нет.",
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

/** Platform labels of the showcases on the site, in list order — the /work intro names these. */
export function getShowcasePlatformLabels(): string[] {
  return [...new Set(showcases.map((s) => PLATFORM_LABEL[s.platform]))];
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
