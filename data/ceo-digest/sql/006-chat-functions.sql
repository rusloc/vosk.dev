-- ceo_digest_demo functions — the closed set the data chat (the site, as ceo_digest_reader) and the "email me this"
-- workflow (n8n, as ceo_digest_n8n) both call. The contract is docs/ceo-digest/chat-and-email.md: names, arguments,
-- columns and their order are coded against on both sides; change them there first. Applied by postgres via MCP
-- execute_sql after 002–005. Idempotent: drops and recreates the eight functions and their one view.
--
-- Rules every function follows:
--   * language sql, stable, security invoker (the caller's grants decide, never postgres's), search_path pinned.
--   * No dynamic SQL. Text arguments are only ever compared as values, so any input is safe.
--   * A period is clamped to [company.opening_cash_date, company.data_as_of] = [2024-01-01, 2026-11-15]; a null bound
--     means that end of the data. A week belongs to a period when its Thursday (week_start + 3) lies in it, the ISO
--     rule dim_week.month_start uses. A period with no week in it (say, all of it after data_as_of) returns no rows.
--   * Money numeric(14,2), rates in percent numeric(6,2), months numeric(6,1), counts integer (impressions bigint).
--     A ratio with a zero denominator is null.
--   * Customers are seen as of data_as_of: later signups are left out, a later churn has not happened yet.

set search_path = ceo_digest_demo;

drop function if exists fn_meta();
drop function if exists fn_marketing_by_channel(date, date);
drop function if exists fn_marketing_by_week(date, date);
drop function if exists fn_cash_by_category(date, date);
drop function if exists fn_cash_by_week(date, date);
drop function if exists fn_customers_by_plan(date);
drop function if exists fn_customer_search(text, integer);
drop function if exists fn_top_customers(text, integer);
drop view if exists v_customer;

-- ---------------------------------------------------------------- what the data covers

create function fn_meta()
returns table (
     company      text
    ,currency     text
    ,data_from    date
    ,data_as_of   date
    ,weeks        integer
)
language sql stable security invoker
set search_path = ceo_digest_demo
as $$
    select
         k.name
        ,k.currency::text
        ,k.opening_cash_date
        ,k.data_as_of
        ,(
            select count(*)::int
            from dim_week w
            where 1=1
                and w.week_start + 3 between k.opening_cash_date and k.data_as_of
         )
    from company k;
$$;

-- ---------------------------------------------------------------- marketing

-- One row per channel and a 'total' row. cpc_eur and ctr_pct cover the channels that have clicks (paid search and
-- paid social): on the total row cpc_eur is their spend ÷ their clicks, not all spend. trial_to_paid_pct is trials
-- converted ÷ trials ended in the period (14-day trials; null for outbound, which has none). cac_eur = spend ÷ new
-- customers.
create function fn_marketing_by_channel(p_from date, p_to date)
returns table (
     channel_code       text
    ,channel_name       text
    ,weeks              integer
    ,spend_eur          numeric(14,2)
    ,impressions        bigint
    ,clicks             integer
    ,ctr_pct            numeric(6,2)
    ,cpc_eur            numeric(14,2)
    ,mqls               integer
    ,cost_per_mql_eur   numeric(14,2)
    ,trials_started     integer
    ,trials_converted   integer
    ,trial_to_paid_pct  numeric(6,2)
    ,new_customers      integer
    ,cac_eur            numeric(14,2)
    ,new_mrr_eur        numeric(14,2)
)
language sql stable security invoker
set search_path = ceo_digest_demo
as $$
    with p as (
        select
             greatest(coalesce(p_from, k.opening_cash_date), k.opening_cash_date)    _from
            ,least(coalesce(p_to, k.data_as_of), k.data_as_of)                       _to
        from company k
    )
    , a as (
        select
             grouping(c.channel_id)                                  _is_total
            ,c.code                                                  _code
            ,c.name                                                  _name
            ,c.sort                                                  _sort
            ,count(distinct f.week_start)                            _weeks
            ,sum(f.spend_eur)                                        _spend
            ,sum(f.spend_eur) filter (where f.clicks > 0)            _spend_clicked
            ,sum(f.impressions)                                      _impressions
            ,sum(f.clicks)                                           _clicks
            ,sum(f.mqls)                                             _mqls
            ,sum(f.trials_started)                                   _trials_started
            ,sum(f.trials_ended)                                     _trials_ended
            ,sum(f.trials_converted)                                 _trials_converted
            ,sum(f.new_customers)                                    _new_customers
            ,sum(f.new_mrr)                                          _new_mrr
        from fact_marketing_weekly f
        join p on f.week_start + 3 between p._from and p._to
        join dim_channel c on c.channel_id = f.channel_id
        group by grouping sets ((c.channel_id, c.code, c.name, c.sort), ())
        having count(*) > 0   -- the () set makes a row out of nothing: no weeks, no total
    )
    select
         case a._is_total when 1 then 'total' else a._code end
        ,case a._is_total when 1 then 'Total' else a._name end
        ,a._weeks::int
        ,a._spend::numeric(14,2)
        ,a._impressions::bigint
        ,a._clicks::int
        ,(100.0 * a._clicks / nullif(a._impressions, 0))::numeric(6,2)
        ,(a._spend_clicked / nullif(a._clicks, 0))::numeric(14,2)
        ,a._mqls::int
        ,(a._spend / nullif(a._mqls, 0))::numeric(14,2)
        ,a._trials_started::int
        ,a._trials_converted::int
        ,(100.0 * a._trials_converted / nullif(a._trials_ended, 0))::numeric(6,2)
        ,a._new_customers::int
        ,(a._spend / nullif(a._new_customers, 0))::numeric(14,2)
        ,a._new_mrr::numeric(14,2)
    from a
    order by a._is_total, a._sort;
