# BLOB and File Storage

Where to put files (audio, video, images, PDFs, generated artifacts), how to model them in your schema, and how to serve them safely.

The first principle: **Postgres is not a file store.** Storing BLOBs in `bytea` columns bloats your tables, kills backup/restore times, eliminates CDN caching, and makes you pay PG-tier prices for storage that's 100x cheaper elsewhere. The exceptions to this rule are small (see below).

---

## Choosing a storage backend

| Backend              | Best for                                  | Notes                                                                                                                                                       |
| -------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Supabase Storage** | Anything in a Supabase project            | S3-compatible API, integrates with Supabase Auth + RLS via `storage.objects`, transformations for images. Per-region; no built-in multi-region replication. |
| **AWS S3**           | AWS-native apps, mature ecosystem         | The reference. Most expensive on egress. Use Intelligent-Tiering for archive savings.                                                                       |
| **Cloudflare R2**    | Anything user-facing where egress matters | **Zero egress fees.** S3-compatible API. Pair with Cloudflare CDN/Workers for the best edge story. Default pick for B2C apps.                               |
| **Backblaze B2**     | Cheapest cold storage                     | S3-compatible. Egress is cheap, especially via Cloudflare bandwidth alliance. Good for backups and archives.                                                |
| **GCS**              | GCP-native, AI/ML workloads using Vertex  | Strong if your stack is already on GCP.                                                                                                                     |
| **Azure Blob**       | Azure-native enterprise                   | Same as GCS reasoning, for Azure shops.                                                                                                                     |

**Default recommendation for new projects:** Supabase Storage (if Supabase) or Cloudflare R2 + the project's chosen DB. Both have S3-compatible APIs so you can switch later without rewriting upload/download code.

---

## The metadata-table pattern

Whatever backend stores the bytes, the schema needs a metadata table to track them. Every project needs one (or several, scoped per use case).

### Generic `files` table

```sql
CREATE TABLE files (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by     uuid          NOT NULL REFERENCES auth.users(id),

  -- Storage location
  bucket          text          NOT NULL,
  path            text          NOT NULL,             -- key within the bucket
  storage_provider text         NOT NULL DEFAULT 'supabase',  -- 'supabase','s3','r2','b2'

  -- File facts
  filename        text          NOT NULL,             -- original filename, for downloads
  mime_type       text          NOT NULL,
  size_bytes      bigint        NOT NULL,
  checksum        text,                               -- e.g. sha256, for dedup + integrity
  width           integer,                            -- for images / videos
  height          integer,                            -- for images / videos
  duration_ms     integer,                            -- for audio / video

  -- Lifecycle
  upload_status   text          NOT NULL DEFAULT 'pending'
                                CHECK (upload_status IN ('pending','complete','failed','deleted')),
  uploaded_at     timestamptz,                        -- set when client confirms upload
  expires_at      timestamptz,                        -- for auto-cleanup of temp files

  -- App-specific
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  deleted_at      timestamptz,

  UNIQUE (bucket, path)
);

CREATE INDEX files_organization_uploaded_at_idx ON files(organization_id, created_at DESC);
CREATE INDEX files_checksum_idx ON files(checksum) WHERE checksum IS NOT NULL;
CREATE INDEX files_pending_uploads_idx ON files(uploaded_at)
  WHERE upload_status = 'pending';  -- for cleanup jobs
```

### Per-domain attachment tables

The generic `files` table answers "what files exist." Attachment tables answer "what does this file belong to."

```sql
-- Files attached to specific entities (preserves FK integrity)
CREATE TABLE message_attachments (
  message_id    uuid          NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_id       uuid          NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  position      integer       NOT NULL DEFAULT 0,
  PRIMARY KEY (message_id, file_id)
);

CREATE TABLE ticket_attachments (
  ticket_id     uuid          NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_id       uuid          NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  PRIMARY KEY (ticket_id, file_id)
);
```

**Why separate `files` from `*_attachments`:** Files are the _thing_; attachments are the _relationship_. A file uploaded once might end up attached to multiple entities (forwarded message, copied to a new ticket, used in a knowledge base). Avoid duplicating bytes; attach the same `files.id` from multiple junction tables.

If you don't anticipate cross-entity reuse, you can collapse this — put `entity_type` + `entity_id` directly on `files`. But that gives up FK integrity (polymorphic FK) and slightly limits reuse. For greenfield design, prefer the junction-table approach.

---

## The two upload patterns

### Pattern A: Server-side upload (proxied)

