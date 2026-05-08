import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type {
  GridSize,
  Layout,
  PanelConfig,
  Symbol as SymbolMeta,
  Timeframe,
} from "../api/types";
import PanelChart from "./PanelChart";
import { createCrosshairBus } from "./crosshairBus";

const PANEL_COUNT: Record<GridSize, number> = { "1": 1, "2": 2, "4": 4 };

const DEFAULT_PANELS: PanelConfig[] = [
  { symbol: "ESM6", tf: "1m" },
  { symbol: "ESM6", tf: "5m" },
  { symbol: "ESM6", tf: "15m" },
  { symbol: "ESM6", tf: "1h" },
];

function panelsForGrid(grid: GridSize, current: PanelConfig[]): PanelConfig[] {
  const n = PANEL_COUNT[grid];
  const out: PanelConfig[] = [];
  for (let i = 0; i < n; i++) out.push(current[i] ?? DEFAULT_PANELS[i] ?? DEFAULT_PANELS[0]);
  return out;
}

export default function MultiChartPage() {
  const [symbols, setSymbols] = useState<SymbolMeta[]>([]);
  const [grid, setGrid] = useState<GridSize>("2");
  const [panels, setPanels] = useState<PanelConfig[]>(() => panelsForGrid("2", DEFAULT_PANELS));
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [activeLayout, setActiveLayout] = useState<string>(""); // layout id
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const crosshairBus = useMemo(() => createCrosshairBus(), []);

  useEffect(() => {
    let cancelled = false;
    api.symbols().then((s) => { if (!cancelled) setSymbols(s); }).catch(() => {});
    api.listLayouts().then((ls) => {
      if (cancelled) return;
      setLayouts(ls);
      const def = ls.find((l) => l.is_default);
      if (def) {
        setActiveLayout(def.id);
        setGrid(def.grid);
        setPanels(panelsForGrid(def.grid, def.panels));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const onChangeGrid = useCallback((g: GridSize) => {
    setGrid(g);
    setPanels((cur) => panelsForGrid(g, cur));
    setActiveLayout("");
  }, []);

  const onChangePanel = useCallback((idx: number, symbol: string, tf: Timeframe) => {
    setPanels((cur) => cur.map((p, i) => (i === idx ? { symbol, tf } : p)));
    setActiveLayout("");
  }, []);

  const loadLayout = useCallback((id: string) => {
    if (!id) return;
    setErr(null);
    setMsg(null);
    api.getLayout(id).then((l) => {
      setActiveLayout(l.id);
      setGrid(l.grid);
      setPanels(panelsForGrid(l.grid, l.panels));
    }).catch((e) => setErr(String(e)));
  }, []);

  const save = useCallback(async () => {
    setErr(null); setMsg(null);
    const name = window.prompt("Layout name?", `Layout ${layouts.length + 1}`);
    if (!name) return;
    try {
      const l = await api.createLayout({ name, grid, panels, is_default: false });
      setLayouts((cur) => [l, ...cur]);
      setActiveLayout(l.id);
      setMsg(`saved as "${l.name}"`);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setErr(m.includes("402") ? "Plan layout quota reached — upgrade for more." : m);
    }
  }, [grid, panels, layouts.length]);

  const overwrite = useCallback(async () => {
    if (!activeLayout) return;
    setErr(null); setMsg(null);
    const cur = layouts.find((l) => l.id === activeLayout);
    if (!cur) return;
    try {
      const l = await api.updateLayout(activeLayout, { name: cur.name, grid, panels, is_default: cur.is_default });
      setLayouts((arr) => arr.map((x) => (x.id === l.id ? l : x)));
      setMsg(`updated "${l.name}"`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [activeLayout, grid, panels, layouts]);

  const remove = useCallback(async () => {
    if (!activeLayout) return;
    if (!window.confirm("Delete this layout?")) return;
    try {
      await api.deleteLayout(activeLayout);
      setLayouts((cur) => cur.filter((l) => l.id !== activeLayout));
      setActiveLayout("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [activeLayout]);

  return (
    <div className="multi-page">
      <div className="topbar">
        <strong>Multi</strong>
        <div className="seg">
          {(["1", "2", "4"] as GridSize[]).map((g) => (
            <button key={g} className={grid === g ? "seg-on" : ""} onClick={() => onChangeGrid(g)}>
              {g}
            </button>
          ))}
        </div>
        <select value={activeLayout} onChange={(e) => loadLayout(e.target.value)}>
          <option value="">— layouts —</option>
          {layouts.map((l) => (
            <option key={l.id} value={l.id}>{l.name}{l.is_default ? " ★" : ""}</option>
          ))}
        </select>
        <button onClick={save}>save as</button>
        {activeLayout && <button onClick={overwrite}>update</button>}
        {activeLayout && <button onClick={remove}>delete</button>}
        <span className="spacer" />
        {err && <span className="error small">{err}</span>}
        {msg && <span className="muted small">{msg}</span>}
        <Link to="/" className="link">← back</Link>
      </div>
      <div className={`multi-grid grid-${grid}`}>
        {panels.map((p, i) => (
          <PanelChart
            key={i}
            symbol={p.symbol}
            tf={p.tf}
            symbols={symbols}
            onChange={(sym, tf) => onChangePanel(i, sym, tf)}
            crosshairBus={crosshairBus}
          />
        ))}
      </div>
    </div>
  );
}
