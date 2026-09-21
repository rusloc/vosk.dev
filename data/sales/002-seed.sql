-- Seed — 32 months of synthetic online-shop orders, 2024-01-01 → 2026-08-31.
--
-- Deterministic by construction: every "random" value is an md5 hash of a stable key, so the
-- same SQL always produces the same warehouse. A demo dashboard whose numbers move between
-- rebuilds cannot be screenshotted, written about, or pointed at during a call.
--
-- Designed, not merely generated. The shapes a viewer should be able to find:
--   * growth      — daily orders rise ~2.4x across the period
--   * seasonality — Nov/Dec peak, a Black Friday week, a mild summer dip, a weekday rhythm
--   * channel mix — drifts from paid toward owned (email 10% → 18%, paid search 30% → 20%)
--   * loyalty     — early customers reorder more; ~30% of orders are a customer's first,
--                   and that share holds flat (the pool grows in step with volume)
--   * returns     — paid social returns at twice the rate of every other channel, so the
--                   overall return rate eases (6.1% → 5.3%) as that channel's share shrinks
-- And two planted story beats, the months worth talking through:
--   1. 2025-06-01 → 2025-07-31  paid-search budget cut: ~65% of that channel's orders vanish
--   2. 2025-11-20 → 2025-12-10  the best-selling product is out of stock through peak season
--
-- Run after 001-create-schema.sql. Re-runnable on its own: it truncates first.

truncate
     demo_sales.fact_order_line
    ,demo_sales.dim_customer
    ,demo_sales.dim_product
    ,demo_sales.dim_channel
restart identity;

-- Deterministic pseudo-random in [0, 1). The low-31-bit mask avoids the signed-integer edge
-- on bit(32) casts; dividing by 2^31 rather than 2^31-1 keeps 1.0 itself out of range, so
-- floor(rnd * n) can never index past n-1. Dropped again at the end of this file.
create or replace function demo_sales.rnd(seed text) returns numeric
language sql immutable as $$
    select ((('x' || substr(md5(seed), 1, 8))::bit(32)::bigint & 2147483647)::numeric / 2147483648.0);
$$;

-- ---------------------------------------------------------------------------
-- dim_channel
-- ---------------------------------------------------------------------------

insert into demo_sales.dim_channel (channel_key, channel_name, channel_group)
values
     (1, 'Organic search', 'earned')
    ,(2, 'Paid search',    'paid')
    ,(3, 'Paid social',    'paid')
    ,(4, 'Email',          'owned')
    ,(5, 'Direct',         'owned')
    ,(6, 'Referral',       'earned');

-- ---------------------------------------------------------------------------
-- dim_product — 6 categories x 2 subcategories x 5 products. Generic names, no real brands.
-- The last column is cost as a share of list price: thin on electronics, fat on skincare.
-- ---------------------------------------------------------------------------

