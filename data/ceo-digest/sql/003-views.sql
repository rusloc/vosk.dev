-- ceo_digest_demo views — the KPI build. Every number in the CEO email comes from here; n8n only picks the week and
-- formats, and the LLM writes commentary from these rows, never computes. Drop-and-rebuild, applied via MCP
-- execute_sql by postgres after 002. security_invoker: a view reads with its caller's grants, never postgres's.
--
-- What n8n reads for the week that just closed (:w = last Monday − 7):
--   v_kpi_weekly        where _week_start = :w   → the KPI tiles, flags first
--   v_sales_breakdown   where _week_start = :w   → channel / region / category tables, top movers
--   v_cash_by_category  where _week_start = :w   → where cash went, actual vs forecast
--   v_cash_outlook      where _issued_week = :w + 7 → the 13-week cash line and its low point

set search_path = ceo_digest_demo;

drop view if exists
     v_kpi_weekly, v_sales_breakdown, v_cash_by_category, v_cash_outlook
    ,v_week_pipeline, v_week_working_capital, v_week_cash, v_week_sales
cascade;

-- ---------------------------------------------------------------- sales, one row per week

create view v_week_sales with (security_invoker = on) as
with s as (
    select
         f.week_start                                              _week_start
        ,sum(f.gross_sales)                                        _gross_sales
        ,sum(f.discounts)                                          _discounts
        ,sum(f.returns)                                            _returns
        ,sum(f.net_sales)                                          _net_sales
        ,sum(f.cogs)                                               _cogs
        ,sum(f.units)                                              _units
        ,sum(f.net_sales) filter (where c.code = 'online')         _net_sales_online
    from fact_sales_weekly f
    join dim_channel c on c.channel_id = f.channel_id
    group by f.week_start
)
, o as (
    select
         f.week_start                                              _week_start
        ,sum(f.orders)                                             _orders
        ,sum(f.new_customers)                                      _new_customers
        ,sum(f.orders) filter (where c.code = 'online')            _orders_online
    from fact_orders_weekly f
    join dim_channel c on c.channel_id = f.channel_id
    group by f.week_start
)
, t as (
    select
         f.week_start                                              _week_start
        ,sum(f.net_sales_target)                                   _net_sales_target
        ,sum(f.gross_margin_target)                                _gross_margin_target
    from fact_sales_target_weekly f
    group by f.week_start
)
select
     s._week_start                                                                    _week_start
    ,w.week_label                                                                     _week_label
    ,s._net_sales                                                                     _net_sales
    ,s._gross_sales                                                                   _gross_sales
    ,s._discounts                                                                     _discounts
    ,s._returns                                                                       _returns
    ,s._cogs                                                                          _cogs
    ,s._net_sales - s._cogs                                                           _gross_margin
    ,(s._net_sales - s._cogs) / nullif(s._net_sales, 0)                               _gross_margin_pct
    ,s._discounts / nullif(s._gross_sales, 0)                                         _discount_rate
    ,s._returns / nullif(s._gross_sales, 0)                                           _return_rate
    ,s._units                                                                         _units
    ,o._orders                                                                        _orders
    ,o._new_customers                                                                 _new_customers
    ,s._net_sales_online / nullif(o._orders_online, 0)                                _aov_online
    ,t._net_sales_target                                                              _net_sales_target
    ,t._gross_margin_target / nullif(t._net_sales_target, 0)                          _gross_margin_pct_target
    ,sum(s._net_sales) over (partition by w.iso_year order by s._week_start)          _net_sales_ytd
    ,sum(t._net_sales_target) over (partition by w.iso_year order by s._week_start)   _net_sales_target_ytd
from s
join dim_week w on w.week_start = s._week_start
left join o on o._week_start = s._week_start
left join t on t._week_start = s._week_start;

-- ---------------------------------------------------------------- cash, one row per week

