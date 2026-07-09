import type { Metadata } from "next";
import { Container } from "@/components/container";
import { HeroCta } from "@/components/hero-cta";
import { HomeBackdrop } from "@/components/home-backdrop";
import { CodeTyper } from "@/components/code-typer";
import { JsonLd } from "@/components/json-ld";
import { homeGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "/feed.xml" },
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={homeGraph()} />
      <HomeBackdrop />
      <CodeTyper />
      <Container className="py-20 sm:py-28">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Save <span className="text-primary italic">money</span> by
            understanding your{" "}
            <span className="text-primary italic">data</span>.
          </h1>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <HeroCta />
          </div>
        </div>
      </Container>
    </>
  );
}