insert into demo_sales.dim_product (product_key, sku, product_name, category, subcategory, list_price, unit_cost)
with catalogue (product_key, sku, product_name, category, subcategory, list_price, cost_ratio) as (
    values
         ( 1, 'EL-AU-001', 'Aero Wireless Earbuds',        'Electronics',       'Audio',            79.00, 0.62)
        ,( 2, 'EL-AU-002', 'Pulse Bluetooth Speaker',      'Electronics',       'Audio',            59.00, 0.64)
        ,( 3, 'EL-AU-003', 'Studio Over-Ear Headphones',   'Electronics',       'Audio',           149.00, 0.66)
        ,( 4, 'EL-AU-004', 'Compact Soundbar',             'Electronics',       'Audio',           129.00, 0.70)
        ,( 5, 'EL-AU-005', 'USB-C Podcast Microphone',     'Electronics',       'Audio',            89.00, 0.63)
        ,( 6, 'EL-AC-001', '65W GaN Charger',              'Electronics',       'Accessories',      39.00, 0.55)
        ,( 7, 'EL-AC-002', '10K Power Bank',               'Electronics',       'Accessories',      34.00, 0.58)
        ,( 8, 'EL-AC-003', 'Braided USB-C Cable 2m',       'Electronics',       'Accessories',      14.00, 0.40)
        ,( 9, 'EL-AC-004', 'Magnetic Phone Stand',         'Electronics',       'Accessories',      24.00, 0.45)
        ,(10, 'EL-AC-005', 'Smart Plug Duo',               'Electronics',       'Accessories',      29.00, 0.60)
        ,(11, 'HK-CW-001', 'Cast Iron Skillet 26cm',       'Home & Kitchen',    'Cookware',         54.00, 0.52)
        ,(12, 'HK-CW-002', 'Non-Stick Pan Set',            'Home & Kitchen',    'Cookware',         89.00, 0.55)
        ,(13, 'HK-CW-003', 'Chef''s Knife 20cm',           'Home & Kitchen',    'Cookware',         69.00, 0.48)
        ,(14, 'HK-CW-004', 'Bamboo Cutting Board',         'Home & Kitchen',    'Cookware',         29.00, 0.45)
        ,(15, 'HK-CW-005', 'Stainless Stock Pot 8L',       'Home & Kitchen',    'Cookware',         74.00, 0.56)
        ,(16, 'HK-AP-001', 'Pour-Over Coffee Kit',         'Home & Kitchen',    'Small Appliances', 44.00, 0.50)
        ,(17, 'HK-AP-002', 'Burr Coffee Grinder',          'Home & Kitchen',    'Small Appliances', 99.00, 0.60)
        ,(18, 'HK-AP-003', 'Electric Kettle 1.7L',         'Home & Kitchen',    'Small Appliances', 49.00, 0.58)
        ,(19, 'HK-AP-004', 'Compact Air Fryer',            'Home & Kitchen',    'Small Appliances',119.00, 0.65)
        ,(20, 'HK-AP-005', 'Immersion Blender',            'Home & Kitchen',    'Small Appliances', 59.00, 0.57)
        ,(21, 'SP-FT-001', 'Yoga Mat Pro 6mm',             'Sports & Outdoors', 'Fitness',          45.00, 0.42)
        ,(22, 'SP-FT-002', 'Adjustable Dumbbell Pair',     'Sports & Outdoors', 'Fitness',         189.00, 0.62)
        ,(23, 'SP-FT-003', 'Resistance Band Set',          'Sports & Outdoors', 'Fitness',          27.00, 0.35)
        ,(24, 'SP-FT-004', 'Foam Roller',                  'Sports & Outdoors', 'Fitness',          24.00, 0.38)
        ,(25, 'SP-FT-005', 'Speed Jump Rope',              'Sports & Outdoors', 'Fitness',          18.00, 0.33)
        ,(26, 'SP-OD-001', 'Trail Daypack 24L',            'Sports & Outdoors', 'Outdoor',          79.00, 0.50)
        ,(27, 'SP-OD-002', 'Insulated Bottle 750ml',       'Sports & Outdoors', 'Outdoor',          32.00, 0.40)
        ,(28, 'SP-OD-003', 'Ultralight Camp Chair',        'Sports & Outdoors', 'Outdoor',          64.00, 0.52)
        ,(29, 'SP-OD-004', 'LED Headlamp',                 'Sports & Outdoors', 'Outdoor',          36.00, 0.44)
        ,(30, 'SP-OD-005', 'Two-Person Tent',              'Sports & Outdoors', 'Outdoor',         219.00, 0.60)
        ,(31, 'BC-SK-001', 'Vitamin C Serum 30ml',         'Beauty & Care',     'Skincare',         38.00, 0.28)
        ,(32, 'BC-SK-002', 'Daily Moisturiser SPF30',      'Beauty & Care',     'Skincare',         29.00, 0.30)
        ,(33, 'BC-SK-003', 'Gentle Foaming Cleanser',      'Beauty & Care',     'Skincare',         19.00, 0.30)
        ,(34, 'BC-SK-004', 'Overnight Repair Cream',       'Beauty & Care',     'Skincare',         46.00, 0.27)
        ,(35, 'BC-SK-005', 'Clay Face Mask',               'Beauty & Care',     'Skincare',         22.00, 0.32)
        ,(36, 'BC-GR-001', 'Electric Beard Trimmer',       'Beauty & Care',     'Grooming',         59.00, 0.52)
        ,(37, 'BC-GR-002', 'Safety Razor Kit',             'Beauty & Care',     'Grooming',         42.00, 0.38)
        ,(38, 'BC-GR-003', 'Ionic Hair Dryer',             'Beauty & Care',     'Grooming',         84.00, 0.55)
        ,(39, 'BC-GR-004', 'Bamboo Brush Set',             'Beauty & Care',     'Grooming',         17.00, 0.35)
        ,(40, 'BC-GR-005', 'Travel Grooming Case',         'Beauty & Care',     'Grooming',         25.00, 0.40)
        ,(41, 'AP-BS-001', 'Organic Cotton Tee',           'Apparel',           'Basics',           24.00, 0.36)
        ,(42, 'AP-BS-002', 'Merino Crew Socks 3-Pack',     'Apparel',           'Basics',           28.00, 0.40)
        ,(43, 'AP-BS-003', 'Everyday Hoodie',              'Apparel',           'Basics',           64.00, 0.42)
        ,(44, 'AP-BS-004', 'Stretch Chino',                'Apparel',           'Basics',           72.00, 0.44)
        ,(45, 'AP-BS-005', 'Ribbed Beanie',                'Apparel',           'Basics',           19.00, 0.34)
        ,(46, 'AP-OW-001', 'Packable Rain Jacket',         'Apparel',           'Outerwear',       119.00, 0.46)
        ,(47, 'AP-OW-002', 'Down Vest',                    'Apparel',           'Outerwear',       139.00, 0.48)
        ,(48, 'AP-OW-003', 'Fleece Half-Zip',              'Apparel',           'Outerwear',        79.00, 0.43)
        ,(49, 'AP-OW-004', 'Softshell Trousers',           'Apparel',           'Outerwear',        94.00, 0.45)
        ,(50, 'AP-OW-005', 'Insulated Parka',              'Apparel',           'Outerwear',       229.00, 0.50)
        ,(51, 'TG-BG-001', 'Harbor Traders Board Game',    'Toys & Games',      'Board Games',      44.00, 0.50)
        ,(52, 'TG-BG-002', 'Word Relay Party Game',        'Toys & Games',      'Board Games',      26.00, 0.46)
        ,(53, 'TG-BG-003', 'Cooperative Escape Box',       'Toys & Games',      'Board Games',      34.00, 0.48)
        ,(54, 'TG-BG-004', 'Classic Chess Set',            'Toys & Games',      'Board Games',      49.00, 0.52)
        ,(55, 'TG-BG-005', '1000-Piece Landscape Puzzle',  'Toys & Games',      'Board Games',      21.00, 0.42)
        ,(56, 'TG-KD-001', 'Wooden Train Starter Set',     'Toys & Games',      'Kids',             59.00, 0.54)
        ,(57, 'TG-KD-002', 'Magnetic Building Tiles',      'Toys & Games',      'Kids',             64.00, 0.56)
        ,(58, 'TG-KD-003', 'Junior Science Kit',           'Toys & Games',      'Kids',             39.00, 0.50)
        ,(59, 'TG-KD-004', 'Plush Forest Friends',         'Toys & Games',      'Kids',             22.00, 0.44)
        ,(60, 'TG-KD-005', 'Washable Art Easel',           'Toys & Games',      'Kids',             74.00, 0.55)
)
select
     c.product_key                           _product_key
    ,c.sku                                   _sku
    ,c.product_name                          _product_name
    ,c.category                              _category
    ,c.subcategory                           _subcategory
    ,c.list_price                            _list_price
    ,round(c.list_price * c.cost_ratio, 2)   _unit_cost
