"use client";
import { useEffect, useRef, useState } from "react";

const MIN_WIN = 4;

export function useCanvasPanZoom(total: number, defaultVisible: number) {
  const initS = Math.max(0, total - defaultVisible);
  const containerRef  = useRef<HTMLDivElement>(null);
  const [size, setSize]         = useState({ w: 1000, h: 520 });
  const [winStart, setWinStart] = useState(initS);
  const [winEnd,   setWinEnd]   = useState(total - 1);
  const [isGrabbing, setIsGrabbing] = useState(false);

  const curS = useRef(initS);
  const curE = useRef(total - 1);
  const tgtS = useRef(initS);
  const tgtE = useRef(total - 1);
  const animId  = useRef<number | null>(null);
  const isDrag  = useRef(false);
  const dragX0  = useRef(0);
  const dragS0  = useRef(initS);
  const dragSpan = useRef(defaultVisible);

  // rAF-based lerp animation stored in ref so loop always sees latest version
  const animFn = useRef(() => {});
  animFn.current = () => {
    const L  = 0.18;
    const ns = curS.current + (tgtS.current - curS.current) * L;
    const ne = curE.current + (tgtE.current - curE.current) * L;
    const done = Math.abs(ns - tgtS.current) < 0.05 && Math.abs(ne - tgtE.current) < 0.05;
    curS.current = done ? tgtS.current : ns;
    curE.current = done ? tgtE.current : ne;
    setWinStart(Math.round(Math.max(0, curS.current)));
    setWinEnd(Math.round(Math.min(total - 1, curE.current)));
    if (!done) animId.current = requestAnimationFrame(animFn.current);
    else animId.current = null;
  };

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const e = entries[0];
      if (!e) return;
      setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Reset window when `total` changes (e.g. mock 50 bars → live 30 bars).
  // Without this, winStart/winEnd stay stale and the slice goes empty.
  useEffect(() => {
    if (total <= 0) return;
    const newE = total - 1;
    const newS = Math.max(0, newE - defaultVisible);
    curS.current = newS; curE.current = newE;
    tgtS.current = newS; tgtE.current = newE;
    setWinStart(newS);
    setWinEnd(newE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // Wheel — vertical = zoom, horizontal = pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const span = tgtE.current - tgtS.current;
      let ns = tgtS.current;
      let ne = tgtE.current;

      // Horizontal scroll → pan (keep span fixed)
      if (e.deltaX !== 0) {
        const rect  = el.getBoundingClientRect();
        const shift = (e.deltaX / rect.width) * span * 2.5;
        ns += shift;
        ne += shift;
        if (ns < 0)           { ns = 0;           ne = span; }
        if (ne > total - 1)   { ne = total - 1;   ns = Math.max(0, ne - span); }
      }

      // Vertical scroll → zoom (shrink/expand span around midpoint)
      if (e.deltaY !== 0) {
        const dir   = e.deltaY > 0 ? 1 : -1;
        const delta = (ne - ns) * 0.12 * dir;
        ns += delta / 2;
        ne -= delta / 2;
        if (ne - ns < MIN_WIN) {
          const mid = (ns + ne) / 2;
          ns = mid - MIN_WIN / 2;
          ne = mid + MIN_WIN / 2;
        }
        ns = Math.max(0, ns);
        ne = Math.min(total - 1, ne);
      }

      tgtS.current = ns;
      tgtE.current = ne;

      // Horizontal dominant → immediate update (no lerp) for 1:1 trackpad feel
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        curS.current = ns;
        curE.current = ne;
        setWinStart(Math.round(Math.max(0, ns)));
        setWinEnd(Math.round(Math.min(total - 1, ne)));
        if (animId.current) { cancelAnimationFrame(animId.current); animId.current = null; }
      } else {
        if (animId.current) cancelAnimationFrame(animId.current);
        animId.current = requestAnimationFrame(animFn.current);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [total]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mouse drag → pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDown = (e: MouseEvent) => {
      isDrag.current   = true;
      dragX0.current   = e.clientX;
      dragS0.current   = tgtS.current;
      dragSpan.current = tgtE.current - tgtS.current;
      setIsGrabbing(true);
    };
    const onMove = (e: MouseEvent) => {
      if (!isDrag.current) return;
      const rect  = el.getBoundingClientRect();
      const dx    = e.clientX - dragX0.current;
      const shift = -(dx / rect.width) * dragSpan.current;
      let ns = dragS0.current + shift;
      let ne = ns + dragSpan.current;
      if (ns < 0) { ns = 0; ne = dragSpan.current; }
      if (ne > total - 1) { ne = total - 1; ns = ne - dragSpan.current; }
      tgtS.current = ns; tgtE.current = ne;
      curS.current = ns; curE.current = ne;
      setWinStart(Math.round(Math.max(0, ns)));
      setWinEnd(Math.round(Math.min(total - 1, ne)));
    };
    const onUp = () => { isDrag.current = false; setIsGrabbing(false); };
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [total]); // eslint-disable-line react-hooks/exhaustive-deps

  return { containerRef, size, winStart, winEnd, isGrabbing };
}
