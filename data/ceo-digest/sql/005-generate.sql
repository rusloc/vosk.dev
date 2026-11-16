-- ceo_digest_demo facts — a deterministic generator: the same rows on every run (noise comes from md5 of a fixed key,
-- not random()). Applied by postgres via MCP execute_sql after 004, in ONE call (it uses temp tables and pg_temp
-- helpers that live for the session). Truncates and refills the six weekly fact tables, dim_customer and
-- fact_customer_invoice; nothing else is touched.
--
-- Tidewell, 2024-W01 to 2026-W53: a European SaaS SME. ARR about €2.5M → €5.7M, 36 → ~63 staff, a €5M equity round
-- in June 2025. Everything reconciles by construction: the MRR bridge rolls week to week, new customers by channel
-- sum to new customers by plan, receivables and payables come from the same invoices as the cash they turn into, and
-- closing cash is opening cash plus every week's movements. The customer list at the end of the file is cut from the
-- same weekly counts (signups by week, plan and channel; churn by week and plan), so it reconciles with them exactly;
-- its invoices follow list prices and do not tie to the MRR bridge to the euro.
--
-- Stories in the autumn 2026 weeks, for the email to find (the email of Mon 16 Nov 2026 reports W46):
--   * W42–W48  a paid social push: spend ×1.7, cheaper but weaker leads → CAC up, trial-to-paid down two weeks later
--   * W43–W47  Starter churn ×1.9 after a competitor's free tier → MRR churn above last year
--   * W38      a 12-site physio chain is invoiced €52,800 for its annual Clinic plan; due W42, paid only in W50
--              → overdue receivables jump from W43
--   * W44      the annual cloud commitment (€96,000) is invoiced, due W48 → payables due in 14 days spike W46–W47
--   * W46      the Q3 VAT payment

set search_path = ceo_digest_demo;

truncate fact_mrr_weekly, fact_marketing_weekly, fact_target_weekly, fact_cash_weekly, fact_ar_weekly, fact_ap_weekly
    , fact_customer_invoice, dim_customer;

-- u: uniform [0, 1) from a key; z: roughly normal, mean 0, sd 1 (three uniforms)
create or replace function pg_temp.u(k text) returns numeric language sql immutable as
$$ select (('x' || substr(md5('tidewell:' || k), 1, 8))::bit(32)::bigint / 4294967296.0)::numeric $$;
create or replace function pg_temp.z(k text) returns numeric language sql immutable as
$$ select (pg_temp.u(k || ':a') + pg_temp.u(k || ':b') + pg_temp.u(k || ':c') - 1.5) * 2 $$;
-- headcount by months since Jan 2024: +0.5 a month, +2 after the round (Jul–Dec 2025), +0.5 in 2026
create or replace function pg_temp.hc(mi int) returns numeric language sql immutable as
$$ select round(case when mi <= 17 then 36 + 0.5 * mi when mi <= 23 then 44.5 + 2.0 * (mi - 17) else 56.5 + 0.5 * (mi - 23) end) $$;

drop table if exists pg_temp.g_week, pg_temp.g_channel, pg_temp.g_funnel, pg_temp.g_new, pg_temp.g_plan
    , pg_temp.g_plan_week, pg_temp.g_mrr, pg_temp.g_ar_k, pg_temp.g_ar_inv, pg_temp.g_ap_inv, pg_temp.g_cash
    , pg_temp.g_cust;

-- ---------------------------------------------------------------- calendar and drivers

create temp table g_week as
select
     w.week_start                                                       week_start
    ,w.iso_year                                                         iso_year
    ,w.iso_week                                                         iso_week
    ,w.month_start                                                      month_start
    ,((w.week_start - date '2024-01-01') / 7)::int                      i
    ,(((w.week_start - date '2024-01-01') / 7) / 52.0)::numeric         t
    ,case
         when w.iso_week between 1 and 5   then 1.20
         when w.iso_week between 6 and 9   then 1.08
         when w.iso_week between 27 and 34 then 0.80
         when w.iso_week between 35 and 40 then 1.08
         when w.iso_week >= 51             then 0.65
         else 1.00
     end::numeric                                                       s_lead      -- demand season
    ,case
         when w.iso_week between 27 and 34 then 0.85
         when w.iso_week >= 51             then 0.70
         else 1.00
     end::numeric                                                       s_spend     -- budget follows it
    ,w.week_start between date '2026-10-12' and date '2026-11-23'       story_social
    ,w.week_start between date '2026-10-19' and date '2026-11-16'       story_churn
    ,w.month_start <> coalesce(lag(w.month_start) over (order by w.week_start), date '2023-12-01')
                                                                        first_of_month
    ,(
        select date_trunc('month', d)::date
        from generate_series(w.week_start, w.week_start + 6, interval '1 day') d
        where 1=1
            and extract(day from d) = 25
     )                                                                  pay_month   -- set when the 25th falls in the week
from dim_week w;

create temp table g_channel as
select
     c.channel_id, c.code, c.has_trial
    ,v.spend0, v.spend_g, v.cpl0, v.leads0, v.leads_g, v.trial_rate, v.conv, v.mix_starter, v.mix_clinic
