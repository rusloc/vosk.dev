/**
 * Diagram for the "give the agent eyes" post. Same conventions as
 * TwoFrontDoorsDiagram: inline SVG at full article width, theme palette
 * hard-coded — indigo nodes, sand / indigo / orange zone tints, muted-foreground
 * labels. Two rows out of one agent: the standard toolbelt (hands on the model)
 * on top, the read-only personal MCP (eyes on the database) underneath.
 */
export function AgentEyesDiagram() {
  return (
    <svg
      viewBox="0 0 800 400"
      role="img"
      aria-label="One agent, two rows of tools. Top row: the standard toolbelt — the Power BI modeling MCP and the report and Fabric CLIs — works on the semantic model, the reports and the workspaces. Bottom row: sqldev-mcp, six read-only tools, reads the PostgreSQL behind the model: catalog, statistics and plans. Every call is a read-only transaction with local timeouts that ends in a rollback, and the agent gets a digest back, not a dump."
      className="border-border my-6 h-auto w-full rounded-lg border"
    >
      <defs>
        <linearGradient id="aeZoneA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6f2e8" />
          <stop offset="1" stopColor="#ede6d4" />
        </linearGradient>
        <linearGradient id="aeZoneB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f0fd" />
          <stop offset="1" stopColor="#e2dffa" />
        </linearGradient>
        <linearGradient id="aeZoneC" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff1da" />
          <stop offset="1" stopColor="#ffe2bd" />
        </linearGradient>
      </defs>

      <text x="30" y="48" fontSize="26" fontWeight="700" fill="#1f1b16">
        Hands on the model, eyes on the database
      </text>

      {/* zones */}
      <rect
        x="24"
        y="76"
        width="228"
        height="260"
        rx="10"
        fill="url(#aeZoneA)"
        stroke="#ddd4bb"
      />
      <rect
        x="282"
        y="76"
        width="236"
        height="260"
        rx="10"
        fill="url(#aeZoneB)"
        stroke="#d3cff6"
      />
      <rect
        x="548"
        y="76"
        width="228"
        height="260"
        rx="10"
        fill="url(#aeZoneC)"
        stroke="#f4cf9c"
      />

      <g fill="#6f6a5f" fontSize="15" fontWeight="600" textAnchor="middle">
        <text x="138" y="366">
          The agent
        </text>
        <text x="400" y="366">
          Tools
        </text>
        <text x="662" y="366">
          What they reach
        </text>
      </g>

      {/* row 1: hands */}
      <g stroke="#4f46e5" strokeWidth="2.5" fill="none">
        <line x1="218" y1="135" x2="312" y2="135" />
        <line x1="480" y1="135" x2="574" y2="135" />
      </g>
      <g fill="#4f46e5">
        <path d="M320,135 L312,130 L312,140 Z" />
        <path d="M582,135 L574,130 L574,140 Z" />
      </g>

      {/* row 2: eyes — a call goes out, a digest comes back */}
      <g stroke="#4f46e5" strokeWidth="2.5" fill="none">
        <line x1="218" y1="232" x2="312" y2="232" />
        <line x1="320" y1="246" x2="226" y2="246" />
        <line x1="480" y1="239" x2="574" y2="239" />
      </g>
      <g fill="#4f46e5">
        <path d="M320,232 L312,227 L312,237 Z" />
        <path d="M218,246 L226,241 L226,251 Z" />
        <path d="M582,239 L574,234 L574,244 Z" />
      </g>
      <g fill="#6f6a5f" fontSize="10" textAnchor="middle">
        <text x="269" y="224">
          tool call
        </text>
        <text x="269" y="261">
          digest
        </text>
      </g>

      {/* nodes — the agent spans both rows */}
      <g fill="#4f46e5">
        <rect x="58" y="110" width="160" height="154" rx="6" />
        <rect x="320" y="110" width="160" height="50" rx="6" />
        <rect x="320" y="214" width="160" height="50" rx="6" />
        <rect x="582" y="110" width="160" height="50" rx="6" />
        <rect x="582" y="214" width="160" height="50" rx="6" />
      </g>
      <g fill="#ffffff" textAnchor="middle">
        <text x="138" y="182" fontSize="13" fontWeight="600">
          AI agent
        </text>
        <text x="138" y="198" fontSize="10.5" opacity="0.9">
          writes the SQL, reads the plan
        </text>

        <text x="400" y="130" fontSize="13" fontWeight="600">
          Standard toolbelt
        </text>
        <text x="400" y="146" fontSize="10.5" opacity="0.9">
          modeling MCP · CLIs · skills
        </text>
        <text x="400" y="234" fontSize="13" fontWeight="600">
          sqldev-mcp
        </text>
        <text x="400" y="250" fontSize="10.5" opacity="0.9">
          six read-only tools
        </text>

        <text x="662" y="130" fontSize="13" fontWeight="600">
          Power BI · Fabric
        </text>
        <text x="662" y="146" fontSize="10.5" opacity="0.9">
          model · reports · workspaces
        </text>
        <text x="662" y="234" fontSize="13" fontWeight="600">
          PostgreSQL
        </text>
        <text x="662" y="250" fontSize="10.5" opacity="0.9">
          catalog · statistics · plans
        </text>
      </g>

      {/* annotations */}
      <g fill="#6f6a5f" fontSize="10.5" textAnchor="middle">
        <text x="138" y="282">
          never smarter,
        </text>
        <text x="138" y="296">
          just able to see
        </text>

        <text x="400" y="178">
          good hands, blind to the DWH
        </text>
        <text x="400" y="282">
          schema · tables · routines
        </text>
        <text x="400" y="296">
          recorded run times · plans
        </text>
        <text x="400" y="310">
          cached 10 min, digest not dump
        </text>

        <text x="662" y="178">
          what the agent could already touch
        </text>
        <text x="662" y="282">
          begin read only · set local timeouts
        </text>
        <text x="662" y="296">
          the work · rollback
        </text>
      </g>
    </svg>
  );
}
