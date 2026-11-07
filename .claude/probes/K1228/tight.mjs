// K1228 (a live_s5.mjs module): every sample with R < 1.05 h on the
// stand (device px), the strip-triangle flip count over the real
// ribbon meshes at rest, and again in a pluck frame (a render-only
// pluck on the tightest chain, its clock stepped by hand like K1220's
// shooter, then run out). Flips = triangles of the fills' own index
// buffers whose signed area is negative (the strip's winding, as in
// test/render/ribbon_inner.test.ts).
//   live_s5.mjs <stand> <out> tight.mjs
import { frames, sleep } from "./lib.mjs";

export async function run({ page, toWorld, toDevice }) {
  const geo = await page.evaluate(() => {
    const r = window.__knotRenderer();
    const chains = [];
    r.chainSamples.forEach((cs, c) => {
      if (!cs || !cs.positions) return;
      chains.push({ c, closed: !!cs.closed, P: Array.from(cs.positions) });
    });
    return { h: r.style.threadWidth / 2, chains };
  });
  const a = toWorld(0.5, 0.5), b = toWorld(1.5, 0.5);
  const pxW = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const hDev = geo.h / pxW;
  const tight = [];
  for (const { c, closed, P } of geo.chains) {
    const pts = [];
    for (let k = 0; k < P.length / 2; k++) pts.push(toDevice(P[k * 2], P[k * 2 + 1]));
    const n = pts.length;
    for (let j = 0; j < n; j++) {
      if (!closed && (j === 0 || j === n - 1)) continue;
      const p = pts[(j - 1 + n) % n], q = pts[(j + 1) % n];
      const ax = pts[j][0] - p[0], ay = pts[j][1] - p[1];
      const bx = q[0] - pts[j][0], by = q[1] - pts[j][1];
      const turn = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
      if (turn < 1e-9) continue;
      const R = (0.5 * (Math.hypot(ax, ay) + Math.hypot(bx, by))) / turn;
      if (R < 1.05 * hDev) tight.push({ chain: c, j, R: +R.toFixed(1), x: Math.round(pts[j][0]), y: Math.round(pts[j][1]) });
    }
  }
  tight.sort((p, q) => p.R - q.R);
  const flips = () => page.evaluate(() => {
    const r = window.__knotRenderer();
    let bad = 0, total = 0, worst = 0;
    const bads = [];
    r.fills.forEach((m, mi) => {
      const g = m.mesh.geometry;
      const V = g.getBuffer("aPosition").data;
      const I = g.indexBuffer.data;
      for (let t = 0; t + 2 < I.length; t += 3) {
        const a = I[t] * 2, b = I[t + 1] * 2, c = I[t + 2] * 2;
        const area = (V[b] - V[a]) * (V[c + 1] - V[a + 1]) - (V[b + 1] - V[a + 1]) * (V[c] - V[a]);
        total++;
        if (area < -1e-9) {
          bad++;
          if (-area > worst) worst = -area;
          if (bads.length < 20) bads.push({ mesh: mi, tri: t / 3, verts: [I[t], I[t + 1], I[t + 2]], area, at: [V[a], V[a + 1]] });
        }
      }
    });
    return { bad, total, worst, bads };
  });
  const rest = await flips();
  // Pluck frame: pluck the tightest chain 3 samples along, step 0.1 s.
  let pluck = null;
  if (tight.length) {
    const t0 = tight[0];
    await page.evaluate(() => { const r = window.__knotRenderer(); r.tickPlucks = function () {}; });
    const started = await page.evaluate((c, k) => window.__knotPluck(c, k), t0.chain, t0.j + 3);
    await page.evaluate(() => {
      const r = window.__knotRenderer(), proto = Object.getPrototypeOf(r);
      for (let i = 0; i < 6; i++) proto.tickPlucks.call(r, 1 / 60);
    });
    await frames(page, 3);
    await sleep(150);
    pluck = { started: !!started, chain: t0.chain, j: t0.j, ...(await flips()) };
    await page.evaluate(() => {
      const r = window.__knotRenderer(), proto = Object.getPrototypeOf(r);
      for (let i = 0; i < 600; i++) proto.tickPlucks.call(r, 1 / 60);
    });
    await frames(page, 3);
  }
  console.log(`tight: h ${hDev.toFixed(1)}; ${tight.length} samples R<1.05h; flips rest ${rest.bad}/${rest.total}; pluck ${JSON.stringify(pluck)}`);
  console.log(`five tightest: ${tight.slice(0, 5).map((t) => `chain${t.chain} j${t.j} R${t.R} @${t.x},${t.y}`).join(" | ")}`);
  return { hDev, tight, flipsRest: rest, flipsPluck: pluck };
}
