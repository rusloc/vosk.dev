import type { Locale } from "./config";
import { en, type Dictionary } from "./en";

/**
 * Locale → message catalog. Static imports (the catalogs are small and the whole
 * site is statically rendered), so `getDictionary` is synchronous.
 *
 * `ru.ts` is deliberately kept and deliberately not imported — the site is
 * English-only. Re-adding "ru" to `locales` in ./config makes this a type error,
 * which is the point: the compiler names the one other line that has to change.
 */
const dictionaries: Record<Locale, Dictionary> = { en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
