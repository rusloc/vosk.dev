import { Container } from "@/components/container";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <Container className="text-muted-foreground flex items-center justify-between py-8 font-mono text-xs tracking-wider uppercase">
        <p>
          © <span className="hidden sm:inline">VOSK </span>
          {year}
        </p>
        <p className="hidden sm:block">Freelance BI · Remote / EU</p>
      </Container>
    </footer>
  );
}
