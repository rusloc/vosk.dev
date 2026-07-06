# Flexibility & Schema Evolution

How to design schemas that absorb change without weekly migrations. This is the "predesign for evolution" playbook.

The core insight: **change is inevitable; you can either pay for it later (in painful migrations and downtime) or pay a small upfront cost to predesign for it.** The patterns below are that upfront cost.

---

## The flexibility hierarchy

When you face the question "where does this attribute go?", walk down this list. Stop at the first match.

1. **Stable, queried/filtered, type-safe** → typed column with constraint
2. **Stable, computed from other columns** → generated column
3. **Bounded set of values** → enum or `CHECK (col IN (...))`
4. **Bounded but growing set of values** → lookup table with FK
5. **Sparse, rarely queried, varies per row** → JSONB column (`metadata`, `attributes`, `config`, `settings`)
6. **Per-tenant custom attributes** → custom-fields side table OR per-tenant JSONB schema (see below)
7. **One entity attaches to many parent types** → junction table per parent type (preferred) or polymorphic FK (only if you must)
8. **Dynamic key-value pairs that need referential integrity per pair** → EAV (last resort)

If you find yourself on #6, #7, or #8, slow down. Each of those has serious tradeoffs covered below.

---

## Pattern 1: The "metadata JSONB" column on every entity

**The cheapest evolution insurance you can buy.**

Every entity table gets a `metadata jsonb NOT NULL DEFAULT '{}'::jsonb` column from day one. It costs almost nothing in storage and zero in performance until you actually use it.

```sql
CREATE TABLE products (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text          NOT NULL,
  -- ... your typed columns ...
  metadata     jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz   NOT NULL DEFAULT now()
);
```

### What goes in `metadata`

- App-specific extensions that aren't worth a column yet
- Integration-specific data (Stripe metadata, Segment traits, third-party IDs)
- A/B test variant assignments
- Feature flag overrides
- Anything you'd otherwise add as `nullable_optional_field text` and immediately regret

### What does NOT go in `metadata`

- Anything you filter or join on regularly (promote to a typed column once it stabilizes)
- PII or anything that needs encryption at rest at field level
- Anything that needs referential integrity to another table
- Anything an analyst will want — `metadata` is the place where analytics goes to die

### Promote out of metadata when

- You filter on the field in production queries
- You aggregate on it in analytics
- It's present on >50% of rows
- It's now part of the API contract (clients consume it as a typed field)

The promotion path:

```sql
-- 1. Add the typed column
ALTER TABLE products ADD COLUMN sku text;

-- 2. Backfill from metadata
UPDATE products SET sku = metadata->>'sku' WHERE metadata ? 'sku';

-- 3. Add constraint and index after backfill (avoid table rewrite during step 2)
ALTER TABLE products ALTER COLUMN sku SET NOT NULL;
CREATE UNIQUE INDEX products_sku_key ON products(sku);

-- 4. Strip from metadata (optional — keeps the migration clean)
UPDATE products SET metadata = metadata - 'sku';
```

For very large tables, do step 2 in chunks (`WHERE id BETWEEN ... ORDER BY id LIMIT 10000`) to avoid long locks; or use pg_repack/pg-osc.

---

## Pattern 2: Documented JSONB shape (`config`, `settings`, `attributes`)

When the JSONB column has a _known_ shape that varies by row but is consumed by app code with typed expectations.

Example: `projects.config` for an AI project — model, system prompt, tool list, temperature.

### Document the shape

The shape lives in three places: a schema file, a CHECK constraint, and the typed client.

**Schema file** (e.g., `schemas/project_config.json`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["model"],
  "properties": {
    "model": { "type": "string" },
    "system_prompt": { "type": "string" },
    "temperature": { "type": "number", "minimum": 0, "maximum": 2 },
    "tools": { "type": "array", "items": { "type": "string" } },
    "max_tokens": { "type": "integer", "minimum": 1 }
  }
}
```

**CHECK constraint** for cheap shape validation:

```sql
ALTER TABLE projects ADD CONSTRAINT projects_config_shape
  CHECK (
    jsonb_typeof(config) = 'object'
    AND config ? 'model'
    AND jsonb_typeof(config->'model') = 'string'
  );