$$;

-- One row per week, all channels together, against the plan. cpc_eur as above: ad spend ÷ clicks.
create function fn_marketing_by_week(p_from date, p_to date)
returns table (
     week_start     date
    ,week_label     text
    ,spend_eur      numeric(14,2)
    ,budget_eur     numeric(14,2)
    ,clicks         integer
    ,cpc_eur        numeric(14,2)
    ,mqls           integer
    ,mqls_target    integer
    ,new_customers  integer
    ,cac_eur        numeric(14,2)
)
language sql stable security invoker
set search_path = ceo_digest_demo
as $$
    with p as (
        select
             greatest(coalesce(p_from, k.opening_cash_date), k.opening_cash_date)    _from
            ,least(coalesce(p_to, k.data_as_of), k.data_as_of)                       _to
        from company k
    )
    , a as (
        select
             f.week_start                                            _week_start
            ,sum(f.spend_eur)                                        _spend
            ,sum(f.spend_eur) filter (where f.clicks > 0)            _spend_clicked
            ,sum(f.clicks)                                           _clicks
            ,sum(f.mqls)                                             _mqls
            ,sum(f.new_customers)                                    _new_customers
        from fact_marketing_weekly f
        join p on f.week_start + 3 between p._from and p._to
        group by f.week_start
    )
    select
         a._week_start
        ,w.week_label
        ,a._spend::numeric(14,2)
        ,t.marketing_budget::numeric(14,2)
        ,a._clicks::int
        ,(a._spend_clicked / nullif(a._clicks, 0))::numeric(14,2)
        ,a._mqls::int
        ,t.mqls_target
        ,a._new_customers::int
        ,(a._spend / nullif(a._new_customers, 0))::numeric(14,2)
    from a
    join dim_week w on w.week_start = a._week_start
    left join fact_target_weekly t on t.week_start = a._week_start
    order by a._week_start;
$$;

-- ---------------------------------------------------------------- cash