from dim_channel c
join (values
     ('paid_search', 5200, 0.18, 62.0, null::numeric, null::numeric, 0.55, 0.120, 0.40, 0.12)
    ,('paid_social', 3000, 0.20, 45.0, null,          null,          0.38, 0.072, 0.58, 0.04)
    ,('content_seo', 2600, 0.10, null, 85,            0.28,          0.48, 0.105, 0.42, 0.10)
    ,('partners',    1200, 0.25, null, 22,            0.25,          0.60, 0.180, 0.20, 0.25)
    ,('outbound',     900, 0.15, null, 10,            0.20,          0,    0.130, 0.00, 0.70)
) v(code, spend0, spend_g, cpl0, leads0, leads_g, trial_rate, conv, mix_starter, mix_clinic) on v.code = c.code;

-- ---------------------------------------------------------------- the funnel, week × channel

create temp table g_funnel as
with a as (
    select
         w.week_start, w.i, w.t, c.channel_id, c.code, c.has_trial, c.trial_rate, c.conv, c.mix_starter, c.mix_clinic
        ,c.cpl0 is not null                                                                     paid
        ,w.story_social and c.code = 'paid_social'                                              push
        ,c.spend0 * power(1 + c.spend_g, w.t) * w.s_spend                                       spend_plan
        ,case
             when c.cpl0 is not null
                 then c.spend0 * power(1 + c.spend_g, w.t) * w.s_lead / (c.cpl0 * (1 + 0.06 * w.t))
             else c.leads0 * power(1 + c.leads_g, w.t) * w.s_lead
         end                                                                                    leads_plan
    from g_week w
    cross join g_channel c
)
, b as (
    select
         a.*
        ,round(a.spend_plan * (1 + 0.06 * pg_temp.z('spend:' || a.code || ':' || a.i))
               * case when a.push then 1.7 else 1 end, 2)                                       spend
    from a
)
, c as (
    select
         b.*
        ,greatest(0, round(
             b.leads_plan
             * case when b.paid then b.spend / b.spend_plan else 1 end   -- paid leads follow the money
             * case when b.push then 1 / 1.15 else 1 end                 -- the push buys dearer, weaker leads
             * (1 + 0.09 * pg_temp.z('leads:' || b.code || ':' || b.i))
         ))::int                                                                                mqls
    from b
)
, d as (
    select
         c.*
        ,case
             when c.has_trial
                 then floor(c.mqls * c.trial_rate
                            * (1 + 0.05 * pg_temp.z('trials:' || c.code || ':' || c.i))
                            + pg_temp.u('trials-r:' || c.code || ':' || c.i))::int
             else 0
         end                                                                                    trials_started
    from c
)
, e as (
    select
         d.*
        ,coalesce(lag(d.trials_started, 2) over (partition by d.channel_id order by d.i), d.trials_started) trials_ended
        ,coalesce(lag(d.push, 2) over (partition by d.channel_id order by d.i), false)                      push_cohort
        ,coalesce(lag(d.mqls, 3) over (partition by d.channel_id order by d.i), d.mqls)                     meetings_3w
    from d
)
select
     e.*
    ,case
         when e.has_trial
             then least(e.trials_ended, floor(
                      e.trials_ended * e.conv * (1 + 0.03 * e.t)
                      * case when e.push_cohort then 0.35 else 1 end
                      * (1 + 0.10 * pg_temp.z('conv:' || e.code || ':' || e.i))
                      + pg_temp.u('conv-r:' || e.code || ':' || e.i)))::int
         else 0
     end                                                                                        trials_converted
    ,case
         when e.has_trial
             then null
         else floor(e.meetings_3w * e.conv * (1 + 0.15 * pg_temp.z('won:' || e.code || ':' || e.i))
                    + pg_temp.u('won-r:' || e.code || ':' || e.i))::int
     end                                                                                        deals_won
from e;

-- New customers split into plans by the channel's mix, and their MRR at that week's prices.
create temp table g_new as
with n as (
    select
         f.week_start, f.i, f.t, f.channel_id, f.code, f.mix_starter, f.mix_clinic
        ,coalesce(f.deals_won, f.trials_converted)                                              n
    from g_funnel f
)
, s as (
    select
         n.*
        ,least(n.n, floor(n.n * n.mix_clinic + pg_temp.u('mixc:' || n.code || ':' || n.i)))::int clinic
    from n
)
, p as (
    select
         s.*
        ,least(s.n - s.clinic, floor(s.n * s.mix_starter + pg_temp.u('mixs:' || s.code || ':' || s.i)))::int starter
    from s
)
select
     p.week_start
    ,p.i
    ,p.channel_id
    ,x.plan_id
    ,x.n
    ,round(x.n * x.price, 2)                                                                    mrr
from p
cross join lateral (values
     (1::smallint, p.starter,
      39 * (0.94 + 0.06 * pg_temp.u('ps:' || p.code || ':' || p.i)))
    ,(2::smallint, p.n - p.clinic - p.starter,
      case when p.week_start < date '2025-03-31' then 99 else 109 end * (0.93 + 0.07 * pg_temp.u('pp:' || p.code || ':' || p.i)))
    ,(3::smallint, p.clinic,
      305 * power(1.04, p.t) * (0.75 + 0.50 * pg_temp.u('pc:' || p.code || ':' || p.i)))
) x(plan_id, n, price);

-- ---------------------------------------------------------------- the MRR bridge, week × plan

