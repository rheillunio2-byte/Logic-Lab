// Ready-made circuits. Each is built with the same schema as user circuits and verified by the test suite.
import { SCHEMA_VERSION } from "../engine/circuit.js";

function make(id, title, description, explanation, comps, wires, props = {}) {
  const components = comps.map(([key, type, name, x, y, p], i) => ({ id: `c${i + 1}`, key, type, name, x, y, props: { ...(p || {}) } }));
  const idOf = k => components.find(c => c.key === k)?.id;
  const ws = wires.map(([a, b], i) => { const [ak, ap] = a.split("."), [bk, bp] = b.split("."); return { id: `w${i + 1}`, from: { id: idOf(ak), pin: ap }, to: { id: idOf(bk), pin: bp } }; });
  const defaults = { AND: { inputCount: 2 }, SWITCH: { value: 0 }, BINOUT: { bits: 4 }, MUX: { selectBits: 1 } };
  components.forEach(c => { c.props = { ...(defaults[c.type] || {}), ...c.props }; delete c.key; });
  return { id, title, description, explanation, circuit: { schemaVersion: SCHEMA_VERSION, name: title, components, wires: ws }, ...props };
}
const gateDemo = (id, type, title, description, explanation) => make(id, title, description, explanation,
  [["a", "SWITCH", "A", 60, 60], ["b", "SWITCH", "B", 60, 180], ["g", type, type, 280, 110], ["y", "LED", "Y", 500, 120]],
  [["a.Q", "g.A"], ["b.Q", "g.B"], ["g.Y", "y.IN"]]);

