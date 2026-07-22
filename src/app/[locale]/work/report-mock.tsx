/**
 * Decorative "kinda report" illustration for the showcase list card — a static
 * inline SVG standing in for a real dashboard thumbnail. Hosts the three pieces
 * asked for: a headline number, static vertical bars, and a donut chart with
 * placeholder text lines. Purely illustrative (aria-hidden); the real report lives
 * on the detail page. Colors come from the site palette + brand amber.
 */
export function ReportMock({ metric = "$10M" }: { metric?: string }) {
  return (
    <svg
      viewBox="0 0 440 250"
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      {/* report card */}
      <rect x="1" y="1" width="438" height="248" rx="16" fill="#ffffff" stroke="#e7dbbe" strokeWidth="2" />

      {/* headline number */}
      <rect x="20" y="20" width="190" height="102" rx="12" fill="#f4ead0" />
      <text x="40" y="83" fontSize="34" fontWeight="800" fill="#1f1b16">{metric}</text>

      {/* static vertical bars */}
      <rect x="230" y="20" width="190" height="102" rx="12" fill="#f4ead0" />
      <rect x="252" y="74" width="24" height="34" rx="4" fill="#e8b24a" />
      <rect x="292" y="56" width="24" height="52" rx="4" fill="#e8b24a" />
      <rect x="332" y="34" width="24" height="74" rx="4" fill="#1f1b16" />
      <rect x="372" y="66" width="24" height="42" rx="4" fill="#e8b24a" />

      {/* donut + placeholder text lines */}
      <rect x="20" y="134" width="400" height="96" rx="12" fill="#f4ead0" />
      <g transform="rotate(-90 74 182)">
        <circle cx="74" cy="182" r="26" fill="none" stroke="#e8b24a" strokeWidth="15" />
        <circle cx="74" cy="182" r="26" fill="none" stroke="#1f1b16" strokeWidth="15" strokeDasharray="65 98" />
      </g>
      <rect x="132" y="158" width="250" height="11" rx="5.5" fill="#e7dbbe" />
      <rect x="132" y="179" width="205" height="11" rx="5.5" fill="#e7dbbe" />
      <rect x="132" y="200" width="230" height="11" rx="5.5" fill="#e7dbbe" />
    </svg>
  );
}
