/**
 * Flow diagram for the "one model, two front doors" post. Same conventions as
 * WorkflowDiagram / BiStackDiagram: inline SVG so it inherits Geist and the full
 * article width, theme palette hard-coded — indigo nodes, sand / indigo / orange
 * zone tints, muted-foreground labels — on the cream page background. Two rows:
 * the data on top, the "recipe" (the DAX row) underneath; the semantic model is
 * the widest zone and the only one tinted primary, because it is the subject.
 */
export function TwoFrontDoorsDiagram() {
  return (
    <svg
      viewBox="0 0 800 400"
      role="img"
      aria-label="Three zones, two rows. DWH, Postgres: analytical SQL views on top, and a sql_source table underneath with one row of SQL per report page plus one more row holding a DAX query. Semantic model, Fabric: flat tables with the data on top, and DAX_SOURCE underneath, a one-cell table holding that raw DAX. Two front doors: the Power BI report reads the flat tables; Excel, through Power Query, first reads the DAX from DAX_SOURCE, then runs it against the same model to get the flat view."
      className="border-border my-6 h-auto w-full rounded-lg border"
    >
      <defs>
        <linearGradient id="tfZoneA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6f2e8" />
          <stop offset="1" stopColor="#ede6d4" />
        </linearGradient>
        <linearGradient id="tfZoneB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f0fd" />
          <stop offset="1" stopColor="#e2dffa" />
        </linearGradient>
        <linearGradient id="tfZoneC" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1da" />
          <stop offset="1" stopColor="#ffe2bd" />
        </linearGradient>
      </defs>

      <text x="30" y="48" fontSize="26" fontWeight="700" fill="#1f1b16">
        The data on top, the recipe underneath
      </text>

      {/* zones */}
      <rect x="24" y="76" width="228" height="260" rx="10" fill="url(#tfZoneA)" stroke="#ddd4bb" />
      <rect x="282" y="76" width="236" height="260" rx="10" fill="url(#tfZoneB)" stroke="#d3cff6" />
      <rect x="548" y="76" width="228" height="260" rx="10" fill="url(#tfZoneC)" stroke="#f4cf9c" />

      <g fill="#6f6a5f" fontSize="15" fontWeight="600" textAnchor="middle">
        <text x="138" y="366">DWH — Postgres</text>
        <text x="400" y="366">Semantic model — Fabric</text>
        <text x="662" y="366">Two front doors</text>
      </g>

      {/* row 1: the data */}
      <g stroke="#4f46e5" strokeWidth="2.5" fill="none">
        <line x1="218" y1="135" x2="312" y2="135" />
        <line x1="480" y1="135" x2="574" y2="135" />
      </g>
      <g fill="#4f46e5">
        <path d="M320,135 L312,130 L312,140 Z" />
        <path d="M582,135 L574,130 L574,140 Z" />
      </g>

      {/* row 2: the recipe — Excel reads it, then runs it against the same model */}
      <g stroke="#4f46e5" strokeWidth="2.5" fill="none">
        <line x1="218" y1="239" x2="312" y2="239" />
        <line x1="480" y1="232" x2="574" y2="232" />
        <line x1="582" y1="246" x2="488" y2="246" />
      </g>
      <g fill="#4f46e5">
        <path d="M320,239 L312,234 L312,244 Z" />
        <path d="M582,232 L574,227 L574,237 Z" />
        <path d="M480,246 L488,241 L488,251 Z" />
      </g>
      <g fill="#6f6a5f" fontSize="10" textAnchor="middle">
        <text x="531" y="224">1 · read the DAX</text>
        <text x="531" y="261">2 · run it</text>
      </g>

      {/* nodes */}
      <g fill="#4f46e5">
        <rect x="58" y="110" width="160" height="50" rx="6" />
        <rect x="58" y="214" width="160" height="50" rx="6" />
        <rect x="320" y="110" width="160" height="50" rx="6" />
        <rect x="320" y="214" width="160" height="50" rx="6" />
        <rect x="582" y="110" width="160" height="50" rx="6" />
        <rect x="582" y="214" width="160" height="50" rx="6" />
      </g>
      <g fill="#ffffff" textAnchor="middle">
        <text x="138" y="130" fontSize="13" fontWeight="600">Analytical SQL views</text>
        <text x="138" y="146" fontSize="10.5" opacity="0.9">on top of the DWH</text>
        <text x="138" y="234" fontSize="13" fontWeight="600">sql_source table</text>
        <text x="138" y="250" fontSize="10.5" opacity="0.9">one row per page: SQL</text>

        <text x="400" y="130" fontSize="13" fontWeight="600">Flat tables</text>
        <text x="400" y="146" fontSize="10.5" opacity="0.9">the data</text>
        <text x="400" y="234" fontSize="13" fontWeight="600">DAX_SOURCE</text>
        <text x="400" y="250" fontSize="10.5" opacity="0.9">one cell: raw DAX</text>

        <text x="662" y="130" fontSize="13" fontWeight="600">Power BI report</text>
        <text x="662" y="146" fontSize="10.5" opacity="0.9">the reading room</text>
        <text x="662" y="234" fontSize="13" fontWeight="600">Excel · Power Query</text>
        <text x="662" y="250" fontSize="10.5" opacity="0.9">the workshop</text>
      </g>

      {/* annotations */}
      <g fill="#6f6a5f" fontSize="10.5" textAnchor="middle">
        <text x="138" y="178">computed where the data lives</text>
        <text x="138" y="282">+ one more row: the DAX</text>
        <text x="138" y="296">written in DBeaver, kept in git</text>

        <text x="400" y="178">partitions fetch SQL from sql_source</text>
        <text x="400" y="282">the model carries its own recipe:</text>
        <text x="400" y="296">names · column set · order</text>

        <text x="662" y="178">filters · visuals · drill-through</text>
        <text x="662" y="282">no DAX and no column list</text>
        <text x="662" y="296">in the workbook: a thin client</text>
      </g>
    </svg>
  );
}
