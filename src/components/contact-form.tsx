"use client";

import { useActionState, useEffect } from "react";
import { submitContactForm } from "@/app/[locale]/contact/actions";
import { trackLead } from "@/components/analytics";
import type { ContactState } from "@/lib/schema";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";

const initialState: ContactState = { status: "idle" };

const fieldClass =
  "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

export function ContactForm({
  locale,
  dict,
}: {
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.form;
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
      {/* Locale travels with the submission so the action replies in-language. */}
      <input type="hidden" name="locale" value={locale} />

      {/* Honeypot — hidden from users, catches bots. */}
      <div className="hidden" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label htmlFor="email" className="text-sm font-medium">
          {t.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          aria-invalid={Boolean(state.fieldErrors?.email)}
          className={fieldClass}
        />
        <FieldError errors={state.fieldErrors?.email} />
      </div>

      <div>
        <label htmlFor="subject" className="text-sm font-medium">
          {t.subjectLabel}{" "}
          <span className="text-muted-foreground">{t.subjectOptional}</span>
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          placeholder={t.subjectPlaceholder}
          className={fieldClass}
          aria-invalid={Boolean(state.fieldErrors?.subject)}
        />
        <FieldError errors={state.fieldErrors?.subject} />
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium">
          {t.messageLabel}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={4}
          placeholder={t.messagePlaceholder}
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
        {pending ? t.sending : t.submit}
      </button>
    </form>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="mt-1 text-sm text-red-600">{errors[0]}</p>;
}
