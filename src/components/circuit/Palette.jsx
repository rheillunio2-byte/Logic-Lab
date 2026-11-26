import React, { useMemo, useState } from "react";
import { COMPONENTS, CATEGORIES } from "../../engine/components.js";

export default function Palette({ allowed, onAdd }) {
  const [q, setQ] = useState(""), [open, setOpen] = useState(() => new Set(["Logic gates", "Inputs", "Outputs"]));
  const groups = useMemo(() => CATEGORIES.map(cat => ({ cat, items: Object.values(COMPONENTS).filter(d => d.category === cat && (!allowed || allowed.has(d.type)) && (`${d.label} ${d.type} ${d.description}`).toLowerCase().includes(q.toLowerCase())) })).filter(g => g.items.length), [allowed, q]);
  const toggle = cat => setOpen(s => { const n = new Set(s); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  return <aside className="palette" aria-label="Component library">
    <div className="panel-title">Components</div>
    <input className="input" type="search" placeholder="Search components…" aria-label="Search components" value={q} onChange={e => setQ(e.target.value)} />
    <div className="palette-scroll">
      {groups.map(({ cat, items }) => { const expanded = q || open.has(cat); return <section key={cat}>
        <button className="palette-cat" aria-expanded={!!expanded} onClick={() => toggle(cat)}><span>{cat}</span><span className="chev">{expanded ? "−" : "+"}</span></button>
        {expanded && <div className="palette-items">{items.map(d => <button key={d.type} className="palette-item" draggable title={`${d.label}: ${d.description}`}
          onDragStart={e => { e.dataTransfer.setData("application/x-logiclab", d.type); e.dataTransfer.effectAllowed = "copy"; }} onClick={() => onAdd(d.type)}>
          <b>{d.label}</b><small>{d.symbol ?? d.type}</small></button>)}</div>}
      </section>; })}
      {!groups.length && <div className="empty-note">No component matches “{q}”.</div>}
    </div>
    <p className="palette-hint">Drag onto the canvas, or click to add. Drag from an output pin (right) to an input pin (left) to wire.</p>
  </aside>;
}
