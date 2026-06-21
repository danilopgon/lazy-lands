// Lazy Lands — Arcs view
const { useState: useAR } = React;

function ArcsView({ id }) {
  const base = `/campaigns/${id}`;
  const [items, setItems] = useAR(window.LLD.arcs);
  const [filter, setFilter] = useAR("All");
  const [modal, setModal] = useAR(null);
  const statuses = ["All", "Active", "Dormant", "Resolved", "Discarded"];
  const shown = filter === "All" ? items : items.filter((a) => a.status === filter);

  const patch = (aid, p) => setItems(items.map((a) => a.id === aid ? { ...a, ...p } : a));
  const save = (item) => {
    if (modal.mode === "add") setItems([{ ...item, id: "a" + Date.now(), origin: "edited", include: true }, ...items]);
    else setItems(items.map((a) => a.id === item.id ? { ...item, origin: "edited" } : a));
    setModal(null);
  };

  const statusKind = (s) => s === "Active" ? "good" : s === "Dormant" ? "accent" : s === "Resolved" ? "muted" : "danger";

  return (
    <EntityPage
      id={id} route={base + "/arcs"} kicker="Campaign · Open arcs" title="Open arcs"
      subtitle={`${items.filter((a) => a.status === "Active" || a.status === "Dormant").length} threads still in play`}
      addLabel="+ New arc" onAdd={() => setModal({ mode: "add", item: { status: "Active", priority: "Medium", origin: "edited" } })}
      filters={<FilterBar options={statuses} active={filter} onChange={setFilter} />}
    >
      <div className="ll-paper" style={{ padding: "0 20px", marginTop: "12px" }}>
        {shown.length === 0 ? (
          <EmptyState orn="↝" title="No arcs here" action="+ Add an arc" onAction={() => setModal({ mode: "add", item: { status: "Active", priority: "Medium" } })}>
            Arcs are the threads your players are pulling on. Track them so none go quiet for too long.
          </EmptyState>
        ) : shown.map((a) => (
          <div className="ll-entity" key={a.id} style={{ opacity: a.status === "Discarded" || a.status === "Resolved" ? 0.62 : 1 }}>
            <div className="row1">
              <span className="name">{a.title}</span>
              <span className={"ll-pill " + statusKind(a.status)}>{a.status}</span>
              <span className={"ll-flag " + (a.priority === "High" ? "danger" : "muted")} style={{ alignSelf: "center" }}>{a.priority} priority</span>
              <EntityTools origin={a.origin} onEdit={() => setModal({ mode: "edit", item: a })} onRemove={() => setItems(items.filter((x) => x.id !== a.id))} />
            </div>
            <p className="desc">{a.desc}</p>
            <div className="kv">
              <span><b>NPCs:</b> {a.npcs}</span>
              <span><b>Factions:</b> {a.factions}</span>
              <span><b>Last session:</b> {a.lastSession}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "10px", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "12.5px", color: "var(--ink-2)", cursor: "pointer" }}>
                <input type="checkbox" checked={!!a.include} onChange={(e) => patch(a.id, { include: e.target.checked })} />
                Include in next session generation
              </label>
              <span style={{ flex: 1 }}></span>
              {a.status !== "Resolved" && <button className="ll-linklike" onClick={() => patch(a.id, { status: "Resolved" })}>Resolve</button>}
              {a.status !== "Discarded" && <button className="ll-linklike muted" onClick={() => patch(a.id, { status: "Discarded", include: false })}>Discard</button>}
              {(a.status === "Resolved" || a.status === "Discarded") && <button className="ll-linklike" onClick={() => patch(a.id, { status: "Active" })}>Reopen</button>}
            </div>
          </div>
        ))}
      </div>
      {modal && <ArcModal mode={modal.mode} item={modal.item} onSave={save} onClose={() => setModal(null)} />}
    </EntityPage>
  );
}

function ArcModal({ mode, item, onSave, onClose }) {
  const [d, setD] = useAR({ title: "", desc: "", priority: "Medium", status: "Active", npcs: "—", factions: "—", lastSession: "—", include: true, ...item });
  const set = (k) => (e) => setD({ ...d, [k]: e.target.value });
  return (
    <Modal title={mode === "add" ? "New arc" : "Edit arc"} onClose={onClose}
      footer={<>
        <button className="ll-btn" onClick={onClose}>Cancel</button>
        <button className="ll-btn primary" onClick={() => d.title && onSave(d)}>{mode === "add" ? "Add arc" : "Save changes"}</button>
      </>}>
      <Field label="Title"><input className="ll-input" value={d.title} onChange={set("title")} autoFocus /></Field>
      <Field label="Description"><textarea className="ll-textarea" rows={2} style={{ fontFamily: "inherit", fontSize: "14px" }} value={d.desc} onChange={set("desc")} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Field label="Priority">
          <select className="ll-select" value={d.priority} onChange={set("priority")}>{["High", "Medium", "Low"].map((p) => <option key={p}>{p}</option>)}</select>
        </Field>
        <Field label="Status">
          <select className="ll-select" value={d.status} onChange={set("status")}>{["Active", "Dormant", "Resolved", "Discarded"].map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
      </div>
      <Field label="Related NPCs"><input className="ll-input" value={d.npcs} onChange={set("npcs")} /></Field>
      <Field label="Related factions"><input className="ll-input" value={d.factions} onChange={set("factions")} /></Field>
    </Modal>
  );
}

Object.assign(window, { ArcsView });
