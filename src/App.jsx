import React, { Suspense, lazy, useEffect, useState } from "react";
import { WorkspaceProvider, useWorkspace } from "./state/WorkspaceContext.jsx";
import { useHashRoute, navigate } from "./hooks/useHashRoute.js";
import { Sidebar, TopBar } from "./components/layout/Layout.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import { Toasts, ConfirmDialog, Spinner } from "./components/common/Overlays.jsx";
import { parseShared } from "./utils/share.js";

const pages = {
  dashboard: lazy(() => import("./pages/Dashboard.jsx")), builder: lazy(() => import("./pages/CircuitBuilder.jsx")), "truth-table": lazy(() => import("./pages/TruthTable.jsx")),
  boolean: lazy(() => import("./pages/BooleanAlgebra.jsx")), karnaugh: lazy(() => import("./pages/KarnaughMap.jsx")), learn: lazy(() => import("./pages/LearningCenter.jsx")),
  challenges: lazy(() => import("./pages/Challenges.jsx")), library: lazy(() => import("./pages/CircuitLibrary.jsx")), settings: lazy(() => import("./pages/Settings.jsx")), about: lazy(() => import("./pages/About.jsx")),
};

function Shell() {
  const { route, params } = useHashRoute(), [nav, setNav] = useState(false), { loadCircuit, confirm, toast } = useWorkspace();
  const Page = pages[route];
  // Shared link: #/builder?c=… is validated and only opened after confirmation.
  const code = route === "builder" ? params.get("c") : null;
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      const r = parseShared(code);
      if (cancelled) return;
      if (!r.ok) { toast(`Shared circuit could not be opened: ${r.errors[0]}`, "error"); navigate("builder"); return; }
      const yes = await confirm({ title: `Open shared circuit “${r.circuit.name}”?`, message: `It has ${r.circuit.components.length} components. It replaces the circuit on the canvas (you can undo).`, confirmLabel: "Open" });
      if (yes) loadCircuit(r.circuit);
      navigate("builder");
    })();
    return () => { cancelled = true; };
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="app">
    <a className="skip" href="#main">Skip to content</a>
    <Sidebar route={route} open={nav} onClose={() => setNav(false)} />
    <div className="main"><TopBar route={route} onMenu={() => setNav(true)} />
      <main id="main" tabIndex={-1}><ErrorBoundary resetKey={route}><Suspense fallback={<Spinner />}><Page /></Suspense></ErrorBoundary></main></div>
    <Toasts /><ConfirmDialog /></div>;
}
export default function App() { return <WorkspaceProvider><Shell /></WorkspaceProvider>; }
