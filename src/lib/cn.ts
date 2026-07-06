/** Join truthy class names with a space. Minimal — no tailwind-merge needed yet. */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
