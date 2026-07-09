/**
 * Workflow diagram for the Postgres + Power BI post. Rendered inline (not via
 * <img>) so it inherits the site font (Geist) and stretches to the full article
 * width. Palette maps to the theme: indigo primary nodes, light indigo / orange
 * zone tints, muted-foreground labels — on a transparent (cream) background.
 */
export function WorkflowDiagram() {
  return (
    <svg
      viewBox="0 0 800 410"
      role="img"
      aria-label="Workflow overview: on the SQL IDE side you edit the SQL and assign it to a variable, then write it to a shared SQL source table. On the Power Query side, a base query retrieves the SQL string and a second query runs it to pull the data — no data import in between."
      className="border-border my-6 h-auto w-full rounded-lg border"
    >
      <defs>
        <linearGradient id="wfZoneA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f0fd" />
          <stop offset="1" stopColor="#e2dffa" />
        </linearGradient>
        <linearGradient id="wfZoneB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1da" />
          <stop offset="1" stopColor="#ffe2bd" />
        </linearGradient>
      </defs>

      <text x="30" y="54" fontSize="28" fontWeight="700" fill="#1f1b16">
        Workflow overview
      </text>

      <rect x="24" y="84" width="360" height="272" rx="10" fill="url(#wfZoneA)" stroke="#d3cff6" />
      <rect x="416" y="84" width="360" height="272" rx="10" fill="url(#wfZoneB)" stroke="#f4cf9c" />

      <text x="204" y="388" fontSize="16" fontWeight="600" fill="#6f6a5f" textAnchor="middle">
        SQL IDE
      </text>
      <text x="596" y="388" fontSize="16" fontWeight="600" fill="#6f6a5f" textAnchor="middle">
        PowerQuery
      </text>

      {/* flow connectors + IDE→PQ arrowhead */}
      <g stroke="#4f46e5" strokeWidth="2.5" fill="none">
        <line x1="194" y1="222" x2="214" y2="222" />
        <line x1="364" y1="222" x2="436" y2="222" />
        <line x1="586" y1="222" x2="606" y2="222" />
      </g>
      <path d="M436,222 L428,217 L428,227 Z" fill="#4f46e5" />

      {/* dashed annotation connectors */}
      <g stroke="#c9bf9c" strokeWidth="1.2" strokeDasharray="3 3">
        <line x1="119" y1="160" x2="119" y2="196" />
        <line x1="511" y1="160" x2="511" y2="196" />
        <line x1="289" y1="248" x2="289" y2="266" />
        <line x1="681" y1="248" x2="681" y2="266" />
      </g>

      {/* top annotations */}
      <g fill="#6f6a5f" fontSize="10.5" textAnchor="middle">
        <text x="119" y="140">Save SQL files</text>
        <text x="119" y="153">as a local repo</text>
        <text x="511" y="153">No data import</text>
      </g>

      {/* nodes */}
      <g fill="#4f46e5">
        <path d="M44,196 L180,196 L194,222 L180,248 L44,248 L58,222 Z" />
        <path d="M214,196 L350,196 L364,222 L350,248 L214,248 L228,222 Z" />
        <path d="M436,196 L572,196 L586,222 L572,248 L436,248 L450,222 Z" />
        <path d="M606,196 L742,196 L756,222 L742,248 L606,248 L620,222 Z" />
      </g>
      <g fill="#ffffff" fontSize="11" fontWeight="600" textAnchor="middle">
        <text x="119" y="217">Edit SQL code and</text>
        <text x="119" y="231">assign to a variable</text>
        <text x="289" y="217">Update the SQL</text>
        <text x="289" y="231">SOURCE table</text>
        <text x="511" y="217">Base query to fetch</text>
        <text x="511" y="231">the SQL statement</text>
        <text x="681" y="211">Second query runs</text>
        <text x="681" y="224">the SQL to pull</text>
        <text x="681" y="237">data from the DB</text>
      </g>

      {/* bottom annotations */}
      <g fill="#6f6a5f" fontSize="10.5" textAnchor="middle">
        <text x="289" y="282">The SQL SOURCE table is a</text>
        <text x="289" y="295">shared repo others can reuse</text>
        <text x="681" y="282">Reference the SQL from</text>
        <text x="681" y="295">the first query</text>
      </g>
    </svg>
  );
}
