-- ceo_digest_demo views — the KPI build. Every number in the CEO email comes from here; n8n only picks the week and
-- formats, and the LLM writes commentary from these rows, never computes. Drop-and-rebuild, applied via MCP
-- execute_sql by postgres after 002. security_invoker: a view reads with its caller's grants, never postgres's.
--
-- What n8n reads for the week that just closed (:w = the Monday a week before the email's Monday):
--   v_kpi_weekly              where _week_start = :w   → the 10 KPI tiles, flags first
--   v_mrr_by_plan             where _week_start = :w   → the MRR bridge by plan
--   v_marketing_by_channel    where _week_start = :w   → the funnel by channel
--   v_cash_by_category        where _week_start = :w   → where the cash went
--   v_week_working_capital    where _week_start = :w   → receivables by age, payables by due date

set search_path = ceo_digest_demo;

drop view if exists
     v_kpi_weekly, v_mrr_by_plan, v_marketing_by_channel, v_cash_by_category
    ,v_week_working_capital, v_week_cash, v_week_marketing, v_week_growth
cascade;

-- ---------------------------------------------------------------- growth, one row per week

create view v_week_growth with (security_invoker = on) as
with m as (
    select
         f.week_start                                    _week_start
        ,sum(f.customers_open)                           _customers_open
        ,sum(f.customers_new)                            _customers_new
        ,sum(f.customers_churned)                        _customers_churned
        ,sum(f.customers_close)                          _customers_close
        ,sum(f.mrr_open)                                 _mrr_open
        ,sum(f.mrr_new)                                  _mrr_new
        ,sum(f.mrr_expansion)                            _mrr_expansion
        ,sum(f.mrr_contraction)                          _mrr_contraction
        ,sum(f.mrr_churn)                                _mrr_churn
        ,sum(f.mrr_close)                                _mrr_close
    from fact_mrr_weekly f
    group by f.week_start
)
select
     m._week_start                                                                                    _week_start
    ,w.week_label                                                                                     _week_label
    ,m._customers_open                                                                                _customers_open
    ,m._customers_new                                                                                 _customers_new
    ,m._customers_churned                                                                             _customers_churned
    ,m._customers_close                                                                               _customers_close
    ,m._mrr_open                                                                                      _mrr_open
    ,m._mrr_new                                                                                       _mrr_new
    ,m._mrr_expansion                                                                                 _mrr_expansion
    ,m._mrr_contraction                                                                               _mrr_contraction
    ,m._mrr_churn                                                                                     _mrr_churn
    ,m._mrr_close                                                                                     _mrr_close
    ,m._mrr_new + m._mrr_expansion - m._mrr_contraction - m._mrr_churn                                _net_new_mrr
    ,m._mrr_close * 12                                                                                _arr
    ,m._mrr_close / nullif(m._customers_close, 0)                                                     _arpa
    ,sum(m._mrr_new + m._mrr_expansion - m._mrr_contraction - m._mrr_churn)
         over (order by m._week_start rows between 3 preceding and current row)                       _net_new_mrr_4w
    ,sum(m._mrr_churn) over (order by m._week_start rows between 3 preceding and current row)
         / nullif(lag(m._mrr_open, 3) over (order by m._week_start), 0)                               _mrr_churn_4w
    ,t.arr_target                                                                                     _arr_target
    ,t.net_new_mrr_target                                                                             _net_new_mrr_target
    ,sum(t.net_new_mrr_target) over (order by m._week_start rows between 3 preceding and current row) _net_new_mrr_target_4w
from m
join dim_week w on w.week_start = m._week_start
left join fact_target_weekly t on t.week_start = m._week_start;

-- ---------------------------------------------------------------- marketing, one row per week

create view v_week_marketing with (security_invoker = on) as
with f as (
    select
         f.week_start                                                    _week_start
        ,sum(f.spend_eur)                                                _spend
        ,sum(f.mqls)                                                     _mqls
        ,sum(f.trials_started)                                           _trials_started
        ,sum(f.trials_ended)                                             _trials_ended
        ,sum(f.trials_converted)                                         _trials_converted
        ,sum(f.new_customers)                                            _new_customers
        ,sum(f.new_mrr)                                                  _new_mrr
    from fact_marketing_weekly f
    group by f.week_start
)
, r as (
    select
         f.*
        ,sum(f._spend) over w4                                           _spend_4w
        ,sum(f._new_customers) over w4                                   _new_customers_4w
        ,sum(f._new_mrr) over w4                                         _new_mrr_4w
        ,sum(f._trials_converted) over w4                                _trials_converted_4w
        ,sum(f._trials_ended) over w4                                    _trials_ended_4w
    from f
    window w4 as (order by f._week_start rows between 3 preceding and current row)
)
select
     r._week_start                                                                        _week_start
    ,r._spend                                                                             _spend
    ,t.marketing_budget                                                                   _marketing_budget
    ,r._mqls                                                                              _mqls
    ,t.mqls_target                                                                        _mqls_target
    ,r._trials_started                                                                    _trials_started
    ,r._trials_ended                                                                      _trials_ended
    ,r._trials_converted                                                                  _trials_converted
    ,r._new_customers                                                                     _new_customers
    ,r._new_mrr                                                                           _new_mrr
    ,r._spend_4w                                                                          _spend_4w
    ,r._new_customers_4w                                                                  _new_customers_4w
    ,r._trials_converted_4w::numeric / nullif(r._trials_ended_4w, 0)                      _trial_conversion_4w
    ,r._spend_4w / nullif(r._new_customers_4w, 0)                                         _cac_4w
    ,t.cac_target                                                                         _cac_target
    ,r._spend_4w / nullif(r._new_customers_4w, 0)
         / nullif(r._new_mrr_4w / nullif(r._new_customers_4w, 0) * k.gross_margin_pct, 0) _cac_payback_months
from r
cross join company k
left join fact_target_weekly t on t.week_start = r._week_start;

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
, b as (
    select
         a.*
        ,k.opening_cash_eur + sum(a._net) over (order by a._week_start)                                   _closing
        -- monthly net burn: what operations and investment consumed, a 13-week average scaled to a month
        ,-avg(coalesce(a._operating, 0) + coalesce(a._investing, 0))
              over (order by a._week_start rows between 12 preceding and current row) * 52 / 12           _burn_monthly
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
    ,b._burn_monthly                                 _burn_monthly
    ,case
         when b._burn_monthly > 0
             then b._closing / b._burn_monthly
     end                                             _runway_months
from b;

-- Where the cash went: week × category, against the same week last year and the 13-week weekly average.
create view v_cash_by_category with (security_invoker = on) as
with f as (
    select
         f.week_start                                                                          _week_start
        ,g.code                                                                                _code
        ,g.name                                                                                _name
        ,g.flow                                                                                _flow
        ,g.sort                                                                                _sort
        ,f.amount_eur                                                                          _amount
        ,avg(f.amount_eur) over (partition by g.code order by f.week_start
                                 rows between 12 preceding and current row)                    _avg_13w
    from fact_cash_weekly f
    join dim_cash_category g on g.cash_category_id = f.cash_category_id
)
select
     f._week_start                                   _week_start
    ,f._code                                         _code
    ,f._name                                         _name
    ,f._flow                                         _flow
    ,f._sort                                         _sort
    ,f._amount                                       _amount
    ,l._amount                                       _amount_ly
    ,f._avg_13w                                      _avg_13w
from f
join dim_week w on w.week_start = f._week_start
left join f l on l._code = f._code and l._week_start = w.ly_week_start;

-- ---------------------------------------------------------------- working capital, one row per week

create view v_week_working_capital with (security_invoker = on) as
with r as (
    select
         f.week_start                                                              _week_start
        ,sum(f.amount_eur)                                                         _ar_total
        ,sum(f.amount_eur) filter (where f.bucket = 'not_due')                     _ar_not_due
        ,sum(f.amount_eur) filter (where f.bucket = 'overdue_1_30')                _ar_overdue_1_30
        ,sum(f.amount_eur) filter (where f.bucket = 'overdue_31_60')               _ar_overdue_31_60
        ,sum(f.amount_eur) filter (where f.bucket = 'overdue_61_90')               _ar_overdue_61_90
        ,sum(f.amount_eur) filter (where f.bucket = 'overdue_90_plus')             _ar_overdue_90_plus
        ,sum(f.amount_eur) filter (where f.bucket <> 'not_due')                    _ar_overdue
    from fact_ar_weekly f
    group by f.week_start
)
, p as (
    select
         f.week_start                                                              _week_start
        ,sum(f.amount_eur)                                                         _ap_total
        ,sum(f.amount_eur) filter (where f.bucket = 'overdue')                     _ap_overdue
        ,sum(f.amount_eur) filter (where f.bucket = 'due_0_7')                     _ap_due_0_7
        ,sum(f.amount_eur) filter (where f.bucket = 'due_8_14')                    _ap_due_8_14
        ,sum(f.amount_eur) filter (where f.bucket = 'due_15_30')                   _ap_due_15_30
    from fact_ap_weekly f
    group by f.week_start
)
select
     r._week_start                                   _week_start
    ,r._ar_total                                     _ar_total
    ,r._ar_not_due                                   _ar_not_due
    ,r._ar_overdue_1_30                              _ar_overdue_1_30
    ,r._ar_overdue_31_60                             _ar_overdue_31_60
    ,r._ar_overdue_61_90                             _ar_overdue_61_90
    ,r._ar_overdue_90_plus                           _ar_overdue_90_plus
    ,r._ar_overdue                                   _ar_overdue
    ,r._ar_overdue / nullif(r._ar_total, 0)          _ar_overdue_pct
    ,p._ap_total                                     _ap_total
    ,p._ap_overdue                                   _ap_overdue
    ,p._ap_due_0_7                                   _ap_due_0_7
    ,p._ap_due_8_14                                  _ap_due_8_14
    ,p._ap_due_15_30                                 _ap_due_15_30
    ,p._ap_due_0_7 + p._ap_due_8_14                  _ap_due_14d
from r
join p on p._week_start = r._week_start;

-- ---------------------------------------------------------------- breakdowns

-- The MRR bridge by plan, with 4-week churn per plan.
create view v_mrr_by_plan with (security_invoker = on) as
select
     f.week_start                                                                              _week_start
    ,p.code                                                                                    _plan_code
    ,p.name                                                                                    _plan_name
    ,p.sort                                                                                    _sort
    ,f.customers_open                                                                          _customers_open
    ,f.customers_new                                                                           _customers_new
    ,f.customers_churned                                                                       _customers_churned
    ,f.customers_close                                                                         _customers_close
    ,f.mrr_open                                                                                _mrr_open
    ,f.mrr_new                                                                                 _mrr_new
    ,f.mrr_expansion                                                                           _mrr_expansion
    ,f.mrr_contraction                                                                         _mrr_contraction
    ,f.mrr_churn                                                                               _mrr_churn
    ,f.mrr_close                                                                               _mrr_close
    ,f.mrr_close / nullif(f.customers_close, 0)                                                _arpa
    ,sum(f.mrr_churn) over w4 / nullif(lag(f.mrr_open, 3) over wp, 0)                         _mrr_churn_4w
from fact_mrr_weekly f
join dim_plan p on p.plan_id = f.plan_id
window
     wp as (partition by f.plan_id order by f.week_start)
    ,w4 as (partition by f.plan_id order by f.week_start rows between 3 preceding and current row);

-- The funnel by channel: the week, the last 4 weeks, and the 4 weeks before those.
create view v_marketing_by_channel with (security_invoker = on) as
with f as (
    select
         f.week_start                                                    _week_start
        ,c.code                                                          _channel_code
        ,c.name                                                          _channel_name
        ,c.sort                                                          _sort
        ,c.has_trial                                                     _has_trial
        ,f.spend_eur                                                     _spend
        ,f.mqls                                                          _mqls
        ,f.trials_started                                                _trials_started
        ,f.new_customers                                                 _new_customers
        ,f.new_mrr                                                       _new_mrr
        ,sum(f.spend_eur) over w4                                        _spend_4w
        ,sum(f.new_customers) over w4                                    _new_customers_4w
        ,sum(f.trials_converted) over w4                                 _trials_converted_4w
        ,sum(f.trials_ended) over w4                                     _trials_ended_4w
    from fact_marketing_weekly f
    join dim_channel c on c.channel_id = f.channel_id
    window w4 as (partition by f.channel_id order by f.week_start rows between 3 preceding and current row)
)
, r as (
    select
         f.*
        ,f._spend_4w / nullif(f._new_customers_4w, 0)                                          _cac_4w
        ,f._trials_converted_4w::numeric / nullif(f._trials_ended_4w, 0)                       _trial_conversion_4w
    from f
)
select
     r._week_start                                                       _week_start
    ,r._channel_code                                                     _channel_code
    ,r._channel_name                                                     _channel_name
    ,r._sort                                                             _sort
    ,r._spend                                                            _spend
    ,r._mqls                                                             _mqls
    ,r._trials_started                                                   _trials_started
    ,r._new_customers                                                    _new_customers
    ,r._new_mrr                                                          _new_mrr
    ,r._spend_4w                                                         _spend_4w
    ,r._new_customers_4w                                                 _new_customers_4w
    ,r._cac_4w                                                           _cac_4w
    ,lag(r._cac_4w, 4) over wp                                           _cac_4w_before
    ,case when r._has_trial then r._trial_conversion_4w end              _trial_conversion_4w
    ,case when r._has_trial then lag(r._trial_conversion_4w, 4) over wp end _trial_conversion_4w_before
from r
window wp as (partition by r._channel_code order by r._week_start);

-- ---------------------------------------------------------------- the KPI tiles

-- One row per week × KPI in the catalogue: value, last week, last year, the 13-week average before, target, the deltas,
-- and the flag. Deltas are relative for eur / count KPIs and absolute (points, months) for pct / months KPIs.
create view v_kpi_weekly with (security_invoker = on) as
with v as (
    select
         g._week_start                   _week_start
        ,x.kpi_code                      _kpi_code
        ,x.value                         _value
        ,x.target                        _target
    from v_week_growth g
    left join v_week_marketing m on m._week_start = g._week_start
    left join v_week_cash c on c._week_start = g._week_start
    left join v_week_working_capital k on k._week_start = g._week_start
    cross join lateral (values
         ('arr',                 g._arr::numeric,            g._arr_target::numeric)
        ,('net_new_mrr_4w',      g._net_new_mrr_4w,          g._net_new_mrr_target_4w)
        ,('mrr_churn_4w',        g._mrr_churn_4w,            null)
        ,('mqls',                m._mqls,                    m._mqls_target)
        ,('trial_conversion_4w', m._trial_conversion_4w,     null)
        ,('cac_4w',              m._cac_4w,                  m._cac_target)
        ,('cash_close',          c._closing,                 null)
        ,('runway_months',       c._runway_months,           null)
        ,('ar_overdue_pct',      k._ar_overdue_pct,          null)
        ,('ap_due_14d',          k._ap_due_14d,              null)
    ) x(kpi_code, value, target)
)
, h as (
    select
         v._week_start                                                         _week_start
        ,v._kpi_code                                                           _kpi_code
        ,v._value                                                              _value
        ,v._target                                                             _target
        ,lag(v._value) over (partition by v._kpi_code order by v._week_start)  _prev
        ,avg(v._value) over (partition by v._kpi_code order by v._week_start
                             rows between 13 preceding and 1 preceding)        _avg13
        ,l._value                                                              _ly
    from v
    join dim_week w on w.week_start = v._week_start
    left join v l on l._kpi_code = v._kpi_code and l._week_start = w.ly_week_start
)
, d as (
    select
         h.*
        ,case when k.unit in ('pct', 'months') then h._value - h._prev   else h._value / nullif(abs(h._prev), 0) - 1   end _vs_prev
        ,case when k.unit in ('pct', 'months') then h._value - h._ly     else h._value / nullif(abs(h._ly), 0) - 1     end _vs_ly
        ,case when k.unit in ('pct', 'months') then h._value - h._avg13  else h._value / nullif(abs(h._avg13), 0) - 1  end _vs_avg13
        ,case when k.unit in ('pct', 'months') then h._value - h._target else h._value / nullif(abs(h._target), 0) - 1 end _vs_target
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
    ,d._avg13                                        _avg13
    ,d._target                                       _target
    ,d._vs_prev                                      _vs_prev
    ,d._vs_ly                                        _vs_ly
    ,d._vs_avg13                                     _vs_avg13
    ,d._vs_target                                    _vs_target
    ,case
         when k.flag_vs = 'none'
             then false
         when k.flag_vs = 'policy'
             then coalesce(d._value < y.min_runway_months, false)
         else coalesce(
                  case k.flag_vs
                      when 'target' then d._vs_target
                      when 'ly' then d._vs_ly
                      when 'avg13' then d._vs_avg13
                  end
                  * case k.better when 'up' then -1 else 1 end
                  > k.flag_threshold
              , false)
     end                                             _flag
    ,k.flag_vs                                       _flag_vs
    ,k.definition                                    _definition
from d
join kpi k on k.kpi_code = d._kpi_code
cross join company y;
