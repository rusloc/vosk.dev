-- ceo_digest_demo checks — run after a load (002 → 006), as postgres or either reader. Read-only. Every query returns
-- one row; the expected values are in its comment. The customer list must agree with the weekly facts exactly.

set search_path = ceo_digest_demo;

-- 1. The weekly KPI figures did not move. Expected: c9d5a2d36a011ac84e733e36cd8ceb75
select
     md5(string_agg(_week_start::text || _kpi_code || coalesce(round(_value, 6)::text, '') || _flag::text, ','
                    order by _week_start, _kpi_code))                    _kpi_signature
from v_kpi_weekly;

-- 2. Row counts. Expected: 5,271 customers (2,015 before 2024, 184 after data_as_of), 105,373 invoices
--    (105,291 paid, 64 open, 18 overdue), 5,271 distinct names.
select
     (select count(*) from dim_customer)                                             _customers
    ,(select count(*) from dim_customer c where 1=1 and c.signup_date < date '2024-01-01')   _opening_base
    ,(select count(*) from dim_customer c cross join company k where 1=1 and c.signup_date > k.data_as_of) _after_as_of
    ,(select count(*) from fact_customer_invoice)                                    _invoices
    ,(select count(*) from fact_customer_invoice f where 1=1 and f.status = 'paid')    _paid
    ,(select count(*) from fact_customer_invoice f where 1=1 and f.status = 'open')    _open
    ,(select count(*) from fact_customer_invoice f where 1=1 and f.status = 'overdue') _overdue
    ,(select count(distinct c.name) from dim_customer c)                             _names;

-- 3. New customers per week × plan = fact_mrr_weekly.customers_new. Expected: 0 mismatches of 471, 0 orphans.
select
     count(*) filter (where coalesce(c._n, 0) <> f.customers_new)        _mismatches
    ,count(*)                                                            _compared
    ,(
        select count(*)
        from dim_customer x
        where 1=1
            and x.signup_date >= date '2024-01-01'
            and not exists (select 1 from fact_mrr_weekly m
                            where 1=1 and m.week_start = date_trunc('week', x.signup_date)::date and m.plan_id = x.plan_id)
     )                                                                   _orphans
from fact_mrr_weekly f
left join (
    select date_trunc('week', c.signup_date)::date _week_start, c.plan_id _plan_id, count(*) _n
    from dim_customer c
    where 1=1
        and c.signup_date >= date '2024-01-01'
    group by 1, 2
) c on c._week_start = f.week_start and c._plan_id = f.plan_id;

-- 4. New customers per week × channel = fact_marketing_weekly.new_customers. Expected: 0 mismatches of 785.
select
     count(*) filter (where coalesce(c._n, 0) <> f.new_customers)        _mismatches
    ,count(*)                                                            _compared
from fact_marketing_weekly f
left join (
    select date_trunc('week', c.signup_date)::date _week_start, c.channel_id _channel_id, count(*) _n
    from dim_customer c
    where 1=1
        and c.signup_date >= date '2024-01-01'
    group by 1, 2
) c on c._week_start = f.week_start and c._channel_id = f.channel_id;

-- 5. Churned per week × plan = fact_mrr_weekly.customers_churned. Expected: 0 mismatches of 471, nobody churned
--    before 2024.
select
     count(*) filter (where coalesce(c._n, 0) <> f.customers_churned)    _mismatches
    ,count(*)                                                            _compared
    ,(select count(*) from dim_customer x where 1=1 and x.churn_date < date '2024-01-01') _churned_before_2024
from fact_mrr_weekly f
left join (
    select date_trunc('week', c.churn_date)::date _week_start, c.plan_id _plan_id, count(*) _n
    from dim_customer c
    where 1=1
        and c.churn_date is not null
    group by 1, 2
) c on c._week_start = f.week_start and c._plan_id = f.plan_id;

-- 6. Active per plan at every week's open (Monday morning; the first one is the opening base, 920 / 760 / 335) and
--    close (Sunday night) = customers_open and customers_close. Expected: 0 and 0 mismatches of 471.
select
     count(*) filter (where a._n_open <> f.customers_open)               _open_mismatches
    ,count(*) filter (where a._n_close <> f.customers_close)             _close_mismatches
    ,count(*)                                                            _compared
from fact_mrr_weekly f
cross join lateral (
    select
         count(*) filter (where c.signup_date < f.week_start
                            and (c.churn_date is null or c.churn_date >= f.week_start))        _n_open
        ,count(*) filter (where c.signup_date <= f.week_start + 6
                            and (c.churn_date is null or c.churn_date > f.week_start + 6))     _n_close
    from dim_customer c
    where 1=1
        and c.plan_id = f.plan_id
) a;

