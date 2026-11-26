import React, { useState } from "react";
import { Activity, LayoutDashboard, GitBranch, Table2, Sigma, BookOpen, Trophy, Library, Settings, Info, Undo2, Redo2, Sun, Moon, Menu, X, Check, Share2, Download, Save, LayoutGrid, CircleHelp } from "lucide-react";
import { useWorkspace } from "../../state/WorkspaceContext.jsx";
import { exportCircuit } from "../../engine/circuit.js";
import { downloadFile, safeFilename, copyText } from "../../utils/download.js";
import { makeShareLink } from "../../utils/share.js";
import { navigate } from "../../hooks/useHashRoute.js";

export const NAV = [["dashboard", "Dashboard", LayoutDashboard], ["builder", "Circuit Builder", GitBranch], ["truth-table", "Truth Table", Table2], ["boolean", "Boolean Algebra", Sigma], ["karnaugh", "Karnaugh Map", LayoutGrid], ["learn", "Learning Center", BookOpen], ["challenges", "Logic Challenges", Trophy], ["library", "Circuit Library", Library], ["settings", "Settings", Settings], ["about", "About LogicLab", Info]];

export function Sidebar({ route, open, onClose }) {
  return <>
    {open && <div className="scrim" onClick={onClose} />}
    <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main navigation">
      <div className="brand"><div className="brand-mark"><Activity size={20} /></div><div><strong>LogicLab</strong><span>DIGITAL LOGIC STUDIO</span></div><button className="icon-btn close-nav" onClick={onClose} aria-label="Close menu"><X size={16} /></button></div>
      <nav>{NAV.map(([id, label, Icon]) => <a key={id} href={`#/${id}`} className={`side-link ${route === id ? "active" : ""}`} aria-current={route === id ? "page" : undefined} onClick={onClose}><Icon size={17} /> {label}</a>)}</nav>
      <div className="side-foot">LOGICLAB <span>v2.0.0</span></div>
    </aside></>;
}

export function TopBar({ route, onMenu }) {
  const { circuit, rename, undo, redo, canUndo, canRedo, saveStatus, settings, updateSettings, toast, library } = useWorkspace();
  const [name, setName] = useState(null);
  const label = NAV.find(n => n[0] === route)?.[1] ?? "LogicLab";
  const status = saveStatus.state === "saving" ? "Saving…" : saveStatus.state === "error" ? `Not saved: ${saveStatus.error}` : saveStatus.state === "off" ? "Autosave off" : `Saved ${new Date(saveStatus.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const share = async () => { const r = makeShareLink(circuit); if (!r.ok) return toast(r.error, "error"); const ok = await copyText(r.url); toast(ok ? "Share link copied. The circuit is encoded in the link; nothing is uploaded." : "Could not copy the link.", ok ? "success" : "error"); };
  return <header className="topbar">
    <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu"><Menu size={18} /></button>
    <div className="crumbs"><span className="muted">{label}</span><span className="sepc">/</span>
      <input className="title-input" aria-label="Circuit name" value={name ?? circuit.name} maxLength={60} onChange={e => setName(e.target.value)} onBlur={() => { if (name !== null) rename(name.trim()); setName(null); }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} /></div>
    <span className={`save-status ${saveStatus.state}`} role="status">{saveStatus.state === "saved" && <Check size={12} />} {status}</span>
    <div className="top-actions">
      <button className="icon-btn" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
      <button className="icon-btn" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Y)"><Redo2 size={16} /></button>
      <button className="icon-btn" onClick={() => library.save(circuit.name)} aria-label="Save to library" title="Save to library"><Save size={16} /></button>
      <button className="icon-btn" onClick={() => downloadFile(safeFilename(circuit.name, "json"), exportCircuit(circuit))} aria-label="Export JSON" title="Export as JSON"><Download size={16} /></button>
      <button className="icon-btn" onClick={share} aria-label="Copy share link" title="Copy share link"><Share2 size={16} /></button>
      <button className="icon-btn" onClick={() => updateSettings({ theme: settings.theme === "dark" ? "light" : "dark" })} aria-label={`Switch to ${settings.theme === "dark" ? "light" : "dark"} theme`} title="Toggle theme">{settings.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
      <button className="icon-btn" onClick={() => navigate("learn")} aria-label="Help: open the Learning Center" title="Help"><CircleHelp size={16} /></button>
    </div>
  </header>;
}