```

**Strict validation** with the `pg_jsonschema` extension (available on Supabase):

```sql
ALTER TABLE projects ADD CONSTRAINT projects_config_valid
  CHECK (jsonb_matches_schema(
    schema := '{ ... your JSON schema here ... }'::json,
    instance := config
  ));
```

**Typed client** — generate TypeScript types from the JSON schema (`json-schema-to-typescript`) and use them when reading/writing.

### Indexing this JSONB

Two strategies depending on access pattern:

**Containment queries** (`config @> '{"model": "claude-opus-4-7"}'`):

```sql
CREATE INDEX projects_config_gin_idx ON projects USING gin (config jsonb_path_ops);
```

**Single-key extraction queries** (`config->>'model' = 'claude-opus-4-7'`):

```sql
CREATE INDEX projects_config_model_idx ON projects ((config->>'model'));
```

`jsonb_path_ops` is smaller and faster for containment queries; the default `jsonb_ops` supports more operators but is bigger. For most "user filters by config field" workloads, an expression index on the specific extracted field beats a GIN index because it's much smaller.

---

## Pattern 3: Per-tenant custom fields

The hard one. Different tenants want different fields on the same entity. Three options, each with real tradeoffs.

### Option A — Custom-fields side table (preferred for most cases)

```sql
CREATE TABLE custom_field_definitions (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type     text          NOT NULL,  -- 'ticket','contact','order'
  field_key       text          NOT NULL,
  field_label     text          NOT NULL,
  field_type      text          NOT NULL CHECK (field_type IN ('text','number','boolean','date','select','multiselect')),
  options         jsonb,         -- for select/multiselect: array of {value, label}
  required        boolean       NOT NULL DEFAULT false,
  position        integer       NOT NULL DEFAULT 0,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (organization_id, entity_type, field_key)
);

-- Values stored as JSONB on the entity itself, keyed by field_key
-- (rather than a values table, which becomes EAV)
ALTER TABLE tickets ADD COLUMN custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX tickets_custom_fields_gin_idx ON tickets USING gin (custom_fields);

-- App-side validation enforces the definition on write
-- DB-side soft validation via trigger if needed
```

**Why this works:**

- Definitions are typed and queryable (admin UI lists them, validates writes against them)
- Values live next to the entity (one row read fetches everything)
- GIN index on `custom_fields` lets you filter on any field cheaply
- No N+1 queries to fetch values per entity

**When this struggles:**

- Cross-tenant analytics on a custom field is awkward (the field key is tenant-specific)
- Strict referential integrity per value (e.g., "this select value must be a valid foreign key") needs app-side enforcement

### Option B — Per-tenant JSONB schema validation

Same `custom_fields jsonb` column, but you store the JSON Schema for each tenant separately and validate on write:

```sql
CREATE TABLE entity_schemas (
  organization_id uuid          NOT NULL REFERENCES organizations(id),
  entity_type     text          NOT NULL,
  schema          jsonb         NOT NULL,  -- the JSON Schema document
  version         integer       NOT NULL DEFAULT 1,
  PRIMARY KEY (organization_id, entity_type, version)
);
```

Same storage as Option A; the difference is whether you store the _spec_ as structured rows (A) or as a JSON Schema document (B). B is more flexible but harder to drive an admin UI from. Use A unless you need full JSON Schema features (nested objects, conditionals, complex validation).

### Option C — EAV (entity-attribute-value)

```sql
CREATE TABLE entity_attribute_values (
  entity_type     text          NOT NULL,
  entity_id       uuid          NOT NULL,
  attribute_id    uuid          NOT NULL REFERENCES custom_field_definitions(id),
  value_text      text,
  value_number    numeric,
  value_boolean   boolean,
  value_date      timestamptz,
  PRIMARY KEY (entity_type, entity_id, attribute_id)
);
```

**When EAV is acceptable:**

- You truly need referential integrity per value (each value is its own audit-trail-able row)
- The number of attributes per entity is small _and_ you query individual attributes more than you fetch the whole entity

**Why EAV is usually a trap:**

- Query performance: fetching an entity with N custom fields is N joins. UI rendering an entity list with custom field columns is a join nightmare.
- Type safety: you have N "value" columns and pick one based on attribute type. Errors at the application layer if mistyped.
- Indexing: hard to make filter-by-custom-field queries fast across all entities.
- Analytics: pivoting EAV data back into wide rows for analysis is brutal.

In the modern PG/JSONB world, **Option A almost always wins**. Use EAV only if you've genuinely outgrown JSONB (very rare) or if compliance forces you to store each value as its own row.

---

## Pattern 4: Polymorphism (one entity attaches to many parent types)

Examples: comments on posts AND on photos AND on videos. Attachments on tickets AND on messages AND on tasks. Reactions on anything.

### Option A — Junction table per parent type (preferred)

```sql
CREATE TABLE comments (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     uuid          NOT NULL REFERENCES auth.users(id),
  body          text          NOT NULL,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE post_comments (
  post_id       uuid          NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  comment_id    uuid          NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, comment_id)
);

