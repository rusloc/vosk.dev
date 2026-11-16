-- ceo_digest_demo reference rows: the company, the calendar, the dimension members and the KPI catalogue.
-- DRAFT for the owner's review (2026-11-16): NOT applied yet. Applied by postgres via MCP execute_sql once the data
-- design is accepted, before the facts load. Every name here is fictional.

set search_path = ceo_digest_demo;

truncate company, dim_week, dim_channel, dim_region, dim_category, dim_cash_category, dim_pipeline_stage, kpi cascade;

insert into company (company_id, name, currency, opening_cash_date, opening_cash_eur, min_cash_eur) values
    (1, 'Kalma Home', 'EUR', date '2024-01-01', 6500000, 3000000);

-- 2024-W01 (Mon 1 Jan 2024) to 2027-W52 (Mon 27 Dec 2027). 2026 has a W53, which maps to last year's W52.
insert into dim_week (week_start, iso_year, iso_week, week_label, month_start)
select
     d::date                                                                                  _week_start
    ,extract(isoyear from d)::smallint                                                        _iso_year
    ,extract(week from d)::smallint                                                           _iso_week
    ,'W' || lpad(extract(week from d)::text, 2, '0') || ' ' || extract(isoyear from d)        _week_label
    ,date_trunc('month', d + interval '3 days')::date                                         _month_start
from generate_series(date '2024-01-01', date '2027-12-27', interval '7 days') d;

update dim_week w
set ly_week_start = l.week_start
from dim_week l
where 1=1
    and l.iso_year = w.iso_year - 1
    and l.iso_week = least(w.iso_week, 52);

insert into dim_channel (channel_id, code, name, payment_terms_days, sort) values
     (1, 'online', 'Online store',      0, 1)
    ,(2, 'retail', 'Retail partners',  60, 2)
    ,(3, 'b2b',    'Hotels & restaurants', 30, 3);

insert into dim_region (region_id, code, name, sort) values
     (1, 'dach',    'DACH',    1)
    ,(2, 'nordics', 'Nordics', 2)
    ,(3, 'benelux', 'Benelux', 3)
    ,(4, 'uk',      'UK',      4);

insert into dim_category (category_id, code, name, sort) values
     (1, 'cookware',   'Cookware',         1)
    ,(2, 'appliances', 'Small appliances', 2)
    ,(3, 'tableware',  'Tableware',        3)
    ,(4, 'textiles',   'Kitchen textiles', 4)
    ,(5, 'storage',    'Storage',          5);

insert into dim_cash_category (cash_category_id, code, name, flow, direction, sort) values
     ( 1, 'customer_receipts', 'Customer receipts',     'operating',  1,  1)
    ,( 2, 'suppliers',         'Suppliers and freight', 'operating', -1,  2)
    ,( 3, 'payroll',           'Payroll',               'operating', -1,  3)
    ,( 4, 'rent_utilities',    'Rent and utilities',    'operating', -1,  4)
    ,( 5, 'marketing',         'Marketing',             'operating', -1,  5)
    ,( 6, 'it_software',       'IT and software',       'operating', -1,  6)
    ,( 7, 'vat_payroll_tax',   'VAT and payroll taxes', 'operating', -1,  7)
    ,( 8, 'corporate_tax',     'Corporate tax',         'operating', -1,  8)
    ,( 9, 'other_operating',   'Other operating',       'operating', -1,  9)
    ,(10, 'capex',             'Capex',                 'investing', -1, 10)
    ,(11, 'loan_drawdown',     'Loan drawdown',         'financing',  1, 11)
    ,(12, 'loan_repayment',    'Loan repayment',        'financing', -1, 12)
    ,(13, 'interest',          'Interest',              'financing', -1, 13);

