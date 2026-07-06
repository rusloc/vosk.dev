# Joins: Types, Algorithms, and Performance

## Table of Contents

1. [Join Types (Logical)](#join-types)
2. [Join Algorithms (Physical)](#join-algorithms)
3. [Anti-Joins and Semi-Joins](#anti-and-semi-joins)
4. [Join Order and the Planner](#join-order)
5. [Performance Patterns and Pitfalls](#performance-patterns)

---

## 1. Join Types (Logical)

### INNER JOIN

Returns only rows where the join condition matches in both tables.

```sql
SELECT o.id, c.name
FROM orders o
INNER JOIN customers c ON c.id = o.customer_id;
```

- If a customer has no orders, the customer doesn't appear.
- If an order has no matching customer (orphan FK), the order doesn't appear.

### LEFT [OUTER] JOIN

Returns all rows from the left table. Unmatched rows get NULLs for right-side columns.

```sql
SELECT c.id, c.name, o.id AS order_id
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id;
-- Customers with no orders appear with order_id = NULL.
```

**Common pitfall — filtering on the right table in WHERE:**

```sql
-- WRONG: This converts the LEFT JOIN into an INNER JOIN
SELECT c.*, o.*
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'shipped';
-- Rows where o is NULL fail the WHERE check and are excluded.

-- CORRECT: Put the filter in the ON clause
SELECT c.*, o.*
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'shipped';
-- Customers with no shipped orders still appear (with NULLs for o columns).
```

### RIGHT [OUTER] JOIN

Mirror of LEFT JOIN — returns all rows from the right table. Rarely used because you can always rewrite as a LEFT JOIN by swapping table order. Prefer LEFT JOIN for consistency.

### FULL [OUTER] JOIN

Returns all rows from both tables. Unmatched rows on either side get NULLs.

```sql
-- Reconcile two data sources
SELECT
    coalesce(a.email, b.email) AS email,
    a.source_a_data,
    b.source_b_data
FROM source_a a
FULL OUTER JOIN source_b b ON a.email = b.email;
```

Use cases: data reconciliation, finding records that exist in one source but not the other, merging two incomplete datasets.

### CROSS JOIN

Produces the Cartesian product — every row from A paired with every row from B. No join condition.

```sql
-- Generate all combinations of sizes and colors
SELECT s.size, c.color
FROM sizes s
CROSS JOIN colors c;

-- Equivalent comma syntax (avoid — less explicit):
SELECT s.size, c.color FROM sizes s, colors c;
```

**When CROSS JOIN is appropriate:**

- Small reference/lookup tables (sizes × colors, months × categories)
- Generating date series: `CROSS JOIN generate_series(...)`
- Pairing every row with a parameter set

**When CROSS JOIN is dangerous:**

- Between any two tables with >1000 rows — the result set explodes

### NATURAL JOIN

Joins on all columns with the same name. Never use in production — it's fragile and unreadable. If someone adds a column with a matching name, the query silently changes behavior.

```sql
-- DON'T do this
SELECT * FROM orders NATURAL JOIN customers;

-- DO this instead — explicit is always better
SELECT * FROM orders o JOIN customers c ON c.id = o.customer_id;
```

### Self-Join

Joining a table to itself. Common for comparisons within the same dataset.

```sql
-- Find employees who earn more than their manager
SELECT e.name AS employee, e.salary, m.name AS manager, m.salary AS manager_salary
FROM employees e
JOIN employees m ON m.id = e.manager_id
WHERE e.salary > m.salary;
```

**When a window function is better than a self-join:**
If you're comparing each row to an aggregate of related rows (e.g., "employees earning above their department average"), a window function avoids the join entirely:

```sql
-- Self-join approach (needs a derived table or CTE for the avg)
-- Window function approach (cleaner):
SELECT name, salary, dept_avg
FROM (
    SELECT name, salary, avg(salary) OVER (PARTITION BY dept_id) AS dept_avg
    FROM employees
) sub
WHERE salary > dept_avg;
```

---

## 2. Join Algorithms (Physical)

PostgreSQL uses three physical algorithms to execute joins. The planner picks based on table sizes, available indexes, sort orders, and statistics. Understanding these helps you interpret EXPLAIN output and optimize.

### Nested Loop Join

**How it works:** For each row in the outer table, scan the inner table for matches.

**Complexity:** O(N × M) in the worst case (no index). O(N × log M) with a B-tree index on the inner table's join column.

**Best when:**

- Outer table is small (few hundred/thousand rows)
- Inner table has an index on the join column
- LATERAL joins (always use nested loop)
- Highly selective filters reduce the outer set

**Worst when:**

- Both tables are large and unindexed
- No filter reduces the outer set size

**EXPLAIN signature:**

```
Nested Loop (cost=...)
  -> Seq Scan on small_table  (outer)
  -> Index Scan on big_table  (inner, using index)
```

### Hash Join

**How it works:** Builds a hash table from the smaller ("inner") table, then probes it with each row from the larger ("outer") table.

**Complexity:** O(N + M) — linear in both table sizes. But requires enough `work_mem` to hold the hash table.

**Best when:**

- Equi-joins (`=` conditions only — hash joins don't work with range conditions)
- Medium to large tables
- No useful index exists
- Sufficient `work_mem`

**Worst when:**

- Hash table doesn't fit in `work_mem` → spills to disk (batched), much slower
- Non-equi-join conditions (inequality, LIKE, etc.)

**EXPLAIN signature:**

```
Hash Join (cost=...)
  Hash Cond: (a.id = b.a_id)
  -> Seq Scan on big_table  (probe side)
  -> Hash
     -> Seq Scan on medium_table  (build side)
        Buckets: 1024  Batches: 1  Memory Usage: 64kB
```

If `Batches > 1`, the hash spilled to disk. Try increasing `work_mem`:

```sql
SET work_mem = '256MB';  -- Session-level, adjust to your needs
```

### Merge Join

**How it works:** Sorts both inputs on the join key, then merges them in a single pass (like merge step in merge sort).

**Complexity:** O(N log N + M log M) for the sorts, then O(N + M) for the merge. If inputs are already sorted (via index), the sort cost disappears.

**Best when:**

- Both tables are very large
- Both already sorted on the join key (index scans)
- Equi-joins
- The result needs to be sorted on the join key anyway (e.g., ORDER BY on the join column)

**Worst when:**

- Neither table is sorted and both are large — the sort overhead dominates
- One table is tiny (nested loop with index would be faster)

**EXPLAIN signature:**

```
Merge Join (cost=...)
  Merge Cond: (a.id = b.a_id)
  -> Index Scan on a_pkey  (already sorted)
  -> Sort
     -> Seq Scan on b
        Sort Key: b.a_id
        Sort Method: quicksort  Memory: 25kB
```

### Algorithm Comparison Summary

| Algorithm   | Best For                         | Join Types                    | Needs Index?                 | Memory Sensitive? |
| ----------- | -------------------------------- | ----------------------------- | ---------------------------- | ----------------- |
| Nested Loop | Small outer × indexed inner      | All (equi, non-equi, LATERAL) | Inner index helps enormously | No                |
| Hash Join   | Medium/large equi-joins          | Equi only (`=`)               | No                           | Yes (`work_mem`)  |
| Merge Join  | Very large pre-sorted equi-joins | Equi only                     | Benefits from sorted input   | Sort needs memory |

You can influence algorithm choice (for debugging/testing only — don't do this in production):

```sql
SET enable_hashjoin = off;    -- Force planner to consider alternatives
SET enable_nestloop = off;
SET enable_mergejoin = off;
```

---

## 3. Anti-Joins and Semi-Joins

These are logical operations the planner recognizes and optimizes, even though SQL doesn't have explicit `ANTI JOIN` or `SEMI JOIN` keywords.

### Semi-Join (exists in other table)

Three equivalent ways to write it — the planner usually generates the same plan:

```sql
-- 1. EXISTS (preferred for clarity)
SELECT c.* FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);

-- 2. IN
SELECT * FROM customers WHERE id IN (SELECT customer_id FROM orders);

-- 3. JOIN with DISTINCT (least preferred — more work for the planner)
SELECT DISTINCT c.* FROM customers c JOIN orders o ON o.customer_id = c.id;
```

### Anti-Join (not in other table)

```sql
-- 1. NOT EXISTS (preferred — NULL-safe, clear intent)
SELECT c.* FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);

-- 2. LEFT JOIN … IS NULL (equivalent, common in legacy code)
SELECT c.*
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;

-- 3. NOT IN (DANGEROUS — broken by NULLs)
SELECT * FROM customers WHERE id NOT IN (SELECT customer_id FROM orders);
-- If ANY row in orders has customer_id IS NULL, this returns ZERO rows.
```

**Always use NOT EXISTS or LEFT JOIN IS NULL. Never NOT IN unless you can guarantee no NULLs.**

### EXCEPT (Set Anti-Join)

```sql
-- IDs in customers but not in orders
SELECT id FROM customers
EXCEPT
SELECT customer_id FROM orders;
```

Works but is less flexible — you can only compare full rows/projections, not arbitrary conditions.

---

## 4. Join Order and the Planner

PostgreSQL's planner evaluates different join orders to find the cheapest plan. For queries with many joins, this matters:

- **Up to ~8 tables:** The planner tries all possible join orders (exhaustive search).
- **More than `join_collapse_limit` (default 8):** The planner uses the GEQO (Genetic Query Optimization) algorithm, which is heuristic and may miss the optimal plan.
- **Explicit join syntax with parentheses** can force join order:

```sql
-- Force A JOIN B first, then join C
SELECT *
FROM (a JOIN b ON a.id = b.a_id)
JOIN c ON c.id = b.c_id;
```

**When to care about join order:**

- Queries with 10+ joins where the planner picks a bad order
- When you know one join is highly selective and should happen first
- When `EXPLAIN ANALYZE` shows a bad join order with huge intermediate results

**Adjusting planner behavior:**

```sql
-- Increase if you have many joins and the planner has time to plan
SET join_collapse_limit = 12;

-- Increase if the planner is flattening your explicit join order
SET from_collapse_limit = 1;  -- Respect my explicit join order
```

---

## 5. Performance Patterns and Pitfalls

### Accidental Cross Join (Row Explosion)

```sql
-- Bug: missing join condition between items and discounts
SELECT o.id, oi.product, d.code
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN discounts d ON d.campaign_id = o.campaign_id;  -- Missing: AND d.product_id = oi.product_id
-- If discounts has 5 rows per campaign, every order_item row gets multiplied by 5.
```

**Detection:** Row counts in EXPLAIN ANALYZE are much higher than expected at a join step. Or a sudden unexplained DISTINCT in the query (masking the explosion).

### Join on Mismatched Types

```sql
-- Slow: implicit cast prevents index use
SELECT * FROM users u JOIN events e ON u.id = e.user_id;
-- If u.id is integer and e.user_id is text, PG casts every row — no index.
```

Fix: Make the types match, or create an expression index.

### Joining on Expressions

```sql
-- Slow: function on the indexed column prevents index use
SELECT * FROM events e JOIN users u ON lower(u.email) = e.user_email;
```

Fix: Create an expression index: `CREATE INDEX idx_users_lower_email ON users (lower(email));`

### Large Table JOIN Performance Checklist

1. **Check join columns have indexes** — Both sides if possible, but at minimum the "inner" side for nested loops.
2. **Check join column types match** — No implicit casts.
3. **Check statistics are current** — `ANALYZE table_name;`
4. **Check `work_mem`** — Increase for hash joins on large tables.
5. **Check for row explosion** — Compare expected row count with EXPLAIN actual rows.
6. **Consider partial indexes** — If you always filter by status or date, a partial index can dramatically reduce the scanned set.
7. **Consider join order hints** — If the planner picks a bad order, try explicit join structuring or `SET join_collapse_limit`.

### Index Types for Joins

| Scenario                                           | Index Type                            |
| -------------------------------------------------- | ------------------------------------- |
| Equi-join on FK (`a.id = b.a_id`)                  | B-tree on `b.a_id` (default)          |
| Range + equi-join (`a.id = b.a_id AND b.date > X`) | Composite B-tree on `b(a_id, date)`   |
| Multi-column equality                              | Composite B-tree in selectivity order |
| Join on array containment                          | GIN on the array column               |
| Join on JSONB containment                          | GIN on the JSONB column               |
| Join on text pattern (LIKE 'foo%')                 | B-tree with `text_pattern_ops`        |
