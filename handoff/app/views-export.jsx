// Lazy Lands — PDF export preview + Campaign settings
const { useState: useEX } = React;

/* ── PDF export ── */
function ExportView({ id }) {
  const base = `/campaigns/${id}`;
  const g = window.LLD.generated;
  const [include, setInclude] = useEX(() => Object.fromEntries(g.sections.map((s) => [s.id, true])));
  const [phase, setPhase] = useEX("idle"); // idle | exporting | error | done
  const toggle = (sid) => setInclude({ ...include, [sid]: !include[sid] });
  const included = g.sections.filter((s) => include[s.id]);

  const download = (shouldFail) => {
    setPhase("exporting");
    setTimeout(() => setPhase(shouldFail ? "error" : "done"), 1700);
  };

  return (
    <Shell route={base + "/sessions/s8/export"} campaignId={id}>
      <div className="ll-page">
        <div className="ll-crumb" style={{ marginBottom: "14px" }}>
          <Link to="/campaigns">Campaigns</Link> / <Link to={base}>Sombras sobre Phandalin</Link> / <Link to={base + "/sessions/s8"}>Session VIII draft</Link> / <b>Export</b>
        </div>
        <div className="ll-headrow">
          <div>
            <Kicker>Session VIII · Export</Kicker>
            <h1 className="ll-h1">Take it to the table</h1>
            <div className="ll-sub">This exports <b>your edited version</b>. Private DM notes stay out of the document.</div>
          </div>
          <div style={{ display: "flex", gap: "9px" }}>
            <button className="ll-btn" onClick={() => go(base + "/sessions/s8")}>← Back to editing</button>
            <button className="ll-btn accent" onClick={() => download(false)} disabled={phase === "exporting"}>
              {phase === "exporting" ? "Exporting…" : "Download PDF"}
            </button>
          </div>
        </div>

        {phase === "error" && (
          <div style={{ margin: "18px 0 0" }}>
            <ErrorNotice onRetry={() => download(false)}>The PDF failed to render. Your session draft is untouched. Try exporting again.</ErrorNotice>
          </div>
        )}
        {phase === "done" && (
          <div style={{ margin: "18px 0 0" }}>
            <ScribeNotice>✓ <b>Session VIII.pdf</b> downloaded. May the dice be kind.</ScribeNotice>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "32px", marginTop: "26px", alignItems: "start" }} className="ll-export-grid">
          <div>
            <div className="ll-secthead"><h3>Include in PDF</h3></div>
            <div className="ll-paper flat" style={{ padding: "8px 16px" }}>
              {g.sections.map((s) => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: "9px", padding: "7px 0", fontSize: "13.5px", cursor: "pointer", borderBottom: "1px dotted var(--dotted)" }}>
                  <input type="checkbox" checked={include[s.id]} onChange={() => toggle(s.id)} />
                  {s.label}
                  {s.origin === "edited" && <span className="ll-origin edited" style={{ marginLeft: "auto" }}>✎</span>}
                </label>
              ))}
              <div style={{ display: "flex", alignItems: "center", gap: "9px", padding: "9px 0", fontSize: "13.5px", color: "var(--ink-3)" }}>
                <input type="checkbox" checked={false} disabled />
                Private DM notes
                <span className="ll-flag muted" style={{ marginLeft: "auto" }}>Never exported</span>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "var(--ink-3)", marginTop: "10px" }}>
              {included.length} of {g.sections.length} sections · A4 portrait · ~2 pages
            </p>
            <button className="ll-linklike muted" style={{ fontSize: "11.5px" }} onClick={() => download(true)}>preview export error state</button>
          </div>

          <div style={{ maxWidth: "640px" }}>
            {phase === "exporting" ? (
              <div className="ll-paper flat" style={{ background: "transparent", borderStyle: "dashed" }}>
                <Loading title="Pressing the pages" sub="Rendering your edited session to PDF" />
              </div>
            ) : (
              <div className="ll-pdf">
                <h2>{g.title}</h2>
                <div className="meta">Sombras sobre Phandalin · Session VIII · Prepared by the DM</div>
                {included.map((s) => (
                  <div key={s.id}>
                    <h3>{s.label}</h3>
                    {s.body.split("\n").filter(Boolean).map((line, i) =>
                      line.startsWith("•")
                        ? <p key={i} style={{ paddingLeft: "14px" }}>{line}</p>
                        : <p key={i}>{line}</p>
                    )}
                  </div>
                ))}
                <p style={{ marginTop: "26px", fontSize: "11px", color: "#A89B82", fontFamily: '"Instrument Sans", sans-serif', letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Chronicled with Lazy Lands · Edited by the DM
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 900px){ .ll-export-grid { grid-template-columns: 1fr !important; } }`}</style>
    </Shell>
  );
}

/* ── Settings ── */
function SettingsView({ id }) {
  const base = `/campaigns/${id}`;
  const [d, setD] = useEX({ name: "Sombras sobre Phandalin", system: "D&D 5e", tone: "Low-magic intrigue" });
  const [confirm, setConfirm] = useEX(false);
  const [confirmText, setConfirmText] = useEX("");
  const [toast, showToast] = useToast();
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });

  return (
    <Shell route={base + "/settings"} campaignId={id}>
      <div className="ll-page narrow">
        <div className="ll-crumb" style={{ marginBottom: "14px" }}>
          <Link to="/campaigns">Campaigns</Link> / <Link to={base}>Sombras sobre Phandalin</Link> / <b>Settings</b>
        </div>
        <Kicker>Campaign</Kicker>
        <h1 className="ll-h1">Settings</h1>

        <div className="ll-paper" style={{ padding: "22px 24px", marginTop: "20px" }}>
          <div className="ll-secthead"><h3>Basics</h3></div>
          <Field label="Campaign name"><input className="ll-input" value={d.name} onChange={set("name")} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Field label="Game system"><input className="ll-input" value={d.system} onChange={set("system")} /></Field>
            <Field label="Default tone"><input className="ll-input" value={d.tone} onChange={set("tone")} /></Field>
          </div>
          <button className="ll-btn primary" onClick={() => showToast("Settings saved")}>Save changes</button>
        </div>

        <div className="ll-paper" style={{ padding: "22px 24px", marginTop: "18px" }}>
          <div className="ll-secthead"><h3>The Scribe</h3><span className="ll-pill muted">Coming soon</span></div>
          <p style={{ fontSize: "13px", color: "var(--ink-2)", margin: "0 0 14px" }}>
            How much initiative the Scribe takes: how many suggestions per session, how bold the drafts are. Placeholder for now.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", opacity: 0.55, pointerEvents: "none" }}>
            <Field label="Suggestions per session">
              <select className="ll-select" defaultValue="Around 4"><option>Around 4</option></select>
            </Field>
            <Field label="Draft boldness">
              <select className="ll-select" defaultValue="Faithful to canon"><option>Faithful to canon</option></select>
            </Field>
          </div>
        </div>

        <div className="ll-paper" style={{ padding: "22px 24px", marginTop: "18px", borderColor: "var(--danger)" }}>
          <div className="ll-secthead"><h3 style={{ color: "var(--danger)" }}>Danger zone</h3></div>
          <p style={{ fontSize: "13px", color: "var(--ink-2)", margin: "0 0 14px" }}>
            Deleting a campaign burns the chronicle: sessions, memories, NPCs, all of it. There is no undo.
          </p>
          {!confirm ? (
            <button className="ll-btn danger" onClick={() => setConfirm(true)}>Delete this campaign</button>
          ) : (
            <div>
              <Field label={`Type "${d.name}" to confirm`}>
                <input className="ll-input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={d.name} autoFocus />
              </Field>
              <div style={{ display: "flex", gap: "9px" }}>
                <button className="ll-btn danger" disabled={confirmText !== d.name} onClick={() => go("/campaigns")}>Burn the chronicle</button>
                <button className="ll-btn" onClick={() => { setConfirm(false); setConfirmText(""); }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Toast msg={toast} />
    </Shell>
  );
}

Object.assign(window, { ExportView, SettingsView });
