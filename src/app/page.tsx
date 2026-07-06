import Link from "next/link";
import { Container } from "@/components/container";
import { HomeBackdrop } from "@/components/home-backdrop";
import { CodeTyper } from "@/components/code-typer";

export default function Home() {
  return (
    <>
      <HomeBackdrop />
      <CodeTyper />
      <Container className="py-24 sm:py-32">
        <div className="max-w-2xl">
          <p className="text-primary text-sm font-medium">
            Freelance BI Analyst &amp; Developer
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Turning raw data into decisions.
          </h1>
          <p className="text-muted-foreground mt-6 text-lg">
            I design dashboards, build data pipelines, and ship analytics that
            teams actually use — from messy source data to a clear answer.
          </p>
        </div>
        <div className="mt-10 flex justify-end">
          <Link
            href="/work"
            className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium transition-opacity hover:opacity-90"
          >
            View cases
          </Link>
        </div>
      </Container>
    </>
  );
}
