import { COMPONENTS, inputPins, outputPins } from "../../engine/components.js";
export const GRID = 20, PIN_GAP = 24;
export const snapTo = (v, on) => (on ? Math.round(v / GRID) * GRID : Math.round(v));
export function sizeOf(c) {
  const n = Math.max(inputPins(c).length, outputPins(c).length, 1);
  let w = 104, h = Math.max(56, n * PIN_GAP + 16);
  const kind = COMPONENTS[c.type].kind;
  if (["latch", "edge"].includes(kind) || ["MUX", "DEMUX", "DECODER", "ENCODER", "COMPARATOR", "HALF_ADDER", "FULL_ADDER"].includes(c.type)) w = 132;
  if (c.type === "SWITCH") { w = 84; h = 48; } else if (c.type === "HIGH" || c.type === "LOW") { w = 84; h = 40; }
  else if (c.type === "CLOCK") { w = 96; h = 48; } else if (c.type === "LED") { w = 76; h = 56; }
  else if (c.type === "BINOUT") { w = 140; } else if (c.type === "HEX") { w = 96; h = Math.max(h, 108); }
  else if (c.type === "SEG7") { w = 116; h = Math.max(h, 148); }
  return { w, h };
}
export function pinPos(c, dir, pin) {
  const list = dir === "in" ? inputPins(c) : outputPins(c), i = list.indexOf(pin), { w, h } = sizeOf(c);
  return { x: dir === "in" ? c.x : c.x + w, y: c.y + h / 2 + (i - (list.length - 1) / 2) * PIN_GAP };
}
export function bounds(components) {
  if (!components.length) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const c of components) { const { w, h } = sizeOf(c); x1 = Math.min(x1, c.x); y1 = Math.min(y1, c.y - 16); x2 = Math.max(x2, c.x + w); y2 = Math.max(y2, c.y + h); }
  return { x1, y1, x2, y2 };
}
export const wirePath = (a, b) => { const dx = Math.max(40, Math.abs(b.x - a.x) / 2); return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`; };
export function fitView(components, width, height, pad = 48) {
  const b = bounds(components);
  if (!b || width < 50 || height < 50) return { x: 40, y: 40, zoom: 1 };
  const zoom = Math.min(1.5, Math.max(0.25, Math.min((width - pad * 2) / (b.x2 - b.x1), (height - pad * 2) / (b.y2 - b.y1))));
  return { zoom, x: (width - (b.x2 - b.x1) * zoom) / 2 - b.x1 * zoom, y: (height - (b.y2 - b.y1) * zoom) / 2 - b.y1 * zoom };
}
