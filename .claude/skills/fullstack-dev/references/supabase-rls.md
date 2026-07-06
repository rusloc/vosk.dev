# Supabase RLS Policy Patterns

## Basic User-Scoped Access

```sql
-- User can only CRUD their own rows
create policy "user_select" on table_name for select using (auth.uid() = user_id);
create policy "user_insert" on table_name for insert with check (auth.uid() = user_id);
create policy "user_update" on table_name for update using (auth.uid() = user_id);
create policy "user_delete" on table_name for delete using (auth.uid() = user_id);
```

## Role-Based Access (via profiles)

```sql
-- Admin role check
create policy "admin_all" on table_name
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

## Multi-Tenant (org/workspace pattern)

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table org_members (
  org_id uuid references organizations on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text default 'member',  -- 'owner', 'admin', 'member'
  primary key (org_id, user_id)
);

create table org_resources (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations on delete cascade,
  data jsonb
);

-- Members can read org resources
create policy "org_members_read" on org_resources for select
  using (
    org_id in (
      select org_id from org_members where user_id = auth.uid()
    )
  );

-- Only org owners/admins can write
create policy "org_admin_write" on org_resources for insert
  with check (
    org_id in (
      select org_id from org_members
      where user_id = auth.uid() and role in ('owner', 'admin')
    )
  );
```

## Service Role Bypass (for server-side admin operations)

```ts
// Use service role client for admin operations — bypasses RLS
// NEVER expose this key client-side
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!, // server-only env var
);
```

## Shared / Public Content

```sql
-- Public read, owner write
create policy "public_read" on posts for select using (true);
create policy "owner_write" on posts for insert with check (auth.uid() = user_id);
create policy "owner_update" on posts for update using (auth.uid() = user_id);
```

## Storage RLS

```sql
-- Allow users to upload to their own folder
create policy "user_upload" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "user_read_own" on storage.objects for select
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Public bucket (no auth required to read)
create policy "public_read" on storage.objects for select
  using (bucket_id = 'public-assets');
```

## Useful Helper Functions

```sql
-- Check if user is member of org
create or replace function is_org_member(org_id uuid)
returns boolean as $$
  select exists (
    select 1 from org_members
    where org_members.org_id = $1 and user_id = auth.uid()
  );
$$ language sql security definer;

-- Get user's plan from profiles
create or replace function get_user_plan()
returns text as $$
  select plan from profiles where id = auth.uid();
$$ language sql security definer;

-- Feature gate by plan
create policy "pro_only_feature" on premium_table for select
  using (get_user_plan() in ('pro', 'enterprise'));
```
