// Deterministic pseudo-random for SSR hydration safety
export function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function genCandles(seed = 1, n = 70, base = 36400) {
  const out: any[] = [];
  let p = base;
  for (let i = 0; i < n; i++) {
    const o = p;
    const c = o + (rand(seed + i) - 0.5) * 60;
    const h = Math.max(o, c) + rand(seed + i + 100) * 30;
    const l = Math.min(o, c) - rand(seed + i + 200) * 30;
    out.push({
      i, o, h, l, c,
      up: c >= o,
      body: [Math.min(o, c), Math.max(o, c)],
      wick: [l, h],
      vol: 200 + rand(seed + i + 300) * 800,
    });
    p = c;
  }
  return out;
}

export function genArea(seed = 1, n = 80, base = 800, vol = 22) {
  const out: { i: number; v: number }[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += Math.sin(i / 4 + seed) * vol * 0.3 + (rand(seed + i) - 0.45) * vol;
    out.push({ i, v: Math.max(10, v) });
  }
  return out;
}

export function genSpark(seed = 1, up = true, n = 24) {
  const data = [];
  let v = 50;
  for (let i = 0; i < n; i++) {
    v += (rand(seed + i) - (up ? 0.4 : 0.6)) * 5;
    data.push({ i, v });
  }
  return data;
}
