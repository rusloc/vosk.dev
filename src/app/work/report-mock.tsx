/**
 * Decorative "kinda report" illustration for the showcase list card — a static
 * inline SVG standing in for a real dashboard thumbnail. Hosts the three pieces
 * asked for: a headline number, static vertical bars, and a donut chart with
 * placeholder text lines. Purely illustrative (aria-hidden); the real report lives
 * on the detail page. Colors come from the site palette + brand amber/green.
 */
export function ReportMock({ metric = "$10M" }: { metric?: string }) {
  return (
    <svg
      viewBox="0 0 440 300"
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      {/* report card */}
      <rect x="1" y="1" width="438" height="298" rx="16" fill="#ffffff" stroke="#e7dbbe" strokeWidth="2" />

      {/* LIVE pill */}
      <rect x="24" y="22" width="80" height="30" rx="15" fill="#ffffff" stroke="#e7dbbe" strokeWidth="1.5" />
      <circle cx="43" cy="37" r="5" fill="#16a34a" />
      <text x="57" y="42" fontSize="13" fontWeight="700" letterSpacing="0.5" fill="#1f1b16">LIVE</text>

      {/* headline number */}
      <rect x="24" y="66" width="184" height="96" rx="12" fill="#f4ead0" />
      <text x="42" y="114" fontSize="32" fontWeight="800" fill="#1f1b16">{metric}</text>
      <path d="M42 134 l6 -9 l6 9 z" fill="#16a34a" />
      <text x="56" y="141" fontSize="13" fontWeight="600" fill="#16a34a">12.4% revenue</text>

      {/* static vertical bars */}
      <rect x="220" y="66" width="196" height="96" rx="12" fill="#f4ead0" />
      <rect x="244" y="112" width="26" height="34" rx="4" fill="#e8b24a" />
      <rect x="286" y="94" width="26" height="52" rx="4" fill="#e8b24a" />
      <rect x="328" y="72" width="26" height="74" rx="4" fill="#1f1b16" />
      <rect x="370" y="104" width="26" height="42" rx="4" fill="#e8b24a" />

      {/* donut + placeholder text lines */}
      <rect x="24" y="176" width="392" height="100" rx="12" fill="#f4ead0" />
      <g transform="rotate(-90 78 226)">
        <circle cx="78" cy="226" r="26" fill="none" stroke="#e8b24a" strokeWidth="15" />
        <circle cx="78" cy="226" r="26" fill="none" stroke="#1f1b16" strokeWidth="15" strokeDasharray="65 98" />
      </g>
      <rect x="140" y="200" width="230" height="11" rx="5.5" fill="#e7dbbe" />
      <rect x="140" y="221" width="190" height="11" rx="5.5" fill="#e7dbbe" />
      <rect x="140" y="242" width="210" height="11" rx="5.5" fill="#e7dbbe" />
    </svg>
  );
}
