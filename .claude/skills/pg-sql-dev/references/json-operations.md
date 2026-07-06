# JSON / JSONB Operations

## Table of Contents

1. [JSON vs JSONB](#json-vs-jsonb)
2. [Building JSON (Packing)](#building-json)
3. [Extracting Data (Unpacking)](#extracting-data)
4. [Navigation Operators](#navigation-operators)
5. [Containment and Existence Queries](#containment-queries)
6. [Modifying JSONB](#modifying-jsonb)
7. [Expanding JSONB to Rows](#expanding-to-rows)
8. [Aggregating Rows to JSON](#aggregating-to-json)
9. [SQL/JSON Path Language (PG 12+)](#sqljson-path)
10. [Indexing Strategies](#indexing)
11. [Performance Patterns](#performance-patterns)

---

## 1. JSON vs JSONB

| Feature            | `json`                  | `jsonb`              |
| ------------------ | ----------------------- | -------------------- |
| Storage            | Text (exact copy)       | Binary decomposed    |
| Duplicates keys    | Preserved               | Last value wins      |
| Key order          | Preserved               | Not preserved        |
| Whitespace         | Preserved               | Stripped             |
| Indexing (GIN)     | No                      | Yes                  |
| Containment (`@>`) | No                      | Yes                  |
| Modification (`    |                         | `, `-`, `jsonb_set`) | No  | Yes |
| Parse on insert    | No (parse on each read) | Yes (parse once)     |

**Rule: Always use `jsonb` unless you need exact input preservation.** JSONB is faster for reads, supports indexes, and supports all operators.

---

## 2. Building JSON (Packing)

### From Individual Values

```sql
-- Build a JSONB object from key-value pairs
SELECT jsonb_build_object(
    'name', u.name,
    'email', u.email,
    'active', u.is_active,
    'joined', u.created_at
) AS user_json
FROM users u;
-- {"name": "Alice", "email": "alice@co.com", "active": true, "joined": "2024-01-15T..."}

-- Build a JSON array from values
SELECT jsonb_build_array(1, 'two', true, null);
-- [1, "two", true, null]
```

### From a Row

```sql
-- Convert an entire row to JSONB (includes all columns)
SELECT to_jsonb(u.*) FROM users u;
-- {"id": 1, "name": "Alice", "email": "alice@co.com", ...all columns}

-- Convert a row to JSON (preserves key order)
SELECT row_to_json(u.*) FROM users u;

-- Select specific columns by wrapping in a subquery or ROW()
SELECT to_jsonb(sub) FROM (
    SELECT u.name, u.email FROM users u WHERE u.id = 1
) sub;
```

### Nested Object Construction

```sql
-- Build a customer object with nested address
SELECT jsonb_build_object(
    'customer', jsonb_build_object(
        'name', c.name,
        'address', jsonb_build_object(
            'street', a.street,
            'city', a.city,
            'zip', a.zip
        )
    )
)
FROM customers c
JOIN addresses a ON a.customer_id = c.id;
```

---

## 3. Extracting Data (Unpacking)

### Operator Quick Reference

| Operator | Returns                     | Example                              | Result          |
| -------- | --------------------------- | ------------------------------------ | --------------- |
| `->`     | JSON/JSONB (preserves type) | `'{"a": 1}'::jsonb -> 'a'`           | `1` (as jsonb)  |
| `->>`    | text                        | `'{"a": 1}'::jsonb ->> 'a'`          | `'1'` (as text) |
| `#>`     | JSON/JSONB at path          | `'{"a":{"b":1}}'::jsonb #> '{a,b}'`  | `1` (as jsonb)  |
| `#>>`    | text at path                | `'{"a":{"b":1}}'::jsonb #>> '{a,b}'` | `'1'` (as text) |

**Critical distinction:** `->` returns JSONB; `->>` returns text. This matters for comparisons and casting:

```sql
-- WRONG: comparing JSONB to integer (may not work as expected)
SELECT * FROM products WHERE data -> 'price' > 100;

-- CORRECT: extract as text, cast to numeric
SELECT * FROM products WHERE (data ->> 'price')::numeric > 100;

-- ALSO CORRECT: compare JSONB to JSONB
SELECT * FROM products WHERE data -> 'price' > '100'::jsonb;
```

### Array Element Access

```sql
-- Access array elements by index (0-based)
SELECT '["a","b","c"]'::jsonb -> 0;   -- "a" (as jsonb)
SELECT '["a","b","c"]'::jsonb ->> 1;  -- b (as text)

-- Negative indexes count from the end
SELECT '["a","b","c"]'::jsonb -> -1;  -- "c"
```

### Deep Path Navigation

```sql
SELECT data #>> '{address,city}'  -- text
FROM customers
WHERE data #> '{tags}' ? 'vip';   -- check if 'vip' exists in tags array
```

### Using jsonb_extract_path (Function Equivalent)

```sql
-- These are equivalent:
SELECT data #> '{a,b,c}' FROM t;
SELECT jsonb_extract_path(data, 'a', 'b', 'c') FROM t;

-- Text version:
SELECT data #>> '{a,b,c}' FROM t;
SELECT jsonb_extract_path_text(data, 'a', 'b', 'c') FROM t;
```

The function form is useful when path elements come from variables or when you want clearer intent in complex queries.

---

## 4. Navigation Operators

### Existence Operators

| Operator | Meaning                        | Example                          |
| -------- | ------------------------------ | -------------------------------- |
| `?`      | Key/element exists (top-level) | `data ? 'email'`                 |
| `?       | `                              | Any of these keys exist          | `data ? | array['email', 'phone']` |
| `?&`     | All of these keys exist        | `data ?& array['name', 'email']` |

```sql
-- Find rows where the JSONB column has a 'premium' key
SELECT * FROM users WHERE profile ? 'premium';

-- Find rows where tags array contains 'urgent'
SELECT * FROM tickets WHERE tags ? 'urgent';

-- Find rows that have either email or phone
SELECT * FROM contacts WHERE info ?| array['email', 'phone'];
```

### Containment Operators

| Operator | Meaning                    |
| -------- | -------------------------- |
| `@>`     | Left contains right        |
| `<@`     | Left is contained by right |

```sql
-- Find rows where data contains this structure
SELECT * FROM events
WHERE metadata @> '{"type": "click", "source": "web"}';

-- This checks structural containment — the row's metadata must have
-- at least those key-value pairs (can have more).

-- Array containment
SELECT * FROM products
WHERE tags @> '["organic", "local"]'::jsonb;
-- tags must contain both "organic" AND "local" (may have others).
```

**Containment is GIN-indexable — this is the fastest way to query JSONB.**

---

## 5. Modifying JSONB

### Concatenation (Merge)

```sql
-- Merge two objects (right side wins on key conflict)
SELECT '{"a":1, "b":2}'::jsonb || '{"b":3, "c":4}'::jsonb;
-- {"a": 1, "b": 3, "c": 4}

-- Add a key to an existing object
UPDATE users
SET profile = profile || '{"verified": true}'::jsonb
WHERE id = 42;

-- Merge with jsonb_build_object for dynamic values
UPDATE users
SET profile = profile || jsonb_build_object('last_login', now())
WHERE id = 42;
```

### Deletion

```sql
-- Remove a key
SELECT '{"a":1,"b":2,"c":3}'::jsonb - 'b';
-- {"a": 1, "c": 3}

-- Remove multiple keys
SELECT '{"a":1,"b":2,"c":3}'::jsonb - '{a,c}'::text[];
-- {"b": 2}

-- Remove by path (nested key)
SELECT '{"a":{"b":1,"c":2}}'::jsonb #- '{a,b}';
-- {"a": {"c": 2}}

-- Remove array element by index
SELECT '[1,2,3]'::jsonb - 1;
-- [1, 3]  (removed index 1, which is "2")
```

### jsonb_set (Targeted Update)

```sql
-- Set a value at a path
SELECT jsonb_set(
    '{"a": {"b": 1}}'::jsonb,
    '{a,b}',        -- path
    '42'::jsonb,    -- new value
    true            -- create_if_missing (default true)
);
-- {"a": {"b": 42}}

-- Practical: update a nested field
UPDATE orders
SET metadata = jsonb_set(metadata, '{shipping,status}', '"dispatched"')
WHERE id = 100;
```

### jsonb_insert (Insert into Array)

```sql
-- Insert before index
SELECT jsonb_insert('[1,2,3]'::jsonb, '{1}', '"new"', false);
-- [1, "new", 2, 3]

-- Insert after index
SELECT jsonb_insert('[1,2,3]'::jsonb, '{1}', '"new"', true);
-- [1, 2, "new", 3]
```

---

## 6. Expanding JSONB to Rows

### jsonb_each / jsonb_each_text

Expands a JSONB object into key-value rows:

```sql
SELECT key, value
FROM jsonb_each('{"name":"Alice","age":30,"active":true}'::jsonb);
-- key     | value
-- name    | "Alice"
-- age     | 30
-- active  | true

-- Text version (values are text, not jsonb):
SELECT key, value
FROM jsonb_each_text('{"name":"Alice","age":30}'::jsonb);
```

### jsonb_array_elements

Expands a JSONB array into rows:

```sql
SELECT elem
FROM jsonb_array_elements('[1, 2, 3, "four"]'::jsonb) AS elem;

-- With ordinality (row number):
SELECT elem, idx
FROM jsonb_array_elements('[10, 20, 30]'::jsonb)
WITH ORDINALITY AS t(elem, idx);
-- elem | idx
-- 10   | 1
-- 20   | 2
-- 30   | 3
```

### jsonb_to_recordset (JSON Array of Objects → Typed Rows)

The most powerful unpacking function. Converts a JSON array of objects into typed table rows:

```sql
SELECT *
FROM jsonb_to_recordset(
    '[{"name":"Alice","age":30},{"name":"Bob","age":25}]'::jsonb
) AS t(name text, age int);
-- name  | age
-- Alice | 30
-- Bob   | 25
```

### Practical: Unpacking a JSONB Column

```sql
-- Orders table has a jsonb "items" column containing an array of line items
SELECT
    o.id AS order_id,
    item ->> 'product' AS product,
    (item ->> 'qty')::int AS qty,
    (item ->> 'price')::numeric AS price
FROM orders o,
     jsonb_array_elements(o.items) AS item;
```

---

## 7. Aggregating Rows to JSON

### jsonb_agg / json_agg

Aggregate rows into a JSON array:

```sql
-- Aggregate all products per category into a JSON array
SELECT
    c.name AS category,
    jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'price', p.price
    ) ORDER BY p.name) AS products
FROM categories c
JOIN products p ON p.category_id = c.id
GROUP BY c.name;
```

### jsonb_object_agg

Aggregate key-value pairs into a JSON object:

```sql
-- Build a settings object from key-value rows
SELECT jsonb_object_agg(key, value) AS settings
FROM user_settings
WHERE user_id = 42;
-- {"theme": "dark", "lang": "en", "notifications": "true"}
```

### Nested Aggregation Pattern

Build deeply nested JSON in one query:

```sql
-- API-style response: customers with nested orders and order items
SELECT jsonb_build_object(
    'customer', c.name,
    'orders', (
        SELECT jsonb_agg(jsonb_build_object(
            'id', o.id,
            'total', o.total,
            'items', (
                SELECT jsonb_agg(jsonb_build_object(
                    'product', oi.product_name,
                    'qty', oi.quantity
                ))
                FROM order_items oi WHERE oi.order_id = o.id
            )
        ) ORDER BY o.created_at DESC)
        FROM orders o WHERE o.customer_id = c.id
    )
) AS customer_data
FROM customers c
WHERE c.id = 1;
```

---

## 8. SQL/JSON Path Language (PG 12+)

A more expressive way to query JSONB, similar to XPath for XML.

### Basic Path Queries

```sql
-- $.key — access a key
SELECT jsonb_path_query_first('{"a":1,"b":2}'::jsonb, '$.a');
-- 1

-- $.array[*] — all array elements
SELECT jsonb_path_query('{"tags":["a","b","c"]}'::jsonb, '$.tags[*]');
-- "a", "b", "c" (one row each)

-- Filter expression
SELECT jsonb_path_query(
    '[{"name":"Alice","age":30},{"name":"Bob","age":25}]'::jsonb,
    '$[*] ? (@.age > 27)'
);
-- {"name": "Alice", "age": 30}
```

### Path Functions

| Function                             | Returns                                             |
| ------------------------------------ | --------------------------------------------------- |
| `jsonb_path_query(data, path)`       | Set of JSONB values matching path                   |
| `jsonb_path_query_first(data, path)` | First match only                                    |
| `jsonb_path_query_array(data, path)` | All matches as a JSONB array                        |
| `jsonb_path_exists(data, path)`      | Boolean — does any match exist?                     |
| `jsonb_path_match(data, path)`       | Boolean — does the path predicate evaluate to true? |

### Path Operators in WHERE

```sql
-- Use @@ for path predicate match (PG 12+)
SELECT * FROM events
WHERE metadata @@ '$.type == "click" && $.count > 5';

-- Use @? for path existence
SELECT * FROM events
WHERE metadata @? '$.tags[*] ? (@ == "urgent")';
-- True if any element in tags array equals "urgent"
```

**These are GIN-indexable with `jsonb_path_ops`.**

---

## 9. Indexing Strategies

### GIN Index (Default JSONB Index)

```sql
-- Supports: @>, ?, ?|, ?&, @?, @@
CREATE INDEX idx_data_gin ON events USING gin (metadata);

-- Supports containment queries:
SELECT * FROM events WHERE metadata @> '{"type": "click"}';
```

### GIN with jsonb_path_ops

```sql
-- Supports only: @>, @?, @@ (smaller index, faster for containment)
CREATE INDEX idx_data_path ON events USING gin (metadata jsonb_path_ops);
```

`jsonb_path_ops` is ~2-3x smaller than the default GIN opclass and faster for `@>` queries. Trade-off: no support for `?`, `?|`, `?&` operators.

### Expression Index (B-tree on Extracted Value)

For queries that always filter on a specific key:

```sql
-- If you always query by data->>'status'
CREATE INDEX idx_data_status ON events ((metadata ->> 'status'));

-- Now this is a simple B-tree lookup:
SELECT * FROM events WHERE metadata ->> 'status' = 'active';

-- For numeric comparisons, cast in the index:
CREATE INDEX idx_data_price ON products (((data ->> 'price')::numeric));
SELECT * FROM products WHERE (data ->> 'price')::numeric > 50;
```

### Partial GIN Index

```sql
-- Index only active records' JSONB data
CREATE INDEX idx_active_metadata ON events USING gin (metadata)
WHERE status = 'active';
```

### Index Selection Guide

| Query Pattern                     | Best Index                        |
| --------------------------------- | --------------------------------- |
| `data @> '{"key": "value"}'`      | GIN (jsonb_path_ops preferred)    |
| `data ? 'key'`                    | GIN (default opclass)             |
| `data ->> 'key' = 'value'`        | B-tree expression index           |
| `(data ->> 'key')::int > N`       | B-tree expression index with cast |
| `data @? '$.path ? (@ > 5)'`      | GIN (jsonb_path_ops)              |
| Mixed key existence + containment | GIN (default opclass)             |

---

## 10. Performance Patterns

### Anti-Pattern: Extracting in WHERE Without an Index

```sql
-- SLOW: full table scan, extracts and casts per row
SELECT * FROM events WHERE (metadata ->> 'timestamp')::timestamptz > now() - '1 hour';

-- FAST: with expression index
CREATE INDEX idx_events_ts ON events (((metadata ->> 'timestamp')::timestamptz));
```

### Anti-Pattern: Storing Large Arrays in JSONB

JSONB doesn't support partial updates — the entire value is rewritten on any change. If you have a JSONB array that grows unboundedly (e.g., an activity log), every append rewrites the whole array. Use a separate table instead.

### Pattern: JSONB for Flexible Attributes + Relational for Queryable Fields

```sql
-- Good: frequently-queried fields are columns; variable attributes are JSONB
CREATE TABLE products (
    id serial PRIMARY KEY,
    name text NOT NULL,
    price numeric NOT NULL,      -- Queried often, needs index
    category_id int NOT NULL,    -- FK, queried often
    attributes jsonb DEFAULT '{}' -- Variable: color, size, material, etc.
);

CREATE INDEX idx_products_cat ON products (category_id);
CREATE INDEX idx_products_attrs ON products USING gin (attributes);
```

### Pattern: Materializing JSON Aggregations

If you repeatedly build the same nested JSON structure for an API, consider a materialized view:

```sql
CREATE MATERIALIZED VIEW customer_json AS
SELECT
    c.id,
    jsonb_build_object(
        'name', c.name,
        'email', c.email,
        'order_count', count(o.id),
        'total_spent', coalesce(sum(o.total), 0)
    ) AS data
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id, c.name, c.email;

CREATE UNIQUE INDEX ON customer_json (id);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY customer_json;
```
