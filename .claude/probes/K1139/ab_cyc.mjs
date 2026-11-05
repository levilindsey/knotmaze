// K1139 S4 same-state A/B (locality): the base build (25ce2321) against
// the S4 build on the stands of stands_cyc.mjs, clocks pinned by
// __knotPinClocks, phw=0 (ab_s3b.mjs's capture, unchanged). S4 changes
// pixels on the arms a two-ended pulse lights and on the fans at their
// ends, so the gate is 0 px outside mask T:
//   T = a corridor CORR_R world wide around every two-ended arm (the S4
//       build's PulseArm.two, its runPoint samples), MASK_R discs at both
//       of its end vertices, and MASK_R discs at every vertex whose pulse
//       bands differ between the builds.
// Mask D adds every arm whose pulse declaration differs between the
// builds (and its end discs): what moved besides the two-ended arms.
// Pixels outside T are tallied by nearest walk vertex. The same-build
// control (S4 against itself on cross) runs first and must read 0 px.
//   node ab_cyc.mjs <baseHost> <s4Host> <outDir> [stands]
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer-core";
import { mkdtempSync, rmSync } from "node:fs";
import { decodePNG, toRGB } from "./png.mjs";
import { sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const MASK_R = 1.35; // world, around a junction (ab_s3b)
const CORR_R = 0.75; // world, around a two-ended arm's centreline
const DSF = 1.5;
const [BASE, S4, OUTARG, ONLYARG] = process.argv.slice(2);
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const ONLY = ONLYARG ? ONLYARG.split(",") : ["fork", "cross", "src", "four", "x4", "cyc", "loop", "preloop"];

async function openBrowser() {
  mkdirSync(join(import.meta.dirname, "udd"), { recursive: true });
  const udd = mkdtempSync(join(import.meta.dirname, "udd", "k1139abc-"));
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: false,
    userDataDir: udd,
    args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
      "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding", "--window-size=1760,1060"],
  });
  const close = browser.close.bind(browser);
  browser.close = async () => { try { await close(); } finally { for (let i = 0; i < 10; i++) { try { rmSync(udd, { recursive: true, force: true }); break; } catch { await sleep(300); } } } };
  return browser;
}

