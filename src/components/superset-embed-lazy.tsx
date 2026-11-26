"use client";

import dynamic from "next/dynamic";

/** The split point for the Superset embed and its SDK (11-25 review), loaded only where a dashboard renders. */
export const SupersetEmbedLazy = dynamic(() =>
  import("./superset-embed").then((m) => m.SupersetEmbed),
);
