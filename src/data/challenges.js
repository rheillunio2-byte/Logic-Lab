// Challenge definitions. `fn` (combinational) or `sequence` (sequential) is the ground truth used for grading.
const GATES = ["AND", "OR", "NOT", "NAND", "NOR", "XOR", "XNOR", "BUFFER"];
const gateChallenge = (id, type, title, fn, formula, hints) => ({
  id, level: "Beginner", title, kind: "comb", inputs: type === "NOT" ? ["A"] : ["A", "B"], outputs: ["Y"], allowed: [type], required: [type], fn,
  objective: `Build a circuit where LED Y shows ${formula} for the switches.`, details: `Use one ${type} gate. Connect the switches to its inputs and its output to the LED.`, hints,
});
export const CHALLENGES = [
  gateChallenge("and", "AND", "Build an AND gate", ([a, b]) => [a & b], "A·B", ["Drag two switches, an AND gate and an LED onto the canvas.", "Wire each switch Q pin to an AND input (A and B), then wire Y to the LED."]),
  gateChallenge("or", "OR", "Build an OR gate", ([a, b]) => [a | b], "A + B", ["The OR output is 1 whenever either switch is 1.", "Wire both switches into one OR gate, then the gate into the LED."]),
  gateChallenge("not", "NOT", "Build a NOT gate", ([a]) => [a ^ 1], "A'", ["A NOT gate has a single input.", "Switch A → NOT → LED Y."]),
  gateChallenge("xor", "XOR", "Build an XOR gate", ([a, b]) => [a ^ b], "A⊕B", ["XOR is 1 only when the inputs are different.", "Use one XOR gate with both switches as inputs."]),
  { id: "nand", level: "Intermediate", title: "NAND from AND and NOT", kind: "comb", inputs: ["A", "B"], outputs: ["Y"], allowed: ["AND", "NOT"], required: ["AND", "NOT"], fn: ([a, b]) => [(a & b) ^ 1],
    objective: "Build Y = (A·B)' using only an AND gate and a NOT gate.", details: "NAND is AND followed by an inversion.", hints: ["Think of NAND as two steps.", "AND the two switches, then pass the result through NOT."] },
  { id: "nor", level: "Intermediate", title: "NOR from OR and NOT", kind: "comb", inputs: ["A", "B"], outputs: ["Y"], allowed: ["OR", "NOT"], required: ["OR", "NOT"], fn: ([a, b]) => [(a | b) ^ 1],
    objective: "Build Y = (A + B)' using only an OR gate and a NOT gate.", details: "NOR is OR followed by an inversion.", hints: ["Same idea as NAND, but starting from OR.", "OR the switches, then invert the result."] },
  { id: "half-adder", level: "Intermediate", title: "Half adder", kind: "comb", inputs: ["A", "B"], outputs: ["Sum", "Carry"], allowed: GATES, fn: ([a, b]) => [a ^ b, a & b],
    objective: "Add two bits. Sum = A⊕B and Carry = A·B.", details: "Use two LEDs named Sum and Carry (or create them in that order).", hints: ["Which gate is 1 when exactly one input is 1?", "Which gate is 1 only for 1 + 1?", "Feed both switches into an XOR (Sum) and an AND (Carry)."] },
  { id: "full-adder", level: "Intermediate", title: "Full adder", kind: "comb", inputs: ["A", "B", "Cin"], outputs: ["Sum", "Cout"], allowed: GATES, fn: ([a, b, c]) => [a ^ b ^ c, (a & b) | (c & (a ^ b))],
    objective: "Add A + B + Cin. Sum = A⊕B⊕Cin; Cout = A·B + Cin·(A⊕B).", details: "Built-in adder components are disabled: use basic gates.", hints: ["A full adder is two half adders plus an OR gate.", "First half adder: A and B. Second half adder: its sum and Cin.", "Cout = OR of the two half-adder carries."] },
  { id: "mux", level: "Intermediate", title: "2-to-1 multiplexer", kind: "comb", inputs: ["D0", "D1", "S"], outputs: ["Y"], allowed: GATES, fn: ([d0, d1, s]) => [s ? d1 : d0],
    objective: "Y = D0 when S = 0 and Y = D1 when S = 1.", details: "Built-in multiplexers are disabled: use basic gates.", hints: ["Y = S'·D0 + S·D1.", "You need a NOT for S, two ANDs and an OR."] },
  { id: "sr", level: "Advanced", title: "Gated SR latch", kind: "seq", inputs: ["S", "R", "E"], outputs: ["Q"], allowed: ["SR_LATCH", "AND", "OR", "NOT", "NAND", "NOR"], required: ["SR_LATCH"],
    objective: "Build a latch whose S and R inputs only take effect while Enable E = 1.", details: "Use the SR latch component and gates. When E = 0 the stored bit must hold.",
    hints: ["The latch inputs should be S·E and R·E.", "Put an AND gate in front of each latch input, both sharing E."],
    sequence: [{ set: { S: 1, R: 0, E: 0 }, expect: { Q: 0 }, why: "With E=0 the set request must be ignored." }, { set: { E: 1 }, expect: { Q: 1 } }, { set: { S: 0, R: 0 }, expect: { Q: 1 } }, { set: { E: 0, R: 1 }, expect: { Q: 1 }, why: "With E=0 the reset request must be ignored." }, { set: { E: 1 }, expect: { Q: 0 } }, { set: { R: 0 }, expect: { Q: 0 } }] },
  { id: "dff", level: "Advanced", title: "D flip-flop from two D latches", kind: "seq", inputs: ["D"], outputs: ["Q"], allowed: ["D_LATCH", "NOT", "BUFFER"], required: ["D_LATCH", "NOT"],
    objective: "Build a rising-edge D flip-flop from a master and a slave D latch plus a NOT gate, driven by a Clock.", details: "Q must copy D only at the 0→1 clock edge.",
    hints: ["Two latches in series: the master is open while CLK = 0, the slave while CLK = 1.", "Master EN = NOT CLK, slave EN = CLK, slave D = master Q."],
    sequence: [{ set: { D: 1 }, expect: { Q: 0 }, why: "Q must not follow D before a clock edge." }, { clock: "rise", expect: { Q: 1 } }, { set: { D: 0 }, expect: { Q: 1 }, why: "While CLK stays HIGH the output must ignore D." }, { clock: "fall", expect: { Q: 1 } }, { clock: "rise", expect: { Q: 0 } }, { set: { D: 1 }, expect: { Q: 0 } }, { clock: "fall", expect: { Q: 0 } }] },
  { id: "counter2", level: "Advanced", title: "2-bit binary counter", kind: "seq", inputs: [], outputs: ["Q0", "Q1"], allowed: ["DFF", "TFF", "JKFF", "NOT", "AND", "OR", "XOR", "NAND", "NOR"], allowExtraSwitches: true,
    objective: "Count 00 → 01 → 10 → 11 → 00 on each clock pulse (Q1Q0).", details: "Use a Clock, flip-flops and any gates you need. Name the LEDs Q0 and Q1 (or create Q0 first). Extra switches are allowed and keep their value.",
    hints: ["Q0 toggles on every clock pulse.", "Q1 toggles only when Q0 is 1: T1 = Q0.", "With T flip-flops: T0 = HIGH (or a switch set to 1), T1 = Q0, both clocked by the same Clock."],
    sequence: [{ expect: { Q0: 0, Q1: 0 } }, { clock: "pulse", expect: { Q0: 1, Q1: 0 } }, { clock: "pulse", expect: { Q0: 0, Q1: 1 } }, { clock: "pulse", expect: { Q0: 1, Q1: 1 } }, { clock: "pulse", expect: { Q0: 0, Q1: 0 } }] },
  { id: "alu", level: "Advanced", title: "1-bit arithmetic logic unit", kind: "comb", inputs: ["A", "B", "S0", "S1"], outputs: ["Y"], allowed: GATES, fn: ([a, b, s0, s1]) => [[a & b, a | b, a ^ b, a ^ 1][s0 | (s1 << 1)]],
    objective: "Select an operation with S1S0: 00 → A·B, 01 → A+B, 10 → A⊕B, 11 → A'.", details: "Built-in multiplexers are disabled: combine gates.", hints: ["Compute all four results with gates first.", "Gate each result with a decoded select line (e.g. S1'·S0' for AND) and OR them together."] },
];
export const getChallenge = id => CHALLENGES.find(c => c.id === id);
