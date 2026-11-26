import React, { useEffect, useRef } from "react";
import { Check, X, AlertTriangle, Info } from "lucide-react";
import { useWorkspace } from "../../state/WorkspaceContext.jsx";

export function Toasts() {
  const { toasts, dismissToast } = useWorkspace();
  return <div className="toasts" aria-live="polite" role="status">{toasts.map(t => <div key={t.id} className={`toast ${t.type}`}>{t.type === "error" ? <AlertTriangle size={16} /> : t.type === "success" ? <Check size={16} /> : <Info size={16} />}<span>{t.message}</span><button aria-label="Dismiss notification" onClick={() => dismissToast(t.id)}><X size={14} /></button></div>)}</div>;
}
export function ConfirmDialog() {
  const { dialog, closeDialog } = useWorkspace(), ref = useRef(null);
  useEffect(() => { if (dialog) ref.current?.focus(); }, [dialog]);
  useEffect(() => { if (!dialog) return undefined; const k = e => { if (e.key === "Escape") closeDialog(false); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [dialog, closeDialog]);
  if (!dialog) return null;
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeDialog(false); }}><div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg">
    <h2 id="dlg-title">{dialog.title}</h2><p id="dlg-msg">{dialog.message}</p>
    <div className="btn-row end"><button className="btn" onClick={() => closeDialog(false)}>Cancel</button><button ref={ref} className={`btn ${dialog.danger ? "danger solid" : "primary"}`} onClick={() => closeDialog(true)}>{dialog.confirmLabel || "Confirm"}</button></div></div></div>;
}
export function PromptDialog({ title, label, initial = "", confirmLabel = "Save", onSubmit, onCancel }) {
  const [v, setV] = React.useState(initial), ref = useRef(null);
  useEffect(() => ref.current?.select(), []);
  return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}><form className="modal" role="dialog" aria-modal="true" aria-labelledby="pd-title" onSubmit={e => { e.preventDefault(); if (v.trim()) onSubmit(v.trim()); }} onKeyDown={e => { if (e.key === "Escape") onCancel(); }}>
    <h2 id="pd-title">{title}</h2><label className="field"><span>{label}</span><input ref={ref} className="input" value={v} maxLength={60} onChange={e => setV(e.target.value)} /></label>
    <div className="btn-row end"><button type="button" className="btn" onClick={onCancel}>Cancel</button><button type="submit" className="btn primary" disabled={!v.trim()}>{confirmLabel}</button></div></form></div>;
}
export const Spinner = ({ label = "Loading…" }) => <div className="spinner-wrap" role="status"><span className="spinner" aria-hidden="true" /> {label}</div>;
export const EmptyState = ({ title, children, action }) => <div className="empty-state"><h3>{title}</h3><p>{children}</p>{action}</div>;
