// Lazy Lands — Campaign detail / overview
const { useState: useDT } = React;

function CampaignDetail({ id }) {
  const d = window.LLD;
  const c = d.campaigns.find((x) => x.id === id) || d.campaigns[0];
  const base = `/campaigns/${id}`;
  const [editingWorld, setEditingWorld] = useDT(false);
  const [world, setWorld] = useDT(d.worldState);
  const [draft, setDraft] = useDT(d.worldState);

  return (
    <Shell route={base} campaignId={id}>
      <div className="ll-page">
        <div className="ll-crumb" style={{ marginBottom: "14px" }}>
          <Link to="/campaigns">Campaigns</Link> / <b>{c.name}</b>
        </div>
        <div className="ll-headrow">
          <div>
            <Kicker>Campaign · {c.system} · {c.tone}</Kicker>
            <h1 className="ll-h1">{c.name}</h1>
            <div className="ll-sub">Seven sessions chronicled · Updated {c.updated}</div>
          </div>
          <div style={{ display: "flex", gap: "9px" }}>
            <button className="ll-btn" onClick={() => go(base + "/sessions/new")}>Log session</button>
            <button className="ll-btn accent" onClick={() => go(base + "/prepare")}>Prepare next session</button>
          </div>
        </div>

        <div className="ll-statbar">
          {d.metrics.map((m) => (
            <div className="ll-stat" key={m.label} onClick={() => {
              const map = { npcs: "/npcs", factions: "/factions", arcs: "/arcs", memory: "/memory/review", detail: "" };
              go(base + (map[m.to] ?? ""));
            }}>
              <span className="v">{m.value}</span><span className="l">{m.label}</span>
            </div>
          ))}
        </div>

        <div style={{ margin: "22px 0 0" }}>
          <ScribeNotice action="Review now →" onAction={() => go(base + "/memory/review")}>
            <b>The Scribe has 4 things worth remembering</b> from Session 7. None are canon until you say so.
          </ScribeNotice>
        </div>

        <div className="ll-cols">
          <div className="ll-colL">
            <div className="ll-secthead numbered">
              <span className="ll-sectnum">/01</span>
              <h3>The state of the world</h3>
              {!editingWorld && <button className="ll-linklike" onClick={() => { setDraft(world); setEditingWorld(true); }}>Edit</button>}
            </div>
            {editingWorld ? (
              <div>
                <textarea className="ll-textarea" rows={5} value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                  <button className="ll-btn small primary" onClick={() => { setWorld(draft); setEditingWorld(false); }}>Save changes</button>
                  <button className="ll-btn small" onClick={() => setEditingWorld(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="serif ll-dropcap" style={{ fontSize: "16.5px", lineHeight: 1.65, color: "var(--ink)", margin: 0 }}>{world}</p>
                <p style={{ fontSize: "12px", color: "var(--ink-3)", margin: "10px 0 0" }}>✎ As recorded by you, after Session 7</p>
              </>
            )}

            <hr className="ll-rule" />
            <div className="ll-secthead numbered">
              <span className="ll-sectnum">/02</span>
              <h3>Recent sessions</h3>
              <button className="ll-linklike" onClick={() => go(base + "/sessions/s8")}>The latest draft →</button>
            </div>
            {d.sessions.map((s) => (
              <div className="ll-dotrow clickable" key={s.id} onClick={() => go(base + "/sessions/" + (s.num === 8 ? "s8" : "s7"))}>
                <span className="serif" style={{ fontSize: "15px", fontWeight: 600, color: "var(--ink-3)", width: "38px", flexShrink: 0 }}>{s.numeral}</span>
                <div><div className="t">{s.title}</div><div className="m">{s.note}</div></div>
                <span className="d">{s.date}</span>
              </div>
            ))}
          </div>

          <div className="ll-colR">
            <div className="ll-secthead numbered">
              <span className="ll-sectnum">/03</span>
              <h3>Arcs needing attention</h3>
              <button className="ll-linklike" onClick={() => go(base + "/arcs")}>All arcs</button>
            </div>
            {d.arcs.slice(0, 3).map((a) => (
              <div className="ll-dotrow clickable" key={a.id} onClick={() => go(base + "/arcs")}>
                <div style={{ minWidth: 0 }}>
                  <div className="t" style={{ fontSize: "14px" }}>{a.title}</div>
                  <div className="m">{a.note}</div>
                </div>
                <span className={"ll-flag " + (a.status === "Dormant" ? "accent" : "muted")} style={{ marginLeft: "auto" }}>{a.status}</span>
              </div>
            ))}

            <hr className="ll-rule" />
            <div className="ll-secthead numbered">
              <span className="ll-sectnum">/04</span>
              <h3>Active memories</h3>
              <button className="ll-linklike" onClick={() => go(base + "/memory/review")}>All memory</button>
            </div>
            {d.memories.slice(0, 3).map((m) => (
              <div key={m.id} style={{ padding: "11px 0", borderBottom: "1px dotted var(--dotted)" }}>
                <span className="ll-flag accent">{m.type}</span>
                <p className="serif" style={{ margin: "3px 0 2px", fontSize: "14.5px", lineHeight: 1.5, color: "var(--ink)" }}>{m.text}</p>
                <span style={{ fontSize: "11.5px", color: "var(--ink-3)" }}>Accepted · {m.origin}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

Object.assign(window, { CampaignDetail });
