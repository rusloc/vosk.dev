import type { Locale } from "./config";
import { en, type Dictionary } from "./en";
import { ru } from "./ru";

/**
 * Locale → message catalog. Both are static imports (the catalogs are small and
 * the whole site is statically rendered), so `getDictionary` is synchronous.
 */
const dictionaries: Record<Locale, Dictionary> = { en, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
