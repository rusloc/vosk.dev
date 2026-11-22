import type { Metadata } from "next";
import { FabricLanding } from "@/components/landing/fabric-landing";
import { siteConfig } from "@/lib/site";

// Ad-only (layout: noindex, not in the sitemap, linked from nowhere on the site). The title and description are what
// a shared link and the Ads crawler see; they carry the ad group's phrase like the H1.
export const metadata: Metadata = {
  title: {
    absolute: `Microsoft Fabric Engineer & Architect | ${siteConfig.author.name}`,
  },
  description:
    "Microsoft Fabric engineering and architecture: data from databases, CRMs, ERPs and APIs; ETL/ELT pipelines, lakehouse, warehouse and semantic models. Fixed-scope projects from $2k.",
};

export default function FabricLandingPage() {
  return <FabricLanding />;
}
