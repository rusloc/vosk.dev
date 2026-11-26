import { describe, expect, it } from "vitest";
import { makeContactSchema } from "./schema";

// The contact form's input rules (11-25 audit): the subject is one line, since it goes into the email subject header,
// and an unknown field is refused, per the project's `.strict()` rule.

const schema = makeContactSchema({
  invalidEmail: "bad email",
  messageTooShort: "too short",
  messageTooLong: "too long",
});
const valid = { email: "a@example.com", message: "A message long enough." };

describe("makeContactSchema", () => {
  it("folds line breaks in the subject into single spaces", () => {
    const r = schema.parse({ ...valid, subject: "Hi\r\nBcc: x@example.com" });
    expect(r.subject).toBe("Hi Bcc: x@example.com");
  });

  it("refuses an unknown field", () => {
    expect(schema.safeParse({ ...valid, extra: "x" }).success).toBe(false);
  });
});
