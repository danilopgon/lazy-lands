// Lazy Lands — root app: router + theme/texture tweaks
const { useState: useAP, useEffect: useFXAP } = React;

function resolveView(path) {
  if (path === "/" || path === "") return <Landing />;
  if (path === "/login") return <Login />;
  if (path === "/register") return <Register />;
  if (path === "/campaigns") return <Dashboard />;
  if (path === "/campaigns/new") return <NewCampaign />;
  if (path === "/campaigns/new/review") return <ExtractionReview />;

  const m = path.match(/^\/campaigns\/([^/]+)(\/.*)?$/);
  if (m) {
    const id = m[1];
    const rest = m[2] || "";
    if (rest === "" || rest === "/") return <CampaignDetail id={id} />;
    if (rest === "/npcs") return <NpcsView id={id} />;
    if (rest === "/factions") return <FactionsView id={id} />;
    if (rest === "/arcs") return <ArcsView id={id} />;
    if (rest === "/sessions/new") return <LogSession id={id} />;
    if (rest === "/memory/review") return <MemoryReview id={id} />;
    if (rest === "/prepare") return <PrepareSession id={id} />;
    if (rest === "/settings") return <SettingsView id={id} />;
    const ex = rest.match(/^\/sessions\/([^/]+)\/export$/);
    if (ex) return <ExportView id={id} sessionId={ex[1]} />;
    const ss = rest.match(/^\/sessions\/([^/]+)$/);
    if (ss) return <GeneratedSession id={id} sessionId={ss[1]} />;
  }

  return (
    <div>
      <PublicTop />
      <div className="ll-page narrow">
        <EmptyState orn="✦" title="This page is off the map" action="← Back to your campaigns" onAction={() => go("/campaigns")}>
          The route "{path}" doesn't exist in this prototype.
        </EmptyState>
      </div>
    </div>
  );
}

function App() {
  const path = useRoute();
  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "theme": "light",
    "texture": 0.5,
    "motion": "full"
  }/*EDITMODE-END*/);

  useFXAP(() => {
    document.documentElement.setAttribute("data-theme", t.theme);
    document.documentElement.setAttribute("data-motion", t.motion);
    document.documentElement.style.setProperty("--tex-opacity", String(t.texture));
  }, [t.theme, t.texture, t.motion]);

  return (
    <>
      <div className="ll-view-enter" key={path} data-screen-label={path}>{resolveView(path)}</div>
      <TweaksPanel title="Tweaks">
        <TweakSection label="Appearance" />
        <TweakRadio
          label="Theme"
          value={t.theme}
          options={["light", "dark"]}
          onChange={(v) => setTweak("theme", v)}
        />
        <TweakSlider
          label="Paper texture"
          min={0} max={1} step={0.05}
          value={t.texture}
          onChange={(v) => setTweak("texture", v)}
        />
        <TweakSection label="Motion" />
        <TweakRadio
          label="Press &amp; ink"
          value={t.motion}
          options={["full", "subtle", "off"]}
          onChange={(v) => setTweak("motion", v)}
        />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
