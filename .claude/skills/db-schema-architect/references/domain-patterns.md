# Domain Schema Patterns

Concrete, opinionated schemas for four common domains. Each section gives you: the core entity list, full DDL with all the conventions applied, an explanation of _why this shape_, the predesigned flex points, the analytics surface, and the RLS posture.

These are starting points, not gospel. Adapt to the actual domain — but if you find yourself deviating heavily on the basics (audit columns, soft delete, JSONB metadata, RLS), question whether you really need to.

---

## Table of contents

1. [E-commerce](#e-commerce)
2. [SaaS (multi-tenant)](#saas-multi-tenant)
3. [IT service / ticketing platform](#it-service--ticketing-platform)
4. [AI product / generative SaaS](#ai-product--generative-saas)

---

## E-commerce

### Entity list

- `products` — what you sell at the catalog level
- `product_variants` — actual SKUs (size/color/etc.); variants are what you charge for and what's in stock
- `inventory_levels` — variant × location quantity (separate from variants for multi-warehouse)
- `customers` — separate from `auth.users` so guests can buy
- `addresses` — reusable across customers and orders (shipping + billing)
- `carts` and `cart_items` — pre-purchase, mutable, ephemeral
- `orders` and `order_items` — post-purchase, immutable line items, money snapshot
- `payments` — payment attempts and captures (multiple per order possible)
- `fulfillments` and `fulfillment_items` — shipments, tracking
- `discounts` and `discount_redemptions` — codes, automatic discounts, applied to orders
- `tax_rates` — for whatever tax engine you're using (or just a snapshot if you outsource to TaxJar/Stripe Tax)

### Core DDL

```sql
-- Catalog
CREATE TABLE products (
  id           uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text          NOT NULL UNIQUE,
  name         text          NOT NULL,
  description  text,
  status       text          NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','active','archived')),
  metadata     jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE TABLE product_variants (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid          NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  sku             text          NOT NULL UNIQUE,
  -- Money as integer cents; never float
  price_cents     bigint        NOT NULL CHECK (price_cents >= 0),
  currency        text          NOT NULL CHECK (length(currency) = 3),
  -- Variant attributes (size, color, material...) are JSONB because
  -- the set varies wildly across products
  attributes      jsonb         NOT NULL DEFAULT '{}'::jsonb,
  weight_grams    integer,
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX product_variants_product_id_idx ON product_variants(product_id);
CREATE INDEX product_variants_attributes_gin_idx ON product_variants USING gin (attributes);

-- Inventory split out: lets you track stock per location, do reservations,
-- and avoid hot-row contention on the variant.
CREATE TABLE inventory_levels (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id    uuid          NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  location_id   uuid          NOT NULL,  -- FK to a `locations` table
  on_hand       integer       NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved      integer       NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  available     integer       GENERATED ALWAYS AS (on_hand - reserved) STORED,
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (variant_id, location_id)
);

-- Customers (decoupled from auth.users so guest checkout works)
CREATE TABLE customers (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid          REFERENCES auth.users(id),  -- NULL for guests
  email         text          NOT NULL,
  metadata      jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  -- Same email can recur across guest + registered + churned accounts;
  -- enforce uniqueness only when user_id is set.
  UNIQUE (user_id)
);
CREATE UNIQUE INDEX customers_email_user_idx
  ON customers(email) WHERE user_id IS NOT NULL;

-- Orders: append-only after creation, money-snapshot model
CREATE TABLE orders (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid          NOT NULL REFERENCES customers(id),
  -- Human-readable, non-enumerable; generated in app or via trigger
  order_number        text          NOT NULL UNIQUE,
  status              text          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','paid','partially_paid',
                                                       'fulfilled','partially_fulfilled',
                                                       'cancelled','refunded')),
  currency            text          NOT NULL,
  subtotal_cents      bigint        NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents           bigint        NOT NULL DEFAULT 0,
  shipping_cents      bigint        NOT NULL DEFAULT 0,
  discount_cents      bigint        NOT NULL DEFAULT 0,
  total_cents         bigint        NOT NULL CHECK (total_cents >= 0),
  shipping_address    jsonb,        -- snapshot at order time
  billing_address     jsonb,
  metadata            jsonb         NOT NULL DEFAULT '{}'::jsonb,
  placed_at           timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX orders_customer_id_placed_at_idx ON orders(customer_id, placed_at DESC);
CREATE INDEX orders_status_idx ON orders(status) WHERE status IN ('pending','paid','partially_paid');

-- Order line items: also snapshot, including price + product details
CREATE TABLE order_items (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id          uuid          REFERENCES product_variants(id) ON DELETE RESTRICT,
  -- Snapshot what the customer actually saw and paid for
  product_name        text          NOT NULL,
  variant_sku         text          NOT NULL,
  variant_attributes  jsonb         NOT NULL DEFAULT '{}'::jsonb,
  unit_price_cents    bigint        NOT NULL,
  quantity            integer       NOT NULL CHECK (quantity > 0),
  line_total_cents    bigint        GENERATED ALWAYS AS (unit_price_cents * quantity) STORED,
  metadata            jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_id_idx ON order_items(order_id);
```

### Why this shape

- **Variants, not products, are what you sell.** A product (a "T-shirt") doesn't have a price or stock; the variant ("T-shirt, M, blue") does. This separation makes everything downstream cleaner.
- **Orders snapshot everything.** `product_name`, `unit_price_cents`, `shipping_address` are all copied into the order at creation. If a product is renamed or repriced or deleted later, the order record is unaffected — because the order is the legal/financial record, not a view into current state.
- **Money is `bigint` cents.** Never `numeric`, never `float`. Cents are integer-safe, fast to compute on, and unambiguous. Multi-currency is handled via the `currency` column.
- **`generated columns` for derived totals.** `available` and `line_total_cents` are computed by PG, never written by app code. Single source of truth.
- **Status is a CHECK-constrained text column, not an enum type.** PG enums are great for some uses but expensive to alter (you can ADD VALUE but not REMOVE or REORDER easily). Text + CHECK gives you the same safety and is trivial to evolve.
- **`order_number` is human-readable** and separate from `id`. Customers reference order numbers in support tickets; UUIDs are awful for that. Generate as `ORD-YYYY-NNNNNN` or similar.

### Predesigned flex points

- `metadata jsonb` on every entity for app-specific extensions
- `attributes jsonb` on `product_variants` for the variation axes (the set of axes varies across products — some have size+color, some have flavor+pack-size)
- `shipping_address` / `billing_address` as JSONB on orders so you can change the address shape later without touching historic orders
- Inventory split into a separate table so you can later add reservations, multi-warehouse, lot tracking, etc., without changing the variant table

### Analytics surface

```sql
-- Daily revenue, paid orders only
CREATE MATERIALIZED VIEW mv_daily_revenue AS
SELECT
  date_trunc('day', placed_at) AS day,
  currency,
  count(*)               AS order_count,
  sum(total_cents)       AS revenue_cents,
  sum(tax_cents)         AS tax_cents,
  sum(shipping_cents)    AS shipping_cents
FROM orders
WHERE placed_at IS NOT NULL
  AND status NOT IN ('cancelled','refunded')
GROUP BY 1, 2;
CREATE UNIQUE INDEX ON mv_daily_revenue(day, currency);
-- Refresh on schedule (pg_cron or external scheduler):
-- SELECT cron.schedule('refresh_mv_daily_revenue', '5 * * * *',
--   $$REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue$$);
```

### RLS posture

- `products`, `product_variants` — public read for `active` status, all-access for `service_role` and admin
- `customers`, `orders`, `order_items` — read-only by `customer_id = (SELECT id FROM customers WHERE user_id = auth.uid())`; write only via API (server-side with `service_role`)
- `inventory_levels`, `payments` — never directly accessible from clients; staff-only via dedicated views

---

## SaaS (multi-tenant)

### Entity list

- `organizations` — the tenant
- `memberships` — user × organization with role
- `invitations` — pending memberships
- `subscriptions` — billing plan per org
- `subscription_seats` — for per-seat billing (optional)
- `usage_events` — metered usage (the source of truth for any metered billing)
- `usage_aggregates` — pre-aggregated for fast dashboard reads
- `invoices` — billing history (snapshot, immutable)
- `audit_log` — who did what, when

### Tenancy choice: `organization_id` everywhere

For most SaaS, the right tenancy unit is the _organization_ (also called workspace, team, account). One user can belong to many orgs; data belongs to the org, not the user. This is critical: design for it from day one. Adding `organization_id` to a table after launch is one of the most expensive migrations in a SaaS company.

### Core DDL

```sql
CREATE TABLE organizations (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text          NOT NULL UNIQUE,
  name          text          NOT NULL,
  -- Plan info denormalized here for fast joins; subscription is source of truth
  plan          text          NOT NULL DEFAULT 'free',
  metadata      jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE memberships (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text          NOT NULL DEFAULT 'member'
                                CHECK (role IN ('owner','admin','member','viewer')),
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX memberships_user_id_idx ON memberships(user_id);

CREATE TABLE invitations (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           text          NOT NULL,
  role            text          NOT NULL DEFAULT 'member',
  invited_by      uuid          NOT NULL REFERENCES auth.users(id),
  token           text          NOT NULL UNIQUE,  -- random, opaque
  expires_at      timestamptz   NOT NULL,
  accepted_at    timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE TABLE subscriptions (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  external_id           text          UNIQUE,  -- Stripe subscription ID
  plan                  text          NOT NULL,
  status                text          NOT NULL
                                      CHECK (status IN ('trialing','active','past_due',
                                                         'cancelled','paused')),
  current_period_start  timestamptz   NOT NULL,
  current_period_end    timestamptz   NOT NULL,
  cancel_at             timestamptz,
  cancelled_at          timestamptz,
  metadata              jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX subscriptions_organization_id_idx ON subscriptions(organization_id);

-- Usage metering: append-only, partition by month for very high volume
CREATE TABLE usage_events (
  id              uuid          DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL,
  user_id         uuid,          -- optional, for per-user attribution
  event_type      text          NOT NULL,  -- e.g. 'api_call', 'tokens_used', 'document_processed'
  quantity        bigint        NOT NULL DEFAULT 1,
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  occurred_at     timestamptz   NOT NULL DEFAULT now(),
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
-- Create monthly partitions:
-- CREATE TABLE usage_events_2026_04 PARTITION OF usage_events
--   FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE INDEX usage_events_org_event_time_idx
  ON usage_events(organization_id, event_type, occurred_at);

-- Pre-aggregated for fast UI reads, refreshed on schedule
CREATE MATERIALIZED VIEW mv_usage_daily AS
SELECT
  organization_id,
  event_type,
  date_trunc('day', occurred_at) AS day,
  sum(quantity) AS total_quantity,
  count(*)      AS event_count
FROM usage_events
GROUP BY 1, 2, 3;
CREATE UNIQUE INDEX ON mv_usage_daily(organization_id, event_type, day);

CREATE TABLE audit_log (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL,
  actor_user_id   uuid,         -- NULL for system actions
  action          text          NOT NULL,  -- e.g. 'membership.invite', 'subscription.cancel'
  target_type     text,         -- e.g. 'membership', 'invoice'
  target_id       uuid,
  changes         jsonb,        -- before/after diff for mutations
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_org_created_idx ON audit_log(organization_id, created_at DESC);
CREATE INDEX audit_log_actor_idx ON audit_log(actor_user_id, created_at DESC);
```

### Why this shape

- **`organizations` first, everything else hangs off it.** Tenancy is the spine.
- **`memberships` separate from `organizations` and `users`.** A user joining an org is a relationship with attributes (role, joined_at, etc.), not a column on either side. This is the single most important table in any multi-tenant SaaS — your RLS policies will reference it constantly.
- **`subscriptions` separate from `organizations`** even though one org typically has one active subscription. Subscriptions have lifecycle (trial → active → cancelled → resumed), and you'll have historical subscriptions for reporting. Don't put `plan_status` on the org.
- **`usage_events` is partitioned by month.** Metered usage is the highest-volume table in most SaaS. Range-partitioning by `occurred_at` makes old-data drops cheap (`DROP PARTITION` for compliance / cost) and keeps active queries fast.
- **`mv_usage_daily` for the dashboard.** Don't aggregate raw events on every dashboard load. Materialize once per hour, served instantly.
- **`audit_log` from day one.** Cheap to add, painful to backfill. Compliance and debugging both want it.

### Predesigned flex points

- `metadata` JSONB on org, membership, subscription, usage event
- `event_type` is text not enum — adding new metering events is a single insert, not a migration
- `audit_log.changes` is JSONB so you can log arbitrary diffs

### Analytics surface

- `mv_usage_daily` for dashboards
- A view like `v_active_organizations` (orgs with usage in the last 30 days) for ops/finance
- ETL the lot to a warehouse (BigQuery, Snowflake, ClickHouse) when usage volume justifies; until then, MVs are enough

### RLS posture

This is the heart of multi-tenant SaaS. Every table with `organization_id` gets a policy like:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY <table>_org_isolation ON <table>
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );
```

For role-restricted operations (e.g., only admins can change billing):

```sql
CREATE POLICY subscriptions_admin_only_update ON subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
        AND organization_id = subscriptions.organization_id
        AND role IN ('owner','admin')
    )
  );
```

See `references/supabase-and-rls.md` for the full RLS playbook including helper functions and performance considerations.

---

## IT service / ticketing platform

### Entity list

- `accounts` — the customer companies you serve
- `contacts` — people at those accounts (separate from `auth.users`; many contacts never log in)
- `tickets` — the unit of work
- `ticket_events` — every state change (immutable)
- `ticket_comments` — public + internal notes
- `ticket_attachments` — files (metadata only; bytes in object storage)
- `agents` — your support staff (link to `auth.users`)
- `queues` and `agent_queues` — routing
- `sla_policies` and `ticket_slas` — SLA tracking per ticket
- `kb_articles` and `kb_article_versions` — knowledge base with version history

### Core DDL

```sql
CREATE TABLE accounts (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text          NOT NULL,
  domain        text          UNIQUE,  -- email domain for auto-association
  tier          text          NOT NULL DEFAULT 'standard',
  metadata      jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE TABLE contacts (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    uuid          REFERENCES accounts(id) ON DELETE SET NULL,
  user_id       uuid          REFERENCES auth.users(id),  -- NULL for non-portal contacts
  email         text          NOT NULL,
  name          text,
  metadata      jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (email)
);

CREATE TABLE tickets (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Sequential, human-readable; use a sequence for the number
  ticket_number   bigint        NOT NULL UNIQUE,
  account_id      uuid          NOT NULL REFERENCES accounts(id),
  contact_id      uuid          NOT NULL REFERENCES contacts(id),
  assignee_id     uuid          REFERENCES agents(id),
  queue_id        uuid          REFERENCES queues(id),
  subject         text          NOT NULL,
  description     text,
  status          text          NOT NULL DEFAULT 'new'
                                CHECK (status IN ('new','open','pending','on_hold',
                                                   'resolved','closed')),
  priority        text          NOT NULL DEFAULT 'normal'
                                CHECK (priority IN ('low','normal','high','urgent')),
  channel         text          NOT NULL,  -- 'email','web','api','chat','phone'
  tags            text[]        NOT NULL DEFAULT '{}',
  custom_fields   jsonb         NOT NULL DEFAULT '{}'::jsonb,  -- per-account custom fields
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  first_response_at timestamptz,
  resolved_at     timestamptz,
  closed_at       timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);
CREATE SEQUENCE ticket_number_seq START 1000;
ALTER TABLE tickets ALTER COLUMN ticket_number SET DEFAULT nextval('ticket_number_seq');
CREATE INDEX tickets_account_status_idx ON tickets(account_id, status);
CREATE INDEX tickets_assignee_status_idx ON tickets(assignee_id, status)
  WHERE status NOT IN ('closed','resolved');
CREATE INDEX tickets_tags_gin_idx ON tickets USING gin(tags);
CREATE INDEX tickets_custom_fields_gin_idx ON tickets USING gin(custom_fields);

-- Append-only event log; reconstruct ticket history from this
CREATE TABLE ticket_events (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       uuid          NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id        uuid,         -- agent or contact
  actor_type      text          NOT NULL CHECK (actor_type IN ('agent','contact','system')),
  event_type      text          NOT NULL,  -- 'created','status_changed','assigned','tagged',...
  payload         jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX ticket_events_ticket_idx ON ticket_events(ticket_id, created_at);

CREATE TABLE ticket_comments (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       uuid          NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id       uuid          NOT NULL,
  author_type     text          NOT NULL CHECK (author_type IN ('agent','contact')),
  body            text          NOT NULL,
  is_internal     boolean       NOT NULL DEFAULT false,  -- true = staff-only note
  attachments     jsonb         NOT NULL DEFAULT '[]'::jsonb,  -- array of file metadata refs
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX ticket_comments_ticket_idx ON ticket_comments(ticket_id, created_at);

-- SLA tracking: a row per (ticket, sla_metric) so first-response and resolution can be tracked separately
CREATE TABLE ticket_slas (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       uuid          NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  policy_id       uuid          NOT NULL,
  metric          text          NOT NULL CHECK (metric IN ('first_response','next_response','resolution')),
  target_at       timestamptz   NOT NULL,
  achieved_at     timestamptz,
  breached_at     timestamptz,
  paused_seconds  integer       NOT NULL DEFAULT 0,  -- time on hold doesn't count
  UNIQUE (ticket_id, metric)
);
```

### Why this shape

- **`ticket_events` as the source of truth for history.** Tickets mutate (status, assignee, priority); everyone wants the audit trail. Append-only events are the cheapest way to get one. The `tickets` row is the current state; the `ticket_events` table is how you got there. Reconstruct the timeline by ordering events.
- **`tags` as `text[]`** with a GIN index — perfect for the "tickets tagged X" query, no junction table needed.
- **`custom_fields jsonb` predesigned** — every customer wants their own ticket fields. JSONB + GIN handles it without per-customer schema changes.
- **`is_internal` on comments** — fundamental to support: staff sees everything, contacts see only `is_internal = false`. RLS enforces this.
- **`channel`, `tags`, `priority`, `status` are all flat text/array** — easy to filter in the UI, easy to slice in analytics, easy to evolve.
- **`first_response_at` / `resolved_at` materialized on the ticket** — for SLA dashboards, these need to be O(1) to filter on, not derived from events.

### RLS posture

- Contacts see only their account's tickets and only non-internal comments
- Agents see tickets in their queues + tickets assigned to them
- Admins see everything in their workspace

---

## AI product / generative SaaS

### Entity list

- `projects` — the unit of work in the AI app (a doc, a chat, a workspace; whatever the unit is)
- `conversations` (if chat-shaped) — within a project
- `messages` — within a conversation; user + assistant + tool turns
- `runs` — a single LLM invocation (one or more messages can derive from a run)
- `tool_calls` — tools invoked within a run
- `artifacts` — generated outputs (images, audio, video, code, files) — metadata only; bytes in object storage
- `embeddings` — pgvector for semantic search
- `model_configs` — per-project model + prompt configuration
- `usage_events` — token usage per run, for billing

### Core DDL

```sql
-- pgvector extension is required for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE projects (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id        uuid          NOT NULL REFERENCES auth.users(id),
  name            text          NOT NULL,
  description     text,
  -- Configuration that varies wildly across projects: system prompt, model,
  -- temperature, tools enabled, etc. JSONB is the right home.
  config          jsonb         NOT NULL DEFAULT '{}'::jsonb,
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE TABLE conversations (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title           text,
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  archived_at     timestamptz
);
CREATE INDEX conversations_project_id_idx ON conversations(project_id, updated_at DESC);

CREATE TABLE messages (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid          NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  parent_id       uuid          REFERENCES messages(id),  -- for branching/edits
  role            text          NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  -- Content as structured blocks (text, image_url, tool_use, tool_result...)
  -- Matches the Anthropic/OpenAI message-block format
  content         jsonb         NOT NULL,
  run_id          uuid          REFERENCES runs(id),  -- which model run produced this
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_idx ON messages(conversation_id, created_at);

CREATE TABLE runs (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL,
  project_id      uuid          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  conversation_id uuid          REFERENCES conversations(id),
  model           text          NOT NULL,  -- e.g. 'claude-opus-4-7', 'gpt-5'
  provider        text          NOT NULL,  -- 'anthropic','openai','google','self_hosted'
  status          text          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','streaming','completed','failed','cancelled')),
  input_tokens    integer,
  output_tokens   integer,
  cache_read_tokens   integer,
  cache_write_tokens  integer,
  cost_cents      bigint,
  latency_ms      integer,
  -- Snapshot of the request as sent (sanitized of secrets)
  request         jsonb,
  -- Final response (without the streaming chunks); chunks can live in `runs_chunks` if needed
  response        jsonb,
  error           jsonb,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX runs_org_created_idx ON runs(organization_id, created_at DESC);
CREATE INDEX runs_project_idx ON runs(project_id, created_at DESC);

CREATE TABLE tool_calls (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid          NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  tool_name       text          NOT NULL,
  input           jsonb         NOT NULL,
  output          jsonb,
  status          text          NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','running','completed','failed')),
  latency_ms      integer,
  error           jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX tool_calls_run_idx ON tool_calls(run_id, created_at);

-- Generated outputs: bytes are in object storage, this is the metadata
CREATE TABLE artifacts (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL,
  project_id      uuid          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id          uuid          REFERENCES runs(id),
  message_id      uuid          REFERENCES messages(id),
  artifact_type   text          NOT NULL,  -- 'image','audio','video','document','code','dataset'
  mime_type       text          NOT NULL,
  storage_bucket  text          NOT NULL,
  storage_path    text          NOT NULL,
  size_bytes      bigint        NOT NULL,
  checksum        text,
  -- Type-specific data: image dimensions, audio duration, video resolution, etc.
  attributes      jsonb         NOT NULL DEFAULT '{}'::jsonb,
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX artifacts_project_idx ON artifacts(project_id, created_at DESC);
CREATE INDEX artifacts_run_idx ON artifacts(run_id);

-- Embeddings for semantic search across project content
CREATE TABLE embeddings (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL,
  project_id      uuid          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- Polymorphic-ish reference: what got embedded
  source_type     text          NOT NULL,  -- 'message','document','artifact','chunk'
  source_id       uuid          NOT NULL,
  chunk_index     integer       NOT NULL DEFAULT 0,
  content         text          NOT NULL,
  embedding       vector(1536)  NOT NULL,  -- size matches the embedding model
  model           text          NOT NULL,  -- which embedding model produced this
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now()
);
-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX embeddings_vector_hnsw_idx
  ON embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX embeddings_project_idx ON embeddings(project_id);
```

### Why this shape

- **`runs` is the billing primitive.** Token counts, cost, latency, and the full request/response live on the run. Usage and analytics derive from this table. Don't try to derive cost from messages — too many edge cases (cached prompts, parallel tool calls, retried completions).
- **`messages.content` is JSONB matching the message-block format.** Multi-modal messages (text + image + tool use) don't fit a flat `text` column. The block format also matches what you send to the model APIs, so round-tripping is trivial.
- **`messages.parent_id` for branching.** Users edit-and-resend; you want to preserve the prior branch for analytics and "switch back to previous version" UX. Linear `messages` ordered by `created_at` doesn't support this; a parent pointer does.
- **`tool_calls` separate from messages.** A single message may include multiple tool uses; the `tool_calls` table makes them queryable as first-class entities (essential for analytics: "which tools fail most often").
- **`artifacts` separate from messages.** Generated content (images, audio, video) needs its own lifecycle: signed URLs, retention, transcoding, possibly deletion before the parent message. Don't bury artifact metadata inside `messages.content`.
- **`embeddings` table with explicit `source_type` + `source_id`.** Lets you embed any kind of content with one table and one vector index. The polymorphic-ish reference is acceptable here because embeddings are append-only and the source linkage is loose by nature (you may re-embed a message after editing).
- **HNSW over IVFFlat** for the vector index. Better recall, no need to ANALYZE/REINDEX on growth, and pgvector's HNSW implementation is mature.

### Predesigned flex points

- `projects.config` JSONB for per-project model/prompt/tool configuration that evolves constantly
- `messages.metadata`, `runs.metadata`, `artifacts.metadata` for app-specific extensions
- `artifacts.attributes` JSONB for type-specific properties (dimensions, duration, resolution) without per-type tables
- `tool_calls.input` / `output` are JSONB — the tool catalog evolves; you don't want a migration per new tool

### Analytics surface

- Per-project token + cost per day (materialized view from `runs`)
- Per-tool latency + failure rate (from `tool_calls`)
- Per-org usage roll-up for billing (from `runs` joined to `organizations`)
- Search analytics: which embeddings get hit, what queries return zero results

### RLS posture

Standard org-isolation policies on every table. Plus:

- `runs.request` and `runs.response` may contain user prompts and model output that's sensitive — restrict to org members only, never expose to `anon`
- `embeddings.content` may leak private content if the table is queryable across orgs — same treatment
- `artifacts` accessed via signed URLs from object storage; the metadata row is org-scoped

---

## Cross-cutting notes

### When to denormalize

The four schemas above lean toward normalization, with strategic denormalization (e.g., `organizations.plan`, `tickets.first_response_at`, `orders.shipping_address` snapshot). The rule of thumb:

- **Snapshot anything that's a legal/financial record** (orders, invoices, audit log) — these must not change when source data changes
- **Cache anything you read 100x more than you write** (denormalized counts, "current status" columns)
- **Pre-aggregate for dashboards** via materialized views

Don't denormalize prophylactically. Wait until you have a query that's measurably slow or a join you write a dozen times.

### When to partition

- `usage_events`, `audit_log`, `ticket_events`, `messages` — any append-only table that will grow into the millions or billions of rows. Partition by month on the time column.
- Don't partition unless you're confident about volume — partitioning adds operational complexity (creating new partitions, managing constraints across them) that's wasted on a 100K-row table.

### When to extract to a warehouse

When `EXPLAIN ANALYZE` on your dashboard queries shows scans of millions of rows on every refresh, or when analysts are blocking each other on read replicas. Cheap path: dbt + Fivetran/Airbyte → BigQuery/Snowflake/ClickHouse. Operational queries stay in PG; analytics moves to the warehouse.