create temp table g_plan as
select *
from (values
     (1::smallint, 920, 37.5::numeric, 0.036::numeric, 0.002::numeric, 0.0010::numeric)
    ,(2::smallint, 760, 95.0,          0.021,          0.005,          0.0025)
    ,(3::smallint, 335, 298.0,         0.009,          0.010,          0.0030)
) v(plan_id, cust0, arpa0, churn_m, exp_m, contr_m);

create temp table g_plan_week as
select
     w.week_start
    ,w.i
    ,p.plan_id
    ,case p.plan_id
         when 1 then case when w.iso_week <= 4 then 1.3 else 1 end * case when w.story_churn then 1.9 else 1 end
         when 2 then case when w.story_churn then 1.25 else 1 end
         else case when w.iso_week <= 4 then 2.2 else 0.9 end
     end::numeric                                                                               churn_mult
    ,case when p.plan_id = 2 and w.week_start = date '2025-06-30' then 0.035 else 0 end::numeric exp_bonus -- Pro price rise for existing accounts
    ,coalesce(sum(n.n), 0)::int                                                                 new_n
    ,coalesce(sum(n.mrr), 0)                                                                    new_mrr
from g_week w
cross join g_plan p
left join g_new n on n.week_start = w.week_start and n.plan_id = p.plan_id
group by w.week_start, w.i, w.iso_week, w.story_churn, p.plan_id;

create temp table g_mrr as
with recursive sim as (
    select
         -1                                  i
        ,p.plan_id                           plan_id
        ,0                                   c_open
        ,0                                   c_new
        ,0                                   c_churn
        ,p.cust0                             c_close
        ,0::numeric                          m_open
        ,0::numeric                          m_new
        ,0::numeric                          m_exp
        ,0::numeric                          m_contr
        ,0::numeric                          m_churn
        ,round(p.cust0 * p.arpa0, 2)         m_close
    from g_plan p
    union all
    select
         s.i + 1
        ,s.plan_id
        ,s.c_close
        ,q.new_n
        ,x.churned
        ,s.c_close + q.new_n - x.churned
        ,s.m_close
        ,q.new_mrr
        ,y.m_exp
        ,y.m_contr
        ,y.m_churn
        ,s.m_close + q.new_mrr + y.m_exp - y.m_contr - y.m_churn
    from sim s
    join g_plan p on p.plan_id = s.plan_id
    join g_plan_week q on q.plan_id = s.plan_id and q.i = s.i + 1
    cross join lateral (
        select
             least(s.c_close, floor(
                 s.c_close * p.churn_m / 4.345 * q.churn_mult
                 * (1 + 0.15 * pg_temp.z('churn:' || s.plan_id || ':' || q.i))
                 + pg_temp.u('churn-r:' || s.plan_id || ':' || q.i)))::int    churned
    ) x
    cross join lateral (
        select
             round(greatest(0, s.m_close * (p.exp_m / 4.345 * (1 + 0.3 * pg_temp.z('exp:' || s.plan_id || ':' || q.i)) + q.exp_bonus)), 2)  m_exp
            ,round(greatest(0, s.m_close * p.contr_m / 4.345 * (1 + 0.3 * pg_temp.z('contr:' || s.plan_id || ':' || q.i))), 2)               m_contr
            ,round(x.churned * s.m_close / nullif(s.c_close, 0) * (0.85 + 0.20 * pg_temp.u('churn-m:' || s.plan_id || ':' || q.i)), 2)       m_churn
    ) y
    where 1=1
        and s.i < (select max(i) from g_week)
)
select
     w.week_start
    ,s.*
from sim s
join g_week w on w.i = s.i
where 1=1
    and s.i >= 0;

insert into fact_mrr_weekly (week_start, plan_id, customers_open, customers_new, customers_churned,
                             mrr_open, mrr_new, mrr_expansion, mrr_contraction, mrr_churn)
select
     m.week_start, m.plan_id, m.c_open, m.c_new, m.c_churn
    ,m.m_open, m.m_new, m.m_exp, m.m_contr, m.m_churn
from g_mrr m;

-- Clicks and impressions hang off the spend, for the two ad channels only: clicks = spend ÷ a cost per click
-- (paid search €2.55–3.95, paid social €0.92–1.58, creeping up 5 % a year; the social push buys 30 % dearer clicks at
-- a lower click-through), impressions = clicks ÷ a click-through rate (search ~4.2 %, social ~1.1 %). Their noise has
-- keys of its own, so nothing above moves.
insert into fact_marketing_weekly (week_start, channel_id, spend_eur, mqls, trials_started, trials_ended,
                                   trials_converted, new_customers, new_mrr, impressions, clicks)
select
     f.week_start, f.channel_id, f.spend, f.mqls, f.trials_started
    ,case when f.has_trial then f.trials_ended else 0 end
    ,f.trials_converted
    ,coalesce(f.deals_won, f.trials_converted)
    ,(select coalesce(sum(n.mrr), 0) from g_new n where n.week_start = f.week_start and n.channel_id = f.channel_id)
    ,coalesce(round(round(f.spend / a.cpc) / a.ctr), 0)
    ,coalesce(round(f.spend / a.cpc), 0)
