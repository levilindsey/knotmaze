// K1460 s2: numbers for the long fade's bands and stairs (Done 1) and stage 1's dotted line (Done 2), on one frozen
// physics state across several builds. Saves every page as <outDir>/shot_<tag>_<fl>.png (crop.py reads them).
//
//   node .claude/probes/K1460/bands.mjs <outDir> <profileDir> "<tag>@<base>[@gf|gfh],..." [fl=0.5,1.2] [query]
//     the FIRST mode must be today's renderer (the reference); env SIMT=20 DSF=2 TRIES=8 HASH=
//     query: the link without its "?", default 3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none
//
// Geometry (fade.mjs's): per crossing side, the under centreline from the crossing out to half way to the next pass,
// in device px, with each point's distance to the over centreline (world). Coverage = (pixel - BG) projected on
// (U - BG), U = the under colour in today's fl=0 frame past the gap, divided by the renderer's own coverage at the
// walk's far end. A side's FADED SPAN: stations where today's centreline coverage is in [0.03, 0.97], outside the
// over body. Width lines: lateral offsets -0.7h..0.7h, every device px.
//
// BANDS (Done 1), per side and renderer: along each width line the coverage quantised to 8 levels; a step is a level
// change; EXTRA is the levels travelled beyond |last - first| (a reversal: a band), averaged over the width lines. Plus the width-wise
// spread per station (max - min across the width) above today's at that station (wedges), and the mean |c - today|.
// A side is BANDED when extra steps > 2 + today's, or the mean spread excess > 0.08.
// DOTS (Done 2): pixels between 0.5 and 2.5 device px outside the over thread's edge, inside the under thread's
// footprint where today's coverage is under 0.5 (the faded span), whose coverage exceeds today's by more than 0.35
// (each against its own full colour): stage 1's dotted line continued the over thread's edge there. REUSE=1 reads
// shots already in outDir (today's fl=0 still loads, for the geometry).
import { launch as capLaunch, load as capLoad } from "./cap.mjs";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
const [, , outDir, profileDir, modeArg, flArg = "0.5,1.2", qArg = "3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none"] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), TRIES = +(process.env.TRIES ?? 8);
const MODES = modeArg.split(",").map((s) => { const [tag, base, rp = ""] = s.split("@"); return { tag, base, rp }; });
const FLS = flArg.split(",").map(Number);
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// K1460 s4: Chrome and every load come from cap.mjs (the watchdog off, the EARLY freeze shot.mjs uses: state
// f9d72040), so REUSE=1 can read shot.mjs's frames.
const browser = await capLaunch(profileDir);
const linkOf = (m, fl) => `${m.base}/?${qArg}&fl=${fl}` + (m.rp === "gf" ? "&rp=gf" : m.rp === "gfh" ? "&rp=gf&gfh=1" : "");
async function load(m, fl) {
  const r = await capLoad(browser, linkOf(m, fl), { tag: `${m.tag} ${fl}`, gf: !!m.rp, simT: SIMT, dsf: DSF });
  const png = await r.page.screenshot({ type: "png" });
  console.log(`[${m.tag} fl=${fl}] hash ${r.hash} ok ${r.ok} lost ${r.lost}`);
  return { page: r.page, png, hash: r.hash.split(" ")[0] };
}
async function loadOld(m, fl) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`[${m.tag} ${fl}] pageerror ${e.message}`));
  page.on("console", (c) => { if (c.type() === "error") console.log(`[${m.tag} ${fl}] console ${c.text().slice(0, 600)}`); });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  const t0 = Date.now();
  await page.goto(linkOf(m, fl), { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  if (m.rp) await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
  const hash = await page.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(t);
    const r = window.__knotRenderer();
    r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
  }, SIMT);
  await sleep(2500);
  if (m.rp) {
    const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; return globalThis.__knotGf.stats.composites; });
    await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 60000, polling: 100 }, c0);
    await sleep(600);
  }
  const png = await page.screenshot({ type: "png" });
  console.log(`[${m.tag} fl=${fl}] ready ${Date.now() - t0} ms hash ${hash}`);
  return { page, png, hash };
}
let want = process.env.HASH ?? "";
async function same(m, fl) {
  let P;
  for (let t = 0; t < TRIES; t++) {
    P = await load(m, fl);
    if (!want) want = P.hash;
    if (P.hash === want) return P;
    console.log(`[${m.tag} fl=${fl}] hash ${P.hash} != ${want}, retry`);
    if (t < TRIES - 1) await P.page.close();
  }
  return P;
}
async function geometry(page) {
  return page.evaluate((dsf) => {
    const r = window.__knotRenderer(), ps = window.__knotPS(), view = window.__knotView();
    const arcOf = (S, f) => {
      const cal = S.controlArcLengths, n = cal.length;
      if (S.closed) { const ff = ((f % n) + n) % n, i = Math.floor(ff), u = ff - i, j = (i + 1) % n; const a0 = cal[i], a1 = j === 0 ? S.totalLength : cal[j]; return a0 + (a1 - a0) * u; }
      const ff = Math.max(0, Math.min(n - 1, f)), i = Math.min(Math.floor(ff), n - 2), u = Math.max(0, Math.min(1, ff - i));
      return cal[i] + (cal[i + 1] - cal[i]) * u;
    };
    const at = (S, arc) => {
      const n = S.count, pos = S.positions;
      const a = S.closed ? ((arc % S.totalLength) + S.totalLength) % S.totalLength : Math.max(0, Math.min(S.totalLength, arc));
      const fi = S.closed ? (a / S.totalLength) * n : (a / S.totalLength) * (n - 1);
      const i = Math.floor(fi) % n, j = S.closed ? (i + 1) % n : Math.min(i + 1, n - 1), u = fi - Math.floor(fi);
      return { x: pos[i * 2] + (pos[j * 2] - pos[i * 2]) * u, y: pos[i * 2 + 1] + (pos[j * 2 + 1] - pos[i * 2 + 1]) * u };
    };
    const canvas = document.querySelector("canvas");
    const onCanvas = (x, y) => x > 8 && y > 8 && x < innerWidth - 8 && y < innerHeight - 8 && document.elementFromPoint(x, y) === canvas;
    const scr = (p) => ({ x: p.x * view.s + view.x, y: p.y * view.s + view.y });
    const passes = new Map(), passArc = [];
    ps.crossings.forEach((c, ci) => {
      const o = arcOf(r.chainSamples[c.over.chain], r.renderCtrl(c.over)), u = arcOf(r.chainSamples[c.under.chain], r.renderCtrl(c.under));
      passArc[ci] = { o, u };
      for (const [ch, a] of [[c.over.chain, o], [c.under.chain, u]]) { if (!passes.has(ch)) passes.set(ch, []); passes.get(ch).push(a); }
    });
    const out = [];
    ps.crossings.forEach((c, ci) => {
      const So = r.chainSamples[c.over.chain], Su = r.chainSamples[c.under.chain];
      if (!So || !Su) return;
      const { o: oArc, u: uArc } = passArc[ci];
      const cs = scr(at(Su, uArc));
      if (!onCanvas(cs.x, cs.y)) return;
      const hOver = r.style.threadWidth / 2;
      const over = [];
      for (let a = oArc - 3.4; a <= oArc + 3.4; a += 0.02) { const w = at(So, a); const s = scr(w); over.push([s.x * dsf, s.y * dsf]); }
      for (const side of [1, -1]) {
        let lim = 3.0;
        for (const a of passes.get(c.under.chain)) {
          let d = (a - uArc) * side;
          if (Su.closed) d = ((d % Su.totalLength) + Su.totalLength) % Su.totalLength;
          if (d > 1e-3) lim = Math.min(lim, d / 2);
        }
        if (!Su.closed) lim = Math.min(lim, side > 0 ? Su.totalLength - uArc : uArc);
        const prof = [];
        let ok = true;
        for (let da = 0; da <= lim + 1e-9; da += 0.01) {
          const q = at(Su, uArc + side * da);
          let dO = 1e9;
          for (let a = oArc - 3.4; a <= oArc + 3.4; a += 0.02) { const w = at(So, a), d = Math.hypot(w.x - q.x, w.y - q.y); if (d < dO) dO = d; }
          const s = scr(q);
          if (!onCanvas(s.x, s.y)) { ok = false; break; }
          prof.push({ da: +da.toFixed(3), x: s.x * dsf, y: s.y * dsf, dO });
        }
        if (!ok || prof.length < 10) continue;
        out.push({ ci, side, sel: c.over.chain === c.under.chain, lim, hOver, at: [Math.round(cs.x), Math.round(cs.y)], prof, over });
      }
    });
    return { view, crossings: ps.crossings.length, sides: out };
  }, DSF);
}
async function measure(geo, ref, shots) {
  const page = await browser.newPage();
  await page.goto("about:blank");
  const res = await page.evaluate(async (d) => {
    const load = (b64) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + b64; });
    const img = async (b64) => { const im = await load(b64); const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height; const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0); return cx.getImageData(0, 0, im.width, im.height); };
    const R = await img(d.ref);
    const S = {};
    for (const k of Object.keys(d.shots)) S[k] = await img(d.shots[k]);
    const px = (D, x, y) => { const xx = Math.max(0, Math.min(D.width - 1, Math.round(x))), yy = Math.max(0, Math.min(D.height - 1, Math.round(y))); const o = (yy * D.width + xx) * 4; return [D.data[o], D.data[o + 1], D.data[o + 2]]; };
    const hist = new Map();
    for (let i = 0; i < R.data.length; i += 4 * 7) { const k = (R.data[i] << 16) | (R.data[i + 1] << 8) | R.data[i + 2]; hist.set(k, (hist.get(k) ?? 0) + 1); }
    let bk = 0, bn = 0; for (const [k, n] of hist) if (n > bn) { bn = n; bk = k; }
    const BG = [bk >> 16, (bk >> 8) & 255, bk & 255];
    const keys = Object.keys(S), others = keys.filter((k) => k !== "today");
    const sides = [];
    for (const g of d.geo.sides) {
      const reach = g.hOver + 0.18;
      const iu = g.prof.findIndex((p) => p.dO > reach);
      if (iu < 0 || iu > g.prof.length - 5) continue;
      const Uat = (i) => px(R, g.prof[Math.max(i, iu)].x, g.prof[Math.max(i, iu)].y).map((v, k) => v - BG[k]);
      const U0 = Uat(iu); if (U0[0] ** 2 + U0[1] ** 2 + U0[2] ** 2 < 1200) continue;
      const covXY = (D, x, y, i) => { const U = Uat(i), uu = U[0] ** 2 + U[1] ** 2 + U[2] ** 2; const P = px(D, x, y); return ((P[0] - BG[0]) * U[0] + (P[1] - BG[1]) * U[1] + (P[2] - BG[2]) * U[2]) / uu; };
      const n = g.prof.length;
      const nrm = (i) => { const a = g.prof[Math.max(0, i - 1)], b = g.prof[Math.min(n - 1, i + 1)]; const tx = b.x - a.x, ty = b.y - a.y, tl = Math.hypot(tx, ty) || 1; return [-ty / tl, tx / tl]; };
      const hd = g.hOver * d.scale * 0.7;
      const offs = []; for (let o = -hd; o <= hd + 1e-6; o += 1) offs.push(o);
      const full = {}; for (const k of keys) { const v = covXY(S[k], g.prof[n - 1].x, g.prof[n - 1].y, n - 1); full[k] = v > 0.5 ? v : 1; }
      const grid = (k) => g.prof.map((p, i) => { const [nx, ny] = nrm(i); return offs.map((o) => covXY(S[k], p.x + nx * o, p.y + ny * o, i) / full[k]); });
      const G = {}; for (const k of keys) G[k] = grid(k);
      const mid = offs.length >> 1;
      const body = g.hOver + 1.5 / d.scale;
      const span = []; for (let i = 0; i < n; i++) { const c = G.today[i][mid]; if (g.prof[i].dO > body && c >= 0.03 && c <= 0.97) span.push(i); }
      const row = { ci: g.ci, side: g.side, at: g.at, self: g.sel, span: span.length };
      if (span.length >= 6) {
        // span stations contiguous from the first to the last
        const i0 = span[0], i1 = span[span.length - 1];
        for (const k of keys) {
          let extra = 0, steps = 0;
          for (let w = 0; w < offs.length; w++) {
            let prev = null, first = null, last = null, ch = 0, tv = 0;
            for (let i = i0; i <= i1; i++) { const q = Math.max(0, Math.min(8, Math.floor(G[k][i][w] * 8))); if (prev !== null && q !== prev) { ch++; tv += Math.abs(q - prev); } if (first === null) first = q; prev = q; last = q; }
            steps += ch; extra += tv - Math.abs(last - first);
          }
          // roughness: per width line, |c - mean of the neighbours 1 device px away along the arc|, mean over the span
          const st = Math.max(1, Math.round(1 / (0.01 * d.scale)));
          let rough = 0, nr = 0;
          for (let w = 0; w < offs.length; w++) for (let i = i0 + st; i <= i1 - st; i += st) { rough += Math.abs(G[k][i][w] - (G[k][i - st][w] + G[k][i + st][w]) / 2); nr++; }
          let spreadEx = 0, dev = 0, nd = 0;
          for (let i = i0; i <= i1; i++) {
            const sp = (a) => Math.max(...a) - Math.min(...a);
            spreadEx += Math.max(0, sp(G[k][i]) - sp(G.today[i]));
            for (let w = 0; w < offs.length; w++) { dev += Math.abs(G[k][i][w] - G.today[i][w]); nd++; }
          }
          row[k] = { steps, rough: rough / Math.max(1, nr), extra: extra / offs.length, spreadEx: spreadEx / (i1 - i0 + 1), dev: dev / nd };
        }
        for (const k of others) row[k].banded = row[k].rough > row.today.rough + 0.006 || row[k].extra > row.today.extra + 1 || row[k].spreadEx > 0.08;
      }
      // DOTS: pixels 0.5..2.5 device px outside the over edge, in the under footprint, where today's c < 0.5
      const hp = g.hOver * d.scale, seen = new Set(), pix = [];
      const fullHd = g.hOver * d.scale * 0.9;
      for (let i = 0; i < n; i++) {
        if (!(G.today[i][mid] < 0.5)) continue;
        const [nx, ny] = nrm(i), p = g.prof[i];
        for (let o = -fullHd; o <= fullHd; o += 0.5) {
          const x = Math.round(p.x + nx * o), y = Math.round(p.y + ny * o), kk = y * 100000 + x;
          if (seen.has(kk)) continue; seen.add(kk);
          let best = 1e18; for (const [ox, oy] of g.over) { const dd = (ox - x) ** 2 + (oy - y) ** 2; if (dd < best) best = dd; }
          const e = Math.sqrt(best) - hp;
          if (e > 0.5 && e < 2.5) pix.push([x, y]);
        }
      }
      row.dotPix = pix.length; row.dots = {};
      const ii = Math.max(iu, n - 1); for (const k of others) { let c = 0; for (const [x, y] of pix) { if (covXY(S[k], x, y, ii) / full[k] - covXY(S.today, x, y, ii) / full.today > 0.35) c++; } row.dots[k] = c; }
      sides.push(row);
    }
    return { BG, sides };
  }, { ref: Buffer.from(ref).toString("base64"), shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, Buffer.from(v).toString("base64")])), geo, scale: geo.view.s * DSF });
  await page.close();
  return res;
}
try {
  const T = MODES[0];
  const R = await same(T, 0);
  writeFileSync(join(outDir, `shot_${T.tag}_0.png`), R.png);
  const geo = await geometry(R.page);
  await R.page.close();
  writeFileSync(join(outDir, "geo.json"), JSON.stringify(geo.sides.map((g) => ({ ci: g.ci, side: g.side, self: g.sel, at: g.at, lim: g.lim, pts: g.prof.filter((_, i) => i % 10 === 0).map((p) => [+(p.x / DSF).toFixed(1), +(p.y / DSF).toFixed(1), +p.dO.toFixed(3)]) }))));
  console.log(`view s ${geo.view.s.toFixed(2)}, crossings ${geo.crossings}, sides on screen ${geo.sides.length}, hash ${want}`);
  const summary = [];
  for (const fl of FLS) {
    const shots = {};
    for (const m of MODES) {
      let png;
      if (m === T && fl === 0) png = R.png;
      else if (process.env.REUSE && existsSync(join(outDir, `shot_${m.tag}_${fl}.png`))) png = readFileSync(join(outDir, `shot_${m.tag}_${fl}.png`));
      else { const P = await same(m, fl); png = P.png; if (P.hash !== want) console.log(`[${m.tag} fl=${fl}] NOT same state`); await P.page.close(); }
      writeFileSync(join(outDir, `shot_${m.tag}_${fl}.png`), png);
      shots[m === T ? "today" : m.tag] = png;
    }
    const res = await measure(geo, R.png, shots);
    writeFileSync(join(outDir, `bands_fl${fl}.json`), JSON.stringify({ fl, hash: want, ...res }, null, 1));
    for (const m of MODES.slice(1)) {
      const S = res.sides.filter((s) => s[m.tag]);
      const banded = S.filter((s) => s[m.tag].banded);
      const sum = (f) => S.reduce((p, s) => p + f(s), 0);
      const dots = res.sides.reduce((p, s) => p + s.dots[m.tag], 0), dpix = res.sides.reduce((p, s) => p + s.dotPix, 0);
      const line = `fl=${fl} ${m.tag}: span sides ${S.length}, banded ${banded.length} [${banded.slice(0, 10).map((s) => `x${s.ci}${s.side > 0 ? "+" : "-"}@${s.at}`).join(" ")}], extra steps ${sum((s) => s[m.tag].extra)} (today ${sum((s) => s.today.extra)}), rough mean ${(sum((s) => s[m.tag].rough) / Math.max(1, S.length)).toFixed(4)} (today ${(sum((s) => s.today.rough) / Math.max(1, S.length)).toFixed(4)}), spread excess mean ${(sum((s) => s[m.tag].spreadEx) / Math.max(1, S.length)).toFixed(4)}, |c-today| mean ${(sum((s) => s[m.tag].dev) / Math.max(1, S.length)).toFixed(4)}; dots ${dots} of ${dpix} edge px`;
      console.log(line); summary.push(line);
    }
    const SITES = (process.env.SITES ?? "").split(";").filter(Boolean).map((t) => t.split(",").map(Number));
    for (const [sx, sy] of SITES) {
      for (const r of res.sides) {
        const g = geo.sides.find((q) => q.ci === r.ci && q.side === r.side);
        if (!g || !r.today || !g.prof.some((p) => Math.hypot(p.x / DSF - sx, p.y / DSF - sy) < 14)) continue;
        const line = `  site ${sx},${sy} fl=${fl} x${r.ci}${r.side > 0 ? "+" : "-"} span ${r.span}: ` + MODES.map((m) => { const k = m === T ? "today" : m.tag, v = r[k]; return `${m.tag} rough ${v.rough.toFixed(4)} extra ${v.extra.toFixed(2)} spreadEx ${v.spreadEx.toFixed(3)} dev ${v.dev.toFixed(3)}${v.banded ? " BANDED" : ""}`; }).join(" | ") + ` | dots ${JSON.stringify(r.dots)}`;
        console.log(line); summary.push(line);
      }
    }
  }
  writeFileSync(join(outDir, `summary_${FLS.join("_")}.txt`), summary.join("\n") + "\n");
} finally { await browser.close(); }
