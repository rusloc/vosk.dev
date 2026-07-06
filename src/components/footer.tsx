import { Container } from "@/components/container";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <Container className="text-muted-foreground py-8 text-sm">
        <p>© VOSK {year}</p>
      </Container>
    </footer>
  );
}
