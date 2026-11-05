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
        "Management P&L for a two-company group: consumer goods and e-commerce SaaS, one layout for both",
        "Period: one month, quarter or year to date, last 12 months or full year; USD, EUR or GBP at actual or constant rates",
        "Statement: every line against two comparators out of Budget, Latest estimate and Prior year, full-year figures alongside; expands from blocks to the account",
        "Vitals: net revenue, Adj. EBITDA, operating profit, gross margin %, opex % of revenue, each with a status vs Budget",
        "Driver cards by company: units, revenue per unit, gross-to-net, A&P for consumer goods; GMV, take rate, active merchants, ARR for SaaS; full-year outlook for both",
        "Analysis: every line to operating profit ranked by variance vs Budget, FX share shown; filter by region, channel, category or price tier, alone or combined",
        "Bridges: net revenue from comparator to actual by driver at constant currency, then FX; profit from the comparator's Adj. EBITDA to actual operating profit",
        "Profitability by region at constant currency: revenue, contribution and Adj. EBITDA shares, growth × margin, region × category mix",
        "Synthetic data; every number reconciles to 552 control totals",
      ],
      ru: [
        "Управленческий P&L группы из двух компаний: потребительские товары и SaaS для e-commerce, один макет на обе",
        "Период: месяц, квартал или год с начала, последние 12 месяцев, полный год; USD, EUR или GBP по фактическому или постоянному курсу",
        "Отчёт: каждая строка против двух баз из бюджета, последнего прогноза и прошлого года, рядом годовые цифры; раскрывается от блоков до счёта",
        "Vitals: чистая выручка, скорр. EBITDA, операционная прибыль, валовая маржа %, опер. расходы в % выручки, у каждой статус против бюджета",
        "Карточки драйверов по компании: штуки, выручка на единицу, gross-to-net, A&P для товаров; GMV, take rate, активные мерчанты, ARR для SaaS; прогноз на год для обеих",
        "Анализ: все строки до операционной прибыли по величине отклонения от бюджета, с долей курса; фильтр по региону, каналу, категории или ценовому сегменту, по одному или вместе",
        "Мосты: выручка от базы к факту по драйверам в постоянной валюте, затем курс; прибыль от скорр. EBITDA базы к фактической операционной прибыли",
        "Рентабельность по регионам в постоянной валюте: доли выручки, маржинального дохода и скорр. EBITDA, рост × маржа, микс регион × категория",
        "Данные синтетические; каждое число сходится с 552 контрольными итогами",
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
        "Executive dashboard for a fictional reseller: stores in the Netherlands and Belgium, an online shop, a wholesale arm",
        "Period on the 4-5-4 retail calendar: week, month, quarter or year to date, vs Budget, Last year or the previous period",
        "Twelve KPI cards; the header counts on track, watch and off track",
        "Lead cards: net sales, total margin (front plus back), weeks of cover",
        "Then markdown, availability, EBITDA, like-for-like growth, front gross margin, sell-through, GMROI, supplier OTIF, channel mix",
        "Each card: value, delta, sparkline, status chip; a pop-up with actual vs target, formula and a worked example; a drill path to the lowest grain",
        "Filters: region or format, category, KPI group, lever, owner; a card a category can't split says so",
        "20 more KPIs on an inactive bench",
        "Synthetic data, checked against 36,657 control rows",
      ],
      ru: [
        "Дашборд руководителя вымышленного ритейлера: магазины в Нидерландах и Бельгии, интернет-магазин, опт",
        "Период по торговому календарю 4-5-4: неделя, месяц, квартал или год с начала, против бюджета, прошлого года или предыдущего периода",
        "Двенадцать карточек KPI; в шапке счёт: в норме, под наблюдением, вне плана",
        "Главные карточки: чистые продажи, общая маржа (фронт плюс бэк), недели покрытия запасом",
        "Дальше уценки, доступность товара, EBITDA, рост LFL, фронт-маржа, sell-through, GMROI, OTIF поставщиков, микс каналов",
        "На карточке: значение, отклонение, спарклайн, статус; окно с фактом против цели, формулой и примером расчёта; путь детализации до нижнего уровня",
        "Фильтры: регион или формат, категория, группа KPI, рычаг, владелец; карточка, которую нельзя разбить по категории, так и пишет",
        "Ещё 20 KPI на скамейке, выключены",
        "Данные синтетические, сверены с 36 657 контрольными строками",
      ],
    },
  },
  {
    slug: "online-sales-report",
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
      en: "Sales & revenue for a microlender",
      ru: "Продажи и выручка микрокредитора",
    },
    summary: {
      en: "Loans issued, clients, portfolio quality and revenue against targets for an online lender in three markets, with drill-downs to a market, an agent or a client, built in custom JavaScript.",
      ru: "Выданные займы, клиенты, качество портфеля и выручка против целей онлайн-кредитора на трёх рынках, с детализацией до рынка, агента или клиента — на собственном JavaScript.",
    },
    metric: "€12.0M",
    // Spec and build notes: docs/mirelo/ (the owner's four review rounds of 11-01; data live from Supabase since 11-03).
    details: {
      en: [
        "Sales and revenue for a fictional neobank and microlender in Poland, Romania and Portugal, in EUR",
        "Five views: overview, loans issued, clients, portfolio quality, revenue and targets",
        "Filters window: a month, quarter, year or custom range of closed months, Jan 2024 to Sep 2026; vs Budget or prior year; market",
        "Overview: loans and principal, new clients, returning share, 30+ DPD, vs prior year and vs Budget where one exists",
        "Loans: application funnel, Budget-to-actual bridge, product × market heatmap, cycle time vs SLA, agent and partner leaderboard by quota",
        "Clients and portfolio: acquisition by channel, cohort repeat heatmap, DPD buckets, vintage curves, roll rates, overdue by product",
        "Revenue: interest, fees, interchange and subscriptions vs Budget and prior year; attainment by market; new vs churned subscribers",
        "Drill-downs list every row: a market's or an agent's loans, a channel's clients, a product's overdue loans, then the client card; paged, with full CSV export",
        "Synthetic data, read live from Supabase and reconciled to the generator's control totals; a Power BI version alongside",
      ],
      ru: [
        "Продажи и выручка вымышленного необанка и микрокредитора в Польше, Румынии и Португалии, в евро",
        "Пять представлений: обзор, выданные займы, клиенты, качество портфеля, выручка и цели",
        "Окно фильтров: месяц, квартал, год или произвольный диапазон закрытых месяцев, с января 2024 по сентябрь 2026; против бюджета или прошлого года; рынок",
        "Обзор: займы и сумма выдач, новые клиенты, доля повторных, просрочка 30+, против прошлого года и против бюджета, где он есть",
        "Займы: воронка заявок, мост от бюджета к факту, тепловая карта продукт × рынок, время этапов против SLA, рейтинг агентов и партнёров по выполнению квоты",
        "Клиенты и портфель: привлечение по каналам, тепловая карта повторных займов по когортам, корзины просрочки, винтажи, roll rates, просрочка по продуктам",
        "Выручка: проценты, комиссии, интерчейндж и подписки против бюджета и прошлого года; выполнение плана по рынкам; новые и ушедшие подписчики",
        "Детализация показывает все строки: займы рынка или агента, клиенты канала, просроченные займы продукта, затем карточка клиента; по страницам, с выгрузкой всего списка в CSV",
        "Данные синтетические, читаются из Supabase и сверены с контрольными итогами генератора; рядом версия в Power BI",
      ],
    },
  },
  {
    slug: "marketing-acquisition-dashboard",
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
      en: "Paid acquisition dashboard for a SaaS product",
    },
    summary: {
      en: "Spend, new clients, conversion into paid, CAC and 90-day ROAS for a SaaS product on web, iOS and Android, down to campaign, keyword and cohort payback.",
    },
    metric: "$188.4k",
    // Spec and build notes: docs/marketing/ (the pack of 11-05 and what changed here).
    details: {
      en: [
        "Paid-acquisition console for a fictional SaaS analytics product: web, iOS, Android; 6 channels, 8 networks, 19 campaigns; Jan 2025 to Nov 2026, USD",
        "Vitals: spend, new clients, conversion into paid, time to activation, CAC, ROAS 90 d, each vs last year, with a daily dynamics pop-up",
        "Filters window: last 7 or 30 days, month or quarter to date, custom range; vs previous period, last year or plan; platform, market, sales tier, channel, network, campaign, attribution model",
        "Overview: acquisition funnel, guardrails, spend and paid customers by channel, anomalies, top movers by ROAS change, spend vs plan with paid CAC",
        "Channels: matrix of spend, CAC, ROAS, pacing and flags, expandable to platform; web vs app funnel; a row click scopes the other cards",
        "Campaigns: table with pacing, CPA, ROAS, CTR trend, frequency and fatigue flags; keywords and placements; churn and refunds by channel",
        "Journey: landing and store pages, onboarding steps of paid traffic, time to activation, activation by platform",
        "Cohorts: payback by acquisition month, retention grid, LTV:CAC and payback months by channel",
        "Synthetic data, read from Supabase, reconciled to the generator's 28,660 control totals; a Power BI version alongside",
      ],
      ru: [
        "Консоль платного привлечения вымышленного SaaS-продукта для аналитики: веб, iOS, Android; 6 каналов, 8 сетей, 19 кампаний; с января 2025 по ноябрь 2026, в долларах",
        "Ключевые показатели: расходы, новые клиенты, конверсия в оплату, время до активации, CAC, ROAS за 90 дней, каждый против прошлого года, с окном дневной динамики",
        "Окно фильтров: последние 7 или 30 дней, месяц или квартал с начала, произвольный диапазон; против прошлого периода, прошлого года или плана; платформа, рынок, тип продаж, канал, сеть, кампания, модель атрибуции",
        "Обзор: воронка привлечения, контрольные метрики, расходы и платящие клиенты по каналам, аномалии, лидеры изменения ROAS, расходы против плана с платным CAC",
        "Каналы: матрица с расходами, CAC, ROAS, темпом бюджета и флагами, раскрывается до платформы; воронка веб против приложения; клик по строке сужает остальные карточки",
        "Кампании: таблица с темпом бюджета, CPA, ROAS, динамикой CTR, частотой и флагами выгорания; ключевые слова и площадки; отток и возвраты по каналам",
        "Путь: посадочные страницы и страницы сторов, шаги онбординга платного трафика, время до активации, активация по платформам",
        "Когорты: окупаемость по месяцу привлечения, сетка удержания, LTV:CAC и срок окупаемости по каналам",
        "Данные синтетические, читаются из Supabase и сверены с 28 660 контрольными итогами генератора; рядом версия в Power BI",
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
    // The "Trucks" report, published to web from Fabric (owner, 11-04; replaced the earlier app.powerbi.com link).
    embedUrl:
      "https://app.fabric.microsoft.com/view?r=eyJrIjoiODlkMmE2YzUtYmQ0Zi00ZmQwLTk5NjEtNjY3NzZiNTNiMjFkIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
    href: "https://app.fabric.microsoft.com/view?r=eyJrIjoiODlkMmE2YzUtYmQ0Zi00ZmQwLTk5NjEtNjY3NzZiNTNiMjFkIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
    articleSlug: "power-bi-time-utilization-funnel",
    // The page's own text (the report is an iframe in a popup, opaque to crawlers):
    // short on purpose. The long-form story is the linked `articleSlug` write-up.
    details: {
      en: [
        "Fleet time utilization for a coal-mining company: where each machine's 24/7 hours go",
        "Top-down waterfall funnel from 100% of calendar time to effective work time",
        "Maintenance and each idle category deducted in turn, as a share of total time",
        "Breakpoints: Ready for work, after major maintenance; Effective work time, on the main job",
        "Linear utilization or an average weighted by excavator ladle volume",
        "Actuals against weekly and monthly plans, one category hierarchy for all three",
        "Business week from Saturday to Friday",
        "Built in Power BI on a stock stacked bar chart and DAX measures, no custom visual",
        "Real client report; all figures altered to protect the client's data",
      ],
      ru: [
        "Использование времени парка техники угледобывающей компании: куда уходят круглосуточные часы каждой машины",
        "Воронка-водопад сверху вниз: от 100% календарного времени до эффективной работы",
        "Обслуживание и каждая категория простоев вычитаются по очереди, в долях от общего времени",
        "Контрольные точки: «Готов к работе», после крупного обслуживания; «Эффективное рабочее время», на основной работе",
        "Линейный расчёт или средневзвешенный по объёму ковша экскаватора",
        "Факт против недельного и месячного планов, одна иерархия категорий на все три",
        "Рабочая неделя с субботы по пятницу",
        "Power BI, обычная линейчатая диаграмма с накоплением и меры DAX, без кастомных визуалов",
        "Отчёт реального клиента; все цифры изменены, чтобы защитить его данные",
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
        "Monthly P&L for one company, FY2023 to FY2025: Actual, Budget, Forecast",
        "Budget vs actual by account and cost centre",
        "Margin waterfall from revenue down to operating profit",
        "Variance view: the few lines worth explaining",
        "Costs across 8 cost centres in four regions",
        "Filters: fiscal year, scenario, cost centre",
        "Apache Superset on a Postgres star schema: month × account × cost centre × scenario",
        "Synthetic data from versioned SQL, with four planted anomalies",
      ],
      ru: [
        "Ежемесячный P&L одной компании, с 2023 по 2025 финансовый год: факт, бюджет, прогноз",
        "План против факта по счетам и центрам затрат",
        "Водопад маржи от выручки до операционной прибыли",
        "Отклонения: те немногие строки, которые стоит объяснять",
        "Затраты по 8 центрам в четырёх регионах",
        "Фильтры: финансовый год, сценарий, центр затрат",
        "Apache Superset на схеме «звезда» в Postgres: месяц × счёт × центр затрат × сценарий",
        "Данные синтетические, из версионируемого SQL, с четырьмя заложенными аномалиями",
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
        "Sales dashboard for a synthetic online shop, Jan 2024 to Aug 2026, USD",
        "KPI tiles: revenue, profit, orders, margin, each vs the same months of the prior year",
        "Revenue, profit and orders by month",
        "Top 5 categories or countries by revenue, profit or margin",
        "Sales by channel: revenue, profit, orders, margin, as a table or bars",
        "Year is the only filter, so order counts never double up",
        "Postgres star schema; each measure defined once in a Cube semantic layer; margin recomputed from sums at every level",
        "Queried server-side: three queries, 240 rows, drawn with Tremor; cached for a day",
        "Synthetic data, no client figures",
      ],
      ru: [
        "Дашборд продаж синтетического интернет-магазина, с января 2024 по август 2026, в долларах",
        "Плитки: выручка, прибыль, заказы, маржа, каждая против тех же месяцев прошлого года",
        "Выручка, прибыль и заказы по месяцам",
        "Топ-5 категорий или стран по выручке, прибыли или марже",
        "Продажи по каналам: выручка, прибыль, заказы, маржа, таблицей или столбиками",
        "Единственный фильтр, год, поэтому заказы не задваиваются",
        "Схема «звезда» в Postgres; каждая мера определена один раз в семантическом слое Cube; маржа пересчитывается из сумм на каждом уровне",
        "Запросы на сервере: три запроса, 240 строк, графики на Tremor; кэш на сутки",
        "Данные синтетические, цифр клиентов нет",
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

/**
 * The env var a JS report's data needs on the server, for the reports that read Supabase through a server route
 * (CLAUDE.md § Supabase). Without it the route answers 503, so the page leaves the "Web report" button out rather
 * than open a report that cannot load. Mirelo is not listed: it has been live since 11-03.
 */
const REPORT_DATA_ENV: Partial<Record<JsReport, string>> = {
  marketing: "MARKETING_DATABASE_URL",
};

/** Whether the "Web report" of a JS showcase can open (read at build / regeneration, server-side only). */
export function isJsReportLive(report: JsReport): boolean {
  const key = REPORT_DATA_ENV[report];
  return key === undefined || !!process.env[key];
}

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
