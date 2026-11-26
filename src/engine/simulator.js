// Simulation engine: dependency-ordered evaluation, latch settling and rising-edge clocking.
// Signals: 0, 1, or null (unknown). State is immutable: every function returns a new state object.
import { COMPONENTS, inputPins, outputPins } from "./components.js";
import { evaluationOrder } from "./circuit.js";

export const MAX_SETTLE_ITERATIONS = 100;
const sameState = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const pinKey = (id, pin) => `${id}.${pin}`;

/** Power-on state: sequential elements start with Q = 0, clocks start LOW. */
export function createState(circuit) {
  const st = {};
  for (const c of circuit.components) {
    const def = COMPONENTS[c.type];
    if (def.kind === "latch" || def.kind === "edge") st[c.id] = { ...def.initState(), prev: undefined };
    else if (def.kind === "clock") st[c.id] = { level: 0 };
  }
  return st;
}

/** Reconcile a saved state with a (possibly edited) circuit: keep existing state, add new, drop removed. */
export function syncState(circuit, state = {}) {
  const fresh = createState(circuit), out = {};
  for (const id of Object.keys(fresh)) out[id] = state[id] && Object.keys(state[id]).every(k => k in fresh[id] || k === "prev") ? state[id] : fresh[id];
  return out;
}

/** Pure evaluation of all signals for the given state. Does not change state. */
export function evaluate(circuit, state) {
  const sig = new Map(), warnings = [], errors = [];
  let order;
  try { order = evaluationOrder(circuit); } catch (e) { return { sig, warnings, errors: [e.message] }; }
  const wireTo = new Map(circuit.wires.map(w => [pinKey(w.to.id, w.to.pin), w.from]));
  const byId = new Map(circuit.components.map(c => [c.id, c]));
  const readPins = c => {
    const def = COMPONENTS[c.type];
    return inputPins(c).map(pin => {
      const src = wireTo.get(pinKey(c.id, pin));
      if (src) { const v = sig.get(pinKey(src.id, src.pin)); return v === undefined ? null : v; }
      if (def.optional && pin in def.optional) return def.optional[pin];
      return null;
    });
  };
  const emit = (c, values) => outputPins(c).forEach((pin, i) => sig.set(pinKey(c.id, pin), values[i] ?? null));
  for (const c of circuit.components) {
    const def = COMPONENTS[c.type];
    if (def.kind === "source") emit(c, def.eval([], c.props));
    else if (def.kind === "clock") emit(c, def.eval([], c.props, state[c.id]));
    else if (def.kind === "latch" || def.kind === "edge") emit(c, def.out(state[c.id] ?? def.initState()));
  }
  for (const id of order) { const c = byId.get(id); emit(c, COMPONENTS[c.type].eval(readPins(c), c.props)); }
  // Warnings for unconnected required inputs
  for (const c of circuit.components) {
    const def = COMPONENTS[c.type];
    for (const pin of inputPins(c))
      if (!wireTo.has(pinKey(c.id, pin)) && !(def.optional && pin in def.optional)) warnings.push({ id: c.id, message: `${c.name}: input ${pin} is not connected (signal is unknown, not LOW).` });
    if (c.type === "SR_LATCH" && state[c.id]?.invalid) warnings.push({ id: c.id, message: `${c.name}: forbidden input S=R=1. The latch state is undefined after both are released.` });
  }
  // Provide input values for sequential/sink components for later use by callers.
  const inputsOf = c => readPins(c);
  return { sig, warnings, errors, inputsOf, byId };
}

/**
 * Settle the circuit: update level-sensitive latches, async resets and edge-triggered elements until nothing changes.
 * Edge-triggered flip-flops sample their inputs simultaneously (current state vs. next state).
 */