from catalogue c
where 1=1;

-- ---------------------------------------------------------------------------
-- stage_order — one row per order. A real table, not a CTE, because three later steps read
-- it (lines, customers, fact) and it is worth being able to inspect. Dropped at the end.
-- ---------------------------------------------------------------------------

create table demo_sales.stage_order as
with calendar as (
    select
         g::date                                          _day
        ,(row_number() over (order by g) - 1)::numeric    _day_index
    from generate_series(date '2024-01-01', date '2026-08-31', interval '1 day') g
    where 1=1
)
,day_volume as (
    select
         c._day                                           _day
        -- 0 → 1 across the period; every drifting share below is a function of it.
        ,c._day_index / 973.0                             _t
        ,round(
             22
             * (1 + 1.4 * c._day_index / 973.0)
             * case extract(month from c._day)::int
                   when 1  then 0.92 when 2  then 0.88 when 3  then 0.95
                   when 4  then 0.98 when 5  then 1.00 when 6  then 0.96
                   when 7  then 0.93 when 8  then 0.97 when 9  then 1.02
                   when 10 then 1.08 when 11 then 1.45 else 1.55
               end
             * case extract(isodow from c._day)::int
                   when 1 then 1.05 when 4 then 1.02 when 5 then 0.95
                   when 6 then 0.90 when 7 then 1.08 else 1.00
               end
             -- Black Friday week, on top of November's own lift.
             * case
                   when to_char(c._day, 'MMDD') between '1124' and '1201'
                       then 1.35
                   else 1.00
               end
             * (0.85 + 0.30 * demo_sales.rnd('vol:' || c._day))
         )::int                                           _orders
    from calendar c
    where 1=1
)
,day_pool as (
    select
         v._day                                           _day
        ,v._t                                             _t
        ,v._orders                                        _orders
        -- The pool of customer keys an order may draw from grows with cumulative volume,
        -- so customers are numbered in acquisition order and "new" emerges on its own.
        ,greatest(
             25
            ,round(25 + 0.5 * coalesce(
                 sum(v._orders) over (order by v._day rows between unbounded preceding and 1 preceding)
                ,0))
         )::int                                           _pool
    from day_volume v
    where 1=1
)
,order_slot as (
    select
         p._day                                           _day
        ,p._t                                             _t
        ,p._pool                                          _pool
        ,s                                                _seq
        -- Stable per-order hash key, assigned BEFORE any order is dropped, so removing one
        -- order never reshuffles the noise of the others.
        ,p._day || ':' || s                               _seed
    from day_pool p
    cross join lateral generate_series(1, p._orders) s
    where 1=1
)
,order_channel as (
    select
         o._day                                           _day
        ,o._t                                             _t
        ,o._pool                                          _pool
        ,o._seq                                           _seq
        ,o._seed                                          _seed
        -- Shares sum to 1 at every t: organic .22→.26, paid search .30→.20,
        -- paid social .18→.14, email .10→.18, direct .14→.16, referral .06.
        ,case
             when demo_sales.rnd('ch:' || o._seed) < 0.22 + 0.04 * o._t
                 then 1
             when demo_sales.rnd('ch:' || o._seed) < 0.52 - 0.06 * o._t
                 then 2
             when demo_sales.rnd('ch:' || o._seed) < 0.70 - 0.10 * o._t
                 then 3
             when demo_sales.rnd('ch:' || o._seed) < 0.80 - 0.02 * o._t
                 then 4
             when demo_sales.rnd('ch:' || o._seed) < 0.94
                 then 5
             else 6
         end                                              _channel_key
    from order_slot o
    where 1=1
)
,order_kept as (
    select
         c._day                                           _day
        ,c._t                                             _t
        ,c._pool                                          _pool
        ,c._seq                                           _seq
        ,c._seed                                          _seed
        ,c._channel_key                                   _channel_key
    from order_channel c
    where 1=1
        -- Story beat 1: the paid-search budget is cut for two months. The lost orders are
        -- not redistributed — that is the point: total volume dips, not just the mix.
        and not (
            c._channel_key = 2
            and c._day between date '2025-06-01' and date '2025-07-31'
            and demo_sales.rnd('cut:' || c._seed) > 0.35
        )
)
select
     row_number() over (order by k._day, k._seq)::int     order_id
    ,(k._day::timestamp + make_interval(secs => floor(
          3600 * (7 + 16 * (demo_sales.rnd('h1:' || k._seed) + demo_sales.rnd('h2:' || k._seed)) / 2)
      )::double precision)) at time zone 'UTC'            ordered_at
    ,k._day                                               order_day
    ,k._seed                                              order_seed
    ,k._channel_key::smallint                             channel_key
    -- power(h, 1.5) leans the draw toward low keys: the earliest cohort is the loyal one.
    ,(1 + floor(power(demo_sales.rnd('cu:' || k._seed), 1.5) * k._pool))::int    customer_key
    ,case
         when demo_sales.rnd('st:' || k._seed) < case when k._channel_key = 3 then 0.10 else 0.05 end
             then 'returned'
         when demo_sales.rnd('st:' || k._seed) < case when k._channel_key = 3 then 0.13 else 0.08 end
             then 'cancelled'
         else 'completed'
     end                                                  order_status