async function capture(host, stand) {
  const st = STANDS[stand];
  const browser = await openBrowser();
  const log = [];
  try {
    const page = await browser.newPage();
    page.on("console", (m) => log.push(m.text()));
    page.on("pageerror", (e) => log.push(`pageerror ${e.message}`));
    await page.setViewport({ width: 1700, height: 950, deviceScaleFactor: DSF });
    const cdp = await page.createCDPSession();
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
    await page.goto(`${host}/?${linkOf(st)}`, { waitUntil: "load", timeout: 90000 });
    await page.bringToFront();
    await page.mouse.move(2, 2);
    await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer() && window.__knotFabric(), { timeout: 60000 });
    const stamp = () => page.evaluate(() => [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /sim .* wall/.test(t)) || "");
    for (let n = 0, t0 = Date.now(); Date.now() - t0 < 40000;) { const s = await stamp(); n = /asleep/.test(s) ? n + 1 : 0; if (n >= 3) break; await sleep(300); }
    const still = async () => { let last = "", n = 0; for (let t0 = Date.now(); Date.now() - t0 < 8000; await sleep(120)) { const v = await page.evaluate(() => { const v = window.__knotView(); return [v.x, v.y, v.s].map((a) => a.toFixed(3)).join(","); }); n = v === last ? n + 1 : 0; last = v; if (n >= 4) return; } };
    await still();
    for (const eid of st.moves) {
      await still();
      const head0 = await page.evaluate(() => window.__knotFabric().head);
      const ok = await page.evaluate((e) => window.__knotTurnMove(e), eid);
      if (!ok) throw new Error(`${stand} move e${eid} refused on ${host}`);
      for (let i = 0; i < 100; i++) { await sleep(100); const f = await page.evaluate(() => { const k = window.__knotFabric(); return { a: k.animating, h: k.head }; }); if (!f.a && f.h !== head0) break; }
      await sleep(300);
      await still();
    }
    // The declared pulses (raw PulseArm records matched to walk edges),
    // the bands, every pulsed edge's screen polyline and every vertex's
    // screen point, all in page CSS px.
    const info = await page.evaluate(() => {
      const r = window.__knotRenderer(), fb = window.__knotFabricRenderer(), k = window.__knotFabric();
      const W = fb.walk;
      const pulses = r.paintState.paintPulses.map((p) => {
        const e = W.edges.find((e) => e.chain === p.chain && ((e.ctrlA === p.cJunction && e.ctrlB === p.cFar) || (e.ctrlB === p.cJunction && e.ctrlA === p.cFar)));
        const f4 = (x) => (x == null ? null : Math.round(+x * 1e4) / 1e4);
        return {
          edge: e ? e.id : -1, two: !!p.two,
          key: JSON.stringify([p.chain, p.cJunction, p.cFar, !!p.inward, !!p.hovered, f4(p.dist0 ?? 0), !!p.cont, !!p.two, f4(p.dB), !!p.inwardB]),
        };
      });
      const bands = window.__knotPulseBands ? window.__knotPulseBands().map((b) => ({ ...b })) : [];
      const geo = {};
      for (const eid of [...new Set(pulses.map((p) => p.edge).filter((e) => e >= 0))]) {
        const e = W.edges[eid];
        const pts = [];
        for (let i = 0; i <= 128; i++) { const q = k.runPoint(eid, i / 128); if (q) pts.push([q.x, q.y]); }
        geo[eid] = { va: e.va, vb: e.vb, pts };
      }
      const verts = {};
      for (const v of W.vertices.keys()) { const p = k.vertexScreen(v); verts[v] = [p.x, p.y]; }
      const p0 = k.vertexScreen(k.head);
      const a = k.toWorld(p0.x, p0.y), b = k.toWorld(p0.x + 100, p0.y);
      return { head: k.head, pulses, bands, geo, verts, ppw: 100 / Math.hypot(b.x - a.x, b.y - a.y) };
    });
    await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
    const shots = [];
    let box = null;
    for (const t of [100, 100.78]) {
      await page.evaluate((tt) => window.__knotPinClocks(tt), t);
      await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
      await sleep(150);
      const canvas = await page.$("canvas");
      box = await canvas.boundingBox();
      shots.push(await page.screenshot({ type: "png", clip: { x: box.x, y: box.y, width: box.width, height: box.height } }));
    }
    const errs = log.filter((l) => /pageerror|ERROR|error compiling|link/i.test(l));
    return { shots, info, box, errs };
  } finally {
    await browser.close();
  }
}

// Screen helpers: page CSS px -> screenshot px.
const sx = (cap, x) => (x - cap.box.x) * DSF;
const sy = (cap, y) => (y - cap.box.y) * DSF;
function discsFor(cap, edges, verts) {
  const out = [];
  const rj = MASK_R * cap.info.ppw * DSF, rc = CORR_R * cap.info.ppw * DSF;
  for (const eid of edges) {
    const g = cap.info.geo[eid];
    if (!g) continue;
    for (const [x, y] of g.pts) out.push([sx(cap, x), sy(cap, y), rc]);
    for (const v of [g.va, g.vb]) { const p = cap.info.verts[v]; if (p) out.push([sx(cap, p[0]), sy(cap, p[1]), rj]); }
  }
  for (const v of verts) { const p = cap.info.verts[v]; if (p) out.push([sx(cap, p[0]), sy(cap, p[1]), rj]); }
  return out;
}
function raster(W, H, discs) {
  const m = new Uint8Array(W * H);
  for (const [cx, cy, r] of discs) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x - cx, dy = y - cy; if (dx * dx + dy * dy <= r * r) m[y * W + x] = 1; }
  }
  return m;
}
function diff(a, b, maskT, maskD, cap) {
  const A = toRGB(decodePNG(Buffer.from(a))), B = toRGB(decodePNG(Buffer.from(b)));
  if (A.W !== B.W || A.H !== B.H) return { n: -1, outT: -1, outD: -1, max: -1, size: `${A.W}x${A.H} vs ${B.W}x${B.H}`, near: {} };
  const mT = maskT ? raster(A.W, A.H, maskT) : null, mD = maskD ? raster(A.W, A.H, maskD) : null;
  const vs = Object.entries(cap.info.verts).map(([v, p]) => [v, sx(cap, p[0]), sy(cap, p[1])]);
  let n = 0, outT = 0, outD = 0, max = 0, maxOut = 0;
  const near = {};
  for (let y = 0; y < A.H; y++) {
    for (let x = 0; x < A.W; x++) {
      const i = (y * A.W + x) * 3;
      const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
      if (d === 0) continue;
      n++;
      if (d > max) max = d;
      if (mT && !mT[y * A.W + x]) {
        outT++;
        if (d > maxOut) maxOut = d;
        let best = null, bd = Infinity;
        for (const [v, vx, vy] of vs) { const q = (vx - x) ** 2 + (vy - y) ** 2; if (q < bd) { bd = q; best = v; } }
        near[best] = (near[best] || 0) + 1;
      }
      if (mD && !mD[y * A.W + x]) outD++;
    }
  }
  return { n, outT, outD, max, maxOut, size: `${A.W}x${A.H}`, near };
}
const bandSig = (bands, v) => JSON.stringify(bands.filter((b) => b.vertex === v)
  .map((b) => [b.aEdge, b.bEdge, Math.round(b.distJ * 1e3) / 1e3, !!b.inward, b.slot ?? null, !!b.fallback]).sort());