```
Client → POST /api/upload (file in body)
   → API auth check, size/mime validation
   → API uploads to storage backend
   → API writes files row with upload_status = 'complete'
   → API returns { file_id, ... } to client
```

**Pros:**

- Single round-trip from the client's perspective
- All validation happens server-side before storage
- File row exists at the moment the file is uploaded — no orphan windows

**Cons:**

- Doubles bandwidth (client → API → storage); costs money if bytes are large
- API server needs the bandwidth and memory to handle uploads — can be slow for big files
- Hard to do progress UX, resumable uploads, multipart uploads

**Use when:** files are small (<10MB), uploads are infrequent, or you want maximum simplicity.

### Pattern B: Direct-to-storage with signed URL

```
Client → POST /api/files/sign-upload (body: filename, mime, size)
   → API auth check, size/mime validation
   → API writes files row with upload_status = 'pending'
   → API requests signed upload URL from storage backend
   → API returns { file_id, signed_url, headers } to client

Client → PUT signed_url (file in body)
   → Storage backend validates signature, accepts file

Client → POST /api/files/{file_id}/confirm
   → API verifies the file exists in storage (HEAD request)
   → API updates files row to upload_status = 'complete', sets uploaded_at
   → API returns { file_id, ... }
```

**Pros:**

- Bandwidth flows directly client → storage; your API doesn't pay for it
- Easy to support progress, resumable uploads, multipart for large files
- API stays cheap and stateless

**Cons:**

- More round-trips
- Orphan window: a row is `pending` until the client confirms — needs a cleanup job
- Trust verification: you can't trust the size/checksum the client claims; verify against storage after upload

**Use when:** files are large, uploads are frequent, or you want a great upload UX.

For Supabase Storage, signed upload URLs are generated via `createSignedUploadUrl`. For S3/R2, use S3 presigned PUT URLs.

### Cleanup of orphan pending uploads

```sql
-- Run periodically (e.g., hourly cron):
DELETE FROM files
WHERE upload_status = 'pending'
  AND created_at < now() - interval '1 hour';
```

Combined with bucket lifecycle rules to delete the orphan bytes.

---

## Audio and video specifics

Beyond the metadata table, audio/video typically require **transcoding** (multiple variants for different bandwidth/devices) and **streaming-friendly delivery**.

### Variants pattern

```sql
CREATE TABLE media_assets (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  uploaded_by     uuid          NOT NULL REFERENCES auth.users(id),
  asset_type      text          NOT NULL CHECK (asset_type IN ('audio','video')),
  -- Original file
  original_file_id uuid         NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  -- Properties of the original
  duration_ms     integer,
  width           integer,
  height          integer,
  -- Processing state
  processing_status text        NOT NULL DEFAULT 'pending'
                                CHECK (processing_status IN ('pending','processing','complete','failed')),
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE media_variants (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        uuid          NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  file_id         uuid          NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  variant_type    text          NOT NULL,    -- 'thumbnail','preview','hls_360p','hls_720p','mp3_128','waveform_json'
  width           integer,
  height          integer,
  bitrate_kbps    integer,
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (asset_id, variant_type)
);
```

### Transcoding workflow

1. User uploads original via Pattern B (direct upload)
2. After confirm, an event/queue job triggers transcoding (ffmpeg, AWS MediaConvert, Mux, Cloudflare Stream, etc.)
3. Job writes each variant to storage and inserts a `media_variants` row
4. When all expected variants are present, set `media_assets.processing_status = 'complete'`
5. Client polls or subscribes to realtime updates to know when playback is ready

### Streaming format choices

- **HLS (.m3u8 + segments)** — universal browser/native support, adaptive bitrate. Default for video.
- **DASH** — same idea as HLS, slightly better tech, less universal support. Use if you have specific players that need it.
- **Progressive MP4** — fine for short clips, no adaptive bitrate. Easy to serve.
- **Audio** — MP3 (universal), AAC (better quality), Opus (best compression but less universal). Generate at least one universal variant.

### Storage class decisions

- **Hot** (S3 Standard, R2 standard, Supabase Storage) — recently uploaded, frequently accessed
- **Cool** (S3 Infrequent Access, B2) — accessed occasionally, originals after transcoding
- **Cold** (S3 Glacier IR / Deep Archive, B2) — long-term retention with infrequent access