export const EXAMPLES = [
  gateDemo("and", "AND", "AND gate", "Output is HIGH only when both inputs are HIGH.", "Toggle A and B. Y = A·B is 1 only for A=1, B=1."),
  gateDemo("or", "OR", "OR gate", "Output is HIGH when at least one input is HIGH.", "Y = A + B is 0 only when both inputs are 0."),
  gateDemo("xor", "XOR", "XOR gate", "Output is HIGH when the inputs differ.", "Y = A⊕B. XOR is the sum bit of a one-bit adder and detects inequality."),
  make("nand-xor", "NAND-only XOR", "XOR built from four NAND gates.", "NAND is a universal gate. n1 = (AB)'; n2 = (A·n1)'; n3 = (B·n1)'; Y = (n2·n3)' = A⊕B.",
    [["a", "SWITCH", "A", 40, 60], ["b", "SWITCH", "B", 40, 220], ["n1", "NAND", "n1", 240, 140], ["n2", "NAND", "n2", 440, 60], ["n3", "NAND", "n3", 440, 240], ["n4", "NAND", "n4", 640, 150], ["y", "LED", "Y", 840, 160]],
    [["a.Q", "n1.A"], ["b.Q", "n1.B"], ["a.Q", "n2.A"], ["n1.Y", "n2.B"], ["b.Q", "n3.B"], ["n1.Y", "n3.A"], ["n2.Y", "n4.A"], ["n3.Y", "n4.B"], ["n4.Y", "y.IN"]]),
  make("nor-and", "NOR-only AND", "AND built from three NOR gates.", "NOR with both inputs tied together is NOT. By De Morgan, A·B = (A' + B')' = NOR(NOT A, NOT B).",
    [["a", "SWITCH", "A", 40, 60], ["b", "SWITCH", "B", 40, 200], ["n1", "NOR", "n1", 260, 40], ["n2", "NOR", "n2", 260, 200], ["n3", "NOR", "n3", 480, 120], ["y", "LED", "Y", 700, 130]],
    [["a.Q", "n1.A"], ["a.Q", "n1.B"], ["b.Q", "n2.A"], ["b.Q", "n2.B"], ["n1.Y", "n3.A"], ["n2.Y", "n3.B"], ["n3.Y", "y.IN"]]),
  make("half-adder", "Half adder", "Adds two bits: Sum = A⊕B, Carry = A·B.", "The XOR gate produces the sum bit and the AND gate produces the carry. 1 + 1 = 10₂ (Sum 0, Carry 1).",
    [["a", "SWITCH", "A", 40, 60], ["b", "SWITCH", "B", 40, 200], ["x", "XOR", "XOR", 260, 40], ["n", "AND", "AND", 260, 200], ["s", "LED", "Sum", 480, 50], ["c", "LED", "Carry", 480, 210]],
    [["a.Q", "x.A"], ["b.Q", "x.B"], ["a.Q", "n.A"], ["b.Q", "n.B"], ["x.Y", "s.IN"], ["n.Y", "c.IN"]]),
  make("full-adder", "Full adder", "Adds A + B + Carry-in using two half adders and an OR gate.", "Sum = A⊕B⊕Cin. Carry-out = A·B + Cin·(A⊕B). Chain full adders to add multi-bit numbers.",
    [["a", "SWITCH", "A", 40, 40], ["b", "SWITCH", "B", 40, 160], ["ci", "SWITCH", "Cin", 40, 300], ["x1", "XOR", "XOR 1", 240, 60], ["a1", "AND", "AND 1", 240, 180], ["x2", "XOR", "XOR 2", 440, 90], ["a2", "AND", "AND 2", 440, 250], ["o", "OR", "OR", 640, 210], ["s", "LED", "Sum", 640, 80], ["co", "LED", "Cout", 840, 220]],
    [["a.Q", "x1.A"], ["b.Q", "x1.B"], ["a.Q", "a1.A"], ["b.Q", "a1.B"], ["x1.Y", "x2.A"], ["ci.Q", "x2.B"], ["x1.Y", "a2.A"], ["ci.Q", "a2.B"], ["a1.Y", "o.A"], ["a2.Y", "o.B"], ["x2.Y", "s.IN"], ["o.Y", "co.IN"]]),
  make("mux", "2-to-1 multiplexer", "Selects D0 or D1 using S, built from gates.", "Y = S'·D0 + S·D1. When S = 0 the output follows D0; when S = 1 it follows D1.",
    [["d0", "SWITCH", "D0", 40, 40], ["d1", "SWITCH", "D1", 40, 160], ["s", "SWITCH", "S", 40, 300], ["n", "NOT", "NOT", 220, 300], ["a1", "AND", "AND 1", 420, 70], ["a2", "AND", "AND 2", 420, 200], ["o", "OR", "OR", 620, 130], ["y", "LED", "Y", 820, 140]],
    [["s.Q", "n.A"], ["d0.Q", "a1.A"], ["n.Y", "a1.B"], ["d1.Q", "a2.A"], ["s.Q", "a2.B"], ["a1.Y", "o.A"], ["a2.Y", "o.B"], ["o.Y", "y.IN"]]),
  make("sr-latch", "SR latch", "Set/reset memory element.", "S=1 sets Q to 1, R=1 resets it to 0, S=R=0 holds the stored bit. S=R=1 is forbidden.",
    [["s", "SWITCH", "S", 40, 60], ["r", "SWITCH", "R", 40, 200], ["l", "SR_LATCH", "SR latch", 260, 110], ["q", "LED", "Q", 500, 100], ["qn", "LED", "Q̄", 500, 220]],
    [["s.Q", "l.S"], ["r.Q", "l.R"], ["l.Q", "q.IN"], ["l.QN", "qn.IN"]]),
  make("dff", "D flip-flop", "Stores D on each rising clock edge.", "Use the clock controls to pulse CLK. Q copies D only at the 0→1 transition; changes to D between edges are ignored.",
    [["d", "SWITCH", "D", 40, 60], ["clk", "CLOCK", "CLK", 40, 200], ["f", "DFF", "D flip-flop", 260, 100], ["q", "LED", "Q", 500, 100], ["qn", "LED", "Q̄", 500, 220]],
    [["d.Q", "f.D"], ["clk.CLK", "f.CLK"], ["f.Q", "q.IN"], ["f.QN", "qn.IN"]]),
  make("counter", "3-bit binary counter", "Asynchronous (ripple) up counter built from T flip-flops.", "Each T flip-flop toggles (T=1). The first is clocked by CLK; each next stage is clocked by the previous stage's Q̄, so it toggles when the previous bit falls from 1 to 0. Count: 0→7→0.",
    [["clk", "CLOCK", "CLK", 40, 60], ["one", "HIGH", "HIGH", 40, 260], ["t0", "TFF", "T0", 240, 60], ["t1", "TFF", "T1", 440, 60], ["t2", "TFF", "T2", 640, 60], ["out", "BINOUT", "Count", 860, 80, { bits: 3 }]],
    [["clk.CLK", "t0.CLK"], ["one.Q", "t0.T"], ["one.Q", "t1.T"], ["one.Q", "t2.T"], ["t0.QN", "t1.CLK"], ["t1.QN", "t2.CLK"], ["t0.Q", "out.D0"], ["t1.Q", "out.D1"], ["t2.Q", "out.D2"]]),
  make("shift-register", "4-bit shift register", "Serial-in shift register from four D flip-flops.", "On each rising edge every stage copies the previous one, so a bit entered at D moves one position along per clock pulse. All flip-flops sample at the same instant.",
    [["d", "SWITCH", "D", 40, 60], ["clk", "CLOCK", "CLK", 40, 220], ["f0", "DFF", "FF0", 220, 40], ["f1", "DFF", "FF1", 400, 40], ["f2", "DFF", "FF2", 580, 40], ["f3", "DFF", "FF3", 760, 40], ["l0", "LED", "Q0", 220, 240], ["l1", "LED", "Q1", 400, 240], ["l2", "LED", "Q2", 580, 240], ["l3", "LED", "Q3", 760, 240]],
    [["d.Q", "f0.D"], ["f0.Q", "f1.D"], ["f1.Q", "f2.D"], ["f2.Q", "f3.D"], ["clk.CLK", "f0.CLK"], ["clk.CLK", "f1.CLK"], ["clk.CLK", "f2.CLK"], ["clk.CLK", "f3.CLK"], ["f0.Q", "l0.IN"], ["f1.Q", "l1.IN"], ["f2.Q", "l2.IN"], ["f3.Q", "l3.IN"]]),
];
export const getExample = id => EXAMPLES.find(e => e.id === id);
