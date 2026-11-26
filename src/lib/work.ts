import { isCeoDigestConfigured } from "./ceo-digest/config";
import { isCubeConfigured } from "./cube";
import { env } from "./env";
import type { Locale } from "./i18n/config";
import { REPORT_DATA_ENV, type JsReport } from "./js-reports";
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
  // owner's order (11-05: Cube, exec, P&L, mining, lender, marketing, oldest to newest), not history. 11-16: the n8n
  // showcases are dated between the reports, so every list page mixes both (4 cards a page).
  published: `${number}-${number}-${number}`;
  // The sitemap `lastmod` of this case study's page (SEO spec T-14, 11-19). Bump it when the entry's copy or report
  // changes; `/work` takes the newest of these.
  updated: `${number}-${number}-${number}`;
  title: Text;
  summary: Text; // concise — the list-card blurb
  // The search snippet (meta description, og:description, JSON-LD), 120–160 characters (11-17 SEO check: the card
  // summaries ran 74–110). Falls back to `summary` when that is already long enough.
  description?: Text;
  // Where the figures come from, said on the card and the page (11-17, Upwork / site spec C4): "synthetic" = a demo on
  // made-up data, "client" = real operating figures under anonymised names. Required, so a new entry has to say.
  // 11-24: "anonymised" = a client's report on anonymised data (the freight report: names generated, amounts scaled).
  data: "synthetic" | "client" | "anonymised";
  client: Text; // the client type, shown as "Client: …" under the detail page's title (owner, 11-15; off the cards 11-16)
  // the detail page's bullet summary: at most 5 points, one of them on the tech (owner, 11-15), under the report
  // buttons. `**…**` marks a key phrase in bold (11-16).
  details: Paragraphs;
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
    updated: s.updated,
    title: s.title[locale],
    summary: s.summary[locale],
    description: (s.description ?? s.summary)[locale],
    data: s.data,
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
    updated: "2026-11-25",
    platform: "automation",
    // The Tidewell data chat + "email me this" (docs/ceo-digest/chat-and-email.md, 11-16): the chat answers on the site
    // (src/lib/ceo-digest/, /api/chat/ceo-digest); n8n starts only when a report is emailed. The canvas is the public
    // copy of that workflow, data/n8n/ceo-digest-email.json (scripts/n8n-export.ts); until it is exported the page
    // has no canvas button. Hidden until CEO_DIGEST_DATABASE_URL, N8N_DIGEST_WEBHOOK_URL and
    // N8N_DIGEST_WEBHOOK_SECRET are all set (`showcases` below).
    workflow: "ceo-digest-email",
    chat: "ceo-digest",
    data: "synthetic",
    title: {
      en: "Company data chat with reports by email",
      ru: "Чат по данным компании с отчётами на почту",
    },
    summary: {
      en: "Ask a SaaS company's marketing, cash flow and client figures in plain words, and have the report emailed by an n8n workflow.",
      ru: "Вопросы по маркетингу, денежному потоку и клиентам SaaS-компании простыми словами, а отчёт на почту присылает воркфлоу n8n.",
    },
    client: {
      en: "SaaS company, 50 to 200 staff",
      ru: "SaaS-компания, 50–200 сотрудников",
    },
    details: {
      en: [
        "A manager asks about a SaaS company's marketing, cash flow or clients in plain words and gets the figures in the chat, or as a report by email.",
        "Weekly MRR, marketing spend and clicks, cash, receivables and payables, down to each customer and invoice.",
        "Under the hood: no text-to-SQL, the LLM only calls a closed set of **PostgreSQL functions**, which nearly removes hallucinations, and an **n8n workflow** emails the report.",
      ],
      ru: [
        "Руководитель простыми словами спрашивает о маркетинге, денежном потоке или клиентах SaaS-компании и получает цифры в чате или отчётом на почту.",
        "Еженедельный MRR, расходы и клики маркетинга, деньги, дебиторка и кредиторка, вплоть до каждого клиента и счёта.",
        "Под капотом: без text-to-SQL, LLM вызывает только закрытый набор **функций PostgreSQL**, что почти полностью убирает галлюцинации, а отчёт на почту отправляет **воркфлоу n8n**.",
      ],
    },
    test: {
      // the address the report arrives from
      email: "n8n.opc@gmail.com",
      steps: {
        en: [
          'Open **Ask AI** and ask about marketing, cash flow or clients ("Which channel had the lowest CAC last month?").',
          "Say **Email me this**, type your address and confirm the period.",
          'In a minute or two the report arrives from {email}. **Synthetic data**, with "today" set to 15 November 2026. Limits: 2 emails a day per visitor, 3 per address.',
        ],
        ru: [
          "Откройте **Спросить ИИ** и спросите о маркетинге, денежном потоке или клиентах («У какого канала был самый низкий CAC в прошлом месяце?»).",
          "Напишите **«Пришли это на почту»**, укажите адрес и подтвердите период.",
          "Через минуту-две отчёт придёт с {email}. **Синтетические данные**, «сегодня» в них это 15 ноября 2026. Лимиты: 2 письма в день на посетителя, 3 на адрес.",
        ],
      },
    },
  },
  {
    slug: "inbox-to-sheet-ai",
    published: "2026-11-04",
    updated: "2026-11-25",
    platform: "automation",
    // n8n workflow "Inbox to sheet (public demo)", live since 11-16 (docs/automation/README.md, Flow 0). Its public
    // copy is data/n8n/inbox-to-sheet.json: re-export it (scripts/n8n-export.ts) after every change in n8n.
    workflow: "inbox-to-sheet",
    data: "synthetic",
    description: {
      en: "An n8n workflow turns every email to a demo inbox into a row in a Google Sheet, with the topic and deadline picked out by AI. Send one and watch it land.",
    },
    title: { en: "Email inbox to a Google Sheet, read by AI" },
    summary: {
      en: "Every email to a demo inbox becomes a row in a public sheet, with the topic and deadline picked out by an LLM.",
    },
    client: { en: "Small team with a shared inbox" },
    details: {
      en: [
        "Every email to a shared inbox becomes a row in a Google Sheet about a minute after it lands, so nobody has to open each one to see what it asks.",
        'Each row carries the topic in one sentence and the deadline as a date: "by the end of this week" becomes that Sunday.',
        "Under the hood: an **n8n** workflow with an LLM (Claude Haiku), masked addresses and replies capped per sender, safe on a public inbox.",
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
    published: "2026-11-02",
    updated: "2026-11-25",
    platform: "automation",
    // n8n workflow "Invoice PDF to sheet (public demo)" (11-16), public copy in data/n8n/invoice-pdf-to-sheet.json.
    // The samples are synthetic, made for this page (public/samples/automation/).
    workflow: "invoice-pdf-to-sheet",
    data: "synthetic",
    description: {
      en: "Email a PDF invoice and an n8n workflow reads it with AI, checks the sums and logs it as a row in a Google Sheet. Try it live with a sample invoice.",
    },
    title: { en: "Invoice PDF parser" },
    summary: {
      en: "Email a PDF invoice and get it back as a sheet row, with the sums checked.",
    },
    client: { en: "Finance team of a small company" },
    details: {
      en: [
        "A PDF invoice sent by email becomes a row in a Google Sheet, so accounts payable stops retyping invoices by hand.",
        "Vendor, number, dates, currency, totals and every line item, with lines checked against the subtotal and subtotal plus tax against the total.",
        'Under the hood: an **n8n** workflow with an LLM (Claude Haiku) that turns "Net 30" into a due date and reports a scanned PDF with no text.',
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
    slug: "cash-flow-demo",
    published: "2026-11-26",
    updated: "2026-11-26",
    // The ACME Cash Flow report (owner, 11-26), built from the rusloc/pnl hand-off (docs/cashflow/README.md): a statement
    // of cash flows for a synthetic QuickBooks Online company. Data in Supabase schema cashflow_demo through
    // /api/cashflow; the page lists only once CASHFLOW_DATABASE_URL is set (isJsReportLive). The Power BI flavour comes
    // later; no Ask AI (owner).
    platform: "js",
    report: "cashflow",
    data: "synthetic",
    description: {
      en: "Cash flow statement of a small services company as a web report: opening to closing cash, operating, investing and financing activities, daily cash movements and every payment behind them.",
    },
    title: { en: "Cash flow demo" },
    summary: {
      en: "Where a company’s cash came from and went, from the statement down to each payment.",
    },
    client: { en: "IT and analytics services firm on QuickBooks Online" },
    // closing cash, Oct 2026 (the report’s landing month)
    metric: "$315K",
    details: {
      en: [
        "A cash flow statement for a small IT services firm on QuickBooks Online, read from opening to closing cash.",
        "Operating, investing and financing activities, free cash flow, cash conversion and DSO, each day’s cash on a heatmap, and every payment behind a figure.",
        "Under the hood: a custom JS report on **PostgreSQL**, every figure reconciled to the control totals to the cent.",
      ],
    },
  },
  {
    slug: "freight-sales-report",
    published: "2026-11-24",
    updated: "2026-11-25",
    // A client's report on anonymised data (owner, 11-24). Power BI: "Freight Sales Demo", published to web from
    // Fabric. Web report: components/freight over Parquet shipped in the build (public/data/freight/, owner 11-24; no
    // server route, so no env gate). No Ask AI for now (owner). docs/freight/README.md.
    platform: "js",
    report: "freight",
    powerBi: {
      embedUrl:
        "https://app.fabric.microsoft.com/view?r=eyJrIjoiMDg0N2IxZDktZDdhMS00N2JkLWI2MGItMDg4ZTgyODE5OWRmIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
      href: "https://app.fabric.microsoft.com/view?r=eyJrIjoiMDg0N2IxZDktZDdhMS00N2JkLWI2MGItMDg4ZTgyODE5OWRmIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
    },
    data: "anonymised",
    description: {
      en: "Sales report of an international freight forwarder, in Power BI and as a web report: expected vs actual revenue, gross profit, shipments, top clients.",
    },
    title: { en: "Freight forwarding sales report" },
    summary: {
      en: "Expected vs actual revenue and gross profit of a freight forwarder, down to each shipment.",
    },
    client: { en: "International freight forwarding company" },
    // the first figure on the report's first screen: expected revenue, USD, 1 Jun – 31 Oct 2026
    metric: "$21.0M",
    // From the published report itself (Overview, Operational date / Accounting date / Top N clients), read 11-24.
    details: {
      en: [
        "Sales of an international freight forwarder read two ways: **expected** by the shipment's operational date, **actual** by the accounting date.",
        "Revenue, gross profit, shipments and clients vs the previous period, down to each shipment, plus Top N clients by revenue, gross profit or TEU.",
        "Under the hood: **Power BI** on **Microsoft Fabric**, and the same report as a **web report** drawn on this site from the same data.",
      ],
    },
  },
  {
    slug: "pnl-suite",
    published: "2026-10-30",
    updated: "2026-11-25",
    platform: "js",
    report: "pnl",
    data: "synthetic",
    description: {
      en: "Budget vs actual management P&L for a two-company group: statement, KPIs, variances, revenue and profit bridges, profitability. Web report with an AI chat.",
    },
    title: {
      en: "Management P&L report",
      ru: "Управленческий P&L-отчёт",
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
        "Budget vs actual management P&L for a two-company group, a consumer goods maker and an e-commerce SaaS, on one layout the CFO reads the same way.",
        "Every line vs budget, latest estimate or last year, with KPIs, variances, revenue and profit bridges, and profitability by region and category.",
        "Under the hood: complex ETL into a **PostgreSQL** backend, and an AI chat that answers only from the report's numbers, checked against 63 known answers.",
      ],
      ru: [
        "План против факта в управленческом P&L группы из двух компаний, производителя потребительских товаров и e-commerce SaaS, в одном макете, который финдиректор читает одинаково.",
        "Каждая строка против бюджета, последней оценки или прошлого года, с KPI, отклонениями, мостами выручки и прибыли и прибыльностью по регионам и категориям.",
        "Под капотом: сложный ETL в бэкенд на **PostgreSQL** и AI-чат, который отвечает только по цифрам отчёта и проверен на 63 известных ответах.",
      ],
    },
  },
  {
    slug: "executive-dashboard",
    published: "2026-10-29",
    updated: "2026-11-25",
    platform: "js",
    report: "nordmark",
    // Production still reads the static public/data/nordmark files; the switch to nordmark_demo (/api/nordmark,
    // gated by NORDMARK_DATABASE_URL) waits for the load. Published-to-web Power BI flavour "Nordmark Exec" (owner, 11-17).
    powerBi: {
      embedUrl:
        "https://app.powerbi.com/view?r=eyJrIjoiMzEzMWVhZDEtOTYwZC00MTUwLWJhNjctZjQzYmM3Yzc3OTUzIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9&embedImagePlaceholder=true",
      href: "https://app.powerbi.com/view?r=eyJrIjoiMzEzMWVhZDEtOTYwZC00MTUwLWJhNjctZjQzYmM3Yzc3OTUzIiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
    },
    data: "synthetic",
    description: {
      en: "Retail executive dashboard in Power BI and as a web report: twelve KPIs vs budget, last year or previous period, by region and category, on a 4-5-4 calendar.",
    },
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
        "A retailer's stores in the Netherlands and Belgium, its web shop and its wholesale arm, on one screen for management.",
        "Twelve KPI cards, from net sales, margin and weeks of cover to GMROI, sell-through and supplier OTIF, each on track, watch or off track, on the 4-5-4 retail calendar.",
        "Under the hood: complex ETL into compact Parquet files, every number computed right in the browser, and the same report in **Power BI**.",
      ],
      ru: [
        "Магазины ритейлера в Нидерландах и Бельгии, интернет-магазин и опт на одном экране для руководства.",
        "Двенадцать карточек KPI, от чистых продаж, маржи и недель запаса до GMROI, sell-through и OTIF поставщиков, у каждой статус в норме, внимание или вне цели, по розничному календарю 4-5-4.",
        "Под капотом: сложный ETL в компактные файлы Parquet, каждая цифра считается прямо в браузере, и тот же отчёт в **Power BI**.",
      ],
    },
  },
  {
    slug: "online-sales-report",
    published: "2026-11-03",
    updated: "2026-11-25",
    platform: "js",
    report: "mirelo",
    // Published-to-web Power BI flavour (owner, 11-03): the Mirelo Sales report, published 11-03
    // (replaced the owner's stand-in "Coal trucks" the same evening). Swapping it is these two URLs.
    powerBi: {
      embedUrl:
        "https://app.powerbi.com/view?r=eyJrIjoiMmVmNWU0MWUtNmE1ZS00OWRkLTk2ZTQtZTdlZjY3NjA0MDA3IiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9&embedImagePlaceholder=true",
      href: "https://app.powerbi.com/view?r=eyJrIjoiMmVmNWU0MWUtNmE1ZS00OWRkLTk2ZTQtZTdlZjY3NjA0MDA3IiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
    },
    data: "synthetic",
    description: {
      en: "Sales and revenue report for an online lender in three markets, in Power BI and as a web report: loans, clients, portfolio quality, revenue vs budget, AI chat.",
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
        "A neobank lending online in three markets, where sales and risk finally read the same numbers, down to the loan and the client card.",
        "Application funnel, approval rates, agents vs quota, 30+ DPD, vintages and roll rates, and revenue from interest, fees, interchange and subscriptions vs budget.",
        "Under the hood: complex ETL into a **PostgreSQL** backend, the same report in **Power BI**, and an AI chat that answers only from the report's numbers.",
      ],
      ru: [
        "Необанк, который кредитует онлайн на трёх рынках: продажи и риски наконец смотрят на одни цифры, вплоть до займа и карточки клиента.",
        "Воронка заявок, уровень одобрения, агенты против квоты, просрочка 30+, винтажи и переходы между корзинами, выручка от процентов, комиссий, интерчейнджа и подписок против бюджета.",
        "Под капотом: сложный ETL в бэкенд на **PostgreSQL**, тот же отчёт в **Power BI** и AI-чат, который отвечает только по цифрам отчёта.",
      ],
    },
  },
  {
    slug: "marketing-acquisition-dashboard",
    published: "2026-11-05",
    updated: "2026-11-25",
    platform: "js",
    report: "marketing",
    // The ACME Marketing report published to web from Fabric (owner, 11-05). The web flavour reads Supabase schema
    // marketing_demo through /api/marketing; its button shows once MARKETING_DATABASE_URL is set (isJsReportLive).
    powerBi: {
      embedUrl:
        "https://app.fabric.microsoft.com/view?r=eyJrIjoiNTY2MTc5YjYtY2JkMy00YzM0LWE4ZmQtNTAwNmU3MDhjNTM0IiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
      href: "https://app.fabric.microsoft.com/view?r=eyJrIjoiNTY2MTc5YjYtY2JkMy00YzM0LWE4ZmQtNTAwNmU3MDhjNTM0IiwidCI6IjBjZWM3Mzk3LWE0MDQtNDMwZi04MmQzLWQzMzIyZjdlZmM2OCIsImMiOjl9",
    },
    data: "synthetic",
    description: {
      en: "SaaS marketing dashboard in Power BI and as a web report: spend, CAC, ROAS, trial-to-paid and cohort payback by channel and campaign, with an AI chat.",
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
        "An accounting SaaS buys sign-ups on 8 ad networks for web, iOS and Android, and this is where marketing checks that the money works.",
        "Spend, new paying clients, trial-to-paid, CAC and 90-day ROAS vs last year, pacing and fatigue per campaign, payback and LTV:CAC per channel.",
        "Under the hood: complex ETL into a **PostgreSQL** backend, the same report in **Power BI**, and an AI chat that answers only from the report's numbers.",
      ],
      ru: [
        "SaaS для бухгалтерии покупает регистрации в 8 рекламных сетях для веба, iOS и Android, и здесь маркетинг проверяет, что деньги работают.",
        "Расходы, новые платящие клиенты, конверсия из триала в оплату, CAC и ROAS за 90 дней против прошлого года, темп и выгорание по кампаниям, окупаемость и LTV:CAC по каналам.",
        "Под капотом: сложный ETL в бэкенд на **PostgreSQL**, тот же отчёт в **Power BI** и AI-чат, который отвечает только по цифрам отчёта.",
      ],
    },
  },
  {
    slug: "mining-time-utilization",
    published: "2026-10-31",
    updated: "2026-11-25",
    platform: "js",
    report: "trucks",
    data: "client",
    description: {
      en: "Power BI and web report on where a coal mine's trucks and excavators spend their 24/7 hours, from calendar time to effective work, against plan.",
    },
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
        "A coal mine runs its trucks and excavators 24/7, and this shows where those hours actually go.",
        "A waterfall from calendar time down to effective work, ready-for-work and effective time vs the weekly and monthly plan, and utilization weighted by bucket size.",
        "Under the hood: complex ETL into a **PostgreSQL** backend, **Power BI**, and an AI chat that answers only from the report's numbers.",
      ],
      ru: [
        "Разрез гоняет самосвалы и экскаваторы круглосуточно, и здесь видно, куда на самом деле уходят эти часы.",
        "Водопад от календарного времени до эффективной работы, готовность к работе и эффективное время против недельного и месячного плана, использование с весом по объёму ковша.",
        "Под капотом: сложный ETL в бэкенд на **PostgreSQL**, **Power BI** и AI-чат, который отвечает только по цифрам отчёта.",
      ],
    },
  },
  {
    slug: "finance-pl-overview",
    published: "2026-07-31",
    updated: "2026-11-25",
    platform: "superset",
    data: "synthetic",
    description: {
      en: "Apache Superset dashboard for a finance team: budget vs actual, a margin waterfall and cost-centre variances over three fiscal years, on synthetic data.",
    },
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
        "Budget vs actual by account and across 8 cost centres, a margin waterfall down to operating profit, and variances sorted so the ones worth explaining come first.",
        "Under the hood: complex ETL into a **PostgreSQL** warehouse, **Apache Superset** on top.",
      ],
      ru: [
        "Три финансовых года помесячного P&L компании в четырёх регионах: факт, бюджет и прогноз рядом.",
        "План против факта по счетам и 8 центрам затрат, водопад маржи до операционной прибыли и отклонения, отсортированные так, что строки, которые стоит объяснить, идут первыми.",
        "Под капотом: сложный ETL в хранилище на **PostgreSQL**, сверху **Apache Superset**.",
      ],
    },
  },
  {
    slug: "online-sales-cube",
    published: "2026-09-21",
    updated: "2026-11-25",
    platform: "cube",
    data: "synthetic",
    description: {
      en: "Online shop sales on a Cube semantic layer over PostgreSQL: revenue, profit, orders and margin by month, category, country and channel, against last year.",
    },
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
    // The page's text since 10-22, when the dashboard moved into the popup like every
    // other showcase. Facts from docs/08 §7, the as-built dashboard.
    details: {
      en: [
        "An online shop's sales in USD, each month against the same month last year.",
        "Revenue, profit, orders and margin by month, the top 5 categories or countries, and sales by channel.",
        "Under the hood: a **PostgreSQL** star schema, **Cube** as the semantic layer with one definition per metric, and charts drawn on this site.",
      ],
      ru: [
        "Продажи интернет-магазина в долларах, каждый месяц против того же месяца прошлого года.",
        "Выручка, прибыль, заказы и маржа по месяцам, топ-5 категорий или стран и продажи по каналам.",
        "Под капотом: схема «звезда» на **PostgreSQL**, **Cube** как семантический слой с одним определением каждой метрики и графики, нарисованные на этом сайте.",
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
 * (lib/ceo-digest/config.ts) and CHAT_ENABLED is "1": without them the chat cannot answer or send, and the page has
 * nothing to show.
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
        // and the chat itself must be on: the page's main button is Ask AI (11-17 SEO check)
        return (
          s.chat === undefined ||
          (isCeoDigestConfigured() && process.env.CHAT_ENABLED === "1")
        );
      case "js":
        // the cash flow demo (11-26) has no Power BI flavour yet: until CASHFLOW_DATABASE_URL is set its page has nothing to
        // open, so it stays off the site (the other JS reports keep their pages either way)
        return s.report !== "cashflow" || isJsReportLive(s.report);
      default:
        return true;
    }
  })
  // newest first; Array.prototype.sort is stable, so a day's entries keep their order above
  .sort((a, b) => b.published.localeCompare(a.published));

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

/** Showcases safe to advertise in the sitemap: {@link showcases} minus `noindex` entries. */
export function getIndexableShowcases(): Showcase[] {
  return showcases.filter((s) => !s.noindex);
}

/** Slugs of {@link getIndexableShowcases}. */
export function getIndexableShowcaseSlugs(): string[] {
  return getIndexableShowcases().map((s) => s.slug);
}

export function getShowcase(slug: string): Showcase | undefined {
  return showcases.find((s) => s.slug === slug);
}
