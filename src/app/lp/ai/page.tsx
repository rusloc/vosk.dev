import type { Metadata } from "next";
import { AgentsLanding } from "@/components/landing/agents-landing";
import { siteConfig } from "@/lib/site";

// Ad-only (layout: noindex, not in the sitemap, linked from nowhere on the site). The title and description are what
// a shared link and the Ads crawler see; they carry the ad group's phrase like the H1.
export const metadata: Metadata = {
  title: {
    absolute: `AI Agents, n8n & Automation | ${siteConfig.author.name}`,
  },
  description:
    "n8n workflows on self-hosted servers you own, AI agents you can trust, and a chat over your company data that emails ready reports. Free initial call.",
};

export default function AgentsLandingPage() {
  return <AgentsLanding />;
}
