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

## The SQL functions (`006-chat-functions.sql`, `007-top-customers-period.sql`) — the contract the site and n8n both call

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
| `fn_top_customers_period(p_from date, p_to date, p_metric text, p_limit int)` (**007**, 2026-11-27) | ≤ p_limit (1–25, null = 10), rank order | rank, customer_id, name, practice_type, city, country, plan_name, signup_date, status (on period_to), period_from, period_to (both clamped), invoices, billed_eur, paid_eur, overdue_eur, share_pct, ranked_customers |

`fn_top_customers_period` (`007-top-customers-period.sql`) counts **days, not weeks**: an invoice belongs to the period
when its own date lies in it, so a week, a month, a quarter or any custom range all work alike. `p_metric`:
`billed` = invoiced in the period (the revenue billed), `paid` = collected in it (`paid_date`), `invoices` = number
issued in it, `overdue` = past due and unpaid on `period_to` (the rule `fn_customers_by_plan` uses; at `data_as_of` it
gives the same 18 customers and €117,930). Only customers with a value above zero are ranked; ties go to the larger
billed amount, then the lower id. `share_pct` = the customer's part of all customers' `p_metric` in the period;
`ranked_customers` = how many had any. Any other `p_metric`, or a backwards period, returns no rows.

## The webhook (site → n8n)

`POST <N8N_DIGEST_WEBHOOK_URL>`, header `X-Digest-Secret: <N8N_DIGEST_WEBHOOK_SECRET>`, JSON (strict, nothing else):

```json
{ "requestId": "uuid", "email": "a@b.co", "scope": "marketing | cashflow | clients",
  "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "lang": "en | ru" }
```

**Contract v2 (2026-11-27), additive.** `scope` may also be `top_clients`, and then the body carries exactly two more
keys, `top` (integer 1–25) and `metric` (`billed | paid | invoices | overdue`):

```json
{ "requestId": "uuid", "email": "a@b.co", "scope": "top_clients",
  "from": "YYYY-MM-DD", "to": "YYYY-MM-DD", "lang": "en | ru", "top": 5, "metric": "billed" }
```

A v1 body (the three old scopes) is unchanged byte for byte: the site adds `top` / `metric` only to `top_clients`, and
n8n v2 still requires the old six keys, and only those, for the old scopes. A v1 n8n answers a v2 body `400 invalid` (its
key check), so the order of rollout is: 007 SQL, then n8n v2, then the site (§ Top clients over any period).

Answers: `202 {"status":"queued"}`, `429 {"status":"limited"}`, `400 {"status":"invalid"}`; a missing or wrong secret
gets n8n's own `403` (header auth on the Webhook node). For `clients` the email is as of `to` (clamped to
`data_as_of`): the by-plan table, the top 10 by billing and the top 5 overdue; `from` is not used. For `top_clients`
the email is one ranked table of up to `top` rows over `from`–`to` (clamped), the ranking metric's column in bold, a
line on the listed clients' combined share, and `top`, the metric and the period (named when it is a calendar month,
quarter, year or ISO week) in the subject and the heading: "Tidewell · Top 5 clients by billing · Q3 2026 (1 Jul 2026 –
30 Sept 2026)", "Tidewell · Top client by amount collected · Week 46 2026 (…)".

The workflow: n8n "Tidewell data by email (public demo)", id `P4zNJlVP19oNOOm0`, path `tidewell-data-email`. Nodes:
webhook (header auth) → check request and limits (Code, static data) → 202 / 429 / 400 → pick scope → one Postgres
query per scope (the `fn_*` calls as one JSON row; v2 adds "Top clients data") → LLM chain (Haiku, 3 bullets, errors
pass through) → build the email (Code, every value escaped) → Gmail send. No node groups: n8n's preview draws a blank
canvas with them.

## Top clients over any period (2026-11-27)

What the chat answers now ("today" = `data_as_of`, 2026-11-15): "top 3 clients by revenue last quarter" (Q3 2026,
billed), "top 10 clients in March" (2026-03-01 to 2026-03-31), "top client this week" (W46, N = 1), "top 7 between
2026-05-04 and 2026-06-20", "who paid us the most this year" (`paid`), "most invoices last month", "top 5 overdue at
the end of September". Without a period, `top_clients` still lists as of today (`fn_top_customers`, lifetime figures).

