# Contact form setup

The contact form (Contacts page + the nav "Message" popup) sends email through
[Resend](https://resend.com). The code is complete and ships safely with **nothing
configured** — until a Resend key is present it shows a friendly "email me directly"
message instead of sending. This doc is the one-time setup to make it actually deliver.

## Environment variables

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `RESEND_API_KEY` | to send | — (form no-ops without it) | Server-only secret. |
| `CONTACT_TO_EMAIL` | no | `vosk.dev@gmail.com` | Inbox that receives messages. Plain email. |
| `CONTACT_FROM_EMAIL` | no | `VOSK Website <onboarding@resend.dev>` | Verified sender. `"Name <email>"` or bare address. |
| `NEXT_PUBLIC_SITE_URL` | yes (SEO) | `http://localhost:3000` | Client-safe; unrelated to sending but listed for completeness. |

Config is read + validated server-side in `src/lib/contact-config.ts` (kept out of the
client-imported `src/lib/env.ts` so secrets never enter the client bundle).

## Step 1 — Create the Resend key

1. Sign up at [resend.com](https://resend.com) (use `vosk.dev@gmail.com`).
2. **API Keys → Create** → copy the `re_...` value.
3. Local dev: put it in `.env.local` as `RESEND_API_KEY=...`.

At this point the form already works using Resend's shared test sender
(`onboarding@resend.dev`). Messages arrive at `CONTACT_TO_EMAIL` (default the Gmail),
`reply-to` is set to the visitor's address.

## Step 2 — Set the vars in Vercel

Vercel → Project → **Settings → Environment Variables**, for **Production + Preview**:

- `RESEND_API_KEY` = your `re_...` key
- `CONTACT_TO_EMAIL` = `vosk.dev@gmail.com` (or wherever you want leads)
- `CONTACT_FROM_EMAIL` = leave unset for now (uses the test sender), or set once the
  domain is verified (Step 3)

Redeploy after adding them (env changes need a new build).

## Step 3 — Send from your own domain (recommended, removes the test-sender look)

1. Resend → **Domains → Add Domain** → `vosk.dev`.
2. Add the **SPF + DKIM** DNS records Resend shows, at your DNS host (GoDaddy).
3. Wait for Resend to mark the domain **Verified**.
4. Set `CONTACT_FROM_EMAIL="VOSK Website <noreply@vosk.dev>"` in Vercel → redeploy.

## Verification checklist (on the Vercel preview, not localhost)

- [ ] Submit the **Contacts page** form → success message shows.
- [ ] Submit the **nav "Message" popup** → success message shows.
- [ ] Email arrives at `CONTACT_TO_EMAIL`; **reply-to** is the sender's address.
- [ ] `From` shows the verified `noreply@vosk.dev` (after Step 3) — not `onboarding@resend.dev`.
- [ ] **Honeypot**: a filled hidden `company` field returns success but sends nothing.
- [ ] **Rate limit**: the 6th submit within an hour from one IP is refused.
- [ ] With the key unset (or on a fresh preview), the form shows the "email me directly" fallback — no crash.