-- One row per cash category (all 11, a quiet one shows 0), then 'total_in', 'total_out' and 'net'. amount_eur is
-- signed (+ in, − out). share_pct is the category's share of its own direction's total. ly_amount_eur is the same
-- ISO weeks a year earlier (dim_week.ly_week_start), and null unless every week of the period has such a week (so
-- null for anything touching 2024). direction is 'in' or 'out', null on the net row; flow is null on the three totals.
create function fn_cash_by_category(p_from date, p_to date)
returns table (
     category_code  text
    ,category_name  text
    ,flow           text
    ,direction      text
    ,amount_eur     numeric(14,2)
    ,share_pct      numeric(6,2)
    ,ly_amount_eur  numeric(14,2)
)
language sql stable security invoker
set search_path = ceo_digest_demo
as $$
    with p as (
        select
             greatest(coalesce(p_from, k.opening_cash_date), k.opening_cash_date)    _from
            ,least(coalesce(p_to, k.data_as_of), k.data_as_of)                       _to
        from company k
    )
    , a as (
        select
             g.code                                                              _code
            ,g.name                                                              _name
            ,g.flow                                                              _flow
            ,g.direction                                                         _direction
            ,g.sort                                                              _sort
            ,sum(f.amount_eur)                                                   _amount
            ,case when count(l.week_start) = count(*) then sum(l.amount_eur) end _ly
        from dim_week w
        join p on w.week_start + 3 between p._from and p._to
        join fact_cash_weekly f on f.week_start = w.week_start
        join dim_cash_category g on g.cash_category_id = f.cash_category_id
        left join fact_cash_weekly l on l.week_start = w.ly_week_start and l.cash_category_id = f.cash_category_id
        group by g.code, g.name, g.flow, g.direction, g.sort
    )
    , r as (
        select
             a._code, a._name, a._flow
            ,case a._direction when 1 then 'in' else 'out' end                   _direction
            ,a._amount
            ,100.0 * a._amount / nullif(sum(a._amount) over (partition by a._direction), 0) _share
            ,a._ly
            ,a._sort                                                             _sort
        from a
        union all
        select
             case a._direction when 1 then 'total_in' else 'total_out' end
            ,case a._direction when 1 then 'Total in' else 'Total out' end
            ,null
            ,case a._direction when 1 then 'in' else 'out' end
            ,sum(a._amount)
            ,100.0
            ,sum(a._ly)
            ,case a._direction when 1 then 101 else 102 end
        from a
        group by a._direction
        union all
        select 'net', 'Net cash flow', null, null, sum(a._amount), null, sum(a._ly), 103
        from a
        having count(*) > 0
    )
    select
         r._code
        ,r._name
        ,r._flow
        ,r._direction
        ,r._amount::numeric(14,2)
        ,r._share::numeric(6,2)
        ,r._ly::numeric(14,2)
    from r
    order by r._sort;
$$;

-- One row per week. cash_in_eur and cash_out_eur are both positive, net_eur = in − out. closing_cash_eur is the bank
-- balance at the week's close; runway_months is that ÷ the average monthly net burn of the last 13 weeks (null when
-- those weeks made cash). Receivables and payables are the week-close snapshots (v_week_working_capital).
create function fn_cash_by_week(p_from date, p_to date)
returns table (
     week_start               date
    ,week_label               text
    ,cash_in_eur              numeric(14,2)
    ,cash_out_eur             numeric(14,2)
    ,net_eur                  numeric(14,2)
    ,closing_cash_eur         numeric(14,2)
    ,runway_months            numeric(6,1)
    ,receivables_eur          numeric(14,2)
    ,overdue_receivables_eur  numeric(14,2)
    ,payables_due_14d_eur     numeric(14,2)
)
language sql stable security invoker
set search_path = ceo_digest_demo
as $$
    with p as (
        select
             greatest(coalesce(p_from, k.opening_cash_date), k.opening_cash_date)    _from
            ,least(coalesce(p_to, k.data_as_of), k.data_as_of)                       _to
        from company k
    )
    select
         w.week_start
        ,w.week_label
        ,c._inflow::numeric(14,2)
        ,(-c._outflow)::numeric(14,2)
        ,c._net::numeric(14,2)
        ,c._closing::numeric(14,2)
        ,c._runway_months::numeric(6,1)
        ,k._ar_total::numeric(14,2)
        ,k._ar_overdue::numeric(14,2)
        ,k._ap_due_14d::numeric(14,2)
    from dim_week w
    join p on w.week_start + 3 between p._from and p._to
    join v_week_cash c on c._week_start = w.week_start
    left join v_week_working_capital k on k._week_start = w.week_start
    order by w.week_start;
$$;

-- ---------------------------------------------------------------- customers

-- One row per customer known on data_as_of, with its invoices rolled up: what search and top both return.
-- Tenure runs from signup to churn, or to data_as_of for an active customer, in months of 30.4375 days.
create view v_customer with (security_invoker = on) as
select
     c.customer_id                                                           _customer_id
    ,c.name                                                                  _name
    ,c.practice_type                                                         _practice_type
    ,c.city                                                                  _city
    ,c.country                                                               _country
    ,p.name                                                                  _plan_name
    ,h.name                                                                  _channel_name
    ,c.signup_date                                                           _signup_date
    ,x._churn_date                                                           _churn_date
    ,case when x._churn_date is null then 'active' else 'churned' end        _status
    ,round((coalesce(x._churn_date, k.data_as_of) - c.signup_date) / 30.4375, 1) _tenure_months
    ,coalesce(i._invoices, 0)                                                _invoices
    ,coalesce(i._billed, 0)                                                  _billed_to_date
    ,i._last_invoice_date                                                    _last_invoice_date
    ,coalesce(i._overdue, 0)                                                 _overdue