create view v_week_cash with (security_invoker = on) as
with a as (
    select
         f.week_start                                              _week_start
        ,sum(f.amount_eur) filter (where f.amount_eur > 0)         _inflow
        ,sum(f.amount_eur) filter (where f.amount_eur < 0)         _outflow
        ,sum(f.amount_eur) filter (where g.flow = 'operating')     _operating
        ,sum(f.amount_eur) filter (where g.flow = 'investing')     _investing
        ,sum(f.amount_eur) filter (where g.flow = 'financing')     _financing
        ,sum(f.amount_eur)                                         _net
    from fact_cash_weekly f
    join dim_cash_category g on g.cash_category_id = f.cash_category_id
    group by f.week_start
)
, p as (
    select
         f.week_start                                              _week_start
        ,sum(f.amount_eur)                                         _forecast_net
    from fact_cash_forecast f
    where 1=1
        and f.issued_week = f.week_start
    group by f.week_start
)
, b as (
    select
         a._week_start                                                     _week_start
        ,a._inflow                                                         _inflow
        ,a._outflow                                                        _outflow
        ,a._operating                                                      _operating
        ,a._investing                                                      _investing
        ,a._financing                                                      _financing
        ,a._net                                                            _net
        ,k.opening_cash_eur + sum(a._net) over (order by a._week_start)    _closing
    from a
    cross join company k
    where 1=1
        and a._week_start >= k.opening_cash_date
)
select
     b._week_start                                   _week_start
    ,b._closing - b._net                             _opening
    ,coalesce(b._inflow, 0)                          _inflow
    ,coalesce(b._outflow, 0)                         _outflow
    ,coalesce(b._operating, 0)                       _operating
    ,coalesce(b._investing, 0)                       _investing
    ,coalesce(b._financing, 0)                       _financing
    ,b._net                                          _net
    ,b._closing                                      _closing
    ,p._forecast_net                                 _forecast_net
    ,b._closing - b._net + p._forecast_net           _closing_forecast
    ,b._net - p._forecast_net                        _forecast_variance
from b
left join p on p._week_start = b._week_start;

-- The 13-week outlook as issued each Monday: last actual closing + the forecast, week by week.
create view v_cash_outlook with (security_invoker = on) as
select
     f.issued_week                                                                               _issued_week
    ,f.week_start                                                                                _week_start
    ,sum(f.amount_eur)                                                                           _forecast_net
    ,c._closing + sum(sum(f.amount_eur)) over (partition by f.issued_week order by f.week_start)  _projected_closing
from fact_cash_forecast f
join v_week_cash c on c._week_start = f.issued_week - 7
group by f.issued_week, f.week_start, c._closing;

-- Actual vs forecast by cash category, for "where the cash went".
create view v_cash_by_category with (security_invoker = on) as
with a as (
    select
         f.week_start                    _week_start
        ,f.cash_category_id              _cash_category_id
        ,f.amount_eur                    _actual
    from fact_cash_weekly f
)
, p as (
    select
         f.week_start                    _week_start
        ,f.cash_category_id              _cash_category_id
        ,f.amount_eur                    _forecast
    from fact_cash_forecast f
    where 1=1
        and f.issued_week = f.week_start
)
select
     coalesce(a._week_start, p._week_start)                        _week_start
    ,g.code                                                        _code
    ,g.name                                                        _name
    ,g.flow                                                        _flow
    ,g.sort                                                        _sort
    ,coalesce(a._actual, 0)                                        _actual
    ,p._forecast                                                   _forecast
    ,coalesce(a._actual, 0) - p._forecast                          _variance
from a
full join p on p._week_start = a._week_start and p._cash_category_id = a._cash_category_id
join dim_cash_category g on g.cash_category_id = coalesce(a._cash_category_id, p._cash_category_id);

-- ---------------------------------------------------------------- working capital, one row per week

create view v_week_working_capital with (security_invoker = on) as
with r as (
    select
         f.week_start                                                       _week_start
        ,sum(f.amount_eur)                                                  _ar_total
        ,sum(f.amount_eur) filter (where f.bucket <> 'not_due')             _ar_overdue
        ,sum(f.amount_eur) filter (where f.bucket in ('overdue_61_90', 'overdue_90_plus')) _ar_overdue_60_plus
    from fact_ar_weekly f
    group by f.week_start
)
, p as (
    select
         f.week_start                                                       _week_start
        ,sum(f.amount_eur)                                                  _ap_total
        ,sum(f.amount_eur) filter (where f.bucket = 'due_next_week')        _ap_due_next_week
        ,sum(f.amount_eur) filter (where f.bucket like 'overdue%')          _ap_overdue
    from fact_ap_weekly f
    group by f.week_start
)
, s as (
    -- net sales on credit (retail partners, B2B): DSO's denominator
    select
         f.week_start                    _week_start
        ,sum(f.net_sales)                _credit_sales
    from fact_sales_weekly f
    join dim_channel c on c.channel_id = f.channel_id
    where 1=1
        and c.payment_terms_days > 0
    group by f.week_start
)
, d as (
    select
         s._week_start                                                                          _week_start
        ,sum(s._credit_sales) over (order by s._week_start rows between 12 preceding and current row) _credit_sales_13w
    from s
)
select
     r._week_start                                             _week_start
    ,r._ar_total                                               _ar_total
    ,coalesce(r._ar_overdue, 0)                                _ar_overdue
    ,coalesce(r._ar_overdue_60_plus, 0)                        _ar_overdue_60_plus
    ,coalesce(r._ar_overdue, 0) / nullif(r._ar_total, 0)       _ar_overdue_pct
    ,r._ar_total / nullif(d._credit_sales_13w, 0) * 91         _dso
    ,p._ap_total                                               _ap_total
    ,coalesce(p._ap_due_next_week, 0)                          _ap_due_next_week
    ,coalesce(p._ap_overdue, 0)                                _ap_overdue