from order_kept k
where 1=1;

-- ---------------------------------------------------------------------------
-- stage_line — one row per (order, product). Products are drawn from a per-month CDF so
-- toys surge in December and tents in July; duplicates within an order merge into quantity.
-- ---------------------------------------------------------------------------

create table demo_sales.stage_line as
with product_weight as (
    select
         p.product_key                                    _product_key
        ,m                                                _month
        -- Cheaper sells more; the hash keeps it from being a clean function of price;
        -- product 1 is the hero the stock-out beat needs.
        ,(0.5 + demo_sales.rnd('pop:' || p.product_key))
             * power(40.0 / (p.list_price + 15), 0.6)
             * case when p.product_key = 1 then 2.2 else 1.0 end
             * case
                   when p.category = 'Toys & Games' and m = 12
                       then 2.20
                   when p.category = 'Toys & Games' and m = 11
                       then 1.80
                   when p.category = 'Toys & Games'
                       then 0.85
                   when p.category = 'Sports & Outdoors' and m between 5 and 8
                       then 1.35
                   when p.category = 'Sports & Outdoors' and m in (12, 1, 2)
                       then 0.75
                   when p.category = 'Electronics' and m = 11
                       then 1.50
                   when p.category = 'Electronics' and m = 12
                       then 1.30
                   when p.category = 'Apparel' and m in (9, 10, 11)
                       then 1.18
                   when p.category = 'Beauty & Care' and m in (2, 12)
                       then 1.15
                   when p.category = 'Home & Kitchen' and m = 11
                       then 1.15
                   else 1.00
               end                                        _weight
    from demo_sales.dim_product p
    cross join generate_series(1, 12) m
    where 1=1
)
,product_hi as (
    select
         w._product_key                                   _product_key
        ,w._month                                         _month
        ,sum(w._weight) over (partition by w._month order by w._product_key)
             / sum(w._weight) over (partition by w._month)    _hi
    from product_weight w
    where 1=1
)
,product_cdf as (
    -- _lo is the previous row's _hi, not a second division: the bands are then contiguous
    -- to the last digit, so a draw can never fall in a rounding gap or match two products.
    select
         h._product_key                                   _product_key
        ,h._month                                         _month
        ,coalesce(lag(h._hi) over (partition by h._month order by h._product_key), 0)    _lo
        ,h._hi                                            _hi
    from product_hi h
    where 1=1
)
,line_slot as materialized (
    -- Materialized so each line's product draw is hashed once, not once per candidate
    -- product in the range join below.
    select
         o.order_id                                       _order_id
        ,o.order_day                                      _order_day
        ,o.order_seed                                     _order_seed
        ,o.customer_key                                   _customer_key
        ,s                                                _slot
        ,demo_sales.rnd('pr:' || o.order_seed || ':' || s)    _draw
    from demo_sales.stage_order o
    cross join lateral generate_series(
         1
        ,case
             when demo_sales.rnd('nl:' || o.order_seed) < 0.52
                 then 1
             when demo_sales.rnd('nl:' || o.order_seed) < 0.80
                 then 2
             when demo_sales.rnd('nl:' || o.order_seed) < 0.93
                 then 3
             else 4
         end
    ) s
    where 1=1
)
,line_product as (
    select
         l._order_id                                      _order_id
        ,l._order_day                                     _order_day
        ,c._product_key                                   _product_key
        ,case
             when demo_sales.rnd('q:' || l._order_seed || ':' || l._slot) < 0.70
                 then 1
             when demo_sales.rnd('q:' || l._order_seed || ':' || l._slot) < 0.90
                 then 2
             when demo_sales.rnd('q:' || l._order_seed || ':' || l._slot) < 0.97
                 then 3
             else 4
         end
         -- Business buyers order in multiples. Same hash dim_customer uses for segment.
         * case when demo_sales.rnd('sg:' || l._customer_key) < 0.16 then 2 else 1 end    _quantity
    from line_slot l
    join product_cdf c
        on c._month = extract(month from l._order_day)::int
        and l._draw >= c._lo
        and l._draw <  c._hi
    where 1=1
        -- Story beat 2: the hero product is out of stock through the peak. Lost sales, not
        -- substituted ones — an order that held nothing else disappears with it.
        and not (
            c._product_key = 1
            and l._order_day between date '2025-11-20' and date '2025-12-10'
        )
)
select
     p._order_id                     order_id
    ,p._product_key::smallint        product_key
    ,sum(p._quantity)::smallint      quantity