CREATE TABLE photo_comments (
  photo_id      uuid          NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  comment_id    uuid          NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  PRIMARY KEY (photo_id, comment_id)
);
```

**Pros:** real foreign keys (cascade, integrity, EXPLAIN can use them). Type-specific queries are simple. Adding a new commentable type is a new junction table, no schema change to `comments`.

**Cons:** "all comments by this user across all parent types" requires a UNION across junction tables. If that's a hot query, this pattern hurts.

### Option B — Polymorphic FK (avoid if you can)

```sql
CREATE TABLE comments (
  id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         uuid          NOT NULL REFERENCES auth.users(id),
  commentable_type  text          NOT NULL,
  commentable_id    uuid          NOT NULL,
  body              text          NOT NULL,
  created_at        timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX comments_commentable_idx ON comments(commentable_type, commentable_id);
```

**Pros:** simple. "All comments by this user across all parent types" is a single-table query. ORMs (Rails, Django) love this pattern.

**Cons:** **no foreign key integrity.** Nothing prevents a comment with `commentable_type = 'post'` and a `commentable_id` that doesn't exist (or that points at a row in `photos`). You're enforcing referential integrity in app code. Cascades don't work — deleting a post leaves orphaned comments. Joins are awkward (`WHERE commentable_type = 'post' JOIN posts ON ...`).

### When to use which

- **You will query "all X across all parent types" frequently** → Option B (polymorphic FK), accept the loss of integrity
- **You will query "X for this specific parent" most of the time** → Option A (junction tables), keep integrity
- **Hybrid (rare): polymorphic FK + per-type validation triggers**, only if you really need both. Triggers can enforce the integrity that the FK can't, at the cost of complexity and write performance.

### Why "polymorphism is a code smell" in greenfield design

Frequently, what looks like polymorphism is actually a missing abstraction. "Attachments on tickets, messages, tasks" → maybe there's a unifying `attachable` entity that represents the "thing this can be attached to" and ticket/message/task all reference it. Think hard before reaching for polymorphic patterns.

---

## Pattern 5: Soft enums (CHECK constraints over enum types)

The user-supplied bullet "new attribs are predesigned to be added" applies to enum values too.

```sql
-- DO this:
status text NOT NULL CHECK (status IN ('draft','active','archived'))

-- AVOID this for evolving sets:
CREATE TYPE order_status AS ENUM ('pending','paid','shipped');
status order_status NOT NULL
```

**Why text + CHECK wins for evolving statuses:**

- Adding a new value: `ALTER TABLE orders DROP CONSTRAINT orders_status_check, ADD CONSTRAINT orders_status_check CHECK (status IN (...))` — instant.
- Removing/renaming: a normal SQL update.
- PG enums require `ALTER TYPE ADD VALUE` (which is one-way; you can't easily remove or reorder), and they're a pain to use across schemas.

**When PG enums are still fine:** truly stable, never-changing categorizations (e.g., `weekday` for Mon–Sun). For anything in business logic, prefer text + CHECK.

---

## Pattern 6: Lookup tables for growing sets

For values that need attributes (label, description, ordering, deprecation flag) or that grow regularly, a lookup table beats an enum:

```sql
CREATE TABLE order_statuses (
  code          text          PRIMARY KEY,
  label         text          NOT NULL,
  description   text,
  is_terminal   boolean       NOT NULL DEFAULT false,
  position      integer       NOT NULL DEFAULT 0,
  deprecated_at timestamptz
);

INSERT INTO order_statuses (code, label, position, is_terminal) VALUES
  ('pending', 'Pending payment', 1, false),
  ('paid', 'Paid', 2, false),
  ('shipped', 'Shipped', 3, false),
  ('delivered', 'Delivered', 4, true),
  ('cancelled', 'Cancelled', 5, true);

ALTER TABLE orders
  ADD COLUMN status text NOT NULL REFERENCES order_statuses(code);
```

**Why this is good:**

- Add a new status with an INSERT, no migration
- Query attributes of statuses (`WHERE is_terminal = true`)
- Internationalize labels via a related table
- FK ensures only valid codes can be used

**Tradeoff:** one more table, one more join for label lookups. Worth it for any status set that will evolve, or for any status set the product team wants to manage in an admin UI.

---

## Pattern 7: Schema versioning for evolving JSONB shapes

When `metadata` or `config` shapes evolve and you need to migrate existing rows over time:

```sql
ALTER TABLE projects ADD COLUMN config_version integer NOT NULL DEFAULT 1;
```

**The pattern:**

1. New rows always written with the latest version
2. App code reads `config_version` and applies migrations to old rows on read (lazy migration)
3. Background job migrates old rows to the latest version on a schedule (eager migration)
4. Once `MIN(config_version)` == latest, you can simplify the read path

This is the "lazy + eager" migration pattern. Lazy alone leaves your code with N readers forever; eager alone takes long migrations on huge tables. Together you get both fast deploys and eventual cleanup.

---

## Pattern 8: Append-only event tables for evolving state

When state mutates often and the history matters (audit, undo, analytics), an append-only event table is the most evolution-friendly design:

```sql
CREATE TABLE order_events (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type  text          NOT NULL,
  payload     jsonb         NOT NULL DEFAULT '{}'::jsonb,
  actor_id    uuid,
  occurred_at timestamptz   NOT NULL DEFAULT now()
);
```

**Why this is evolution-friendly:**

- New event types are an INSERT, not a migration
- Old events are immutable and stay valid forever
- The `orders` row is the projection; you can always rebuild it from events
- Adding a new derived field (e.g., "did this order ever ship?") is a query against events, not a column change

This is event-sourcing-lite. Don't go full event-source for everything — it's expensive cognitive overhead. But for any table where "what changed and when" is a real question, an event table is gold.

---

## Pattern 9: Late-binding foreign keys

When two tables both want to reference each other (e.g., `users.preferred_workspace_id` and `workspaces.owner_id`), you have a chicken-and-egg problem on insert.

**Solutions, in order of preference:**

1. **Make one nullable** — `users.preferred_workspace_id` is nullable, set after workspace creation. Usually fine.
2. **Wrap in a transaction with `DEFERRABLE INITIALLY DEFERRED` constraints:**
   ```sql
   ALTER TABLE users
     ADD CONSTRAINT users_preferred_workspace_fk
     FOREIGN KEY (preferred_workspace_id) REFERENCES workspaces(id)
     DEFERRABLE INITIALLY DEFERRED;
   ```
   Now you can insert both rows in one transaction without violating the FK.
3. **Decompose the relationship** — e.g., add a `workspace_owners` table. Often the right answer if there's any chance of "owner is a relationship with attributes" (when did they become owner, were they always the owner, etc.).

---

## Pattern 10: Schema branching for risky evolution

When the change is risky (rename a column the API depends on, restructure a JSONB shape), use one of these:

- **Expand-contract migration**: add the new column/shape, dual-write to both, cut over reads, drop the old one. Three deploys, zero downtime.
- **DB branching** (Supabase Branches, Neon): test the migration on a real branch with real-shaped data before applying to prod.
- **Shadow tables**: write to both old and new tables for a period, verify they match, then cut over.

See `references/tooling-and-migrations.md` for the operational mechanics of these patterns.

---

## Decision: should this attribute be a column, JSONB key, or side table?

When in doubt, ask these questions in order:

1. **Will I filter or join on this regularly?** Yes → typed column. No → continue.
2. **Is the value present on most rows?** Yes → typed column (even if you don't filter on it; null-mostly columns are cheap). No → continue.
3. **Does this have its own lifecycle (created/updated independently)?** Yes → side table. No → continue.
4. **Does this need referential integrity to another table?** Yes → side table or typed column with FK. No → continue.
5. **Is the shape stable (same fields for every row)?** Yes → typed column. No → JSONB.
6. **Will analysts want to query this?** Yes → typed column or extracted view. No → JSONB is fine.

Default landing: if you can't decide quickly, JSONB in a `metadata` column. It's the least committal choice, easy to promote later, and never blocks shipping.