export function settle(circuit, state) {
  let st = { ...state };
  for (let iter = 0; iter < MAX_SETTLE_ITERATIONS; iter++) {
    const ev = evaluate(circuit, st);
    if (ev.errors.length) return { state: st, sig: ev.sig, warnings: ev.warnings, errors: ev.errors };
    let changed = false;
    const next = { ...st };
    for (const c of circuit.components) {
      const def = COMPONENTS[c.type];
      if (def.kind === "latch") {
        const upd = { ...next[c.id], ...def.update(ev.inputsOf(c), st[c.id]) };
        if (!sameState(upd, next[c.id])) { next[c.id] = upd; changed = true; }
      } else if (def.kind === "edge") {
        const ins = ev.inputsOf(c), pins = inputPins(c);
        const clk = ins[pins.indexOf(def.clockPin)], rst = pins.includes("RST") ? ins[pins.indexOf("RST")] : 0;
        const cur = st[c.id], prev = cur.prev;
        let upd = { ...cur };
        if (rst === 1) upd.q = 0;
        else if (prev === 0 && clk === 1) upd = { ...upd, ...def.next(ins.filter((_, i) => pins[i] !== def.clockPin && pins[i] !== "RST"), cur) };
        else if (rst === null) upd.q = cur.q === 0 ? 0 : null;
        upd.prev = clk;
        if (!sameState(upd, cur)) { next[c.id] = upd; if (upd.q !== cur.q) changed = true; }
      }
    }
    st = next;
    if (!changed) { const fin = evaluate(circuit, st); return { state: st, sig: fin.sig, warnings: fin.warnings, errors: fin.errors }; }
  }
  const ev = evaluate(circuit, st);
  return { state: st, sig: ev.sig, warnings: ev.warnings, errors: [`The circuit did not settle after ${MAX_SETTLE_ITERATIONS} iterations; it may oscillate.`] };
}

export const setClockLevel = (circuit, state, level) => {
  const st = { ...state };
  for (const c of circuit.components) if (c.type === "CLOCK") st[c.id] = { ...st[c.id], level: level ? 1 : 0 };
  return settle(circuit, st);
};
export const clockLevel = (circuit, state) => { const c = circuit.components.find(c => c.type === "CLOCK"); return c ? state[c.id]?.level ?? 0 : 0; };
/** Toggle every clock (half cycle). A LOW→HIGH toggle is a rising edge. */
export const toggleClock = (circuit, state) => setClockLevel(circuit, state, clockLevel(circuit, state) ? 0 : 1);
/** One full clock cycle: rising edge then falling edge. */
export function pulseClock(circuit, state) {
  const hi = setClockLevel(circuit, state, 1);
  if (hi.errors.length) return hi;
  return setClockLevel(circuit, hi.state, 0);
}
export function resetState(circuit) { return settle(circuit, createState(circuit)); }

/** Named observable signals for the timing diagram: switches, clocks, LED inputs and sequential outputs. */
export function probes(circuit) {
  const list = [];
  for (const c of circuit.components) {
    const k = COMPONENTS[c.type].kind;
    if (c.type === "SWITCH" || k === "clock") list.push({ id: c.id, name: c.name, pin: outputPins(c)[0], source: "out" });
    else if (c.type === "LED") list.push({ id: c.id, name: c.name, pin: "IN", source: "in" });
    else if (k === "latch" || k === "edge") list.push({ id: c.id, name: `${c.name}.Q`, pin: "Q", source: "out" });
  }
  return list;
}
export function sampleProbes(circuit, result) {
  const wireTo = new Map(circuit.wires.map(w => [pinKey(w.to.id, w.to.pin), w.from]));
  return probes(circuit).map(p => {
    if (p.source === "out") return result.sig.get(pinKey(p.id, p.pin)) ?? null;
    const src = wireTo.get(pinKey(p.id, p.pin));
    return src ? result.sig.get(pinKey(src.id, src.pin)) ?? null : null;
  });
}

/** Value arriving at an input pin (null if unconnected/unknown). */
export function inputValue(circuit, result, id, pin) {
  const w = circuit.wires.find(w => w.to.id === id && w.to.pin === pin);
  return w ? result.sig.get(pinKey(w.from.id, w.from.pin)) ?? null : null;
}
