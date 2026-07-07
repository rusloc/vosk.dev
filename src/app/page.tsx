import Link from "next/link";
import { Container } from "@/components/container";
import { HomeBackdrop } from "@/components/home-backdrop";
import { CodeTyper } from "@/components/code-typer";

export default function Home() {
  return (
    <>
      <HomeBackdrop />
      <CodeTyper />
      <Container className="py-20 sm:py-28">
        <div className="max-w-3xl">
          {/* Availability eyebrow */}
          <p className="text-muted-foreground flex items-center gap-2.5 font-mono text-xs tracking-[0.15em] uppercase sm:text-sm">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 ring-4 ring-green-500/15"
            />
            Available for new projects · Q3 2026
          </p>

          <h1 className="mt-8 text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            Save money by understanding your{" "}
            <span className="text-primary">data</span>.
          </h1>

          <p className="text-muted-foreground mt-8 max-w-xl text-lg leading-relaxed sm:text-xl">
            Freelance BI analyst &amp; developer. Dashboards, data pipelines,
            and analytics that turn raw numbers into decisions you can act on.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/work"
              className="bg-foreground text-background inline-flex h-12 items-center justify-center gap-2 rounded-md px-7 text-sm font-medium transition-opacity hover:opacity-90"
            >
              View case studies <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/services"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              or explore services
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
