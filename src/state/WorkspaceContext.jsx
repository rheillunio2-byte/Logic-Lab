import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from "react";
import { createCircuit, validateCircuit, SCHEMA_VERSION } from "../engine/circuit.js";
import { EXAMPLES, getExample } from "../data/examples.js";
import { loadSettings, saveSettings, loadWorkspace, saveWorkspace, loadLibrary, saveLibrary, newId, clearAllData } from "../utils/storage.js";

const Ctx = createContext(null);
export const useWorkspace = () => useContext(Ctx);
const HISTORY_LIMIT = 100;

function starterCircuit() {
  const ex = getExample("and").circuit;
  return { ...ex, name: "Untitled circuit", components: ex.components.map(c => (c.name === "B" ? { ...c, props: { ...c.props, value: 1 } } : c)) };
}
function reducer(s, a) {
  switch (a.type) {
    case "set": return { circuit: a.circuit, past: a.history ? [...s.past, s.circuit].slice(-HISTORY_LIMIT) : s.past, future: a.history ? [] : s.future, dirty: true };
    case "undo": return s.past.length ? { circuit: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.circuit, ...s.future], dirty: true } : s;
    case "redo": return s.future.length ? { circuit: s.future[0], past: [...s.past, s.circuit], future: s.future.slice(1), dirty: true } : s;
    case "load": return { circuit: a.circuit, past: a.keepHistory ? [...s.past, s.circuit].slice(-HISTORY_LIMIT) : [], future: [], dirty: true };
    default: return s;
  }
}

export function WorkspaceProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);
  const [state, dispatch] = useReducer(reducer, null, () => ({ circuit: loadWorkspace() ?? starterCircuit(), past: [], future: [], dirty: false }));
  const [saveStatus, setSaveStatus] = useState({ state: "saved", at: Date.now(), error: "" });
  const [library, setLibrary] = useState(loadLibrary);
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  useEffect(() => { document.documentElement.dataset.theme = settings.theme; document.documentElement.dataset.motion = settings.reducedMotion ? "reduced" : "full"; saveSettings(settings); }, [settings]);
  const updateSettings = useCallback(patch => setSettings(s => ({ ...s, ...patch })), []);

  // Autosave (debounced) of the current workspace.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    if (!settings.autosave) { setSaveStatus(s => ({ ...s, state: "off" })); return undefined; }
    setSaveStatus(s => ({ ...s, state: "saving" }));
    const id = setTimeout(() => { const r = saveWorkspace(state.circuit); setSaveStatus(r.ok ? { state: "saved", at: Date.now(), error: "" } : { state: "error", at: Date.now(), error: r.error }); }, 500);
    return () => clearTimeout(id);
  }, [state.circuit, settings.autosave]);

  const toast = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t.slice(-3), { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), type === "error" ? 6000 : 3200);
  }, []);
  const dismissToast = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);
  const confirm = useCallback(opts => new Promise(resolve => setDialog({ ...opts, resolve })), []);
  const closeDialog = useCallback(result => { setDialog(d => { d?.resolve(result); return null; }); }, []);

  const setCircuit = useCallback((circuit, { history = true } = {}) => dispatch({ type: "set", circuit, history }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);
  const redo = useCallback(() => dispatch({ type: "redo" }), []);
  const loadCircuit = useCallback(circuit => dispatch({ type: "load", circuit, keepHistory: true }), []);
  const newCircuit = useCallback(() => dispatch({ type: "load", circuit: createCircuit(), keepHistory: true }), []);
  const rename = useCallback(name => dispatch({ type: "set", circuit: { ...state.circuit, name: name.slice(0, 60) || "Untitled circuit" }, history: false }), [state.circuit]);

  // ---- library ----
  const persistLibrary = useCallback(list => { const r = saveLibrary(list); if (!r.ok) toast(`Could not save: ${r.error}`, "error"); else setLibrary(list); return r.ok; }, [toast]);
  const saveToLibrary = useCallback((name, circuit = state.circuit) => {
    const clean = { ...circuit, name: name || circuit.name };
    const existing = library.find(e => e.name === clean.name);
    const entry = { id: existing?.id ?? newId(), name: clean.name, updatedAt: Date.now(), circuit: clean };
    const ok = persistLibrary(existing ? library.map(e => (e.id === existing.id ? entry : e)) : [entry, ...library]);
    if (ok) toast(existing ? `Updated “${clean.name}” in the library` : `Saved “${clean.name}” to the library`, "success");
    return ok;
  }, [library, state.circuit, persistLibrary, toast]);
  const libraryApi = {
    list: library, save: saveToLibrary,
    remove: id => persistLibrary(library.filter(e => e.id !== id)),
    rename: (id, name) => persistLibrary(library.map(e => (e.id === id ? { ...e, name: name.slice(0, 60) || e.name, circuit: { ...e.circuit, name: name.slice(0, 60) || e.name }, updatedAt: Date.now() } : e))),
    duplicate: id => { const e = library.find(x => x.id === id); if (!e) return false; const name = `${e.name} copy`; return persistLibrary([{ ...e, id: newId(), name, circuit: { ...e.circuit, name }, updatedAt: Date.now() }, ...library]); },
    add: circuit => { const entry = { id: newId(), name: circuit.name, updatedAt: Date.now(), circuit }; return persistLibrary([entry, ...library]); },
  };
  const resetEverything = useCallback(() => { clearAllData(); setLibrary([]); dispatch({ type: "load", circuit: starterCircuit(), keepHistory: false }); setSettings(loadSettings()); }, []);

  const value = { circuit: state.circuit, setCircuit, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0, loadCircuit, newCircuit, rename,
    saveStatus, settings, updateSettings, toast, toasts, dismissToast, confirm, dialog, closeDialog, library: libraryApi, resetEverything, examples: EXAMPLES, validateCircuit, SCHEMA_VERSION };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
