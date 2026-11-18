// K1458 Do 4: the border look (Levi's link) under today's renderer, gf and gf+gfh=1, on one frozen state.
// Per thread cross-section away from crossings and joints it reads the stroke: colour (the darkest pixel in the
// edge band), width (the dip's full width at half depth, device px) and lateral place (its offset / half width).
// Per crossing side it walks the under thread's stroke lane outward and finds where the stroke reaches half its
// far depth (where a stroke ends, arc from the crossing). Saves the full frames and a crop sheet.
//
//   node .claude/probes/K1458/border.mjs <base> <outDir> <profileDir> [link=?3.FGH1HtvQeDjm6e4BII] [fl=]   env SIMT=20 DSF=2
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [, , base, outDir, profileDir, linkArg = "?3.FGH1HtvQeDjm6e4BII", fl = ""] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2);
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const linkOf = (mode) => `${base}/${linkArg}&xp=off&am=instant&phw=0&fw=0&bg=none&snd=none${fl ? `&fl=${fl}` : ""}` +
  (mode === "gf" ? "&rp=gf" : mode === "gfh" ? "&rp=gf&gfh=1" : "");
async function load(mode, keep) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`[${mode}] pageerror ${e.message}`));
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch { /* none */ } });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  await page.goto(linkOf(mode), { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  if (mode !== "today") await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
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
  if (mode !== "today") {
    const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; return globalThis.__knotGf.stats.composites; });
    await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 60000, polling: 100 }, c0);
    await sleep(600);
  }
  const png = await page.screenshot({ type: "png" });
  writeFileSync(join(outDir, `border_${mode}${fl ? "_" + fl : ""}.png`), png);
  console.log(`[${mode}] hash ${hash} look ${await page.evaluate(() => window.__knotParams?.().threadLook ?? "?")}`);
  if (!keep) await page.close();
  return { page, png, hash };
}
try {
  const T = await load("today", true);
  const geo = await T.page.evaluate((dsf) => {
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
    const onCanvas = (x, y) => x > 8 && y > 8 && x < innerWidth - 8 && y < innerHeight - 40 && document.elementFromPoint(x, y) === canvas;
    const scr = (p) => ({ x: p.x * view.s + view.x, y: p.y * view.s + view.y });
    const h = r.style.threadWidth / 2;
    const stops = new Map(); // chain -> arcs to keep away from (passes, joints, ends)
    const add = (ch, a) => { if (!stops.has(ch)) stops.set(ch, []); stops.get(ch).push(a); };
    const xs = [];
    ps.crossings.forEach((c, ci) => {
      const o = arcOf(r.chainSamples[c.over.chain], r.renderCtrl(c.over)), u = arcOf(r.chainSamples[c.under.chain], r.renderCtrl(c.under));
      add(c.over.chain, o); add(c.under.chain, u); xs.push({ ci, o, u, oc: c.over.chain, uc: c.under.chain });
    });
    const joints = [];
    for (const [ch, list] of r.junctionArcCtrls ?? []) for (const jc of list) { const S = r.chainSamples[ch]; if (!S) continue; const a = arcOf(S, jc.ctrl); add(ch, a); joints.push(scr(at(S, a))); }
    const free = (ch, a, m) => { const S = r.chainSamples[ch]; for (const s of stops.get(ch) ?? []) { let d = Math.abs(a - s); if (S.closed) d = Math.min(d, S.totalLength - d); if (d < m) return false; } if (!S.closed && (a < m || a > S.totalLength - m)) return false; return true; };
    // cross-sections: every 0.6 world along each chain, at least 0.9 world from any pass or joint
    const secs = [];
    r.chainSamples.forEach((S, ch) => {
      if (!S) return;
      for (let a = 0.3; a < S.totalLength; a += 0.6) {
        if (!free(ch, a, 0.9)) continue;
        const p = at(S, a), p0 = at(S, a - 0.02), p1 = at(S, a + 0.02);
        let tx = p1.x - p0.x, ty = p1.y - p0.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        const pts = [];
        let ok = true;
        for (let t = -1.6 * h; t <= 1.6 * h + 1e-9; t += h / 40) { const s = scr({ x: p.x - ty * t, y: p.y + tx * t }); if (!onCanvas(s.x, s.y)) { ok = false; break; } pts.push([s.x * dsf, s.y * dsf]); }
        if (ok) secs.push({ ch, a, pts });
      }
    });
    // crossing sides: the under thread's two edge lanes, at offsets k*h for k in a grid (the stroke lane is found per renderer)
    const lanes = [];
    for (const x of xs) {
      const S = r.chainSamples[x.uc];
      const c0 = scr(at(S, x.u));
      if (!onCanvas(c0.x, c0.y)) continue;
      for (const side of [1, -1]) {
        let lim = 2.0;
        for (const a of stops.get(x.uc)) { let d = (a - x.u) * side; if (S.closed) d = ((d % S.totalLength) + S.totalLength) % S.totalLength; if (d > 1e-3) lim = Math.min(lim, d / 2); }
        if (lim < 0.5) continue;
        const rows = [];
        let ok = true;
        for (let da = 0; da <= lim + 1e-9; da += 0.01) {
          const p = at(S, x.u + side * da), p0 = at(S, x.u + side * da - 0.02), p1 = at(S, x.u + side * da + 0.02);
          let tx = p1.x - p0.x, ty = p1.y - p0.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
          const row = [];
          for (let k = -1.3; k <= 1.3001; k += 0.05) { const s = scr({ x: p.x - ty * k * h, y: p.y + tx * k * h }); if (!onCanvas(s.x, s.y)) { ok = false; break; } row.push([s.x * dsf, s.y * dsf]); }
          if (!ok) break;
          rows.push({ da: +da.toFixed(2), row });
        }
        if (ok && rows.length > 40) lanes.push({ ci: x.ci, side, at: [Math.round(c0.x), Math.round(c0.y)], rows });
      }
    }
    return { view, h, scalePx: view.s * dsf * h, secs, lanes, joints: joints.filter((j) => onCanvas(j.x, j.y)).map((j) => [Math.round(j.x), Math.round(j.y)]) };
  }, DSF);
  await T.page.close();
  console.log(`h ${geo.h.toFixed(3)} world = ${geo.scalePx.toFixed(1)} device px; sections ${geo.secs.length}, crossing sides ${geo.lanes.length}`);
  const G = await load("gf"), H = await load("gfh");
  const page = await browser.newPage();
  await page.goto("about:blank");
  const res = await page.evaluate(async (d) => {
    const load = (b64) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + b64; });
    const img = async (b64) => { const im = await load(b64); const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height; const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0); return cx.getImageData(0, 0, im.width, im.height); };
    const out = {};
    const bgOf = (R) => { const hist = new Map(); for (let i = 0; i < R.data.length; i += 4 * 7) { const k = (R.data[i] << 16) | (R.data[i + 1] << 8) | R.data[i + 2]; hist.set(k, (hist.get(k) ?? 0) + 1); } let bk = 0, bn = 0; for (const [k, n] of hist) if (n > bn) { bn = n; bk = k; } return [bk >> 16, (bk >> 8) & 255, bk & 255]; };
    for (const [name, b64] of Object.entries(d.shots)) {
      const R = await img(b64);
      const BG = bgOf(R);
      const px = (x, y) => { const xx = Math.max(0, Math.min(R.width - 1, Math.round(x))), yy = Math.max(0, Math.min(R.height - 1, Math.round(y))); const o = (yy * R.width + xx) * 4; return [R.data[o], R.data[o + 1], R.data[o + 2]]; };
      const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
      const n = d.geo.secs[0]?.pts.length ?? 0, mid = (n - 1) / 2, step = d.geo.scalePx / 40; // device px per profile step
      const strokes = [];
      for (const s of d.geo.secs) {
        const C = s.pts.map(([x, y]) => px(x, y)), L = C.map(lum);
        const Lf = L[Math.round(mid)], Lb = (L[0] + L[n - 1]) / 2;
        for (const dir of [-1, 1]) {
          // the edge band: 0.55h..1.25h from the centre
          let im = -1, lm = 1e9;
          for (let i = Math.round(mid + dir * 0.55 * 40); dir > 0 ? i <= Math.round(mid + 1.25 * 40) : i >= Math.round(mid - 1.25 * 40); i += dir) if (L[i] < lm) { lm = L[i]; im = i; }
          const ref = Math.min(Lf, Lb), depth = ref - lm;
          let w = 0;
          if (depth > 4) {
            const half = lm + depth / 2;
            let a = im, b = im;
            while (a > 0 && L[a - 1] < half) a--;
            while (b < n - 1 && L[b + 1] < half) b++;
            w = (b - a + 1) * step;
          }
          strokes.push({ depth, w, off: Math.abs(im - mid) / 40, col: C[im], Lf, Lb });
        }
      }
      const med = (a) => { const b = a.filter((v) => Number.isFinite(v)).sort((p, q) => p - q); return b.length ? b[b.length >> 1] : NaN; };
      const dips = strokes.filter((s) => s.depth > 4);
      const colMed = [0, 1, 2].map((k) => med(dips.map((s) => s.col[k])));
      // where a stroke ends: per crossing side, the lane (k) with the deepest far dip, walked inward
      const ends = [];
      for (const ln of d.geo.lanes) {
        const nr = ln.rows.length, nk = ln.rows[0].row.length;
        const Lr = ln.rows.map((r) => r.row.map(([x, y]) => lum(px(x, y))));
        const far = Lr[nr - 1], centre = far[(nk - 1) >> 1];
        let best = { k: -1, depth: 0 };
        for (let k = 0; k < nk; k++) { const dd = Math.min(centre, Math.max(far[0], far[nk - 1])) - far[k]; if (Math.abs(k - (nk - 1) / 2) > 10 && dd > best.depth) best = { k, depth: dd }; }
        if (best.depth < 6) { ends.push({ ci: ln.ci, side: ln.side, end: null }); continue; }
        // the stroke's own depth at each row: its lane (best k +-2) against the row's fill centre
        const dep = Lr.map((row) => { let m = 1e9; for (let k = Math.max(0, best.k - 2); k <= Math.min(nk - 1, best.k + 2); k++) m = Math.min(m, row[k]); return centre - m; });
        const farD = dep[nr - 1];
        let end = ln.rows[0].da;
        for (let i = nr - 1; i > 0; i--) if (dep[i - 1] < farD / 2) { end = ln.rows[i].da; break; }
        ends.push({ ci: ln.ci, side: ln.side, end, lane: (best.k - (nk - 1) / 2) * 0.05 });
      }
      out[name] = { BG, sections: strokes.length, withDip: dips.length, colour: colMed, width: med(dips.map((s) => s.w)), widthP90: (() => { const b = dips.map((s) => s.w).sort((p, q) => p - q); return b[Math.floor(0.9 * (b.length - 1))]; })(), place: med(dips.map((s) => s.off)), depth: med(dips.map((s) => s.depth)), fill: med(strokes.map((s) => s.Lf)), ends };
    }
    return out;
  }, { geo, shots: { today: Buffer.from(T.png).toString("base64"), gf: Buffer.from(G.png).toString("base64"), gfh: Buffer.from(H.png).toString("base64") } });
  await page.close();
  const pairs = [];
  for (const k of ["gf", "gfh"]) {
    const a = res.today.ends, b = res[k].ends;
    let both = 0, close = 0, longer = 0, shorter = 0, noneT = 0, noneG = 0; const diffs = [];
    for (let i = 0; i < a.length; i++) {
      if (a[i].end === null || b[i].end === null) { if (a[i].end === null) noneT++; if (b[i].end === null) noneG++; continue; }
      both++; const e = b[i].end - a[i].end; diffs.push(Math.abs(e));
      if (Math.abs(e) <= Math.max(0.15 * a[i].end, 1 / (geo.view.s * DSF))) close++; else if (e > 0) longer++; else shorter++;
    }
    diffs.sort((p, q) => p - q);
    pairs.push(`${k}: stroke ends at ${both} sides: within 15%/1px ${close}, ends later (farther from the crossing) ${longer}, sooner ${shorter}; |d| median ${diffs[diffs.length >> 1]?.toFixed(3)} p90 ${diffs[Math.floor(0.9 * (diffs.length - 1))]?.toFixed(3)} world; no stroke found: today ${noneT}, ${k} ${noneG}`);
  }
  const lines = [];
  for (const k of ["today", "gf", "gfh"]) {
    const o = res[k];
    lines.push(`${k}: sections ${o.sections} (edges with a dip ${o.withDip}), stroke colour rgb(${o.colour.map((v) => Math.round(v)).join(",")}), depth ${o.depth?.toFixed(1)} lum below min(fill, bg), width median ${o.width?.toFixed(2)} p90 ${o.widthP90?.toFixed(2)} device px, place ${o.place?.toFixed(2)} h from the centre, fill lum ${o.fill?.toFixed(1)}, bg rgb(${o.BG.join(",")})`);
    const e = o.ends.filter((x) => x.end !== null).map((x) => x.end).sort((p, q) => p - q);
    lines.push(`   stroke end arc from the crossing: median ${e[e.length >> 1]?.toFixed(3)} p10 ${e[Math.floor(0.1 * (e.length - 1))]?.toFixed(3)} p90 ${e[Math.floor(0.9 * (e.length - 1))]?.toFixed(3)} world (${e.length} sides)`);
  }
  lines.push(...pairs);
  lines.push(`hashes today ${T.hash} gf ${G.hash} gfh ${H.hash}; h = ${geo.scalePx.toFixed(1)} device px`);
  for (const l of lines) console.log(l);
  writeFileSync(join(outDir, `border${fl ? "_" + fl : ""}.txt`), lines.join("\n") + "\n");
  writeFileSync(join(outDir, `border${fl ? "_" + fl : ""}.json`), JSON.stringify({ geo: { joints: geo.joints, lanes: geo.lanes.map((l) => ({ ci: l.ci, side: l.side, at: l.at })) }, res }, null, 1));
} finally { await browser.close(); }
