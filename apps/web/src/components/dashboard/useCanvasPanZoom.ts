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

  // Wheel zoom — must be passive:false to call preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir   = e.deltaY > 0 ? 1 : -1;          // scroll down = zoom out
      const span  = tgtE.current - tgtS.current;
      const delta = span * 0.12 * dir;
      let ns = tgtS.current + delta / 2;
      let ne = tgtE.current - delta / 2;
      // enforce minimum window
      if (ne - ns < MIN_WIN) {
        const mid = (ns + ne) / 2;
        ns = mid - MIN_WIN / 2;
        ne = mid + MIN_WIN / 2;
      }
      tgtS.current = Math.max(0, ns);
      tgtE.current = Math.min(total - 1, ne);
      if (animId.current) cancelAnimationFrame(animId.current);
      animId.current = requestAnimationFrame(animFn.current);
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
