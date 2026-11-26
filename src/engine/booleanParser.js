// Safe Boolean expression parser (no eval). Notation:
//   NOT: ! ~ ¬ NOT or postfix '      AND: & * · ∧ . AND or adjacency (AB)
//   OR: + | ∨ OR                     XOR: ^ ⊕ XOR      NAND: ⊼ NAND     NOR: ⊽ NOR     XNOR: ⊙ XNOR
// Precedence (high→low): NOT, AND/NAND, XOR/XNOR, OR/NOR. NAND/NOR/XNOR are left-associative.
// Variables: a single letter, or a letter followed by digits/underscores (A1, X_2). A run of plain letters
// such as "AB" means A·B. Constants: 0, 1.
export class ParseError extends Error { constructor(message, pos) { super(message); this.pos = pos; } }

const WORDS = { AND: "AND", OR: "OR", NOT: "NOT", XOR: "XOR", NAND: "NAND", NOR: "NOR", XNOR: "XNOR", TRUE: "1", FALSE: "0" };
const SYMBOLS = { "!": "NOT", "~": "NOT", "¬": "NOT", "&": "AND", "*": "AND", "·": "AND", "∧": "AND", ".": "AND", "+": "OR", "|": "OR", "∨": "OR", "^": "XOR", "⊕": "XOR", "⊼": "NAND", "⊽": "NOR", "⊙": "XNOR" };
export const MAX_EXPR_LENGTH = 400;

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === "(") { tokens.push({ t: "(", pos: i++ }); continue; }
    if (ch === ")") { tokens.push({ t: ")", pos: i++ }); continue; }
    if (ch === "'" || ch === "’") { tokens.push({ t: "PRIME", pos: i++ }); continue; }
    if (ch === "0" || ch === "1") { tokens.push({ t: "CONST", v: +ch, pos: i++ }); continue; }
    if (SYMBOLS[ch]) { tokens.push({ t: SYMBOLS[ch], pos: i++ }); continue; }
    const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (m) {
      const word = m[0], up = word.toUpperCase();
      if (WORDS[up]) { const w = WORDS[up]; tokens.push(w === "0" || w === "1" ? { t: "CONST", v: +w, pos: i } : { t: w, pos: i }); }
      else if (/^[A-Za-z]+$/.test(word)) [...word].forEach((l, k) => tokens.push({ t: "VAR", v: l, pos: i + k }));
      else tokens.push({ t: "VAR", v: word, pos: i });
      i += word.length; continue;
    }
    throw new ParseError(`Unexpected character “${ch}” at position ${i + 1}.`, i);
  }
  return tokens;
}

export function parse(src) {
  if (typeof src !== "string" || !src.trim()) throw new ParseError("Enter a Boolean expression.", 0);
  if (src.length > MAX_EXPR_LENGTH) throw new ParseError(`Expression is too long (limit ${MAX_EXPR_LENGTH} characters).`, 0);
  const toks = tokenize(src);
  let p = 0, depth = 0;
  const peek = () => toks[p];
  const bin = (op, l, r) => ({ type: "bin", op, left: l, right: r });
  const startsOperand = t => t && (t.t === "VAR" || t.t === "CONST" || t.t === "(" || t.t === "NOT");
  function parseOr() {
    let l = parseXor();
    while (peek() && (peek().t === "OR" || peek().t === "NOR")) { const op = toks[p++].t; l = bin(op, l, parseXor()); }
    return l;
  }
  function parseXor() {
    let l = parseAnd();
    while (peek() && (peek().t === "XOR" || peek().t === "XNOR")) { const op = toks[p++].t; l = bin(op, l, parseAnd()); }
    return l;
  }
  function parseAnd() {
    let l = parseUnary();
    for (;;) {
      const t = peek();
      if (t && (t.t === "AND" || t.t === "NAND")) { p++; l = bin(t.t, l, parseUnary()); }
      else if (startsOperand(t)) l = bin("AND", l, parseUnary()); // implicit AND
      else break;
    }
    return l;
  }
  function parseUnary() {
    const t = peek();
    if (t && t.t === "NOT") { p++; return { type: "not", arg: parseUnary() }; }
    let node = parsePrimary();
    while (peek() && peek().t === "PRIME") { p++; node = { type: "not", arg: node }; }
    return node;
  }
  function parsePrimary() {
    const t = toks[p++];
    if (!t) throw new ParseError("Expression ended unexpectedly. An operand is missing.", src.length);
    if (t.t === "VAR") return { type: "var", name: t.v };
    if (t.t === "CONST") return { type: "const", value: t.v };
    if (t.t === "(") {
      if (++depth > 50) throw new ParseError("Parentheses are nested too deeply.", t.pos);
      const e = parseOr();
      if (!peek() || peek().t !== ")") throw new ParseError(`Missing closing parenthesis for the “(” at position ${t.pos + 1}.`, t.pos);
      p++; depth--; return e;
    }
    if (t.t === ")") throw new ParseError(`Unexpected “)” at position ${t.pos + 1}.`, t.pos);
    throw new ParseError(`Operator “${src.slice(t.pos, t.pos + 4).trim()}” at position ${t.pos + 1} needs an operand before it.`, t.pos);
  }
  const ast = parseOr();
  if (p < toks.length) throw new ParseError(`Unexpected “${toks[p].v ?? toks[p].t}” at position ${toks[p].pos + 1}.`, toks[p].pos);
  return ast;
}

