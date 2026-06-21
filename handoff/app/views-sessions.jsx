// Lazy Lands — Log session (post-game) + Memory review
const { useState: useSS } = React;

/* ── Log session ── */
function LogSession({ id }) {
  const base = `/campaigns/${id}`;
  const [d, setD] = useSS({
    title: "", num: "8", summary: "", consequences: "", world: "",
    npcs: "", factions: "", arcs: [], notes: "",
  });
  const [touched, setTouched] = useSS(false);
  const [phase, setPhase] = useSS("form"); // form | saving | error
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const arcOptions = window.LLD.arcs.filter((a) => a.status === "Active" || a.status === "Dormant");
  const toggleArc = (aid) => setD({ ...d, arcs: d.arcs.includes(aid) ? d.arcs.filter((x) => x !== aid) : [...d.arcs, aid] });
  const summaryMissing = !d.summary.trim();

  const submit = () => {
    setTouched(true);
    if (summaryMissing) return;
    setPhase("saving");
    setTimeout(() => {
      if (/\bfail\b/i.test(d.summary)) setPhase("error");
      else go(base + "/memory/review");
    }, 1900);
  };

  if (phase === "saving") {
    return (
      <Shell route={base + "/sessions/new"} campaignId={id}>
        <div className="ll-page narrow">
          <Loading title="Chronicling the session" sub="Saving your record and asking the Scribe what's worth remembering" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell route={base + "/sessions/new"} campaignId={id}>
      <div className="ll-page narrow">
        <div className="ll-crumb" style={{ marginBottom: "14px" }}>
          <Link to="/campaigns">Campaigns</Link> / <Link to={base}>Sombras sobre Phandalin</Link> / <b>Log session</b>
        </div>
        <Kicker>After the table clears</Kicker>
        <h1 className="ll-h1">Log what happened</h1>
        <p className="ll-sub" style={{ marginBottom: "22px", maxWidth: "560px" }}>
          Write it the way you'd tell a friend. The Scribe will read your record and propose memories; you decide what the campaign keeps.
        </p>

        {phase === "error" && (
          <div style={{ marginBottom: "18px" }}>
            <ErrorNotice onRetry={submit}>Something went wrong while processing the session. <b>Your text is safe</b>; nothing you wrote was lost. Try again.</ErrorNotice>
          </div>
        )}

        <div className="ll-paper" style={{ padding: "22px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr", gap: "16px" }}>
            <Field label="Session title">
              <input className="ll-input" value={d.title} onChange={set("title")} placeholder="The Quiet Ledger" />
            </Field>
            <Field label="Session #">
              <input className="ll-input" value={d.num} onChange={set("num")} />
            </Field>
          </div>
          <Field label="What happened" error={touched && summaryMissing ? "The summary is the one thing the Scribe can't work without." : null}>
            <textarea
              className={"ll-textarea" + (touched && summaryMissing ? " invalid" : "")}
              rows={7} value={d.summary} onChange={set("summary")}
              placeholder="The party tracked the smugglers to the warehouse district. Things escalated; by midnight the warehouse was burning and Halia's men were asking questions…"
            />
          </Field>
          <Field label="Consequences" optional>
            <textarea className="ll-textarea" rows={3} value={d.consequences} onChange={set("consequences")} placeholder="The Black Bear Guild lost their main cache. The militia suspects arson." />
          </Field>
          <Field label="Changes to the world state" optional>
            <textarea className="ll-textarea" rows={2} value={d.world} onChange={set("world")} placeholder="The warehouse district is under curfew." />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Field label="Changes to NPCs" optional>
              <textarea className="ll-textarea" rows={3} value={d.npcs} onChange={set("npcs")} placeholder="Ander covered for the party." style={{ fontFamily: "inherit", fontSize: "14px" }} />
            </Field>
            <Field label="Changes to factions" optional>
              <textarea className="ll-textarea" rows={3} value={d.factions} onChange={set("factions")} placeholder="Black Bear Guild went quiet." style={{ fontFamily: "inherit", fontSize: "14px" }} />
            </Field>
          </div>
          <Field label="Arcs touched this session" optional>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px", marginTop: "2px" }}>
              {arcOptions.map((a) => (
                <label key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13.5px", cursor: "pointer" }}>
                  <input type="checkbox" checked={d.arcs.includes(a.id)} onChange={() => toggleArc(a.id)} />
                  {a.title}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Private DM notes" optional help="Never shown to the Scribe's suggestions, never exported.">
            <textarea className="ll-textarea" rows={2} value={d.notes} onChange={set("notes")} placeholder="I fudged the manticore's HP. Don't tell anyone." style={{ background: "var(--paper-2)" }} />
          </Field>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", gap: "10px", flexWrap: "wrap" }}>
            <span className="ll-proto-hint">tip: include the word "fail" in the summary to preview the error state</span>
            <button className="ll-btn accent" onClick={submit}>Save session &amp; review memories →</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* ── Memory review ── */
function MemoryReview({ id }) {
  const base = `/campaigns/${id}`;
  const [pending, setPending] = useSS(window.LLD.suggestions);
  const [accepted, setAccepted] = useSS(window.LLD.memories);
  const [editing, setEditing] = useSS(null); // suggestion being edited
  const [toast, showToast] = useToast();
  const [demoEmpty, setDemoEmpty] = useSS(false);
  const [fx, setFx] = useSS({}); // { [id]: 'stamping' | 'discarding' }

  const accept = (s, text) => {
    setEditing(null);
    setFx((f) => ({ ...f, [s.id]: "stamping" }));
    setTimeout(() => {
      setPending((p) => p.filter((x) => x.id !== s.id));
      setAccepted((a) => [{ id: s.id, type: s.type, text: text || s.text, origin: "Session 7", related: s.related.join(" · "), edited: !!text }, ...a]);
      setFx((f) => { const n = { ...f }; delete n[s.id]; return n; });
      showToast(text ? "Edited & stamped into the chronicle" : "Stamped into the chronicle");
    }, 620);
  };
  const dismiss = (s) => {
    setFx((f) => ({ ...f, [s.id]: "discarding" }));
    setTimeout(() => {
      setPending((p) => p.filter((x) => x.id !== s.id));
      setFx((f) => { const n = { ...f }; delete n[s.id]; return n; });
      showToast("Struck out. The Scribe won't bring it up again");
    }, 760);
  };
  const removeMemory = (m) => {
    setAccepted(accepted.filter((x) => x.id !== m.id));
    showToast("Memory retired from the chronicle");
  };

  const shownPending = demoEmpty ? [] : pending;

  return (
    <Shell route={base + "/memory/review"} campaignId={id}>
      <div className="ll-page mid">
        <div className="ll-crumb" style={{ marginBottom: "14px" }}>
          <Link to="/campaigns">Campaigns</Link> / <Link to={base}>Sombras sobre Phandalin</Link> / <b>Memory</b>
        </div>
        <div className="ll-headrow">
          <div>
            <Kicker>Session VII · The Warehouse Fire</Kicker>
            <h1 className="ll-h1">The Scribe's margins</h1>
            <div className="ll-sub">
              {shownPending.length > 0
                ? <span><b>{shownPending.length} suggestions</b> await your judgment. Only what you accept becomes part of the chronicle.</span>
                : "Nothing awaits review."}
            </div>
          </div>
          <button className="ll-linklike muted" style={{ fontSize: "11.5px", whiteSpace: "nowrap" }} onClick={() => setDemoEmpty((v) => !v)}>
            {demoEmpty ? "restore suggestions" : "preview empty state"}
          </button>
        </div>

        <div style={{ marginTop: "22px", display: "grid", gap: "16px" }}>
          {shownPending.length === 0 ? (
            <div className="ll-paper flat" style={{ borderStyle: "dashed", background: "transparent" }}>
              <EmptyState orn="❧" title="The margins are clean" action="← Back to campaign" onAction={() => go(base)}>
                No suggestions await review. Log your next session and the Scribe will read it for things worth remembering.
              </EmptyState>
            </div>
          ) : shownPending.map((s) => (
            editing === s.id
              ? <SuggestionEditor key={s.id} s={s} onSave={(text) => accept(s, text)} onCancel={() => setEditing(null)} />
              : <SuggestionCard key={s.id} s={s} fx={fx[s.id]} onAccept={() => accept(s)} onEdit={() => setEditing(s.id)} onDismiss={() => dismiss(s)} />
          ))}
        </div>

        <hr className="ll-rule" style={{ margin: "30px 0 22px" }} />
        <div className="ll-secthead">
          <h3>Active memories <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: "14px" }}>· {accepted.length}</span></h3>
          <span className="ll-help">These feed every future session draft</span>
        </div>
        <div className="ll-paper" style={{ padding: "2px 18px" }}>
          {accepted.length === 0 ? (
            <EmptyState orn="✦" title="No memories yet">Accept suggestions above, or they'll stay out of the chronicle entirely.</EmptyState>
          ) : accepted.map((m) => (
            <div className="ll-dotrow" key={m.id} style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <span className="ll-flag accent">{m.type}</span>
                {m.edited && <span className="ll-origin edited" style={{ marginLeft: "8px" }}>✎ Edited</span>}
                <p className="serif" style={{ margin: "3px 0 2px", fontSize: "14.5px", lineHeight: 1.5 }}>{m.text}</p>
                <span style={{ fontSize: "11.5px", color: "var(--ink-3)" }}>Accepted · {m.origin}{m.related && m.related !== "—" ? ` · ${m.related}` : ""}</span>
              </div>
              <button className="ll-linklike muted" style={{ marginLeft: "auto", whiteSpace: "nowrap" }} onClick={() => removeMemory(m)}>Retire</button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "9px", marginTop: "22px" }}>
          <button className="ll-btn" onClick={() => go(base)}>Back to campaign</button>
          <button className="ll-btn accent" onClick={() => go(base + "/prepare")}>Prepare next session →</button>
        </div>
      </div>
      <Toast msg={toast} />
    </Shell>
  );
}

function SuggestionCard({ s, fx, onAccept, onEdit, onDismiss }) {
  const stamping = fx === "stamping";
  const discarding = fx === "discarding";
  const busy = stamping || discarding;
  return (
    <div className={"ll-paper" + (discarding ? " ll-discarding" : "")} style={{ position: "relative", overflow: "hidden" }}>
      {stamping && (
        <div style={{ position: "absolute", top: "16px", right: "18px", zIndex: 3 }}>
          <span className="ll-stamp">★ Accepted</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "baseline", gap: "10px", padding: "14px 20px 0" }}>
        <span className="ll-scribe-voice" style={{ fontSize: "15px" }}>❧ The Scribe proposes…</span>
        <span className="mono" style={{ marginLeft: "auto", fontSize: "10px", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-3)", whiteSpace: "nowrap" }}>{s.origin}</span>
      </div>
      <hr style={{ border: 0, borderTop: "1px dashed var(--dotted)", margin: "10px 20px 0" }} />
      <div style={{ padding: "14px 20px 16px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <span className="ll-pill accent">{s.type}</span>
          <span className="ll-pill muted">Importance · {s.importance}</span>
        </div>
        <blockquote className={"serif" + (discarding ? " ll-strike" : "")} style={{ margin: "0 0 12px", fontSize: "17px", lineHeight: 1.55 }}>"{s.text}"</blockquote>
        <div style={{ fontSize: "13px", color: "var(--ink-2)", paddingLeft: "12px", borderLeft: "3px solid var(--accent)" }}>{s.why}</div>
        <div className="mono" style={{ marginTop: "12px", fontSize: "11px", letterSpacing: "0.03em", color: "var(--ink-2)" }}>
          <b style={{ color: "var(--ink)" }}>Touches:</b> {s.related.join(" · ")}
        </div>
      </div>
      <div style={{ display: "flex", gap: "9px", alignItems: "center", padding: "13px 20px", borderTop: "2px solid var(--border)" }}>
        <button className="ll-btn primary" onClick={onAccept} disabled={busy}>Accept as memory</button>
        <button className="ll-btn" onClick={onEdit} disabled={busy}>Edit &amp; accept</button>
        <span style={{ flex: 1 }}></span>
        <button className="ll-linklike muted" onClick={onDismiss} disabled={busy}>Dismiss</button>
      </div>
    </div>
  );
}

function SuggestionEditor({ s, onSave, onCancel }) {
  const [text, setText] = useSS(s.text);
  return (
    <div className="ll-paper" style={{ borderColor: "var(--accent)", boxShadow: "6px 6px 0 var(--accent)" }}>
      <div style={{ padding: "14px 20px 16px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <span className="ll-pill accent">{s.type}</span>
          <span className="ll-flag muted">Editing before accepting</span>
        </div>
        <textarea className="ll-textarea" rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </div>
      <div style={{ display: "flex", gap: "9px", padding: "13px 20px", borderTop: "2px solid var(--border)" }}>
        <button className="ll-btn primary" onClick={() => onSave(text)}>Save &amp; accept as memory</button>
        <button className="ll-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

Object.assign(window, { LogSession, MemoryReview });