Pattern: keep originals in cold/cool storage after transcoding (they're rarely re-fetched). Keep variants in hot storage for fast playback. Use bucket lifecycle rules to transition.

---

## AI-generated artifacts

Generated images, audio, video, and documents from AI workflows fit the same pattern but with extra concerns:

- **Provenance** — track which model/run produced the artifact (`run_id` FK)
- **Cost attribution** — generation costs money; track it
- **Retention** — generated content can balloon storage bills. Consider TTL for "preview" generations vs. "saved" ones.
- **Regeneration** — keep the prompt/seed/parameters in metadata so the artifact can be regenerated if lost
- **Watermarking / labels** — for AI-generated content destined for public consumption, consider C2PA labels or visible watermarks

```sql
CREATE TABLE ai_artifacts (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid          NOT NULL,
  project_id      uuid          NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  run_id          uuid          REFERENCES runs(id),
  artifact_type   text          NOT NULL,  -- 'image','audio','video','document'
  file_id         uuid          NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  -- Generation parameters: prompt, seed, model version, etc.
  generation_params jsonb       NOT NULL,
  cost_cents      bigint,
  saved_by_user   boolean       NOT NULL DEFAULT false,  -- distinguish "saved" vs "ephemeral preview"
  metadata        jsonb         NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  expires_at      timestamptz                          -- for auto-cleanup of unsaved previews
);
```

---

## Serving files

### Public files (e.g., product images on a storefront)

- Make the bucket public-read
- Serve via CDN (Cloudflare in front of R2/S3, or Supabase's built-in CDN)
- Use immutable URLs (path-includes-hash) so caching works

### Private files (per-user uploads, sensitive documents)

- Bucket is private
- API endpoint that auth-checks the user, then issues a short-lived signed URL
- Client fetches via the signed URL directly (CDN-cacheable per signed URL)

### Image transformations

If your storage supports on-the-fly transformations (Supabase Storage, Cloudflare Images, imgix), use them — don't pre-generate every thumbnail size. Resize on demand based on URL params, cache aggressively.

```
https://<project>.supabase.co/storage/v1/render/image/public/avatars/abc.png
  ?width=200&height=200&resize=cover
```

For storage backends without transformations, integrate a service like Cloudinary or imgix in front, or pre-generate the common sizes during upload.

---

## When BLOBs in PG are actually OK

Rare but real cases:

- **Tiny binary payloads** (<8KB) tightly coupled to a row — e.g., a generated barcode or QR code that's always fetched with the row, never cached separately
- **Cryptographic material** that must be transactionally consistent with row updates and is never served at scale
- **Tightly-coupled binary blobs** in legacy systems being migrated, before you can move to object storage

Even here, consider whether the BLOB really needs to be in PG or if a `bytea` column on a _separate_ table (so it doesn't bloat the main table's TOAST/heap) would suffice. PG's `bytea` is honest about being binary, but performance characteristics on `bytea`-heavy tables are noticeably worse than on row-narrow tables.

---

## RLS for files

Two layers:

1. **Database RLS** on the `files` and `*_attachments` tables (org-isolation, ownership)
2. **Storage RLS** on `storage.objects` for the actual bytes (see `references/supabase-and-rls.md` storage policies section)

Both layers must agree. If a user can read a file row but not the underlying object, you have a frustrating UX. If they can read the object but not the row, you have an information leak.

The cleanest setup: keep file paths predictable from the file row (`{organization_id}/{file_id}.{ext}`) so a single RLS policy on storage can mirror the database policy.

---

## Backup and retention

- **Don't back up file bytes via `pg_dump`** — it's the wrong tool, and your DB backups will explode in size
- **Use the storage backend's native versioning + replication** — S3 versioning, R2 versioning, Supabase Storage's backup features
- **Set bucket lifecycle rules** for retention (delete after N days, transition to cheaper class)
- **Audit log file deletes** — track who deleted what and when, especially for compliance use cases

---

## Quick decision tree

```
Is the file under 8KB AND tightly coupled to a row AND never cached?
├─ Yes → Maybe `bytea` is OK (rare)
└─ No  → Object storage + metadata table

Will this file be served to users frequently?
├─ Yes → Hot storage tier; consider CDN
└─ No  → Cool/cold storage; serve via signed URL on demand

Is the file public?
├─ Yes → Public bucket + CDN
└─ No  → Private bucket + signed URLs from your API

Is the file large or are uploads frequent?
├─ Yes → Direct-to-storage with signed upload URLs
└─ No  → Server-side upload is fine

Does the file need transcoding (audio/video)?
├─ Yes → media_assets + media_variants tables; transcoding queue
└─ No  → files table is enough
```
