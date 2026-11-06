// K1218 S5 (a live_s5.mjs module): WHICH part of the web's pulse term steps
// against the ribbon's. One settled stand at paint clock t, a device window:
//   gpu    luma as drawn;  nofan  luma with the fans hidden (the ribbon beneath)
//   web    the CPU mirror's web field (fieldProbe.at) at each pixel centre
//   dA     (the arc the web maps the pixel to - the arc of the nearest point on
//          the arm chain's centerline) in device px
//   mNear  luma of the chain's composed material at that nearest-point arc
//   mWeb   luma of the chain's composed material at the web's arc (no strip texels)
//   node live_s5.mjs <stand> <outDir> arcs_s5.mjs <ji> <x0,y0,x1,y1> [t=100]
import { decodePNG, toRGB } from "./png.mjs";
import { frames, sleep } from "./lib.mjs";

const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

export async function run({ page, toWorld, args }) {
  const ji = Number(args[0]);
  const [x0, y0, x1, y1] = args[1].split(",").map(Number);
  const t = Number(args[2] ?? 100);
  const shot = async (fans) => {
    await page.evaluate((t, fans) => {
      const r = window.__knotRenderer();
      for (const m of [r.filletMesh, r.filletTopMesh]) if (m && m.mesh) m.mesh.renderable = fans;
      r.paintClock = t;
      r.tickPaint(0);
    }, t, fans);
    await frames(page, 3);
    await sleep(150);
    return toRGB(decodePNG(await page.screenshot({ type: "png" })));
  };
  const imF = await shot(false);
  const im = await shot(true);
  const pts = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pts.push(toWorld(x + 0.5, y + 0.5));
  const [ax, ay] = toWorld(0, 0), [bx, by] = toWorld(1, 0);
  const pxW = Math.hypot(bx - ax, by - ay);
  const res = await page.evaluate((ji, pts, pxW) => {
    const r = window.__knotRenderer();
    const J = r.joinery;
    const out = new Float32Array(4), m = new Float32Array(4);
    const L = (c) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) * 255;
    return pts.map(([x, y]) => {
      if (!r.fieldProbe.at(ji, x, y, out, pxW, false)) return null;
      const web = L(out);
      const arms = r.fieldProbe.lastArms().slice();
      const per = [];
      for (let k = 0; k + 2 < arms.length; k += 3) {
        const ch = arms[k], aw = arms[k + 1], seed = arms[k + 2];
        const S = r.chainSamples[ch];
        if (!S) { per.push(null); continue; }
        const nseg = S.closed ? S.count : S.count - 1;
        const sp = S.totalLength / nseg;
        // Nearest point on the centerline polyline within +-0.6 world of aw.
        let best = 1e9, bestArc = aw;
        const i0 = Math.floor((aw - 0.6) / sp), i1 = Math.ceil((aw + 0.6) / sp);
        for (let i = i0; i <= i1; i++) {
          let a = i, b = i + 1;
          if (S.closed) { a = ((a % S.count) + S.count) % S.count; b = ((b % S.count) + S.count) % S.count; }
          else if (a < 0 || b >= S.count) continue;
          const px0 = S.positions[2 * a], py0 = S.positions[2 * a + 1];
          const dx = S.positions[2 * b] - px0, dy = S.positions[2 * b + 1] - py0;
          const ll = dx * dx + dy * dy;
          let u = ll > 0 ? ((x - px0) * dx + (y - py0) * dy) / ll : 0;
          u = Math.max(0, Math.min(1, u));
          const d = Math.hypot(x - px0 - u * dx, y - py0 - u * dy);
          if (d < best) { best = d; bestArc = (i + u) * sp; }
        }
        J.cpuChainMaterial(ch, bestArc, m, seed, pxW, 0);
        const mNear = L(m);
        J.cpuChainMaterial(ch, aw, m, seed, pxW, 0);
        const mWeb = L(m);
        per.push({ ch, aw, an: bestArc, d: best, mNear, mWeb });
      }
      return { web, per };
    });
  }, ji, pts, pxW);
  const W = x1 - x0 + 1;
  const grid = (name, f) => {
    console.log(`${name}`);
    for (let y = y0; y <= y1; y++) {
      let s = `${String(y).padStart(5)} `;
      for (let x = x0; x <= x1; x++) s += f(x, y, res[(y - y0) * W + (x - x0)]).padStart(5);
      console.log(s);
    }
  };
  const L = (img, x, y) => { const o = (y * img.W + x) * 3; return luma(img.data[o], img.data[o + 1], img.data[o + 2]); };
  let hdr = "      ";
  for (let x = x0; x <= x1; x++) hdr += String(x).padStart(5);
  console.log(`ji ${ji} t ${t} pxW ${pxW.toFixed(5)}`);
  console.log(hdr);
  grid("gpu", (x, y) => L(im, x, y).toFixed(0));
  grid("nofan", (x, y) => L(imF, x, y).toFixed(0));
  grid("gpu-nofan", (x, y) => (L(im, x, y) - L(imF, x, y)).toFixed(0));
  grid("web(cpu)", (x, y, r) => (r ? r.web.toFixed(0) : "-"));
  grid("arms", (x, y, r) => (r ? r.per.map((p) => (p ? p.ch : "?")).join("/") : "-"));
  grid("dA px (arm0)", (x, y, r) => (r && r.per[0] ? ((r.per[0].aw - r.per[0].an) / pxW).toFixed(1) : "-"));
  grid("dist px (arm0)", (x, y, r) => (r && r.per[0] ? (r.per[0].d / pxW).toFixed(1) : "-"));
  grid("mNear (arm0)", (x, y, r) => (r && r.per[0] ? r.per[0].mNear.toFixed(0) : "-"));
  grid("mWeb (arm0)", (x, y, r) => (r && r.per[0] ? r.per[0].mWeb.toFixed(0) : "-"));
  return { ji, t, pxW, x0, y0, x1, y1, res };
}
