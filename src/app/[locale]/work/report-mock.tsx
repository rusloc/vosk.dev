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
      <rect
        x="1"
        y="1"
        width="438"
        height="248"
        rx="16"
        fill="#ffffff"
        stroke="#e7dbbe"
        strokeWidth="2"
      />

      {/* headline number */}
      <rect x="20" y="20" width="190" height="102" rx="12" fill="#f4ead0" />
      <text x="40" y="83" fontSize="34" fontWeight="800" fill="#1f1b16">
        {metric}
      </text>

      {/* static vertical bars */}
      <rect x="230" y="20" width="190" height="102" rx="12" fill="#f4ead0" />
      <rect x="252" y="74" width="24" height="34" rx="4" fill="#e8b24a" />
      <rect x="292" y="56" width="24" height="52" rx="4" fill="#e8b24a" />
      <rect x="332" y="34" width="24" height="74" rx="4" fill="#1f1b16" />
      <rect x="372" y="66" width="24" height="42" rx="4" fill="#e8b24a" />

      {/* donut + placeholder text lines */}
      <rect x="20" y="134" width="400" height="96" rx="12" fill="#f4ead0" />
      <g transform="rotate(-90 74 182)">
        <circle
          cx="74"
          cy="182"
          r="26"
          fill="none"
          stroke="#e8b24a"
          strokeWidth="15"
        />
        <circle
          cx="74"
          cy="182"
          r="26"
          fill="none"
          stroke="#1f1b16"
          strokeWidth="15"
          strokeDasharray="65 98"
        />
      </g>
      <rect x="132" y="158" width="250" height="11" rx="5.5" fill="#e7dbbe" />
      <rect x="132" y="179" width="205" height="11" rx="5.5" fill="#e7dbbe" />
      <rect x="132" y="200" width="230" height="11" rx="5.5" fill="#e7dbbe" />
    </svg>
  );
}

/**
 * The same card for an n8n workflow showcase (11-16): a trigger, a branch and three steps joined by wires, in the
 * report mock's palette. Decorative as well; the real canvas opens on the detail page.
 */
export function FlowMock() {
  return (
    <svg
      viewBox="0 0 440 250"
      className="h-auto w-full"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="438"
        height="248"
        rx="16"
        fill="#ffffff"
        stroke="#e7dbbe"
        strokeWidth="2"
      />

      {/* wires */}
      <g fill="none" stroke="#c9bb98" strokeWidth="4">
        <path d="M88 125 H132" />
        <path d="M188 125 C214 125 214 72 242 72" />
        <path d="M188 125 C214 125 214 178 242 178" />
        <path d="M298 72 H342" />
      </g>

      {/* trigger, branch, steps */}
      <rect x="32" y="97" width="56" height="56" rx="28" fill="#1f1b16" />
      <path
        d="M52 117 h16 v16 h-16 z M52 117 l8 7 l8 -7"
        fill="none"
        stroke="#e8b24a"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="132"
        y="97"
        width="56"
        height="56"
        rx="12"
        fill="#f4ead0"
        stroke="#e7dbbe"
        strokeWidth="2"
      />
      <path
        d="M148 125 h10 l10 -10 M158 125 l10 10"
        fill="none"
        stroke="#1f1b16"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="242" y="44" width="56" height="56" rx="12" fill="#e8b24a" />
      <rect
        x="342"
        y="44"
        width="56"
        height="56"
        rx="12"
        fill="#f4ead0"
        stroke="#e7dbbe"
        strokeWidth="2"
      />
      <rect
        x="242"
        y="150"
        width="56"
        height="56"
        rx="12"
        fill="#f4ead0"
        stroke="#e7dbbe"
        strokeWidth="2"
      />
      <g fill="#1f1b16">
        <rect x="354" y="60" width="32" height="5" rx="2.5" />
        <rect x="354" y="70" width="32" height="5" rx="2.5" />
        <rect x="354" y="80" width="20" height="5" rx="2.5" />
      </g>
      <rect x="254" y="172" width="32" height="12" rx="6" fill="#e7dbbe" />
    </svg>
  );
}
