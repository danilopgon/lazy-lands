// Lazy Lands — Entity views: NPCs, Factions, Arcs
const { useState: useEN } = React;

/* ── Generic entity page scaffold ── */
function EntityPage({ id, route, kicker, title, subtitle, addLabel, emptyTitle, emptyBody, filters, filterKey, children, onAdd }) {
  return (
    <Shell route={route} campaignId={id}>
      <div className="ll-page">
        <div className="ll-crumb" style={{ marginBottom: "14px" }}>
          <Link to="/campaigns">Campaigns</Link> / <Link to={`/campaigns/${id}`}>Sombras sobre Phandalin</Link> / <b>{title}</b>
        </div>
        <div className="ll-headrow">
          <div>
            <Kicker>{kicker}</Kicker>
            <h1 className="ll-h1">{title}</h1>
            <div className="ll-sub">{subtitle}</div>
          </div>
          <button className="ll-btn primary" onClick={onAdd}>{addLabel}</button>
        </div>
        {filters}
        {children}
      </div>
    </Shell>
  );
}

function FilterBar({ options, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: "8px", margin: "20px 0 4px", flexWrap: "wrap" }}>
      {options.map((o) => (
        <button
          key={o}
          className="ll-btn small"
          style={active === o ? { background: "var(--ink)", color: "var(--bg)", borderColor: "var(--ink)" } : {}}
          onClick={() => onChange(o)}
        >{o}</button>
      ))}
    </div>
  );
}

function EntityTools({ origin, onEdit, onRemove, extra }) {
  return (
    <div className="tools">
      <OriginBadge origin={origin} />
      {extra}
      <button className="ll-linklike" onClick={onEdit}>Edit</button>
      <button className="ll-linklike muted" onClick={onRemove}>Delete</button>
    </div>
  );
}

/* ── NPCs ── */
function NpcsView({ id }) {
  const base = `/campaigns/${id}`;
  const [items, setItems] = useEN(window.LLD.npcs);
  const [filter, setFilter] = useEN("All");
  const [modal, setModal] = useEN(null); // {mode:'add'|'edit', item}
  const statuses = ["All", "Active", "Scheming", "Anxious", "Threat"];
  const shown = filter === "All" ? items : items.filter((n) => n.status === filter);

  const save = (item) => {
    if (modal.mode === "add") setItems([{ ...item, id: "n" + Date.now(), origin: "edited" }, ...items]);
    else setItems(items.map((n) => n.id === item.id ? { ...item, origin: "edited" } : n));
    setModal(null);
  };

  return (
    <EntityPage
      id={id} route={base + "/npcs"} kicker="Campaign · NPCs" title="NPCs"
      subtitle={`${items.length} characters tracked across the chronicle`}
      addLabel="+ New NPC" onAdd={() => setModal({ mode: "add", item: { status: "Active", origin: "edited" } })}
      filters={<FilterBar options={statuses} active={filter} onChange={setFilter} />}
    >
      <div className="ll-paper" style={{ padding: "0 20px", marginTop: "12px" }}>
        {shown.length === 0 ? (
          <EmptyState orn="◈" title="No NPCs yet" action="+ Add your first NPC" onAction={() => setModal({ mode: "add", item: { status: "Active" } })}>
            The Scribe extracts NPCs from your notes, or add them by hand as the party meets them.
          </EmptyState>
        ) : shown.map((n) => (
          <div className="ll-entity" key={n.id}>
            <div className="row1">
              <span className="name">{n.name}</span>
              <span className={"ll-pill " + (n.status === "Threat" || n.status === "Scheming" ? "danger" : n.status === "Anxious" ? "accent" : "good")}>{n.status}</span>
              <EntityTools origin={n.origin} onEdit={() => setModal({ mode: "edit", item: n })} onRemove={() => setItems(items.filter((x) => x.id !== n.id))} />
            </div>
            <p className="desc">{n.desc}</p>
            <div className="kv">
              <span><b>Motivation:</b> {n.motivation}</span>
              <span><b>Relation to party:</b> {n.relation}</span>
            </div>
            <div className="kv">
              <span><b>Faction:</b> {n.faction}</span>
              <span><b>Sessions:</b> {n.sessions}</span>
            </div>
          </div>
        ))}
      </div>
      {modal && <NpcModal mode={modal.mode} item={modal.item} onSave={save} onClose={() => setModal(null)} />}
    </EntityPage>
  );
}

