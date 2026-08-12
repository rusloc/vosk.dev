/**
 * Width of the plan picker below `lg`, where one carousel spans the whole
 * column instead of sharing the row with two others.
 *
 * The carousel is the source of truth for this page's stacked width: the pills
 * above it, the splitter under it, and the services list below that all align
 * to the same cap. It lives in its own module rather than in `service-groups`
 * because that file is `"use client"` — a server component importing a string
 * from it would get a client reference, not the string.
 */
export const GROUP_WIDTH = "mx-auto w-full max-w-[26rem] lg:max-w-none";