from dim_customer c
cross join company k
join dim_plan p on p.plan_id = c.plan_id
join dim_channel h on h.channel_id = c.channel_id
cross join lateral (
    select case when c.churn_date <= k.data_as_of then c.churn_date end      _churn_date
) x
left join (
    select
         f.customer_id                                                       _customer_id
        ,count(*)::int                                                       _invoices
        ,sum(f.amount_eur)                                                   _billed
        ,max(f.invoice_date)                                                 _last_invoice_date
        ,sum(f.amount_eur) filter (where f.status = 'overdue')               _overdue
    from fact_customer_invoice f
    group by f.customer_id
) i on i._customer_id = c.customer_id
where 1=1
    and c.signup_date <= k.data_as_of;

-- One row per plan and a 'total' row, as of p_as_of (clamped like a period; null = data_as_of). Active = signed up
-- by that day and not churned by it; on a Sunday that is fact_mrr_weekly.customers_close. new / churned_last_4w: the
-- 28 days ending that day. Invoices and billed: the 12 months ending that day. overdue_eur: invoices past due and
-- unpaid on that day. avg_tenure_months: active customers only.
create function fn_customers_by_plan(p_as_of date)
returns table (
     plan_code             text
    ,plan_name             text
    ,active_customers      integer
    ,new_last_4w           integer
    ,churned_last_4w       integer
    ,avg_tenure_months     numeric(6,1)
    ,invoices_last_12m     integer
    ,billed_last_12m_eur   numeric(14,2)
    ,overdue_eur           numeric(14,2)
)
language sql stable security invoker
set search_path = ceo_digest_demo
as $$
    with p as (
        select
             least(greatest(coalesce(p_as_of, k.data_as_of), k.opening_cash_date), k.data_as_of) _as_of
        from company k
    )
    , c as (
        select
             c.plan_id                                                                           _plan_id
            ,count(*) filter (where c.churn_date is null or c.churn_date > p._as_of)             _active
            ,count(*) filter (where c.signup_date > p._as_of - 28)                               _new_4w
            ,count(*) filter (where c.churn_date > p._as_of - 28 and c.churn_date <= p._as_of)   _churned_4w
            ,sum(p._as_of - c.signup_date)
                 filter (where c.churn_date is null or c.churn_date > p._as_of)                  _tenure_days
        from dim_customer c
        cross join p
        where 1=1
            and c.signup_date <= p._as_of
        group by c.plan_id
    )
    , i as (
        select
             c.plan_id                                                                           _plan_id
            ,count(*) filter (where f.invoice_date > (p._as_of - interval '1 year')::date)       _invoices_12m
            ,sum(f.amount_eur) filter (where f.invoice_date > (p._as_of - interval '1 year')::date) _billed_12m
            ,sum(f.amount_eur) filter (where f.due_date < p._as_of
                                         and (f.paid_date is null or f.paid_date > p._as_of))    _overdue
        from fact_customer_invoice f
        cross join p
        join dim_customer c on c.customer_id = f.customer_id
        where 1=1
            and f.invoice_date <= p._as_of
        group by c.plan_id
    )
    , r as (
        select
             grouping(d.plan_id)                 _is_total
            ,d.code                              _code
            ,d.name                              _name
            ,d.sort                              _sort
            ,sum(c._active)                      _active
            ,sum(c._new_4w)                      _new_4w
            ,sum(c._churned_4w)                  _churned_4w
            ,sum(c._tenure_days)                 _tenure_days
            ,sum(i._invoices_12m)                _invoices_12m
            ,sum(i._billed_12m)                  _billed_12m
            ,sum(i._overdue)                     _overdue
        from dim_plan d
        left join c on c._plan_id = d.plan_id
        left join i on i._plan_id = d.plan_id
        group by grouping sets ((d.plan_id, d.code, d.name, d.sort), ())
    )
    select
         case r._is_total when 1 then 'total' else r._code end
        ,case r._is_total when 1 then 'Total' else r._name end
        ,coalesce(r._active, 0)::int
        ,coalesce(r._new_4w, 0)::int
        ,coalesce(r._churned_4w, 0)::int
        ,(r._tenure_days / nullif(r._active, 0) / 30.4375)::numeric(6,1)
        ,coalesce(r._invoices_12m, 0)::int
        ,coalesce(r._billed_12m, 0)::numeric(14,2)
        ,coalesce(r._overdue, 0)::numeric(14,2)
    from r
    order by r._is_total, r._sort;
$$;

