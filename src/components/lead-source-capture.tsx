"use client";

import { useEffect } from "react";
import { rememberLandingSource } from "@/lib/lead-source";

/** Keeps the tab's landing path and campaign tags for the contact form (R-07, `lib/lead-source.ts`). Renders nothing. */
export function LeadSourceCapture() {
  useEffect(rememberLandingSource, []);
  return null;
}
