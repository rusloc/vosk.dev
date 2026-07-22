import { z } from "zod";

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

export type ContactFieldErrors = Partial<Record<keyof ContactInput, string[]>>;

/** State shape shared between the Server Action and the client form. */
export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: ContactFieldErrors;
};
