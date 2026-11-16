import { isCeoDigestConfigured } from "./ceo-digest/config";
import { isCubeConfigured } from "./cube";
import { env } from "./env";
import type { Locale } from "./i18n/config";
import type { JsReport } from "./js-reports";
import type { N8nFlow } from "./n8n-flows";

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
 *  - Automation → an n8n workflow, not a report (ADR-0002 amendment, 11-16): the page says what the flow does and
 *                how to try it on the live demo inbox, and the button opens the workflow's canvas, drawn from a
 *                sanitized copy of its JSON (data/n8n/) by n8n's <n8n-demo> component. The n8n server stays private.
 *
 * Server-only in effect: lib/cube.ts is, and this imports it. Every importer is a Server
 * Component, a Route Handler or the sitemap — a client component reaching for this file
 * now fails the build, which is the right answer.
 */
export type ShowcasePlatform =
  "power-bi" | "superset" | "cube" | "js" | "automation";

type ShowcaseBase<Text, Paragraphs> = {
  slug: string;
  // The sort key of the /work list, newest first. Internal only: never rendered on any page. The dates set the
  // owner's order (11-05: Cube, exec, P&L, mining, lender, marketing, oldest to newest), not history.
  published: `${number}-${number}-${number}`;
  title: Text;
  summary: Text; // concise — the list-card blurb
  client: Text; // the client type, shown as "Client: …" under the title and on the card (owner, 11-15)
  details: Paragraphs; // the detail page's bullet summary: at most 5 points, one of them on the tech (owner, 11-15), under the report buttons
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
    })
  // An n8n workflow (11-16): its canvas in the popup, and the steps to try the live demo on the page.
  | (ShowcaseBase<Text, Paragraphs> & {
      platform: "automation";
      workflow: N8nFlow;
      test: AutomationTest<Text, Paragraphs>;
      // A data chat on the page (11-16): "Ask the data" opens it in the popup, with no report beside it; the route is
      // /api/chat/<chat>. An entry with a chat stays hidden until its server settings are in place (`showcases`).
      chat?: DataChat;
    });

/** The data chats a showcase can carry: each has a route /api/chat/<name> (docs/ceo-digest/chat-and-email.md). */
export type DataChat = "ceo-digest";

/**
 * "Try it yourself" for a live workflow. A step may say `{email}` (the demo address, as a mailto link). No sheet link on
 * the site: the public sheets are reached only from the workflow's reply email (owner, 11-16). `samples` are files in
 * public/ the visitor sends as the attachment, listed in a dropdown as "Invoice #n" plus a short `note`.
 */
type AutomationTest<Text, Paragraphs> = {
  email: string;
  steps: Paragraphs;
  samples?: { href: string; note: Text }[];
};

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
    client: s.client[locale],
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
    case "automation":
      return {
        ...base,
        platform: s.platform,
        workflow: s.workflow,
        chat: s.chat,
        test: {
          email: s.test.email,
          steps: s.test.steps[locale],
          samples: s.test.samples?.map((x) => ({
            href: x.href,
            note: x.note[locale],
          })),
        },
      };
  }
}

