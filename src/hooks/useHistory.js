import { useCallback, useReducer } from "react";
// Small undo/redo store used by pages that own a private circuit (e.g. challenges).
function reducer(s, a) {
  if (a.type === "set") return { present: a.value, past: a.history ? [...s.past, s.present].slice(-100) : s.past, future: a.history ? [] : s.future };
  if (a.type === "undo") return s.past.length ? { present: s.past.at(-1), past: s.past.slice(0, -1), future: [s.present, ...s.future] } : s;
  if (a.type === "redo") return s.future.length ? { present: s.future[0], past: [...s.past, s.present], future: s.future.slice(1) } : s;
  if (a.type === "reset") return { present: a.value, past: [], future: [] };
  return s;
}
export function useHistory(initial) {
  const [s, d] = useReducer(reducer, { present: initial, past: [], future: [] });
  return { value: s.present, set: useCallback((value, { history = true } = {}) => d({ type: "set", value, history }), []), undo: useCallback(() => d({ type: "undo" }), []), redo: useCallback(() => d({ type: "redo" }), []),
    reset: useCallback(value => d({ type: "reset", value }), []), canUndo: s.past.length > 0, canRedo: s.future.length > 0 };
}