from g_funnel f
cross join lateral (
    select
         case f.code
             when 'paid_search'
                 then least(3.95, greatest(2.55,
                          2.90 * (1 + 0.05 * f.t) * (1 + 0.07 * pg_temp.z('cpc:' || f.code || ':' || f.i))))
             when 'paid_social'
                 then least(1.58, greatest(0.92,
                          1.02 * (1 + 0.05 * f.t) * (1 + 0.07 * pg_temp.z('cpc:' || f.code || ':' || f.i))
                          * case when f.push then 1.3 else 1 end))
         end                                                                                    cpc
        ,case f.code
             when 'paid_search' then 0.042
             when 'paid_social' then 0.011 * case when f.push then 0.85 else 1 end
         end * (1 + 0.08 * pg_temp.z('ctr:' || f.code || ':' || f.i))                           ctr
) a;

-- ---------------------------------------------------------------- the plan

-- Net new MRR planned per year, phased evenly; ARR target = MRR at the year's start × 12 + the plan to date.
insert into fact_target_weekly (week_start, arr_target, net_new_mrr_target, mqls_target, marketing_budget, cac_target)
with y as (
    select
         w.iso_year
        ,count(*)                                                                               weeks
        ,case w.iso_year when 2024 then 84000 when 2025 then 98000 else 112000 end::numeric     net_new_mrr_year
        ,case w.iso_year when 2024 then 760 when 2025 then 770 else 780 end::numeric           cac
    from g_week w
    group by w.iso_year
)
, b as (
    select
         w.iso_year
        ,sum(m.m_open)                                                                          mrr_base
    from g_mrr m
    join g_week w on w.week_start = m.week_start
    where 1=1
        and w.iso_week = 1
    group by w.iso_year
)
, f as (
    select
         f.week_start
        ,sum(f.spend_plan)                                                                      budget
        ,sum(f.leads_plan)                                                                      leads
    from g_funnel f
    group by f.week_start
)
select
     w.week_start
    ,round(12 * (b.mrr_base + y.net_new_mrr_year / y.weeks * w.iso_week), 2)
    ,round(y.net_new_mrr_year / y.weeks, 2)
    ,round(f.leads * 1.03)::int
    ,round(f.budget, 2)
    ,y.cac
from g_week w
join y on y.iso_year = w.iso_year
join b on b.iso_year = w.iso_year
join f on f.week_start = w.week_start;

-- ---------------------------------------------------------------- receivables (Clinic invoices, annual, net 30)

-- When an invoice's money arrives, k weeks after the invoice week: most at the due date (k = 4), a tail later,
-- 1 % written off at 26 weeks. outstanding = what is still open at the close of week k.
create temp table g_ar_k as
with p as (
    select
         k
        ,case k when 3 then 0.25 when 4 then 0.33 when 5 then 0.15 when 6 then 0.08 when 7 then 0.05 when 8 then 0.05
                else case when k between 9 and 12 then 0.015 when k between 13 and 17 then 0.004 else 0 end end::numeric paid
        ,case when k = 26 then 0.01 else 0 end::numeric                                                                    writeoff
    from generate_series(0, 26) k
)
select
     p.k, p.paid
    ,1 - sum(p.paid + p.writeoff) over (order by p.k)                                           outstanding
    ,case
         when p.k <= 4  then 'not_due'
         when p.k <= 8  then 'overdue_1_30'
         when p.k <= 12 then 'overdue_31_60'
         when p.k <= 17 then 'overdue_61_90'
         else 'overdue_90_plus'
     end                                                                                        bucket
from p;

-- Invoices: new Clinic accounts billed 12 months ahead, renewals by the season (30 % of the book renews in January),
-- six months of history before 2024 so the first weeks have receivables, and the physio chain's invoice apart.
create temp table g_ar_inv as
select
     m.i                                                                                        j
    ,'normal'                                                                                   kind
    ,round(12 * (m.m_new + m.m_open * case when w.iso_week <= 4 then 0.075 else 0.70 / 48 end), 2) amount
from g_mrr m
join g_week w on w.week_start = m.week_start
where 1=1
    and m.plan_id = 3
union all
select
     j, 'normal', round(12 * 335 * 298.0 * 0.70 / 48, 2)
from generate_series(-26, -1) j
union all
select
     w.i, 'chain', 52800
from g_week w
where 1=1
    and w.week_start = date '2026-09-14';

-- ---------------------------------------------------------------- payables (supplier invoices, net 30)

create temp table g_ap_inv as
with mrr as (
    select m.i, sum(m.m_open) mrr from g_mrr m group by m.i
)
, w as (
    select g.*, r.mrr from g_week g join mrr r on r.i = g.i
)
select
     w.i                                                                                        j
    ,'hosting_software'                                                                         code
    ,case when w.first_of_month then round(0.05 * w.mrr, 2) else 0 end                        -- hosting, billed monthly
     + round(0.045 * w.mrr / 4.345, 2)                                                          -- software, billed as used
     + case when w.week_start = date '2026-10-26' then 96000 else 0 end                         amount
from w
union all
select
     f.i, 'marketing_suppliers', sum(f.spend)
from g_funnel f
where 1=1
    and f.code in ('content_seo', 'partners', 'outbound')
group by f.i
union all
select
     w.i, 'other_opex'
    ,round(3500 * power(1.20, w.t) * (1 + 0.2 * pg_temp.z('opex:' || w.i))
           + case when w.week_start between date '2025-06-09' and date '2025-12-28' then 1500 else 0 end, 2) -- recruiting after the round
