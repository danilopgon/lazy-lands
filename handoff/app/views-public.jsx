// Lazy Lands — public views: Landing, Login, Register
const { useState: usePubState } = React;

function PublicTop() {
  return (
    <header className="ll-top">
      <Link to="/" className="ll-wordmark">Lazy <span>Lands</span></Link>
      <div className="ll-right">
        <Link to="/login" className="ll-linklike muted">Log in</Link>
        <button className="ll-btn primary" onClick={() => go("/register")}>Create account</button>
      </div>
    </header>
  );
}

/* Landing now lives in app/views-landing.jsx (Print Chronicle, punchy edition) */

/* ── Login ── */
function Login() {
  const [email, setEmail] = usePubState("");
  const [pw, setPw] = usePubState("");
  const [err, setErr] = usePubState(null);
  const [busy, setBusy] = usePubState(false);
  const submit = (e) => {
    e.preventDefault();
    setErr(null);
    if (!email || !pw) { setErr("Enter your email and password."); return; }
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (pw === "wrong") { setErr("Incorrect email or password. Check your credentials and try again."); }
      else go("/campaigns");
    }, 700);
  };
  return (
    <div>
      <PublicTop />
      <div className="ll-auth">
        <div className="ll-paper">
          <h2>Welcome back</h2>
          <p className="sub">Sign in to continue your chronicle.</p>
          {err && <div style={{ marginBottom: "14px" }}><ErrorNotice>{err}</ErrorNotice></div>}
          <form onSubmit={submit}>
            <Field label="Email">
              <input className="ll-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <input className={"ll-input" + (err && pw === "wrong" ? " invalid" : "")} type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
            </Field>
            <button className="ll-btn primary" type="submit" disabled={busy} style={{ width: "100%", marginTop: "4px" }}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p style={{ fontSize: "13px", color: "var(--ink-2)", textAlign: "center", margin: "16px 0 0" }}>
            New here? <Link to="/register" className="ll-linklike">Create an account</Link>
          </p>
        </div>
        <p style={{ textAlign: "center", marginTop: "16px" }}>
          <span className="ll-proto-hint">prototype: any password works · type "wrong" to see the error state</span>
        </p>
      </div>
    </div>
  );
}

/* ── Register ── */
function Register() {
  const [email, setEmail] = usePubState("");
  const [pw, setPw] = usePubState("");
  const [pw2, setPw2] = usePubState("");
  const [touched, setTouched] = usePubState(false);
  const [busy, setBusy] = usePubState(false);
  const pwShort = pw.length > 0 && pw.length < 8;
  const mismatch = pw2.length > 0 && pw !== pw2;
  const valid = email.includes("@") && pw.length >= 8 && pw === pw2;
  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    setTimeout(() => { setBusy(false); go("/campaigns/new"); }, 700);
  };
  return (
    <div>
      <PublicTop />
      <div className="ll-auth">
        <div className="ll-paper">
          <h2>Start your chronicle</h2>
          <p className="sub">An account keeps your campaigns, and their memories, in one place.</p>
          <form onSubmit={submit}>
            <Field label="Email" error={touched && !email.includes("@") ? "Enter a valid email address." : null}>
              <input className="ll-input" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" help={!pwShort ? "At least 8 characters." : null} error={pwShort ? "Password must be at least 8 characters." : null}>
              <input className={"ll-input" + (pwShort ? " invalid" : "")} type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
            </Field>
            <Field label="Confirm password" error={mismatch ? "Passwords don't match." : null}>
              <input className={"ll-input" + (mismatch ? " invalid" : "")} type="password" placeholder="••••••••" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </Field>
            <button className="ll-btn primary" type="submit" disabled={busy} style={{ width: "100%", marginTop: "4px" }}>
              {busy ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p style={{ fontSize: "13px", color: "var(--ink-2)", textAlign: "center", margin: "16px 0 0" }}>
            Already have one? <Link to="/login" className="ll-linklike">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Login, Register, PublicTop });
