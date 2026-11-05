// K1202 task 3: GPU pixels either side of the col 20->21 step, at the
// kymograph's own view (sheets_cyc.mjs's clip and samp) and at the rows
// where the step is largest. Normal view + debug view 5 sampled along
// e210's centreline; the covering record from the fillet triangles
// (diag_s4.mjs's capture, cover_lib's owners - px_s4.mjs's manner); the
// CPU value from task 2's twins. Stand link and moves verbatim from
// stands_cyc.mjs.
//   node px_cyc.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, setState, sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";
import { decodePNG, toRGB } from "./png.mjs";
import { uniforms } from "./kymo.mjs";
import { owners } from "./cover_lib.mjs";

// Which kymograph rows step hardest at col 20->21 (fresh sheet, top half).
const kymo = toRGB(decodePNG(readFileSync("out/sheets/cyc_e210_kymo.png")));
const G6 = 6;
const lumK = (x, y) => { const k = (y * kymo.W + x) * 3; return 0.2126 * kymo.data[k] + 0.7152 * kymo.data[k + 1] + 0.0722 * kymo.data[k + 2]; };
const rowStep = [];
for (let r = 0; r < 72; r++) rowStep.push(Math.abs(lumK(G6 + 21, G6 + 2 * r) - lumK(G6 + 20, G6 + 2 * r)));
const byStep = [...rowStep.keys()].sort((a, b) => rowStep[b] - rowStep[a]);
const ROWS = [...byStep.slice(0, 5), ...byStep.slice(-3)];
console.log(`kymograph rows by |dL| at col 20->21: worst ${byStep.slice(0, 5).map((r) => `r${r}:${rowStep[r].toFixed(0)}`).join(" ")}; quiet ${byStep.slice(-3).map((r) => `r${r}:${rowStep[r].toFixed(0)}`).join(" ")}`);

const W = 2.746, DA = 0, DB = 1.386, GR = 2.066199462890625, DISTJ = 1.386;
const C = { CREST_WIDTH: 0.72, CREST_RAMP: 0.5, PULSE_FLOOR: 0.38, PULSE_CORE_BOOST: 0.62, PULSE_CORE_RADIUS: 0.55, PULSE_FLOOR_REACH: 2.0, PULSE_RIDGE_FADE: 0.5 };
const smooth01 = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
const reachWin = (U, d) => 1 - smooth01((d - (U.reach - Math.max(U.f, 1e-4))) / Math.max(U.f, 1e-4));
function crest(U, dG, inward, bumpScale = 1) {
  const s = U.s, raw = inward ? dG + U.travelIn : dG - U.travelOut;
  const ph = raw - s * Math.floor(raw / s), dist = Math.min(ph, s - ph);
  const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
  const bump = Math.max(0, 1 - dist / C.CREST_WIDTH) * Math.min(1, dC / C.CREST_RAMP) * bumpScale;
  const floor = (C.PULSE_FLOOR + C.PULSE_CORE_BOOST * Math.max(0, 1 - dG / C.PULSE_CORE_RADIUS)) * Math.max(0, 1 - dG / C.PULSE_FLOOR_REACH);
  return Math.min(1, (floor + bump * 0.9)) * U.fade * reachWin(U, dG);
}
const ribV = (U, tau) => { const d = W - tau, gA = DA + d, gB = DB + tau, rK = Math.min(1, (Math.abs(gA - gB) * 0.5) / C.PULSE_RIDGE_FADE); return gA <= gB ? crest(U, gA, rK) : crest(U, gB, rK); };
const bandV = (U, tau) => { let g = DISTJ + tau, bk = 1; if (tau > 0) { bk = Math.min(1, Math.abs(g - GR) / C.PULSE_RIDGE_FADE); if (g > GR) g = 2 * GR - g; } return crest(U, g, bk); };

