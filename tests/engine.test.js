import test from "node:test";
import assert from "node:assert/strict";
import { build, setSwitch } from "./helpers.js";
import { createState, settle, evaluate, setClockLevel, pulseClock, inputValue, pinKey } from "../src/engine/simulator.js";
import { checkConnection, connect, findComponent, findCombinationalCycle, validateCircuit, importCircuitJson, exportCircuit, removeComponents, updateComponent, createCircuit, addComponent } from "../src/engine/circuit.js";
import { makeTruthTable, makeStateTable, tableToCSV } from "../src/engine/truthTable.js";
import { not3, and3, or3, xor3 } from "../src/engine/components.js";

const run = (c, st = createState(c)) => settle(c, st);
const out = (c, r, id, pin = "Y") => r.sig.get(pinKey(id, pin));

// ---- Gates: every row of every truth table, built through the real circuit pipeline ----
const GATES = {
  AND: (a, b) => a & b, OR: (a, b) => a | b, NAND: (a, b) => (a & b) ^ 1,
  NOR: (a, b) => (a | b) ^ 1, XOR: (a, b) => a ^ b, XNOR: (a, b) => (a ^ b) ^ 1,
};
for (const [type, fn] of Object.entries(GATES)) {
  test(`${type} gate matches its truth table`, () => {
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
      const { circuit, ids } = build({ comps: [["a", "SWITCH", { value: a }], ["b", "SWITCH", { value: b }], ["g", type]], wires: [["a.Q", "g.A"], ["b.Q", "g.B"]] });
      assert.equal(out(circuit, run(circuit), ids.g), fn(a, b), `${type}(${a},${b})`);
    }
  });
}
test("NOT and BUFFER", () => {
  for (const v of [0, 1]) {
    const { circuit, ids } = build({ comps: [["a", "SWITCH", { value: v }], ["n", "NOT"], ["b", "BUFFER"]], wires: [["a.Q", "n.A"], ["a.Q", "b.A"]] });
    const r = run(circuit);
    assert.equal(out(circuit, r, ids.n), v ^ 1); assert.equal(out(circuit, r, ids.b), v);
  }
});
test("multi-input gates (3 and 4 inputs)", () => {
  for (const n of [3, 4]) for (const type of ["AND", "OR", "XOR", "NAND", "NOR", "XNOR"]) {
    for (let m = 0; m < 2 ** n; m++) {
      const bits = Array.from({ length: n }, (_, i) => (m >> i) & 1);
      const comps = bits.map((v, i) => [`s${i}`, "SWITCH", { value: v }]).concat([["g", type, { inputCount: n }]]);
      const { circuit, ids } = build({ comps, wires: bits.map((_, i) => [`s${i}.Q`, `g.${"ABCD"[i]}`]) });
      const ones = bits.filter(Boolean).length;
      const want = { AND: +(ones === n), OR: +(ones > 0), XOR: ones & 1, NAND: +(ones !== n), NOR: +(ones === 0), XNOR: (ones & 1) ^ 1 }[type];
      assert.equal(out(circuit, run(circuit), ids.g), want, `${type}${n} ${bits}`);
    }
  }
});
test("three-valued logic: unknown is never silently LOW", () => {
  assert.equal(and3([0, null]), 0); assert.equal(and3([1, null]), null);
  assert.equal(or3([1, null]), 1); assert.equal(or3([0, null]), null);
  assert.equal(xor3([1, null]), null); assert.equal(not3(null), null);
  const { circuit, ids } = build({ comps: [["a", "SWITCH", { value: 1 }], ["g", "AND"]], wires: [["a.Q", "g.A"]] });
  const r = run(circuit);
  assert.equal(out(circuit, r, ids.g), null);
  assert.ok(r.warnings.some(w => /not connected/.test(w.message)));
});

