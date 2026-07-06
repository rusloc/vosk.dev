# VOSK.DEV — Coms Log

One line per user request + brief response. Tag `#decision` / `#idea` / `#bug` inline for grep.

## 2026-07-06 _(DAY OPEN)_
- Onboarding: oriented in the day-zero repo; found `.claude/` scaffold was copied from an unrelated project (YAGA). #decision Re-homed the scaffold onto VOSK.DEV (rewrote CLAUDE.md, wiped YAGA agent memory, de-YAGA'd agents, added lightweight logging) and scaffolded the Next.js + Tailwind site. #decision Stack = Next.js App Router + TS strict + Tailwind + Vercel, single app, MDX content, Resend contact form, no DB.
- Phase 0 foundation: scaffolded Next.js 16 + React 19 + Tailwind v4 (TS strict), design tokens, root layout, nav (active-state + mobile menu), footer, home hero, stub pages (/work /services /blog /contact), 404. Verified typecheck+lint+build green (6 static routes). #feature
- Asked what Vercel project settings to use → advised framework preset (Next.js auto), root `./`, Node 22.x, env vars (`NEXT_PUBLIC_SITE_URL` now; Resend vars later), pnpm pin, domain+DNS notes. #decision
- Footer footstamp → "© VOSK.DEV {year}", year auto from `new Date().getFullYear()` (build-time stamp).
- Wired real contact details site-wide: email `vosk.dev@gmail.com` + phone `+90 506 042 59 33` into `siteConfig` (footer + contact page).
- Renamed/reordered nav labels → Showcase · Blog · Service · Contracts (URLs unchanged). Flagged "Contracts" vs "Contact" possible typo (kept as written).
- Phase 2 contact form: built Server Action + Resend + Zod + honeypot + best-effort in-memory rate-limit; delivers to `vosk.dev@gmail.com`, reply-to = sender. Works once `RESEND_API_KEY` set (defaults let it go live with just the key). #feature
- Removed footer link menu (Email…Contact); kept copyright stamp; dropped orphan imports.
- #decision Replaced dark mode with a single warm-cream theme (`#FFF8E7`), retuned tokens, removed `next-themes` + theme toggle/provider.
- #bug Vercel build failed (`Cannot find module @/app/contact/actions`) → root cause: `actions.ts` + `schema.ts` were untracked, never pushed. Fixed by committing them (`7e75583`). Checked git tree: clean, HEAD == origin/main.
- Home backdrop: added 5 frosted animated SVG bars (left→right one-shot on load, home-only). #feature Then restyled (thicker=10% vh, centered cluster, closer gaps, black→grey gradient, widths 75%→25%). Then recolored all to `#FF991C` with opacity fade 25%→10%.
- Code-typer backdrop: looping Python/SQL/DAX "fun code" typing column, right ~20vw, blue, 10px blur, 20% opacity, reduced-motion aware; 9 snippets interleaved + looped. #feature Flagged: 10px blur makes code texture-only; offered ~2-3px if legibility wanted.