from w
union all
select
     j, x.code, x.amount
from generate_series(-6, -1) j
cross join (values
     ('hosting_software',    round(0.095 * (920 * 37.5 + 760 * 95 + 335 * 298) / 4.345, 2))
    ,('marketing_suppliers', 4700.00)
    ,('other_opex',          3500.00)
) x(code, amount);

-- AP payment schedule by weeks after the invoice: 85 % on the due week (k = 4), 12 % a week late, 3 % two weeks late.

-- ---------------------------------------------------------------- cash, week × category

create temp table g_cash (week_start date, code text, amount numeric);

insert into g_cash
select w.week_start, 'card_collections', round(sum(m.m_open) / 4.345 * 0.958, 2)   -- fees and failed cards ~4 %
from g_week w
join g_mrr m on m.i = w.i and m.plan_id in (1, 2)
group by w.week_start;

insert into g_cash
select
     w.week_start, 'invoice_collections'
    ,round(sum(case when v.kind = 'normal' then v.amount * k.paid
                    when v.kind = 'chain' and w.week_start = date '2026-12-07' then v.amount
                    else 0 end), 2)
from g_week w
join g_ar_inv v on w.i - v.j between 0 and 26
join g_ar_k k on k.k = w.i - v.j
group by w.week_start;

insert into g_cash
select w.week_start, 'payroll', -round(pg_temp.hc(m.mi) * 6600 * power(1.04, m.mi / 12.0)
                                      * case when extract(month from w.pay_month) = 12 then 1.3 else 1 end, 2)
from g_week w
cross join lateral (select ((extract(year from w.pay_month) - 2024) * 12 + extract(month from w.pay_month) - 1)::int mi) m
where 1=1
    and w.pay_month is not null;

insert into g_cash
select f.week_start, 'paid_ads', -sum(f.spend)
from g_funnel f
where 1=1
    and f.code in ('paid_search', 'paid_social')
group by f.week_start;

insert into g_cash
select w.week_start, a.code, -round(sum(a.amount * case w.i - a.j when 4 then 0.85 when 5 then 0.12 when 6 then 0.03 else 0 end), 2)
from g_week w
join g_ap_inv a on w.i - a.j between 4 and 6
group by w.week_start, a.code;

insert into g_cash
select w.week_start, 'rent_office', case when w.month_start < date '2025-10-01' then -27000 else -45000 end
from g_week w
where 1=1
    and w.first_of_month
    and extract(month from w.month_start) in (1, 4, 7, 10);

insert into g_cash
select w.week_start, 'capex'
    ,-(1500 + 2300 * greatest(0, pg_temp.hc(m.mi) - pg_temp.hc(m.mi - 1)))
     - case when w.week_start = date '2025-10-06' then 85000 else 0 end                         -- new office fit-out
from g_week w
cross join lateral (select ((extract(year from w.month_start) - 2024) * 12 + extract(month from w.month_start) - 1)::int mi) m
where 1=1
    and w.first_of_month;

insert into g_cash
select date '2025-06-09', 'equity', 5000000;

-- VAT: settled quarterly (W07, W20, W33, W46) at ~4.5 % of the quarter's collections, net of input VAT.
insert into g_cash
select
     w.week_start, 'vat'
    ,-round(0.045 * 13 * (
         select avg(x.week_sum)
         from (
             select c.week_start, sum(c.amount) week_sum
             from g_cash c
             where 1=1
                 and c.code in ('card_collections', 'invoice_collections')
                 and c.week_start between w.week_start - 91 and w.week_start - 7
             group by c.week_start
         ) x
     ), 2)
from g_week w
where 1=1
    and w.iso_week in (7, 20, 33, 46);

insert into fact_cash_weekly (week_start, cash_category_id, amount_eur)
select
     w.week_start
    ,g.cash_category_id
    ,coalesce(sum(c.amount), 0)
from g_week w
cross join dim_cash_category g
left join g_cash c on c.week_start = w.week_start and c.code = g.code
group by w.week_start, g.cash_category_id;

-- ---------------------------------------------------------------- working capital snapshots

insert into fact_ar_weekly (week_start, bucket, amount_eur)
select
     w.week_start
    ,b.bucket
    ,coalesce(x.amount, 0)
from g_week w
cross join (values ('not_due'), ('overdue_1_30'), ('overdue_31_60'), ('overdue_61_90'), ('overdue_90_plus')) b(bucket)
left join (
    select
         w2.week_start
        ,k.bucket
        ,round(sum(
             case
                 when v.kind = 'normal' then v.amount * k.outstanding
                 when v.kind = 'chain' and w2.week_start < date '2026-12-07' then v.amount  -- open until paid in W50
                 else 0
             end), 2)                                                                           amount
    from g_week w2
    join g_ar_inv v on w2.i - v.j between 0 and 26
    join g_ar_k k on k.k = w2.i - v.j
    group by w2.week_start, k.bucket
) x on x.week_start = w.week_start and x.bucket = b.bucket;

insert into fact_ap_weekly (week_start, bucket, amount_eur)
select
     w.week_start
    ,b.bucket
    ,coalesce(round(sum(
         a.amount * case w.i - a.j when 4 then 0.15 when 5 then 0.03 else 1 end
     ), 2), 0)