from r
left join p on p._week_start = r._week_start
left join d on d._week_start = r._week_start;

-- ---------------------------------------------------------------- pipeline, one row per week

create view v_week_pipeline with (security_invoker = on) as
with o as (
    select
         f.week_start                                    _week_start
        ,sum(f.open_deals)                               _open_deals
        ,sum(f.open_value_eur)                           _open_value
        ,sum(f.open_value_eur * g.probability)           _weighted_value
    from fact_pipeline_weekly f
    join dim_pipeline_stage g on g.stage_id = f.stage_id
    group by f.week_start
)
, x as (
    select
         f.week_start                                    _week_start
        ,sum(f.created_value_eur)                        _created_value
        ,sum(f.won_deals)                                _won_deals
        ,sum(f.won_value_eur)                            _won_value
        ,sum(f.lost_deals)                               _lost_deals
        ,sum(f.lost_value_eur)                           _lost_value
    from fact_pipeline_flow_weekly f
    group by f.week_start
)
select
     o._week_start                                                                 _week_start
    ,o._open_deals                                                                 _open_deals
    ,o._open_value                                                                 _open_value
    ,o._weighted_value                                                             _weighted_value
    ,x._created_value                                                              _created_value
    ,x._won_deals                                                                  _won_deals
    ,x._won_value                                                                  _won_value
    ,x._lost_deals                                                                 _lost_deals
    ,x._lost_value                                                                 _lost_value
    ,sum(x._won_value) over l / nullif(sum(x._won_value + x._lost_value) over l, 0) _win_rate_4w
from o
left join x on x._week_start = o._week_start
window l as (order by o._week_start rows between 3 preceding and current row);

-- ---------------------------------------------------------------- breakdowns for the email's tables

-- Net sales by channel, region and category, with last year and (channel, region) the target.
create view v_sales_breakdown with (security_invoker = on) as
with b as (
    select
         f.week_start                    _week_start
        ,'channel'                       _dim
        ,c.code                          _member_code
        ,c.name                          _member_name
        ,c.sort                          _sort
        ,sum(f.net_sales)                _net_sales
        ,sum(f.net_sales - f.cogs)       _gross_margin
    from fact_sales_weekly f
    join dim_channel c on c.channel_id = f.channel_id
    group by f.week_start, c.code, c.name, c.sort
    union all
    select
         f.week_start                    _week_start
        ,'region'                        _dim
        ,r.code                          _member_code
        ,r.name                          _member_name
        ,r.sort                          _sort
        ,sum(f.net_sales)                _net_sales
        ,sum(f.net_sales - f.cogs)       _gross_margin
    from fact_sales_weekly f
    join dim_region r on r.region_id = f.region_id
    group by f.week_start, r.code, r.name, r.sort
    union all
    select
         f.week_start                    _week_start
        ,'category'                      _dim
        ,g.code                          _member_code
        ,g.name                          _member_name
        ,g.sort                          _sort
        ,sum(f.net_sales)                _net_sales
        ,sum(f.net_sales - f.cogs)       _gross_margin
    from fact_sales_weekly f
    join dim_category g on g.category_id = f.category_id
    group by f.week_start, g.code, g.name, g.sort
)
, t as (
    select
         f.week_start                    _week_start
        ,'channel'                       _dim
        ,c.code                          _member_code
        ,sum(f.net_sales_target)         _net_sales_target
    from fact_sales_target_weekly f
    join dim_channel c on c.channel_id = f.channel_id
    group by f.week_start, c.code
    union all
    select
         f.week_start                    _week_start
        ,'region'                        _dim
        ,r.code                          _member_code
        ,sum(f.net_sales_target)         _net_sales_target
    from fact_sales_target_weekly f
    join dim_region r on r.region_id = f.region_id
    group by f.week_start, r.code
)
select
     b._week_start                                          _week_start
    ,b._dim                                                 _dim
    ,b._member_code                                         _member_code
    ,b._member_name                                         _member_name
    ,b._sort                                                _sort
    ,b._net_sales                                           _net_sales
    ,l._net_sales                                           _net_sales_ly
    ,t._net_sales_target                                    _net_sales_target
    ,b._net_sales / nullif(l._net_sales, 0) - 1             _yoy_pct
    ,b._net_sales / nullif(t._net_sales_target, 0) - 1      _vs_target_pct
    ,b._gross_margin / nullif(b._net_sales, 0)              _gross_margin_pct
