# Analytical Query Patterns

## Table of Contents

1. [Window Function Fundamentals](#window-functions)
2. [Frame Clauses](#frame-clauses)
3. [Ranking Patterns](#ranking)
4. [Top-N Per Group](#top-n-per-group)
5. [Running Totals and Moving Averages](#running-totals)
6. [Gap and Island Detection](#gaps-and-islands)
7. [Period Comparison (YoY, MoM)](#period-comparison)
8. [Pivoting and Unpivoting](#pivoting)
9. [Cumulative Distribution](#cumulative-distribution)
10. [Optimization Techniques](#optimization)

---

## 1. Window Function Fundamentals

Window functions compute a value across a set of rows related to the current row, without collapsing them (unlike GROUP BY).

```sql
SELECT
    dept_id,
    name,
    salary,
    avg(salary) OVER (PARTITION BY dept_id) AS dept_avg,
    salary - avg(salary) OVER (PARTITION BY dept_id) AS diff_from_avg
FROM employees;
```

**Key anatomy:**

```
function_name(...) OVER (
    [PARTITION BY expr, ...]    -- Divides rows into groups (like GROUP BY, but no collapse)
    [ORDER BY expr, ...]        -- Defines order within each partition
    [frame_clause]              -- Defines which rows in the partition to include
)
```

### Available Window Functions

**Aggregate functions (usable as window functions):**
`sum()`, `avg()`, `count()`, `min()`, `max()`, `string_agg()`, `array_agg()`, `jsonb_agg()`

**Ranking functions:**
`row_number()`, `rank()`, `dense_rank()`, `ntile(n)`

**Offset functions:**
`lag(expr, n, default)`, `lead(expr, n, default)`, `first_value(expr)`, `last_value(expr)`, `nth_value(expr, n)`

**Distribution functions:**
`cume_dist()`, `percent_rank()`

### Named Windows

Avoid repeating the same OVER clause:

```sql
SELECT
    name,
    salary,
    avg(salary) OVER w AS dept_avg,
    rank() OVER w AS dept_rank,
    salary - first_value(salary) OVER w AS diff_from_highest
FROM employees
WINDOW w AS (PARTITION BY dept_id ORDER BY salary DESC);
```

---

## 2. Frame Clauses

The frame clause defines which rows within the partition are visible to the window function for the current row. This is where most window function misunderstandings happen.

### Frame Syntax

```
{ ROWS | RANGE | GROUPS } BETWEEN frame_start AND frame_end
```

**Frame boundaries:**

- `UNBOUNDED PRECEDING` — From the start of the partition
- `N PRECEDING` — N rows/range units before current
- `CURRENT ROW` — The current row
- `N FOLLOWING` — N rows/range units after current
- `UNBOUNDED FOLLOWING` — To the end of the partition

### Default Frame (The Trap)

**When ORDER BY is specified:** Default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`
**When ORDER BY is absent:** Default frame is `RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` (the entire partition)

This means `sum(x) OVER (ORDER BY date)` gives a **running sum**, not a total. This catches people off guard:

```sql
-- Running sum (because ORDER BY triggers the default frame)
SELECT date, amount, sum(amount) OVER (ORDER BY date) AS running_total
FROM sales;

-- Total sum per partition (no ORDER BY → full partition frame)
SELECT date, amount, sum(amount) OVER () AS grand_total
FROM sales;

-- If you want a total sum but also want ordering, be explicit:
SELECT date, amount,
    sum(amount) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS grand_total
FROM sales;
```

### ROWS vs RANGE vs GROUPS

- **ROWS**: Physical row count. `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` means literally 3 rows.
- **RANGE**: Logical value range. `RANGE BETWEEN 2 PRECEDING AND CURRENT ROW` includes all rows whose ORDER BY value is within 2 of the current row's value. Ties are included.
- **GROUPS**: Group of peers. `GROUPS BETWEEN 1 PRECEDING AND CURRENT ROW` means the current row's peer group plus the previous peer group.

```sql
-- 7-day moving average (using RANGE with dates)
SELECT
    date,
    amount,
    avg(amount) OVER (
        ORDER BY date
        RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW
    ) AS moving_avg_7d
FROM daily_sales;

-- 3-row moving average (physical rows)
SELECT
    date,
    amount,
    avg(amount) OVER (
        ORDER BY date
        ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING
    ) AS moving_avg_3
FROM daily_sales;
```

---

## 3. Ranking Patterns

### ROW_NUMBER vs RANK vs DENSE_RANK

```sql
SELECT
    name, dept_id, salary,
    row_number() OVER (ORDER BY salary DESC) AS rn,    -- 1,2,3,4,5 (no ties)
    rank()       OVER (ORDER BY salary DESC) AS rnk,   -- 1,2,2,4,5 (ties skip)
    dense_rank() OVER (ORDER BY salary DESC) AS drnk   -- 1,2,2,3,4 (ties don't skip)
FROM employees;
```

**When to use which:**

- `ROW_NUMBER`: You need exactly one row per rank (deduplicate, pagination, top-1)
- `RANK`: You want ties to share a rank but reflect the gap (competitions: 1st, 2nd, 2nd, 4th)
- `DENSE_RANK`: You want ties to share a rank with no gaps (pricing tiers, percentile buckets)

### NTILE (Divide into N Buckets)

```sql
-- Split customers into 4 quartiles by total spend
SELECT
    customer_id,
    total_spent,
    ntile(4) OVER (ORDER BY total_spent DESC) AS quartile
FROM customer_totals;
-- quartile 1 = top 25%, quartile 4 = bottom 25%
```

---

## 4. Top-N Per Group

Three approaches, in order of typical preference:

### Approach 1: LATERAL Join (Best for Large Tables with Index)

```sql
-- Top 3 orders per customer
SELECT c.id, c.name, t.order_id, t.total
FROM customers c
JOIN LATERAL (
    SELECT o.id AS order_id, o.total
    FROM orders o
    WHERE o.customer_id = c.id
    ORDER BY o.total DESC
    LIMIT 3
) t ON true;
```

**Requires:** Index on `orders(customer_id, total DESC)`
**Performance:** Scans only 3 rows per customer via index. Best when the outer table is small-to-medium and the inner table is large.

### Approach 2: ROW_NUMBER Window Function (Most Flexible)

```sql
WITH ranked AS (
    SELECT
        customer_id,
        id AS order_id,
        total,
        row_number() OVER (PARTITION BY customer_id ORDER BY total DESC) AS rn
    FROM orders
)
SELECT * FROM ranked WHERE rn <= 3;
```

**Performance:** Scans the entire orders table and ranks everything, then filters. Fine for medium tables or when you don't have a good index for LATERAL. Also works when the grouping is complex.

### Approach 3: DISTINCT ON (Top-1 Only, PG-Specific)

```sql
-- Latest order per customer
SELECT DISTINCT ON (customer_id)
    customer_id, id AS order_id, total, created_at
FROM orders
ORDER BY customer_id, created_at DESC;
```

**Performance:** Very fast with an index on `(customer_id, created_at DESC)`. Only works for top-1 (not top-N).

### Performance Comparison

| Approach    | Top-1 | Top-N | Needs Index        | Scans All Rows?        |
| ----------- | ----- | ----- | ------------------ | ---------------------- |
| LATERAL     | Yes   | Yes   | Inner table        | No (early termination) |
| ROW_NUMBER  | Yes   | Yes   | Helps but optional | Yes                    |
| DISTINCT ON | Yes   | No    | Composite index    | No (index scan)        |

---

## 5. Running Totals and Moving Averages

### Running Total

```sql
SELECT
    date,
    amount,
    sum(amount) OVER (ORDER BY date) AS running_total
FROM daily_sales;
```

### Running Total by Group

```sql
SELECT
    region,
    date,
    amount,
    sum(amount) OVER (PARTITION BY region ORDER BY date) AS regional_running_total
FROM daily_sales;
```

### Moving Average (Fixed Window)

```sql
-- 7-row moving average
SELECT
    date,
    amount,
    avg(amount) OVER (
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS ma_7
FROM daily_sales;
```

### Moving Average (Calendar-Based)

```sql
-- True 7-day moving average (handles missing dates correctly)
SELECT
    date,
    amount,
    avg(amount) OVER (
        ORDER BY date
        RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW
    ) AS ma_7day
FROM daily_sales;
```

The difference: ROWS counts physical rows (misses gaps); RANGE uses the actual date value (correct even if some dates have no sales).

### Exponential Moving Average (Approximation)

PG doesn't have a built-in EMA. Approximate with a recursive CTE:

```sql
WITH RECURSIVE ema AS (
    SELECT date, amount, amount::numeric AS ema_value
    FROM daily_sales
    WHERE date = (SELECT min(date) FROM daily_sales)

    UNION ALL

    SELECT s.date, s.amount,
           0.3 * s.amount + 0.7 * e.ema_value  -- alpha = 0.3
    FROM daily_sales s
    JOIN ema e ON s.date = (
        SELECT min(date) FROM daily_sales WHERE date > e.date
    )
)
SELECT * FROM ema ORDER BY date;
```

---

## 6. Gap and Island Detection

Finding consecutive sequences (islands) and breaks (gaps) in data.

### Islands: Consecutive Date Ranges

```sql
-- Find continuous ranges of activity per user
WITH grp AS (
    SELECT
        user_id,
        active_date,
        active_date - (row_number() OVER (PARTITION BY user_id ORDER BY active_date))::int AS island_id
    FROM user_activity
)
SELECT
    user_id,
    min(active_date) AS island_start,
    max(active_date) AS island_end,
    count(*) AS consecutive_days
FROM grp
GROUP BY user_id, island_id
ORDER BY user_id, island_start;
```

**How it works:** When dates are consecutive, `date - row_number` gives the same value for each row in the sequence. A gap causes the value to shift, creating a new group.

### Islands: Consecutive Value Runs

```sql
-- Find consecutive runs of the same status
WITH grp AS (
    SELECT
        id, status, created_at,
        row_number() OVER (ORDER BY created_at)
        - row_number() OVER (PARTITION BY status ORDER BY created_at) AS island_id
    FROM events
)
SELECT
    status,
    min(created_at) AS run_start,
    max(created_at) AS run_end,
    count(*) AS run_length
FROM grp
GROUP BY status, island_id
ORDER BY run_start;
```

### Gaps: Missing Dates

```sql
-- Find dates with no sales (gaps in daily_sales)
WITH date_range AS (
    SELECT generate_series(
        (SELECT min(date) FROM daily_sales),
        (SELECT max(date) FROM daily_sales),
        '1 day'::interval
    )::date AS date
)
SELECT dr.date
FROM date_range dr
LEFT JOIN daily_sales ds ON ds.date = dr.date
WHERE ds.date IS NULL;
```

---

## 7. Period Comparison (YoY, MoM)

### Year-over-Year with LAG

```sql
SELECT
    date_trunc('month', date) AS month,
    sum(amount) AS revenue,
    lag(sum(amount)) OVER (ORDER BY date_trunc('month', date)) AS prev_month,
    lag(sum(amount), 12) OVER (ORDER BY date_trunc('month', date)) AS same_month_last_year,
    round(
        (sum(amount) - lag(sum(amount), 12) OVER (ORDER BY date_trunc('month', date)))
        / nullif(lag(sum(amount), 12) OVER (ORDER BY date_trunc('month', date)), 0) * 100,
        1
    ) AS yoy_pct_change
FROM daily_sales
GROUP BY date_trunc('month', date)
ORDER BY month;
```

### Self-Join Approach (More Flexible for Complex Comparisons)

```sql
WITH monthly AS (
    SELECT
        date_trunc('month', date) AS month,
        sum(amount) AS revenue
    FROM daily_sales
    GROUP BY 1
)
SELECT
    curr.month,
    curr.revenue AS current_revenue,
    prev.revenue AS last_year_revenue,
    round((curr.revenue - prev.revenue) / nullif(prev.revenue, 0) * 100, 1) AS yoy_pct
FROM monthly curr
LEFT JOIN monthly prev ON prev.month = curr.month - interval '1 year';
```

---

## 8. Pivoting and Unpivoting

### Pivot with FILTER Clause (PG 9.4+)

The cleanest PG way to pivot — no extensions needed:

```sql
-- Monthly revenue by product category
SELECT
    date_trunc('month', o.date) AS month,
    sum(amount) FILTER (WHERE category = 'Electronics') AS electronics,
    sum(amount) FILTER (WHERE category = 'Clothing') AS clothing,
    sum(amount) FILTER (WHERE category = 'Food') AS food
FROM orders o
GROUP BY 1
ORDER BY 1;
```

### Pivot with crosstab (tablefunc Extension)

For dynamic or many-valued pivots:

```sql
CREATE EXTENSION IF NOT EXISTS tablefunc;

SELECT *
FROM crosstab(
    'SELECT region, quarter, revenue FROM quarterly_sales ORDER BY 1,2',
    'SELECT DISTINCT quarter FROM quarterly_sales ORDER BY 1'
) AS ct(region text, q1 numeric, q2 numeric, q3 numeric, q4 numeric);
```

### Unpivot (Columns to Rows)

```sql
-- Turn quarterly columns into rows
SELECT region, quarter, revenue
FROM quarterly_wide
CROSS JOIN LATERAL (
    VALUES
        ('Q1', q1),
        ('Q2', q2),
        ('Q3', q3),
        ('Q4', q4)
) AS t(quarter, revenue);
```

---

## 9. Cumulative Distribution

```sql
SELECT
    name,
    salary,
    cume_dist() OVER (ORDER BY salary) AS cumulative_dist,
    -- 0 to 1: fraction of rows with salary <= current
    percent_rank() OVER (ORDER BY salary) AS pct_rank,
    -- 0 to 1: (rank - 1) / (total - 1)
    ntile(100) OVER (ORDER BY salary) AS percentile
    -- Approximate percentile bucket
FROM employees;
```

### Exact Percentile (Aggregate, Not Window)

```sql
-- Median salary per department
SELECT
    dept_id,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY salary) AS median_salary,
    percentile_cont(0.95) WITHIN GROUP (ORDER BY salary) AS p95_salary,
    percentile_disc(0.5) WITHIN GROUP (ORDER BY salary) AS median_discrete
FROM employees
GROUP BY dept_id;
```

`percentile_cont` interpolates; `percentile_disc` returns an actual value.

---

## 10. Optimization Techniques

### Push Filters Before Window Functions

Window functions are computed after WHERE and HAVING. Filtering after the window is wasteful if you can filter before:

```sql
-- SLOW: computes rank for ALL orders, then filters
SELECT * FROM (
    SELECT *, row_number() OVER (PARTITION BY customer_id ORDER BY total DESC) AS rn
    FROM orders
) sub WHERE rn <= 3 AND status = 'completed';

-- FASTER: filter first, then rank
SELECT * FROM (
    SELECT *, row_number() OVER (PARTITION BY customer_id ORDER BY total DESC) AS rn
    FROM orders
    WHERE status = 'completed'  -- Moved inside
) sub WHERE rn <= 3;
```

### Use Indexes That Match Window PARTITION/ORDER

```sql
-- For: row_number() OVER (PARTITION BY customer_id ORDER BY created_at DESC)
-- Create:
CREATE INDEX idx_orders_cust_date ON orders (customer_id, created_at DESC);
-- This lets PG use an index scan instead of sorting.
```

### Avoid Redundant Sorts

If multiple window functions use the same PARTITION BY and ORDER BY, PG sorts once. But different orderings trigger multiple sorts. Consolidate where possible using named windows.

### FILTER vs CASE in Aggregates

```sql
-- FILTER is cleaner and can be slightly faster
sum(amount) FILTER (WHERE status = 'paid') AS paid_total

-- CASE equivalent (works everywhere, but less readable)
sum(CASE WHEN status = 'paid' THEN amount END) AS paid_total
```

Both produce identical plans in most PG versions, but FILTER is the idiomatic PG way.

### Materialized Views for Expensive Analytics

If a dashboard query takes 30+ seconds and the data doesn't need real-time freshness:

```sql
CREATE MATERIALIZED VIEW mv_monthly_metrics AS
SELECT
    date_trunc('month', date) AS month,
    region,
    sum(amount) AS revenue,
    count(DISTINCT customer_id) AS unique_customers,
    avg(amount) AS avg_order_value
FROM orders
GROUP BY 1, 2;

CREATE INDEX ON mv_monthly_metrics (month, region);

-- Refresh (non-blocking with CONCURRENTLY, requires unique index)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_metrics;
```