from g_week w
cross join (values ('overdue'), ('due_0_7'), ('due_8_14'), ('due_15_30')) b(bucket)
left join g_ap_inv a on w.i - a.j between 0 and 5
    and b.bucket = case w.i - a.j when 0 then 'due_15_30' when 1 then 'due_15_30' when 2 then 'due_8_14'
                                  when 3 then 'due_0_7' else 'overdue' end
group by w.week_start, b.bucket;

-- ---------------------------------------------------------------- customers

-- One row per customer, cut from the counts above so the list and the weekly facts agree exactly:
--   * the opening base: g_plan.cust0 customers per plan, signed up over the five years before 2024. Their ages follow
--     a truncated exponential, the shape churn leaves behind: Starter churns fastest, so its survivors are the
--     youngest (scale 22 months), then Pro (36), then Clinic (50). 28 % of the Clinic ones are placed in a January,
--     which puts about 30 % of the Clinic renewals of 2024–2026 there (more in 2024, fewer by 2026: new accounts
--     renew on their own dates)
--   * every new customer: g_new.n per week × channel × plan, on a day of that week
--   * churn: g_mrr.c_churn per week × plan, drawn below from the customers active at the week's open
-- One opening Clinic row is the 12-site physio chain of the receivables story; it never churns.
-- customer_id follows the signup date, so the oldest customers have the lowest numbers.
create temp table g_cust as
with mix (plan_id, channel_id, cum) as (   -- the opening base's channels by plan (cumulative shares)
    values
         (1, 1, 0.33), (1, 2, 0.60), (1, 3, 0.90), (1, 4, 1.00)
        ,(2, 1, 0.36), (2, 2, 0.48), (2, 3, 0.78), (2, 4, 0.95), (2, 5, 1.00)
        ,(3, 1, 0.22), (3, 2, 0.25), (3, 3, 0.45), (3, 4, 0.70), (3, 5, 1.00)
)
, o as (
    select
         p.plan_id                                                                              plan_id
        ,'o:' || p.plan_id || ':' || k                                                          key
        ,p.plan_id = 3 and k = 1                                                                is_chain
    from g_plan p
    cross join lateral generate_series(1, p.cust0) k
)
, g as (
    select
         o.plan_id
        ,case
             when o.is_chain
                 then 5
             else (select min(m.channel_id) from mix m where m.plan_id = o.plan_id and pg_temp.u('ch:' || o.key) < m.cum)
         end::smallint                                                                              channel_id
        ,case
             when o.is_chain
                 then date '2022-09-14'            -- its contract year starts mid-September: invoiced Mon 14 Sep 2026 (W38)
             when o.plan_id = 3 and pg_temp.u('jan:' || o.key) < 0.28
                 then make_date(2023 - floor(5 * power(pg_temp.u('yr:' || o.key), 1.4))::int, 1
                                , 2 + floor(29 * pg_temp.u('day:' || o.key))::int)
             else date '2024-01-01' - 1 - floor(30.4375 * m.scale
                                               * -ln(1 - pg_temp.u('age:' || o.key) * (1 - exp(-60 / m.scale))))::int
        end                                                                                        signup_date
        ,o.key
        ,o.is_chain
    from o
    cross join lateral (select case o.plan_id when 1 then 22.0 when 2 then 36.0 else 50.0 end scale) m
    union all
    select
         n.plan_id
        ,n.channel_id
        ,n.week_start + floor(7 * pg_temp.u('day:n:' || n.i || ':' || n.channel_id || ':' || n.plan_id || ':' || k))::int
        ,'n:' || n.i || ':' || n.channel_id || ':' || n.plan_id || ':' || k
        ,false
    from g_new n
    cross join lateral generate_series(1, n.n) k
)
select
     row_number() over (order by g.signup_date, g.plan_id, g.key)::int                          customer_id
    ,g.*
    ,null::date                                                                                 churn_date
from g;

-- Churn, week by week and plan by plan: g_mrr.c_churn customers leave on a day of that week, drawn (md5 order) from
-- the plan's customers who signed up before the week and are still there. A loop, because each week's draw depends
-- on who the weeks before left standing. Weeks after company.data_as_of are drawn too: the list follows the weekly
-- facts to the year's end, and the 006 functions cut it at data_as_of.
do $$
declare
    r record;
begin
    for r in
        select m.week_start, m.plan_id, m.c_churn
        from g_mrr m
        where 1=1
            and m.c_churn > 0
        order by m.week_start, m.plan_id
    loop
        update g_cust c
        set churn_date = r.week_start + floor(7 * pg_temp.u('churn-day:' || c.customer_id))::int
        where 1=1
            and c.customer_id in (
                select x.customer_id
                from g_cust x
                where 1=1
                    and x.plan_id = r.plan_id
                    and x.churn_date is null
                    and x.signup_date < r.week_start
                    and not x.is_chain
                order by pg_temp.u('churn-pick:' || x.customer_id || ':' || r.week_start)
                limit r.c_churn
            );
    end loop;
end
$$;

-- Names: two word lists, paired through customer_id × a prime modulo the number of pairs, so no pair repeats while
-- there are fewer customers than pairs (78 × 80 = 6,240; dim_customer.name is unique, a repeat would stop the load).
-- Then a suffix by practice type. Every name is fictional.
insert into dim_customer (customer_id, name, practice_type, city, country, plan_id, channel_id, signup_date
                          , churn_date, sites)
