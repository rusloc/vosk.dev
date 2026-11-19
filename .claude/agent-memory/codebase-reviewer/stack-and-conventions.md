---
name: stack-and-conventions
description: vosk.dev site stack (Next 16.2 App Router, Turbopack, Zod 4, vitest) and the repo's own layout/dup conventions that override the generic review references
metadata:
  type: project
---

## Stack (verified 2026-11-18)
- Next.js 16.2.10 App Router, React 19.2.4, TypeScript 5 strict + `noUncheckedIndexedAccess`, `incremental: true`.
- Build: Turbopack (`.next/turbopack`, chunk names like `3j7hlosaryejl.js`). Pages statically rendered under `src/app/[locale]/`; `revalidate` ISR on `/work/[slug]` for Cube.
- Tailwind 4, ESLint 9 (next core-web-vitals + typescript + prettier), Prettier. Vitest 4 (`pnpm test`).
- Zod 4 (classic API, not zod/mini), `postgres` 3.4.9 for per-report readers, `@anthropic-ai/sdk` for chat, recharts 3 (vendored Tremor), hyparquet.
- Path alias `@/*` -> `src/*`. Single app at repo root, no monorepo.
- Route handlers: `/api/<report>/[...path]` (5 JS reports read Supabase), `/api/chat/<report>` (shared `chatRoute` factory in `src/lib/chat/route.ts`).

## Conventions (what the repo does on purpose; do not raise as findings)
- Each JS report = `lib/<report>/` (framework-free engine) + `components/<report>/` (own design system, own CSS). Reports were handed over as standalone apps and are owned here since.
- Vendored, "copied not linked" (ADR-0013 (h)): every `parquet-columns.ts` (4 copies), Tremor in `components/tremor/` (`any` lives there), `chart-scale.ts`. Mirelo `glass.tsx` is a deliberate fork of the P&L one (9 lines differ).
- `src/lib/content.ts` is the only MDX seam; `src/lib/work.ts` is the showcase registry (discriminated union by `platform`).
- Site-owned shared report plumbing lives in `components/report-*.tsx` (report-board, report-dialog, report-search) and `lib/chat/`.
- Per-report `server.ts` closes its pool when no read is in flight (Vercel freeze vs role connection limit, 11-06): deliberate, not a perf finding.
- Session pooler 5432 only; `server.ts` throws on 6543. Never read `.env*`.
- Analytics: clicks via `data-ga` attrs from `ga()` in `lib/analytics.ts`; non-clicks via `trackEvent()` (gtag `arguments` push) in `components/analytics.tsx`. Plain `{event}` dataLayer pushes are ignored by the container.

- Shared report plumbing since 11-18: `src/lib/report-data/` (route, reader, rate-limit, artifacts, columns; columns.ts is
  client-safe, reader.ts is server-only), `scripts/lib/load-report.ts`, `components/use-modal.ts`, `report-load.ts`,
  `chat/report-chat.tsx`. Mirelo and P&L keep their own artifacts.ts and loaders; P&L keeps its own load effect (entity switch).
- Each report keeps its own `ArtifactSource` interface (the typing follows its vendored parquet-columns): not a dup finding.
- Branch-only heavy client components go behind a client `next/dynamic` wrapper (`sales-dashboard-lazy.tsx`, `js-report-lazy.tsx`); the repo measured on 09-27 that a server page ships every client component it imports.
- Parked on purpose, not dead code: the ASCII portrait (`components/ascii-portrait.tsx`, `lib/ascii-portrait-art.ts`, restore note in contact page) and `lib/i18n/ru.ts` (not in `dictionaries`, English placeholders for new keys; only a test imports it).

## Judged acceptable duplication (do not re-raise)
- parquet-columns x4, Tremor bar/combo chart overlap, mirelo/pnl glass + chart-scale, `MONTHS` constants across separate report engines, long metric catalogues (declarative tables of 43-60 defs).

Related: [[baseline]], [[open-findings]], [[tools-here]]
