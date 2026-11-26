// Truth tables for combinational circuits and state-transition tables for sequential ones.
import { COMPONENTS, inputPins } from "./components.js";
import { createState, settle, setClockLevel, inputValue } from "./simulator.js";

export const MAX_TABLE_INPUTS = 10;
export const MAX_STATE_BITS = 6;

/** Observed outputs: one per LED, one per bit of multi-bit displays. */
export function outputTerminals(circuit) {
  const out = [];
  for (const c of circuit.components) {
    if (c.type === "LED") out.push({ id: c.id, pin: "IN", label: c.name });
    else if (["BINOUT", "HEX", "SEG7"].includes(c.type)) inputPins(c).forEach(pin => out.push({ id: c.id, pin, label: `${c.name}[${pin.slice(1)}]` }));
  }
  return out;
}
export const switchInputs = circuit => circuit.components.filter(c => c.type === "SWITCH");
export const isSequentialCircuit = circuit => circuit.components.some(c => ["latch", "edge"].includes(COMPONENTS[c.type].kind));
const bitsOf = (mask, n) => Array.from({ length: n }, (_, i) => (mask >> (n - 1 - i)) & 1);
const setSwitches = (circuit, switches, bits) => ({ ...circuit, components: circuit.components.map(c => { const i = switches.findIndex(s => s.id === c.id); return i < 0 ? c : { ...c, props: { ...c.props, value: bits[i] } }; }) });

export function makeTruthTable(circuit, maxInputs = MAX_TABLE_INPUTS) {
  if (isSequentialCircuit(circuit)) return { ok: false, kind: "sequential", error: "This circuit contains memory elements, so a static truth table would be misleading. Use the state-transition table instead." };
  const inputs = switchInputs(circuit), outputs = outputTerminals(circuit);
  if (!inputs.length) return { ok: false, kind: "empty", error: "Add at least one switch to act as an input variable." };
  if (!outputs.length) return { ok: false, kind: "empty", error: "Add at least one LED or display to observe an output." };
  if (inputs.length > maxInputs) return { ok: false, kind: "limit", error: `Truth tables are limited to ${maxInputs} inputs (${2 ** maxInputs} rows). This circuit has ${inputs.length}.` };
  const rows = [];
  for (let mask = 0; mask < 2 ** inputs.length; mask++) {
    const bits = bitsOf(mask, inputs.length);
    const c = setSwitches(circuit, inputs, bits);
    const r = settle(c, createState(c));
    if (r.errors.length) return { ok: false, kind: "error", error: r.errors[0] };
    rows.push({ inputs: bits, outputs: outputs.map(o => inputValue(c, r, o.id, o.pin)) });
  }
  return { ok: true, kind: "combinational", inputs: inputs.map(i => i.name), outputs: outputs.map(o => o.label), rows, hasUnknown: rows.some(r => r.outputs.includes(null)) };
}

/** Enumerates every stored state × input combination and reports the next state after one rising clock edge. */
export function makeStateTable(circuit) {
  const mem = circuit.components.filter(c => ["latch", "edge"].includes(COMPONENTS[c.type].kind));
  const inputs = switchInputs(circuit), outputs = outputTerminals(circuit);
  if (!mem.length) return { ok: false, error: "No sequential components found." };
  if (mem.length > MAX_STATE_BITS) return { ok: false, error: `State tables are limited to ${MAX_STATE_BITS} memory elements.` };
  if (inputs.length > 6) return { ok: false, error: "State tables are limited to 6 switch inputs." };
  const hasClock = circuit.components.some(c => c.type === "CLOCK");
  if (mem.some(e => COMPONENTS[e.type].kind === "edge") && !hasClock) return { ok: false, error: "Add a Clock component to drive the flip-flops so the next state can be computed." };
  const rows = [];
  for (let s = 0; s < 2 ** mem.length; s++) {
    const sb = bitsOf(s, mem.length);
    for (let m = 0; m < 2 ** inputs.length; m++) {
      const ib = bitsOf(m, inputs.length), c = setSwitches(circuit, inputs, ib);
      let st = createState(c);
      mem.forEach((e, i) => { st[e.id] = { ...st[e.id], q: sb[i], invalid: false }; });
      let r = settle(c, st); // clock LOW: latches settle, previous clock level recorded
      if (r.errors.length) return { ok: false, error: r.errors[0] };
      const outBefore = outputs.map(o => inputValue(c, r, o.id, o.pin));
      const r2 = hasClock ? setClockLevel(c, r.state, 1) : r;
      if (r2.errors.length) return { ok: false, error: r2.errors[0] };
      rows.push({ state: sb, inputs: ib, outputs: outBefore, next: mem.map(e => r2.state[e.id].q) });
    }
  }
  return { ok: true, kind: "sequential", memory: mem.map(e => `${e.name}.Q`), inputs: inputs.map(i => i.name), outputs: outputs.map(o => o.label), rows, hasClock };
}

const cell = v => (v === null ? "X" : v);
export function tableToCSV(table) {
  if (table.kind === "sequential") {
    const head = [...table.memory.map(m => `${m} (now)`), ...table.inputs, ...table.outputs, ...table.memory.map(m => `${m} (next)`)];
    return [head, ...table.rows.map(r => [...r.state, ...r.inputs, ...r.outputs.map(cell), ...r.next.map(cell)])].map(r => r.map(csvEscape).join(",")).join("\n");
  }
  return [[...table.inputs, ...table.outputs], ...table.rows.map(r => [...r.inputs, ...r.outputs.map(cell)])].map(r => r.map(csvEscape).join(",")).join("\n");
}
const csvEscape = v => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