with w as (
    select
         array['Alder','Amber','Aster','Birch','Bramble','Briar','Campion','Cedar','Clover','Coral','Dawn','Dune','Elder'
              ,'Elm','Ember','Fennel','Fern','Finch','Flint','Gorse','Hazel','Heron','Holly','Iris','Ivy','Jasper'
              ,'Juniper','Kestrel','Larch','Lark','Laurel','Linden','Lotus','Lupin','Mallow','Maple','Marigold','Mullein'
              ,'Moss','Myrtle','Nettle','Oak','Olive','Orchid','Osprey','Otter','Pebble','Peony','Pine','Plover','Plum'
              ,'Poppy','Quill','Quince','Reed','Redwing','Rowan','Saffron','Savory','Sorrel','Sparrow','Spruce','Starling'
              ,'Tansy','Teasel','Thistle','Thyme','Tulip','Umber','Verbena','Violet','Walnut','Willow','Wren','Yarrow'
              ,'Yew','Zinnia','Zephyr']                                                         w1
        ,array['Lane','Court','Yard','Square','Gate','Bridge','Quay','Wharf','Mill','Row','Bank','Field','Grove'
              ,'Corner','Terrace','Green','House','Loft','Rooms','Works','Hall','Arcade','Passage','Steps','Cross','Mews'
              ,'Walk','Path','Rise','View','Side','End','Well','Spring','Ford','Dock','Pier','Shore','Cove','Bay'
              ,'Harbour','Haven','Reach','Bend','Crest','Slope','Dale','Vale','Heath','Moor','Marsh','Mead','Croft'
              ,'Barn','Forge','Kiln','Tower','Gable','Porch','Hearth','Arch','Canal','Lock','Weir','Brook','Pond'
              ,'Meadow','Orchard','Garth','Close','Place','Avenue','Crescent','Parade','Wynd','Common','Acre'
              ,'Hollow','Landing','Market']                                                     w2
)
, city (n, city, country) as (   -- euro-area cities, the bigger markets listed more often
    select row_number() over (), v.city, v.country
    from (values
         ('Berlin', 'Germany'), ('Hamburg', 'Germany'), ('Munich', 'Germany'), ('Cologne', 'Germany')
        ,('Frankfurt', 'Germany'), ('Stuttgart', 'Germany'), ('Leipzig', 'Germany'), ('Bremen', 'Germany')
        ,('Hanover', 'Germany'), ('Nuremberg', 'Germany')
        ,('Amsterdam', 'Netherlands'), ('Rotterdam', 'Netherlands'), ('Utrecht', 'Netherlands')
        ,('Eindhoven', 'Netherlands'), ('Groningen', 'Netherlands'), ('The Hague', 'Netherlands')
        ,('Antwerp', 'Belgium'), ('Ghent', 'Belgium'), ('Brussels', 'Belgium')
        ,('Lyon', 'France'), ('Nantes', 'France'), ('Lille', 'France'), ('Bordeaux', 'France'), ('Toulouse', 'France')
        ,('Valencia', 'Spain'), ('Seville', 'Spain'), ('Bilbao', 'Spain'), ('Malaga', 'Spain')
        ,('Milan', 'Italy'), ('Turin', 'Italy'), ('Bologna', 'Italy')
        ,('Vienna', 'Austria'), ('Graz', 'Austria')
        ,('Dublin', 'Ireland'), ('Cork', 'Ireland')
        ,('Porto', 'Portugal'), ('Lisbon', 'Portugal')
        ,('Helsinki', 'Finland'), ('Tampere', 'Finland')
    ) v(city, country)
)
, t as (
    select
         c.*
        -- Clinic is mostly physio, Starter mostly beauty and fitness, Pro an even mix
        ,case
             when pg_temp.u('type:' || c.key) < case c.plan_id when 1 then 0.25 when 2 then 0.34 else 0.60 end
                 then 'Physiotherapy'
             when pg_temp.u('type:' || c.key) < case c.plan_id when 1 then 0.70 when 2 then 0.67 else 0.80 end
                 then 'Beauty'
             else 'Fitness'
         end                                                                                    practice_type
        ,(c.customer_id::bigint * 2659) % (cardinality(w.w1) * cardinality(w.w2))               m
        ,w.w1
        ,w.w2
    from g_cust c
    cross join w
)
select
     t.customer_id
    ,case
         when t.is_chain
             then 'Zwaluw Physio Group'
         else t.w1[1 + t.m % cardinality(t.w1)] || ' ' || t.w2[1 + t.m / cardinality(t.w1)] || ' '
              || (case t.practice_type
                      when 'Physiotherapy' then array['Physio', 'Physiotherapy', 'Physio Clinic', 'Rehab']
                      when 'Beauty'        then array['Beauty', 'Skin Studio', 'Salon', 'Beauty Rooms']
                      else                      array['Fitness', 'Pilates', 'Yoga Studio', 'Training Club']
                  end)[1 + floor(4 * pg_temp.u('suffix:' || t.key))::int]
     end
    ,case when t.is_chain then 'Physiotherapy' else t.practice_type end
    ,case when t.is_chain then 'Utrecht' else y.city end
    ,case when t.is_chain then 'Netherlands' else y.country end
    ,t.plan_id
    ,t.channel_id
    ,t.signup_date
    ,t.churn_date
    ,case
         when t.is_chain     then 12
         when t.plan_id = 3  then 1 + floor(5 * power(pg_temp.u('sites:' || t.key), 2))   -- 1 to 5, most have 1 or 2
         when t.plan_id = 2  then case when pg_temp.u('sites:' || t.key) < 0.15 then 2 else 1 end
         else 1
     end
