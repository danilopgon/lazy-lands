// Lazy Lands — Dashboard, New campaign, AI extraction review
const { useState: useDS } = React;

/* ── Campaign dashboard ── */
function Dashboard() {
  const [query, setQuery] = useDS("");
  const [empty, setEmpty] = useDS(false); // toggle to demo empty state
  const all = window.LLD.campaigns;
  const list = query
    ? all.filter((c) => (c.name + c.system).toLowerCase().includes(query.toLowerCase()))
    : all;
  const showEmpty = empty;
  return (
    <Shell route="/campaigns">
      <div className="ll-page">
        <div className="ll-crumb" style={{ marginBottom: "14px" }}>Your chronicles</div>
        <div className="ll-headrow">
          <div>
            <Kicker>Campaigns</Kicker>
            <h1 className="ll-h1">Your chronicles</h1>
            <div className="ll-sub">{showEmpty ? "No campaigns yet" : `${all.length} campaigns · 9 sessions chronicled in total`}</div>
          </div>
          <div style={{ display: "flex", gap: "9px", alignItems: "center" }}>
            <button className="ll-linklike muted" onClick={() => setEmpty((v) => !v)} style={{ fontSize: "11.5px" }}>
              {showEmpty ? "show demo data" : "preview empty state"}
            </button>
            <button className="ll-btn primary" onClick={() => go("/campaigns/new")}>+ New campaign</button>
          </div>
        </div>

        {showEmpty ? (
          <div className="ll-paper flat" style={{ marginTop: "28px", borderStyle: "dashed", background: "transparent" }}>
            <EmptyState
              title="Your chronicle starts here"
              action="+ Create your first campaign"
              onAction={() => go("/campaigns/new")}
            >
              Paste your existing campaign notes and the Scribe will draft your NPCs, factions, world state and open arcs, for you to review before anything becomes canon.
            </EmptyState>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "10px", margin: "22px 0 6px", alignItems: "center" }}>
              <input
                className="ll-input"
                placeholder="Search campaigns…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ maxWidth: "300px" }}
              />
              <span className="ll-help">{list.length} of {all.length}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "12px" }} className="ll-camp-grid">
              {list.map((c) => <CampaignCard key={c.id} c={c} />)}
              {list.length === 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <EmptyState orn="✦" title="No campaigns match that search">Try a different name or game system.</EmptyState>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <style>{`@media (max-width: 760px){ .ll-camp-grid { grid-template-columns: 1fr !important; } }`}</style>
    </Shell>
  );
}

