// Lazy Lands — shared UI: router helpers, shell, common components
const { useState, useEffect, useRef, useCallback } = React;

/* ── Hash router ── */
function parseHash() {
  const h = (window.location.hash || "#/").replace(/^#/, "");
  return h.startsWith("/") ? h : "/" + h;
}
function useRoute() {
  const [path, setPath] = useState(parseHash());
  useEffect(() => {
    const onHash = () => setPath(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return path;
}
function go(path) {
  window.location.hash = path;
  window.scrollTo(0, 0);
}
function Link({ to, className, children, onClick }) {
  return (
    <a
      className={className}
      href={"#" + to}
      onClick={(e) => { e.preventDefault(); if (onClick) onClick(); go(to); }}
    >{children}</a>
  );
}

/* ── Toast ── */
function useToast() {
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const show = useCallback((msg) => {
    setToast(msg);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  return [toast, show];
}
function Toast({ msg }) {
  if (!msg) return null;
  return <div className="ll-toast">{msg}</div>;
}

/* ── App shell (top nav for in-app routes) ── */
function Shell({ route, campaignId, children }) {
  const inCampaign = !!campaignId;
  const base = inCampaign ? `/campaigns/${campaignId}` : "";
  const navItems = inCampaign
    ? [
        { label: "Overview", to: base, match: (r) => r === base },
        { label: "NPCs", to: base + "/npcs", match: (r) => r.startsWith(base + "/npcs") },
        { label: "Factions", to: base + "/factions", match: (r) => r.startsWith(base + "/factions") },
        { label: "Arcs", to: base + "/arcs", match: (r) => r.startsWith(base + "/arcs") },
        { label: "Memory", to: base + "/memory/review", match: (r) => r.startsWith(base + "/memory") },
        { label: "Sessions", to: base + "/sessions/s8", match: (r) => r.startsWith(base + "/sessions") },
      ]
    : [{ label: "Campaigns", to: "/campaigns", match: (r) => r.startsWith("/campaigns") }];
  return (
    <div>
      <header className="ll-top">
        <Link to="/campaigns" className="ll-wordmark">Lazy <span>Lands</span></Link>
        <nav className="ll-topnav">
          {navItems.map((n) => (
            <Link key={n.label} to={n.to} className={n.match(route) ? "on" : ""}>{n.label}</Link>
          ))}
        </nav>
        <div className="ll-right">
          {inCampaign && (
            <Link to={base + "/settings"} className={"ll-linklike muted"} >Settings</Link>
          )}
          <div className="ll-avatar" title="dm@lazylands.app" onClick={() => go("/")}>{window.LLD.user.initials}</div>
        </div>
      </header>
      {children}
    </div>
  );
}

/* ── Small shared pieces ── */
function Kicker({ children }) { return <div className="ll-kicker">{children}</div>; }

function OriginBadge({ origin }) {
  return origin === "scribe"
    ? <span className="ll-origin scribe">✦ Scribe</span>
    : <span className="ll-origin edited">✎ Edited by you</span>;
}

function EmptyState({ orn = "❧", title, children, action, onAction }) {
  return (
    <div className="ll-empty">
      <span className="orn">{orn}</span>
      <h4>{title}</h4>
      <p>{children}</p>
      {action && <button className="ll-btn" onClick={onAction}>{action}</button>}
    </div>
  );
}

function Loading({ title, sub }) {
  return (
    <div className="ll-loading">
      <span className="ll-quill">✒</span>
      <h4><span className="ll-ellip">{title}</span></h4>
      <p>{sub}</p>
    </div>
  );
}

function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="ll-modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ll-modal">
        <div className="ll-modal-h">
          <h3>{title}</h3>
          <button className="ll-modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="ll-modal-body">{children}</div>
        {footer && <div className="ll-modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

function Field({ label, optional, help, error, children }) {
  return (
    <div className="ll-field">
      <label className="ll-label">{label} {optional && <span className="opt">· optional</span>}</label>
      {children}
      {help && !error && <span className="ll-help">{help}</span>}
      {error && <span className="ll-error-text">{error}</span>}
    </div>
  );
}

function ErrorNotice({ children, onRetry, retryLabel = "Try again" }) {
  return (
    <div className="ll-notice error" role="alert">
      <span className="orn">⚠</span>
      <span className="txt">{children}</span>
      {onRetry && <button className="ll-linklike" style={{ marginLeft: "auto", whiteSpace: "nowrap", color: "var(--danger)" }} onClick={onRetry}>{retryLabel}</button>}
    </div>
  );
}

function ScribeNotice({ children, action, onAction }) {
  return (
    <div className="ll-notice">
      <span className="orn">❧</span>
      <span className="txt">{children}</span>
      {action && <button className="ll-linklike" style={{ marginLeft: "auto", whiteSpace: "nowrap" }} onClick={onAction}>{action}</button>}
    </div>
  );
}

Object.assign(window, {
  useRoute, go, Link, useToast, Toast, Shell,
  Kicker, OriginBadge, EmptyState, Loading, Modal, Field, ErrorNotice, ScribeNotice,
});
