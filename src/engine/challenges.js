// Challenge evaluator. A solution is judged only by simulated behaviour, never by how it looks.
import { COMPONENTS } from "./components.js";
import { createState, settle, setClockLevel, pulseClock, inputValue } from "./simulator.js";

const ALWAYS = new Set(["SWITCH", "LED", "CLOCK", "HIGH", "LOW"]);
const fmt = v => (v === null ? "undefined" : v);

/** Map spec names onto components: by (case-insensitive) name first, then by creation order. */
function mapNames(names, comps) {
  const result = {}, used = new Set();
  for (const n of names) { const c = comps.find(c => !used.has(c.id) && c.name.trim().toLowerCase() === n.toLowerCase()); if (c) { result[n] = c; used.add(c.id); } }
  for (const n of names) if (!result[n]) { const c = comps.find(c => !used.has(c.id)); if (c) { result[n] = c; used.add(c.id); } }
  return result;
}
const withSwitches = (circuit, assign) => ({ ...circuit, components: circuit.components.map(c => (assign[c.id] === undefined ? c : { ...c, props: { ...c.props, value: assign[c.id] } })) });

export function evaluateChallenge(circuit, ch) {
  const fail = messages => ({ passed: false, messages, failures: [] });
  const msgs = [];
  const allowed = new Set([...ALWAYS, ...ch.allowed]);
  const bad = [...new Set(circuit.components.filter(c => !allowed.has(c.type)).map(c => COMPONENTS[c.type].label))];
  if (bad.length) msgs.push(`This challenge does not allow: ${bad.join(", ")}. Allowed: ${ch.allowed.map(t => COMPONENTS[t].label).join(", ")}.`);
  for (const t of ch.required || []) if (!circuit.components.some(c => c.type === t)) msgs.push(`Use at least one ${COMPONENTS[t].label} component.`);
  const switches = circuit.components.filter(c => c.type === "SWITCH"), leds = circuit.components.filter(c => c.type === "LED");
  if (switches.length < ch.inputs.length) msgs.push(`Add ${ch.inputs.length} switch${ch.inputs.length === 1 ? "" : "es"} (${ch.inputs.join(", ")}). You have ${switches.length}.`);
  if (switches.length > ch.inputs.length && !ch.allowExtraSwitches) msgs.push(`Expected exactly ${ch.inputs.length} switch${ch.inputs.length === 1 ? "" : "es"} (${ch.inputs.join(", ") || "none"}) but found ${switches.length}. Extra switches change the behaviour; remove them.`);
  if (leds.length < ch.outputs.length) msgs.push(`Add ${ch.outputs.length} LED${ch.outputs.length === 1 ? "" : "s"} for the output${ch.outputs.length === 1 ? "" : "s"} (${ch.outputs.join(", ")}). You have ${leds.length}.`);
  if (leds.length > ch.outputs.length) msgs.push(`Expected exactly ${ch.outputs.length} LED${ch.outputs.length === 1 ? "" : "s"} (${ch.outputs.join(", ")}) but found ${leds.length}.`);
  if (msgs.length) return fail(msgs);

  const inMap = mapNames(ch.inputs, switches), outMap = mapNames(ch.outputs, leds);
  const mapping = [...ch.inputs.map(n => `${inMap[n].name} → input ${n}`), ...ch.outputs.map(n => `${outMap[n].name} → output ${n}`)];
  for (const n of ch.outputs) if (!circuit.wires.some(w => w.to.id === outMap[n].id)) msgs.push(`LED “${outMap[n].name}” (output ${n}) is not connected to anything.`);
  if (msgs.length) return { ...fail(msgs), mapping };

  const read = (c, r) => ch.outputs.map(n => inputValue(c, r, outMap[n].id, "IN"));
  const failures = [];
  if (ch.kind === "comb") {
    const n = ch.inputs.length;
    for (let m = 0; m < 2 ** n; m++) {
      const bits = ch.inputs.map((_, i) => (m >> (n - 1 - i)) & 1);
      const assign = {}; ch.inputs.forEach((name, i) => { assign[inMap[name].id] = bits[i]; });
      const c = withSwitches(circuit, assign), r = settle(c, createState(c));
      if (r.errors.length) return { passed: false, messages: [r.errors[0]], failures, mapping };
      const got = read(c, r), want = ch.fn(bits);
      if (got.some((g, i) => g !== want[i])) failures.push({ label: ch.inputs.map((nme, i) => `${nme}=${bits[i]}`).join(" "), expected: want, got });
    }
    if (failures.length) {
      const unknown = failures.some(f => f.got.includes(null));
      const lines = failures.slice(0, 4).map(f => `${f.label}: expected ${ch.outputs.map((o, i) => `${o}=${f.expected[i]}`).join(", ")}, got ${ch.outputs.map((o, i) => `${o}=${fmt(f.got[i])}`).join(", ")}`);
      return { passed: false, failures, mapping, messages: [`${failures.length} of ${2 ** n} input combinations are wrong.`, ...lines, ...(unknown ? ["Some outputs are undefined: check that every gate input is connected."] : []), ...(failures.length > 4 ? [`…and ${failures.length - 4} more.`] : [])] };
    }
    return { passed: true, messages: [`All ${2 ** n} input combinations produce the correct output.`], failures, mapping };
  }
  // Sequential: run a scripted sequence and compare after every step.
  const needsClock = ch.sequence.some(s => s.clock);
  if (needsClock && !circuit.components.some(c => c.type === "CLOCK")) return { passed: false, messages: ["Add a Clock component so the circuit can be clocked."], failures, mapping };
  let c = circuit, r = settle(c, createState(c));
  if (r.errors.length) return { passed: false, messages: [r.errors[0]], failures, mapping };
  const describe = (s, i) => `Step ${i + 1}${s.set ? ` (${Object.entries(s.set).map(([k, v]) => `${k}=${v}`).join(", ")}${s.clock ? ", " : ""}` : s.clock ? " (" : ""}${s.clock ? { pulse: "clock pulse", rise: "rising clock edge", fall: "falling clock edge" }[s.clock] : ""}${s.set || s.clock ? ")" : ""}`;
  for (let i = 0; i < ch.sequence.length; i++) {
    const s = ch.sequence[i];
    if (s.set) { const assign = {}; for (const [k, v] of Object.entries(s.set)) assign[inMap[k].id] = v; c = withSwitches(c, assign); r = settle(c, r.state); }
    if (s.clock === "pulse") r = pulseClock(c, r.state); else if (s.clock === "rise") r = setClockLevel(c, r.state, 1); else if (s.clock === "fall") r = setClockLevel(c, r.state, 0);
    if (r.errors.length) return { passed: false, messages: [`${describe(s, i)}: ${r.errors[0]}`], failures, mapping };
    const got = read(c, r);
    const bad = ch.outputs.filter((o, k) => s.expect[o] !== undefined && got[k] !== s.expect[o]);
    if (bad.length) return { passed: false, failures, mapping, messages: [`${describe(s, i)}: expected ${bad.map(o => `${o}=${s.expect[o]}`).join(", ")} but got ${bad.map(o => `${o}=${fmt(got[ch.outputs.indexOf(o)])}`).join(", ")}.`, s.why ? `Why: ${s.why}` : "The circuit's memory behaviour does not match the specification at this step."] };
  }
  return { passed: true, messages: [`All ${ch.sequence.length} test steps behave correctly.`], failures, mapping };
}
