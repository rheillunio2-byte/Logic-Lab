# ⚡ LogicLab — Interactive Digital Logic Studio

LogicLab is a browser-based digital logic learning and simulation studio built with **React, JavaScript and Vite**. Build circuits on a drag-and-drop canvas, wire components together, watch signals propagate, generate truth and state tables, simplify Boolean expressions, solve Karnaugh maps, study 14 short lessons, and practise with challenges that are graded by simulating your circuit.

Everything runs locally in the browser. There is no backend, no account system and no tracking; saved circuits stay in `localStorage`.

> **Screenshots:** run `npm run dev` to see the current interface. The screenshots shipped in `images/` come from LogicLab v1.0 and no longer match the interface, so they are not embedded here. Replace them with fresh captures of v2.0 when publishing.

---

## ✨ Features

**Circuit Builder**
- Drag components from a searchable library (or click to add), move them, box-select (Shift + drag), duplicate, rename and delete.
- Click-or-drag wiring from output pins to input pins, with HIGH / LOW / unknown wire colours and live values.
- Connection validation with explanatory messages: one driver per input, output-to-input only, and no combinational feedback loops.
- Zoom, pan, fit to screen, grid snapping, undo / redo, select all, nudge with arrow keys, keyboard shortcuts, and a confirmed "clear circuit".
- Properties inspector (pin table, gate input count, bit widths, switch state, stored flip-flop state).
- Simulation controls: pulse, half-step, continuous run at 1–8 Hz, reset, and a step-based timing diagram.

**Simulation engine** (`src/engine/`, pure JavaScript, unit tested)
- Three-valued signals (0, 1, unknown): unconnected inputs are never silently LOW, and warnings name the pin.
- Dependency-ordered evaluation, cycle detection, bounded settling (it reports "did not settle" instead of freezing).
- Rising-edge detection, simultaneous sampling of all flip-flops (current state vs next state), asynchronous reset.

**Truth tables and analysis**
- Truth tables for combinational circuits (multiple outputs, up to 10 inputs), CSV export and copy.
- Circuits with memory get a **state-transition table** instead of a misleading static truth table.
- Boolean Algebra workspace: safe expression parser (no `eval`), evaluation, step-by-step algebraic simplification, exact minimal SOP / POS (Quine–McCluskey), equivalence checker with counterexamples, and truth table → expression.
- Karnaugh map solver for 2, 3 and 4 variables: Gray-code layout, minterms / maxterms / don't-cares, wrap-around groups, explanation of the grouping.

**Learning**
- Learning Center with 14 lessons (objectives, explanations, formulas, truth tables, interactive demos, knowledge checks, common mistakes).
- 13 challenges (Beginner → Advanced) graded on behaviour with hints and specific feedback.
- 12 ready-made example circuits, each loadable into the builder.

**Workspace**
- Autosaved workspace, circuit library (save, load, rename, duplicate, delete), JSON export / import with schema version and validation, share links (circuit encoded in the URL, nothing uploaded).
- Dark / light theme, reduced-motion option, responsive layout, focus indicators, tooltips, confirmation dialogs, toasts, error boundary.

## 🧩 Supported components

| Category | Components |
|---|---|
| Logic gates | AND, OR, NAND, NOR, XOR, XNOR (2–8 inputs), NOT, Buffer |
| Inputs | Switch, Constant HIGH, Constant LOW, Clock |
| Outputs | LED, Binary output (1–8 bits), Hex display, 7-segment display |
| Sequential | SR latch, D latch, D flip-flop, JK flip-flop, T flip-flop (optional async RST) |
| Combinational | Multiplexer, Demultiplexer (2 or 4 way), Decoder (1–3 bits, optional EN), 4-to-2 priority encoder, Half adder, Full adder, 2-bit comparator |

Binary counters and shift registers are provided as example circuits built from flip-flops (see the Library).

## 🛠️ Technology stack

React 18, JavaScript (ES modules), Vite 6, plain CSS (design tokens, dark/light themes), Lucide React icons. Tests use Node's built-in test runner, so **no dependencies were added** in v2.0.

## 🚀 Getting started

```bash
git clone https://github.com/rheillunio2-byte/Logic-Lab.git
cd Logic-Lab
npm install
npm run dev        # development server
npm run build      # production build in dist/
npm run preview    # serve the production build
npm test           # run the automated tests
```

Requires Node.js 20 or newer.

