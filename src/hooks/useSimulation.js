import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createState, settle, syncState, toggleClock, pulseClock, resetState, clockLevel, probes, sampleProbes } from "../engine/simulator.js";

export const MAX_TRACE = 48;
/** Owns the simulation state for one circuit. The engine is pure; this hook only keeps the latest settled state. */
export function useSimulation(circuit) {
  const ref = useRef(null);
  const [tick, setTick] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [running, setRunning] = useState(false);
  const [hz, setHz] = useState(2);
  const [trace, setTrace] = useState({ sig: "", names: [], samples: [], clock: [] });

  const result = useMemo(() => {
    const base = ref.current?.state ?? createState(circuit);
    const r = settle(circuit, syncState(circuit, base));
    ref.current = r; return r;
  }, [circuit, tick]);

  const record = useCallback((c, r, force, clk) => {
    const list = probes(c), sig = list.map(p => p.id + p.pin).join("|"), sample = sampleProbes(c, r);
    setTrace(t => {
      const same = t.sig === sig;
      const samples = same ? t.samples : [], clock = same ? t.clock : [];
      if (same && !force && JSON.stringify(samples[samples.length - 1]) === JSON.stringify(sample)) return t;
      return { sig, names: list.map(p => p.name), samples: [...samples, sample].slice(-MAX_TRACE), clock: [...clock, clk].slice(-MAX_TRACE) };
    });
  }, []);
  useEffect(() => { if (!result.errors.length) record(circuit, result, false, clockLevel(circuit, result.state)); }, [result, circuit, record]);

  const apply = useCallback(fn => {
    const base = syncState(circuit, ref.current?.state ?? createState(circuit));
    const r = fn(circuit, base); ref.current = r; setTick(t => t + 1);
    if (!r.errors.length) record(circuit, r, true, clockLevel(circuit, r.state));
  }, [circuit, record]);

  const halfStep = useCallback(() => apply(toggleClock), [apply]);
  const step = useCallback(() => { apply(pulseClock); setCycles(c => c + 1); }, [apply]);
  const reset = useCallback(() => { ref.current = null; setCycles(0); setRunning(false); setTrace({ sig: "", names: [], samples: [], clock: [] }); setTick(t => t + 1); }, []);
  const clearTrace = useCallback(() => setTrace(t => ({ ...t, samples: [], clock: [] })), []);

  const hasClock = circuit.components.some(c => c.type === "CLOCK");
  const toggleRef = useRef(halfStep); toggleRef.current = halfStep;
  const levelRef = useRef(0); levelRef.current = clockLevel(circuit, result.state);
  useEffect(() => {
    if (!running || !hasClock) return undefined;
    const id = setInterval(() => { toggleRef.current(); if (levelRef.current === 0) setCycles(c => c + 1); }, 500 / hz);
    return () => clearInterval(id);
  }, [running, hz, hasClock]);
  useEffect(() => { if (result.errors.length) setRunning(false); }, [result.errors.length]);

  return { result, running, setRunning, hz, setHz, hasClock, halfStep, step, reset, cycles, trace, clearTrace, clock: clockLevel(circuit, result.state) };
}
