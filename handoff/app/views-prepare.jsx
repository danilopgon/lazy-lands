// Lazy Lands — Prepare next session + Generated session + PDF export
const { useState: usePR } = React;

/* ── Prepare next session ── */
function PrepareSession({ id }) {
  const base = `/campaigns/${id}`;
  const d = window.LLD;
  const [opts, setOpts] = usePR({ goal: "", tone: "Keep current, low-magic intrigue", pace: "Balanced", difficulty: "Standard", extra: "" });
  const [phase, setPhase] = usePR("form"); // form | loading | error
  const set = (k) => (e) => setOpts({ ...opts, [k]: e.target.value });

  const generate = () => {
    setPhase("loading");
    setTimeout(() => {
      if (/\bfail\b/i.test(opts.extra)) setPhase("error");
      else go(base + "/sessions/s8");
    }, 2200);
  };

  if (phase === "loading") {
    return (
      <Shell route={base + "/prepare"} campaignId={id}>
        <div className="ll-page narrow">
          <Loading title="Drafting Session VIII" sub="The Scribe is weaving 4 arcs, 5 memories and 7 sessions of history into a proposal" />
        </div>
      </Shell>
    );
  }

  const ctx = [
    ["Campaign summary", "Accumulated across 7 sessions"],
    ["Last session", "VII · The Warehouse Fire"],
    ["World state", "As edited by you, after Session 7"],
    ["Active NPCs", "5 active, 2 with pending grudges"],
    ["Factions", "4 tracked, Black Bear Guild suspiciously quiet"],
    ["Open arcs", "3 included · 1 excluded (Cryovain)"],
    ["Accepted memories", "5 active memories will inform the draft"],
  ];

  return (
    <Shell route={base + "/prepare"} campaignId={id}>
      <div className="ll-page mid">
        <div className="ll-crumb" style={{ marginBottom: "14px" }}>
          <Link to="/campaigns">Campaigns</Link> / <Link to={base}>Sombras sobre Phandalin</Link> / <b>Prepare next session</b>
        </div>
        <Kicker>Before the next table</Kicker>
        <h1 className="ll-h1">Prepare Session VIII</h1>
        <p className="ll-sub" style={{ marginBottom: "22px", maxWidth: "600px" }}>
          The Scribe drafts a session proposal from everything you've accepted. You'll edit every word of it before it reaches the table.
        </p>

        {phase === "error" && (
          <div style={{ marginBottom: "18px" }}>
            <ErrorNotice onRetry={generate}>The Scribe's draft came back malformed and was discarded. No context was lost. Try generating again.</ErrorNotice>
          </div>
        )}

        <div className="ll-cols">
          <div className="ll-colL">
            <div className="ll-secthead"><h3>What the Scribe will read</h3></div>
            <div className="ll-paper flat" style={{ padding: "4px 18px", background: "var(--paper)" }}>
              {ctx.map(([t, m]) => (
                <div className="ll-dotrow" key={t}>
                  <div><div className="t" style={{ fontSize: "13.5px" }}>{t}</div><div className="m">{m}</div></div>
                  <span className="ll-flag good" style={{ marginLeft: "auto" }}>Included</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: "12.5px", color: "var(--ink-3)", marginTop: "10px" }}>
              ✦ Only <b>accepted</b> memories are read. Dismissed suggestions and private notes never reach the Scribe.
            </p>
          </div>

          <div className="ll-colR">
            <div className="ll-secthead"><h3>Your direction</h3><span className="ll-help">all optional</span></div>
            <Field label="Desired goal for the session" optional>
              <textarea className="ll-textarea" rows={2} value={opts.goal} onChange={set("goal")} placeholder="Bring Herman's revenge to a head." style={{ fontFamily: "inherit", fontSize: "14px" }} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <Field label="Tone">
                <select className="ll-select" value={opts.tone} onChange={set("tone")}>
                  {["Keep current, low-magic intrigue", "Darker", "Lighter", "More action", "More roleplay"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Pace">
                <select className="ll-select" value={opts.pace} onChange={set("pace")}>
                  {["Balanced", "Slow burn", "Breakneck"].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Difficulty">
              <select className="ll-select" value={opts.difficulty} onChange={set("difficulty")}>
                {["Standard", "Forgiving", "Deadly"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Anything else for the Scribe" optional>
              <textarea className="ll-textarea" rows={3} value={opts.extra} onChange={set("extra")} placeholder="One player missed last session; give their PC a quiet way back in." style={{ fontFamily: "inherit", fontSize: "14px" }} />
            </Field>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span className="ll-proto-hint">tip: write "fail" above to preview the error</span>
              <button className="ll-btn accent" onClick={generate}>Prepare session proposal →</button>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── Generated session (editable draft) ── */
function GeneratedSession({ id }) {
  const base = `/campaigns/${id}`;
  const g = window.LLD.generated;
  const [sections, setSections] = usePR(g.sections);
  const [notes, setNotes] = usePR(g.privateNotes);
  const [editingNotes, setEditingNotes] = usePR(false);
  const [editing, setEditing] = usePR(null); // section id
  const [draft, setDraft] = usePR("");
  const [regenerating, setRegenerating] = usePR(null);
  const [toast, showToast] = useToast();
  const memories = window.LLD.memories.filter((m) => g.memoriesUsed.includes(m.id));

  const saveSection = (sid) => {
    setSections(sections.map((s) => s.id === sid ? { ...s, body: draft, origin: "edited" } : s));
    setEditing(null);
    showToast("Section saved");
  };
  const regenerate = (sid) => {
    setRegenerating(sid);
    setTimeout(() => {
      setSections(sections.map((s) => s.id === sid ? { ...s, body: s.body + "\n\n(Regenerated alternative. In the real product the Scribe would offer a fresh take here.)", origin: "scribe" } : s));
      setRegenerating(null);
      showToast("Section regenerated by the Scribe");
    }, 1400);
  };
  const copyAll = () => {
    const text = sections.map((s) => s.label.toUpperCase() + "\n" + s.body).join("\n\n");
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    showToast("Session copied to clipboard");
  };

  return (
    <Shell route={base + "/sessions/s8"} campaignId={id}>
      <div className="ll-page mid">
        <div className="ll-crumb" style={{ marginBottom: "14px" }}>
          <Link to="/campaigns">Campaigns</Link> / <Link to={base}>Sombras sobre Phandalin</Link> / <b>Session VIII draft</b>
        </div>
        <div className="ll-headrow">
          <div>
            <Kicker>Session VIII · Proposal</Kicker>
            <h1 className="ll-h1">{g.title}</h1>
            <div className="ll-sub">A <span className="ll-scribe-voice">draft by the Scribe</span>. Nothing here is canon until you've made it yours.</div>
          </div>
          <div style={{ display: "flex", gap: "9px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="ll-btn" onClick={() => go(base)}>← Campaign</button>
            <button className="ll-btn" onClick={copyAll}>Copy</button>
            <button className="ll-btn" onClick={() => showToast("All changes saved")}>Save changes</button>
            <button className="ll-btn accent" onClick={() => go(base + "/sessions/s8/export")}>Export PDF →</button>
          </div>
        </div>

        <div className="ll-cols">
          <div className="ll-colL">
            {sections.map((s, i) => (
              <div className="ll-gen-sect" key={s.id}>
                <div className="head">
                  <span className="ll-sectnum">/{String(i + 1).padStart(2, "0")}</span>
                  <h4>{s.label}</h4>
                  <OriginBadge origin={s.origin} />
                  <div className="tools">
                    {editing !== s.id && <>
                      <button className="ll-linklike" onClick={() => { setEditing(s.id); setDraft(s.body); }}>Edit</button>
                      <button className="ll-linklike muted" onClick={() => regenerate(s.id)} disabled={regenerating === s.id}>
                        {regenerating === s.id ? "Regenerating…" : "Regenerate"}
                      </button>
                    </>}
                  </div>
                </div>
                {editing === s.id ? (
                  <div>
                    <textarea className="ll-textarea" rows={Math.max(3, s.body.split("\n").length + 1)} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                      <button className="ll-btn small primary" onClick={() => saveSection(s.id)}>Save changes</button>
                      <button className="ll-btn small" onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  </div>
                ) : regenerating === s.id ? (
                  <div style={{ padding: "8px 0" }}><span className="ll-quill" style={{ fontSize: "16px" }}>✒</span> <span style={{ fontSize: "13px", color: "var(--ink-3)" }} className="ll-ellip">The Scribe is rewriting</span></div>
                ) : (
                  <div className="body">{s.body}</div>
                )}
              </div>
            ))}

            <div className="ll-gen-sect private" style={{ marginTop: "16px" }}>
              <div className="head">
                <h4>Private DM notes</h4>
                <span className="ll-flag muted">Excluded from PDF</span>
                <div className="tools">
                  {!editingNotes && <button className="ll-linklike" onClick={() => setEditingNotes(true)}>Edit</button>}
                </div>
              </div>
              {editingNotes ? (
                <div>
                  <textarea className="ll-textarea" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} autoFocus />
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button className="ll-btn small primary" onClick={() => { setEditingNotes(false); showToast("Notes saved"); }}>Save changes</button>
                    <button className="ll-btn small" onClick={() => setEditingNotes(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="body" style={{ fontSize: "14px", color: "var(--ink-2)" }}>{notes}</div>
              )}
            </div>
          </div>

          <div className="ll-colR">
            <div className="ll-secthead"><h3>Memories woven in</h3></div>
            <p style={{ fontSize: "12.5px", color: "var(--ink-3)", margin: "0 0 8px" }}>The Scribe drew on these accepted memories:</p>
            {memories.map((m) => (
              <div key={m.id} style={{ padding: "10px 0", borderBottom: "1px dotted var(--dotted)" }}>
                <span className="ll-flag accent">{m.type}</span>
                <p className="serif" style={{ margin: "3px 0 2px", fontSize: "13.5px", lineHeight: 1.5 }}>{m.text}</p>
                <span style={{ fontSize: "11px", color: "var(--ink-3)" }}>{m.origin}</span>
              </div>
            ))}
            <hr className="ll-rule" />
            <div className="ll-secthead"><h3>Legend</h3></div>
            <div style={{ display: "grid", gap: "8px", fontSize: "12.5px", color: "var(--ink-2)" }}>
              <span><span className="ll-origin scribe">✦ Scribe</span> · generated, not yet touched by you</span>
              <span><span className="ll-origin edited">✎ Edited by you</span> · yours now; regenerate replaces it</span>
              <span><span className="ll-flag muted">Excluded from PDF</span> · private notes never export</span>
            </div>
          </div>
        </div>
      </div>
      <Toast msg={toast} />
    </Shell>
  );
}

Object.assign(window, { PrepareSession, GeneratedSession });
