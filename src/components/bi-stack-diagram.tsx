/**
 * Solution diagram for the "any backend → Cube → your front-end" post. Same
 * conventions as WorkflowDiagram: inline SVG so it inherits Geist and the full
 * article width, theme palette hard-coded — indigo nodes, sand / indigo / orange
 * zone tints, muted-foreground labels — on the cream page background. Cube's zone
 * is the widest and the only one tinted primary: it is the subject of the post.
 */
export function BiStackDiagram() {
  return (
    <svg
      viewBox="0 0 800 400"
      role="img"
      aria-label="Solution overview in three zones. Backend: Postgres, or nearly any other database, queried in place through a read-only role. Cube, the semantic layer in the middle: a data model of measures, dimensions and joins kept in git; SQL, REST and GraphQL APIs; caching with pre-aggregations; access control. Front-end, yours: your own app hands the aggregated rows to any chart library — or a Postgres-speaking BI tool connects to the same SQL API."
      className="border-border my-6 h-auto w-full rounded-lg border"
    >
      <defs>
        <linearGradient id="bsZoneA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6f2e8" />
          <stop offset="1" stopColor="#ede6d4" />
        </linearGradient>
        <linearGradient id="bsZoneB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f0fd" />
          <stop offset="1" stopColor="#e2dffa" />
        </linearGradient>
        <linearGradient id="bsZoneC" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1da" />
          <stop offset="1" stopColor="#ffe2bd" />
        </linearGradient>
      </defs>

      <text x="30" y="48" fontSize="26" fontWeight="700" fill="#1f1b16">
        The whole picture
      </text>

      {/* zones */}
      <rect x="24" y="76" width="208" height="260" rx="10" fill="url(#bsZoneA)" stroke="#ddd4bb" />
      <rect x="262" y="76" width="276" height="260" rx="10" fill="url(#bsZoneB)" stroke="#d3cff6" />
      <rect x="568" y="76" width="208" height="260" rx="10" fill="url(#bsZoneC)" stroke="#f4cf9c" />

      <g fill="#6f6a5f" fontSize="15" fontWeight="600" textAnchor="middle">
        <text x="128" y="366">Backend — nearly any</text>
        <text x="400" y="366">Cube — the semantic layer</text>
        <text x="672" y="366">Front-end — yours</text>
      </g>

      {/* flow between zones */}
      <g stroke="#4f46e5" strokeWidth="2.5" fill="none">
        <line x1="232" y1="200" x2="254" y2="200" />
        <line x1="538" y1="200" x2="560" y2="200" />
        <line x1="672" y1="176" x2="672" y2="200" />
      </g>
      <g fill="#4f46e5">
        <path d="M262,200 L254,195 L254,205 Z" />
        <path d="M568,200 L560,195 L560,205 Z" />
        <path d="M672,208 L667,200 L677,200 Z" />
      </g>
      <g fill="#6f6a5f" fontSize="10" textAnchor="middle">
        <text x="247" y="190">SQL</text>
        <text x="553" y="190">JSON</text>
      </g>

      {/* backend: one database, drawn as a cylinder */}
      <text x="128" y="108" fontSize="10.5" fill="#6f6a5f" textAnchor="middle">
        Where the data already lives
      </text>
      <rect x="82" y="146" width="92" height="64" fill="#4f46e5" />
      <ellipse cx="128" cy="210" rx="46" ry="12" fill="#4f46e5" />
      <ellipse cx="128" cy="146" rx="46" ry="12" fill="#7c76ee" />
      <text x="128" y="188" fontSize="14" fontWeight="600" fill="#ffffff" textAnchor="middle">
        Postgres
      </text>
      <g fill="#6f6a5f" fontSize="10.5" textAnchor="middle">
        <text x="128" y="250">…or MySQL, BigQuery, Snowflake,</text>
        <text x="128" y="264">ClickHouse, DuckDB — ~30 sources.</text>
        <text x="128" y="284">Queried in place, read-only role.</text>
      </g>

      {/* cube: four capabilities */}
      <g fill="#4f46e5">
        <rect x="284" y="96" width="232" height="44" rx="6" />
        <rect x="284" y="150" width="232" height="44" rx="6" />
        <rect x="284" y="204" width="232" height="44" rx="6" />
        <rect x="284" y="258" width="232" height="44" rx="6" />
      </g>
      <g fill="#ffffff" textAnchor="middle">
        <text x="400" y="114" fontSize="13" fontWeight="600">Data model</text>
        <text x="400" y="129" fontSize="10.5" opacity="0.9">measures · dimensions · joins — YAML, in git</text>
        <text x="400" y="168" fontSize="13" fontWeight="600">APIs</text>
        <text x="400" y="183" fontSize="10.5" opacity="0.9">SQL (Postgres wire or HTTP) · REST · GraphQL</text>
        <text x="400" y="222" fontSize="13" fontWeight="600">Cache &amp; pre-aggregations</text>
        <text x="400" y="237" fontSize="10.5" opacity="0.9">the same question, answered once</text>
        <text x="400" y="276" fontSize="13" fontWeight="600">Access control</text>
        <text x="400" y="291" fontSize="10.5" opacity="0.9">JWT · row-level · multi-tenant</text>
      </g>
      <text x="400" y="322" fontSize="10.5" fill="#6f6a5f" textAnchor="middle">
        One definition of “revenue” — every consumer agrees.
      </text>

      {/* front-end: your app, any chart library */}
      <text x="672" y="108" fontSize="10.5" fill="#6f6a5f" textAnchor="middle">
        Your design, your UX, your stack
      </text>
      <g fill="#4f46e5">
        <rect x="592" y="126" width="160" height="50" rx="6" />
        <rect x="592" y="208" width="160" height="50" rx="6" />
      </g>
      <g fill="#ffffff" textAnchor="middle">
        <text x="672" y="146" fontSize="13" fontWeight="600">Your app</text>
        <text x="672" y="162" fontSize="10.5" opacity="0.9">Next.js, Vue, plain HTML…</text>
        <text x="672" y="228" fontSize="13" fontWeight="600">Any chart library</text>
        <text x="672" y="244" fontSize="10.5" opacity="0.9">Chart.js · ECharts · D3 · Recharts</text>
      </g>
      <g fill="#6f6a5f" fontSize="10.5" textAnchor="middle">
        <text x="672" y="286">…or a Postgres-speaking BI tool</text>
        <text x="672" y="300">on the very same SQL API.</text>
      </g>
    </svg>
  );
}
