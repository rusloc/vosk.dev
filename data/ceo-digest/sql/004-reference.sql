-- ceo_digest_demo reference rows: the company, the calendar, the dimension members and the KPI catalogue. Applied by
-- postgres via MCP execute_sql after 002 / 003, before 005 generates the facts. Every name here is fictional.

set search_path = ceo_digest_demo;

truncate company, dim_week, dim_plan, dim_channel, dim_cash_category, kpi cascade;

-- data_as_of: Sunday 15 Nov 2026, the close of W46. "Today" for the chat and the email.
insert into company (company_id, name, currency, opening_cash_date, opening_cash_eur, min_runway_months, gross_margin_pct, data_as_of) values
    (1, 'Tidewell', 'EUR', date '2024-01-01', 3300000, 12, 0.800, date '2026-11-15');

-- 2024-W01 (Mon 1 Jan 2024) to 2026-W53 (Mon 28 Dec 2026). 2026's W53 maps to last year's W52.
insert into dim_week (week_start, iso_year, iso_week, week_label, month_start)
select
     d::date                                                                                  _week_start
    ,extract(isoyear from d)::smallint                                                        _iso_year
    ,extract(week from d)::smallint                                                           _iso_week
    ,'W' || lpad(extract(week from d)::text, 2, '0') || ' ' || extract(isoyear from d)        _week_label
    ,date_trunc('month', d + interval '3 days')::date                                         _month_start
from generate_series(date '2024-01-01', date '2026-12-28', interval '7 days') d;

update dim_week w
set ly_week_start = l.week_start
from dim_week l
where 1=1
    and l.iso_year = w.iso_year - 1
    and l.iso_week = least(w.iso_week, 52);

insert into dim_plan (plan_id, code, name, billing, list_price_eur, sort) values
     (1, 'starter', 'Starter', 'monthly_card',    39, 1)
    ,(2, 'pro',     'Pro',     'monthly_card',   109, 2)
    ,(3, 'clinic',  'Clinic',  'annual_invoice', 330, 3);

insert into dim_channel (channel_id, code, name, has_trial, paid_by, sort) values
     (1, 'paid_search', 'Paid search',          true,  'card',    1)
    ,(2, 'paid_social', 'Paid social',          true,  'card',    2)
    ,(3, 'content_seo', 'Content and SEO',      true,  'invoice', 3)
    ,(4, 'partners',    'Partners and referrals', true,  'invoice', 4)
    ,(5, 'outbound',    'Outbound sales',       false, 'invoice', 5);

insert into dim_cash_category (cash_category_id, code, name, flow, direction, sort) values
     ( 1, 'card_collections',    'Card collections (monthly plans)',          'operating',  1,  1)
    ,( 2, 'invoice_collections', 'Invoice collections (annual plans)',        'operating',  1,  2)
    ,( 3, 'payroll',             'Payroll and payroll taxes',                 'operating', -1,  3)
    ,( 4, 'paid_ads',            'Paid ads (search and social)',              'operating', -1,  4)
    ,( 5, 'marketing_suppliers', 'Content, partner commissions, sales tools', 'operating', -1,  5)
    ,( 6, 'hosting_software',    'Hosting and software',                      'operating', -1,  6)
    ,( 7, 'rent_office',         'Rent and office',                           'operating', -1,  7)
    ,( 8, 'vat',                 'VAT (quarterly)',                           'operating', -1,  8)
    ,( 9, 'other_opex',          'Other operating costs',                     'operating', -1,  9)
    ,(10, 'capex',               'Equipment and fit-out',                     'investing', -1, 10)
    ,(11, 'equity',              'Equity raised',                             'financing',  1, 11);

-- The 10 KPIs of the email. Thresholds: relative for eur / count, absolute (points, months) for pct / months.
insert into kpi (kpi_code, section, name, unit, better, flag_vs, flag_threshold, definition, sort) values
     ('arr',                'growth',          'ARR',                              'eur',    'up',   'target', 0.020,
      'Annual recurring revenue at the week''s close: MRR × 12. Flagged when more than 2 % below plan.', 1)
    ,('net_new_mrr_4w',     'growth',          'Net new MRR, last 4 weeks',        'eur',    'up',   'target', 0.300,
      'New + expansion − contraction − churned MRR over the last 4 weeks. Flagged when more than 30 % below plan.', 2)
    ,('mrr_churn_4w',       'growth',          'MRR churn, last 4 weeks',          'pct',    'down', 'ly',     0.004,
      'Churned MRR over the last 4 weeks ÷ MRR at the start of those 4 weeks. Flagged when 0.4 points above the same weeks last year.', 3)
    ,('mqls',               'marketing',       'Marketing-qualified leads',        'count',  'up',   'target', 0.150,
      'Leads that met the qualification rule this week, all channels (outbound: meetings booked). Flagged when more than 15 % below plan.', 4)
    ,('trial_conversion_4w','marketing',       'Trial-to-paid, last 4 weeks',      'pct',    'up',   'ly',     0.025,
      'Trials that converted ÷ trials that ended (14-day trials), last 4 weeks. Flagged when 2.5 points below the same weeks last year.', 5)
    ,('cac_4w',             'marketing',       'Blended CAC, last 4 weeks',        'eur',    'down', 'target', 0.150,
      'Marketing spend ÷ new customers, last 4 weeks, all channels. Flagged when more than 15 % above plan.', 6)
    ,('cash_close',         'cash',            'Cash at week end',                 'eur',    'up',   'none',   0,
      'Bank balance at the week''s close. Shown with last week and last year, not flagged.', 7)
    ,('runway_months',      'cash',            'Runway',                           'months', 'up',   'policy', 0,
      'Cash at week end ÷ average monthly net burn (operating + investing) of the last 13 weeks. Empty when cash-flow positive. Flagged below the company''s minimum.', 8)
    ,('ar_overdue_pct',     'working_capital', 'Overdue receivables',              'pct',    'down', 'ly',     0.050,
      'Receivables past their due date ÷ all receivables at the week''s close. Flagged when 5 points above the same week last year.', 9)
    ,('ap_due_14d',         'working_capital', 'Payables due in the next 14 days', 'eur',    'down', 'avg13',  0.500,
      'Supplier invoices due within 14 days of the week''s close. Flagged when 50 % above the average of the 13 weeks before.', 10);
