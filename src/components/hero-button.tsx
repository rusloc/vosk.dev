import Link from "next/link";
import styles from "./hero-button.module.css";

/**
 * A home-page CTA. Two elements because the effect is a gradient *frame*: the
 * outer link carries the gradient, the inner span covers all but a 2px rim.
 */
export function HeroButton({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={styles.frame}>
      <span className={styles.inner}>
        {label} <span aria-hidden="true">→</span>
      </span>
    </Link>
  );
}
