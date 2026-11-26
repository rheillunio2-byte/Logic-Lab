import React, { useCallback, useEffect, useRef, useState } from "react";
import { Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Trash2, Copy, Keyboard, Eraser } from "lucide-react";
import { addComponent, removeComponents, duplicateComponents, removeWire, moveComponents } from "../../engine/circuit.js";
import { COMPONENTS } from "../../engine/components.js";
import { useSimulation } from "../../hooks/useSimulation.js";
import CircuitCanvas from "./CircuitCanvas.jsx";
import Palette from "./Palette.jsx";
import Inspector from "./Inspector.jsx";
import SimControls from "./SimControls.jsx";
import TimingDiagram from "./TimingDiagram.jsx";
import { fitView, snapTo, sizeOf, GRID } from "./geometry.js";

const SHORTCUTS = [["Delete / Backspace", "Delete selection"], ["Ctrl+A", "Select all"], ["Ctrl+Z / Ctrl+Y", "Undo / redo"], ["Ctrl+D", "Duplicate selection"], ["Arrow keys", "Nudge selection (Shift = ×5)"], ["+ / −", "Zoom in / out"], ["F", "Fit circuit to screen"], ["G", "Toggle grid snapping"], ["Shift + drag", "Box-select"], ["Drag background", "Pan"], ["Mouse wheel", "Zoom"], ["Esc", "Cancel wire / clear selection"]];