// ---- Connections, propagation, cycles ----
test("signals propagate through a chain and update when inputs change", () => {
  let { circuit, ids } = build({ comps: [["a", "SWITCH"], ["n1", "NOT"], ["n2", "NOT"], ["n3", "NOT"], ["led", "LED"]], wires: [["a.Q", "n1.A"], ["n1.Y", "n2.A"], ["n2.Y", "n3.A"], ["n3.Y", "led.IN"]] });
  assert.equal(inputValue(circuit, run(circuit), ids.led, "IN"), 1);
  circuit = setSwitch(circuit, ids.a, 1);
  assert.equal(inputValue(circuit, run(circuit), ids.led, "IN"), 0);
});
test("invalid connections are rejected with helpful messages", () => {
  const { circuit, ids } = build({ comps: [["a", "SWITCH"], ["b", "SWITCH"], ["g", "AND"], ["n", "NOT"], ["led", "LED"]], wires: [["a.Q", "g.A"]] });
  let r = connect(circuit, { id: ids.b, pin: "Q" }, { id: ids.g, pin: "A" });
  assert.equal(r.ok, false); assert.match(r.error, /already connected/);
  r = checkConnection(circuit, { id: ids.b, pin: "Q" }, { id: ids.g, pin: "Z" }); assert.match(r.error, /no input pin/);
  r = checkConnection(circuit, { id: ids.b, pin: "X" }, { id: ids.g, pin: "B" }); assert.match(r.error, /no output pin/);
  r = checkConnection(circuit, { id: ids.led, pin: "IN" }, { id: ids.g, pin: "B" }); assert.equal(r.ok, false);
  r = checkConnection(circuit, { id: "nope", pin: "Q" }, { id: ids.g, pin: "B" }); assert.equal(r.ok, false);
  assert.equal(checkConnection(circuit, { id: ids.b, pin: "Q" }, { id: ids.g, pin: "B" }).ok, true);
});
test("combinational feedback loops are detected and refused", () => {
  const { circuit, ids } = build({ comps: [["a", "SWITCH"], ["g1", "AND"], ["g2", "NOT"]], wires: [["a.Q", "g1.A"], ["g1.Y", "g2.A"]] });
  const r = checkConnection(circuit, { id: ids.g2, pin: "Y" }, { id: ids.g1, pin: "B" });
  assert.equal(r.ok, false); assert.match(r.error, /feedback loop/);
  // A circuit that already contains a cycle (e.g. hand-edited) is reported by evaluate(), not run forever.
  const cyc = { ...circuit, wires: [...circuit.wires, { id: "w9", from: { id: ids.g2, pin: "Y" }, to: { id: ids.g1, pin: "B" } }] };
  assert.ok(findCombinationalCycle(cyc));
  const res = evaluate(cyc, createState(cyc));
  assert.match(res.errors[0], /Feedback loop/);
});
test("feedback through a flip-flop is legal (divide-by-two)", () => {
  const { circuit, ids } = build({ comps: [["clk", "CLOCK"], ["f", "DFF"], ["n", "NOT"]], wires: [["clk.CLK", "f.CLK"], ["f.Q", "n.A"], ["n.Y", "f.D"]] });
  let r = run(circuit), seen = [];
  for (let i = 0; i < 4; i++) { r = pulseClock(circuit, r.state); seen.push(out(circuit, r, ids.f, "Q")); }
  assert.deepEqual(seen, [1, 0, 1, 0]);
});
test("removing components removes their wires; shrinking a gate drops dead wires", () => {
  let { circuit, ids } = build({ comps: [["a", "SWITCH"], ["b", "SWITCH"], ["g", "AND"]], wires: [["a.Q", "g.A"], ["b.Q", "g.B"]] });
  assert.equal(removeComponents(circuit, [ids.a]).wires.length, 1);
  const c3 = updateComponent(circuit, ids.g, { props: { inputCount: 3 } });
  assert.equal(c3.wires.length, 2);
  const c1 = updateComponent({ ...c3 }, ids.g, { props: { inputCount: 2 } });
  assert.equal(c1.wires.length, 2);
});

