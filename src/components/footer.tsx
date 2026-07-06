import { Container } from "@/components/container";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <Container className="text-muted-foreground py-8 text-xs">
        <p>
          <span className="hidden sm:inline">© VOSK </span>
          {year}
        </p>
      </Container>
    </footer>
  );
}
