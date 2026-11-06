// K1218 S5 (a live_s5.mjs module): which ribbons stand beside a device pixel.
// Over a device window: the shot's luma, then per pixel the two chains whose
// drawn centreline (renderer.chainSamples) passes nearest, as
// chain:edge, edge = distance - half-width in device px (negative = inside
// that ribbon's nominal width), from the frame the page has drawn.
//   node live_s5.mjs <stand> <outDir> ribbons_s5.mjs <x0,y0,x1,y1>
import { decodePNG, toRGB } from "./png.mjs";

export async function run({ page, toWorld, args }) {
  const [x0, y0, x1, y1] = args[0].split(",").map(Number);
  const pts = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pts.push(toWorld(x + 0.5, y + 0.5));
  const a = toWorld(x0 + 0.5, y0 + 0.5), b = toWorld(x0 + 1.5, y0 + 0.5);
  const pxW = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const res = await page.evaluate((pts) => {
    const r = window.__knotRenderer();
    const h = r.style.threadWidth / 2;
    return {
      h,
      rows: pts.map(([px, py]) => {
        const near = [];
        r.chainSamples.forEach((cs, c) => {
          if (!cs || !cs.positions) return;
          const P = cs.positions, n = P.length / 2;
          const segs = cs.closed ? n : n - 1;
          let best = 1e9;
          for (let k = 0; k < segs; k++) {
            const k1 = (k + 1) % n;
            const ax = P[2 * k], ay = P[2 * k + 1], dx = P[2 * k1] - ax, dy = P[2 * k1 + 1] - ay;
            const L2 = dx * dx + dy * dy;
            let t = L2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
            t = Math.max(0, Math.min(1, t));
            const qx = ax + t * dx - px, qy = ay + t * dy - py;
            const d = Math.sqrt(qx * qx + qy * qy);
            if (d < best) best = d;
          }
          near.push([c, best]);
        });
        near.sort((p, q) => p[1] - q[1]);
        return near.slice(0, 2).map(([c, d]) => [c, d - h]);
      }),
    };
  }, pts);
  const im = toRGB(decodePNG(await page.screenshot({ type: "png" })));
  const L = (x, y) => { const o = (y * im.W + x) * 3; return 0.299 * im.data[o] + 0.587 * im.data[o + 1] + 0.114 * im.data[o + 2]; };
  console.log(`half-width ${res.h.toFixed(4)} world = ${(res.h / pxW).toFixed(2)} device px; 1 px = ${pxW.toFixed(5)} world`);
  let hdr = "      ";
  for (let x = x0; x <= x1; x++) hdr += String(x).padStart(16);
  console.log("luma"); console.log(hdr);
  for (let y = y0; y <= y1; y++) {
    let s = `${String(y).padStart(5)} `;
    for (let x = x0; x <= x1; x++) s += L(x, y).toFixed(0).padStart(16);
    console.log(s);
  }
  console.log("nearest two chains, chain:edge (device px)"); console.log(hdr);
  const w = x1 - x0 + 1;
  for (let y = y0; y <= y1; y++) {
    let s = `${String(y).padStart(5)} `;
    for (let x = x0; x <= x1; x++) {
      const v = res.rows[(y - y0) * w + (x - x0)];
      s += v.map(([c, e]) => `${c}:${(e / pxW).toFixed(1)}`).join(" ").padStart(16);
    }
    console.log(s);
  }
  return null;
}
