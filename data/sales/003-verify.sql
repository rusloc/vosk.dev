-- Verification — run after 001 and 002.
--
-- Two jobs: prove the load worked, and prove the numbers are the ones the write-up claims.
-- A seed that loads cleanly but plants no story is still a broken demo.
--
-- Plain SQL, no psql meta-commands: the apply path here is the Supabase MCP `execute_sql`,
-- which returns only the LAST statement's rows — run the four blocks one at a time.
--
-- Reference values, 2026-09-21 build. Fingerprint b7e0006d6eeff87791ee0a70ed17e371.
--   65,117 lines · 37,524 orders · 11,389 customers · 60 products · 6 channels · 14 MB
--   completed revenue 4,766,371.12

-- ---------------------------------------------------------------------------
-- 1. Integrity — every row must read 0, and the fingerprint must not move
-- ---------------------------------------------------------------------------

select
     'net_identity_violations'                                          _check
    ,count(*)::text                                                     _value
    ,'0'                                                                _expected
from demo_sales.fact_order_line f
where 1=1
    and f.net_amount <> f.quantity * f.unit_price - f.discount_amount
union all
select
     'customers_without_exactly_one_first_order'
    ,count(*)::text
    ,'0'
from (
    select
         f.customer_key                                                 _customer_key
    from demo_sales.fact_order_line f
    where 1=1
    group by f.customer_key
    having count(distinct f.order_id) filter (where f.is_first_order) <> 1
) x
union all
select
     'first_order_date_mismatches'
    ,count(*)::text
    ,'0'
from demo_sales.dim_customer c
join (
    select
         f.customer_key                                                 _customer_key
        ,(min(f.ordered_at) at time zone 'UTC')::date                   _first
    from demo_sales.fact_order_line f
    where 1=1
    group by f.customer_key
) m
    on m._customer_key = c.customer_key
where 1=1
    and m._first <> c.first_order_date
union all
select
     'customers_with_no_lines'
    ,count(*)::text
    ,'0'
from demo_sales.dim_customer c
where 1=1
    and not exists (
        select 1
        from demo_sales.fact_order_line f
        where 1=1
            and f.customer_key = c.customer_key
    )
union all
-- Status, channel and customer are ORDER-level facts stored at line grain. If they ever
-- disagree within an order, count(distinct order_id) stops being additive across them and
-- the dashboard's filter design (docs/08 §7) is quietly wrong.
select
     'orders_mixing_status_channel_or_customer'
    ,count(*)::text
    ,'0'
from (
    select
         f.order_id                                                     _order_id
    from demo_sales.fact_order_line f
    where 1=1
    group by f.order_id
    having count(distinct f.order_status) > 1
        or count(distinct f.channel_key) > 1
        or count(distinct f.customer_key) > 1
) y
union all
-- Re-run the whole pipeline and compare. A changed checksum means something in the
-- generator stopped being deterministic.
select
     'fingerprint'
    ,md5(string_agg(
         f.order_id || ':' || f.line_number || ':' || f.product_key || ':' || f.net_amount
        ,'|' order by f.order_id, f.line_number))
    ,'b7e0006d6eeff87791ee0a70ed17e371'
from demo_sales.fact_order_line f
where 1=1;

-- ---------------------------------------------------------------------------
-- 2. Headline KPIs by year — expect ~1.35M / ~1.90M / ~1.52M (8 months), AOV 133 → 148,
--    margin ~48%, return rate easing 6.1 → 5.3 as paid social's share shrinks
-- ---------------------------------------------------------------------------

select
     extract(year from f.ordered_at at time zone 'UTC')::int                                     _year
    ,count(distinct f.order_id)                                                                   _orders_all
    ,count(distinct f.order_id) filter (where f.order_status = 'completed')                       _orders_completed
    ,round(sum(f.net_amount) filter (where f.order_status = 'completed'), 0)                      _revenue
    ,round(sum(f.net_amount) filter (where f.order_status = 'completed')
         / count(distinct f.order_id) filter (where f.order_status = 'completed'), 2)             _aov
    ,round(100 * sum(f.net_amount - f.cost_amount) filter (where f.order_status = 'completed')
         / sum(f.net_amount) filter (where f.order_status = 'completed'), 1)                      _margin_pct
    ,round(100.0 * count(distinct f.order_id) filter (where f.order_status = 'returned')
         / count(distinct f.order_id), 1)                                                         _return_rate_pct
    ,round(100.0 * count(distinct f.order_id) filter (where f.is_first_order)
         / count(distinct f.order_id), 1)                                                         _new_customer_order_pct
from demo_sales.fact_order_line f
where 1=1
group by 1
order by 1;

-- ---------------------------------------------------------------------------
-- 3. Story beats — the months worth pointing at. If these read flat, 002 did not apply them.
--    Beat 1: paid-search orders 2025-05 → 06 → 07 → 08 should read ~302 → 99 → 92 → 304.
--    Beat 2: hero units by week should hit 0 for the weeks of 2025-11-24 and 2025-12-01.
-- ---------------------------------------------------------------------------

select
     'beat1_paid_search_orders'                                              _series
    ,to_char(f.ordered_at at time zone 'UTC', 'YYYY-MM')                     _period
    ,count(distinct f.order_id) filter (where f.channel_key = 2)             _value
    ,count(distinct f.order_id)                                              _all_orders
from demo_sales.fact_order_line f
where 1=1
    and f.ordered_at >= timestamptz '2025-04-01 00:00+00'
    and f.ordered_at <  timestamptz '2025-10-01 00:00+00'
group by 2
union all
select
     'beat2_hero_units_by_week'
    ,to_char(date_trunc('week', f.ordered_at at time zone 'UTC'), 'YYYY-MM-DD')
    ,coalesce(sum(f.quantity) filter (where f.product_key = 1), 0)
    ,count(distinct f.order_id)
from demo_sales.fact_order_line f
where 1=1
    and f.ordered_at >= timestamptz '2025-11-03 00:00+00'
    and f.ordered_at <  timestamptz '2025-12-29 00:00+00'
group by 2
order by 1, 2;

-- ---------------------------------------------------------------------------
-- 4. Channel drift — email should rise (~11.9% → ~16.0%), paid search fall (~27.7% → ~21.5%)
-- ---------------------------------------------------------------------------

select
     c.channel_name                                                          _channel
    ,case
         when f.ordered_at < timestamptz '2025-05-01 00:00+00'
             then 'first_half'
         else 'second_half'
     end                                                                     _period
    ,round(100.0 * count(distinct f.order_id)
         / sum(count(distinct f.order_id)) over (
               partition by case
                                when f.ordered_at < timestamptz '2025-05-01 00:00+00'
                                    then 'first_half'
                                else 'second_half'
                            end), 1)                                         _share_pct
from demo_sales.fact_order_line f
join demo_sales.dim_channel c
    on c.channel_key = f.channel_key
where 1=1
group by 1, 2
order by 1, 2;
