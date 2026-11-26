"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitContactForm } from "@/app/[locale]/contact/actions";
import { trackLead } from "@/components/analytics";
import { readLandingSource } from "@/lib/lead-source";
import type { ContactState } from "@/lib/schema";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import cta from "./cta-button.module.css";

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

  // When the form appeared: the action is told how long it was open (the server's bot check, 11-25).
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

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
    <form
      // R-07: the tab's landing path and campaign tags go with the message, for the owner's email only.
      action={(fd) => {
        for (const [key, value] of readLandingSource()) fd.set(key, value);
        fd.set("elapsed", String(Date.now() - openedAt.current));
        formAction(fd);
      }}
      className="space-y-5"
      noValidate
    >
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
        className={`${cta.cta} ${cta.accent}`}
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
