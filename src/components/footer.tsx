import { Container } from "@/components/container";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <Container className="text-muted-foreground flex items-center justify-between py-8 font-mono text-xs tracking-wider uppercase">
        <p className="flex items-center">
          © <span className="hidden sm:inline">&nbsp;VOSK</span>
          &nbsp;{year}
        </p>
        <p className="hidden items-center gap-2 sm:flex">
          <span aria-hidden="true" className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          Available for new projects
        </p>
      </Container>
    </footer>
  );
}