from b
join dim_week w on w.week_start = b._week_start
left join b l on l._dim = b._dim and l._member_code = b._member_code and l._week_start = w.ly_week_start
left join t on t._dim = b._dim and t._member_code = b._member_code and t._week_start = b._week_start;

-- ---------------------------------------------------------------- the KPI tiles

-- One row per week × KPI in the catalogue: value, last week, last year, target, the three deltas, and the flag.
-- Deltas are relative for eur / count KPIs and absolute (points, days) for pct / days KPIs, as the catalogue says.
create view v_kpi_weekly with (security_invoker = on) as
with v as (
    select
         s._week_start                   _week_start
        ,x.kpi_code                      _kpi_code
        ,x.value                         _value
        ,x.target                        _target
    from v_week_sales s
    left join v_week_cash c on c._week_start = s._week_start
    left join v_week_working_capital k on k._week_start = s._week_start
    left join v_week_pipeline p on p._week_start = s._week_start
    left join lateral (
        select
             min(o._projected_closing)   _low
        from v_cash_outlook o
        where 1=1
            and o._issued_week = s._week_start + 7
    ) m on true
    cross join lateral (values
         ('net_sales',           s._net_sales::numeric,      s._net_sales_target::numeric)
        ,('net_sales_ytd',       s._net_sales_ytd,           s._net_sales_target_ytd)
        ,('gross_margin_pct',    s._gross_margin_pct,        s._gross_margin_pct_target)
        ,('discount_rate',       s._discount_rate,           null)
        ,('return_rate',         s._return_rate,             null)
        ,('orders',              s._orders,                  null)
        ,('new_customers',       s._new_customers,           null)
        ,('aov_online',          s._aov_online,              null)
        ,('cash_closing',        c._closing,                 c._closing_forecast)
        ,('net_cash_flow',       c._net,                     c._forecast_net)
        ,('operating_cash_flow', c._operating,               null)
        ,('cash_low_13w',        m._low,                     null)
        ,('ar_overdue_pct',      k._ar_overdue_pct,          null)
        ,('dso',                 k._dso,                     null)
        ,('ap_due_next_week',    k._ap_due_next_week,        null)
        ,('pipeline_weighted',   p._weighted_value,          null)
        ,('won_value',           p._won_value,               null)
        ,('win_rate_4w',         p._win_rate_4w,             null)
    ) x(kpi_code, value, target)
)
, h as (
    select
         v._week_start                                                         _week_start
        ,v._kpi_code                                                           _kpi_code
        ,v._value                                                              _value
        ,v._target                                                             _target
        ,lag(v._value) over (partition by v._kpi_code order by v._week_start)  _prev
        ,l._value                                                              _ly
    from v
    join dim_week w on w.week_start = v._week_start
    left join v l on l._kpi_code = v._kpi_code and l._week_start = w.ly_week_start
)
, d as (
    select
         h._week_start                   _week_start
        ,h._kpi_code                     _kpi_code
        ,h._value                        _value
        ,h._prev                         _prev
        ,h._ly                           _ly
        ,h._target                       _target
        ,case
             when k.unit in ('pct', 'days')
                 then h._value - h._prev
             else h._value / nullif(abs(h._prev), 0) - 1
         end                             _vs_prev
        ,case
             when k.unit in ('pct', 'days')
                 then h._value - h._ly
             else h._value / nullif(abs(h._ly), 0) - 1
         end                             _vs_ly
        ,case
             when k.unit in ('pct', 'days')
                 then h._value - h._target
             else h._value / nullif(abs(h._target), 0) - 1
         end                             _vs_target
    from h
    join kpi k on k.kpi_code = h._kpi_code
)
select
     d._week_start                                   _week_start
    ,k.section                                       _section
    ,k.sort                                          _sort
    ,d._kpi_code                                     _kpi_code
    ,k.name                                          _name
    ,k.unit                                          _unit
    ,k.better                                        _better
    ,d._value                                        _value
    ,d._prev                                         _prev
    ,d._ly                                           _ly
    ,d._target                                       _target
    ,d._vs_prev                                      _vs_prev
    ,d._vs_ly                                        _vs_ly
    ,d._vs_target                                    _vs_target
    ,case
         when k.flag_vs = 'none'
             then false
         when k.flag_vs = 'policy'
             then coalesce(d._value < y.min_cash_eur, false)
         else coalesce(
                  case k.flag_vs
                      when 'target' then d._vs_target
                      when 'ly' then d._vs_ly
                      when 'prev' then d._vs_prev
                  end
                  * case k.better when 'up' then -1 else 1 end
                  > k.flag_threshold
              , false)
     end                                             _flag
    ,k.flag_vs                                       _flag_vs
from d
join kpi k on k.kpi_code = d._kpi_code
cross join company y;
