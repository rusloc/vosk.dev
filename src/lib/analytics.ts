/**
 * Click tracking contract with GTM (11-18). An element carrying `data-ga` is a GA4 event: GTM's one
 * click trigger reads the nearest `[data-ga]` ancestor of the click and sends `data-ga` as the event
 * name, `data-ga-id` as `content_id` and `data-ga-type` as `content_type` (GA4's built-in "Content ID"
 * and "Content type" dimensions). The container side is `scripts/ga-setup.mjs`. Nothing is sent
 * before the visitor accepts the consent card: GTM is not loaded until then.
 */
export type GaAttrs = {
  "data-ga": string;
  "data-ga-id"?: string;
  "data-ga-type"?: string;
};

export function ga(event: string, id?: string, type?: string): GaAttrs {
  return {
    "data-ga": event,
    ...(id ? { "data-ga-id": id } : {}),
    ...(type ? { "data-ga-type": type } : {}),
  };
}
