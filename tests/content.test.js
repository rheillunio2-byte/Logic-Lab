import test from "node:test";
import assert from "node:assert/strict";
import { build } from "./helpers.js";
import { EXAMPLES, getExample } from "../src/data/examples.js";
import { CHALLENGES, getChallenge } from "../src/data/challenges.js";
import { evaluateChallenge } from "../src/engine/challenges.js";
import { validateCircuit } from "../src/engine/circuit.js";
import { makeTruthTable } from "../src/engine/truthTable.js";
import { createState, settle, pulseClock, pinKey, inputValue } from "../src/engine/simulator.js";

test("every example is a valid circuit that simulates without errors or warnings", () => {
  assert.ok(EXAMPLES.length >= 11);
  for (const ex of EXAMPLES) {
    assert.ok(ex.title && ex.description && ex.explanation, ex.id);
    const v = validateCircuit(ex.circuit); assert.ok(v.ok, `${ex.id}: ${v.errors}`);
    const r = settle(ex.circuit, createState(ex.circuit));
    assert.deepEqual(r.errors, [], ex.id); assert.deepEqual(r.warnings, [], `${ex.id} has unconnected inputs`);
  }
});
const table = id => { const t = makeTruthTable(getExample(id).circuit); assert.ok(t.ok, t.error); return t.rows.map(r => [...r.inputs, ...r.outputs].join("")); };
test("combinational examples compute the right functions", () => {
  assert.deepEqual(table("and"), ["000", "010", "100", "111"]);
  assert.deepEqual(table("or"), ["000", "011", "101", "111"]);
  assert.deepEqual(table("xor"), ["000", "011", "101", "110"]);
  assert.deepEqual(table("nand-xor"), ["000", "011", "101", "110"]);
  assert.deepEqual(table("nor-and"), ["000", "010", "100", "111"]);
  assert.deepEqual(table("half-adder"), ["0000", "0110", "1010", "1101"]);
  const fa = table("full-adder");
  fa.forEach((row, m) => { const [a, b, c] = [m >> 2 & 1, m >> 1 & 1, m & 1], sum = a + b + c; assert.equal(row.slice(3), `${sum & 1}${sum >> 1}`); });
  table("mux").forEach((row, m) => { const [d0, d1, s] = [m >> 2 & 1, m >> 1 & 1, m & 1]; assert.equal(+row[3], s ? d1 : d0); });
});
test("sequential examples behave correctly", () => {
  const counter = getExample("counter").circuit, bin = counter.components.find(c => c.type === "BINOUT");
  let r = settle(counter, createState(counter)); const seen = [];
  for (let i = 0; i < 9; i++) { r = pulseClock(counter, r.state); seen.push([0, 1, 2].reduce((a, k) => a | (inputValue(counter, r, bin.id, `D${k}`) << k), 0)); }
  assert.deepEqual(seen, [1, 2, 3, 4, 5, 6, 7, 0, 1]);
  const sr = getExample("shift-register").circuit; const d = sr.components.find(c => c.name === "D");
  const circ = { ...sr, components: sr.components.map(c => (c === d ? { ...c, props: { value: 1 } } : c)) };
  let s = settle(circ, createState(circ)); const q = [];
  const leds = circ.components.filter(c => c.type === "LED");
  for (let i = 0; i < 4; i++) { s = pulseClock(circ, s.state); q.push(leds.map(l => inputValue(circ, s, l.id, "IN")).join("")); }
  assert.deepEqual(q, ["1000", "1100", "1110", "1111"]);
  const dff = getExample("dff").circuit;
  let st = settle(dff, createState(dff)); assert.equal(st.sig.get(pinKey(dff.components.find(c => c.type === "DFF").id, "Q")), 0);
});

