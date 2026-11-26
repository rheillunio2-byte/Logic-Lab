import { useEffect, useState } from "react";
export const ROUTES = ["dashboard", "builder", "truth-table", "boolean", "karnaugh", "learn", "challenges", "library", "settings", "about"];
export function parseHash(h = location.hash) {
  const [path, query = ""] = h.replace(/^#\/?/, "").split("?");
  const route = ROUTES.includes(path) ? path : "dashboard";
  return { route, params: new URLSearchParams(query) };
}
export function useHashRoute() {
  const [state, setState] = useState(() => parseHash());
  useEffect(() => { const on = () => setState(parseHash()); window.addEventListener("hashchange", on); return () => window.removeEventListener("hashchange", on); }, []);
  return state;
}
export const navigate = (route, params) => { location.hash = `#/${route}${params ? `?${new URLSearchParams(params)}` : ""}`; };
