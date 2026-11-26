import React, { useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { COMPONENTS, inputPins, outputPins } from "../../engine/components.js";
import { updateComponent, removeWire, findComponent } from "../../engine/circuit.js";
import { pinKey } from "../../engine/simulator.js";

const val = v => (v === null || v === undefined ? "X" : v);
const cls = v => (v === 1 ? "hi" : v === 0 ? "lo" : "x");
function NameField({ value, onCommit }) {
  const [t, setT] = useState(value); useEffect(() => setT(value), [value]);
  const commit = () => { const n = t.trim().slice(0, 40); if (n && n !== value) onCommit(n); else setT(value); };
  return <input className="input" value={t} maxLength={40} aria-label="Component name" onChange={e => setT(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setT(value); e.currentTarget.blur(); } }} />;
}
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export default function Inspector({ circuit, selection, result, onChange, onDelete, onDuplicate }) {
  const ids = [...selection.ids];
  if (selection.wire) {
    const w = circuit.wires.find(x => x.id === selection.wire);
    if (w) { const a = findComponent(circuit, w.from.id), b = findComponent(circuit, w.to.id), v = result.sig.get(pinKey(w.from.id, w.from.pin)) ?? null;
      return <div className="inspector"><div className="panel-title">Wire</div><p className="muted">{a.name}.{w.from.pin} → {b.name}.{w.to.pin}</p><span className={`badge ${cls(v)}`}>{v === 1 ? "HIGH · 1" : v === 0 ? "LOW · 0" : "UNKNOWN"}</span>
        <button className="btn danger" onClick={() => onChange(removeWire(circuit, w.id), { history: true })}><Trash2 size={15} /> Delete wire</button></div>; }
  }
  if (ids.length > 1) return <div className="inspector"><div className="panel-title">{ids.length} components selected</div><p className="muted">Drag to move them together. Shift-click toggles selection.</p><div className="btn-row"><button className="btn" onClick={onDuplicate}><Copy size={15} /> Duplicate</button><button className="btn danger" onClick={onDelete}><Trash2 size={15} /> Delete</button></div></div>;
  const c = ids.length === 1 ? findComponent(circuit, ids[0]) : null;
  if (!c) {
    const warn = result.warnings.length;
    return <div className="inspector"><div className="panel-title">Properties</div><p className="muted">Select a component or wire to edit it.</p>
      <dl className="stats"><dt>Components</dt><dd>{circuit.components.length}</dd><dt>Wires</dt><dd>{circuit.wires.length}</dd><dt>Warnings</dt><dd>{warn}</dd></dl></div>;
  }
  const def = COMPONENTS[c.type], set = patch => onChange(updateComponent(circuit, c.id, patch), { history: true });
  const wireTo = pin => circuit.wires.find(w => w.to.id === c.id && w.to.pin === pin);
  const st = result.state?.[c.id];
  return <div className="inspector">
    <div className="panel-title">{def.label}</div><p className="muted small">{def.description}</p>
    <label className="field"><span>Name</span><NameField value={c.name} onCommit={name => set({ name })} /></label>
    {def.variableInputs && <label className="field"><span>Number of inputs</span><select className="input" value={c.props.inputCount} onChange={e => set({ props: { inputCount: +e.target.value } })}>{range(2, 8).map(n => <option key={n}>{n}</option>)}</select></label>}
    {def.variableBits && <label className="field"><span>{c.type === "DECODER" ? "Address bits" : "Bits"}</span><select className="input" value={c.props.bits} onChange={e => set({ props: { bits: +e.target.value } })}>{range(1, c.type === "DECODER" ? 3 : 8).map(n => <option key={n}>{n}</option>)}</select></label>}
    {def.variableSelect && <label className="field"><span>Select lines</span><select className="input" value={c.props.selectBits} onChange={e => set({ props: { selectBits: +e.target.value } })}>{[1, 2].map(n => <option key={n} value={n}>{n} ({2 ** n} {c.type === "MUX" ? "inputs" : "outputs"})</option>)}</select></label>}
    {c.type === "SWITCH" && <button className={`toggle-row ${c.props.value ? "on" : ""}`} aria-pressed={!!c.props.value} onClick={() => onChange(updateComponent(circuit, c.id, { props: { value: c.props.value ? 0 : 1 } }), { history: false })}><span>Output {c.props.value ? "HIGH (1)" : "LOW (0)"}</span><span className="switch"><i /></span></button>}
    {st && "q" in st && <div className="state-box"><span>Stored state Q</span><b className={cls(st.q)}>{val(st.q)}</b></div>}
    {(inputPins(c).length > 0 || outputPins(c).length > 0) && <table className="pin-table"><thead><tr><th>Pin</th><th>Source / target</th><th>Value</th></tr></thead><tbody>
      {inputPins(c).map(p => { const w = wireTo(p), src = w ? findComponent(circuit, w.from.id) : null, v = w ? result.sig.get(pinKey(w.from.id, w.from.pin)) ?? null : null, opt = def.optional && p in def.optional;
        return <tr key={`i${p}`}><td>{p}</td><td>{w ? <>{src.name}.{w.from.pin} <button className="link" onClick={() => onChange(removeWire(circuit, w.id), { history: true })}>disconnect</button></> : <span className="muted">{opt ? `not connected (default ${def.optional[p]})` : "not connected"}</span>}</td><td><span className={`badge ${w || opt ? cls(w ? v : def.optional[p]) : "x"}`}>{w ? val(v) : opt ? def.optional[p] : "X"}</span></td></tr>; })}
      {outputPins(c).map(p => { const v = result.sig.get(pinKey(c.id, p)) ?? null, n = circuit.wires.filter(w => w.from.id === c.id && w.from.pin === p).length; return <tr key={`o${p}`}><td>{p} <small>out</small></td><td className="muted">{n} wire{n === 1 ? "" : "s"}</td><td><span className={`badge ${cls(v)}`}>{val(v)}</span></td></tr>; })}
    </tbody></table>}
    <div className="btn-row"><button className="btn" onClick={onDuplicate}><Copy size={15} /> Duplicate</button><button className="btn danger" onClick={onDelete}><Trash2 size={15} /> Delete</button></div>
  </div>;
}
