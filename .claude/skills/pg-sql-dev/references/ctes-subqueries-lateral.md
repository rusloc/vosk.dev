# CTEs, Subqueries, and LATERAL Joins

## Table of Contents

1. [Subquery Types](#subquery-types)
2. [Common Table Expressions (CTEs)](#ctes)
3. [LATERAL Joins](#lateral-joins)
4. [Decision Framework](#decision-framework)
5. [Refactoring Patterns](#refactoring-patterns)

---

## 1. Subquery Types

### Scalar Subquery

Returns exactly one row, one column. Can appear in SELECT list, WHERE, or anywhere a single value is expected.

```sql
-- Scalar subquery in SELECT (runs once per outer row — watch performance)
SELECT
    o.order_id,
    o.total,
    (SELECT avg(total) FROM orders WHERE customer_id = o.customer_id) AS customer_avg
FROM orders o;
```

**Performance note:** This executes the subquery for each outer row. On large tables, refactor to a CTE or JOIN:

```sql
-- Refactored: compute once, join once
WITH customer_avgs AS (
    SELECT customer_id, avg(total) AS avg_total
    FROM orders
    GROUP BY customer_id
)
SELECT o.order_id, o.total, ca.avg_total AS customer_avg
FROM orders o
JOIN customer_avgs ca ON ca.customer_id = o.customer_id;
```

### Row Subquery

Returns one row, multiple columns. Used with row constructors for comparison.

```sql
SELECT *
FROM products
WHERE (category_id, price) = (
    SELECT category_id, max(price)
    FROM products
    WHERE category_id = 5
);
```

### Table Subquery (Derived Table)

Returns a full result set. Appears in FROM clause. Must be aliased.

```sql
SELECT d.region, d.total_revenue
FROM (
    SELECT region, sum(amount) AS total_revenue
    FROM sales
    GROUP BY region
) d
WHERE d.total_revenue > 100000;
```

**When to use over a CTE:** When the result is used exactly once and the query is short enough that nesting doesn't hurt readability.

### EXISTS Subquery

Tests for the existence of rows. The most efficient semi-join pattern — the planner stops at the first match.

```sql
-- Semi-join: customers who have at least one order
SELECT c.*
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.id
);
```

**EXISTS vs IN:**

- `EXISTS` handles NULLs correctly and short-circuits.
- `IN` with a subquery can be slower if the subquery returns many rows with NULLs (three-valued logic).
- For most cases on modern PG, the planner converts between them. Prefer `EXISTS` for clarity and correctness.

### NOT EXISTS (Anti-Join)

Finds rows with no match. Two equivalent patterns — `NOT EXISTS` is generally preferred:

```sql
-- Pattern 1: NOT EXISTS (preferred — clear intent, NULL-safe)
SELECT c.*
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.id
);

-- Pattern 2: LEFT JOIN … IS NULL (equivalent plan, but intent is less obvious)
SELECT c.*
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;

-- Pattern 3: NOT IN (DANGEROUS if subquery can return NULLs — returns no rows)
-- Avoid this pattern unless you're certain the subquery column is NOT NULL.
SELECT c.*
FROM customers c
WHERE c.id NOT IN (SELECT customer_id FROM orders);
```

### ALL / ANY / SOME

Array-style comparisons against a subquery.

```sql
-- Products priced higher than ALL products in category 3
SELECT * FROM products
WHERE price > ALL (SELECT price FROM products WHERE category_id = 3);

-- Products priced higher than at least one product in category 3
SELECT * FROM products
WHERE price > ANY (SELECT price FROM products WHERE category_id = 3);
```

---

## 2. Common Table Expressions (CTEs)

### Basic CTE

```sql
WITH regional_sales AS (
    SELECT region, sum(amount) AS total_sales
    FROM orders
    GROUP BY region
),
top_regions AS (
    SELECT region
    FROM regional_sales
    WHERE total_sales > (SELECT sum(total_sales) / 10 FROM regional_sales)
)
SELECT o.region, o.product, sum(o.amount) AS product_sales
FROM orders o
JOIN top_regions tr ON o.region = tr.region
GROUP BY o.region, o.product;
```

**Why this is good:** `regional_sales` is computed once and referenced twice — once in `top_regions` and once implicitly through `top_regions`. Without the CTE, you'd either duplicate the aggregation or nest subqueries.

### Materialization Control (PG 12+)

Before PG 12, CTEs were always materialized (computed once, stored as a temp result). This made them "optimization fences" — the planner couldn't push WHERE conditions into them. PG 12+ changed this:

```sql
-- Let the planner decide (default in PG 12+; inlines if referenced once)
WITH recent_orders AS (
    SELECT * FROM orders WHERE created_at > now() - interval '30 days'
)
SELECT * FROM recent_orders WHERE status = 'pending';
-- Planner can push "status = 'pending'" into the CTE scan.

-- Force materialization (useful when the CTE is expensive and referenced multiple times)
WITH recent_orders AS MATERIALIZED (
    SELECT * FROM orders WHERE created_at > now() - interval '30 days'
)
SELECT * FROM recent_orders WHERE status = 'pending'
UNION ALL
SELECT * FROM recent_orders WHERE status = 'shipped';

-- Force inlining (useful to override planner's decision to materialize)
WITH recent_orders AS NOT MATERIALIZED (
    SELECT * FROM orders WHERE created_at > now() - interval '30 days'
)
SELECT * FROM recent_orders WHERE customer_id = 42;
```

**Rule of thumb:**

- Referenced once → planner inlines it automatically (PG 12+). Leave it alone.
- Referenced multiple times → planner materializes. This is usually what you want. Use `NOT MATERIALIZED` only if you've confirmed via EXPLAIN that inlining is faster.
- Contains side effects (volatile functions, data-modifying CTEs) → always materialized regardless.

### Recursive CTEs

For tree/graph traversal, sequence generation, or iterative computation.

```sql
-- Org chart: find all reports under a manager
WITH RECURSIVE org_tree AS (
    -- Base case: the root manager
    SELECT id, name, manager_id, 1 AS depth
    FROM employees
    WHERE id = 100

    UNION ALL

    -- Recursive step: find direct reports of current level
    SELECT e.id, e.name, e.manager_id, ot.depth + 1
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.id
    WHERE ot.depth < 10  -- Safety limit to prevent infinite recursion
)
SELECT * FROM org_tree ORDER BY depth, name;
```

**Critical safety rules for recursive CTEs:**

- Always include a depth/iteration limit in the WHERE clause of the recursive term.
- Use `UNION` (not `UNION ALL`) if cycles are possible — `UNION` deduplicates and prevents infinite loops. PG 14+ also has `CYCLE` detection:

```sql
WITH RECURSIVE search_graph AS (
    SELECT id, link_id, 1 AS depth
    FROM graph
    WHERE id = 1

    UNION ALL

    SELECT g.id, g.link_id, sg.depth + 1
    FROM graph g
    JOIN search_graph sg ON g.id = sg.link_id
)
CYCLE id SET is_cycle USING path  -- PG 14+ cycle detection
SELECT * FROM search_graph WHERE NOT is_cycle;
```

### Data-Modifying CTEs

CTEs can contain INSERT, UPDATE, DELETE, and you can chain them:

```sql
-- Archive old orders and return the count
WITH archived AS (
    DELETE FROM orders
    WHERE created_at < now() - interval '2 years'
    RETURNING *
),
inserted AS (
    INSERT INTO orders_archive
    SELECT * FROM archived
    RETURNING id
)
SELECT count(*) AS archived_count FROM inserted;
```

**Important:** Data-modifying CTEs are always materialized and execute exactly once, regardless of how many times they're referenced. They all see the same snapshot of the database — they don't see each other's changes.

---

## 3. LATERAL Joins

`LATERAL` allows a subquery in the FROM clause to reference columns from preceding FROM items. Without LATERAL, each subquery in FROM is independent.

### Core Concept

```sql
-- Without LATERAL (error: cannot reference o in subquery)
SELECT o.id, top_items.*
FROM orders o
JOIN (
    SELECT * FROM order_items WHERE order_id = o.id LIMIT 3  -- ERROR
) top_items ON true;

-- With LATERAL (subquery can "see" o)
SELECT o.id, top_items.*
FROM orders o
JOIN LATERAL (
    SELECT * FROM order_items oi
    WHERE oi.order_id = o.id
    ORDER BY oi.amount DESC
    LIMIT 3
) top_items ON true;
```

### Top-N Per Group (The Killer Use Case)

This is the single most important LATERAL pattern. Getting the top-N items per group efficiently:

```sql
-- Top 3 most expensive orders per customer
SELECT c.id, c.name, recent.*
FROM customers c
JOIN LATERAL (
    SELECT o.id AS order_id, o.total, o.created_at
    FROM orders o
    WHERE o.customer_id = c.id
    ORDER BY o.total DESC
    LIMIT 3
) recent ON true;
```

**Why LATERAL beats the window function approach here:**
The window function version (`ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY total DESC)`) must scan and rank ALL orders for ALL customers, then filter. With LATERAL + a composite index on `(customer_id, total DESC)`, PG does an index scan grabbing only 3 rows per customer — dramatically faster on large tables.

**Required index for this to be fast:**

```sql
CREATE INDEX idx_orders_customer_total ON orders (customer_id, total DESC);
```

### LATERAL with Set-Returning Functions

```sql
-- Unnest an array column and join back
SELECT p.id, p.name, t.tag
FROM products p
JOIN LATERAL unnest(p.tags) AS t(tag) ON true;

-- Equivalent shorthand (implicit LATERAL):
SELECT p.id, p.name, t.tag
FROM products p, unnest(p.tags) AS t(tag);
```

### LEFT JOIN LATERAL (preserve rows with no match)

```sql
-- All customers, with their latest order (if any)
SELECT c.id, c.name, latest.order_id, latest.total
FROM customers c
LEFT JOIN LATERAL (
    SELECT o.id AS order_id, o.total
    FROM orders o
    WHERE o.customer_id = c.id
    ORDER BY o.created_at DESC
    LIMIT 1
) latest ON true;
```

The `LEFT JOIN LATERAL ... ON true` pattern ensures customers with no orders still appear (with NULLs for the lateral columns).

### LATERAL vs Correlated Subquery

A correlated subquery in the SELECT list can only return one value. LATERAL can return multiple columns and multiple rows:

```sql
-- Correlated subquery: limited to one value
SELECT c.id,
    (SELECT max(o.total) FROM orders o WHERE o.customer_id = c.id) AS max_order
FROM customers c;

-- LATERAL: returns multiple columns from the same lookup
SELECT c.id, stats.max_total, stats.order_count, stats.avg_total
FROM customers c
LEFT JOIN LATERAL (
    SELECT max(total) AS max_total, count(*) AS order_count, avg(total) AS avg_total
    FROM orders
    WHERE customer_id = c.id
) stats ON true;
```

---

## 4. Decision Framework

**Choose a plain subquery when:**

- It's a simple EXISTS / NOT EXISTS check
- It's a one-off derived table referenced once
- The query is short and nesting doesn't hurt clarity

**Choose a CTE when:**

- The intermediate result is referenced 2+ times
- You want to name a logical step for readability
- You need recursion
- You need data-modifying sub-statements (INSERT/UPDATE/DELETE RETURNING)

**Choose LATERAL when:**

- You need top-N per group with early termination
- You need to pass outer row values into a set-returning function
- A correlated subquery needs to return multiple columns or rows
- You want the planner to use a nested loop with an indexed inner lookup

**Avoid:**

- CTEs as a readability crutch when a simple subquery is clearer (one-liners don't need names)
- LATERAL without a supporting index on the inner table (it degrades to nested-loop sequential scans)
- Deeply nested subqueries (>2 levels deep) — extract to CTEs for readability

---

## 5. Refactoring Patterns

### Pattern: Correlated Scalar Subquery → JOIN

**Before (slow — executes per row):**

```sql
SELECT
    e.id,
    e.name,
    (SELECT d.name FROM departments d WHERE d.id = e.dept_id) AS dept_name
FROM employees e;
```

**After:**

```sql
SELECT e.id, e.name, d.name AS dept_name
FROM employees e
LEFT JOIN departments d ON d.id = e.dept_id;
```

### Pattern: Multiple Correlated Subqueries → Single LATERAL

**Before (3 correlated subqueries — 3 scans per outer row):**

```sql
SELECT
    c.id,
    (SELECT count(*) FROM orders WHERE customer_id = c.id) AS order_count,
    (SELECT sum(total) FROM orders WHERE customer_id = c.id) AS total_spent,
    (SELECT max(created_at) FROM orders WHERE customer_id = c.id) AS last_order
FROM customers c;
```

**After (single scan per outer row):**

```sql
SELECT c.id, stats.order_count, stats.total_spent, stats.last_order
FROM customers c
LEFT JOIN LATERAL (
    SELECT count(*) AS order_count, sum(total) AS total_spent, max(created_at) AS last_order
    FROM orders WHERE customer_id = c.id
) stats ON true;
```

### Pattern: Nested Subqueries → CTE Chain

**Before (deeply nested, hard to follow):**

```sql
SELECT *
FROM (
    SELECT region, total_revenue, rank() OVER (ORDER BY total_revenue DESC) AS rnk
    FROM (
        SELECT region, sum(amount) AS total_revenue
        FROM (
            SELECT o.region, oi.amount
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.created_at >= '2024-01-01'
        ) base
        GROUP BY region
    ) agg
) ranked
WHERE rnk <= 5;
```

**After (clear logical steps):**

```sql
WITH recent_items AS (
    SELECT o.region, oi.amount
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.created_at >= '2024-01-01'
),
regional_revenue AS (
    SELECT region, sum(amount) AS total_revenue
    FROM recent_items
    GROUP BY region
),
ranked AS (
    SELECT region, total_revenue,
           rank() OVER (ORDER BY total_revenue DESC) AS rnk
    FROM regional_revenue
)
SELECT region, total_revenue
FROM ranked
WHERE rnk <= 5;
```

### Pattern: IN (SELECT ...) with NULLs → EXISTS

**Before (breaks silently if customer_id can be NULL):**

```sql
SELECT * FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders);
-- If any orders.customer_id is NULL, this returns ZERO rows.
```

**After (NULL-safe):**

```sql
SELECT c.*
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.id
);
```
