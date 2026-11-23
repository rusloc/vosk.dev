import Link from "next/link";
import { ga } from "@/lib/analytics";
import { LandingDock } from "./landing-dock";
import s from "./agents-landing.module.css";

/**
 * Ad landing page #2, AI agents, n8n and automation (owner's design, 11-22: `.log/report/n8n-landing/`). Two
 * full-screen sections that snap on desktop: an n8n workflow (email > PDF check > AI parse > sheet row and reply) and
 * the data chat that emails reports. Each "Try live demo" opens the showcase that runs it. The page reads complete with
 * JS off (only the dock's highlight and the header's colour fallback need it) and with reduced motion.
 *
 * Changed from the design: the chat's input box is a link into the live chat demo (a box that takes no input would be
 * a dead end); a Privacy link sits beside the last "FREE initial call" (ads policy, as on /lp/fab).
 */

const SLUG = "lp-ai";
const cta = ga("cta_click", SLUG, "landing_contact");

const SECTIONS = [
  ["p1", "Automate"],
  ["p2", "Ask"],
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

function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Envelope({ strokeWidth }: { strokeWidth: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 96 72"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={strokeWidth === 5 ? s.svgFill : undefined}
    >
      <rect x="3" y="3" width="90" height="66" rx="9" />
      <path d="M6 10l42 32 42-32" />
    </svg>
  );
}

/** The "Message" pill with its two pulsing rings, then "Try live demo". `dark` = the ink version for orange. */
function CtaRow({ dark, demo }: { dark?: boolean; demo: string }) {
  return (
    <div className={s.cta}>
      <span className={`${s.fxw} ${dark ? s.fxwDark : ""}`}>
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
      <Link
        href={`/work/${demo}`}
        className={`${s.textLink} ${dark ? s.ink : s.lite}`}
        {...ga("select_content", demo, "landing_demo")}
      >
        Try live demo
      </Link>
    </div>
  );
}

export function AgentsLanding() {
  return (
    <div className={s.root}>
      <header className={s.header}>
        <nav className={`${s.px} ${s.topbar}`} aria-label="Main">
          <Link href="/" className={`${s.brand} ${s.lite}`}>
            VOSK
          </Link>
        </nav>
        <LandingDock sections={SECTIONS} darkFrom={1} />
      </header>

      {/* 01 Automate */}
      <section id="p1" className={`${s.pg} ${s.p1}`}>
        <div aria-hidden="true" className={s.dots1} />
        <div className={`${s.px} ${s.heroText}`}>
          <p className={s.eyebrow}>AI agents | n8n | automation</p>
          <h1 className={s.h1}>
            <span className={s.block}>Ask your data. </span>
            <span className={s.block}>
              <em className={s.emOrange}>Automate</em> the rest.
            </span>
          </h1>
          <p className={s.lede}>
            n8n flows &amp; self hosted servers you really own, trustable AI
            agents and your daily routines automation
          </p>

          <div className={s.flowScroll}>
            <div
              role="img"
              aria-label="Workflow in four phases: incoming email, check attachment, AI parse, add Google Sheets record and reply"
              className={s.flow}
            >
              <span className={s.line}>
                <span className={s.trav} />
              </span>

              <div className={s.ph}>
                <div className={`${s.tile} ${s.tPaper}`}>
                  <span className={`${s.halo} ${s.h1Halo}`} />
                  <div className={s.env}>
                    <Envelope strokeWidth={5} />
                    <span className={s.bdg}>1</span>
                  </div>
                </div>
                <p className={s.phLabel}>Incoming email</p>
              </div>

              <div className={s.ph}>
                <div className={`${s.tile} ${s.tInk}`}>
                  <span className={`${s.halo} ${s.h2Halo}`} />
                  <div className={s.doc}>
                    <span className={s.pdfTag}>PDF</span>
                    <span className={s.docLine} style={{ width: "74%" }} />
                    <span className={s.docLine} style={{ width: "94%" }} />
                    <span className={s.docLine} style={{ width: "62%" }} />
                    <span className={s.docTotal} />
                    <span className={s.scan} />
                  </div>
                  <span className={`${s.ok} ${s.ok2}`}>
                    <Check />
                  </span>
                </div>
                <p className={s.phLabel}>Check attachment</p>
              </div>

              <div className={s.ph}>
                <div className={`${s.tile} ${s.tOrange}`}>
                  <span className={`${s.halo} ${s.h3Halo}`} />
                  <svg viewBox="0 0 160 160" className={s.antsSvg}>
                    <rect
                      className={s.ants}
                      x="9"
                      y="9"
                      width="142"
                      height="142"
                      rx="13"
                    />
                  </svg>
                  <span className={s.glow} />
                  <div className={s.ai}>
                    <div className={s.aiHead}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 3l1.9 5.6 5.6 1.9-5.6 1.9L12 18l-1.9-5.6-5.6-1.9 5.6-1.9z" />
                      </svg>
                      <span>AI</span>
                    </div>
                    {[86, 58, 72].map((w, i) => (
                      <span key={w} className={s.aiRow}>
                        <span className={s.aiKey} />
                        <span className={s.aiTrack}>
                          <span
                            className={`${s.cell} ${s.ext}`}
                            style={{
                              width: `${w}%`,
                              animationDelay: `${i * 0.2}s`,
                            }}
                          />
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
                <p className={s.phLabel}>AI parse</p>
              </div>

              <div className={`${s.ph} ${s.phWide}`}>
                <div className={s.sheetBox}>
                  <div className={s.sheet}>
                    <span className={`${s.halo} ${s.haloWide} ${s.h4Halo}`} />
                    <div className={`${s.sRow} ${s.sHead}`}>
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className={`${s.sRow} ${s.sNew}`}>
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i}>
                          <span
                            className={`${s.cell} ${s.r4} ${i === 3 ? s.cellOrange : ""}`}
                            style={{ animationDelay: `${i * 0.12}s` }}
                          />
                        </span>
                      ))}
                      <span className={`${s.ok} ${s.ok4}`}>
                        <Check />
                      </span>
                    </div>
                    <div className={s.sRow}>
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
                <p className={s.phLabel}>Add G-sheets record &amp; reply</p>
              </div>
            </div>
          </div>
        </div>
        <p className={s.note}>
          <span className={s.free}>
            <strong>FREE</strong> initial call
          </span>
        </p>
        <CtaRow demo="invoice-pdf-parser" />
      </section>

      {/* 02 Ask */}
      <section id="p2" className={`${s.pg} ${s.p2}`}>
        <div aria-hidden="true" className={s.dots2} />
        <div className={`${s.px} ${s.pvc}`}>
          <div className={s.minw}>
            <p className={s.eyebrow}>AI chat over your data</p>
            <h2 className={s.h2}>
              Skip the dashboard. <em className={s.emIndigo}>Just ask.</em>
            </h2>
            <p className={s.lede2}>
              Chat with your data: trustable AI agent that answers your
              questions and emails presentation ready reports.
            </p>
          </div>

          <div className={s.chatSide}>
            <div className={s.chat}>
              <div className={s.chatBar}>
                <span className={s.live}>Company data chat</span>
                <span>Demo on synthetic data</span>
              </div>
              <div className={s.msgs}>
                <p className={`${s.me} ${s.b1}`}>
                  How did marketing spend do last month?
                </p>
                <div className={`${s.bot} ${s.botChart} ${s.b2}`}>
                  <p>Spend by channel, last month.</p>
                  <div aria-hidden="true" className={s.bars}>
                    {(
                      [
                        ["Search", 88, "#2a0c0f"],
                        ["Social", 58, "#ffa63d"],
                        ["Email", 30, "#4f46e5"],
                      ] as const
                    ).map(([name, w, color]) => (
                      <div key={name} className={s.barRow}>
                        <span className={s.barName}>{name}</span>
                        <span className={s.barTrack}>
                          <span
                            className={s.cbar}
                            style={{ width: `${w}%`, background: color }}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className={`${s.me} ${s.b3}`}>Email me this every Monday.</p>
                <p className={`${s.bot} ${s.b4}`}>
                  Done. An n8n workflow will send it.
                  <span className={s.caret} aria-hidden="true" />
                </p>
              </div>
              <Link
                href="/work/ceo-digest"
                className={s.ask}
                aria-label="Ask your data: try the live data chat"
                {...ga("select_content", "ceo-digest", "landing_chat_box")}
              >
                <span className={s.askField}>Ask your data in plain words</span>
                <span className={s.askSend} aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 19V5M6 11l6-6 6 6" />
                  </svg>
                </span>
              </Link>
            </div>
            <div
              className={s.mail}
              role="img"
              aria-label="New email, plus one message"
            >
              <span className={s.mailr} aria-hidden="true" />
              <Envelope strokeWidth={6} />
              <span className={s.mailb} aria-hidden="true">
                +1
              </span>
            </div>
          </div>
        </div>
        {/* The design ends on "FREE initial call"; Privacy stays beside it (ads policy, as on /lp/fab). */}
        <p className={s.note}>
          <span className={`${s.free} ${s.freeIndigo}`}>
            <strong>FREE</strong> initial call
          </span>
          <span className={s.noteSep} aria-hidden="true">
            |
          </span>
          <Link href="/privacy" className={`${s.textLink} ${s.ink}`}>
            Privacy
          </Link>
        </p>
        <CtaRow dark demo="ceo-digest" />
      </section>
    </div>
  );
}
