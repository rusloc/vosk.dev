import Link from "next/link";
import styles from "./cta-button.module.css";

/** A home-page CTA. Same style as the nav "Message" button — see the module. */
export function HeroButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={styles.cta}>
      {label}
    </Link>
  );
}
