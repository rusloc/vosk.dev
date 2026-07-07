# VOSK.DEV — Coms Log

One line per user request + brief response. Tag `#decision` / `#idea` / `#bug` inline for grep.

## 2026-07-06 _(DAY CLOSED)_
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
- Nav fixes: added "Home" item; renamed "Contracts" → "Contacts"; #bug fixed cross-page horizontal jump via `scrollbar-gutter: stable` on html (scrollbar appeared only on the tall Contacts page).
- #bug Right-side code "not visible": verified it renders/types fine (SSR wrapper present, GET / 200) — root cause was 10px blur obliterating thin text at 20% opacity. Fixed: blur 10px→2px, opacity 0.2→0.45.
- Moved code block into the page's lower-right quadrant (fixed top:50%/left:50%, 50%×50%).
- Top-anchored the code (align-items flex-start) so lines appear downward without sliding up.
- Moved code block to bottom-right cell of a 3×3 grid; footer stamp trimmed → "© VOSK {year}".
- #bug Mobile burger menu shifted page layout → made the popup an absolute overlay (`bg-background` + shadow) so content no longer moves.
- Answered GoDaddy→Vercel domain wiring for `vosk.dev` (apex A `76.76.21.21`, `www` CNAME `cname.vercel-dns.com`, leave `_domainconnect`, skip GoDaddy forwarding, `.dev` = auto-HTTPS). #idea No code.
- Removed footer top border (gray line).
- Home bars: right-only 8px rounding + left→right 0→90% opacity gradient (converted SVG→divs). Nav buttons → gradient hover-fill.
- Nav iterations: burger floated bottom-right; hover-fill recolored to bar orange then dropped entirely; settled on animated gray underline wiping in left→right; 2px corners; active item BOLD.
- #bug Nav buttons jumped between pages (bold = wider) → reserve bold width per item via a hidden grid-stacked ghost. #decision
- Footer: smaller (`text-xs`), responsive — `© 2026` on mobile, `© VOSK 2026` on desktop.
- Hero: dropped eyebrow; new headline (SAVE/SPEEDY/DATA emphasis) → later simplified to "Save money by understanding **data**"; CTA reduced to single left-aligned "View cases" (removed "Get in touch"). Desktop = forced two-row layout with DATA pushed to the row's far right; mobile natural flow.
- #feature Contact page fits one mobile screen: new subtitle, **removed Name field** end-to-end (form + Zod + Server Action), tightened spacing. #idea Recommended Cloudflare Turnstile as the captcha (honeypot + rate-limit already present) — not yet implemented.
- Clarified "hero" terminology (user had misread the term); no change — hero kept.
- Code-typer placement dialed in responsively (desktop bottom-right 3×3 cell; mobile right-2/3 strip).
- #feature Code-typer rewritten: 9 snippets (3 each SQL/Python/DAX), 7–9 lines, ≤28 cols. Desktop-only invisible click target opens a fixed-size, unblurred popup that types + **loops the clicked snippet forever**.
