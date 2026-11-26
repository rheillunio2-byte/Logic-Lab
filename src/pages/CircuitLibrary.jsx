import React, { useRef, useState } from "react";
import { Download, Upload, Copy, Trash2, Pencil, FolderOpen, Plus } from "lucide-react";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import { exportCircuit, importCircuitJson } from "../engine/circuit.js";
import { downloadFile, safeFilename, readFileText } from "../utils/download.js";
import { navigate } from "../hooks/useHashRoute.js";
import { PromptDialog, EmptyState } from "../components/common/Overlays.jsx";

export default function CircuitLibrary() {
  const { library, circuit, loadCircuit, newCircuit, toast, confirm, examples } = useWorkspace();
  const [prompt, setPrompt] = useState(null), fileRef = useRef(null), [importErrors, setImportErrors] = useState([]);
  const open = (c, label) => { loadCircuit(c); toast(`Opened “${label}”`, "success"); navigate("builder"); };
  const onFile = async e => {
    const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
    if (file.size > 2_000_000) { setImportErrors(["File is larger than 2 MB."]); return; }
    try { const r = importCircuitJson(await readFileText(file)); if (!r.ok) { setImportErrors(r.errors); return; } setImportErrors([]); if (library.add(r.circuit)) toast(`Imported “${r.circuit.name}” into the library`, "success"); } catch (err) { setImportErrors([err.message]); }
  };
  const remove = async e => { if (await confirm({ title: `Delete “${e.name}”?`, message: "This removes the saved circuit from this browser. It cannot be undone.", confirmLabel: "Delete", danger: true })) library.remove(e.id); };
  return <div className="page"><div className="page-head"><div><h1>Circuit Library</h1><p>Saved circuits live in this browser only. Export JSON files to back them up or share them; nothing is uploaded anywhere.</p></div>
    <div className="btn-row"><button className="btn" onClick={() => setPrompt({ kind: "save" })}><Plus size={15} /> Save current circuit</button><button className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Import JSON</button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onFile} /></div></div>
    {importErrors.length > 0 && <div className="alert error" role="alert"><b>Import failed.</b><ul className="plain">{importErrors.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
    <section className="panel"><h2>My circuits</h2>
      {library.list.length === 0 ? <EmptyState title="No saved circuits yet" action={<button className="btn primary" onClick={() => setPrompt({ kind: "save" })}>Save the current circuit</button>}>Save what you are working on, or import a JSON file.</EmptyState>
        : <ul className="lib-list">{library.list.map(e => <li key={e.id}><div><b>{e.name}</b><span className="muted small">{e.circuit.components.length} components · {e.circuit.wires.length} wires · {new Date(e.updatedAt).toLocaleString()}</span></div>
          <div className="btn-row"><button className="btn small" onClick={() => open(e.circuit, e.name)}><FolderOpen size={14} /> Open</button><button className="btn small" onClick={() => setPrompt({ kind: "rename", e })}><Pencil size={14} /> Rename</button><button className="btn small" onClick={() => library.duplicate(e.id) && toast("Duplicated", "success")}><Copy size={14} /> Duplicate</button><button className="btn small" onClick={() => downloadFile(safeFilename(e.name, "json"), exportCircuit(e.circuit))}><Download size={14} /> Export</button><button className="btn small danger" onClick={() => remove(e)}><Trash2 size={14} /> Delete</button></div></li>)}</ul>}
      <p className="muted small">Current workspace: <b>{circuit.name}</b> (autosaved separately and restored when you return).</p><button className="btn small" onClick={async () => { if (await confirm({ title: "Start a new circuit?", message: "The canvas will be emptied. You can undo this from the toolbar.", confirmLabel: "New circuit" })) { newCircuit(); navigate("builder"); } }}>New blank circuit</button></section>
    <section className="panel"><h2>Example circuits</h2><div className="card-grid">{examples.map(x => <div className="card static" key={x.id}><b>{x.title}</b><span className="muted small">{x.description}</span><details><summary>How it works</summary><p className="small">{x.explanation}</p></details><button className="btn small primary" onClick={() => open(x.circuit, x.title)}>Load in builder</button></div>)}</div></section>
    {prompt?.kind === "save" && <PromptDialog title="Save to library" label="Circuit name" initial={circuit.name} onCancel={() => setPrompt(null)} onSubmit={n => { library.save(n); setPrompt(null); }} />}
    {prompt?.kind === "rename" && <PromptDialog title="Rename circuit" label="New name" initial={prompt.e.name} confirmLabel="Rename" onCancel={() => setPrompt(null)} onSubmit={n => { library.rename(prompt.e.id, n); setPrompt(null); }} />}</div>;
}