export const tryParse = src => { try { return { ok: true, ast: parse(src) }; } catch (e) { if (e instanceof ParseError) return { ok: false, error: e.message, pos: e.pos }; throw e; } };

export function variablesOf(ast, set = new Set()) {
  if (ast.type === "var") set.add(ast.name);
  else if (ast.type === "not") variablesOf(ast.arg, set);
  else if (ast.type === "bin") { variablesOf(ast.left, set); variablesOf(ast.right, set); }
  else if (ast.args) ast.args.forEach(a => variablesOf(a, set));
  return [...set].sort();
}

export function evaluateAst(ast, env) {
  switch (ast.type) {
    case "const": return ast.value;
    case "var": if (!(ast.name in env)) throw new Error(`No value for variable ${ast.name}.`); return env[ast.name] ? 1 : 0;
    case "not": return evaluateAst(ast.arg, env) ? 0 : 1;
    case "and": return ast.args.every(a => evaluateAst(a, env)) ? 1 : 0;
    case "or": return ast.args.some(a => evaluateAst(a, env)) ? 1 : 0;
    case "bin": {
      const a = evaluateAst(ast.left, env), b = evaluateAst(ast.right, env);
      switch (ast.op) {
        case "AND": return a & b; case "OR": return a | b; case "XOR": return a ^ b;
        case "NAND": return (a & b) ^ 1; case "NOR": return (a | b) ^ 1; case "XNOR": return (a ^ b) ^ 1;
      }
    }
  }
  throw new Error("Unknown AST node.");
}

const PREC = { or: 1, NOR: 1, OR: 1, xor: 2, XOR: 2, XNOR: 2, and: 3, AND: 3, NAND: 3, not: 4, var: 5, const: 5 };
const prec = n => (n.type === "bin" ? PREC[n.op] : PREC[n.type]);
// Constants printed next to letters would be misread (A1 is a variable name), so they force explicit "·".
const hasConst = n => n.type === "const" || (n.type === "not" && n.arg.type === "const");
const SYM = { AND: " · ", OR: " + ", XOR: " ⊕ ", NAND: " NAND ", NOR: " NOR ", XNOR: " XNOR " };

/** Pretty-print in textbook notation: A'B + C. */
export function toExpression(ast) {
  const compact = variablesOf(ast).every(v => v.length === 1);
  const wrap = (n, min) => { const s = toExpression(n); return prec(n) < min ? `(${s})` : s; };
  switch (ast.type) {
    case "const": return String(ast.value);
    case "var": return ast.name;
    case "not": return ast.arg.type === "var" || ast.arg.type === "const" ? `${toExpression(ast.arg)}'` : `(${toExpression(ast.arg)})'`;
    case "and": return ast.args.map(a => wrap(a, 3)).join(compact && !ast.args.some(hasConst) ? "" : " · ");
    case "or": return ast.args.map(a => wrap(a, 2)).join(" + ");
    case "bin": {
      if (["NAND", "NOR", "XNOR"].includes(ast.op)) return `${wrapAll(ast.left)}${SYM[ast.op]}${wrapAll(ast.right)}`;
      if (ast.op === "AND") return `${wrap(ast.left, 3)}${compact && !hasConst(ast.left) && !hasConst(ast.right) ? "" : SYM.AND}${wrap(ast.right, 3)}`;
      if (ast.op === "XOR") return `${wrap(ast.left, 2)}${SYM.XOR}${wrap(ast.right, 3)}`;
      return `${wrap(ast.left, 1)}${SYM.OR}${wrap(ast.right, 2)}`;
    }
  }
  function wrapAll(n) { return n.type === "var" || n.type === "const" || n.type === "not" ? toExpression(n) : `(${toExpression(n)})`; }
}

export const MAX_VARS = 10;
export function truthTableOf(ast, vars = variablesOf(ast)) {
  if (vars.length > MAX_VARS) throw new Error(`Too many variables (${vars.length}). The limit is ${MAX_VARS}.`);
  const rows = [];
  for (let m = 0; m < 2 ** vars.length; m++) {
    const env = {}; vars.forEach((v, i) => { env[v] = (m >> (vars.length - 1 - i)) & 1; });
    rows.push({ minterm: m, inputs: vars.map(v => env[v]), output: evaluateAst(ast, env) });
  }
  return { vars, rows, minterms: rows.filter(r => r.output).map(r => r.minterm) };
}

export function equivalent(a, b) {
  const x = typeof a === "string" ? parse(a) : a, y = typeof b === "string" ? parse(b) : b;
  const vars = [...new Set([...variablesOf(x), ...variablesOf(y)])].sort();
  const ta = truthTableOf(x, vars), tb = truthTableOf(y, vars);
  const diff = ta.rows.find((r, i) => r.output !== tb.rows[i].output);
  return { equal: !diff, vars, counterexample: diff ? Object.fromEntries(vars.map((v, i) => [v, diff.inputs[i]])) : null };
}
