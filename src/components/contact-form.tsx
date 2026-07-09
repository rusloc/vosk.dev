"use client";

import { useActionState, useEffect } from "react";
import { submitContactForm } from "@/app/contact/actions";
import { trackLead } from "@/components/analytics";
import type { ContactState } from "@/lib/schema";

const initialState: ContactState = { status: "idle" };

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(
    submitContactForm,
    initialState,
  );

  // Lead conversion — fires once on success (covers the Contacts page and the
  // nav popup, which both render this form). No-op until GTM loads.
  useEffect(() => {
    if (state.status === "success") trackLead();
  }, [state.status]);

  if (state.status === "success") {
    return (
      <p
        role="status"
        className="border-border bg-muted rounded-md border p-4 text-sm"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {/* Honeypot — hidden from users, catches bots. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={Boolean(state.fieldErrors?.email)}
          className={fieldClass}
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <div>
        <label htmlFor="subject" className="text-sm font-medium">
          Subject <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          className={fieldClass}
          aria-invalid={Boolean(state.fieldErrors?.subject)}
        />
        <FieldError errors={state.fieldErrors?.subject} />
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          aria-invalid={Boolean(state.fieldErrors?.message)}
          className={fieldClass}
        />
        <FieldError errors={state.fieldErrors?.message} />
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground inline-flex h-11 cursor-pointer items-center justify-center rounded-md px-6 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-red-600">{errors[0]}</p>;
}
