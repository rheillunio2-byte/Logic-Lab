import React, { useMemo, useState } from "react";
import { CHALLENGES } from "../data/challenges.js";
import { createCircuit } from "../engine/circuit.js";
import { evaluateChallenge } from "../engine/challenges.js";
import { COMPONENTS } from "../engine/components.js";
import { useHistory } from "../hooks/useHistory.js";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import CircuitEditor from "../components/circuit/CircuitEditor.jsx";

const KEY = "logiclab.challenges.v1";
const load = () => { try { const p = JSON.parse(localStorage.getItem(KEY)); return p && typeof p === "object" ? p : {}; } catch { return {}; } };
const LEVELS = ["Beginner", "Intermediate", "Advanced"];

function Workspace({ ch, onSolved }) {
  const { settings, updateSettings, toast, confirm } = useWorkspace();
  const h = useHistory(createCircuit(ch.title));
  const [hints, setHints] = useState(0), [result, setResult] = useState(null);
  const allowed = useMemo(() => [...new Set(["SWITCH", "LED", "CLOCK", "HIGH", "LOW", ...ch.allowed])], [ch]);
  const check = () => { const r = evaluateChallenge(h.value, ch); setResult(r); if (r.passed) { onSolved(); toast(`Challenge solved: ${ch.title}`, "success"); } };
  return <>
    <section className="panel challenge-info"><div className="page-head tight"><div><span className="badge">{ch.level}</span><h2>{ch.title}</h2></div></div>
      <p><b>Objective:</b> {ch.objective}</p><p className="muted">{ch.details}</p>
      <p className="small"><b>Inputs:</b> {ch.inputs.join(", ") || "none"} · <b>Outputs:</b> {ch.outputs.join(", ")} · <b>Allowed:</b> {ch.allowed.map(t => COMPONENTS[t].label).join(", ")} + switches, LEDs, clock</p>
      <p className="muted small">Name your switches/LEDs after the inputs/outputs above (rename in the inspector), or create them in that order.</p>
      <div className="btn-row"><button className="btn primary" onClick={check}>Check my circuit</button><button className="btn" onClick={() => setHints(n => Math.min(ch.hints.length, n + 1))} disabled={hints >= ch.hints.length}>Show hint ({hints}/{ch.hints.length})</button></div>
      {hints > 0 && <ol className="hints">{ch.hints.slice(0, hints).map((t, i) => <li key={i}>{t}</li>)}</ol>}
      {result && <div className={`alert ${result.passed ? "ok" : "error"}`} role="status"><b>{result.passed ? "Correct!" : "Not yet."}</b><ul className="plain">{result.messages.map((m, i) => <li key={i}>{m}</li>)}</ul>{result.mapping && !result.passed && result.mapping.length > 0 && <p className="small muted">Mapping used: {result.mapping.join("; ")}</p>}</div>}</section>
    <div className="challenge-editor"><CircuitEditor circuit={h.value} onChange={h.set} undo={h.undo} redo={h.redo} canUndo={h.canUndo} canRedo={h.canRedo} settings={settings} updateSettings={updateSettings} notify={toast} confirm={confirm} allowedTypes={allowed} /></div></>;
}

export default function Challenges() {
  const [id, setId] = useState(null), [solved, setSolved] = useState(load);
  const ch = CHALLENGES.find(c => c.id === id);
  const markSolved = () => setSolved(s => { const n = { ...s, [id]: true }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  return <div className="page"><div className="page-head"><div><h1>Logic Challenges</h1><p>Build the circuit, then press “Check”. Solutions are graded by simulating every input combination (or a clocked test sequence), never by how the circuit looks. {Object.keys(solved).length} of {CHALLENGES.length} solved.</p></div></div>
    {!ch ? <>{LEVELS.map(level => <section key={level} className="panel"><h2>{level}</h2><div className="card-grid">{CHALLENGES.filter(c => c.level === level).map(c => <button key={c.id} className="card" onClick={() => setId(c.id)}><b>{c.title}</b><span className="muted small">{c.objective}</span>{solved[c.id] && <span className="badge ok">Solved ✓</span>}</button>)}</div></section>)}</>
      : <><button className="btn" onClick={() => setId(null)}>← All challenges</button><Workspace key={ch.id} ch={ch} onSolved={markSolved} /></>}</div>;
}
