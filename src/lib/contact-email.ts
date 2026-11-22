import type { LeadSource } from "./lead-source";
import { siteConfig } from "./site";

/**
 * The two transactional emails the contact form sends:
 *  - `renderContactEmail`   → notification that lands in the owner's inbox.
 *  - `renderAutoReplyEmail` → confirmation sent back to the visitor.
 * Both return `{ html, text }`: a styled site-palette HTML body (table-based +
 * inline styles for email-client compat) and a plaintext fallback. They share one
 * `shell()` so the two stay visually identical.
 *
 * Subject/message/email are visitor-supplied, so every interpolated value is
 * HTML-escaped before it touches the markup — no injection into either email.
 */

/** Escape user input for safe inclusion in HTML (body + attributes). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Site palette (mirrors globals.css) + the brand orange from the favicon.
const C = {
  bg: "#fff8e7",
  card: "#ffffff",
  footer: "#fffdf7",
  panel: "#f4ead0",
  border: "#e7dbbe",
  fg: "#1f1b16",
  muted: "#6f6a5f",
  primary: "#4f46e5",
  accent: "#ff991c",
} as const;

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const host = siteConfig.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** Wraps a body fragment in the branded card (VOSK header + shared footer). */
function shell(opts: {
  preheader: string;
  body: string;
  footer: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background:${C.bg};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${C.card};border:1px solid ${C.border};border-radius:12px;overflow:hidden;font-family:${FONT};">

<tr><td style="padding:20px 28px;border-bottom:1px solid ${C.border};">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td width="30" height="30" align="center" valign="middle" style="width:30px;height:30px;background:${C.accent};border-radius:7px;color:${C.primary};font-family:${FONT};font-weight:700;font-size:16px;line-height:30px;">V</td>
<td style="padding-left:10px;font-family:${FONT};font-weight:600;font-size:15px;letter-spacing:.02em;color:${C.fg};">VOSK<span style="color:${C.muted};">.DEV</span></td>
</tr></table>
</td></tr>

<tr><td style="padding:28px;">${opts.body}</td></tr>

<tr><td style="padding:18px 28px;border-top:1px solid ${C.border};background:${C.footer};">
<p style="margin:0;font-size:12px;line-height:1.6;color:${C.muted};">${opts.footer}</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Reusable body pieces ─────────────────────────────────────────────────────

function eyebrow(label: string): string {
  return `<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:${C.accent};">${label}</p>`;
}
function heading(text: string): string {
  return `<h1 style="margin:0 0 22px;font-size:20px;font-weight:600;color:${C.fg};">${text}</h1>`;
}
function messagePanel(safeMessage: string): string {
  return `<div style="margin-top:16px;background:${C.panel};border:1px solid ${C.border};border-radius:10px;padding:18px 20px;font-size:15px;line-height:1.65;color:${C.fg};">${safeMessage}</div>`;
}
function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr>
<td style="border-radius:8px;background:${C.primary};">
<a href="${href}" style="display:inline-block;padding:11px 22px;font-family:${FONT};font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">${label}</a>
</td></tr></table>`;
}

// ── 1. Notification → owner's inbox ──────────────────────────────────────────

/**
 * The Source block's rows (R-07): landing page, campaign tags, and whether a Google click id came with the visit.
 * The id itself is never printed.
 */
export function sourceRows(source: LeadSource = {}): [string, string][] {
  if (!Object.values(source).some(Boolean)) return [["Source", "not recorded"]];
  const tags: [string, string | undefined][] = [
    [
      "Source / medium",
      [source.utm_source, source.utm_medium].filter(Boolean).join(" / "),
    ],
    ["Campaign", source.utm_campaign],
    ["Keyword", source.utm_term],
    ["Ad", source.utm_content],
  ];
  const present = tags.filter((r): r is [string, string] => Boolean(r[1]));
  return [
    ["Landing page", source.landing_path ?? "not recorded"],
    ...(present.length
      ? present
      : [["Campaign tags", "none"] as [string, string]]),
    ["Google Ads click", source.gclid ? "yes" : "no"],
  ];
}

export function renderContactEmail(input: {
  email: string;
  subject?: string;
  message: string;
  source?: LeadSource;
}): { html: string; text: string } {
  const { email, subject, message } = input;
  const source = sourceRows(input.source);

  const text = [
    `New message from the ${siteConfig.name} website`,
    "",
    `From: ${email}`,
    subject ? `Subject: ${subject}` : null,
    "",
    message,
    "",
    "Source",
    ...source.map(([label, value]) => `${label}: ${value}`),
    "",
    `— Reply directly to this email to respond to ${email}.`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const safeEmail = escapeHtml(email);
  const safeSubject = subject ? escapeHtml(subject) : "";
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const replyHref = escapeHtml(
    `mailto:${email}?subject=${encodeURIComponent(`Re: ${subject ?? "your message"}`)}`,
  );

  const subjectRow = safeSubject
    ? `<tr>
        <td style="padding:8px 0;font-size:13px;color:${C.muted};width:72px;vertical-align:top;">Subject</td>
        <td style="padding:8px 0;font-size:14px;color:${C.fg};">${safeSubject}</td>
      </tr>`
    : "";

  const body = `${eyebrow("New enquiry")}${heading("You've got a new message")}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
<tr>
<td style="padding:8px 0;font-size:13px;color:${C.muted};width:72px;vertical-align:top;">From</td>
<td style="padding:8px 0;font-size:14px;"><a href="mailto:${safeEmail}" style="color:${C.primary};text-decoration:none;font-weight:500;">${safeEmail}</a></td>
</tr>
${subjectRow}
</table>
${messagePanel(safeMessage)}
${button(replyHref, `Reply to ${safeEmail}`)}
<p style="margin:28px 0 6px;font-size:12px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:${C.muted};">Source</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
${source
  .map(
    ([label, value]) => `<tr>
<td style="padding:4px 0;font-size:13px;color:${C.muted};width:132px;vertical-align:top;">${label}</td>
<td style="padding:4px 0;font-size:13px;color:${C.fg};word-break:break-all;">${escapeHtml(value)}</td>
</tr>`,
  )
  .join("\n")}
</table>`;

  const html = shell({
    preheader: escapeHtml(
      subject ? `${subject} — from ${email}` : `New message from ${email}`,
    ),
    body,
    footer: `Sent from the contact form at <a href="${escapeHtml(siteConfig.url)}" style="color:${C.muted};">${escapeHtml(host)}</a>. Just hit reply — it goes straight to the sender.`,
  });

  return { html, text };
}

// ── 2. Auto-reply → visitor ──────────────────────────────────────────────────

export function renderAutoReplyEmail(input: {
  email: string;
  subject?: string;
  message: string;
}): { html: string; text: string } {
  const { message } = input;
  const author = siteConfig.author.firstName;
  const workUrl = `${siteConfig.url.replace(/\/$/, "")}/work`;

  const text = [
    `Thanks for reaching out to ${siteConfig.name}.`,
    "",
    `Hi — I've received your message and I'll get back to you personally, usually within a day or two.`,
    "",
    "Here's what you sent:",
    message,
    "",
    `In the meantime, you can browse recent dashboards: ${workUrl}`,
    "",
    `— ${author}, ${siteConfig.name}`,
  ].join("\n");

  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  const body = `${eyebrow("Message received")}${heading("Thanks for reaching out")}
<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${C.fg};">Hi — I've received your message and I'll get back to you personally, usually within a day or two.</p>
<p style="margin:0;font-size:13px;color:${C.muted};">Here's what you sent, for your records:</p>
${messagePanel(safeMessage)}
${button(escapeHtml(workUrl), "Browse recent dashboards")}
<p style="margin:24px 0 0;font-size:14px;color:${C.fg};">— ${escapeHtml(author)}, <span style="color:${C.muted};">${siteConfig.name}.DEV</span></p>`;

  const html = shell({
    preheader: `Thanks — I've received your message and will get back to you soon.`,
    body,
    footer: `You're receiving this because you contacted ${siteConfig.name} through <a href="${escapeHtml(siteConfig.url)}" style="color:${C.muted};">${escapeHtml(host)}</a>. This inbox is monitored — just reply if you'd like to add anything.`,
  });

  return { html, text };
}