export const PLATFORM_LABEL: Record<ShowcasePlatform, string> = {
  "power-bi": "Power BI",
  superset: "Superset",
  cube: "Cube + Tremor",
  js: "Custom JS",
  automation: "n8n",
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
    slug: "ceo-digest",
    published: "2026-11-16",
    platform: "automation",
    // The Tidewell data chat + "email me this" (docs/ceo-digest/chat-and-email.md, 11-16): the chat answers on the site
    // (src/lib/ceo-digest/, /api/chat/ceo-digest); n8n starts only when a report is emailed. The canvas is the public
    // copy of that workflow, data/n8n/ceo-digest-email.json (scripts/n8n-export.ts); until it is exported the page
    // has no canvas button. Hidden until CEO_DIGEST_DATABASE_URL, N8N_DIGEST_WEBHOOK_URL and
    // N8N_DIGEST_WEBHOOK_SECRET are all set (`showcases` below).
    workflow: "ceo-digest-email",
    chat: "ceo-digest",
    title: {
      en: "Company data chat with reports by email",
      ru: "Чат по данным компании с отчётами на почту",
    },
    summary: {
      en: "Ask a SaaS company's marketing, cash flow and client figures in plain words, and have the report emailed by an n8n workflow.",
      ru: "Вопросы по маркетингу, денежному потоку и клиентам SaaS-компании простыми словами, а отчёт на почту присылает воркфлоу n8n.",
    },
    client: {
      en: "SaaS company, 50 to 200 staff (fictional)",
      ru: "SaaS-компания, 50–200 сотрудников (вымышленная)",
    },
    details: {
      en: [
        "A manager asks about marketing, cash flow or clients in plain words and gets the figures in the chat, so a routine question no longer waits for an analyst.",
        "An LLM picks from a closed set of SQL functions over PostgreSQL and writes only from the rows they return. There is no text-to-SQL, so it cannot invent a query or reach another table.",
        '"Email me this" starts an n8n workflow: it runs the same functions for the period, adds three short takeaways and sends an HTML email with the tables. Sends are capped per address and per day.',
      ],
      ru: [
        "Руководитель спрашивает о маркетинге, денежном потоке или клиентах простыми словами и получает цифры в чате, так что рядовой вопрос больше не ждёт аналитика.",
        "LLM выбирает из закрытого набора SQL-функций над PostgreSQL и пишет только по строкам, которые они вернули. Text-to-SQL здесь нет, поэтому выдумать запрос или добраться до другой таблицы нельзя.",
        "«Пришли это на почту» запускает воркфлоу n8n: он выполняет те же функции за период, добавляет три коротких вывода и отправляет HTML-письмо с таблицами. Отправки ограничены по адресу и по дням.",
      ],
    },
    test: {
      // the address the report arrives from
      email: "n8n.opc@gmail.com",
      steps: {
        en: [
          'Open "Ask the data" and ask about marketing, cash flow or clients ("Which channel had the lowest CAC last month?").',
          "Ask for the report by email, type your address and confirm the period.",
          'In a minute or two it arrives from {email}. The company and its figures are made up, and "today" in the data is 15 November 2026. Limits: 2 emails a day per visitor, 3 per address.',
        ],
        ru: [
          "Откройте «Спросить данные» и спросите о маркетинге, денежном потоке или клиентах («У какого канала был самый низкий CAC в прошлом месяце?»).",
          "Попросите отчёт на почту, напишите адрес и подтвердите период.",
          "Через минуту-две он придёт с {email}. Компания и её цифры выдуманы, а «сегодня» в данных это 15 ноября 2026. Лимиты: 2 письма в день на посетителя, 3 на адрес.",
        ],
      },
    },
  },
  {
    slug: "inbox-to-sheet-ai",
    published: "2026-11-16",
    platform: "automation",
    // n8n workflow "Inbox to sheet (public demo)", live since 11-16 (docs/automation/README.md, Flow 0). Its public
    // copy is data/n8n/inbox-to-sheet.json: re-export it (scripts/n8n-export.ts) after every change in n8n.
    workflow: "inbox-to-sheet",
    title: { en: "Email inbox to a Google Sheet, read by AI" },
    summary: {
      en: "Every email to a demo inbox becomes a row in a public sheet, with the topic and deadline picked out by an LLM.",
    },
    client: { en: "Small team with a shared inbox" },
    details: {
      en: [
        "Every email to a shared inbox becomes a row in a Google Sheet about a minute after it lands, so nobody has to open each one to see what it asks.",
        'An LLM (Claude Haiku) writes the topic in one sentence and pulls out the deadline. "By the end of this week" becomes the date of that Sunday.',
        "Safe on a public inbox: addresses are masked, names and links are kept out of the sheet, attachments are only counted, and replies are capped per sender and per day.",
      ],
    },
    test: {
      email: "n8n.opc@gmail.com",
      steps: {
        en: [
          'Email {email} in any language and ask for something by a date ("the report by Friday?").',
          "In a minute or two a reply brings your row and a link to the public sheet.",
          "Your email is at the top of that sheet. It's public, so send nothing private. Limits: 10 emails a day per sender, 3 attachments each.",
        ],
      },
    },
  },
  {
    slug: "invoice-pdf-parser",
    published: "2026-11-16",
    platform: "automation",
    // n8n workflow "Invoice PDF to sheet (public demo)" (11-16), public copy in data/n8n/invoice-pdf-to-sheet.json.
    // The samples are synthetic, made for this page (public/samples/automation/).
    workflow: "invoice-pdf-to-sheet",
    title: { en: "Invoice PDF parser" },
    summary: {
      en: "Email a PDF invoice and get it back as a sheet row, with the sums checked.",
    },
    client: { en: "Finance team of a small company" },
    details: {
      en: [
        "A PDF invoice sent by email becomes a row in a Google Sheet, so accounts payable stops retyping invoices by hand.",
        'An LLM (Claude Haiku) reads the vendor, number, dates, currency, totals and every line item. "Net 30" turns into a due date.',
        "Then the arithmetic is checked: lines against the subtotal, subtotal plus tax against the total. A mismatch shows in the Check column, and a scanned PDF with no text is reported as one.",
      ],
    },
    test: {
      email: "n8n.opc@gmail.com",
      steps: {
        en: [
          "Download a sample invoice below (the companies are made up). Only these three are parsed; other mail goes to the inbox demo.",
          "Email it to {email}: up to 3 attachments, 5 MB in all, 10 emails a day. Each attached sample is parsed.",
          "In a minute or two a reply brings what was read and a link to the public sheet of the newest invoices.",
        ],
      },
      samples: [
        {
          href: "/samples/automation/sample-invoice-eur-vat.pdf",
          note: { en: "EUR, VAT, 4 lines" },
        },
        {
          href: "/samples/automation/sample-invoice-usd-net30.pdf",
          note: { en: 'USD, "Net 30" instead of a due date' },
        },
        {
          href: "/samples/automation/sample-invoice-gbp-mismatch.pdf",
          note: { en: "GBP, lines don't add up to the subtotal" },
        },
      ],
    },
  },
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
    client: {
      en: "Two-company group: a consumer goods maker and an e-commerce SaaS",
      ru: "Группа из двух компаний: производитель потребительских товаров и e-commerce SaaS",
    },
    metric: "$3.4B",
    // The page's text: what the report does, short on purpose. Spec and build notes: docs/pnl/.
    details: {
      en: [
        "Two very different businesses, a consumer goods maker and an e-commerce SaaS, on one P&L layout. The CFO reads both the same way.",
        "Every line vs budget, latest estimate or last year, from the block down to the account. USD, EUR or GBP, at actual or constant FX.",
        "The drivers behind the money: units and price per unit for the goods side; GMV, take rate, active merchants and ARR for the SaaS.",
        "Bridges walk revenue and profit from budget to actual, driver by driver, with FX split out. Then region and category: who grows, who actually earns.",
        "Under the hood: complex ETL into a PostgreSQL backend, and an AI chat that answers only from the report's numbers, checked against 63 known answers.",
      ],
      ru: [
        "Два совсем разных бизнеса, производитель потребительских товаров и e-commerce SaaS, в одном макете P&L. Финдиректор читает оба одинаково.",
        "Каждая строка против бюджета, последней оценки или прошлого года, от блока до счёта. USD, EUR или GBP, по фактическому или постоянному курсу.",
        "Драйверы денег: штуки и цена за штуку у товаров; GMV, take rate, активные мерчанты и ARR у SaaS.",
        "Мосты ведут выручку и прибыль от бюджета к факту по драйверам, FX отдельно. Дальше регионы и категории: кто растёт, а кто реально зарабатывает.",
        "Под капотом: сложный ETL в PostgreSQL и AI-чат, который отвечает только цифрами отчёта и сверен с 63 эталонными ответами.",
      ],
    },
  },
  {
    slug: "executive-dashboard",
    published: "2026-10-29",
    platform: "js",
    report: "nordmark",
    // Production still reads the static public/data/nordmark files; the switch to nordmark_demo (/api/nordmark,
    // gated by NORDMARK_DATABASE_URL) waits for the load. No Power BI flavour yet.
    title: {
      en: "Retail executive dashboard",
      ru: "Дашборд руководителя розничной сети",
    },
    summary: {
      en: "Twelve retail KPIs vs budget, last year or previous period, by region and category.",
      ru: "Двенадцать розничных KPI против бюджета, прошлого года или периода, по регионам и категориям.",
    },
    client: {
      en: "Multi-channel retailer, Netherlands and Belgium",
      ru: "Многоканальный ритейлер, Нидерланды и Бельгия",
    },
    metric: "€68.4M",
    // Spec and build notes: docs/nordmark/.
    details: {
      en: [
        "A retailer with stores in the Netherlands and Belgium, a web shop and a wholesale arm. Management wants the whole business on one screen.",
        "Twelve KPI cards, each on track, watch or off track against budget, last year or the previous period.",
        "Net sales, total margin and weeks of cover lead. Behind them sit markdowns, availability, like-for-like growth, GMROI, sell-through and supplier OTIF.",
        "Weeks follow the 4-5-4 retail calendar, the same one the buyers plan in. Every card shows its formula and where to drill next.",
        "Under the hood: complex ETL into compact Parquet files, and every number computed right in the browser, no server in the loop.",
      ],
      ru: [
        "Ритейлер с магазинами в Нидерландах и Бельгии, интернет-магазином и оптом. Руководству нужен весь бизнес на одном экране.",
        "Двенадцать карточек KPI, у каждой статус: в норме, внимание или вне цели, против бюджета, прошлого года или прошлого периода.",
        "Ведут чистые продажи, общая маржа и недели запаса. За ними уценки, доступность товара, рост сопоставимых продаж, GMROI, sell-through и OTIF поставщиков.",
        "Недели идут по розничному календарю 4-5-4, тому же, по которому планируют закупщики. На каждой карточке её формула и куда копать дальше.",
        "Под капотом: сложный ETL в компактные Parquet-файлы, и все цифры считаются прямо в браузере, без сервера.",
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
    client: {
      en: "Neobank and online lender: Poland, Romania, Portugal",
      ru: "Необанк и онлайн-кредитор: Польша, Румыния, Португалия",
    },
    metric: "€12.0M",
    // Spec and build notes: docs/mirelo/ (the owner's four review rounds of 11-01; data live from Supabase since 11-03).
    details: {
      en: [
        "A neobank that lends online in three markets, all in EUR. Sales and risk finally read the same numbers, and any total drills down to the loans and the client card.",
        "Loans: the application funnel, approval rates, the budget-to-actual bridge, and how each agent is doing against quota and SLA.",
        "Portfolio quality the way risk wants it: 30+ DPD, DPD buckets, vintage curves, roll rates by product.",
        "Revenue split into interest, fees, interchange and subscriptions, against budget, plus who subscribed and who churned.",
        "Under the hood: complex ETL into a PostgreSQL backend, the same report in Power BI, and an AI chat that answers only from the report's numbers.",
      ],
      ru: [
        "Необанк, который кредитует онлайн на трёх рынках, всё в евро. Продажи и риски наконец смотрят на одни цифры, и любой итог раскрывается до займов и карточки клиента.",
        "Займы: воронка заявок, уровень одобрения, мост от бюджета к факту и как каждый агент идёт против квоты и SLA.",
        "Качество портфеля так, как его хотят видеть риски: просрочка 30+, корзины просрочки, кривые винтажей, переходы между корзинами по продуктам.",
        "Выручка по частям: проценты, комиссии, интерчейндж и подписки против бюджета, плюс кто подписался и кто ушёл.",
        "Под капотом: сложный ETL в PostgreSQL, тот же отчёт в Power BI и AI-чат, который отвечает только цифрами отчёта.",
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
    client: {
      en: "Accounting and invoicing SaaS",
      ru: "SaaS для бухгалтерии и выставления счетов",
    },
    metric: "$188.4k",
    // Spec and build notes: docs/marketing/ (the pack of 11-05 and what changed here).
    details: {
      en: [
        "An accounting and invoicing SaaS buys sign-ups on 8 ad networks, for web, iOS and Android. This is where marketing checks that the money works.",
        "The vitals: spend, new paying clients, trial-to-paid conversion, time to activation, CAC and 90-day ROAS. Each one sits next to last year.",
        "Every channel and campaign gets pacing vs plan, CPA, ROAS and a fatigue flag, so you catch a dying ad before it eats the budget.",
        "Cohorts answer what finance actually asks: how many months until a channel pays back, and what LTV:CAC looks like per channel.",
        "Under the hood: complex ETL into a PostgreSQL backend, the same report in Power BI, and an AI chat that answers only from the report's numbers.",
      ],
      ru: [
        "SaaS для бухгалтерии и выставления счетов покупает регистрации в 8 рекламных сетях, для веба, iOS и Android. Здесь маркетинг проверяет, что деньги работают.",
        "Ключевые показатели: расходы, новые платящие клиенты, конверсия из триала в оплату, время до активации, CAC и ROAS за 90 дней. Каждый рядом с прошлым годом.",
        "У каждого канала и кампании темп против плана, CPA, ROAS и флаг выгорания, чтобы поймать умирающую рекламу до того, как она съест бюджет.",
        "Когорты отвечают на вопрос финансов: через сколько месяцев канал окупается и какой у него LTV:CAC.",
        "Под капотом: сложный ETL в PostgreSQL, тот же отчёт в Power BI и AI-чат, который отвечает только цифрами отчёта.",
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
    client: {
      en: "Coal mining company",
      ru: "Угледобывающая компания",
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
        "A coal mine runs its trucks and excavators 24/7. The question is where those hours actually go.",
        "A waterfall from 100% of calendar time down to effective work, with maintenance and every kind of idle taken off in turn.",
        "Two checkpoints matter: ready for work, and effective work time. Both against the weekly and monthly plan.",
        "Utilization counted plain, or weighted by excavator bucket size, so an idle hour of a big machine counts for more.",
        "Real operating figures, names anonymised. Under the hood: complex ETL into a PostgreSQL backend, Power BI, and an AI chat that answers only from the report's numbers.",
      ],
      ru: [
        "Разрез гоняет самосвалы и экскаваторы круглосуточно. Вопрос в том, куда на самом деле уходят эти часы.",
        "Водопад от 100% календарного времени до эффективной работы: обслуживание и каждый вид простоя вычитаются по очереди.",
        "Важны две точки: готовность к работе и эффективное рабочее время. Обе против недельного и месячного плана.",
        "Использование считается линейно или с весом по объёму ковша экскаватора, чтобы час простоя большой машины весил больше.",
        "Реальные производственные цифры, названия обезличены. Под капотом: сложный ETL в PostgreSQL, Power BI и AI-чат, который отвечает только цифрами отчёта.",
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
    client: {
      en: "Multi-region company, finance team",
      ru: "Компания с четырьмя регионами, финансовая служба",
    },
    metric: "$18.4M",
    embedId: UNSET_EMBED_ID,
    details: {
      en: [
        "Three fiscal years of monthly P&L for a company in four regions: actual, budget and forecast side by side.",
        "Budget vs actual by account and by cost centre, 8 of them.",
        "A margin waterfall from revenue down to operating profit.",
        "Variances sorted so the lines worth explaining come first, and the finance team stops hunting for them.",
        "Under the hood: complex ETL into a PostgreSQL warehouse, Apache Superset on top.",
      ],
      ru: [
        "Три финансовых года помесячного P&L компании в четырёх регионах: факт, бюджет и прогноз рядом.",
        "План против факта по счетам и по центрам затрат, их 8.",
        "Водопад маржи от выручки до операционной прибыли.",
        "Отклонения отсортированы так, что строки, которые стоит объяснить, идут первыми, и финансистам не надо их искать.",
        "Под капотом: сложный ETL в хранилище на PostgreSQL, сверху Apache Superset.",
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
    client: {
      en: "Online shop",
      ru: "Интернет-магазин",
    },
    metric: "$4.77M",
    articleSlug: "your-own-bi-front-end-with-cube",
    // Until the owner has signed off the write-up (docs/08 §9, phase 4).
    noindex: true,
    // The page's text since 10-22, when the dashboard moved into the popup like every
    // other showcase. Facts from docs/08 §7, the as-built dashboard.
    details: {
      en: [
        "An online shop's sales in USD: revenue, profit, orders and margin, each against the same months last year.",
        "Revenue, profit and orders month by month.",
        "Top 5 categories or countries, ranked by revenue, profit or margin.",
        "Sales by channel, and one definition per metric across every chart, so two charts never disagree.",
        "Under the hood: complex ETL into a PostgreSQL star schema, Cube as the semantic layer, charts drawn on this site.",
      ],
      ru: [
        "Продажи интернет-магазина в долларах: выручка, прибыль, заказы и маржа, каждая против тех же месяцев прошлого года.",
        "Выручка, прибыль и заказы по месяцам.",
        "Топ-5 категорий или стран по выручке, прибыли или марже.",
        "Продажи по каналам и одно определение каждой метрики во всех графиках, так что два графика никогда не спорят.",
        "Под капотом: сложный ETL в схему «звезда» на PostgreSQL, Cube как семантический слой, графики нарисованы на этом сайте.",
      ],
    },
  },
];

/**
 * Superset entries are hidden until the instance is configured and the entry carries a
 * real embed UUID — an unconfigured embed would render a dead frame on a page whose whole
 * job is to demonstrate competence. Cube entries are hidden until CUBE_API_URL and
 * CUBE_API_SECRET are both set: without them the detail page cannot be built at all.
 * An automation entry with a data chat is hidden until its reader URL and its n8n webhook URL and secret are all set
 * (lib/ceo-digest/config.ts): without them the chat cannot answer or send, and the page has nothing to show.
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
      case "automation":
        return s.chat === undefined || isCeoDigestConfigured();
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
  // nordmark: "NORDMARK_DATABASE_URL" returns with its Supabase go-live. Until then production reads the static
  // public/data/nordmark files, so the button stays on (11-16 hotfix: b539448 shipped this gate before the load).
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
