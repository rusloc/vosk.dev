# Color scheme

Source of truth: the `:root` block in `src/app/globals.css`. Tailwind v4 is
configured CSS-first — there is no `tailwind.config.ts`; the `@theme inline`
block in that same file *is* the theme, and it's what turns a token into a
utility class.

Single warm-cream theme. **No dark mode** — no `dark:` variants, no
`prefers-color-scheme`, no theme toggle anywhere in the codebase.

## Tokens

| Token | Value | Tailwind utility | Role |
| --- | --- | --- | --- |
| `--background` | `#fff8e7` | `bg-background` | **Main color.** Page background; also the card/panel surface and the sticky nav (`bg-background/80`). |
| `--accent-rgb` | `255, 153, 28` → `#ff991c` | *(none — see below)* | **Bars / accent.** Warm orange behind the home backdrop bars and the blog/service title bars. Decorative only. |
| `--primary` | `#4f46e5` | `text-primary`, `bg-primary`, `border-primary` | **Highlight font color.** Links, the italic emphasized words in the h1, prices, blockquote rule, CTA hover fill, focus ring. |
| `--foreground` | `#1f1b16` | `text-foreground`, `bg-foreground` | **Main font color.** Body text — and inverted fills (see below). |
| `--muted` | `#f4ead0` | `bg-muted` | Secondary surface: inline `<code>`, hover on bordered chips/tags/pagination, placeholder boxes. |
| `--muted-foreground` | `#6f6a5f` | `text-muted-foreground` | Secondary text: summaries, meta rows, breadcrumbs, footer, form hints. |
| `--border` | `#e7dbbe` | `border-border` | Every border and rule — nav underline, footer top, card borders, dividers, chips. |
| `--primary-foreground` | `#ffffff` | `text-primary-foreground` | Text sitting on a `--primary` fill (contact submit, analytics accept). |
| `--primary-rgb` | `79, 70, 229` | *(none — raw channels)* | The indigo as raw channels, for `rgba()` composition. |

## Three things the CSS doesn't say out loud

- **`--accent-rgb` is deliberately not in `@theme`.** There is no `bg-accent` or
  `text-accent` utility. The orange is reachable only through plain CSS as
  `rgba(var(--accent-rgb), …)`, which is how the blurred bars get their alpha
  ramp.
- **`--primary` is derived from `--primary-rgb`, not the other way around.** The
  raw channels exist so callers can pick their own alpha; deriving `--primary`
  from them is what keeps the CTA hover fill and the emphasized h1 words from
  drifting apart. Keep that direction if you edit the indigo.
- **`--foreground` doubles as a surface.** Pills, CTA buttons and the circular
  arrow badges invert to `bg-foreground text-background` — near-black block,
  cream text. It is not a text-only token.

## Where the values are echoed

These hard-code the hexes and can't read CSS variables. A palette change has to
land here too, or it's only half applied.

- `src/app/[locale]/layout.tsx` — `themeColor: "#fff8e7"`
- `src/app/manifest.ts` — `background_color` + `theme_color`
- `src/app/icon.tsx`, `src/app/apple-icon.tsx` — `#FF991C` on `#4f46e5`
- `src/app/opengraph-image.tsx` and `src/app/[locale]/blog/[slug]/opengraph-image.tsx`
- `src/lib/contact-email.ts` — the `C` palette object (email clients don't do CSS vars)