// ---- Sequential behaviour ----
test("D flip-flop captures D only on rising clock edges", () => {
  let { circuit, ids } = build({ comps: [["d", "SWITCH"], ["clk", "CLOCK"], ["f", "DFF"]], wires: [["d.Q", "f.D"], ["clk.CLK", "f.CLK"]] });
  let r = run(circuit);
  circuit = setSwitch(circuit, ids.d, 1);
  r = settle(circuit, r.state);
  assert.equal(out(circuit, r, ids.f, "Q"), 0, "D change alone must not change Q");
  r = setClockLevel(circuit, r.state, 1);
  assert.equal(out(circuit, r, ids.f, "Q"), 1, "rising edge captures D");
  circuit = setSwitch(circuit, ids.d, 0); r = settle(circuit, r.state);
  assert.equal(out(circuit, r, ids.f, "Q"), 1, "D change while CLK high is ignored");
  r = setClockLevel(circuit, r.state, 0);
  assert.equal(out(circuit, r, ids.f, "Q"), 1, "falling edge does nothing");
  assert.equal(out(circuit, r, ids.f, "QN"), 0);
  r = setClockLevel(circuit, r.state, 1);
  assert.equal(out(circuit, r, ids.f, "Q"), 0);
});
test("clock that is already HIGH at start produces no phantom edge", () => {
  const { circuit, ids } = build({ comps: [["d", "HIGH"], ["clk", "CLOCK"], ["f", "DFF"]], wires: [["d.Q", "f.D"], ["clk.CLK", "f.CLK"]] });
  const st = createState(circuit); st[ids.clk] = { level: 1 };
  assert.equal(out(circuit, run(circuit, st), ids.f, "Q"), 0);
});
test("asynchronous reset overrides the clock", () => {
  let { circuit, ids } = build({ comps: [["d", "HIGH"], ["clk", "CLOCK"], ["r", "SWITCH"], ["f", "DFF"]], wires: [["d.Q", "f.D"], ["clk.CLK", "f.CLK"], ["r.Q", "f.RST"]] });
  let r = pulseClock(circuit, run(circuit).state);
  assert.equal(out(circuit, r, ids.f, "Q"), 1);
  circuit = setSwitch(circuit, ids.r, 1); r = settle(circuit, r.state);
  assert.equal(out(circuit, r, ids.f, "Q"), 0);
  r = pulseClock(circuit, r.state);
  assert.equal(out(circuit, r, ids.f, "Q"), 0, "stays reset while RST=1");
});
test("JK flip-flop: hold, set, reset, toggle", () => {
  let { circuit, ids } = build({ comps: [["j", "SWITCH"], ["k", "SWITCH"], ["clk", "CLOCK"], ["f", "JKFF"]], wires: [["j.Q", "f.J"], ["k.Q", "f.K"], ["clk.CLK", "f.CLK"]] });
  let r = run(circuit);
  const apply = (j, k) => { circuit = setSwitch(setSwitch(circuit, ids.j, j), ids.k, k); r = pulseClock(circuit, settle(circuit, r.state).state); return out(circuit, r, ids.f, "Q"); };
  assert.equal(apply(0, 0), 0); assert.equal(apply(1, 0), 1); assert.equal(apply(0, 0), 1);
  assert.equal(apply(0, 1), 0); assert.equal(apply(1, 1), 1); assert.equal(apply(1, 1), 0);
});
test("T flip-flop toggles only while T=1", () => {
  let { circuit, ids } = build({ comps: [["t", "SWITCH", { value: 1 }], ["clk", "CLOCK"], ["f", "TFF"]], wires: [["t.Q", "f.T"], ["clk.CLK", "f.CLK"]] });
  let r = run(circuit), seq = [];
  for (let i = 0; i < 3; i++) { r = pulseClock(circuit, r.state); seq.push(out(circuit, r, ids.f, "Q")); }
  circuit = setSwitch(circuit, ids.t, 0); r = pulseClock(circuit, settle(circuit, r.state).state); seq.push(out(circuit, r, ids.f, "Q"));
  assert.deepEqual(seq, [1, 0, 1, 1]);
});
test("SR latch: set, reset, hold, forbidden state", () => {
  let { circuit, ids } = build({ comps: [["s", "SWITCH"], ["r", "SWITCH"], ["l", "SR_LATCH"]], wires: [["s.Q", "l.S"], ["r.Q", "l.R"]] });
  let r = run(circuit);
  const q = (s, rr) => { circuit = setSwitch(setSwitch(circuit, ids.s, s), ids.r, rr); r = settle(circuit, r.state); return [out(circuit, r, ids.l, "Q"), out(circuit, r, ids.l, "QN")]; };
  assert.deepEqual(q(1, 0), [1, 0]); assert.deepEqual(q(0, 0), [1, 0]);
  assert.deepEqual(q(0, 1), [0, 1]); assert.deepEqual(q(0, 0), [0, 1]);
  assert.deepEqual(q(1, 1), [0, 0]); assert.ok(r.warnings.some(w => /forbidden/.test(w.message)));
  assert.deepEqual(q(0, 0), [null, null], "state is undefined after releasing S=R=1");
});
test("D latch is transparent while EN=1 and holds while EN=0", () => {
  let { circuit, ids } = build({ comps: [["d", "SWITCH"], ["e", "SWITCH"], ["l", "D_LATCH"]], wires: [["d.Q", "l.D"], ["e.Q", "l.EN"]] });
  let r = run(circuit);
  const step = (d, e) => { circuit = setSwitch(setSwitch(circuit, ids.d, d), ids.e, e); r = settle(circuit, r.state); return out(circuit, r, ids.l, "Q"); };
  assert.equal(step(1, 0), 0); assert.equal(step(1, 1), 1); assert.equal(step(0, 1), 0); assert.equal(step(1, 0), 0);
});
test("shift register samples all flip-flops simultaneously", () => {
  let { circuit, ids } = build({ comps: [["d", "HIGH"], ["clk", "CLOCK"], ["f0", "DFF"], ["f1", "DFF"], ["f2", "DFF"]], wires: [["d.Q", "f0.D"], ["f0.Q", "f1.D"], ["f1.Q", "f2.D"], ["clk.CLK", "f0.CLK"], ["clk.CLK", "f1.CLK"], ["clk.CLK", "f2.CLK"]] });
  let r = run(circuit);
  const seen = [];
  for (let i = 0; i < 3; i++) { r = pulseClock(circuit, r.state); seen.push([ids.f0, ids.f1, ids.f2].map(id => out(circuit, r, id, "Q")).join("")); }
  assert.deepEqual(seen, ["100", "110", "111"]);
});
test("oscillating latch networks cannot freeze the simulator", () => {
  // Two D latches with EN=1 forming an inverter ring through NOT: Q0 -> NOT -> D1(en) , Q1 -> D0 ... must terminate.
  const { circuit } = build({ comps: [["h", "HIGH"], ["l", "D_LATCH"], ["n", "NOT"]], wires: [["h.Q", "l.EN"], ["l.Q", "n.A"], ["n.Y", "l.D"]] });
  const t = Date.now(); const r = run(circuit);
  assert.ok(Date.now() - t < 1000);
  assert.match(r.errors[0], /did not settle/);
});

