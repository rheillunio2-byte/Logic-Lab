import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { COMPONENTS, inputPins, outputPins, sevenSegment, bitsToNumber } from "../../engine/components.js";
import { addComponent, connect, moveComponents } from "../../engine/circuit.js";
import { pinKey } from "../../engine/simulator.js";
import { GRID, sizeOf, pinPos, wirePath, snapTo } from "./geometry.js";

const sigClass = v => (v === 1 ? "hi" : v === 0 ? "lo" : "x");
const SYMBOL = { AND: "&", NAND: "&", OR: "≥1", NOR: "≥1", XOR: "=1", XNOR: "=1", NOT: "1", BUFFER: "1" };
const INVERTED = new Set(["NAND", "NOR", "XNOR", "NOT"]);
const MIN_ZOOM = 0.25, MAX_ZOOM = 2.5;

function Body({ c, w, h, inVal, outVal }) {
  const t = c.type, cx = w / 2, cy = h / 2;
  if (t === "SWITCH") { const on = c.props.value ? 1 : 0; return <><rect className="sw-track" x={14} y={cy - 9} width={36} height={18} rx={9} data-on={on} /><circle className="sw-knob" cx={on ? 41 : 23} cy={cy} r={7} /><text className="body-val" x={64} y={cy + 4}>{on}</text></>; }
  if (t === "HIGH" || t === "LOW") return <text className="body-big" x={cx} y={cy + 6} textAnchor="middle">{t === "HIGH" ? "1" : "0"}</text>;
  if (t === "CLOCK") { const v = outVal("CLK"); return <><path className="clk-icon" d={v ? "M16,30 L16,14 L36,14 L36,30 L50,30" : "M16,30 L30,30 L30,14 L50,14"} /><text className="body-val" x={66} y={cy + 4}>{v ?? "X"}</text></>; }
  if (t === "LED") { const v = inVal("IN"); return <><circle className={`led ${sigClass(v)}`} cx={cx + 4} cy={cy} r={12} /><text className="led-text" x={cx + 4} y={cy + 4} textAnchor="middle">{v ?? "X"}</text></>; }
  if (t === "BINOUT") { const bits = inputPins(c).map(p => inVal(p)), n = bitsToNumber(bits); return <><text className="body-big" x={cx} y={cy - 2} textAnchor="middle">{n ?? "X"}</text><text className="body-sub" x={cx} y={cy + 16} textAnchor="middle">{bits.length > 0 ? [...bits].reverse().map(b => b ?? "X").join("") : ""}</text></>; }
  if (t === "HEX") { const n = bitsToNumber(inputPins(c).map(p => inVal(p))); return <text className="body-hex" x={cx} y={cy + 18} textAnchor="middle">{n === null ? "X" : n.toString(16).toUpperCase()}</text>; }
  if (t === "SEG7") {
    const n = bitsToNumber(inputPins(c).map(p => inVal(p))), seg = n === null ? Array(7).fill(0) : sevenSegment(n);
    const P = { a: [34, 30, 48, 8], b: [84, 38, 8, 40], c: [84, 84, 8, 40], d: [34, 124, 48, 8], e: [26, 84, 8, 40], f: [26, 38, 8, 40], g: [34, 77, 48, 8] };
    const sx = (w - 116) / 2 + 0;
    return <g transform={`translate(${sx - 10},0) scale(.88) translate(0,2)`}>{"abcdefg".split("").map((k, i) => <rect key={k} className={`seg ${seg[i] ? "on" : ""}`} x={P[k][0]} y={P[k][1] - 4} width={P[k][2]} height={P[k][3]} rx={3} />)}{n === null && <text className="body-sub" x={58} y={150}>X</text>}</g>;
  }
  const def = COMPONENTS[t];
  if (def.kind === "latch" || def.kind === "edge") { const q = outVal("Q"); return <><text className="body-type" x={cx} y={cy - 4} textAnchor="middle">{def.label}</text><text className={`body-q ${sigClass(q)}`} x={cx} y={cy + 14} textAnchor="middle">Q = {q ?? "X"}</text></>; }
  if (SYMBOL[t]) return <><text className="body-big" x={cx} y={cy + 6} textAnchor="middle">{SYMBOL[t]}</text><text className="body-sub" x={cx} y={h - 8} textAnchor="middle">{t}</text></>;
  return <text className="body-type" x={cx} y={cy + 4} textAnchor="middle">{def.label}</text>;
}

