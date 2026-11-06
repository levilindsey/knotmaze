// K1218 S4 (a live_s4.mjs module): who draws an edge inside a web. One settled
// state at shoot_s4's np declaration (no pulses, no bands), then GPU renders:
// as is, paint debug 3 (the base field, no route bands), no cover strips;
// each printed as a gold-fraction map of a device window, beside the CPU
// mirror's web field (cpuJunctionField, strip false) at the same pixel centers.
//   node live_s4.mjs <stand> <outDir> field_s4.mjs <ji> <wx0,wy0,wx1,wy1> [gold r,g,b] [arm r,g,b]
import { decodePNG, toRGB } from "./png.mjs";
import { frames, sleep } from "./lib.mjs";

export async function run({ page, toWorld, args }) {
  const ji = Number(args[0]);
  const [wx0, wy0, wx1, wy1] = args[1].split(",").map(Number);
  const G = (args[2] || "236,205,65").split(",").map(Number);
  const A = (args[3] || "120,195,181").split(",").map(Number);
  await page.evaluate(() => {
    const r = window.__knotRenderer(), S = r.paintState;
    const D = { spans: S.paintSpans, pulses: S.paintPulses, caps: S.paintCaps, routes: S.paintRoutes, traveled: S.paintTraveled };
    const orig = r.setPaint.bind(r);
    window.__k1218S4Set = (routes) => { orig(D.spans, [], D.caps, routes ? D.routes : [], D.traveled, []); r.pulseBorn = 0; r.rebuildFillets(true); };
    r.setPaint = function () {};
    window.__k1218S4Set(true);
  });
  const d = [G[0] - A[0], G[1] - A[1], G[2] - A[2]], dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  const ch = (c) => {
    const v = [c[0] - A[0], c[1] - A[1], c[2] - A[2]];
    const f = (v[0] * d[0] + v[1] * d[1] + v[2] * d[2]) / dd;
    const off = Math.hypot(A[0] + f * d[0] - c[0], A[1] + f * d[1] - c[1], A[2] + f * d[2] - c[2]);
    return off > 30 ? "." : f <= 0.02 ? " " : f >= 0.98 ? "#" : String(Math.min(9, Math.floor(f * 10)));
  };
  const maps = {};
  const shotMap = async (id, setup) => {
    await page.evaluate(setup);
    await frames(page, 3);
    await sleep(150);
    const im = toRGB(decodePNG(await page.screenshot({ type: "png" })));
    const rows = [];
    for (let y = wy0; y <= wy1; y++) {
      let s = "";
      for (let x = wx0; x <= wx1; x++) { const o = (y * im.W + x) * 3; s += ch([im.data[o], im.data[o + 1], im.data[o + 2]]); }
      rows.push(s);
    }
    maps[id] = rows;
  };
  const tick = "const r = window.__knotRenderer(); r.paintClock = 100; r.tickPaint(0);";
  await shotMap("gpu", new Function(`${tick} r.paintDebug = 0;`));
  await shotMap("dbg3", new Function(`const r = window.__knotRenderer(); r.paintDebug = 3; r.paintClock = 100; r.tickPaint(0);`));
  await shotMap("noroutes", new Function(`window.__k1218S4Set(false); const r = window.__knotRenderer(); r.paintDebug = 0; r.paintClock = 100; r.tickPaint(0);`));
  await shotMap("nostrips", new Function(`const r = window.__knotRenderer(); for (const m of [r.filletMesh, r.filletTopMesh]) if (m) m.pushStrip = () => {}; window.__k1218S4Set(true); r.paintDebug = 0; r.paintClock = 100; r.tickPaint(0);`));
  await page.evaluate(() => { const r = window.__knotRenderer(); for (const m of [r.filletMesh, r.filletTopMesh]) if (m) delete m.pushStrip; window.__k1218S4Set(true); r.paintDebug = 0; r.tickPaint(0); });
  // The CPU web field at the same pixel centres (device px -> world).
  const pts = [];
  for (let y = wy0; y <= wy1; y++) for (let x = wx0; x <= wx1; x++) pts.push(toWorld(x + 0.5, y + 0.5));
  const [ax, ay] = toWorld(0, 0), [bx, by] = toWorld(1, 0);
  const pxW = Math.hypot(bx - ax, by - ay);
  const cpu = await page.evaluate((ji, pts, pxW) => {
    const r = window.__knotRenderer();
    const out = new Float32Array(4);
    return pts.map(([x, y]) => (r.fieldProbe.at(ji, x, y, out, pxW, false) ? [out[0] * 255, out[1] * 255, out[2] * 255] : null));
  }, ji, pts, pxW);
  const W = wx1 - wx0 + 1;
  maps.cpu = [];
  for (let y = 0; y <= wy1 - wy0; y++) { let s = ""; for (let x = 0; x < W; x++) { const c = cpu[y * W + x]; s += c ? ch(c) : "?"; } maps.cpu.push(s); }
  const routes = await page.evaluate((ji) => JSON.stringify(window.__knotRenderer().fieldProbe.routes(ji)), ji);
  console.log(`ji ${ji}: pxW ${pxW.toFixed(5)} routes ${routes.slice(0, 400)}`);
  let hdr = "     ";
  for (let x = wx0; x <= wx1; x++) hdr += String(x % 10);
  const ids = Object.keys(maps);
  console.log(ids.map((id) => id.padEnd(W + 6)).join(""));
  for (let y = 0; y <= wy1 - wy0; y++) console.log(ids.map((id) => `${String(wy0 + y).padStart(4)} ${maps[id][y]} `).join(""));
}
