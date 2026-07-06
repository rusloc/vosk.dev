import { z } from "zod";

/** Contact form input. Validated on the server before any email is sent. */
export const contactSchema = z.object({
  email: z.email("Please enter a valid email address").max(200),
  subject: z.string().trim().max(150).optional(),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters")
    .max(5000, "Message is too long"),
});

export type ContactInput = z.infer<typeof contactSchema>;

export type ContactFieldErrors = Partial<Record<keyof ContactInput, string[]>>;

/** State shape shared between the Server Action and the client form. */
export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: ContactFieldErrors;
};
