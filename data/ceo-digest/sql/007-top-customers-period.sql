-- ceo_digest_demo: fn_top_customers_period — the top 1..25 customers over any period (2026-11-27).
-- The data chat's `top_clients` tool calls it when the visitor names a period ("top 3 clients by billing last quarter",
-- "top client this week", "top 7 between 2026-05-04 and 2026-06-20"), and the n8n email's `top_clients` scope reads the
-- same rows. The contract is docs/ceo-digest/chat-and-email.md § The SQL functions; change it there first.
--
-- Apply after 006, as postgres, in the Supabase SQL editor. Idempotent: drops and recreates the one function, takes
-- EXECUTE away from PUBLIC and grants it to the two readers, exactly as 006 does. Re-run it after any re-run of 006:
-- 006 does not drop this function, but its `revoke ... from public` / grants cover only what exists when it runs.
-- After the apply: MCP get_advisors(security) must come back with zero lints.
--
-- Rules (006's, plus):
--   * language sql, stable, security invoker, search_path pinned. No dynamic SQL: p_metric is only compared as a value.
--   * The period is clamped to [company.opening_cash_date, company.data_as_of] = [2024-01-01, 2026-11-15]; a null bound
--     means that end of the data. Days, not weeks: an invoice belongs to the period when its own date lies in it, so a
--     week, a month, a quarter or any custom range all work the same way. A backwards period returns no rows.
--   * p_metric picks the ranking, each over the period:
--         billed    invoiced in the period (invoice_date in it): the revenue billed, the default
--         paid      collected in the period (paid_date in it)
--         invoices  number of invoices issued in the period
--         overdue   past due and unpaid at the period's last day (due_date before it, not paid by it)
--     Any other p_metric returns nothing. Only customers with a value above zero are ranked.
--   * p_limit: 1 to 25, null = 10. Ties go to the larger billed amount, then the lower customer_id.
--   * Every row carries all four figures, the clamped period, the customer's share of all customers' p_metric in the
--     period (share_pct) and how many customers had any (ranked_customers), so "top 5 = x % of billing" needs no sum
--     by the caller beyond adding the shares it shows.
--   * status is as of the period's last day: churned when churn_date is on or before it.
--
-- Read-only check (run as postgres or either reader after the apply). Expected, data as loaded on 2026-11-16:
--   select t.rank, t.name, t.billed_eur, t.share_pct, t.ranked_customers, t.period_from, t.period_to
--   from ceo_digest_demo.fn_top_customers_period(date '2026-07-01', date '2026-09-30', 'billed', 3) t;
--   → 1 | Zwaluw Physio Group       | 52800.00 | 4.11 | 2607 | 2026-07-01 | 2026-09-30
--     2 | Tansy Bridge Salon        |  7010.00 | 0.55 | 2607 | …
--     3 | Birch Close Physio Clinic |  6970.00 | 0.54 | 2607 | …
--   Overdue at data_as_of ties to fn_customers_by_plan: 18 customers, 117,930.00, Zwaluw first (52,800.00, 44.77 %).
--   select count(*), sum(t.overdue_eur) from ceo_digest_demo.fn_top_customers_period(null, null, 'overdue', 25) t;
--   → 18 | 117930.00   (= select overdue_eur from ceo_digest_demo.fn_customers_by_plan(null) where plan_code = 'total')
--   select count(*) from ceo_digest_demo.fn_top_customers_period(null, null, 'billed', 500);     → 25 (the cap)
--   select count(*) from ceo_digest_demo.fn_top_customers_period(date '2027-01-01', null, 'billed', 5); → 0
--   select count(*) from ceo_digest_demo.fn_top_customers_period(null, null, 'tenure', 5);       → 0 (not a metric)

set search_path = ceo_digest_demo;

drop function if exists fn_top_customers_period(date, date, text, integer);

create function fn_top_customers_period(p_from date, p_to date, p_metric text, p_limit integer)
returns table (
     rank                integer
    ,customer_id         integer
    ,name                text
    ,practice_type       text
    ,city                text
    ,country             text
    ,plan_name           text
    ,signup_date         date
    ,status              text
    ,period_from         date
    ,period_to           date
    ,invoices            integer
    ,billed_eur          numeric(14,2)
    ,paid_eur            numeric(14,2)
    ,overdue_eur         numeric(14,2)
    ,share_pct           numeric(6,2)
    ,ranked_customers    integer
)
language sql stable security invoker
set search_path = ceo_digest_demo
as $$
    with p as (
        select
             greatest(coalesce(p_from, k.opening_cash_date), k.opening_cash_date)           _from
            ,least(coalesce(p_to, k.data_as_of), k.data_as_of)                              _to
            ,least(greatest(coalesce(p_limit, 10), 1), 25)                                  _limit
        from company k
    )
    , f as (
        select
             f.customer_id                                                                  _customer_id
            ,count(*) filter (where f.invoice_date >= p._from)                              _invoices
            ,coalesce(sum(f.amount_eur) filter (where f.invoice_date >= p._from), 0)        _billed
            ,coalesce(sum(f.amount_eur) filter (where f.paid_date between p._from and p._to), 0) _paid
            ,coalesce(sum(f.amount_eur) filter (where f.due_date < p._to
                                                  and (f.paid_date is null or f.paid_date > p._to)), 0) _overdue
        from fact_customer_invoice f
        cross join p
        where 1=1
            and p._from <= p._to
            and f.invoice_date <= p._to
            -- issued in the period, or still unpaid at its start (it may be paid in it, or overdue at its end)
            and (f.invoice_date >= p._from or f.paid_date is null or f.paid_date >= p._from)
        group by f.customer_id
    )
    , m as (
        select
             f.*
            ,case p_metric
                 when 'billed'   then f._billed
                 when 'paid'     then f._paid
                 when 'invoices' then f._invoices
                 when 'overdue'  then f._overdue
             end                                                                            _value
        from f
        where 1=1
            and p_metric in ('billed', 'paid', 'invoices', 'overdue')
    )
    , r as (
        select
             m.*
            ,row_number() over (order by m._value desc, m._billed desc, m._customer_id)     _rank
            ,count(*) over ()                                                               _ranked
            ,sum(m._value) over ()                                                          _total
        from m
        where 1=1
            and m._value > 0
    )
    select
         r._rank::int
        ,c.customer_id
        ,c.name
        ,c.practice_type
        ,c.city
        ,c.country
        ,d.name
        ,c.signup_date
        ,case when c.churn_date <= p._to then 'churned' else 'active' end
        ,p._from
        ,p._to
        ,r._invoices::int
        ,r._billed::numeric(14,2)
        ,r._paid::numeric(14,2)
        ,r._overdue::numeric(14,2)
        ,(100 * r._value / nullif(r._total, 0))::numeric(6,2)
        ,r._ranked::int
    from r
    cross join p
    join dim_customer c on c.customer_id = r._customer_id
    join dim_plan d on d.plan_id = c.plan_id
    where 1=1
        and r._rank <= p._limit
    order by r._rank;
$$;

-- ---------------------------------------------------------------- grants (as 006)

revoke execute on function fn_top_customers_period(date, date, text, integer) from public;

do $$
begin
    if exists (select 1 from pg_roles r where 1=1 and r.rolname = 'ceo_digest_reader') then
        grant execute on function ceo_digest_demo.fn_top_customers_period(date, date, text, integer) to ceo_digest_reader;
    end if;
    if exists (select 1 from pg_roles r where 1=1 and r.rolname = 'ceo_digest_n8n') then
        grant execute on function ceo_digest_demo.fn_top_customers_period(date, date, text, integer) to ceo_digest_n8n;
    end if;
end
$$;
