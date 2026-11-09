-- The ACME Marketing chat's answer key, SQL half (plan .log/report/2026-11-07-ai-chat-metrics-plan.md §2, §4).
-- Figures the generator's control totals do not carry (market, tier and network cuts; custom windows such as Q3 2026;
-- page, segment, step, term and cohort cuts), computed straight from marketing_demo from each metric's formula, NOT
-- from the report engine, so they check it. Read-only; run as any role that reads marketing_demo (MCP execute_sql).
-- The result is frozen in chat-golden.csv; src/lib/marketing/chat-metrics.test.ts checks get_metric against it.
--
-- Day index 0 = 2025-01-01 (manifest meta.first_day); month index 0 = 2025-01. Campaign attributes come from the
-- manifest document (camp_ix = position in doc->'campaigns'); terms likewise (term_ix = position in doc->'terms').
-- Windows: W1 = the default window 2026-10-05 … 2026-11-03; Q3 = 2026-07-01 … 2026-09-30; OCT = 2026-10-01 … 10-31.
-- Key: metric | from | to | filters ("k=v;k=v": channels, platforms, networks, campaigns, market, tier, model, page,
-- segment, step, term, cohort, day, offset).

with
m as (select doc from marketing_demo.document where name = 'manifest.json'),
c as (
  select ord - 1 as camp_ix, e->>'campaign_key' as key, e->>'channel_code' as ch, e->>'platform_code' as pf,
         e->>'network_code' as nw, e->>'market_code' as mk, e->>'tier_code' as tier, (e->>'is_brand')::bool as brand
  from m, jsonb_array_elements(m.doc->'campaigns') with ordinality as t(e, ord)
),
t as (
  select ord - 1 as term_ix, e->>'term_key' as key
  from m, jsonb_array_elements(m.doc->'terms') with ordinality as t(e, ord)
),
b as (
  select (e->>0)::int as month_ix, (e->>1)::int as camp_ix, (e->>2)::float8 as budget
  from m, jsonb_array_elements(m.doc->'budget') as e
),
cd as (select d.*, c.key, c.ch, c.pf, c.nw, c.mk, c.tier, c.brand from marketing_demo.campaign_day d join c using (camp_ix)),
co as (select d.*, c.key, c.ch, c.pf, c.nw, c.mk, c.tier from marketing_demo.cohort_month d join c using (camp_ix)),
rt as (select d.*, c.key, c.ch, c.pf, c.nw, c.mk, c.tier from marketing_demo.retention d join c using (camp_ix)),
jd as (select d.*, c.key, c.ch, c.pf, c.nw, c.mk, c.tier from marketing_demo.journey_day d join c using (camp_ix)),
pg as (select d.*, c.key, c.ch, c.pf, c.nw, c.mk, c.tier from marketing_demo.traffic_page_day d join c using (camp_ix)),
sg as (select d.*, c.key, c.ch, c.pf, c.nw, c.mk, c.tier from marketing_demo.segment_day d join c using (camp_ix)),
td as (select d.*, t.key from marketing_demo.term_day d join t using (term_ix)),
w as (
  select (date '2026-10-05' - date '2025-01-01') as w1a, (date '2026-11-03' - date '2025-01-01') as w1b,
         (date '2026-07-01' - date '2025-01-01') as q3a, (date '2026-09-30' - date '2025-01-01') as q3b,
         (date '2026-10-01' - date '2025-01-01') as oca, (date '2026-10-31' - date '2025-01-01') as ocb,
         (date '2026-03-01' - date '2025-01-01') as mara, (date '2026-03-31' - date '2025-01-01') as marb,
         (date '2026-01-01' - date '2025-01-01') as jana, (date '2026-01-31' - date '2025-01-01') as janb
)
select key, value from (
  -- ---- flows and rates on market / tier / network cuts and custom windows ----
  select 'spend|2026-07-01|2026-09-30|' as key, (select sum(spend_usd) from cd, w where day_ix between q3a and q3b) as value
  union all select 'spend|2026-10-05|2026-11-03|market=NA', (select sum(spend_usd) from cd, w where mk = 'NA' and day_ix between w1a and w1b)
  union all select 'spend|2026-10-05|2026-11-03|tier=SALES_ASSISTED', (select sum(spend_usd) from cd, w where tier = 'SALES_ASSISTED' and day_ix between w1a and w1b)
  union all select 'signups|2026-10-05|2026-11-03|market=EMEA', (select sum(signups)::float8 from cd, w where mk = 'EMEA' and day_ix between w1a and w1b)
  union all select 'paid_customers|2026-10-05|2026-11-03|market=NA', (select sum(paid_dda) from cd, w where mk = 'NA' and day_ix between w1a and w1b)
  union all select 'paid_customers|2026-10-05|2026-11-03|model=PLATFORM;market=GLOBAL', (select sum(paid_platform) from cd, w where mk = 'GLOBAL' and day_ix between w1a and w1b)
  union all select 'paid_cac|2026-10-05|2026-11-03|networks=META', (select sum(spend_usd) / sum(paid_dda) from cd, w where nw = 'META' and day_ix between w1a and w1b)
  union all select 'ctr|2026-10-05|2026-11-03|networks=GOOGLE_ADS', (select sum(clicks)::float8 / sum(impressions) from cd, w where nw = 'GOOGLE_ADS' and day_ix between w1a and w1b)
  union all select 'cpc|2026-07-01|2026-09-30|channels=PAID_SEARCH', (select sum(spend_usd) / sum(clicks) from cd, w where ch = 'PAID_SEARCH' and day_ix between q3a and q3b)
  union all select 'cpm|2026-10-05|2026-11-03|networks=LINKEDIN', (select sum(spend_usd) / sum(impressions) * 1000 from cd, w where nw = 'LINKEDIN' and day_ix between w1a and w1b)
  union all select 'conversion_paid|2026-07-01|2026-09-30|', (select sum(paid_dda) / sum(signups) from cd, w where day_ix between q3a and q3b)
  union all select 'conversion_paid|2026-10-05|2026-11-03|market=NA;model=LAST_CLICK', (select sum(paid_last_click) / sum(signups) from cd, w where mk = 'NA' and day_ix between w1a and w1b)
  union all select 'click_signup_rate|2026-10-05|2026-11-03|tier=SELF_SERVE', (select sum(signups)::float8 / sum(clicks) from cd, w where tier = 'SELF_SERVE' and day_ix between w1a and w1b)
  union all select 'activation_rate|2026-10-05|2026-11-03|market=GLOBAL', (select sum(activated)::float8 / sum(signups) from cd, w where mk = 'GLOBAL' and day_ix between w1a and w1b)
  union all select 'trial_rate|2026-10-01|2026-10-31|platforms=IOS,ANDROID', (select sum(trials)::float8 / sum(signups) from cd, w where pf in ('IOS', 'ANDROID') and day_ix between oca and ocb)
  union all select 'trial_to_paid|2026-07-01|2026-09-30|platforms=WEB', (select sum(paid_dda) / sum(trials) from cd, w where pf = 'WEB' and day_ix between q3a and q3b)
  union all select 'cpl|2026-10-05|2026-11-03|market=EMEA', (select sum(spend_usd) / sum(signups) from cd, w where mk = 'EMEA' and day_ix between w1a and w1b)
  union all select 'cost_per_activated|2026-07-01|2026-09-30|', (select sum(spend_usd) / sum(activated) from cd, w where day_ix between q3a and q3b)
  union all select 'new_mrr|2026-10-05|2026-11-03|tier=SALES_ASSISTED', (select sum(mrr_dda) from cd, w where tier = 'SALES_ASSISTED' and day_ix between w1a and w1b)
  union all select 'arpa|2026-10-05|2026-11-03|market=NA', (select sum(mrr_dda) / sum(paid_dda) from cd, w where mk = 'NA' and day_ix between w1a and w1b)
  -- blended CAC over three full months: the team pool is 3 × 45,500 (PAID_TEAM_COST_MONTH_USD until 2026-10-04), all of it at ALL scope
  union all select 'blended_cac|2026-07-01|2026-09-30|', (select (sum(spend_usd) + 3 * 45500) / sum(paid_dda) from cd, w where day_ix between q3a and q3b)
  union all select 'brand_share|2026-07-01|2026-09-30|', (select sum(spend_usd) filter (where brand) / sum(spend_usd) from cd, w where ch = 'PAID_SEARCH' and day_ix between q3a and q3b)
  union all select 'attribution_gap|2026-07-01|2026-09-30|', (select sum(paid_platform) / sum(paid_dda) - 1 from cd, w where day_ix between q3a and q3b)
  union all select 'spend_share|2026-10-05|2026-11-03|channels=PAID_SOCIAL', (select sum(spend_usd) filter (where ch = 'PAID_SOCIAL') / sum(spend_usd) from cd, w where day_ix between w1a and w1b)
  -- pacing over three full months: the plan is the budget of months 18 … 20 (2026-07 … 2026-09)
  union all select 'pacing|2026-07-01|2026-09-30|', (select sum(spend_usd) from cd, w where day_ix between q3a and q3b) / (select sum(budget) from b where month_ix between 18 and 20)
  union all select 'impressions|2026-10-05|2026-11-03|networks=TIKTOK', (select sum(impressions)::float8 from cd, w where nw = 'TIKTOK' and day_ix between w1a and w1b)
  union all select 'clicks|2026-07-01|2026-09-30|market=EMEA', (select sum(clicks)::float8 from cd, w where mk = 'EMEA' and day_ix between q3a and q3b)
  union all select 'installs|2026-07-01|2026-09-30|platforms=ANDROID', (select sum(installs)::float8 from cd, w where pf = 'ANDROID' and day_ix between q3a and q3b)
  union all select 'sessions|2026-07-01|2026-09-30|channels=RETARGETING', (select sum(sessions)::float8 from cd, w where ch = 'RETARGETING' and day_ix between q3a and q3b)
  union all select 'store_views|2026-10-05|2026-11-03|networks=APPLE_SEARCH_ADS', (select sum(store_views)::float8 from cd, w where nw = 'APPLE_SEARCH_ADS' and day_ix between w1a and w1b)
  union all select 'activated|2026-10-05|2026-11-03|market=NA', (select sum(activated)::float8 from cd, w where mk = 'NA' and day_ix between w1a and w1b)
  union all select 'trials|2026-07-01|2026-09-30|tier=SELF_SERVE', (select sum(trials)::float8 from cd, w where tier = 'SELF_SERVE' and day_ix between q3a and q3b)
  union all select 'install_signup_rate|2026-07-01|2026-09-30|market=GLOBAL', (select sum(signups) filter (where pf <> 'WEB')::float8 / sum(installs) from cd, w where mk = 'GLOBAL' and day_ix between q3a and q3b)
  union all select 'landing_signup_rate|2026-07-01|2026-09-30|market=NA', (select sum(signups) filter (where pf = 'WEB')::float8 / sum(sessions) from cd, w where mk = 'NA' and day_ix between q3a and q3b)
  -- ---- pages, segments, steps (journey) ----
  union all select 'page_cvr|2026-10-05|2026-11-03|page=LP_PRICING;market=NA', (select sum(signups)::float8 / sum(sessions) from pg, w where page_ix = 0 and mk = 'NA' and day_ix between w1a and w1b)
  union all select 'page_bounce|2026-07-01|2026-09-30|page=LP_HOME', (select sum(bounces)::float8 / sum(sessions) from pg, w where page_ix = 1 and day_ix between q3a and q3b)
  union all select 'page_lcp|2026-07-01|2026-09-30|page=LP_SIGNUP', (select sum(lcp_x_sessions) / sum(sessions) from pg, w where page_ix = 4 and day_ix between q3a and q3b)
  union all select 'page_visits|2026-10-05|2026-11-03|page=LP_APP_STORE;market=GLOBAL', (select sum(store_views)::float8 from pg, w where page_ix = 6 and mk = 'GLOBAL' and day_ix between w1a and w1b)
  union all select 'page_cvr|2026-07-01|2026-09-30|page=LP_PLAY_STORE', (select sum(installs)::float8 / sum(store_views) from pg, w where page_ix = 7 and day_ix between q3a and q3b)
  union all select 'segment_activation|2026-07-01|2026-09-30|segment=IOS_18', (select sum(activated_7d)::float8 / sum(signups) from sg, w where seg_ix = 2 and day_ix between q3a and q3b)
  union all select 'segment_activation|2026-10-05|2026-11-03|segment=WEB_MOBILE;market=NA', (select sum(activated_7d)::float8 / sum(signups) from sg, w where seg_ix = 1 and mk = 'NA' and day_ix between w1a and w1b)
  union all select 'onboarding_step|2026-07-01|2026-09-30|step=CONNECT_SOURCE', (select sum(step_connected)::float8 from jd, w where day_ix between q3a and q3b) / (select sum(signups) from cd, w where day_ix between q3a and q3b)
  union all select 'onboarding_step|2026-10-05|2026-11-03|step=INVITE;channels=PAID_SEARCH', (select sum(step_invited)::float8 from jd, w where ch = 'PAID_SEARCH' and day_ix between w1a and w1b) / (select sum(signups) from cd, w where ch = 'PAID_SEARCH' and day_ix between w1a and w1b)
  -- ---- keywords / placements ----
  union all select 'term_cvr|2026-07-01|2026-09-30|campaigns=SRCH_NONBRAND_ANALYTICS;term=SRCH_NONBRAND_ANALYTICS-T3', (select sum(signups)::float8 / sum(clicks) from td, w where key = 'SRCH_NONBRAND_ANALYTICS-T3' and day_ix between q3a and q3b)
  union all select 'term_cpc|2026-07-01|2026-09-30|campaigns=SOC_META_LAL2;term=SOC_META_LAL2-T1', (select sum(spend_usd) / sum(clicks) from td, w where key = 'SOC_META_LAL2-T1' and day_ix between q3a and q3b)
  -- ---- cohorts (acquisition month; cost = month spend × (1 + team pool 45,500 ÷ all spend of the month)) ----
  union all select 'cohort_size|2026-10-05|2026-11-03|cohort=2026-05;market=NA', (select sum(customers_start) from co where cohort_month_ix = 16 and month_offset = 0 and mk = 'NA')
  union all select 'cohort_cac|2026-10-05|2026-11-03|cohort=2026-03;channels=PAID_SOCIAL',
    (select sum(spend_usd) filter (where ch = 'PAID_SOCIAL') * (1 + 45500 / sum(spend_usd)) from cd, w where day_ix between mara and marb)
    / (select sum(customers_start) from co where cohort_month_ix = 14 and month_offset = 0 and ch = 'PAID_SOCIAL')
  union all select 'retention|2026-10-05|2026-11-03|cohort=2026-06;day=30;market=NA', (select sum(users_active)::float8 / sum(users_matured) from rt where cohort_month_ix = 17 and day_n = 30 and mk = 'NA')
  union all select 'payback_share|2026-10-05|2026-11-03|cohort=2026-01;offset=6;channels=PAID_SEARCH',
    (select sum(revenue_usd - refunds_usd) * 0.363 from co where cohort_month_ix = 12 and month_offset <= 6 and ch = 'PAID_SEARCH')
    / ((select sum(spend_usd) filter (where ch = 'PAID_SEARCH') * (1 + 45500 / sum(spend_usd)) from cd, w where day_ix between jana and janb))
  -- ---- trailing-month metrics anchored at the window end (W1 ends 2026-11-03: its month Nov 2026 = 22, last complete month Oct 2026 = 21) ----
  union all select 'churn_monthly|2026-10-05|2026-11-03|market=NA', (select sum(churned) / sum(customers_start) from co where month_offset >= 1 and cohort_month_ix + month_offset between 19 and 21 and mk = 'NA')
  union all select 'churned_customers|2026-10-05|2026-11-03|channels=PAID_SOCIAL', (select sum(churned) from co where month_offset >= 1 and cohort_month_ix + month_offset between 19 and 21 and ch = 'PAID_SOCIAL')
  union all select 'refund_rate|2026-10-05|2026-11-03|tier=SELF_SERVE', (select sum(refund_count) from co where cohort_month_ix between 11 and 22 and tier = 'SELF_SERVE') / (select sum(customers_start) from co where cohort_month_ix between 11 and 22 and month_offset = 0 and tier = 'SELF_SERVE')
  union all select 'refunds|2026-07-01|2026-09-30|networks=META', (select sum(refund_count) from co where cohort_month_ix between 9 and 20 and nw = 'META')
  -- ---- traps: the tool must answer n/a (expected stays empty in the CSV; the SQL proves why) ----
  union all select 'paid_cac|2026-10-05|2026-11-03|campaigns=RT_META_RETENTION', (select nullif(sum(paid_dda), 0) from cd, w where key = 'RT_META_RETENTION' and day_ix between w1a and w1b)
  union all select 'retention|2026-10-05|2026-11-03|cohort=2026-10;day=90', (select nullif(sum(users_matured), 0)::float8 from rt where cohort_month_ix = 21 and day_n = 90)
) x
order by key;