insert into dim_pipeline_stage (stage_id, code, name, probability, sort) values
     (1, 'qualified',   'Qualified',   0.10, 1)
    ,(2, 'proposal',    'Proposal',    0.30, 2)
    ,(3, 'negotiation', 'Negotiation', 0.60, 3)
    ,(4, 'commit',      'Commit',      0.85, 4);

-- The KPI catalogue. Thresholds: relative for eur / count, absolute for pct (points) and days.
insert into kpi (kpi_code, section, name, unit, better, flag_vs, flag_threshold, definition, sort) values
     ('net_sales',           'sales',           'Net sales',                        'eur',   'up',   'target', 0.05,  'Gross sales minus discounts and returns, all channels, Monday to Sunday.', 1)
    ,('net_sales_ytd',       'sales',           'Net sales, year to date',          'eur',   'up',   'target', 0.03,  'Net sales from ISO week 1 to this week, against the budget for the same weeks.', 2)
    ,('gross_margin_pct',    'sales',           'Gross margin',                     'pct',   'up',   'target', 0.015, '(Net sales − cost of goods sold) / net sales. Flagged 1.5 points below budget.', 3)
    ,('discount_rate',       'sales',           'Discount rate',                    'pct',   'down', 'ly',     0.02,  'Discounts / gross sales. Flagged 2 points above the same week last year.', 4)
    ,('return_rate',         'sales',           'Return rate',                      'pct',   'down', 'ly',     0.01,  'Returns / gross sales. Flagged 1 point above the same week last year.', 5)
    ,('orders',              'customers',       'Orders',                           'count', 'up',   'ly',     0.10,  'Orders placed in the week, all channels.', 6)
    ,('new_customers',       'customers',       'New customers',                    'count', 'up',   'ly',     0.15,  'First-time online buyers plus new retail and B2B accounts.', 7)
    ,('aov_online',          'customers',       'Average order, online',            'eur',   'up',   'ly',     0.08,  'Online net sales / online orders. Online only: a hotel order would swamp it.', 8)
    ,('cash_closing',        'cash',            'Cash at week end',                 'eur',   'up',   'target', 0.03,  'Bank balance on Sunday night, against what the forecast issued that Monday expected.', 9)
    ,('net_cash_flow',       'cash',            'Net cash flow',                    'eur',   'up',   'none',   0,     'All money in minus all money out in the week. Shown against the forecast, not flagged.', 10)
    ,('operating_cash_flow', 'cash',            'Operating cash flow',              'eur',   'up',   'none',   0,     'Customer receipts minus suppliers, payroll, rent, marketing, IT, taxes and other operating payments.', 11)
    ,('cash_low_13w',        'cash',            'Lowest cash, next 13 weeks',       'eur',   'up',   'policy', 0,     'The lowest week-end balance in the 13-week forecast issued after this week. Flagged below the cash buffer policy.', 12)
    ,('ar_overdue_pct',      'working_capital', 'Overdue receivables',              'pct',   'down', 'prev',   0.02,  'Receivables past due / all receivables at the week end. Flagged 2 points above last week.', 13)
    ,('dso',                 'working_capital', 'Days sales outstanding',           'days',  'down', 'ly',     5,     'Receivables / net sales on credit over the last 13 weeks × 91. Flagged 5 days above last year.', 14)
    ,('ap_due_next_week',    'working_capital', 'Payables due next week',           'eur',   'down', 'none',   0,     'Supplier invoices falling due in the coming week.', 15)
    ,('pipeline_weighted',   'pipeline',        'Weighted pipeline',                'eur',   'up',   'ly',     0.10,  'Open retail and B2B deals × stage probability, at the week end.', 16)
    ,('won_value',           'pipeline',        'Won this week',                    'eur',   'up',   'none',   0,     'First-year value of retail and B2B deals won in the week.', 17)
    ,('win_rate_4w',         'pipeline',        'Win rate, last 4 weeks',           'pct',   'up',   'ly',     0.05,  'Won value / (won + lost value) over the last 4 weeks. Flagged 5 points below last year.', 18);
