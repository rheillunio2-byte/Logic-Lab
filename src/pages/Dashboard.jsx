import React from "react";
import { GitBranch, BookOpen, Trophy, Sigma, Table2, LayoutGrid } from "lucide-react";
import { useWorkspace } from "../state/WorkspaceContext.jsx";
import { navigate } from "../hooks/useHashRoute.js";

const TOOLS = [["builder", "Circuit Builder", "Drag, wire and simulate circuits.", GitBranch], ["truth-table", "Truth Table", "Tables for your circuit.", Table2], ["boolean", "Boolean Algebra", "Parse and simplify expressions.", Sigma], ["karnaugh", "Karnaugh Map", "Minimise with Gray-code maps.", LayoutGrid], ["learn", "Learning Center", "14 lessons with quizzes.", BookOpen], ["challenges", "Challenges", "Graded by simulation.", Trophy]];
export default function Dashboard() {
  const { circuit, library, examples, loadCircuit, newCircuit, toast } = useWorkspace();
  const openEx = x => { loadCircuit(x.circuit); toast(`Loaded “${x.title}”`, "success"); navigate("builder"); };
  return <div className="page"><div className="hero"><div><span className="eyebrow">DIGITAL LOGIC STUDIO</span><h1>Build, simulate and understand digital logic.</h1><p>Wire gates and flip-flops, watch signals propagate, then check your understanding with lessons and challenges.</p>
    <div className="btn-row"><button className="btn primary" onClick={() => navigate("builder")}>Continue “{circuit.name}”</button><button className="btn" onClick={() => { newCircuit(); navigate("builder"); }}>New circuit</button></div></div>
    <dl className="stats big"><div><dt>Components</dt><dd>{circuit.components.length}</dd></div><div><dt>Wires</dt><dd>{circuit.wires.length}</dd></div><div><dt>Saved circuits</dt><dd>{library.list.length}</dd></div></dl></div>
    <section><h2>Tools</h2><div className="card-grid">{TOOLS.map(([id, t, d, Icon]) => <a className="card" href={`#/${id}`} key={id}><Icon size={20} /><b>{t}</b><span className="muted small">{d}</span></a>)}</div></section>
    <section><h2>Start from an example</h2><div className="card-grid">{examples.slice(0, 6).map(x => <button className="card" key={x.id} onClick={() => openEx(x)}><b>{x.title}</b><span className="muted small">{x.description}</span></button>)}</div><p><a href="#/library">See all examples and saved circuits →</a></p></section></div>;
}
