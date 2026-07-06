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
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {/* Mobile: natural inline flow (unchanged). */}
            <span className="md:hidden">
              <span className="font-bold italic uppercase">Save</span> money by
              understanding{" "}
              <span className="font-bold italic uppercase">data</span>
            </span>

            {/* Desktop: two rows, DATA pushed to the very end of its row. */}
            <span className="hidden md:flex md:flex-col">
              <span>
                <span className="font-bold italic uppercase">Save</span> money
                by understanding
              </span>
              <span className="self-end">
                <span className="font-bold italic uppercase">data</span>
              </span>
            </span>
          </h1>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/work"
              className="bg-primary text-primary-foreground inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium transition-opacity hover:opacity-90"
            >
              View cases
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