// ---- Truth & state tables ----
test("truth table for a half adder is exact; CSV export is correct", () => {
  const { circuit } = build({ comps: [["a", "SWITCH"], ["b", "SWITCH"], ["x", "XOR"], ["n", "AND"], ["s", "LED", {}, "Sum"], ["c", "LED", {}, "Carry"]],
    wires: [["a.Q", "x.A"], ["b.Q", "x.B"], ["a.Q", "n.A"], ["b.Q", "n.B"], ["x.Y", "s.IN"], ["n.Y", "c.IN"]] });
  const t = makeTruthTable(circuit);
  assert.ok(t.ok); assert.deepEqual(t.inputs, ["a", "b"]); assert.deepEqual(t.outputs, ["Sum", "Carry"]);
  assert.deepEqual(t.rows.map(r => [...r.inputs, ...r.outputs]), [[0, 0, 0, 0], [0, 1, 1, 0], [1, 0, 1, 0], [1, 1, 0, 1]]);
  assert.equal(tableToCSV(t), "a,b,Sum,Carry\n0,0,0,0\n0,1,1,0\n1,0,1,0\n1,1,0,1");
});
test("truth table supports multi-bit displays and refuses unsuitable circuits", () => {
  const { circuit } = build({ comps: [["a", "SWITCH"], ["o", "BINOUT", { bits: 2 }]], wires: [["a.Q", "o.D0"]] });
  const t = makeTruthTable(circuit);
  assert.deepEqual(t.outputs, ["o[0]", "o[1]"]);
  assert.equal(t.rows[1].outputs[1], null, "unconnected bit is shown as undefined");
  assert.match(tableToCSV(t), /X/);
  assert.equal(makeTruthTable(createCircuit()).ok, false);
  const seq = build({ comps: [["f", "DFF"]] }).circuit;
  assert.equal(makeTruthTable(seq).kind, "sequential");
  const many = build({ comps: [...Array.from({ length: 5 }, (_, i) => [`s${i}`, "SWITCH"]), ["l", "LED"]] }).circuit;
  assert.equal(makeTruthTable(many, 4).kind, "limit");
});
test("state-transition table of a toggle flip-flop", () => {
  const { circuit } = build({ comps: [["t", "SWITCH"], ["clk", "CLOCK"], ["f", "TFF"], ["q", "LED"]], wires: [["t.Q", "f.T"], ["clk.CLK", "f.CLK"], ["f.Q", "q.IN"]] });
  const t = makeStateTable(circuit);
  assert.ok(t.ok);
  assert.deepEqual(t.rows.map(r => [r.state[0], r.inputs[0], r.next[0]]), [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]]);
});

