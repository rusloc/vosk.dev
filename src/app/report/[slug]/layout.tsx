import "../../globals.css";
import { fontVariables } from "@/lib/fonts";

/**
 * The bare shell for a JS report opened in its own window (owner, 11-03): no nav, no footer,
 * the report alone, as a Power BI link opens app.powerbi.com. It sits outside `[locale]` for
 * that reason and so owns `<html>`/`<body>`, as `global-not-found.tsx` does; the proxy leaves
 * `/report/…` unrewritten. `h-full` down to the body gives a `fill` board (Mirelo) the
 * viewport to size to; a flowing report (P&L) scrolls the document as usual.
 */
export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fontVariables} h-full`}>
      <body className="bg-muted text-foreground h-full font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
