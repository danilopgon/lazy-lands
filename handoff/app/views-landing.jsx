// Lazy Lands — Landing (Print Chronicle, punchy). Reconciles the Woodcut structure:
// bold hero + relationship graph collage, marquee, pillars grid, briefing mock,
// inverted how-it-works, philosophy quote, big CTA. English copy, real campaign data.
const { useState: useLand } = React;

function Landing() {
  return (
    <div>
      <PublicTop />
      <LandHero />
      <LandMarquee />
      <LandPillars />
      <LandBriefing />
      <LandHowItWorks />
      <LandPhilosophy />
      <LandCTA />
      <LandFooter />
      <style>{`
        @keyframes ll-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (max-width: 920px) {
          .llx-hero-grid { grid-template-columns: 1fr !important; }
          .llx-hero-collage { height: 380px !important; }
          .llx-h1 { font-size: 13vw !important; }
          .llx-pillars { grid-template-columns: 1fr !important; }
          .llx-pillars > div { border-right: none !important; border-bottom: 2px solid var(--border); }
          .llx-pillars > div:last-child { border-bottom: none; }
          .llx-brief-grid { grid-template-columns: 1fr !important; }
          .llx-steps { grid-template-columns: 1fr !important; }
          .llx-specs { grid-template-columns: 1fr 1fr !important; }
          .llx-cta h2 { font-size: 13vw !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Hero ── */
function LandHero() {
  return (
    <section style={{ maxWidth: 1180, margin: "0 auto", padding: "52px 40px 44px" }}>
      <div className="llx-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 48, alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            <span className="ll-pill accent">✦ Open beta</span>
            <span className="ll-pill muted">For DMs who actually run long campaigns</span>
          </div>
          <h1 className="serif llx-h1" style={{ fontSize: 82, lineHeight: 0.94, margin: 0, letterSpacing: "-0.035em", textWrap: "balance", color: "var(--ink)" }}>
            Your campaign,<br />
            <span style={{ fontStyle: "italic", color: "var(--accent)", textDecoration: "underline", textDecorationColor: "var(--ink)", textDecorationThickness: "5px", textUnderlineOffset: "8px", textDecorationSkipInk: "none" }}>without the amnesia</span>.
          </h1>
          <p style={{ fontSize: 18.5, lineHeight: 1.5, color: "var(--ink-2)", maxWidth: 500, marginTop: 26, marginBottom: 32, fontFamily: '"Source Serif 4", serif' }}>
            The companion that remembers every NPC, every faction and every consequence,
            so you prep the next session in minutes, and the world remembers what your players did.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button className="ll-btn accent" style={{ fontSize: 14.5, padding: "11px 22px" }} onClick={() => go("/register")}>Start your chronicle →</button>
            <button className="ll-btn" style={{ fontSize: 14.5, padding: "11px 22px" }} onClick={() => go("/campaigns/phandalin")}>✦ See it on a real campaign</button>
          </div>
          <div className="mono" style={{ display: "flex", gap: 22, marginTop: 30, fontSize: 11, letterSpacing: "0.04em", color: "var(--mute)", flexWrap: "wrap" }}>
            <span>✓ No card</span>
            <span>✓ The Scribe never decides canon</span>
            <span>✓ Export anytime</span>
          </div>
        </div>
        <HeroCollage />
      </div>
    </section>
  );
}

function HeroCollage() {
  return (
    <div className="llx-hero-collage" style={{ position: "relative", height: 500 }}>
      <div style={{ position: "absolute", inset: 0, border: "2px solid var(--border)", background: "var(--paper-2)", boxShadow: "8px 8px 0 var(--shadow)", overflow: "hidden" }}>
        <div className="mono" style={{ position: "absolute", top: 10, left: 12, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--mute)", zIndex: 2 }}>The web · Sombras sobre Phandalin</div>
        <NodeGraph />
      </div>

      {/* Briefing card overlay */}
      <div style={{ position: "absolute", right: -22, bottom: -22, width: 286, background: "var(--paper)", border: "2px solid var(--border)", boxShadow: "6px 6px 0 var(--accent)", padding: 16, transform: "rotate(-2deg)" }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 5 }}>Briefing · Session VIII</div>
        <div className="serif" style={{ fontSize: 21, lineHeight: 1.05, marginBottom: 9, fontWeight: 600 }}>The Quiet Ledger</div>
        <div className="mono" style={{ fontSize: 10, color: "var(--mute)", marginBottom: 9 }}>5 NPCs · 4 factions · 1 grudge resurfacing</div>
        <div style={{ height: 2, background: "var(--ink)", marginBottom: 9 }}></div>
        <div style={{ fontSize: 12.5, lineHeight: 1.4, fontFamily: '"Source Serif 4", serif' }}>
          Halia calls in the party. She knows they started the warehouse fire.
          <span style={{ background: "var(--accent-wash)", color: "var(--accent-deep)", padding: "1px 4px", marginLeft: 3, fontWeight: 600 }}>memory in play</span>
        </div>
      </div>

      {/* Sticky note */}
      <div style={{ position: "absolute", left: -16, top: 16, width: 162, background: "var(--accent)", border: "2px solid var(--border)", boxShadow: "3px 3px 0 var(--shadow)", padding: 12, transform: "rotate(-4deg)", color: "#FBF4EC" }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5, opacity: 0.85 }}>Don't forget</div>
        <div style={{ fontSize: 12.5, fontFamily: '"Source Serif 4", serif', lineHeight: 1.3 }}>
          Halia favors two of them, and distrusts the other two.
        </div>
      </div>
    </div>
  );
}

function NodeGraph() {
  const nodes = [
    { id: "party", x: 50, y: 50, r: 13, label: "Party", kind: "party" },
    { id: "halia", x: 24, y: 28, r: 10, label: "Halia" },
    { id: "ander", x: 76, y: 26, r: 9, label: "Ander" },
    { id: "robert", x: 80, y: 70, r: 9, label: "Herman", enemy: true },
    { id: "fib", x: 18, y: 72, r: 8, label: "Fibble" },
    { id: "cryovain", x: 50, y: 84, r: 11, label: "Cryovain", enemy: true },
    { id: "blackbear", x: 90, y: 48, r: 6, label: "B.Bear", faction: true },
    { id: "zhent", x: 10, y: 50, r: 6, label: "Zhent", faction: true },
  ];
  const edges = [
    ["party", "halia", "tense"], ["party", "ander", "ally"], ["party", "robert", "enemy"],
    ["party", "fib", "ally"], ["party", "cryovain", "enemy"], ["halia", "zhent", "member"],
    ["robert", "blackbear", "member"], ["ander", "blackbear", "tense"], ["cryovain", "robert", "lost"],
  ];
  const n = (id) => nodes.find((x) => x.id === id);
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <pattern id="llgrid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(26,28,25,0.07)" strokeWidth="0.15" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#llgrid)" />
      {edges.map(([a, b, kind], i) => {
        const A = n(a), B = n(b);
        const color = kind === "enemy" ? "var(--accent)" : kind === "tense" ? "var(--warn)" : kind === "lost" ? "var(--mute)" : "var(--ink)";
        const dash = kind === "lost" ? "1.2 1" : kind === "tense" ? "0.7 0.7" : "none";
        return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={color} strokeWidth="0.5" strokeDasharray={dash} />;
      })}
      {nodes.map((node) => {
        const fill = node.kind === "party" ? "var(--accent)" : node.enemy ? "var(--danger)" : node.faction ? "var(--ink)" : "var(--paper)";
        const tc = node.kind === "party" || node.enemy || node.faction ? "var(--paper)" : "var(--ink)";
        return (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r={node.r / 2 + 1.5} fill="var(--ink)" opacity="0.1" />
            <circle cx={node.x} cy={node.y} r={node.r / 2} fill={fill} stroke="var(--ink)" strokeWidth="0.5" />
            <text x={node.x} y={node.y + 0.7} textAnchor="middle" fontSize={node.r > 10 ? 2.1 : 1.7} fontWeight="700" fontFamily='"Instrument Sans", sans-serif' fill={tc}>{node.label}</text>
          </g>
        );
      })}
      <g fontFamily='"JetBrains Mono", monospace' fontSize="1.6" fill="var(--ink-2)">
        <text x="30" y="22">favor split</text>
        <text x="64" y="20">owes a favor</text>
        <text x="28" y="92">circling closer</text>
      </g>
    </svg>
  );
}

/* ── Marquee ── */
function LandMarquee() {
  const items = ["Persistent campaign memory", "NPCs · Factions · Open arcs", "Session briefings with full context", "The Scribe proposes, you decide", "Export to PDF", "No lock-in"];
  return (
    <div style={{ borderTop: "2px solid var(--border)", borderBottom: "2px solid var(--border)", background: "var(--ink)", color: "var(--bg)", overflow: "hidden", padding: "13px 0" }}>
      <div style={{ display: "flex", gap: 36, whiteSpace: "nowrap", animation: "ll-marquee 38s linear infinite", fontFamily: '"Source Serif 4", serif', fontSize: 26, willChange: "transform" }}>
        {[...items, ...items].map((t, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 36 }}>
            {t}<span style={{ color: "var(--accent)" }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Pillars ── */
function LandPillars() {
  const pillars = [
    { glyph: "◆", eyebrow: "01 · Remember", title: "Campaign memory", body: "Track NPCs, factions and events across sessions. Nothing leaks out between session 3 and session 17.", bullets: ["NPC entries with status & motivation", "Faction posture, session over session", "A timeline of consequences"] },
    { glyph: "✒", eyebrow: "02 · Prepare", title: "Session briefings", body: "A contextual draft before every session: synopsis, relevant NPCs, faction reactions and narrative hooks.", bullets: ["An editable draft, never the final word", "Built only from memories you accepted", "Export to PDF, private notes excluded"] },
    { glyph: "↝", eyebrow: "03 · Continuity", title: "Nothing slips", body: "Dormant arcs resurface before your players forget them. The world reacts to what they actually did.", bullets: ["Arcs that need attention, flagged", "Faction reactions carried forward", "Accepted memories feed every draft"] },
  ];
  return (
    <section id="product" style={{ maxWidth: 1180, margin: "0 auto", padding: "92px 40px 40px" }}>
      <div style={{ maxWidth: 720, marginBottom: 48 }}>
        <div className="ll-kicker" style={{ marginBottom: 14 }}>/ what it does</div>
        <h2 className="serif" style={{ fontSize: 52, margin: 0, lineHeight: 1.0, letterSpacing: "-0.025em", color: "var(--ink)" }}>
          Not a one-shot generator.<br /><em style={{ color: "var(--mute)" }}>It's memory.</em>
        </h2>
      </div>
      <div className="llx-pillars" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", border: "2px solid var(--border)", background: "var(--border)", boxShadow: "8px 8px 0 var(--shadow)" }}>
        {pillars.map((p, i) => (
          <div key={i} style={{ background: i === 1 ? "var(--accent-wash)" : "var(--paper)", padding: "34px 28px", borderRight: i < 2 ? "2px solid var(--border)" : "none" }}>
            <div style={{ width: 50, height: 50, border: "2px solid var(--border)", background: "var(--paper)", display: "grid", placeItems: "center", marginBottom: 20, fontSize: 22, color: "var(--accent)", boxShadow: "3px 3px 0 var(--shadow)" }}>{p.glyph}</div>
            <div className="ll-kicker" style={{ marginBottom: 9 }}>{p.eyebrow}</div>
            <h3 className="serif" style={{ fontSize: 27, margin: "0 0 12px", lineHeight: 1.0, letterSpacing: "-0.01em" }}>{p.title}</h3>
            <p style={{ fontSize: 14.5, color: "var(--ink-2)", marginBottom: 18, lineHeight: 1.5 }}>{p.body}</p>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {p.bullets.map((b, j) => (
                <li key={j} className="mono" style={{ display: "flex", gap: 8, fontSize: 11.5, marginBottom: 7, color: "var(--ink-2)", lineHeight: 1.4 }}>
                  <span style={{ color: "var(--accent)" }}>→</span>{b}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Briefing preview ── */
function LandBriefing() {
  return (
    <section style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 40px" }}>
      <div className="llx-brief-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center" }}>
        <div>
          <div className="ll-kicker" style={{ marginBottom: 14 }}>/ the output</div>
          <h2 className="serif" style={{ fontSize: 46, margin: 0, lineHeight: 1.02, letterSpacing: "-0.022em", color: "var(--ink)" }}>
            A briefing that reads like your own prep, only faster.
          </h2>
          <p style={{ fontSize: 16.5, marginTop: 22, lineHeight: 1.55, color: "var(--ink-2)", fontFamily: '"Source Serif 4", serif' }}>
            Not a data dump. An ordered draft you can read five minutes before the session. Always a <em>draft</em>: you edit it, you decide what happens.
          </p>
          <div className="llx-specs" style={{ marginTop: 26, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Spec k="3 min" v="average prep time" />
            <Spec k="7 sessions" v="of context, never forgotten" />
            <Spec k="canon" v="decided by you, not the Scribe" />
            <Spec k="editable" v="it's a draft, not truth" />
          </div>
        </div>
        <BriefingMock />
      </div>
    </section>
  );
}

function Spec({ k, v }) {
  return (
    <div style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 14 }}>
      <div className="serif" style={{ fontSize: 23, fontWeight: 600 }}>{k}</div>
      <div className="mono" style={{ fontSize: 10, color: "var(--mute)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 3 }}>{v}</div>
    </div>
  );
}

function BriefingMock() {
  return (
    <div style={{ background: "var(--paper)", border: "2px solid var(--border)", boxShadow: "8px 8px 0 var(--shadow)", padding: 26, transform: "rotate(1deg)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div>
          <div className="ll-kicker">Briefing · Session VIII</div>
          <h3 className="serif" style={{ fontSize: 30, margin: "5px 0 0", lineHeight: 1.0, fontWeight: 600 }}>The Quiet Ledger</h3>
        </div>
        <span className="ll-pill muted">draft</span>
      </div>
      <div style={{ height: 2, background: "var(--ink)" }}></div>
      <div style={{ marginTop: 14 }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 6 }}>01 / Synopsis</div>
        <p style={{ fontSize: 13.5, margin: 0, lineHeight: 1.5, fontFamily: '"Source Serif 4", serif' }}>
          Halia Thornton calls the party to the Miner's Exchange. She knows they started the <u>warehouse fire</u>, and offers silence in exchange for one quiet job.
        </p>
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 8 }}>02 / Key NPCs</div>
        <NpcRow name="Halia Thornton" role="Guildmaster · Zhentarim hand" />
        <NpcRow name="Ander Margaster" role="Wary ally · owes a favor" />
        <NpcRow name="Robert Herman" role="Patience finally ending" accent />
      </div>
      <div style={{ marginTop: 16, padding: 12, background: "var(--accent-wash)", border: "2px solid var(--accent)" }}>
        <div className="mono" style={{ fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-deep)", marginBottom: 4, display: "flex", gap: 6, alignItems: "center" }}>✦ Memory in play</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.4, fontFamily: '"Source Serif 4", serif' }}>
          You accepted in Session VII: <em>"Two party members earned Halia's favor; two damaged it."</em> The Scribe built her offer around it.
        </div>
      </div>
    </div>
  );
}

function NpcRow({ name, role, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px dashed var(--dotted)" }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{name}</div>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--mute)" }}>{role}</div>
      </div>
      <span className={"ll-pill " + (accent ? "accent" : "muted")}>{accent ? "active" : "in play"}</span>
    </div>
  );
}

/* ── How it works (inverted ink) ── */
function LandHowItWorks() {
  const steps = [
    { n: "01", title: "Create your campaign", body: "Name it, pick a system, paste the premise. The Scribe drafts your NPCs, factions and arcs for you to review, every one, before it's canon.", glyph: "◆" },
    { n: "02", title: "Log each session", body: "After the table clears, write what happened. The Scribe proposes the memories worth keeping. You accept, edit or dismiss.", glyph: "✒" },
    { n: "03", title: "Prepare the next", body: "Hit Prepare. Get a briefing built on everything you accepted. Edit it. Print it. Run it.", glyph: "↝" },
  ];
  return (
    <section id="how" style={{ background: "var(--ink)", color: "var(--bg)", padding: "88px 0", borderTop: "2px solid var(--border)", borderBottom: "2px solid var(--border)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 40px" }}>
        <div className="ll-kicker" style={{ color: "var(--accent)", marginBottom: 14 }}>/ how it works</div>
        <h2 className="serif" style={{ fontSize: 60, margin: 0, lineHeight: 0.95, letterSpacing: "-0.025em", color: "var(--bg)" }}>Three steps. Not one more.</h2>
        <div className="llx-steps" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, marginTop: 56 }}>
          {steps.map((s, i) => (
            <div key={i}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 }}>
                <div className="serif" style={{ fontSize: 84, lineHeight: 1, color: "var(--accent)", letterSpacing: "-0.04em" }}>{s.n}</div>
                <div style={{ flex: 1, height: 2, background: "var(--bg)", opacity: 0.35 }}></div>
                <span style={{ fontSize: 24 }}>{s.glyph}</span>
              </div>
              <h3 className="serif" style={{ fontSize: 28, margin: "0 0 10px", color: "var(--bg)", lineHeight: 1.0 }}>{s.title}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.5, color: "rgba(236,228,211,0.72)", margin: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Philosophy quote band ── */
function LandPhilosophy() {
  return (
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 40px 60px" }}>
      <div className="serif" style={{ fontSize: 38, lineHeight: 1.2, letterSpacing: "-0.012em", color: "var(--ink)", textWrap: "balance" }}>
        <span style={{ color: "var(--accent)" }}>“</span>The Scribe is a draft, never the author. Nothing reaches your table until you've made it canon.<span style={{ color: "var(--accent)" }}>”</span>
      </div>
      <div className="mono" style={{ marginTop: 18, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-deep)" }}>The whole philosophy, in one line</div>
    </section>
  );
}

/* ── Final CTA ── */
function LandCTA() {
  return (
    <section id="pricing" style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 40px 92px" }}>
      <div className="llx-cta" style={{ border: "2px solid var(--border)", background: "var(--accent)", color: "#FBF4EC", padding: "60px 48px", boxShadow: "10px 10px 0 var(--shadow)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -40, right: -40, opacity: 0.14 }}>
          <svg width="300" height="300" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#FBF4EC" strokeWidth="1" />
            <circle cx="50" cy="50" r="28" fill="none" stroke="#FBF4EC" strokeWidth="1" />
            <circle cx="50" cy="50" r="16" fill="none" stroke="#FBF4EC" strokeWidth="1" />
            <path d="M50 6 L50 94 M6 50 L94 50 M20 20 L80 80 M20 80 L80 20" stroke="#FBF4EC" strokeWidth="0.5" />
          </svg>
        </div>
        <div style={{ position: "relative" }}>
          <div className="ll-kicker" style={{ color: "#FBF4EC", marginBottom: 12 }}>/ start now</div>
          <h2 className="serif" style={{ fontSize: 72, margin: 0, lineHeight: 0.95, letterSpacing: "-0.03em", maxWidth: 820 }}>Start your first chronicle.</h2>
          <p style={{ fontSize: 18, marginTop: 18, maxWidth: 600, lineHeight: 1.5, fontFamily: '"Source Serif 4", serif' }}>
            Free while in early access. Bring one campaign or five. No card, no session limit, no excuses.
          </p>
          <div style={{ marginTop: 30, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button className="ll-btn" style={{ background: "var(--ink)", color: "#FBF4EC", borderColor: "var(--ink)", fontSize: 14.5, padding: "11px 22px", boxShadow: "4px 4px 0 rgba(0,0,0,0.3)" }} onClick={() => go("/register")}>Create account →</button>
            <button className="ll-btn" style={{ background: "var(--paper)", color: "var(--ink)", fontSize: 14.5, padding: "11px 22px", boxShadow: "4px 4px 0 rgba(0,0,0,0.3)" }} onClick={() => go("/campaigns/phandalin")}>Tour a demo campaign</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function LandFooter() {
  return (
    <footer style={{ borderTop: "2px solid var(--border)", padding: "30px 40px", background: "var(--paper-2)" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <span className="ll-wordmark" style={{ fontSize: 18 }}>Lazy <span>Lands</span></span>
          <span className="mono" style={{ fontSize: 10.5, color: "var(--mute)" }}>© 2026 · made by a DM tired of forgetting</span>
        </div>
        <div className="mono" style={{ display: "flex", gap: 18, fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-2)" }}>
          <a href="#product" style={{ textDecoration: "none" }}>Product</a>
          <a href="#how" style={{ textDecoration: "none" }}>How it works</a>
          <a href="#pricing" style={{ textDecoration: "none" }}>Pricing</a>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Landing });