The tool (`src/lib/ceo-digest/chat-tools.ts`), Zod `.strict()`:

```
top_clients {
  order:  billed | paid | invoices | overdue | tenure | newest
  limit?: int ≥ 1            // 10 when left out; cut to 25 with a period, to 20 without (the result says so)
  period?: this_week | last_week | this_month | last_month | this_quarter | last_quarter
         | this_year | last_year | last_4_weeks        // resolved in src/lib/ceo-digest/periods.ts
  from?, to?: YYYY-MM-DD     // any other period; both or neither, never with period
}
send_email_report { email, scope: marketing | cashflow | clients | top_clients, from, to, lang?,
                    top?: int ≥ 1 (cut to 25, default 10), metric?: billed | paid | invoices | overdue (default billed) }
                    // top / metric on another scope: refused, n8n not called
```

With a period: the named period is resolved from `data_as_of` (calendar weeks Monday–Sunday, months, quarters, years;
a running one ends on today); a custom range is clamped to 2024-01-01 … `data_as_of` and the result says when it was
cut; `paid` needs a period; `tenure` / `newest` refuse one. The result heading names N, the metric and the period
("Top 3 clients by billed amount · Q3 2026, 2026-07-01 to 2026-09-30"); each row carries all four figures and its
share; a line gives how many clients had any and the listed rows' combined share (summed in code, not by the model).
Up to 25 rows fit the result (`TOP_RESULT_CAP` 6,000 characters).

Rollout, in this order:

1. **SQL**: the owner runs `data/ceo-digest/sql/007-top-customers-period.sql` as `postgres` in the SQL editor, then the
   check queries in its header, then MCP `get_advisors(security)` (zero lints).
2. **n8n v2** (live workflow `P4zNJlVP19oNOOm0`; the node sources are in `data/ceo-digest/n8n/`, and the public copy
   `data/n8n/ceo-digest-email.json` already shows v2):
   - "Check request and limits" (Code): replace the code with `check-request-and-limits.code.txt`.
   - "Pick scope" (Switch): add a 4th rule, output key `top_clients`, `{{ $json.scope }}` equals `top_clients`.
   - New Postgres node "Top clients data" on that 4th output, credential "Postgres account" (`ceo_digest_n8n`),
     Execute Query with `top-clients-data.sql`, option Query Parameters `={{ [$json.from, $json.to, $json.metric,
     $json.top] }}`; its output into "Write commentary", like the other three data nodes.
   - "Write commentary" (LLM chain): replace the prompt (text) with `write-commentary-prompt.txt` (adds N, the metric
     and what `share_pct` means for `top_clients`; the system message stays).
   - "Build the email" (Code): replace the code with `build-the-email.code.txt` (v1 scopes render as before).
   - Save, publish, and test once: a `top_clients` body with `top` 3 gets 202 and a 3-row email; a v1 marketing body
     still gets 202; a v1 body with `top` added gets 400.
3. **Site**: deploy. Before step 1, a period question to `top_clients` answers "The data is not available right now."
   (the function is missing; every other tool works). Between steps 2 and 3 nothing changes on the site. If the site
   ships before step 2, a `top_clients` email gets n8n's 400 ("the email service rejected the request"); the other
   scopes keep working.

After n8n v2 is live, re-export the public copy from it (`scripts/n8n-export.ts`) so it matches n8n to the byte.

## Limits (the email goes to an address a stranger typed)

- Site: `send_email_report` at most 2 per IP per 24 h, on top of the chat's own limits; only after the visitor gave the
  address in the conversation and confirmed it.
- n8n: 3 emails per address per 24 h, 40 in total per 24 h (static data), then 429. Content is fixed: tables + LLM
  bullets from rows; no visitor text is echoed into the email.
- The address is not stored by the site; n8n keeps a hash for the 24 h counter only.

## Env (server-only, Vercel)

`CEO_DIGEST_DATABASE_URL`, `N8N_DIGEST_WEBHOOK_URL`, `N8N_DIGEST_WEBHOOK_SECRET`. The showcase stays hidden until all
three are set, so the code can ship first.