export default function CircuitEditor({ circuit, onChange, undo, redo, canUndo, canRedo, settings, updateSettings, notify, confirm, allowedTypes, showTiming = true }) {
  const svgRef = useRef(null), rootRef = useRef(null);
  const [view, setView] = useState({ x: 40, y: 40, zoom: 1 });
  const [selection, setSelection] = useState({ ids: new Set(), wire: null });
  const [help, setHelp] = useState(false);
  const sim = useSimulation(circuit);
  const allowed = allowedTypes ? new Set(allowedTypes) : null;

  const fit = useCallback(() => { const r = svgRef.current?.getBoundingClientRect(); if (r) setView(fitView(circuit.components, r.width, r.height)); }, [circuit.components]);
  useEffect(() => { const id = requestAnimationFrame(fit); return () => cancelAnimationFrame(id); /* fit once on mount */ // eslint-disable-line react-hooks/exhaustive-deps
  }, []);
  // Drop selections that no longer exist (after undo, delete, import…).
  useEffect(() => {
    const live = new Set(circuit.components.map(c => c.id));
    setSelection(s => { const ids = new Set([...s.ids].filter(i => live.has(i))), wire = s.wire && circuit.wires.some(w => w.id === s.wire) ? s.wire : null; return ids.size === s.ids.size && wire === s.wire ? s : { ids, wire }; });
  }, [circuit]);

  const zoomBy = f => { const r = svgRef.current.getBoundingClientRect(), mx = r.width / 2, my = r.height / 2; setView(v => { const zoom = Math.min(2.5, Math.max(0.25, v.zoom * f)), k = zoom / v.zoom; return { zoom, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k }; }); };
  const addAtCenter = type => {
    if (allowed && !allowed.has(type)) { notify(`${COMPONENTS[type].label} is not allowed here.`, "error"); return; }
    const r = svgRef.current.getBoundingClientRect(), n = circuit.components.length % 6, { w, h } = sizeOf({ type, x: 0, y: 0, props: COMPONENTS[type].defaultProps });
    const x = snapTo((r.width / 2 - view.x) / view.zoom - w / 2 + n * GRID, settings.snap), y = snapTo((r.height / 2 - view.y) / view.zoom - h / 2 + n * GRID, settings.snap);
    try { const res = addComponent(circuit, type, { x, y }); onChange(res.circuit, { history: true }); setSelection({ ids: new Set([res.id]), wire: null }); } catch (e) { notify(e.message, "error"); }
  };
  const del = () => {
    if (selection.wire) { onChange(removeWire(circuit, selection.wire), { history: true }); return; }
    if (selection.ids.size) { onChange(removeComponents(circuit, [...selection.ids]), { history: true }); }
  };
  const dup = () => { if (!selection.ids.size) return; const r = duplicateComponents(circuit, [...selection.ids], { x: 40, y: 40 }); onChange(r.circuit, { history: true }); setSelection({ ids: new Set(r.newIds), wire: null }); };
  const clear = async () => { if (!circuit.components.length) return; if (await confirm({ title: "Clear circuit?", message: "All components and wires will be removed. You can undo this with Ctrl+Z.", confirmLabel: "Clear circuit", danger: true })) { onChange({ ...circuit, components: [], wires: [] }, { history: true }); setSelection({ ids: new Set(), wire: null }); } };

  const onKeyDown = e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (k === "delete" || k === "backspace") { e.preventDefault(); del(); }
    else if (mod && k === "a") { e.preventDefault(); setSelection({ ids: new Set(circuit.components.map(c => c.id)), wire: null }); }
    else if (mod && k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && k === "y") { e.preventDefault(); redo(); }
    else if (mod && k === "d") { e.preventDefault(); dup(); }
    else if (!mod && (k === "+" || k === "=")) zoomBy(1.2);
    else if (!mod && (k === "-" || k === "_")) zoomBy(1 / 1.2);
    else if (!mod && k === "f") fit();
    else if (!mod && k === "g") updateSettings({ snap: !settings.snap });
    else if (k.startsWith("arrow") && selection.ids.size) {
      e.preventDefault(); const s = (e.shiftKey ? 5 : 1) * GRID, d = { arrowleft: [-s, 0], arrowright: [s, 0], arrowup: [0, -s], arrowdown: [0, s] }[k], pos = {};
      circuit.components.forEach(c => { if (selection.ids.has(c.id)) pos[c.id] = { x: c.x + d[0], y: c.y + d[1] }; });
      onChange(moveComponents(circuit, pos), { history: true });
    }
  };
  const count = selection.ids.size;
  return <div className="editor" ref={rootRef} onKeyDown={onKeyDown}>
    <Palette allowed={allowed} onAdd={addAtCenter} />
    <section className="stage">
      <div className="toolbar" role="toolbar" aria-label="Canvas tools">
        <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo"><Undo2 size={16} /></button>
        <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)" aria-label="Redo"><Redo2 size={16} /></button>
        <span className="sep" />
        <button className="icon-btn" onClick={() => zoomBy(1 / 1.2)} title="Zoom out (−)" aria-label="Zoom out"><ZoomOut size={16} /></button>
        <span className="zoom-label" aria-live="polite">{Math.round(view.zoom * 100)}%</span>
        <button className="icon-btn" onClick={() => zoomBy(1.2)} title="Zoom in (+)" aria-label="Zoom in"><ZoomIn size={16} /></button>
        <button className="icon-btn" onClick={fit} title="Fit circuit to screen (F)" aria-label="Fit to screen"><Maximize size={16} /></button>
        <span className="sep" />
        <label className="check" title="Snap to grid (G)"><input type="checkbox" checked={settings.snap} onChange={e => updateSettings({ snap: e.target.checked })} /> Snap</label>
        <label className="check" title="Show signal values on wires"><input type="checkbox" checked={settings.wireValues} onChange={e => updateSettings({ wireValues: e.target.checked })} /> Values</label>
        <span className="sep" />
        <button className="icon-btn" onClick={() => setSelection({ ids: new Set(circuit.components.map(c => c.id)), wire: null })} disabled={!circuit.components.length} title="Select all (Ctrl+A)" aria-label="Select all"><span className="txt-icon">All</span></button>
        <button className="icon-btn" onClick={dup} disabled={!count} title="Duplicate (Ctrl+D)" aria-label="Duplicate selection"><Copy size={16} /></button>
        <button className="icon-btn" onClick={del} disabled={!count && !selection.wire} title="Delete (Del)" aria-label="Delete selection"><Trash2 size={16} /></button>
        <button className="icon-btn" onClick={clear} disabled={!circuit.components.length} title="Clear circuit" aria-label="Clear circuit"><Eraser size={16} /></button>
        <span className="grow" />
        <button className="icon-btn" onClick={() => setHelp(h => !h)} title="Keyboard shortcuts" aria-label="Keyboard shortcuts" aria-expanded={help}><Keyboard size={16} /></button>
      </div>
      {help && <div className="shortcuts" role="dialog" aria-label="Keyboard shortcuts"><dl>{SHORTCUTS.map(([k, d]) => <React.Fragment key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></React.Fragment>)}</dl></div>}
      <div className="canvas-wrap"><CircuitCanvas circuit={circuit} result={sim.result} selection={selection} setSelection={setSelection} onChange={onChange} view={view} setView={setView} snap={settings.snap} showValues={settings.wireValues} notify={notify} svgRef={svgRef} allowed={allowed} /></div>
      <SimControls sim={sim} circuit={circuit} />
      {showTiming && <TimingDiagram trace={sim.trace} onClear={sim.clearTrace} />}
    </section>
    <aside className="side-panel"><Inspector circuit={circuit} selection={selection} result={sim.result} onChange={onChange} onDelete={del} onDuplicate={dup} /></aside>
  </div>;
}
