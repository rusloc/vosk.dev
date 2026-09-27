// Tremor cx [v0.0.0]
// Modified for vosk.dev: merged with focusRing into one file

import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cx(...args: ClassValue[]) {
  return twMerge(clsx(...args));
}

// Tremor focusRing [v0.0.1]
// Modified for vosk.dev: outline colour -> primary token, dark-mode variant removed

export const focusRing = [
  // base
  "outline outline-offset-2 outline-0 focus-visible:outline-2",
  // outline color
  "outline-primary",
];