function CampaignCard({ c }) {
  const stats = [
    ["Sessions", c.sessions], ["NPCs", c.npcs], ["Factions", c.factions],
    ["Memories", c.memories], ["Open arcs", c.arcs],
  ];
  return (
    <div className="ll-paper" style={{ cursor: "pointer", display: "flex", flexDirection: "column" }} onClick={() => go(`/campaigns/${c.id}`)}>
      <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div>
            <div className="serif" style={{ fontSize: "20px", fontWeight: 600, letterSpacing: "-0.01em" }}>{c.name}</div>
            <div className="ll-sub" style={{ marginTop: "3px" }}>{c.system} · {c.tone}</div>
          </div>
          <span className={"ll-pill " + c.statusKind}>{c.status}</span>
        </div>
      </div>
      <div style={{ display: "flex", padding: "12px 20px" }}>
        {stats.map(([l, v], i) => (
          <div key={l} style={{ flex: 1, borderRight: i < stats.length - 1 ? "1px solid var(--line)" : "none", paddingRight: "6px" }}>
            <div className="serif" style={{ fontSize: "19px", fontWeight: 600 }}>{v}</div>
            <div style={{ fontSize: "11px", color: "var(--ink-2)" }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: "10px 20px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "12px", color: "var(--ink-3)" }}>Updated {c.updated}</span>
        <span className="ll-linklike">Open chronicle →</span>
      </div>
    </div>
  );
}

/* ── New campaign ── */
function NewCampaign() {
  const [name, setName] = useDS("Sombras sobre Phandalin");
  const [system, setSystem] = useDS("D&D 5e");
  const [tone, setTone] = useDS("Low-magic intrigue");
  const [context, setContext] = useDS("");
  const [extra, setExtra] = useDS("");
  const [touched, setTouched] = useDS(false);
  const [phase, setPhase] = useDS("form"); // form | loading | error
  const min = 100;
  const tooShort = context.trim().length < min;

  const analyze = () => {
    setTouched(true);
    if (!name.trim() || tooShort) return;
    setPhase("loading");
    setTimeout(() => {
      // Demo: if context contains the word "fail", show error
      if (/\bfail\b/i.test(context)) setPhase("error");
      else go("/campaigns/new/review");
    }, 1900);
  };

  if (phase === "loading") {
    return (
      <Shell route="/campaigns/new">
        <div className="ll-page narrow">
          <Loading title="Reading your world" sub="The Scribe is drafting NPCs, factions, world state and open arcs from your notes" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell route="/campaigns/new">
      <div className="ll-page narrow">
        <div className="ll-crumb" style={{ marginBottom: "14px" }}>
          <Link to="/campaigns">Campaigns</Link> / <b>New campaign</b>
        </div>
        <Kicker>Step 1 of 2 · Pour your world in</Kicker>
        <h1 className="ll-h1">Start a new chronicle</h1>
        <p className="ll-sub" style={{ marginBottom: "24px", maxWidth: "560px" }}>
          Paste your campaign notes however they exist today. The Scribe will draft the pieces; you'll review and edit everything before anything is saved.
        </p>

        {phase === "error" && (
          <div style={{ marginBottom: "18px" }}>
            <ErrorNotice onRetry={analyze}>The Scribe couldn't make sense of those notes. Your text is safe below. Try again, or add a little more detail.</ErrorNotice>
          </div>
        )}

        <div className="ll-paper" style={{ padding: "22px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Field label="Campaign name" error={touched && !name.trim() ? "Give your campaign a name." : null}>
              <input className={"ll-input" + (touched && !name.trim() ? " invalid" : "")} value={name} onChange={(e) => setName(e.target.value)} placeholder="The Salt Road" />
            </Field>
            <Field label="Game system">
              <input className="ll-input" value={system} onChange={(e) => setSystem(e.target.value)} placeholder="D&D 5e, Pathfinder, …" />
            </Field>
          </div>
          <Field label="Tone or style" optional>
            <input className="ll-input" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Grim survival, high adventure, political intrigue…" />
          </Field>
          <Field
            label="Starting context"
            error={touched && tooShort ? `Add at least ${min} characters so the Scribe has something to work with.` : null}
          >
            <textarea
              className={"ll-textarea" + (touched && tooShort ? " invalid" : "")}
              rows={9}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Phandalin is a frontier mining town. A young white dragon named Cryovain hunts the Sword Mountains. The Black Bear Guild smuggles through the warehouse district, and plans for an anti-dragon weapon have just been stolen…"
            />
            <div className={"ll-counter " + (context.trim().length >= min ? "ok" : touched && tooShort ? "bad" : "")}>
              {context.trim().length} / {min} characters minimum
            </div>
          </Field>
          <Field label="Additional details for the Scribe" optional help="House rules, things to ignore, party names: anything that shapes the extraction.">
            <textarea className="ll-textarea" rows={3} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="The party is four PCs: a paladin, two rogues and a wizard. Keep magic rare." style={{ fontFamily: "inherit", fontSize: "14px" }} />
          </Field>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
            <span className="ll-proto-hint">tip: include the word "fail" to preview the error state</span>
            <button className="ll-btn accent" onClick={analyze}>Analyze campaign →</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { Dashboard, NewCampaign, CampaignCard });
