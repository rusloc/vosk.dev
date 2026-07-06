# Supabase, RLS, and PostgreSQL Security

The full playbook for securing PG/Supabase databases. This skill assumes you've read the security quick-reference in SKILL.md.

> **Looking for the Supabase MCP?** All MCP tool inventory, workflow patterns, branching, type regen, debugging, and gotchas live in `supabase-mcp.md`. This file covers RLS and security only.

---

## Table of contents

1. [The Supabase role model](#the-supabase-role-model)
2. [RLS policy patterns](#rls-policy-patterns)
3. [RLS performance](#rls-performance)
4. [SECURITY DEFINER functions](#security-definer-functions)
5. [Storage policies](#storage-policies)
6. [Vault for secrets](#vault-for-secrets)
7. [Edge Functions and security](#edge-functions-and-security)
8. [Native PG security features](#native-pg-security-features)
9. [Common security anti-patterns](#common-security-anti-patterns)

---

## The Supabase role model

Supabase (and PostgREST under the hood) ships with three default roles. Knowing which role each request runs as is the basis of all security reasoning.

| Role            | Used for                        | Bypass RLS?                | Where it lives                                                                                                                 |
| --------------- | ------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `anon`          | Unauthenticated public requests | No                         | The `SUPABASE_ANON_KEY` JWT, used by browser clients                                                                           |
| `authenticated` | Logged-in user requests         | No                         | JWT issued by Supabase Auth after login; client uses it for all subsequent requests                                            |
| `service_role`  | Server-side, trusted code       | **Yes — bypasses all RLS** | The `SUPABASE_SECRET_KEY`. Server-side only. **Never ship this to a browser, mobile app, or any environment a user can read.** |

Plus your own custom roles if you create them (e.g., `analyst`, `support_agent`) with `CREATE ROLE`. These need explicit grants and can have RLS policies written against them.

### How `auth.uid()` works

When a request comes in with an `authenticated` JWT, Supabase decodes the JWT's `sub` claim into `auth.uid()`, available inside RLS policies and SQL functions. This is the user ID — the thing you use to check ownership.

```sql
-- Example: a user can only read their own profile
CREATE POLICY user_profiles_self_read ON user_profiles
  FOR SELECT
  USING (user_id = auth.uid());
```

For `anon` requests, `auth.uid()` returns NULL.

For `service_role`, `auth.uid()` is also typically NULL (no user attached) — use this as a signal that an action is server-initiated.

### Other JWT claim helpers

- `auth.jwt()` — full decoded JWT as JSONB; useful for reading custom claims
- `auth.role()` — the role string (`'anon'`, `'authenticated'`, etc.)
- `auth.email()` — email from the JWT (if present)

---

## RLS policy patterns

The patterns you'll write 90% of the time.

### Pattern 1: Self-owned rows

```sql
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_self_select ON notes
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notes_self_insert ON notes
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notes_self_update ON notes
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notes_self_delete ON notes
  FOR DELETE
  USING (user_id = auth.uid());
```

Note the separation: `USING` is for "which rows can I see/touch", `WITH CHECK` is for "which rows can I create/end-up-with after a write." Always set both for INSERT/UPDATE; otherwise a user could update a row they own to belong to someone else.

### Pattern 2: Org membership

```sql
-- For any tenant table with organization_id:
CREATE POLICY <table>_org_select ON <table>
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM memberships WHERE user_id = auth.uid()
    )
  );
```

But the subquery runs per row — see [RLS performance](#rls-performance) below for how to make this fast.

### Pattern 3: Role-restricted operations

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

### Pattern 4: Public read, authenticated write

```sql
CREATE POLICY products_public_read ON products
  FOR SELECT
  USING (status = 'active');

CREATE POLICY products_admin_write ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid() AND role IN ('owner','admin')
    )
  );
```

The `TO authenticated` clause restricts the policy to authenticated requests; `anon` falls back to the public-read policy.

### Pattern 5: Read your own writes only

For tables where users can submit but only admins can see all entries (e.g., support requests):

```sql
CREATE POLICY requests_self_read ON support_requests
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY requests_anyone_insert ON support_requests
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY requests_admin_all ON support_requests
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');
```

### Pattern 6: Time-bounded access

```sql
CREATE POLICY shared_links_during_validity ON shared_links
  FOR SELECT
  USING (
    expires_at > now()
    AND (token = current_setting('request.jwt.claim.share_token', true))
  );
```

### Pattern 7: Cascade through related tables

For a table that should be readable iff its parent is readable:

```sql
CREATE POLICY order_items_via_order ON order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
        AND orders.customer_id IN (
          SELECT id FROM customers WHERE user_id = auth.uid()
        )
    )
  );
```

---

## RLS performance

RLS policies run on every row access. A subquery in a policy that scans a million rows on every SELECT is a disaster. Three rules.

### Rule 1: Wrap `auth.uid()` in `( SELECT ... )` to let the planner cache it

This is the single most important RLS optimization in Supabase Postgres:

```sql
-- SLOW (auth.uid() is treated as volatile, called per row):
USING (user_id = auth.uid())

-- FAST (PG can evaluate the subquery once and cache):
USING (user_id = (SELECT auth.uid()))
```

This pattern is documented Supabase guidance. Apply it everywhere.

### Rule 2: Index the columns you reference in policies

If your policy says `WHERE user_id = auth.uid()`, you need an index on `user_id`. Same for `organization_id`. Without indexes, every RLS-protected query is a sequential scan.

### Rule 3: Use a SECURITY DEFINER helper for membership lookups

Instead of subquerying `memberships` in every policy:

```sql
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT organization_id FROM public.memberships
  WHERE user_id = (SELECT auth.uid())
$$;

REVOKE ALL ON FUNCTION public.user_organization_ids() FROM public;
GRANT EXECUTE ON FUNCTION public.user_organization_ids() TO authenticated;
```

Then policies become:

```sql
CREATE POLICY <table>_org ON <table>
  FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));
```

The `STABLE` marker lets PG cache the function result within a single statement. The `SECURITY DEFINER` lets it bypass RLS on the membership table itself. The `SET search_path = ''` neutralizes search-path attacks (always do this on `SECURITY DEFINER` functions).

### Rule 4: Test policies with `EXPLAIN ANALYZE`

Run representative queries as both `authenticated` (using `SET ROLE authenticated; SET request.jwt.claims TO '...'`) and `service_role` to compare. If the authenticated plan is dramatically worse, your policy is likely the cause.

---

## SECURITY DEFINER functions

Use when an operation needs to escape RLS in a controlled way — typically for cross-tenant aggregates, server-driven actions, or operations that require elevated privileges.

```sql
CREATE OR REPLACE FUNCTION admin_dashboard_stats()
RETURNS TABLE (total_users bigint, active_orgs bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT count(*) FROM public.users) AS total_users,
    (SELECT count(*) FROM public.organizations
     WHERE updated_at > now() - interval '30 days') AS active_orgs
$$;

-- Lock down execution
REVOKE ALL ON FUNCTION admin_dashboard_stats() FROM public;
GRANT EXECUTE ON FUNCTION admin_dashboard_stats() TO admin_role;
```

**Always:**

- Set `search_path = ''` to prevent attackers from injecting malicious functions/tables into the search path
- `REVOKE` from `public` and explicitly `GRANT EXECUTE` to the intended role only
- Document why the function is `SECURITY DEFINER` — it's a privilege escalation, treat it accordingly

---

## Storage policies

Supabase Storage uses the same RLS engine on the `storage.objects` table. A bucket can be public (no auth) or private (RLS-controlled).

### Pattern: per-user folder

A common UX is "each user has their own folder for uploads." If your bucket is `user-uploads` and the path is `{user_id}/...`:

```sql
CREATE POLICY user_uploads_own_folder ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'user-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

`storage.foldername(name)` returns the path segments as a text array; `[1]` is the first folder.

### Pattern: org-scoped storage

```sql
CREATE POLICY org_files_via_membership ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'org-files'
    AND ((storage.foldername(name))[1])::uuid IN (SELECT public.user_organization_ids())
  );
```

### Pattern: public-read, controlled-write

```sql
-- Public images bucket (e.g., product photos)
CREATE POLICY public_images_anyone_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY public_images_admin_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (auth.jwt() ->> 'role') = 'admin'
  );
```

### Signed URLs

For genuinely private files, the safest UX is to generate signed URLs from your API rather than handing the storage path directly to the client. Signed URLs have a TTL and can encode permissions; clients fetch directly from storage with the signed URL, no auth header needed.

---

## Vault for secrets

Supabase Vault provides encrypted-at-rest secrets queryable from PG. Use it for:

- API keys you call from edge functions / database triggers
- Webhook signing secrets
- Per-tenant integration credentials

```sql
-- Store a secret
SELECT vault.create_secret('sk_live_...', 'stripe_api_key', 'Stripe API key for live mode');

-- Retrieve in a function (never inline in app-visible queries)
SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'stripe_api_key';
```

Never store secrets in regular columns. Never log secrets. Never include secrets in `metadata` JSONB.

---

## Edge Functions and security

Edge Functions run server-side and can use the `service_role` key to bypass RLS. With great power, etc.:

- **Validate the caller** — even though the function is server-side, the caller is usually a user. Check the JWT (`Authorization: Bearer ...`) and verify the user is allowed to do what they're requesting.
- **Use a per-request Supabase client with the user's JWT for the actual data access**, only using `service_role` for the operations that genuinely require it. This way most operations still pass through RLS.
- **Limit the surface** — don't write a generic "run any SQL" edge function. Build endpoints with specific contracts.
- **Rate limit** — even server-side endpoints need rate limiting. Supabase doesn't do this out of the box; enforce in the function or in a CDN/edge middleware in front.

---

## Native PG security features

Beyond Supabase-specific patterns, PG has powerful built-ins.

### `pg_crypto` for encryption

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt a column at the application boundary
INSERT INTO secrets (name, value)
VALUES ('api_key', pgp_sym_encrypt('s3kret', current_setting('app.encryption_key')));

SELECT name, pgp_sym_decrypt(value::bytea, current_setting('app.encryption_key'))
FROM secrets;
```

Better to use Vault for this on Supabase, but `pg_crypto` is the right tool elsewhere.

### Column-level grants

```sql
REVOKE ALL ON users FROM authenticated;
GRANT SELECT (id, name, avatar_url) ON users TO authenticated;
GRANT UPDATE (name, avatar_url) ON users TO authenticated;
```

PG can grant per-column. Useful when you want users to see/update some columns but not others. Less common with RLS-driven designs (RLS is row-level, not column-level), but powerful when needed.

### Role inheritance and `SET ROLE`

```sql
CREATE ROLE app_user;
CREATE ROLE app_admin INHERIT;
GRANT app_user TO app_admin;
```

Useful for organizing custom roles. In Supabase you mostly stick with the built-in roles, but for self-hosted PG this is a clean way to manage permissions.

### `pg_audit` for audit logging

The `pg_audit` extension logs DDL/DML events to PG logs. Heavy-handed for most apps (your `audit_log` table is usually better) but useful for compliance environments.

### Row security with `FORCE ROW LEVEL SECURITY`

By default, table owners bypass RLS. To force it on for everyone:

```sql
ALTER TABLE sensitive_data FORCE ROW LEVEL SECURITY;
```

Useful when the table owner is a role used by app code and you want defense in depth.

---

## Common security anti-patterns

Push back on these whenever you see them:

| Anti-pattern                                                     | Why it's bad                                                           | Fix                                                                       |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| RLS disabled on user-data tables                                 | Data leaks at staging, scripts, accidental queries                     | Enable RLS from the first migration; default-deny is the safe default     |
| Service role key in frontend code                                | Total takeover; bypasses all security                                  | Service role is server-only; use the anon key + RLS for browsers          |
| `auth.uid()` without `(SELECT ...)` wrapping                     | Slow RLS at scale                                                      | Wrap as `(SELECT auth.uid())`                                             |
| Subquery against `memberships` in every policy                   | Slow + repeated logic                                                  | Extract to a STABLE SECURITY DEFINER helper                               |
| `SECURITY DEFINER` without `SET search_path = ''`                | Search-path attack vector                                              | Always set `search_path = ''` on definer functions                        |
| Storing secrets in regular columns                               | Plaintext at rest, in backups, in logs                                 | Vault on Supabase; pgcrypto + KMS elsewhere                               |
| Public buckets for user content                                  | Anyone can list and download                                           | Private bucket + signed URLs from your API                                |
| Direct DB connections from clients (admin tools) using user JWTs | RLS still applies but PII may leak via error messages                  | Use a backend proxy that scopes access; never expose direct DB to clients |
| Trusting JWT claims without validation                           | Forged JWTs (very rare on Supabase, but the pattern matters elsewhere) | Trust only what `auth.uid()` and Supabase's verified helpers give you     |
| Granting `service_role` to authenticated users                   | Total takeover via SQL                                                 | Service role is for server-side use; never grant to anyone else           |
| Logging requests with full payloads including PII                | PII in logs forever                                                    | Redact known PII fields before logging                                    |
| One giant `is_admin` boolean check everywhere                    | Hard to audit, hard to evolve                                          | Use roles in a `memberships` table; check via helper function             |
