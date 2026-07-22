import Link from "next/link";
import { Container } from "@/components/container";

export default function NotFound() {
  return (
    <Container className="py-32 text-center">
      <p className="text-primary text-sm font-medium">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-muted-foreground mt-4">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="border-border hover:bg-muted mt-8 inline-flex h-11 items-center justify-center rounded-md border px-6 text-sm font-medium transition-colors"
      >
        Back home
      </Link>
    </Container>
  );
}