// ---- Import / export ----
test("export → import round trip preserves the circuit", () => {
  const { circuit } = build({ comps: [["a", "SWITCH", { value: 1 }], ["g", "AND", { inputCount: 3 }], ["l", "LED"]], wires: [["a.Q", "g.A"], ["g.Y", "l.IN"]] });
  const r = importCircuitJson(exportCircuit(circuit));
  assert.ok(r.ok, r.errors.join());
  assert.deepEqual(r.circuit.components, circuit.components); assert.deepEqual(r.circuit.wires, circuit.wires);
});
test("import rejects malformed, hostile or oversized data", () => {
  const good = { schemaVersion: 1, name: "x", components: [{ id: "c1", type: "AND", name: "g", x: 0, y: 0, props: { inputCount: 2 } }], wires: [] };
  assert.ok(validateCircuit(good).ok);
  const bad = [
    "not json", "[]", "null", {}, { ...good, schemaVersion: 99 }, { ...good, schemaVersion: "1" },
    { ...good, components: [{ ...good.components[0], type: "__proto__" }] },
    { ...good, components: [{ ...good.components[0], type: "constructor" }] },
    { ...good, components: [{ ...good.components[0], x: "a" }] },
    { ...good, components: [{ ...good.components[0], props: { inputCount: 99 } }] },
    { ...good, components: [good.components[0], good.components[0]] },
    { ...good, wires: [{ id: "w1", from: { id: "c1", pin: "Y" }, to: { id: "zz", pin: "A" } }] },
    { ...good, wires: [{ id: "w1", from: { id: "c1", pin: "Y" }, to: { id: "c1", pin: "A" } }] },
    { ...good, components: Array.from({ length: 501 }, (_, i) => ({ ...good.components[0], id: `c${i}` })) },
  ];
  for (const b of bad) { const r = typeof b === "string" ? importCircuitJson(b) : validateCircuit(b); assert.equal(r.ok, false, JSON.stringify(b)?.slice(0, 80)); assert.ok(r.errors.length); }
  const dup = { ...good, components: [good.components[0], { ...good.components[0], id: "c2" }], wires: [{ id: "a", from: { id: "c2", pin: "Y" }, to: { id: "c1", pin: "A" } }, { id: "b", from: { id: "c2", pin: "Y" }, to: { id: "c1", pin: "A" } }] };
  assert.match(validateCircuit(dup).errors.join(), /more than one driver/);
});
