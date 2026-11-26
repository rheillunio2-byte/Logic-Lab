// Circuit data model, connection rules and import validation. Pure functions, no React.
import { COMPONENTS, inputPins, outputPins, MAX_GATE_INPUTS } from "./components.js";

export const SCHEMA_VERSION = 1;
export const LIMITS = { components: 500, wires: 2000 };

export const createCircuit = (name = "Untitled circuit") => ({ schemaVersion: SCHEMA_VERSION, name, components: [], wires: [] });
export const findComponent = (circuit, id) => circuit.components.find(c => c.id === id);

const nextNumber = (items, prefix) =>
  items.reduce((m, it) => (it.id.startsWith(prefix) && /^\d+$/.test(it.id.slice(prefix.length)) ? Math.max(m, +it.id.slice(prefix.length)) : m), 0) + 1;
export const nextComponentId = circuit => `c${nextNumber(circuit.components, "c")}`;
const nextWireId = circuit => `w${nextNumber(circuit.wires, "w")}`;

export function defaultName(circuit, type) {
  const def = COMPONENTS[type];
  const taken = new Set(circuit.components.map(c => c.name));
  if (type === "SWITCH") { for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") if (!taken.has(ch)) return ch; }
  if (type === "LED") { if (!taken.has("Y")) return "Y"; }
  let n = circuit.components.filter(c => c.type === type).length + 1;
  while (taken.has(`${def.label} ${n}`)) n++;
  return `${def.label} ${n}`;
}

export function addComponent(circuit, type, pos = { x: 0, y: 0 }, props = {}, name) {
  if (!COMPONENTS[type]) throw new Error(`Unknown component type: ${type}`);
  if (circuit.components.length >= LIMITS.components) throw new Error(`Circuits are limited to ${LIMITS.components} components.`);
  const comp = { id: nextComponentId(circuit), type, name: name ?? defaultName(circuit, type), x: pos.x, y: pos.y, props: { ...COMPONENTS[type].defaultProps, ...props } };
  return { circuit: { ...circuit, components: [...circuit.components, comp] }, id: comp.id };
}

/** Patch name / position / props. Wires attached to pins that no longer exist are removed. */
export function updateComponent(circuit, id, patch) {
  const components = circuit.components.map(c => (c.id === id ? { ...c, ...patch, props: patch.props ? { ...c.props, ...patch.props } : c.props } : c));
  const next = { ...circuit, components };
  const comp = findComponent(next, id);
  const ins = new Set(inputPins(comp)), outs = new Set(outputPins(comp));
  const wires = next.wires.filter(w => (w.to.id !== id || ins.has(w.to.pin)) && (w.from.id !== id || outs.has(w.from.pin)));
  return { ...next, wires };
}

export function moveComponents(circuit, positions) {
  return { ...circuit, components: circuit.components.map(c => (positions[c.id] ? { ...c, ...positions[c.id] } : c)) };
}

export function removeComponents(circuit, ids) {
  const set = new Set(ids);
  return { ...circuit, components: circuit.components.filter(c => !set.has(c.id)), wires: circuit.wires.filter(w => !set.has(w.from.id) && !set.has(w.to.id)) };
}

export function duplicateComponents(circuit, ids, offset = { x: 40, y: 40 }) {
  const set = new Set(ids), map = {};
  let work = circuit;
  for (const c of circuit.components.filter(c => set.has(c.id))) {
    const r = addComponent(work, c.type, { x: c.x + offset.x, y: c.y + offset.y }, { ...c.props }, `${c.name} copy`);
    work = r.circuit; map[c.id] = r.id;
  }
  for (const w of circuit.wires) {
    if (map[w.from.id] && map[w.to.id]) work = { ...work, wires: [...work.wires, { id: nextWireId(work), from: { id: map[w.from.id], pin: w.from.pin }, to: { id: map[w.to.id], pin: w.to.pin } }] };
  }
  return { circuit: work, newIds: Object.values(map) };
}

/** Components that are purely combinational form the dependency graph. Sequential outputs come from state, so feedback through them is legal. */
export function findCombinationalCycle(circuit) {
  const comb = new Set(circuit.components.filter(c => COMPONENTS[c.type].kind === "comb").map(c => c.id));
  const adj = new Map([...comb].map(id => [id, []]));
  for (const w of circuit.wires) if (comb.has(w.from.id) && comb.has(w.to.id)) adj.get(w.from.id).push(w.to.id);
  const color = new Map(), stack = [];
  const name = id => findComponent(circuit, id)?.name ?? id;
  const dfs = id => {
    color.set(id, 1); stack.push(id);
    for (const nx of adj.get(id)) {
      if (color.get(nx) === 1) return [...stack.slice(stack.indexOf(nx)), nx].map(name);
      if (!color.get(nx)) { const r = dfs(nx); if (r) return r; }
    }
    stack.pop(); color.set(id, 2); return null;
  };
  for (const id of comb) if (!color.get(id)) { const r = dfs(id); if (r) return r; }
  return null;
}

/** Topological evaluation order of combinational components (throws on cycles). */
export function evaluationOrder(circuit) {
  const cycle = findCombinationalCycle(circuit);
  if (cycle) throw new Error(`Feedback loop detected: ${cycle.join(" → ")}. Break the loop with a latch or flip-flop.`);
  const comb = circuit.components.filter(c => COMPONENTS[c.type].kind === "comb");
  const ids = new Set(comb.map(c => c.id)), indeg = new Map(comb.map(c => [c.id, 0])), adj = new Map(comb.map(c => [c.id, []]));
  for (const w of circuit.wires) if (ids.has(w.from.id) && ids.has(w.to.id)) { adj.get(w.from.id).push(w.to.id); indeg.set(w.to.id, indeg.get(w.to.id) + 1); }
  const queue = comb.filter(c => indeg.get(c.id) === 0).map(c => c.id), order = [];
  while (queue.length) { const id = queue.shift(); order.push(id); for (const n of adj.get(id)) { indeg.set(n, indeg.get(n) - 1); if (indeg.get(n) === 0) queue.push(n); } }
  return order;
}

/** `from` must be an output pin and `to` an input pin. */
export function checkConnection(circuit, from, to) {
  const a = findComponent(circuit, from.id), b = findComponent(circuit, to.id);
  if (!a || !b) return { ok: false, error: "Both ends of a wire must be existing components." };
  if (!outputPins(a).includes(from.pin)) return { ok: false, error: `${a.name} has no output pin “${from.pin}”.` };
  if (!inputPins(b).includes(to.pin)) return { ok: false, error: `${b.name} has no input pin “${to.pin}”. Wires must end at an input pin.` };
  if (circuit.wires.some(w => w.to.id === to.id && w.to.pin === to.pin))
    return { ok: false, error: `Input ${b.name}.${to.pin} is already connected. Delete its wire first (one driver per input).` };
  if (circuit.wires.length >= LIMITS.wires) return { ok: false, error: `Circuits are limited to ${LIMITS.wires} wires.` };
  const trial = { ...circuit, wires: [...circuit.wires, { id: "trial", from, to }] };
  const cycle = findCombinationalCycle(trial);
  if (cycle) return { ok: false, error: `This wire would create a combinational feedback loop (${cycle.join(" → ")}). Route feedback through a latch or flip-flop.` };
  return { ok: true };
}

export function connect(circuit, from, to) {
  const check = checkConnection(circuit, from, to);
  if (!check.ok) return { ok: false, error: check.error, circuit };
  return { ok: true, circuit: { ...circuit, wires: [...circuit.wires, { id: nextWireId(circuit), from: { id: from.id, pin: from.pin }, to: { id: to.id, pin: to.pin } }] } };
}
export const removeWire = (circuit, id) => ({ ...circuit, wires: circuit.wires.filter(w => w.id !== id) });

// ---------- Import / export ----------
const RANGES = { inputCount: [2, MAX_GATE_INPUTS], bits: [1, 8], selectBits: [1, 2], value: [0, 1] };
function cleanProps(type, raw, errors, label) {
  const def = COMPONENTS[type], out = {};
  for (const [key, dflt] of Object.entries(def.defaultProps)) {
    let v = raw && typeof raw === "object" ? raw[key] : undefined;
    if (v === undefined) { out[key] = dflt; continue; }
    let [lo, hi] = RANGES[key] || [0, 1];
    if (type === "DECODER" && key === "bits") hi = 3;
    if (!Number.isInteger(v) || v < lo || v > hi) { errors.push(`${label}: property “${key}” must be an integer from ${lo} to ${hi}.`); out[key] = dflt; } else out[key] = v;
  }
  return out;
}

export function exportCircuit(circuit) {
  return JSON.stringify({ app: "LogicLab", ...circuit, schemaVersion: SCHEMA_VERSION }, null, 2);
}

/** Validates unknown data (e.g. a parsed JSON file) and returns a sanitised circuit. Never throws. */
export function validateCircuit(raw) {
  const errors = [], fail = () => ({ ok: false, errors: errors.slice(0, 12), circuit: null });
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) { errors.push("File does not contain a circuit object."); return fail(); }
  if (!Number.isInteger(raw.schemaVersion)) errors.push("Missing schemaVersion.");
  else if (raw.schemaVersion > SCHEMA_VERSION) errors.push(`Circuit uses schema version ${raw.schemaVersion}, newer than supported (${SCHEMA_VERSION}).`);
  else if (raw.schemaVersion < 1) errors.push("Invalid schemaVersion.");
  if (!Array.isArray(raw.components) || !Array.isArray(raw.wires)) errors.push("Circuit must contain “components” and “wires” arrays.");
  if (errors.length) return fail();
  if (raw.components.length > LIMITS.components) errors.push(`Too many components (limit ${LIMITS.components}).`);
  if (raw.wires.length > LIMITS.wires) errors.push(`Too many wires (limit ${LIMITS.wires}).`);
  if (errors.length) return fail();

  const ids = new Set(), components = [];
  raw.components.forEach((c, i) => {
    const label = `Component #${i + 1}`;
    if (!c || typeof c !== "object") return errors.push(`${label} is not an object.`);
    if (typeof c.id !== "string" || !/^[\w-]{1,32}$/.test(c.id)) return errors.push(`${label} has an invalid id.`);
    if (ids.has(c.id)) return errors.push(`${label}: duplicate id “${c.id}”.`);
    if (!Object.prototype.hasOwnProperty.call(COMPONENTS, c.type)) return errors.push(`${label}: unknown type “${String(c.type).slice(0, 20)}”.`);
    if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || Math.abs(c.x) > 1e5 || Math.abs(c.y) > 1e5) return errors.push(`${label}: invalid position.`);
    ids.add(c.id);
    components.push({ id: c.id, type: c.type, name: typeof c.name === "string" ? c.name.slice(0, 40) : COMPONENTS[c.type].label, x: c.x, y: c.y, props: cleanProps(c.type, c.props, errors, label) });
  });
  const wires = [], wireIds = new Set(), driven = new Set();
  const byId = new Map(components.map(c => [c.id, c]));
  raw.wires.forEach((w, i) => {
    const label = `Wire #${i + 1}`;
    if (!w || typeof w !== "object" || !w.from || !w.to) return errors.push(`${label} is malformed.`);
    const a = byId.get(w.from.id), b = byId.get(w.to.id);
    if (!a || !b) return errors.push(`${label} references a missing component.`);
    if (!outputPins(a).includes(w.from.pin)) return errors.push(`${label}: ${a.name} has no output “${w.from.pin}”.`);
    if (!inputPins(b).includes(w.to.pin)) return errors.push(`${label}: ${b.name} has no input “${w.to.pin}”.`);
    const key = `${b.id}.${w.to.pin}`;
    if (driven.has(key)) return errors.push(`${label}: input ${b.name}.${w.to.pin} has more than one driver.`);
    const id = typeof w.id === "string" && /^[\w-]{1,32}$/.test(w.id) && !wireIds.has(w.id) ? w.id : `w${i + 1}x`;
    driven.add(key); wireIds.add(id);
    wires.push({ id, from: { id: a.id, pin: w.from.pin }, to: { id: b.id, pin: w.to.pin } });
  });
  if (errors.length) return fail();
  const circuit = { schemaVersion: SCHEMA_VERSION, name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 60) : "Imported circuit", components, wires };
  const cycle = findCombinationalCycle(circuit);
  if (cycle) { errors.push(`Circuit contains a combinational feedback loop: ${cycle.join(" → ")}.`); return fail(); }
  return { ok: true, errors: [], circuit };
}

export function importCircuitJson(text) {
  let data;
  try { data = JSON.parse(text); } catch { return { ok: false, errors: ["File is not valid JSON."], circuit: null }; }
  return validateCircuit(data);
}
