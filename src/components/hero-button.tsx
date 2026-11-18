import Link from "next/link";
import type { GaAttrs } from "@/lib/analytics";
import styles from "./cta-button.module.css";

/** A home-page CTA. Same style as the nav "Message" button — see the module. */
export function HeroButton({
  href,
  label,
  ga,
}: {
  href: string;
  label: string;
  ga?: GaAttrs;
}) {
  return (
    <Link href={href} className={styles.cta} {...ga}>
      {label}
    </Link>
  );
}