### Deploying to Vercel
Import the repository in Vercel and keep the detected defaults (framework: Vite, build command `npm run build`, output directory `dist`). Navigation uses URL hashes (`#/builder`), so no rewrite rules are needed.

## 📖 Usage guide

1. **Circuit Builder:** add two Switches, an AND gate and an LED. Drag from a gate's output pin (right side) to an input pin (left side). Click a switch to toggle it. Click a wire or component to select it and press Delete to remove it.
2. **Sequential circuits:** add a Clock and a D flip-flop, wire `CLK`, then use **Pulse** (a full clock cycle) or **Toggle** (a half cycle) under the canvas. The timing diagram records every step.
3. **Truth Table:** open the page to get a table for the circuit currently on the canvas; export it as CSV.
4. **Boolean Algebra / Karnaugh Map:** type `A'B + AB'`, `(A NAND B) NOR C`, etc. Notation help is on the page.
5. **Challenges:** build the circuit, name switches / LEDs after the challenge inputs and outputs (or create them in that order) and press **Check my circuit**.
6. **Library:** save, rename, export and import circuits; load any example.

Keyboard shortcuts in the editor: `Del` delete, `Ctrl+A` select all, `Ctrl+Z` / `Ctrl+Y` undo / redo, `Ctrl+D` duplicate, arrows nudge, `+` / `-` zoom, `F` fit, `G` snap, `Esc` cancel.

## 🔬 Simulation conventions

- Signals are `0`, `1` or `X` (unknown). Optional pins (`RST`, decoder `EN`) have documented defaults; every other unconnected input is `X`.
- Sequential elements power on with `Q = 0`. Edge-triggered parts update on a rising clock edge only.
- SR latch with `S = R = 1` is flagged as forbidden and its state is unknown after release.
- Combinational feedback loops are refused; use a latch or flip-flop component for memory.

## 🧪 Testing

`npm test` runs 50 tests under `tests/` covering: all gates and multi-input gates, wiring rules, cycle detection, signal propagation, flip-flop / latch behaviour and clock edges, truth and state tables, JSON import / export (including malformed and hostile files), the Boolean parser and simplifier (including randomised equivalence checks of every simplification step), Quine–McCluskey, Karnaugh-map layout and groups, all example circuits and a reference solution for every challenge.

## 📂 Project structure

```
src/
  engine/       components, circuit, simulator, truthTable, booleanParser,
                simplifier, minimizer, karnaugh, challenges        (no React)
  components/   circuit/ (canvas, palette, inspector, sim controls, timing),
                layout/, common/, truth-table/, learning/
  pages/        Dashboard, CircuitBuilder, TruthTable, BooleanAlgebra, KarnaughMap,
                LearningCenter, Challenges, CircuitLibrary, Settings, About
  state/        WorkspaceContext (history, autosave, library, settings, toasts)
  hooks/        useSimulation, useHistory, useHashRoute
  data/         examples, challenges, lessons
  utils/        storage, download, share
tests/          node:test suites
```

## ⚠️ Known limitations

- Feedback built from plain gates (for example a latch made of two cross-coupled NOR gates) is rejected; use the latch components.
- The simulator is logical, not electrical: there are no propagation delays or glitches, and the timing diagram shows discrete simulation steps rather than nanoseconds.
- Wiring is pointer-based (mouse or touch). Selection, deletion, duplication, nudging and zoom work from the keyboard, but creating wires does not yet.
- Truth tables are limited to 10 inputs, state tables to 6 memory elements and 6 switches, minimisation to 8 variables, K-maps to 4 variables.
- Pinch-to-zoom is not implemented (use the zoom buttons or the wheel).
- No ESLint configuration is included.

## 🔮 Roadmap

Keyboard-operable wiring, multi-bit buses, user-defined sub-circuits, propagation-delay simulation, a built-in 4-bit counter / register component, more lessons and challenges.

## 🤝 Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md). Run `npm test` and `npm run build` before opening a pull request.

## 👨‍💻 Developer

**Rheil Evans T. Lunio (RETL)** — Computer Science student, University of Science and Technology of Southern Philippines (USTP), Cagayan de Oro.

Suggested GitHub topics: `digital-logic`, `logic-gates`, `circuit-simulator`, `boolean-algebra`, `karnaugh-map`, `truth-table`, `flip-flop`, `react`, `vite`, `education`.

## 📄 License

MIT License. See [LICENSE](LICENSE).
