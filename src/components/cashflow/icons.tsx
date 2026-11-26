// The mock's inline icons (mockup-v2-ui.js, mockup-v2-pops.js). Decorative: every one is aria-hidden; the button names it.

export const IconBars = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path
      d="M2 10V6M6 10V2M10 10V5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const IconGo = () => (
  <svg viewBox="0 0 12 12" aria-hidden="true">
    <path
      d="M2.5 6h7M6.5 3l3 3-3 3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconChevron = () => (
  <svg className="chev" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M4 6l4 4 4-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const IconMenu = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <g fill="currentColor">
      <rect x="4" y="4" width="6.5" height="6.5" rx="2" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="2" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="2" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="3.25" />
    </g>
  </svg>
);

export const IconDiagram = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="9.5" width="6" height="5" rx="1.5" />
      <rect x="15.5" y="3.5" width="6" height="5" rx="1.5" />
      <rect x="15.5" y="15.5" width="6" height="5" rx="1.5" />
      <path d="M8.5 12h3v-6h4M11.5 12v6h4" />
    </g>
  </svg>
);

export const IconHow = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 17h.01" />
    </g>
  </svg>
);

export const IconCheck = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 12.5l5 5L20 6.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** The zigzag notch on a balance bar longer than the axis (CF-STM-12). */
export const Notch = () => (
  <svg className="brk" viewBox="0 0 14 24" aria-hidden="true">
    <path
      d="M3 0 L9 6 L3 12 L9 18 L3 24"
      fill="none"
      stroke="var(--surf)"
      strokeWidth="4"
    />
  </svg>
);

/** Sort toggle glyph: off (both arrows), up, down. */
export function IconSort({ dir }: { dir: "off" | "up" | "down" }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {dir === "off" ? (
          <path d="M5 6l3-3 3 3M5 10l3 3 3-3" />
        ) : dir === "up" ? (
          <path d="M8 13V3M4.5 6.5L8 3l3.5 3.5" />
        ) : (
          <path d="M8 3v10M4.5 9.5L8 13l3.5-3.5" />
        )}
      </g>
    </svg>
  );
}
