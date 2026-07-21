"use server";

import { headers } from "next/headers";
import { Resend } from "resend";
import { z } from "zod";
import { contactSchema, type ContactState } from "@/lib/schema";
import { getContactConfig } from "@/lib/contact-config";
import { renderContactEmail } from "@/lib/contact-email";
import { siteConfig } from "@/lib/site";

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
  // Honeypot: bots fill hidden fields. Pretend success so we don't tip them off.
  if (String(formData.get("company") ?? "").trim() !== "") {
    return { status: "success", message: SUCCESS_MESSAGE };
  }

  const parsed = contactSchema.safeParse({
    email: formData.get("email"),
    subject: formData.get("subject") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
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
      message: "Too many messages in a short time. Please try again later.",
    };
  }

  const { apiKey, to, from } = getContactConfig();
  if (!apiKey) {
    return {
      status: "error",
      message: `The contact form isn't fully set up yet. Please email me directly at ${siteConfig.contactEmail}.`,
    };
  }

  const { email, subject, message } = parsed.data;

  try {
    const resend = new Resend(apiKey);
    const { html, text } = renderContactEmail({ email, subject, message });
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
        message: `Sorry — sending failed. Please email me directly at ${siteConfig.contactEmail}.`,
      };
    }
  } catch {
    return {
      status: "error",
      message: `Sorry — sending failed. Please email me directly at ${siteConfig.contactEmail}.`,
    };
  }

  return { status: "success", message: SUCCESS_MESSAGE };
}

const SUCCESS_MESSAGE =
  "Thanks — your message is on its way. I'll get back to you soon.";
