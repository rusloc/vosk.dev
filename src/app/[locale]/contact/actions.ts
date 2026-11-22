"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { z } from "zod";
import {
  leadSourceSchema,
  makeContactSchema,
  type ContactState,
} from "@/lib/schema";
import { SOURCE_FIELDS } from "@/lib/lead-source";
import { getContactConfig } from "@/lib/contact-config";
import { renderContactEmail, renderAutoReplyEmail } from "@/lib/contact-email";
import { siteConfig } from "@/lib/site";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

// Best-effort in-memory rate limit. On serverless this is per-instance and
// resets on cold start — enough to blunt casual abuse on a low-traffic site.
// Upgrade path (if abuse appears): a shared store like Upstash Ratelimit.
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const hits = new Map<string, number[]>();

function isRateLimited(key: string, now: number): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function submitContactForm(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  // Locale travels in a hidden field so responses match the page's language.
  const rawLocale = String(formData.get("locale") ?? "");
  const locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const t = getDictionary(locale).form;

  // Honeypot: bots fill hidden fields. Pretend success so we don't tip them off.
  if (String(formData.get("company") ?? "").trim() !== "") {
    return { status: "success", message: t.success };
  }

  const schema = makeContactSchema(t);
  const parsed = schema.safeParse({
    email: formData.get("email"),
    subject: formData.get("subject") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: t.errorFields,
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const now = Date.now();
  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  if (isRateLimited(ip, now)) {
    return {
      status: "error",
      message: t.errorRateLimit,
    };
  }

  const { apiKey, to, from } = getContactConfig();
  if (!apiKey) {
    return {
      status: "error",
      message: `${t.errorNotConfigured} ${siteConfig.contactEmail}.`,
    };
  }

  const { email, subject, message } = parsed.data;
  // R-07: where the visitor came from; any bad value is dropped, never an error.
  const source = leadSourceSchema.parse(
    Object.fromEntries(
      SOURCE_FIELDS.map((f) => [f, formData.get(f) ?? undefined]),
    ),
  );

  try {
    const resend = new Resend(apiKey);
    const { html, text } = renderContactEmail({
      email,
      subject,
      message,
      source,
    });
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: subject ? `Contact: ${subject}` : `New message from ${email}`,
      html,
      text,
    });

    if (error) {
      return {
        status: "error",
        message: `${t.errorSendFailed} ${siteConfig.contactEmail}.`,
      };
    }

    // Auto-reply to the visitor — best-effort. The lead already reached the inbox
    // above, so a failure here must not fail the submission; `replyTo` points at
    // the owner so the visitor's reply lands in the right place.
    try {
      const reply = renderAutoReplyEmail({ email, subject, message });
      await resend.emails.send({
        from,
        to: email,
        replyTo: to,
        subject: `Thanks for reaching out — ${siteConfig.name}`,
        html: reply.html,
        text: reply.text,
      });
    } catch {
      // Swallow: the notification succeeded; the confirmation is non-critical.
    }
  } catch {
    return {
      status: "error",
      message: `${t.errorSendFailed} ${siteConfig.contactEmail}.`,
    };
  }

  return { status: "success", message: t.success };
}