-- 7. Invoices keep to their rules. Expected: seven zeros.
--    Nothing after data_as_of, before the signup or from the churn day on; the status matches the dates; a card
--    customer is charged on its signup day and then with no gap over 31 days; a Clinic customer has one invoice per
--    contract year.
select
     (select count(*) from fact_customer_invoice f cross join company k where 1=1 and f.invoice_date > k.data_as_of) _after_as_of
    ,(select count(*) from fact_customer_invoice f join dim_customer c on c.customer_id = f.customer_id
      where 1=1 and (f.invoice_date < c.signup_date or f.invoice_date >= c.churn_date))               _outside_life
    ,(select count(*) from fact_customer_invoice f cross join company k
      where 1=1 and f.status <> case when f.paid_date is not null then 'paid'
                                     when f.due_date < k.data_as_of then 'overdue' else 'open' end)   _bad_status
    ,(select count(*) from fact_customer_invoice f join dim_customer c on c.customer_id = f.customer_id
      where 1=1 and c.plan_id in (1, 2) and f.status <> 'paid')                                       _unpaid_card
    ,(select count(*) from (
          select f.customer_id, f.invoice_date - lag(f.invoice_date) over (partition by f.customer_id order by f.invoice_date) _gap
          from fact_customer_invoice f join dim_customer c on c.customer_id = f.customer_id
          where 1=1 and c.plan_id in (1, 2)) g
      where 1=1 and g._gap > 31)                                                                      _card_gaps
    ,(select count(*) from dim_customer c cross join company k
      where 1=1 and c.signup_date <= k.data_as_of
          and not exists (select 1 from fact_customer_invoice f
                          where 1=1 and f.customer_id = c.customer_id and f.invoice_date = c.signup_date)) _no_first_invoice
    ,(select count(*) from (
          select c.customer_id
          from dim_customer c
          cross join company k
          left join fact_customer_invoice f on f.customer_id = c.customer_id
          where 1=1 and c.plan_id = 3 and c.signup_date <= k.data_as_of
          group by c.customer_id, c.signup_date, c.churn_date, k.data_as_of
          having count(f.*) <> extract(year from age(least(coalesce(c.churn_date - 1, k.data_as_of), k.data_as_of)
                                                     , c.signup_date)) + 1) x)                        _clinic_bad_count;

-- 8. The physio chain. Expected: customer 1075, Zwaluw Physio Group, Utrecht, 12 sites, active; 5 invoices,
--    €244,400 billed; €52,800 of 2026-09-14 due 2026-10-14, overdue.
select
     c.customer_id, c.name, c.city, c.sites, c.churn_date
    ,count(*)                                                            _invoices
    ,sum(f.amount_eur)                                                   _billed
    ,sum(f.amount_eur) filter (where f.status = 'overdue')               _overdue
    ,max(f.due_date) filter (where f.status = 'overdue')                 _overdue_due_date
from dim_customer c
join fact_customer_invoice f on f.customer_id = c.customer_id
where 1=1
    and c.name = 'Zwaluw Physio Group'
group by c.customer_id, c.name, c.city, c.sites, c.churn_date;

-- 9. Clicks. Expected: paid search CPC within €2.50–4.00 and paid social within €0.90–1.60 every week (0 outside of
--    314), 471 rows of the other channels all 0.
select
     count(*) filter (where c.code = 'paid_search' and f.spend_eur / nullif(f.clicks, 0) not between 2.5 and 4.0)
     + count(*) filter (where c.code = 'paid_social' and f.spend_eur / nullif(f.clicks, 0) not between 0.9 and 1.6)
                                                                         _cpc_outside
    ,count(*) filter (where c.code in ('paid_search', 'paid_social') and f.clicks > 0) _ad_weeks
    ,count(*) filter (where c.code not in ('paid_search', 'paid_social') and f.clicks = 0 and f.impressions = 0) _zero_rows
from fact_marketing_weekly f
join dim_channel c on c.channel_id = f.channel_id;

-- 10. The functions agree with the facts. Expected: fn_customers_by_plan on W46's Sunday = customers_close
--     (894 / 1,418 / 719, total 3,031), 0 mismatches; 150 weeks; the three totals tie (true, true).
select
     (select count(*)
      from fn_customers_by_plan(date '2026-11-15') x
      join dim_plan p on p.code = x.plan_code
      join fact_mrr_weekly f on f.plan_id = p.plan_id and f.week_start = date '2026-11-09'
      where 1=1 and x.active_customers <> f.customers_close)                                         _plan_mismatches
    ,(select x.active_customers from fn_customers_by_plan(date '2026-11-15') x where 1=1 and x.plan_code = 'total') _active
    ,(select m.weeks from fn_meta() m)                                                               _weeks
    ,(select sum(w.spend_eur) from fn_marketing_by_week(date '2025-01-01', date '2025-12-31') w)
     = (select c.spend_eur from fn_marketing_by_channel(date '2025-01-01', date '2025-12-31') c where 1=1 and c.channel_code = 'total')
                                                                                                      _marketing_ties
    ,(select sum(w.net_eur) from fn_cash_by_week(date '2025-01-01', date '2025-12-31') w)
     = (select c.amount_eur from fn_cash_by_category(date '2025-01-01', date '2025-12-31') c where 1=1 and c.category_code = 'net')
                                                                                                      _cash_ties;

-- 11. Signature of the new objects (customers, invoices, clicks). Expected: see docs/ceo-digest/README.md.
select
     md5(
         (select string_agg(c::text, '|' order by c.customer_id) from dim_customer c)
         || (select string_agg(f::text, '|' order by f.customer_id, f.invoice_date) from fact_customer_invoice f)
         || (select string_agg(m.week_start::text || m.channel_id || ':' || m.impressions || ':' || m.clicks, '|'
                               order by m.week_start, m.channel_id) from fact_marketing_weekly m)
     )                                                                   _customer_signature;