from t
join city y on y.n = 1 + floor((select count(*) from city) * pg_temp.u('city:' || t.key))::int
order by t.customer_id;


-- ---------------------------------------------------------------- customer invoices

-- What each customer was charged, from its signup to company.data_as_of (nothing is issued after "today").
--   * Starter and Pro: a card charge on the signup day of every month while active, paid on the day. The list price
--     (Pro €99, €109 for signups from 31 Mar 2025 and for everyone from 30 Jun 2025), with a customer's own terms:
--     a quarter have 10 % off, 15 % pay for an add-on.
--   * Clinic: an invoice on each contract anniversary, net 30: 12 × (€150 + €68 per site), 4 % dearer a year, ±8 % by
--     customer. Paid the way g_ar_k pays the receivables (most by the due date, a tail up to six months late).
--   * The chain: €52,800 on 14 Sep 2026, due 14 Oct (W42), paid 9 Dec (W50), so unpaid and overdue on data_as_of.
insert into fact_customer_invoice (customer_id, invoice_date, due_date, paid_date, amount_eur, status)
with k as (
    select y.data_as_of from company y
)
, lag_k as (   -- weeks from invoice to payment, cumulative share
    select a.k, sum(a.paid) over (order by a.k) cum
    from g_ar_k a
    where 1=1
        and a.paid > 0
)
, i as (
    select
         c.customer_id
        ,d::date                                                                                invoice_date
        ,d::date                                                                                due_date
        ,d::date                                                                                paid_on
        ,case c.plan_id
             when 1 then 39
             else case when c.signup_date >= date '2025-03-31' or d >= date '2025-06-30' then 109 else 99 end
         end::numeric                                                                           list
        ,pg_temp.u('terms:' || c.customer_id)                                                   terms
        ,c.plan_id
    from dim_customer c
    cross join k
    cross join lateral generate_series(c.signup_date::timestamp
                                       , least(k.data_as_of, coalesce(c.churn_date - 1, k.data_as_of))::timestamp
                                       , interval '1 month') d
    where 1=1
        and c.plan_id in (1, 2)
)
, a as (
    select
         c.customer_id
        ,d::date                                                                                invoice_date
        ,d::date + 30                                                                           due_date
        ,case
             when c.name = 'Zwaluw Physio Group' and d::date = date '2026-09-14'
                 then date '2026-12-09'
             else d::date - 3 + floor(7 * pg_temp.u('pay-day:' || c.customer_id || ':' || d::date))::int
                  + 7 * coalesce(
                        (select min(l.k) from lag_k l where pg_temp.u('pay:' || c.customer_id || ':' || d::date) < l.cum)
                       ,18 + floor(8 * pg_temp.u('pay-late:' || c.customer_id || ':' || d::date))::int)
         end                                                                                    paid_on
        ,case
             when c.name = 'Zwaluw Physio Group'
                 then round(52800 / power(1.04, 2026 - extract(year from d)::int), -2)
             else round(12 * (150 + 68 * c.sites) * power(1.04, (d::date - date '2024-01-01') / 365.25)
                        * (0.92 + 0.16 * pg_temp.u('terms:' || c.customer_id)), -1)
         end                                                                                    amount
    from dim_customer c
    cross join k
    cross join lateral generate_series(c.signup_date::timestamp
                                       , least(k.data_as_of, coalesce(c.churn_date - 1, k.data_as_of))::timestamp
                                       , interval '1 year') d
    where 1=1
        and c.plan_id = 3
)
, u as (
    select
         i.customer_id, i.invoice_date, i.due_date, i.paid_on
        ,case
             when i.terms < 0.25 then round(i.list * 0.9, 2)
             when i.terms < 0.85 then i.list
             else i.list + case i.plan_id when 1 then 9 else 19 end
         end                                                                                    amount
    from i
    union all
    select a.customer_id, a.invoice_date, a.due_date, a.paid_on, a.amount
    from a
)
select
     u.customer_id
    ,u.invoice_date
    ,u.due_date
    ,case when u.paid_on <= k.data_as_of then u.paid_on end
    ,u.amount
    ,case
         when u.paid_on <= k.data_as_of then 'paid'
         when u.due_date < k.data_as_of then 'overdue'
         else 'open'
     end
from u
cross join k
order by u.customer_id, u.invoice_date;   -- in key order: the index packs and a customer's invoices sit together

analyze dim_customer, fact_customer_invoice;

drop table if exists pg_temp.g_week, pg_temp.g_channel, pg_temp.g_funnel, pg_temp.g_new, pg_temp.g_plan
    , pg_temp.g_plan_week, pg_temp.g_mrr, pg_temp.g_ar_k, pg_temp.g_ar_inv, pg_temp.g_ap_inv, pg_temp.g_cash
    , pg_temp.g_cust;
