import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/container";
import { HomeBackdrop } from "@/components/home-backdrop";
import { CodeTyper } from "@/components/code-typer";
import { JsonLd } from "@/components/json-ld";
import { homeGraph } from "@/lib/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
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
            <Link
              href="/work"
              className="bg-foreground text-background inline-flex h-12 items-center justify-center gap-2 rounded-md px-7 text-sm font-medium transition-opacity hover:opacity-90"
            >
              View case studies <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