from line_product p
where 1=1
group by
     p._order_id
    ,p._product_key;

-- ---------------------------------------------------------------------------
-- dim_customer — only customers who ended up with at least one line.
-- ---------------------------------------------------------------------------

insert into demo_sales.dim_customer
    (customer_key, customer_code, country_code, country_name, region, segment, first_order_date)
with country (country_code, country_name, region, lo, hi) as (
    values
         ('US', 'United States',  'North America', 0.00, 0.38)
        ,('GB', 'United Kingdom', 'Europe',        0.38, 0.52)
        ,('DE', 'Germany',        'Europe',        0.52, 0.64)
        ,('FR', 'France',         'Europe',        0.64, 0.72)
        ,('CA', 'Canada',         'North America', 0.72, 0.79)
        ,('AU', 'Australia',      'APAC',          0.79, 0.85)
        ,('NL', 'Netherlands',    'Europe',        0.85, 0.90)
        ,('ES', 'Spain',          'Europe',        0.90, 0.94)
        ,('SE', 'Sweden',         'Europe',        0.94, 0.97)
        ,('IT', 'Italy',          'Europe',        0.97, 1.00)
)
,active_customer as (
    select
         o.customer_key                                   _customer_key
        ,(min(o.ordered_at) at time zone 'UTC')::date     _first_order_date
    from demo_sales.stage_order o
    where 1=1
        and exists (
            select 1
            from demo_sales.stage_line l
            where 1=1
                and l.order_id = o.order_id
        )
    group by o.customer_key
)
select
     a._customer_key                                      _customer_key
    ,'C-' || lpad(a._customer_key::text, 6, '0')          _customer_code
    ,c.country_code                                       _country_code
    ,c.country_name                                       _country_name
    ,c.region                                             _region
    ,case
         when demo_sales.rnd('sg:' || a._customer_key) < 0.16
             then 'business'
         else 'consumer'
     end                                                  _segment
    ,a._first_order_date                                  _first_order_date