const st = STANDS.cyc;
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, linkOf(st), log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await sleep(300);
  await page.evaluate(PIN);
  const geo = await page.evaluate(() => {
    const k = window.__knotFabric(), r = window.__knotRenderer();
    const pts = [];
    for (let i = 0; i <= 256; i++) { const q = k.runPoint(210, i / 256); pts.push([q.x, q.y, q.wx, q.wy]); }
    const p0 = k.vertexScreen(k.head);
    const a = k.toWorld(p0.x, p0.y), b = k.toWorld(p0.x + 100, p0.y);
    const w0 = k.toWorld(0, 0), w1 = k.toWorld(100, 0), w2 = k.toWorld(0, 100);
    return { pts, ppw: 100 / Math.hypot(b.x - a.x, b.y - a.y), spacing: r.pulseSpacing, reach: r.pulseReach,
      aff: { ax: w0.x, ay: w0.y, bx: (w1.x - w0.x) / 100, by: (w1.y - w0.y) / 100, cx: (w2.x - w0.x) / 100, cy: (w2.y - w0.y) / 100 },
      c218: r.fieldProbe.center(69), fh: r.style.threadWidth / 2 };
  });
  const DSF = 1.5, MASK_R = 1.35;
  const xs = geo.pts.map((p) => p[0]), ys = geo.pts.map((p) => p[1]);
  const m = MASK_R * geo.ppw;
  const clip = { x: Math.floor(Math.min(...xs) - m), y: Math.floor(Math.min(...ys) - m) };
  clip.width = Math.ceil(Math.max(...xs) + m) - clip.x;
  clip.height = Math.ceil(Math.max(...ys) + m) - clip.y;
  const samp = [];
  for (let i = 0; i < geo.pts.length - 1; i++) {
    const [ax, ay, awx, awy] = geo.pts[i], [bx, by, bwx, bwy] = geo.pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay) * DSF, n = Math.max(1, Math.round(L));
    for (let j = 0; j < n; j++) samp.push([(ax + ((bx - ax) * j) / n - clip.x) * DSF, (ay + ((by - ay) * j) / n - clip.y) * DSF, awx + ((bwx - awx) * j) / n, awy + ((bwy - awy) * j) / n]);
  }
  let total = 0; const cum = [0];
  for (let i = 1; i < geo.pts.length; i++) { total += Math.hypot(geo.pts[i][2] - geo.pts[i - 1][2], geo.pts[i][3] - geo.pts[i - 1][3]); cum.push(total); }
  const tauOf = (c) => { let idx = 0; for (let i = 0; i < geo.pts.length - 1; i++) { const L = Math.hypot(geo.pts[i + 1][0] - geo.pts[i][0], geo.pts[i + 1][1] - geo.pts[i][1]) * DSF, n = Math.max(1, Math.round(L)); for (let j = 0; j < n; j++, idx++) if (idx === c) return ((cum[i] + (cum[i + 1] - cum[i]) * (j / n)) / total) * W; } return W; };
  // Fillet triangles touching a box around node_218 (diag_s4 capture manner).
  const tris = await page.evaluate((A, DSF) => {
    const r = window.__knotRenderer(), fp = r.fieldProbe;
    const rb = fp.record(69);
    const det = A.bx * A.cy - A.cx * A.by;
    const c = fp.center(69);
    const cssX = (A.cy * (c[0] - A.ax) - A.cx * (c[1] - A.ay)) / det, cssY = (-A.by * (c[0] - A.ax) + A.bx * (c[1] - A.ay)) / det;
    const box = { x: Math.floor(cssX * DSF - 200), y: Math.floor(cssY * DSF - 200), w: 400, h: 400 };
    const out = [];
    for (const mm of [r.filletMesh, r.filletTopMesh]) {
      const V = mm.vertexData, R = mm.recData, Ld = mm.lookData, I = mm.indexData, nI = mm.iUsed;
      for (let t = 0; t * 3 + 2 < nI; t++) {
        const a = I[t * 3], b = I[t * 3 + 1], cc = I[t * 3 + 2];
        if (a === b || b === cc || a === cc) continue;
        const P = [a, b, cc].map((v) => { const dx = V[v * 2] - A.ax, dy = V[v * 2 + 1] - A.ay; return [DSF * (A.cy * dx - A.cx * dy) / det, DSF * (-A.by * dx + A.bx * dy) / det]; });
        if (Math.max(P[0][0], P[1][0], P[2][0]) < box.x - 1 || Math.min(P[0][0], P[1][0], P[2][0]) > box.x + box.w + 1 || Math.max(P[0][1], P[1][1], P[2][1]) < box.y - 1 || Math.min(P[0][1], P[1][1], P[2][1]) > box.y + box.h + 1) continue;
        out.push(0, t, P[0][0], P[0][1], P[1][0], P[1][1], P[2][0], P[2][1], Ld[a], Ld[b], Ld[cc], R[a], R[b], R[cc]);
      }
    }
    return { rb, box, tris: out };
  }, geo.aff, DSF);
  mkdirSync("out/px", { recursive: true });
  writeFileSync("out/px/r69.tri.bin", Buffer.from(new Float32Array(tris.tris).buffer));
  const own = owners("out/px", { ji: 69, rb: tris.rb, box: tris.box }, 1);
  console.log(`clip ${JSON.stringify(clip)} ppw ${geo.ppw.toFixed(2)} samp ${samp.length}; node_218 rb ${tris.rb} box ${JSON.stringify(tris.box)} tris ${tris.tris.length / 14}`);
  const period = geo.spacing / 1.6;
  const lum = (im, x, y) => { const k = (y * im.W + x) * 3; return 0.2126 * im.data[k] + 0.7152 * im.data[k + 1] + 0.0722 * im.data[k + 2]; };
  for (const r of ROWS) {
    const t = 100 + (r * 1.5 * period) / 72;
    await setState(page, { t, dbg: 0, webs: true });
    const imN = toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
    await setState(page, { t, dbg: 5, webs: true });
    const imD = toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
    const U = uniforms(t, geo.spacing, geo.reach);
    console.log(`row ${r} t ${t.toFixed(3)} (kymo |dL| at 20->21: ${rowStep[r].toFixed(0)}): col tau owner | lumaN G5 | CPU band/ribbon v (x255)`);
    for (let c = 8; c <= 35; c++) {
      const sx = Math.min(imN.W - 1, Math.max(0, Math.round(samp[c][0]))), sy = Math.min(imN.H - 1, Math.max(0, Math.round(samp[c][1])));
      const fx = Math.floor(clip.x * DSF + samp[c][0]) - tris.box.x, fy = Math.floor(clip.y * DSF + samp[c][1]) - tris.box.y;
      const i = fy * tris.box.w + fx;
      const o = [0, 1, 2, 3].map((s) => own[i * 4 + s]).map((v) => (Number.isNaN(v) ? "-" : v)).join(",");
      console.log(`  col ${c} tau ${tauOf(c).toFixed(3)} ${o} | ${lum(imN, sx, sy).toFixed(0)} ${imD.data[(sy * imD.W + sx) * 3 + 1]} | ${(bandV(U, tauOf(c)) * 255).toFixed(0)}/${(ribV(U, tauOf(c)) * 255).toFixed(0)}`);
    }
  }
  await page.close();
} finally { await browser.close(); }
