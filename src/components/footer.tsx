import { Container } from "@/components/container";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <Container className="text-muted-foreground py-8 text-sm">
        <p>© VOSK.DEV {year} · Freelance BI analyst &amp; developer.</p>
      </Container>
    </footer>
  );
}
