"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/cn";
import { SendMessageButton } from "@/components/send-message-button";
import styles from "./nav.module.css";

export function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {siteConfig.name}
        </Link>

        <div className="flex items-center gap-1">
          <ul className="hidden items-center gap-1 md:flex">
            {siteConfig.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    styles.navLink,
                    "px-3 py-2 text-sm",
                    isActive(item.href)
                      ? "text-foreground font-bold"
                      : "text-muted-foreground",
                  )}
                >
                  <span className={styles.label} data-label={item.label}>
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <SendMessageButton className="ml-2 hidden md:inline-flex" />

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="border-border bg-background text-foreground hover:bg-muted fixed right-2 bottom-2 z-50 inline-flex h-11 w-11 items-center justify-center rounded-md border shadow-lg transition-colors md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4"
              aria-hidden="true"
            >
              {open ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <ul className="border-border bg-background absolute inset-x-0 top-full border-b px-4 py-2 shadow-lg md:hidden">
          {siteConfig.nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "hover:bg-muted block rounded-md px-3 py-2 text-sm transition-colors",
                  isActive(item.href)
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li className="px-3 py-2">
            <SendMessageButton className="inline-flex w-full" />
          </li>
        </ul>
      )}
    </header>
  );
}
