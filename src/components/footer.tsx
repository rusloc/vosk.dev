import Link from "next/link";
import { Container } from "@/components/container";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border border-t">
      <Container className="text-muted-foreground flex flex-col items-center justify-between gap-4 py-8 text-sm sm:flex-row">
        <p>
          © VOSK.DEV {year} · Freelance BI analyst &amp; developer.
        </p>
        <div className="flex items-center gap-4">
          <a
            href={`mailto:${siteConfig.contactEmail}`}
            className="hover:text-foreground"
          >
            Email
          </a>
          <a
            href={`tel:${siteConfig.contactPhoneHref}`}
            className="hover:text-foreground"
          >
            Phone
          </a>
          <a
            href={siteConfig.social.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            LinkedIn
          </a>
          <a
            href={siteConfig.social.github}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <Link href="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </div>
      </Container>
    </footer>
  );
}
