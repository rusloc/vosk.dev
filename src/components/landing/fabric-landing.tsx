import Link from "next/link";
import type { CSSProperties } from "react";
import { ga } from "@/lib/analytics";
import { siteConfig } from "@/lib/site";
import { LandingDock } from "./landing-dock";
import s from "./fabric-landing.module.css";

/**
 * Ad landing page #1, Microsoft Fabric engineering and architecture (owner's design, 11-20:
 * `.log/report/engineer-landing/`). Four full-screen sections that snap on desktop; every hover effect also runs on
 * keyboard focus, and the page reads complete with JS off (only the dock's highlight needs it) and with reduced motion.
 *
 * Left out of the design until the owner supplies them: the "Clients" strip (five LOGO placeholders, top right since
 * the 11-20 update).
 */

const SLUG = "lp-fabric";
const cta = ga("cta_click", SLUG, "landing_contact");

const ENGINEER = [
  [
    "Fabric lakehouse & warehouse builds",
    "Raw data lands in OneLake, gets cleaned in the lakehouse and modelled in the warehouse. One place for every number.",
  ],
  [
    "ETL / ELT pipelines",
    "Pipelines that pull from your sources on a schedule and keep the data fresh, with data quality monitoring on top.",
  ],
  [
    "dbt models & tests",
    "Transformations as versioned SQL, with tests on every model. Changes are reviewed in Git before they reach a report.",
  ],
  [
    "Semantic models & DAX",
    "A star schema and measures defined once, so every report agrees on what revenue means.",
  ],
  [
    "Refresh automation & scheduling",
    "Refreshes run on a schedule and in the right order, so the morning dashboard is already up to date.",
  ],
] as const;

const ARCHITECT = [
  [
    "Warehouse & architecture design",
    "The blueprint before the build: layers, naming and what goes where. It is cheaper to change on paper.",
  ],
  [
    "Semantic layers design",
    "One agreed set of KPI and metric definitions that Power BI, and anything else, reads from.",
  ],
  [
    "Row-level security & access",
    "Who sees which rows, decided on purpose. Roles, workspaces and access mapped out before anyone asks.",
  ],
  [
    "Audits & code reviews",
    "An expert review of your existing stack or code: what is slow, what is fragile and what to fix first.",
  ],
  [
    "Documentation & handover",
    "Everything written down, so your team can run the platform without me.",
  ],
] as const;

// Gantt rows: label, bar start and width (% of the track).
const MILESTONES = [
  ["01 Call", 6, 8],
  ["02 Project specs", 14, 18],
  ["03 Solution Prototype", 32, 20],
  ["04 Review", 52, 14],
  ["05 Implementation", 66, 34],
] as const;

// The project tiers, priced as on /services (`en.services`, project tiers).
const TIERS = [
  [
    "Short",
    "The one build you keep putting off, shipped properly, end to end.",
    "$2k–5k",
    s.s1,
  ],
  [
    "Mid",
    "A clean data model and the set of reports your team will actually open every morning.",
    "$5k–12k",
    s.s2,
  ],
  [
    "Long",
    "From raw source data to a reporting platform that grows with you. A big build with clear milestones and no surprises.",
    "$10k–25k",
    s.s3,
  ],
] as const;

const LAYERS = [
  ["Sources", s.z0],
  ["Lakehouse", s.z1],
  ["Warehouse", s.z2],
  ["Semantic model", s.z3],
  ["Power BI", s.z4],
] as const;

const SECTIONS = [
  ["p1", "Platform"],
  ["p2", "Roles"],
  ["p3", "Milestones"],
  ["p4", "Contact"],
] as const;

