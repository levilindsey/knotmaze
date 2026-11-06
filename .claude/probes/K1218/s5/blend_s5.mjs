// K1218 S5 (a live_s5.mjs module): per pixel, what the CPU web field
// (fieldProbe.at, the shader's mirror) blends: each arm it paints (chain and
// arc, from lastArms) and the luma it returns, at a paint clock t.
//   node live_s5.mjs <stand> <outDir> blend_s5.mjs <ji> <x0,y0,x1,y1> <t>
export async function run({ page, toWorld, args }) {
  const ji = Number(args[0]);
  const [x0, y0, x1, y1] = args[1].split(",").map(Number);
  const t = Number(args[2] ?? 100);
  const xs = [], ys = [];
  for (let x = x0; x <= x1; x++) xs.push(x);
  for (let y = y0; y <= y1; y++) ys.push(y);
  const pts = [];
  for (const y of ys) for (const x of xs) pts.push(toWorld(x + 0.5, y + 0.5));
  const res = await page.evaluate((ji, pts, t) => {
    const r = window.__knotRenderer();
    r.paintClock = t;
    r.tickPaint(0);
    const FP = r.fieldProbe;
    const out = new Float32Array(4);
    return pts.map(([x, y]) => {
      if (!FP.at(ji, x, y, out, 0, false)) return null;
      const la = FP.lastArms();
      return { n: la.length / 3, a: la.slice(), L: 255 * (0.299 * out[0] + 0.587 * out[1] + 0.114 * out[2]) };
    });
  }, ji, pts, t);
  let hdr = "      ";
  for (const x of xs) hdr += String(x).padStart(7);
  const grid = (name, f) => {
    console.log(name);
    console.log(hdr);
    ys.forEach((y, iy) => {
      let s = `${String(y).padStart(5)} `;
      xs.forEach((x, ix) => { const v = res[iy * xs.length + ix]; s += (v ? f(v) : "-").padStart(7); });
      console.log(s);
    });
  };
  grid("luma", (v) => v.L.toFixed(1));
  grid("arms (chain list)", (v) => (v.n === 1 ? `${v.a[0]}` : `${v.a[0]}+${v.a[3]}`));
  grid("arc A", (v) => v.a[1].toFixed(3));
  grid("arc B", (v) => (v.n > 1 ? v.a[4].toFixed(3) : "."));
  return null;
}
