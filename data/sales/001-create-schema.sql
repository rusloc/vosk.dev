-- Demo warehouse — synthetic ONLINE SALES star schema.
--
-- Backs the Cube showcase on vosk.dev/work (docs/08-cube-sales-showcase.md). Every figure in it
-- is SYNTHETIC and generated from this directory; no client data, and no personal data even
-- synthetic — a customer is a code, a country and a segment.
--
-- Target: schema `demo_sales` in Supabase project howpxpdnjjzdwqrgxkee — the lead engine's
-- project, which has no free sibling to move to. Isolation is by schema and by role: nothing
-- here touches `public`, the schema is NOT exposed to the Data API, and the only reader is
-- `cube_reader` (004-cube-role.sql).
--
-- Grain: one row per ORDER LINE. `order_id` rides on the fact as a degenerate dimension.
--
-- Deliberately absent:
--   dim_date        — Cube's `time` dimension derives day/week/month/quarter/year from
--                     `ordered_at`. A date table would be modelled twice and used once.
--   order-level $   — shipping, order discounts. Stored at line grain they fan out and
--                     double-count on the first SUM. Order count is count(distinct order_id).
--   uuid / deleted_at / metadata jsonb / updated_at — those serve mutable OLTP entities.
--                     This warehouse's only lifecycle is drop-and-rebuild.
--
-- NOT a tracked migration (docs/08 §2, D2): applied via MCP `execute_sql`, so the lead
-- engine's `schema_migrations` history stays the lead engine's.
--
-- Idempotent: drops and rebuilds. That also drops cube_reader's grants and policies —
-- re-run 004-cube-role.sql after every rebuild.

drop schema if exists demo_sales cascade;
create schema demo_sales;

comment on schema demo_sales is
    'SYNTHETIC online-sales warehouse for the public vosk.dev showcase. Read by Cube via cube_reader. Not part of the lead engine.';

-- ---------------------------------------------------------------------------
-- Dimensions
-- ---------------------------------------------------------------------------

create table demo_sales.dim_product (
    product_key     smallint        primary key,
    sku             text            not null unique,
    product_name    text            not null,
    category        text            not null,
    subcategory     text            not null,
    -- Today's shelf price. What a line was actually charged lives on the fact.
    list_price      numeric(10, 2)  not null,
    unit_cost       numeric(10, 2)  not null,
    constraint dim_product_price_ck check (list_price > 0 and unit_cost > 0)
);

create table demo_sales.dim_customer (
    customer_key        integer     primary key,
    customer_code       text        not null unique,
    country_code        char(2)     not null,
    country_name        text        not null,
    region              text        not null,
    segment             text        not null,
    first_order_date    date        not null,
    constraint dim_customer_segment_ck check (segment in ('consumer', 'business'))
);

create table demo_sales.dim_channel (
    channel_key     smallint    primary key,
    channel_name    text        not null unique,
    -- paid / owned / earned: the grouping a marketing lead actually asks for.
    channel_group   text        not null,
    constraint dim_channel_group_ck check (channel_group in ('paid', 'owned', 'earned'))
);

-- ---------------------------------------------------------------------------
-- Fact
-- ---------------------------------------------------------------------------

create table demo_sales.fact_order_line (
    order_line_key  bigint          generated always as identity primary key,
    -- Degenerate dimension: no dim_order exists, the id itself is the order.
    order_id        integer         not null,
    line_number     smallint        not null,
    ordered_at      timestamptz     not null,
    customer_key    integer         not null references demo_sales.dim_customer (customer_key),
    product_key     smallint        not null references demo_sales.dim_product (product_key),
    channel_key     smallint        not null references demo_sales.dim_channel (channel_key),
    order_status    text            not null,
    -- True on every line of a customer's first order: new-vs-returning without a self-join.
    is_first_order  boolean         not null,
    quantity        smallint        not null,
    -- Price actually charged — list_price drifts, history must not.
    unit_price      numeric(10, 2)  not null,
    discount_amount numeric(10, 2)  not null default 0,
    net_amount      numeric(12, 2)  not null,
    cost_amount     numeric(12, 2)  not null,
    constraint fact_order_line_grain_uq  unique (order_id, line_number),
    constraint fact_order_line_status_ck check (order_status in ('completed', 'returned', 'cancelled')),
    constraint fact_order_line_qty_ck    check (quantity > 0),
    -- The identity every revenue figure rests on, enforced rather than trusted.
    constraint fact_order_line_net_ck    check (net_amount = quantity * unit_price - discount_amount)
);

-- Every dashboard query filters by period first. The FK indexes keep the performance
-- advisor quiet; at ~70k rows the planner will mostly ignore them, which is fine.
create index fact_order_line_ordered_at_idx   on demo_sales.fact_order_line (ordered_at);
create index fact_order_line_customer_key_idx on demo_sales.fact_order_line (customer_key);
create index fact_order_line_product_key_idx  on demo_sales.fact_order_line (product_key);
create index fact_order_line_channel_key_idx  on demo_sales.fact_order_line (channel_key);

-- ---------------------------------------------------------------------------
-- Closed by default
-- ---------------------------------------------------------------------------

-- RLS on from the first statement, with no policy: nothing but the owner can read until
-- 004 adds cube_reader's. The data is public by design — this is for the day someone adds
-- `demo_sales` to the exposed API schemas without thinking about it.
alter table demo_sales.dim_product     enable row level security;
alter table demo_sales.dim_customer    enable row level security;
alter table demo_sales.dim_channel     enable row level security;
alter table demo_sales.fact_order_line enable row level security;
