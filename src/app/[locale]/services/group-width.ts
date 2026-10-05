/**
 * Width of the plan picker below `lg`, where one card spans the whole column
 * instead of sharing the grid with the other two.
 *
 * The card is the source of truth for this page's stacked width: the pills
 * above it and the subscription's services box below it align to the same cap. It lives in its own module rather than in `service-groups`
 * because that file is `"use client"` — a server component importing a string
 * from it would get a client reference, not the string.
 */
export const GROUP_WIDTH = "mx-auto w-full max-w-[26rem] lg:max-w-none";