from active_customer a
join country c
    on demo_sales.rnd('co:' || a._customer_key) >= c.lo
    and demo_sales.rnd('co:' || a._customer_key) <  c.hi
where 1=1;

-- ---------------------------------------------------------------------------
-- fact_order_line
-- ---------------------------------------------------------------------------

insert into demo_sales.fact_order_line
    (order_id, line_number, ordered_at, customer_key, product_key, channel_key, order_status,
     is_first_order, quantity, unit_price, discount_amount, net_amount, cost_amount)
with order_live as (
    -- Orders that still hold at least one line, ranked per customer AFTER the stock-out
    -- removed some — so "first order" is the first order that actually exists.
    select
         o.order_id                                       _order_id
        ,o.ordered_at                                     _ordered_at
        ,o.order_day                                      _order_day
        ,o.order_seed                                     _order_seed
        ,o.customer_key                                   _customer_key
        ,o.channel_key                                    _channel_key
        ,o.order_status                                   _order_status
        ,row_number() over (partition by o.customer_key order by o.ordered_at, o.order_id) = 1    _is_first_order
    from demo_sales.stage_order o
    where 1=1
        and exists (
            select 1
            from demo_sales.stage_line l
            where 1=1
                and l.order_id = o.order_id
        )
)
,priced as (
    select
         o._order_id                                      _order_id
        ,row_number() over (partition by o._order_id order by l.product_key)::smallint    _line_number
        ,o._ordered_at                                    _ordered_at
        ,o._customer_key                                  _customer_key
        ,l.product_key                                    _product_key
        ,o._channel_key                                   _channel_key
        ,o._order_status                                  _order_status
        ,o._is_first_order                                _is_first_order
        ,l.quantity                                       _quantity
        -- list_price is today's price; earlier years were charged a little less.
        ,round(p.list_price * case extract(year from o._order_day)::int
                                  when 2024 then 0.94
                                  when 2025 then 0.97
                                  else 1.00
                              end, 2)                     _unit_price
        ,round(p.unit_cost * case extract(year from o._order_day)::int
                                 when 2024 then 0.95
                                 when 2025 then 0.98
                                 else 1.00
                             end, 2)                      _unit_cost
        ,case
             -- Black Friday week: most lines go out at 20% off.
             when to_char(o._order_day, 'MMDD') between '1124' and '1201'
                  and demo_sales.rnd('bf:' || o._order_seed || ':' || l.product_key) < 0.60
                 then 0.20
             -- Email is the coupon channel.
             when o._channel_key = 4
                  and demo_sales.rnd('em:' || o._order_seed) < 0.35
                 then 0.10
             -- Background promo noise: 5 / 10 / 15%.
             when demo_sales.rnd('dc:' || o._order_seed) < 0.08
                 then 0.05 * (1 + floor(3 * demo_sales.rnd('dp:' || o._order_seed)))
             else 0
         end                                              _discount_pct
    from order_live o
    join demo_sales.stage_line l
        on l.order_id = o._order_id
    join demo_sales.dim_product p
        on p.product_key = l.product_key
    where 1=1
)
select
     r._order_id                                                      _order_id
    ,r._line_number                                                   _line_number
    ,r._ordered_at                                                    _ordered_at
    ,r._customer_key                                                  _customer_key
    ,r._product_key                                                   _product_key
    ,r._channel_key                                                   _channel_key
    ,r._order_status                                                  _order_status
    ,r._is_first_order                                                _is_first_order
    ,r._quantity                                                      _quantity
    ,r._unit_price                                                    _unit_price
    ,round(r._quantity * r._unit_price * r._discount_pct, 2)          _discount_amount
    ,r._quantity * r._unit_price
         - round(r._quantity * r._unit_price * r._discount_pct, 2)    _net_amount
    ,round(r._quantity * r._unit_cost, 2)                             _cost_amount
from priced r
where 1=1
order by
     r._order_id
    ,r._line_number;

-- ---------------------------------------------------------------------------
-- Clean up — nothing in the schema but the four warehouse tables.
-- ---------------------------------------------------------------------------

drop table demo_sales.stage_line;
drop table demo_sales.stage_order;
-- Functions are executable by PUBLIC by default; cube_reader has no use for this one.
drop function demo_sales.rnd(text);

analyze demo_sales.dim_product;
analyze demo_sales.dim_customer;
analyze demo_sales.dim_channel;
analyze demo_sales.fact_order_line;
