import { Container } from "@/components/container";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <Container className="text-muted-foreground py-8 text-sm">
        <p>© VOSK {year}</p>
      </Container>
    </footer>
  );
}