export default function CircuitCanvas({ circuit, result, selection, setSelection, onChange, view, setView, snap, showValues, notify, svgRef, allowed }) {
  const [preview, setPreview] = useState(null), [marquee, setMarquee] = useState(null), [pending, setPending] = useState(null);
  const act = useRef(null);
  const byId = useMemo(() => new Map(circuit.components.map(c => [c.id, c])), [circuit.components]);
  const comps = useMemo(() => (preview ? circuit.components.map(c => (preview[c.id] ? { ...c, ...preview[c.id] } : c)) : circuit.components), [circuit.components, preview]);
  const cById = useMemo(() => new Map(comps.map(c => [c.id, c])), [comps]);
  const wireTo = useMemo(() => new Map(circuit.wires.map(w => [pinKey(w.to.id, w.to.pin), w])), [circuit.wires]);
  const sig = result.sig;
  const outValOf = id => pin => sig.get(pinKey(id, pin)) ?? null;
  const inValOf = id => pin => { const w = wireTo.get(pinKey(id, pin)); return w ? sig.get(pinKey(w.from.id, w.from.pin)) ?? null : null; };

  const toWorld = useCallback(e => { const r = svgRef.current.getBoundingClientRect(); return { x: (e.clientX - r.left - view.x) / view.zoom, y: (e.clientY - r.top - view.y) / view.zoom }; }, [view, svgRef]);

  // Wheel zoom (needs a non-passive listener so the page does not scroll).
  useEffect(() => {
    const el = svgRef.current; if (!el) return undefined;
    const onWheel = e => {
      e.preventDefault();
      const r = el.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      setView(v => { const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * Math.exp(-e.deltaY * 0.0015))); const k = zoom / v.zoom; return { zoom, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k }; });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [svgRef, setView]);
  useEffect(() => { const esc = e => { if (e.key === "Escape") { setPending(null); act.current = null; setPreview(null); setMarquee(null); } }; window.addEventListener("keydown", esc); return () => window.removeEventListener("keydown", esc); }, []);

  const finishWire = (a, b) => {
    if (a.id === b.id && a.pin === b.pin && a.dir === b.dir) return;
    if (a.dir === b.dir) { notify(a.dir === "out" ? "Connect an output pin to an input pin (both are outputs)." : "Connect an output pin to an input pin (both are inputs).", "error"); return; }
    const [from, to] = a.dir === "out" ? [a, b] : [b, a];
    const r = connect(circuit, { id: from.id, pin: from.pin }, { id: to.id, pin: to.pin });
    if (!r.ok) notify(r.error, "error"); else onChange(r.circuit, { history: true });
  };
  const pinAt = e => { const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.("[data-kind='pin']"); return el ? { id: el.dataset.comp, pin: el.dataset.pin, dir: el.dataset.dir } : null; };

  const onPointerDown = e => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    svgRef.current.focus({ preventScroll: true });
    const el = e.target.closest?.("[data-kind]"), kind = el?.dataset.kind, w = toWorld(e);
    svgRef.current.setPointerCapture?.(e.pointerId);
    if (kind === "pin") {
      const p = { id: el.dataset.comp, pin: el.dataset.pin, dir: el.dataset.dir };
      if (pending) { finishWire(pending.from, p); setPending(null); act.current = null; return; }
      act.current = { kind: "wire", from: p, sx: e.clientX, sy: e.clientY, moved: false }; setPending({ from: p, x: w.x, y: w.y }); return;
    }
    if (kind === "wire") { setSelection({ ids: new Set(), wire: el.dataset.wire }); return; }
    if (kind === "comp") {
      const id = el.dataset.comp; let ids = new Set(selection.ids);
      if (e.shiftKey || e.ctrlKey || e.metaKey) { ids.has(id) ? ids.delete(id) : ids.add(id); setSelection({ ids, wire: null }); act.current = null; return; }
      if (!ids.has(id)) { ids = new Set([id]); setSelection({ ids, wire: null }); }
      const origins = {}; ids.forEach(i => { const c = byId.get(i); origins[i] = { x: c.x, y: c.y }; });
      act.current = { kind: "drag", id, ids: [...ids], origins, start: w, sx: e.clientX, sy: e.clientY, moved: false, wasMulti: ids.size > 1 }; return;
    }
    if (e.shiftKey) { act.current = { kind: "marquee", start: w }; setMarquee({ x: w.x, y: w.y, w: 0, h: 0 }); return; }
    act.current = { kind: "pan", sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
  };
  const onPointerMove = e => {
    const a = act.current, w = toWorld(e);
    if (!a) { if (pending) setPending(p => ({ ...p, x: w.x, y: w.y })); return; }
    const far = Math.hypot(e.clientX - a.sx, e.clientY - a.sy) > 4;
    if (a.kind === "pan") { if (far) a.moved = true; if (a.moved) setView(v => ({ ...v, x: a.vx + e.clientX - a.sx, y: a.vy + e.clientY - a.sy })); }
    else if (a.kind === "wire") { if (far) a.moved = true; setPending(p => ({ ...p, x: w.x, y: w.y })); }
    else if (a.kind === "drag") {
      if (far) a.moved = true;
      if (a.moved) { const dx = w.x - a.start.x, dy = w.y - a.start.y, pv = {}; a.ids.forEach(i => { pv[i] = { x: snapTo(a.origins[i].x + dx, snap), y: snapTo(a.origins[i].y + dy, snap) }; }); setPreview(pv); }
    } else if (a.kind === "marquee") setMarquee({ x: Math.min(a.start.x, w.x), y: Math.min(a.start.y, w.y), w: Math.abs(w.x - a.start.x), h: Math.abs(w.y - a.start.y) });
  };
  const onPointerUp = e => {
    const a = act.current; act.current = null;
    svgRef.current.releasePointerCapture?.(e.pointerId);
    if (!a) return;
    if (a.kind === "pan") { if (!a.moved) { setSelection({ ids: new Set(), wire: null }); setPending(null); } }
    else if (a.kind === "wire") {
      const p = pinAt(e);
      if (p && !(p.id === a.from.id && p.pin === a.from.pin && p.dir === a.from.dir)) { finishWire(a.from, p); setPending(null); }
      else if (!a.moved) { /* click mode: wait for a second click on a pin */ } else setPending(null);
    } else if (a.kind === "drag") {
      if (a.moved && preview) { onChange(moveComponents(circuit, preview), { history: true }); }
      else { const c = byId.get(a.id); if (a.wasMulti) setSelection({ ids: new Set([a.id]), wire: null }); if (c?.type === "SWITCH") onChange({ ...circuit, components: circuit.components.map(x => (x.id === c.id ? { ...x, props: { ...x.props, value: x.props.value ? 0 : 1 } } : x)) }, { history: false }); }
      setPreview(null);
    } else if (a.kind === "marquee") {
      const m = marquee; setMarquee(null);
      if (m && (m.w > 3 || m.h > 3)) setSelection({ ids: new Set(circuit.components.filter(c => { const { w, h } = sizeOf(c); return c.x < m.x + m.w && c.x + w > m.x && c.y < m.y + m.h && c.y + h > m.y; }).map(c => c.id)), wire: null });
    }
  };
  const onDrop = e => {
    e.preventDefault();
    const type = e.dataTransfer.getData("application/x-logiclab"); if (!COMPONENTS[type]) return;
    if (allowed && !allowed.has(type)) { notify(`${COMPONENTS[type].label} is not allowed in this challenge.`, "error"); return; }
    const w = toWorld(e), probe = { x: 0, y: 0, type, props: COMPONENTS[type].defaultProps }, { w: cw, h: ch } = sizeOf(probe);
    try { const r = addComponent(circuit, type, { x: snapTo(w.x - cw / 2, snap), y: snapTo(w.y - ch / 2, snap) }); onChange(r.circuit, { history: true }); setSelection({ ids: new Set([r.id]), wire: null }); } catch (err) { notify(err.message, "error"); }
  };

  const gz = GRID * view.zoom;
  return <svg ref={svgRef} className="canvas" tabIndex={0} role="application" aria-label="Circuit canvas. Drag components from the palette, then connect output pins to input pins."
    onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { act.current = null; setPreview(null); setMarquee(null); }}
    onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }} onDrop={onDrop}>
    <defs><pattern id="grid-dots" width={gz} height={gz} patternUnits="userSpaceOnUse" x={view.x % gz} y={view.y % gz}><circle cx={1} cy={1} r={Math.max(0.7, view.zoom * 0.9)} className="grid-dot" /></pattern></defs>
    <rect className="canvas-bg" width="100%" height="100%" fill="url(#grid-dots)" />
    <g transform={`translate(${view.x},${view.y}) scale(${view.zoom})`}>
      {circuit.wires.map(w => {
        const a = cById.get(w.from.id), b = cById.get(w.to.id); if (!a || !b) return null;
        const p1 = pinPos(a, "out", w.from.pin), p2 = pinPos(b, "in", w.to.pin), v = sig.get(pinKey(w.from.id, w.from.pin)) ?? null, d = wirePath(p1, p2), sel = selection.wire === w.id;
        return <g key={w.id}><path d={d} className="wire-hit" data-kind="wire" data-wire={w.id} /><path d={d} className={`wire ${sigClass(v)} ${sel ? "sel" : ""}`} />
          {showValues && <text className={`wire-val ${sigClass(v)}`} x={(p1.x + p2.x) / 2} y={(p1.y + p2.y) / 2 - 6} textAnchor="middle">{v ?? "X"}</text>}</g>;
      })}
      {comps.map(c => {
        const { w, h } = sizeOf(c), sel = selection.ids.has(c.id), ins = inputPins(c), outs = outputPins(c), inVal = inValOf(c.id), outVal = outValOf(c.id), multi = ins.length + outs.length > 2;
        return <g key={c.id} transform={`translate(${c.x},${c.y})`} className={`comp ${sel ? "sel" : ""} ${c.type === "SWITCH" ? "clickable" : ""}`}>
          <rect className="comp-body" data-kind="comp" data-comp={c.id} width={w} height={h} rx={8} />
          <g pointerEvents="none"><Body c={c} w={w} h={h} inVal={inVal} outVal={outVal} /></g>
          <text className="comp-name" x={w / 2} y={-6} textAnchor="middle" pointerEvents="none">{c.name}</text>
          {INVERTED.has(c.type) && <circle className="bubble" cx={w - 12} cy={h / 2} r={4} pointerEvents="none" />}
          {ins.map(p => { const pp = pinPos({ ...c, x: 0, y: 0 }, "in", p), v = inVal(p), conn = wireTo.has(pinKey(c.id, p)); return <g key={`i${p}`}><circle className={`pin ${sigClass(v)} ${conn ? "" : "open"}`} cx={pp.x} cy={pp.y} r={6} data-kind="pin" data-comp={c.id} data-pin={p} data-dir="in"><title>{`${c.name}.${p}${conn ? "" : " (not connected)"}`}</title></circle>{multi && <text className="pin-label" x={pp.x + 10} y={pp.y + 3} pointerEvents="none">{p}</text>}</g>; })}
          {outs.map(p => { const pp = pinPos({ ...c, x: 0, y: 0 }, "out", p), v = outVal(p); return <g key={`o${p}`}><circle className={`pin out ${sigClass(v)}`} cx={pp.x} cy={pp.y} r={6} data-kind="pin" data-comp={c.id} data-pin={p} data-dir="out"><title>{`${c.name}.${p} = ${v ?? "unknown"}`}</title></circle>{multi && <text className="pin-label end" x={pp.x - 10} y={pp.y + 3} textAnchor="end" pointerEvents="none">{p}</text>}</g>; })}
        </g>;
      })}
      {pending && (() => { const c = cById.get(pending.from.id); if (!c) return null; const p = pinPos(c, pending.from.dir, pending.from.pin), d = pending.from.dir === "out" ? wirePath(p, pending) : wirePath(pending, p); return <path d={d} className="wire pending" pointerEvents="none" />; })()}
      {marquee && <rect className="marquee" x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} pointerEvents="none" />}
    </g>
    {circuit.components.length === 0 && <g className="empty-canvas" pointerEvents="none"><text x="50%" y="46%" textAnchor="middle" className="empty-title">Empty canvas</text><text x="50%" y="46%" dy="26" textAnchor="middle" className="empty-sub">Drag components from the library, or click one to add it. Load an example from the Library.</text></g>}
  </svg>;
}