function Arrow() {
  return (
    <svg
      className={s.fxArrow}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * The pill "Message" button with its two pulsing rings, and "See all services & pricing" beside it (owner, 11-22: the
 * link moved here, "FREE initial call" went to the note on the right). `dark` = the ink version for orange backgrounds.
 */
function MessageButton({
  dark,
  inBlock,
}: {
  dark?: boolean;
  inBlock?: boolean;
}) {
  return (
    <div className={`${s.cta} ${inBlock ? s.in : ""}`}>
      <span className={`${s.fxw} ${dark ? s.ink : ""}`}>
        <span className={s.fxRing} aria-hidden="true" />
        <span className={`${s.fxRing} ${s.r2}`} aria-hidden="true" />
        <Link
          href="/contact"
          className={`${s.fx} ${dark ? s.fxDark : s.fxOrange}`}
          {...cta}
        >
          <span className={s.fxFace}>
            Message
            <span className={s.fxChip} aria-hidden="true">
              <Arrow />
            </span>
          </span>
        </Link>
      </span>
      <ServicesLink ink={dark} />
    </div>
  );
}

/** "FREE initial call", the note at the bottom right of a section. */
function Free({ ink }: { ink?: boolean }) {
  return (
    <span className={`${s.free} ${ink ? s.freeInk : ""}`}>
      <strong>FREE</strong> initial call
    </span>
  );
}

/** "See all services & pricing", beside each Message button. */
function ServicesLink({ ink }: { ink?: boolean }) {
  return (
    <Link href="/services" className={`${s.noteLink} ${ink ? s.inkLink : ""}`}>
      See all services &amp; pricing
    </Link>
  );
}

function Plus() {
  return (
    <svg
      className={s.plus}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** One line of a role list; its card opens on hover, tap (focus) and keyboard focus. */
function RoleLine({
  id,
  n,
  title,
  text,
  hat,
  side,
}: {
  id: string;
  n: number;
  title: string;
  text: string;
  hat: string;
  side: "left" | "right";
}) {
  const num = String(n).padStart(2, "0");
  return (
    <li className={`${s.bl} ${side === "left" ? s.blInk : s.blPaper}`}>
      <button type="button" aria-describedby={id} className={s.blBtn}>
        <span className={s.blNum}>{num}</span>
        <span className={s.blGrow}>
          <span className={s.blt}>{title}</span>
        </span>
        <Plus />
      </button>
      <div
        className={`${s.pop} ${side === "left" ? s.popLeft : s.popRight}`}
        id={id}
        role="tooltip"
      >
        <div className={s.popHead}>
          <span>
            {hat} |{num}
          </span>
          <span className={s.eq} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className={s.popBody}>
          <p>{text}</p>
          <span className={s.popbar} aria-hidden="true" />
        </div>
        <span className={s.popTip} aria-hidden="true" />
      </div>
    </li>
  );
}

export function FabricLanding() {
  const mono = s.mono;
  return (
    <div className={s.root}>
      <header className={s.header}>
        <nav className={`${s.px} ${s.topbar}`} aria-label="Main">
          <Link href="/" className={s.brand}>
            VOSK
          </Link>
        </nav>
        <LandingDock sections={SECTIONS} />
      </header>

      {/* 01 Platform */}
      <section id="p1" className={s.pg}>
        <div aria-hidden="true" className={s.gridBg} />
        <div className={`${s.px} ${s.split}`}>
          <div className={s.heroText}>
            <p className={s.eyebrow}>
              Microsoft Fabric | engineering &amp; architecture
            </p>
            <h1 className={s.h1}>
              <span className={s.block}>Microsoft </span>
              <span className={s.block}>Fabric with </span>
              <span className={s.hl}>
                <span aria-hidden="true" className={`${s.bar} ${s.hlBar}`} />
                no surprises.
              </span>
            </h1>
            <p className={s.lede}>
              Data accumulation from databases, CRMs, ERPs, APIs; complex
              ETL/ELT solutions, pipelines &amp; semantic layers; Warehouse,
              Lakehouse, Semantic model management &amp; tuning.
            </p>
            <p className={s.punch}>
              Your data: from absolute raw &gt; to perfect{" "}
              <span className={s.accent}>gold</span>.
            </p>
          </div>

          <div className={s.stage}>
            <div
              role="img"
              aria-label="The platform as five stacked layers, bottom to top: sources, lakehouse, warehouse, semantic model, Power BI"
              className={s.isoPos}
            >
              <div className={s.iso}>
                {LAYERS.map(([name, z]) => (
                  <div key={name} className={`${s.ply} ${z}`}>
                    {name}
                  </div>
                ))}
              </div>
            </div>
            <a
              className={s.seal}
              href={siteConfig.dp600Url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Microsoft Certified Fabric Analytics Engineer Associate, DP-600: see the certificate"
            >
              <svg
                className={`${s.spin} ${s.sealRing}`}
                aria-hidden="true"
                viewBox="0 0 200 200"
              >
                <defs>
                  <path
                    id="sealpath"
                    d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1 -156 0"
                  />
                </defs>
                <text fontSize="15" className={s.sealText}>
                  <textPath href="#sealpath" textLength="484">
                    MICROSOFT CERTIFIED | FABRIC ANALYTICS ENGINEER |{" "}
                  </textPath>
                </text>
              </svg>
              <span className={s.sealMark}>DP-600</span>
            </a>
          </div>
        </div>
        <p className={s.note}>
          <Free />
        </p>
        <MessageButton />
      </section>

      {/* 02 Roles */}
      <section id="p2" className={`${s.pg} ${s.col}`}>
        <div className={`${s.px} ${s.secHead}`}>
          <div>
            <p className={s.eyebrow}>Two hats, one person</p>
            <h2 className={s.h2}>
              Hire the builder, the reviewer, <em className={s.em}>or both.</em>
            </h2>
          </div>
          <p className={s.hint}>Hover or tap a line to open it</p>
        </div>

        <div className={s.hats}>
          <div className={s.lbk}>
            <span className={s.seam} aria-hidden="true" />
            <p className={s.hatNo}>HAT 01</p>
            <h3 className={s.xl}>Engineer</h3>
            <p className={s.hatLine}>I build it.</p>
            <ul className={s.lines}>
              {ENGINEER.map(([title, text], i) => (
                <RoleLine
                  key={title}
                  id={`pe${i + 1}`}
                  n={i + 1}
                  title={title}
                  text={text}
                  hat="ENGINEER"
                  side="left"
                />
              ))}
            </ul>
            <MessageButton dark inBlock />
          </div>

          <div className={s.rbk}>
            <p className={`${s.hatNo} ${s.muted}`}>HAT 02</p>
            <h3 className={`${s.xl} ${s.outline}`}>Architect</h3>
            <p className={s.hatLine}>I design it, or review yours.</p>
            <ul className={s.lines}>
              {ARCHITECT.map(([title, text], i) => (
                <RoleLine
                  key={title}
                  id={`pa${i + 1}`}
                  n={i + 1}
                  title={title}
                  text={text}
                  hat="ARCHITECT"
                  side="right"
                />
              ))}
            </ul>
            <p className={`${s.note} ${s.in}`}>
              <Free ink />
            </p>
          </div>
        </div>
      </section>

      {/* 03 Milestones */}
      <section id="p3" className={`${s.pg} ${s.ms}`}>
        <div className={`${s.px} ${s.msBody}`}>
          <div className={s.secHeadRow}>
            <div>
              <p className={s.eyebrow}>Fixed-scope projects</p>
              <h2 className={s.h2}>
                Clear milestones. <em className={s.em}>Clear pricing.</em>
              </h2>
            </div>
            <p className={s.hint}>Hover a project to plot its milestones</p>
          </div>

          <div
            className={s.gantt}
            role="img"
            aria-label="Project milestones in order: call, project specs, solution prototype, review, implementation"
          >
            <span />
            <div className={s.ruler}>
              <div className={s.rulerTicks} />
              <span className={`${s.tk} ${s.tk1}`} style={{ left: "52%" }} />
              <span className={s.mkPos} style={{ left: "52%" }}>
                <span className={`${s.mk} ${s.m1}`}>SHORT</span>
              </span>
              <span className={`${s.tk} ${s.tk2}`} style={{ left: "76%" }} />
              <span className={s.mkPos} style={{ left: "76%" }}>
                <span className={`${s.mk} ${s.m2}`}>MID</span>
              </span>
              <span className={`${s.tk} ${s.tk3}`} style={{ right: 0 }} />
              <span className={s.mkEnd}>
                <span className={`${s.mk} ${s.m3}`}>LONG</span>
              </span>
            </div>
            {MILESTONES.map(([label, left, width], i) => {
              const d = { "--d": `${i * 0.09}s` } as CSSProperties;
              return [
                <span key={`${label}-l`} className={s.gl} style={d}>
                  <span className={s.gn}>{label}</span>
                </span>,
                <div key={`${label}-r`} className={s.gr} style={d}>
                  <div className={s.gt}>
                    <span
                      className={s.gc}
                      style={{ width: `calc(var(--lw) + ${left}%)` }}
                    />
                    <span
                      className={s.gb}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <span className={s.gf} />
                    </span>
                    {i === MILESTONES.length - 1 && <span className={s.gd} />}
                  </div>
                </div>,
              ];
            })}
          </div>

          <div className={s.cards}>
            {TIERS.map(([name, text, price, cls], i) => (
              <article key={name} className={`${s.stair} ${cls}`} tabIndex={0}>
                <div className={s.tierHead}>
                  <span
                    aria-hidden="true"
                    className={`${s.bar} ${s.tierBar}`}
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                  <h3 className={s.tierName}>{name}</h3>
                </div>
                <p className={s.tierText}>{text}</p>
                <p className={s.tierPrice}>
                  <span className={s.price}>{price}</span>
                  <span className={`${mono} ${s.per}`}>per project</span>
                </p>
              </article>
            ))}
          </div>
        </div>
        <p className={s.note}>
          <Free />
        </p>
        <MessageButton />
      </section>

      {/* 04 Contact */}
      <section id="p4" className={`${s.pg} ${s.last}`}>
        <div aria-hidden="true" className={s.gridBgInk} />
        <div className={`${s.px} ${s.pvc}`}>
          <h2 className={s.ctaTitle}>
            Hand over the <em className={s.emInk}>whole stack.</em>
          </h2>
          <p className={s.closer}>
            Super fast shipping, high quality solutions at fair prices: you
            state the task, I deliver.
          </p>
        </div>
        {/* Privacy stays beside the note (ads policy). */}
        <p className={`${s.note} ${s.split2}`}>
          <Free ink />
          <span aria-hidden="true">|</span>
          <Link href="/privacy" className={`${s.noteLink} ${s.inkLink}`}>
            Privacy
          </Link>
        </p>
        <MessageButton dark />
      </section>
    </div>
  );
}
