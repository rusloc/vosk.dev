import { z } from "zod";
import { SOURCE_MAX } from "./lead-source";

/** Locale-dependent validation messages injected into the schema. */
export type ContactMessages = {
  invalidEmail: string;
  messageTooShort: string;
  messageTooLong: string;
};

/** Contact form input. Validated on the server before any email is sent. */
export function makeContactSchema(msg: ContactMessages) {
  return z.object({
    email: z.email(msg.invalidEmail).max(200),
    subject: z.string().trim().max(150).optional(),
    message: z
      .string()
      .trim()
      .min(10, msg.messageTooShort)
      .max(5000, msg.messageTooLong),
  });
}

export type ContactInput = z.infer<ReturnType<typeof makeContactSchema>>;

/** One source value: trimmed and capped, empty or not a string → absent. Never fails, so it never blocks a send. */
const sourceValue = z
  .string()
  .trim()
  .transform((s) => s.slice(0, SOURCE_MAX) || undefined)
  .optional()
  .catch(undefined);

/**
 * Where the visitor came from (R-07, `lead-source.ts`): the landing path and its campaign tags, sent by the form.
 * Unknown keys are stripped, not rejected: the source is optional context, not input to check.
 */
export const leadSourceSchema = z.object({
  landing_path: sourceValue,
  utm_source: sourceValue,
  utm_medium: sourceValue,
  utm_campaign: sourceValue,
  utm_term: sourceValue,
  utm_content: sourceValue,
  gclid: sourceValue,
});

export type ContactFieldErrors = Partial<Record<keyof ContactInput, string[]>>;

/** State shape shared between the Server Action and the client form. */
export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: ContactFieldErrors;
};