function NpcModal({ mode, item, onSave, onClose }) {
  const [d, setD] = useEN({ name: "", desc: "", status: "Active", motivation: "", relation: "", faction: "", sessions: "—", ...item });
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  return (
    <Modal
      title={mode === "add" ? "New NPC" : "Edit NPC"} onClose={onClose}
      footer={<>
        <button className="ll-btn" onClick={onClose}>Cancel</button>
        <button className="ll-btn primary" onClick={() => d.name && onSave(d)}>{mode === "add" ? "Add NPC" : "Save changes"}</button>
      </>}
    >
      <Field label="Name"><input className="ll-input" value={d.name} onChange={set("name")} autoFocus /></Field>
      <Field label="Description"><textarea className="ll-textarea" rows={2} style={{ fontFamily: "inherit", fontSize: "14px" }} value={d.desc} onChange={set("desc")} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Current status">
          <select className="ll-select" value={d.status} onChange={set("status")}>
            {["Active", "Scheming", "Anxious", "Threat"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Related faction"><input className="ll-input" value={d.faction} onChange={set("faction")} placeholder="—" /></Field>
      </div>
      <Field label="Motivation"><input className="ll-input" value={d.motivation} onChange={set("motivation")} /></Field>
      <Field label="Relation to the party"><input className="ll-input" value={d.relation} onChange={set("relation")} /></Field>
    </Modal>
  );
}

/* ── Factions ── */
function FactionsView({ id }) {
  const base = `/campaigns/${id}`;
  const [items, setItems] = useEN(window.LLD.factions);
  const [modal, setModal] = useEN(null);
  const postures = ["Hostile", "Transactional", "Opportunistic", "Friendly", "Neutral"];

  const save = (item) => {
    if (modal.mode === "add") setItems([{ ...item, id: "f" + Date.now(), origin: "edited" }, ...items]);
    else setItems(items.map((f) => f.id === item.id ? { ...item, origin: "edited" } : f));
    setModal(null);
  };
  const setPosture = (fid, posture) => setItems(items.map((f) => f.id === fid ? { ...f, posture, origin: "edited" } : f));

  return (
    <EntityPage
      id={id} route={base + "/factions"} kicker="Campaign · Factions" title="Factions"
      subtitle={`${items.length} powers reacting to the party`}
      addLabel="+ New faction" onAdd={() => setModal({ mode: "add", item: { posture: "Neutral", origin: "edited" } })}
    >
      <div className="ll-paper" style={{ padding: "0 20px", marginTop: "20px" }}>
        {items.length === 0 ? (
          <EmptyState orn="⬡" title="No factions yet" action="+ Add a faction" onAction={() => setModal({ mode: "add", item: { posture: "Neutral" } })}>
            Guilds, cults, courts: anything that wants something. Add them and track how they react.
          </EmptyState>
        ) : items.map((f) => (
          <div className="ll-entity" key={f.id}>
            <div className="row1">
              <span className="name">{f.name}</span>
              <PostureSelect value={f.posture} onChange={(p) => setPosture(f.id, p)} options={postures} />
              <EntityTools origin={f.origin} onEdit={() => setModal({ mode: "edit", item: f })} onRemove={() => setItems(items.filter((x) => x.id !== f.id))} />
            </div>
            <p className="desc">{f.desc}</p>
            <div className="kv">
              <span><b>Objective:</b> {f.objective}</span>
              <span><b>Influence:</b> {f.influence}</span>
            </div>
            <div className="kv">
              <span><b>NPCs:</b> {f.npcs}</span>
              <span><b>Arcs:</b> {f.arcs}</span>
            </div>
            <div className="kv"><span><b>Last reaction:</b> {f.lastReaction}</span></div>
          </div>
        ))}
      </div>
      {modal && <FactionModal mode={modal.mode} item={modal.item} postures={postures} onSave={save} onClose={() => setModal(null)} />}
    </EntityPage>
  );
}

function PostureSelect({ value, onChange, options }) {
  const kind = value === "Hostile" ? "danger" : value === "Friendly" ? "good" : "accent";
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className={"ll-pill " + kind}
        style={{ appearance: "none", border: "none", cursor: "pointer", paddingRight: "20px", fontFamily: "inherit" }}
        title="Change posture"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <span style={{ position: "absolute", right: "7px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: "8px", opacity: 0.6 }}>▼</span>
    </span>
  );
}

function FactionModal({ mode, item, postures, onSave, onClose }) {
  const [d, setD] = useEN({ name: "", desc: "", posture: "Neutral", objective: "", influence: "", npcs: "—", arcs: "—", lastReaction: "—", ...item });
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  return (
    <Modal title={mode === "add" ? "New faction" : "Edit faction"} onClose={onClose}
      footer={<>
        <button className="ll-btn" onClick={onClose}>Cancel</button>
        <button className="ll-btn primary" onClick={() => d.name && onSave(d)}>{mode === "add" ? "Add faction" : "Save changes"}</button>
      </>}>
      <Field label="Name"><input className="ll-input" value={d.name} onChange={set("name")} autoFocus /></Field>
      <Field label="Description"><textarea className="ll-textarea" rows={2} style={{ fontFamily: "inherit", fontSize: "14px" }} value={d.desc} onChange={set("desc")} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Current posture">
          <select className="ll-select" value={d.posture} onChange={set("posture")}>{postures.map((p) => <option key={p}>{p}</option>)}</select>
        </Field>
        <Field label="Resources / influence"><input className="ll-input" value={d.influence} onChange={set("influence")} /></Field>
      </div>
      <Field label="Objective"><input className="ll-input" value={d.objective} onChange={set("objective")} /></Field>
      <Field label="Last known reaction"><input className="ll-input" value={d.lastReaction} onChange={set("lastReaction")} /></Field>
    </Modal>
  );
}

Object.assign(window, { NpcsView, FactionsView, EntityPage, FilterBar, EntityTools, PostureSelect });
