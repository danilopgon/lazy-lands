// Lazy Lands — AI extraction review (/campaigns/new/review)
const { useState: useRV } = React;

function ExtractionReview() {
  const ex = window.LLD.extraction;
  const [summary, setSummary] = useRV({ text: ex.summary, edited: false });
  const [world, setWorld] = useRV({ text: ex.world, edited: false });
  const [npcs, setNpcs] = useRV(ex.npcs.map((n) => ({ ...n, origin: "scribe" })));
  const [factions, setFactions] = useRV(ex.factions.map((f) => ({ ...f, origin: "scribe" })));
  const [arcs, setArcs] = useRV(ex.arcs.map((a) => ({ ...a, origin: "scribe" })));
  const [creating, setCreating] = useRV(false);

  if (creating) {
    return (
      <Shell route="/campaigns/new/review">
        <div className="ll-page mid">
          <Loading title="Binding your chronicle" sub="Saving the world state, NPCs, factions and arcs you confirmed" />
        </div>
      </Shell>
    );
  }

  const total = npcs.length + factions.length + arcs.length + 2;

  return (
    <Shell route="/campaigns/new/review">
      <div className="ll-page mid">
        <div className="ll-crumb" style={{ marginBottom: "14px" }}>
          <Link to="/campaigns">Campaigns</Link> / <Link to="/campaigns/new">New campaign</Link> / <b>Review extraction</b>
        </div>
        <Kicker>Step 2 of 2 · Review before it's real</Kicker>
        <h1 className="ll-h1">What the Scribe found</h1>
        <p className="ll-sub" style={{ marginBottom: "18px", maxWidth: "620px" }}>
          Every item below is a <span className="ll-scribe-voice">proposal</span>, not canon. Edit anything, remove what's wrong, add what's missing, then confirm to create your campaign.
        </p>

        <ScribeNotice>
          The Scribe drafted <b>{total} items</b> from your notes. Marked <span className="ll-origin scribe">✦ Scribe</span> until you edit them.
        </ScribeNotice>

        <hr className="ll-rule" />

        <EditableProse label="Campaign summary" value={summary} onChange={setSummary} rows={3} />
        <EditableProse label="Initial world state" value={world} onChange={setWorld} rows={4} />

        <EntitySection
          title="NPCs detected" singular="NPC" items={npcs} setItems={setNpcs}
          fields={[["name", "Name"], ["note", "Role / note"]]}
        />
        <EntitySection
          title="Factions detected" singular="faction" items={factions} setItems={setFactions}
          fields={[["name", "Name"], ["note", "Posture / note"]]}
        />
        <EntitySection
          title="Open arcs detected" singular="arc" items={arcs} setItems={setArcs}
          fields={[["name", "Title"], ["note", "Priority / note"]]}
        />

        <hr className="ll-rule" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span className="ll-help">You can keep editing all of this after the campaign is created.</span>
          <div style={{ display: "flex", gap: "9px" }}>
            <button className="ll-btn" onClick={() => go("/campaigns/new")}>Back</button>
            <button className="ll-btn accent" onClick={() => { setCreating(true); setTimeout(() => go("/campaigns/phandalin"), 1700); }}>Confirm &amp; create campaign</button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function EditableProse({ label, value, onChange, rows }) {
  const [editing, setEditing] = useRV(false);
  const [draft, setDraft] = useRV(value.text);
  return (
    <section style={{ marginBottom: "20px" }}>
      <div className="ll-secthead">
        <h3>{label}</h3>
        {value.edited ? <OriginBadge origin="edited" /> : <OriginBadge origin="scribe" />}
      </div>
      {editing ? (
        <div>
          <textarea className="ll-textarea" rows={rows} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button className="ll-btn small primary" onClick={() => { onChange({ text: draft, edited: true }); setEditing(false); }}>Save changes</button>
            <button className="ll-btn small" onClick={() => { setDraft(value.text); setEditing(false); }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="ll-paper flat" style={{ padding: "14px 16px", background: "var(--paper)" }}>
          <p className="serif" style={{ fontSize: "15px", lineHeight: 1.6, margin: 0, color: "var(--ink)" }}>{value.text}</p>
          <button className="ll-linklike" style={{ marginTop: "10px" }} onClick={() => { setDraft(value.text); setEditing(true); }}>Edit</button>
        </div>
      )}
    </section>
  );
}

function EntitySection({ title, singular, items, setItems, fields }) {
  const [adding, setAdding] = useRV(false);
  const [draft, setDraft] = useRV({});
  const update = (i, patch) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch, origin: "edited" } : it));
  const remove = (i) => setItems(items.filter((_, idx) => idx !== i));
  const add = () => {
    if (!draft[fields[0][0]]) return;
    setItems([...items, { ...draft, origin: "edited" }]);
    setDraft({}); setAdding(false);
  };
  return (
    <section style={{ marginBottom: "22px" }}>
      <div className="ll-secthead">
        <h3>{title} <span style={{ color: "var(--ink-3)", fontWeight: 400, fontSize: "14px" }}>· {items.length}</span></h3>
        <button className="ll-linklike" onClick={() => { setAdding(true); setDraft({}); }}>+ Add {singular}</button>
      </div>
      <div className="ll-paper" style={{ padding: "4px 16px" }}>
        {items.length === 0 && !adding && (
          <p style={{ color: "var(--ink-3)", fontSize: "13px", padding: "12px 0" }}>Nothing here yet. Add a {singular} manually if the Scribe missed one.</p>
        )}
        {items.map((it, i) => (
          <EntityRow key={i} item={it} fields={fields} onSave={(patch) => update(i, patch)} onRemove={() => remove(i)} />
        ))}
        {adding && (
          <div style={{ padding: "12px 0", borderTop: items.length ? "1px dotted var(--dotted)" : "none" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "10px" }}>
              {fields.map(([k, ph]) => (
                <input key={k} className="ll-input" placeholder={ph} value={draft[k] || ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} autoFocus={k === fields[0][0]} />
              ))}
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button className="ll-btn small primary" onClick={add}>Add</button>
              <button className="ll-btn small" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function EntityRow({ item, fields, onSave, onRemove }) {
  const [editing, setEditing] = useRV(false);
  const [draft, setDraft] = useRV(item);
  if (editing) {
    return (
      <div style={{ padding: "12px 0", borderBottom: "1px dotted var(--dotted)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "10px" }}>
          {fields.map(([k, ph]) => (
            <input key={k} className="ll-input" placeholder={ph} value={draft[k] || ""} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
          ))}
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button className="ll-btn small primary" onClick={() => { onSave(draft); setEditing(false); }}>Save changes</button>
          <button className="ll-btn small" onClick={() => { setDraft(item); setEditing(false); }}>Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div className="ll-dotrow" style={{ alignItems: "center" }}>
      <div style={{ minWidth: 0 }}>
        <div className="t">{item[fields[0][0]]}</div>
        <div className="m">{item[fields[1][0]]}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: "12px", alignItems: "center" }}>
        <OriginBadge origin={item.origin} />
        <button className="ll-linklike" onClick={() => { setDraft(item); setEditing(true); }}>Edit</button>
        <button className="ll-linklike muted" onClick={onRemove}>Remove</button>
      </div>
    </div>
  );
}

Object.assign(window, { ExtractionReview });
