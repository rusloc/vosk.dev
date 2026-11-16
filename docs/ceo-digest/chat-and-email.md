# Tidewell data chat + "email me this" (n8n) — design and contract (2026-11-16)

Replaces the Monday push email of `README.md` as the showcase's front. The data (Tidewell, `ceo_digest_demo`) stays;
it grows a customer grain and click data. The weekly KPI view (`v_kpi_weekly`) stays for a later scheduled digest.

## The flow

1. A visitor opens the chat on the site (`/work/ceo-digest`, an `automation` showcase) and asks about one of three
   scopes: **marketing** (leads, spend, impressions, clicks, CPC, CAC, trials, by channel or week), **cash flow** (money
   in and out by category, net, closing cash, runway, receivables, payables), **clients** (who they are, plan, since
   when, how long, how many invoices, billed to date, overdue).
2. The site's chat route (ADR-0005 pattern) answers in the chat. Its tools are a closed set; each runs one of the
   SQL functions below through the site's reader. No text-to-SQL. The LLM writes from returned rows only.
3. If the visitor asks for it by email and gives an address, the chat confirms scope, period and address, then calls
   the tool `send_email_report`. The site POSTs to the n8n webhook (server to server). **n8n starts only here.**
4. n8n checks the secret and the limits, answers 202, runs the same SQL function(s) for the scope and period as its own
   reader, has the LLM write 3 short bullets from those rows, builds a styled HTML email (tables + bullets) and sends it
   from the demo inbox (n8n.opc@gmail.com, the Gmail credential the inbox flows use).

## Roles (one credential per holder)

| Role | Held by | Where |
|---|---|---|
| `ceo_digest_reader` | the site's chat route | Vercel env `CEO_DIGEST_DATABASE_URL` (Session pooler, 5432) |
| `ceo_digest_n8n` | the n8n email workflow | an n8n Postgres credential (Session pooler, 5432) |
| `ceo_digest_loader` | optional refill | owner's machine |

Both readers: `nologin` until the owner sets a password, `nobypassrls noinherit`, read only, `statement_timeout`,
`search_path = ceo_digest_demo`, SELECT on the schema's tables and EXECUTE on its functions, nothing else anywhere.

## Data additions

- `company.data_as_of date` = **2026-11-15** (Sunday, end of W46): "today" for the chat and the email. Functions clamp
  every period to `[2024-01-01, data_as_of]`.
- `fact_marketing_weekly.impressions`, `.clicks` (bigint/integer, ≥ 0): paid search and paid social only; the other
  channels carry 0 and their CPC / CTR are null.
- `dim_customer`: one row per customer ever (opening base + every new one). Fictional practice names, practice type,
  city, country, plan, acquisition channel, signup date, churn date (null = active), sites.
  **Reconciles exactly** with the weekly facts: new customers per week × plan (`fact_mrr_weekly.customers_new`) and per
  week × channel (`fact_marketing_weekly.new_customers`), churned per week × plan, active per plan at every week's
  close (`customers_close`).
- `fact_customer_invoice`: the "orders": Starter / Pro one card charge a month while active, Clinic one annual invoice
  per contract year (net 30). Status at `data_as_of`: paid / open (not due) / overdue. Amounts follow list prices with
  noise; they do **not** tie to the MRR bridge to the euro (stated in the chat's notes). The 12-site physio chain's
  €52,800 annual invoice (due W42) is one named customer, overdue at `data_as_of`.

## The SQL functions (`006-chat-functions.sql`) — the contract the site and n8n both call

All `language sql stable security invoker`, `set search_path = ceo_digest_demo`, money `numeric(14,2)`, rates in
percent `numeric(6,2)`. A week belongs to a period when its Thursday (`week_start + 3`) lies in `[p_from, p_to]` (the
ISO rule `dim_week.month_start` uses). Each function ends with a total row where noted (`*_code = 'total'`).

| Function | Rows | Columns |
|---|---|---|
| `fn_meta()` | 1 | company, currency, data_from, data_as_of, weeks |
| `fn_marketing_by_channel(p_from date, p_to date)` | channel + total | channel_code, channel_name, weeks, spend_eur, impressions, clicks, ctr_pct, cpc_eur, mqls, cost_per_mql_eur, trials_started, trials_converted, trial_to_paid_pct, new_customers, cac_eur, new_mrr_eur |
| `fn_marketing_by_week(p_from date, p_to date)` | week | week_start, week_label, spend_eur, budget_eur, clicks, cpc_eur, mqls, mqls_target, new_customers, cac_eur |
| `fn_cash_by_category(p_from date, p_to date)` | category + `total_in`, `total_out`, `net` | category_code, category_name, flow, direction, amount_eur (signed), share_pct (of its direction), ly_amount_eur |
| `fn_cash_by_week(p_from date, p_to date)` | week | week_start, week_label, cash_in_eur, cash_out_eur, net_eur, closing_cash_eur, runway_months, receivables_eur, overdue_receivables_eur, payables_due_14d_eur |
| `fn_customers_by_plan(p_as_of date)` | plan + total | plan_code, plan_name, active_customers, new_last_4w, churned_last_4w, avg_tenure_months, invoices_last_12m, billed_last_12m_eur, overdue_eur |
| `fn_customer_search(p_query text, p_limit int)` | ≤ p_limit (max 20) | customer_id, name, practice_type, city, country, plan_name, channel_name, signup_date, churn_date, status, tenure_months, invoices, billed_to_date_eur, last_invoice_date, overdue_eur |
| `fn_top_customers(p_order text, p_limit int)` | ≤ p_limit (max 20) | same as search; p_order ∈ `billed`, `tenure`, `invoices`, `overdue`, `newest`; as of `data_as_of` |

## The webhook (site → n8n)

`POST <N8N_DIGEST_WEBHOOK_URL>`, header `X-Digest-Secret: <N8N_DIGEST_WEBHOOK_SECRET>`, JSON (strict, nothing else):

```json
{ "requestId": "uuid", "email": "a@b.co", "scope": "marketing | cashflow | clients",
  "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "lang": "en | ru" }
```

Answers: `202 {"status":"queued"}`, `429 {"status":"limited"}`, `400 {"status":"invalid"}`; a missing or wrong secret
gets n8n's own `403` (header auth on the Webhook node). For `clients` the email is as of `to` (clamped to
`data_as_of`): the by-plan table, the top 10 by billing and the top 5 overdue; `from` is not used.

The workflow: n8n "Tidewell data by email (public demo)", id `P4zNJlVP19oNOOm0`, path `tidewell-data-email`. Nodes:
webhook (header auth) → check request and limits (Code, static data) → 202 / 429 / 400 → pick scope → one Postgres
query per scope (the `fn_*` calls as one JSON row) → LLM chain (Haiku, 3 bullets, errors pass through) → build the
email (Code, every value escaped) → Gmail send. No node groups: n8n's preview draws a blank canvas with them.

## Limits (the email goes to an address a stranger typed)

- Site: `send_email_report` at most 2 per IP per 24 h, on top of the chat's own limits; only after the visitor gave the
  address in the conversation and confirmed it.
- n8n: 3 emails per address per 24 h, 40 in total per 24 h (static data), then 429. Content is fixed: tables + LLM
  bullets from rows; no visitor text is echoed into the email.
- The address is not stored by the site; n8n keeps a hash for the 24 h counter only.

## Env (server-only, Vercel)

`CEO_DIGEST_DATABASE_URL`, `N8N_DIGEST_WEBHOOK_URL`, `N8N_DIGEST_WEBHOOK_SECRET`. The showcase stays hidden until all
three are set, so the code can ship first.