// ---- Challenges: reference solutions must pass; plausible wrong answers must fail with useful feedback ----
const gateSolution = (type, n = 2) => build({ comps: [["A", "SWITCH"], ...(n === 2 ? [["B", "SWITCH"]] : []), ["g", type], ["Y", "LED"]], wires: [["A.Q", "g.A"], ...(n === 2 ? [["B.Q", "g.B"]] : []), ["g.Y", "Y.IN"]] }).circuit;
const SOLUTIONS = {
  and: () => gateSolution("AND"), or: () => gateSolution("OR"), xor: () => gateSolution("XOR"), not: () => gateSolution("NOT", 1),
  nand: () => build({ comps: [["A", "SWITCH"], ["B", "SWITCH"], ["a", "AND"], ["n", "NOT"], ["Y", "LED"]], wires: [["A.Q", "a.A"], ["B.Q", "a.B"], ["a.Y", "n.A"], ["n.Y", "Y.IN"]] }).circuit,
  nor: () => build({ comps: [["A", "SWITCH"], ["B", "SWITCH"], ["o", "OR"], ["n", "NOT"], ["Y", "LED"]], wires: [["A.Q", "o.A"], ["B.Q", "o.B"], ["o.Y", "n.A"], ["n.Y", "Y.IN"]] }).circuit,
  "half-adder": () => build({ comps: [["A", "SWITCH"], ["B", "SWITCH"], ["x", "XOR"], ["a", "AND"], ["Sum", "LED"], ["Carry", "LED"]], wires: [["A.Q", "x.A"], ["B.Q", "x.B"], ["A.Q", "a.A"], ["B.Q", "a.B"], ["x.Y", "Sum.IN"], ["a.Y", "Carry.IN"]] }).circuit,
  "full-adder": () => getExample("full-adder").circuit,
  mux: () => getExample("mux").circuit,
  sr: () => build({ comps: [["S", "SWITCH"], ["R", "SWITCH"], ["E", "SWITCH"], ["a1", "AND"], ["a2", "AND"], ["l", "SR_LATCH"], ["Q", "LED"]], wires: [["S.Q", "a1.A"], ["E.Q", "a1.B"], ["R.Q", "a2.A"], ["E.Q", "a2.B"], ["a1.Y", "l.S"], ["a2.Y", "l.R"], ["l.Q", "Q.IN"]] }).circuit,
  dff: () => build({ comps: [["D", "SWITCH"], ["clk", "CLOCK"], ["n", "NOT"], ["m", "D_LATCH"], ["s", "D_LATCH"], ["Q", "LED"]], wires: [["D.Q", "m.D"], ["clk.CLK", "n.A"], ["n.Y", "m.EN"], ["m.Q", "s.D"], ["clk.CLK", "s.EN"], ["s.Q", "Q.IN"]] }).circuit,
  counter2: () => build({ comps: [["one", "HIGH"], ["clk", "CLOCK"], ["t0", "TFF"], ["t1", "TFF"], ["Q0", "LED"], ["Q1", "LED"]], wires: [["one.Q", "t0.T"], ["t0.Q", "t1.T"], ["clk.CLK", "t0.CLK"], ["clk.CLK", "t1.CLK"], ["t0.Q", "Q0.IN"], ["t1.Q", "Q1.IN"]] }).circuit,
  alu: () => {
    const comps = [["A", "SWITCH"], ["B", "SWITCH"], ["S0", "SWITCH"], ["S1", "SWITCH"], ["n0", "NOT"], ["n1", "NOT"], ["and", "AND"], ["or", "OR"], ["xor", "XOR"], ["na", "NOT"],
      ["d0", "AND", { inputCount: 3 }], ["d1", "AND", { inputCount: 3 }], ["d2", "AND", { inputCount: 3 }], ["d3", "AND", { inputCount: 3 }], ["out", "OR", { inputCount: 4 }], ["Y", "LED"]];
    const wires = [["S0.Q", "n0.A"], ["S1.Q", "n1.A"], ["A.Q", "and.A"], ["B.Q", "and.B"], ["A.Q", "or.A"], ["B.Q", "or.B"], ["A.Q", "xor.A"], ["B.Q", "xor.B"], ["A.Q", "na.A"],
      ["and.Y", "d0.A"], ["n0.Y", "d0.B"], ["n1.Y", "d0.C"], ["or.Y", "d1.A"], ["S0.Q", "d1.B"], ["n1.Y", "d1.C"], ["xor.Y", "d2.A"], ["n0.Y", "d2.B"], ["S1.Q", "d2.C"], ["na.Y", "d3.A"], ["S0.Q", "d3.B"], ["S1.Q", "d3.C"],
      ["d0.Y", "out.A"], ["d1.Y", "out.B"], ["d2.Y", "out.C"], ["d3.Y", "out.D"], ["out.Y", "Y.IN"]];
    return build({ comps, wires }).circuit;
  },
};
test("every challenge has a reference solution that passes", () => {
  for (const ch of CHALLENGES) {
    assert.ok(SOLUTIONS[ch.id], `no reference solution for ${ch.id}`);
    assert.ok(ch.hints.length >= 2 && ch.objective, ch.id);
    const res = evaluateChallenge(SOLUTIONS[ch.id](), ch);
    assert.ok(res.passed, `${ch.id}: ${res.messages.join(" | ")}`);
  }
});
test("challenges are graded on behaviour, not appearance", () => {
  const and = getChallenge("and");
  let res = evaluateChallenge(gateSolution("OR"), { ...and, allowed: ["AND", "OR"], required: [] });
  assert.equal(res.passed, false); assert.match(res.messages.join(), /input combinations are wrong/); assert.match(res.messages.join(), /expected Y=0, got Y=1/);
  res = evaluateChallenge(gateSolution("OR"), and); assert.match(res.messages.join(), /does not allow/);
  // right-looking but unwired circuit
  const unwired = build({ comps: [["A", "SWITCH"], ["B", "SWITCH"], ["g", "AND"], ["Y", "LED"]], wires: [["g.Y", "Y.IN"]] }).circuit;
  res = evaluateChallenge(unwired, and); assert.equal(res.passed, false); assert.match(res.messages.join(), /undefined/);
  res = evaluateChallenge(build({ comps: [["A", "SWITCH"], ["B", "SWITCH"], ["g", "AND"], ["Y", "LED"]], wires: [["A.Q", "g.A"], ["B.Q", "g.B"]] }).circuit, and);
  assert.match(res.messages.join(), /not connected to anything/);
  res = evaluateChallenge(build({ comps: [["g", "AND"]] }).circuit, and); assert.match(res.messages.join(), /Add 2 switches/);
  // NAND challenge needs both component types
  res = evaluateChallenge(gateSolution("AND"), getChallenge("nand")); assert.equal(res.passed, false);
  // Built-in adders are not allowed for the full-adder challenge
  const cheat = build({ comps: [["A", "SWITCH"], ["B", "SWITCH"], ["Cin", "SWITCH"], ["f", "FULL_ADDER"], ["Sum", "LED"], ["Cout", "LED"]], wires: [["A.Q", "f.A"], ["B.Q", "f.B"], ["Cin.Q", "f.CIN"], ["f.S", "Sum.IN"], ["f.COUT", "Cout.IN"]] }).circuit;
  res = evaluateChallenge(cheat, getChallenge("full-adder")); assert.equal(res.passed, false); assert.match(res.messages[0], /does not allow/);
});
test("sequential challenges catch level-sensitive and non-clocked designs", () => {
  // A single D latch looks plausible for a flip-flop but is transparent, so it must fail.
  const latchOnly = build({ comps: [["D", "SWITCH"], ["clk", "CLOCK"], ["n", "NOT"], ["l", "D_LATCH"], ["Q", "LED"]], wires: [["D.Q", "l.D"], ["clk.CLK", "n.A"], ["n.Y", "l.EN"], ["l.Q", "Q.IN"]] }).circuit;
  const res = evaluateChallenge(latchOnly, getChallenge("dff")); assert.equal(res.passed, false); assert.match(res.messages.join(), /Step \d/);
  const noClock = build({ comps: [["D", "SWITCH"], ["n", "NOT"], ["l", "D_LATCH"], ["m", "D_LATCH"], ["Q", "LED"]], wires: [["D.Q", "l.D"], ["l.Q", "m.D"], ["m.Q", "Q.IN"]] }).circuit;
  assert.match(evaluateChallenge(noClock, getChallenge("dff")).messages.join(), /Clock/);
  // A counter that never counts
  const stuck = build({ comps: [["clk", "CLOCK"], ["t0", "TFF"], ["Q0", "LED"], ["Q1", "LED"]], wires: [["clk.CLK", "t0.CLK"], ["t0.Q", "Q0.IN"]] }).circuit;
  assert.equal(evaluateChallenge(stuck, getChallenge("counter2")).passed, false);
});