const declOf = (pulses) => { const m = {}; for (const p of pulses) (m[p.edge] ||= []).push(p.key); for (const k of Object.keys(m)) m[k].sort(); return m; };

let fail = 0;
const rows = [];
{
  const a = await capture(S4, "cross");
  const b = await capture(S4, "cross");
  for (let k = 0; k < a.shots.length; k++) {
    const d = diff(a.shots[k], b.shots[k], null, null, a);
    const line = `control cross t${k} S4/S4: ${d.n} px differ, max ${d.max}/255`;
    console.log(line); rows.push(line);
    if (d.n !== 0) fail = 1;
  }
}
for (const stand of ONLY) {
  const a = await capture(BASE, stand);
  const b = await capture(S4, stand);
  const twoEdges = [...new Set(b.info.pulses.filter((p) => p.two).map((p) => p.edge))];
  const allV = [...new Set([...a.info.bands, ...b.info.bands].map((x) => x.vertex))];
  const bandDiff = allV.filter((v) => bandSig(a.info.bands, v) !== bandSig(b.info.bands, v));
  const da = declOf(a.info.pulses), db = declOf(b.info.pulses);
  const declDiff = [...new Set([...Object.keys(da), ...Object.keys(db)])].filter((e) => JSON.stringify(da[e] || []) !== JSON.stringify(db[e] || [])).map(Number);
  writeFileSync(join(OUT, `${stand}_info.json`), JSON.stringify({ stand, base: { head: a.info.head, pulses: a.info.pulses, bands: a.info.bands, errs: a.errs }, s4: { head: b.info.head, pulses: b.info.pulses, bands: b.info.bands, errs: b.errs }, twoEdges, bandDiff, declDiff }, null, 1));
  const hdr = `${stand}: heads ${a.info.head}/${b.info.head}; two-ended e${twoEdges.join(",e") || "-"}; decl differs on e${declDiff.join(",e") || "-"}; bands differ at ${bandDiff.join(",") || "-"}; page errors ${a.errs.length}/${b.errs.length}`;
  console.log(hdr); rows.push(hdr);
  for (let k = 0; k < a.shots.length; k++) {
    writeFileSync(join(OUT, `${stand}_t${k}_base.png`), a.shots[k]);
    writeFileSync(join(OUT, `${stand}_t${k}_s4.png`), b.shots[k]);
    const T = [...discsFor(a, twoEdges, bandDiff), ...discsFor(b, twoEdges, bandDiff)];
    const D = [...T, ...discsFor(a, declDiff, []), ...discsFor(b, declDiff, [])];
    const d = diff(a.shots[k], b.shots[k], T, D, b);
    const top = Object.entries(d.near).sort((p, q) => q[1] - p[1]).slice(0, 5).map(([v, c]) => `${v}:${c}`).join(" ");
    const line = `  ${stand} t${k}: ${d.n} px differ (max ${d.max}/255), ${d.outT} outside T (max ${d.maxOut ?? 0}), ${d.outD} outside D; ${d.size}${top ? `; outside T near ${top}` : ""}`;
    console.log(line); rows.push(line);
    if (d.outT !== 0) fail = 1;
  }
}
const verdict = fail ? "A/B: pixels outside T (see rows)" : "A/B PASS (0 px outside the two-ended arms and their fans)";
console.log(verdict); rows.push(verdict);
writeFileSync(join(OUT, "ab_cyc.txt"), rows.join("\n") + "\n");
process.exitCode = fail;