-- Customers whose name, city or practice type contains p_query, case-insensitive. A plain substring test (strpos),
-- not a pattern: % and _ mean themselves. A blank query returns nothing (fn_top_customers lists). Active customers
-- first, then the most billed. p_limit: 1 to 20, null = 10.
create function fn_customer_search(p_query text, p_limit integer)
returns table (
     customer_id         integer
    ,name                text
    ,practice_type       text
    ,city                text
    ,country             text
    ,plan_name           text
    ,channel_name        text
    ,signup_date         date
    ,churn_date          date
    ,status              text
    ,tenure_months       numeric(6,1)
    ,invoices            integer
    ,billed_to_date_eur  numeric(14,2)
    ,last_invoice_date   date
    ,overdue_eur         numeric(14,2)
)
language sql stable security invoker
set search_path = ceo_digest_demo
as $$
    select
         v._customer_id
        ,v._name
        ,v._practice_type
        ,v._city
        ,v._country
        ,v._plan_name
        ,v._channel_name
        ,v._signup_date
        ,v._churn_date
        ,v._status
        ,v._tenure_months::numeric(6,1)
        ,v._invoices
        ,v._billed_to_date::numeric(14,2)
        ,v._last_invoice_date
        ,v._overdue::numeric(14,2)
    from v_customer v
    where 1=1
        and btrim(coalesce(p_query, '')) <> ''
        and (
               strpos(lower(v._name), lower(btrim(p_query))) > 0
            or strpos(lower(v._city), lower(btrim(p_query))) > 0
            or strpos(lower(v._practice_type), lower(btrim(p_query))) > 0
        )
    order by v._status, v._billed_to_date desc, v._customer_id
    limit least(greatest(coalesce(p_limit, 10), 1), 20);
$$;

-- The top customers by p_order, as of data_as_of:
--   billed   most billed to date            invoices  most invoices
--   overdue  largest overdue amount (only customers who have one)
--   tenure   longest-standing, active only  newest    latest signups
-- Any other p_order returns nothing. p_limit: 1 to 20, null = 10.
create function fn_top_customers(p_order text, p_limit integer)
returns table (
     customer_id         integer
    ,name                text
    ,practice_type       text
    ,city                text
    ,country             text
    ,plan_name           text
    ,channel_name        text
    ,signup_date         date
    ,churn_date          date
    ,status              text
    ,tenure_months       numeric(6,1)
    ,invoices            integer
    ,billed_to_date_eur  numeric(14,2)
    ,last_invoice_date   date
    ,overdue_eur         numeric(14,2)
)
language sql stable security invoker
set search_path = ceo_digest_demo
as $$
    select
         v._customer_id
        ,v._name
        ,v._practice_type
        ,v._city
        ,v._country
        ,v._plan_name
        ,v._channel_name
        ,v._signup_date
        ,v._churn_date
        ,v._status
        ,v._tenure_months::numeric(6,1)
        ,v._invoices
        ,v._billed_to_date::numeric(14,2)
        ,v._last_invoice_date
        ,v._overdue::numeric(14,2)
    from v_customer v
    where 1=1
        and p_order in ('billed', 'tenure', 'invoices', 'overdue', 'newest')
        and (p_order <> 'overdue' or v._overdue > 0)
        and (p_order <> 'tenure' or v._status = 'active')
    order by
         case p_order
             when 'billed'   then v._billed_to_date
             when 'tenure'   then v._tenure_months
             when 'invoices' then v._invoices
             when 'overdue'  then v._overdue
             when 'newest'   then v._signup_date - date '2000-01-01'
         end desc
        ,v._customer_id
    limit least(greatest(coalesce(p_limit, 10), 1), 20);
$$;

-- ---------------------------------------------------------------- grants

-- Postgres gives EXECUTE on a new function to PUBLIC, and default privileges set per schema cannot take that away
-- (only a database-wide default could, and that would reach qbo's functions). So it is revoked here, by name of the
-- schema, on every run; 001's default privileges then grant EXECUTE to the two readers. The explicit grants below
-- cover a database where 001 ran before this file existed. v_customer gets SELECT from 001's default privileges.
revoke execute on all functions in schema ceo_digest_demo from public;

do $$
begin
    if exists (select 1 from pg_roles r where 1=1 and r.rolname = 'ceo_digest_reader') then
        grant execute on all functions in schema ceo_digest_demo to ceo_digest_reader;
    end if;
    if exists (select 1 from pg_roles r where 1=1 and r.rolname = 'ceo_digest_n8n') then
        grant execute on all functions in schema ceo_digest_demo to ceo_digest_n8n;
    end if;
end
$$;
