// K1458 guard: does rp=gf fade the under thread before a crossing as today's renderer does, at the live fade?
// For each fade value it loads today's renderer and gf (and gf+gfh=1) on ONE frozen physics state, then walks the
// under thread's centreline out from every crossing on screen and reads the under thread's coverage from the
// pixels: (pixel - BG) projected on (U - BG), U = the under colour at that point in today's fl=0 frame (the
// reference page; inside its gap, U from the gap's outer end). Per crossing side it finds where coverage crosses
// 0.9, 0.5 and 0.1 walking inward and compares each renderer's arc distance with today's: a side passes when all
// three are within max(15% of today's, 1 device px). A fade/variant passes when it measured >= MINX crossings and
// >= PASS of its sides pass. Exit 1 on any failure (on 12feaf66, gf at fl=1.2 cut a hard gap: the ramp missing).
//
//   node .claude/probes/K1458/fade.mjs <base> <outDir> <profileDir> [fl=0,1.2] [variants=gf,gfh]
//     env SIMT=20 (frozen sim time), DSF=2, MINX=12, PASS=.85, SHOTS=1 (save every page's full png for sheets)
//     env LINKA=1 (K1548, 27U): link-A ink-coverage read. On link A the thread body IS the flat backdrop
//     in both renderers, so the (pixel-BG) on (U-BG) projection has no U to read (654 of 700 sides skip
//     on uu). LINKA takes each side's U from its own renderer's fl=0 outline ink (see sideU in measure),
//     scans the faded zone geometrically (da within fl of the gap's outer end), and does not read
//     distances; its verdict is dot sides + sameState. The default read is unchanged.
//
// The link is the brief's `?3&xp=off&am=instant&prp=off&fl=<v>` plus, for one comparable state: `phw=0` (in-thread
// physics: every load sleeps the same, frozen at SIMT, hashes printed), `fw=0` (no flow undulation), `bg=none` (a
// flat backdrop for BG) and `snd=none`. Paint clocks pinned. Headed, real time, off-screen; one profile folder.
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
const [, , base, outDir, profileDir, flArg = "0,1.2", varArg = "gf,gfh"] = process.argv;
if (!base || !outDir || !profileDir) { console.error("usage: fade.mjs <base> <outDir> <profileDir> [fl] [variants]"); process.exit(2); }
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), MINX = +(process.env.MINX ?? 12), PASS = +(process.env.PASS ?? 0.85);
// K1475: alignFreezeParity lands every load on one physics state (the substep parity fix), so
// TRIES below stays as a net that should never fire; DOTS = the most dots (gf-only one-pixel
// spikes inside the under thread's faded span) a side may have
const TRIES = +(process.env.TRIES ?? 8), DOTS = +(process.env.DOTS ?? 2);
const LINKA = process.env.LINKA === "1"; // K1548 (27U): link-A ink-coverage read (see measure)
const FLS = flArg.split(",").map(Number), VARS = varArg.split(",").filter(Boolean);
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const Q = process.env.Q ?? "3"; // K1548: Q = the link's seed token (K1460's dotted line lives on link A, Q=3.FGH1HtvQeDjm6e4BII)
const linkOf = (mode, fl) => `${base}/?${Q}&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=${fl}` +
  (mode === "gf" ? "&rp=gf" : mode === "gfh" ? "&rp=gf&gfh=1" : "");
async function load(mode, fl) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`[${mode} ${fl}] pageerror ${e.message}`));
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  const t0 = Date.now();
  await page.goto(linkOf(mode, fl), { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  if (mode !== "today") await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
  await alignFreezeParity(page, SIMT);
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
  const live = await page.evaluate(() => ({ fl: window.__knotRenderer()?.fadeLength, search: location.search }));
  const png = await page.screenshot({ type: "png" });
  if (process.env.SHOTS) writeFileSync(join(outDir, `shot_${mode}_${fl}.png`), png);
  console.log(`[${mode} fl=${fl}] ready ${Date.now() - t0} ms hash ${hash} renderer.fadeLength ${live.fl}`);
  return { page, png, hash };
}
// geometry from the reference page: per crossing side, the under centreline's points (device px), their arc from
// the crossing, their distance to the over centreline, and how far that side may walk (half way to the next pass)
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
    // every pass's arc per chain (to bound a side's walk)
    const passes = new Map();
    const passArc = [];
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
      let slot = null;
      try { const d = r.gaps.describeSlot(ci); slot = { margin: d.margin, fade: d.fade, hOver: d.hOver, win: [d.winNeg, d.winPos] }; } catch { /* none */ }
      const hOver = slot?.hOver ?? r.style.threadWidth / 2;
      for (const side of [1, -1]) {
        // half way to the next pass on the under chain, on this side
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
        out.push({ ci, side, sel: c.over.chain === c.under.chain, lim, hOver, slot, at: [Math.round(cs.x), Math.round(cs.y)], prof });
      }
    });
    return { view, crossings: ps.crossings.length, sides: out };
  }, DSF);
}
// decode PNGs in a blank page and read coverage profiles
async function measure(geo, ref, shots, refGf, fl) {
  const page = await browser.newPage();
  await page.goto("about:blank");
  const res = await page.evaluate(async (d) => {
    const load = (b64) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + b64; });
    const img = async (b64) => { const im = await load(b64); const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height; const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0); return cx.getImageData(0, 0, im.width, im.height); };
    const R = await img(d.ref);
    const G0 = d.refGf ? await img(d.refGf) : null;
    const S = {};
    for (const k of Object.keys(d.shots)) S[k] = await img(d.shots[k]);
    const px = (D, x, y) => { const xx = Math.max(0, Math.min(D.width - 1, Math.round(x))), yy = Math.max(0, Math.min(D.height - 1, Math.round(y))); const o = (yy * D.width + xx) * 4; return [D.data[o], D.data[o + 1], D.data[o + 2]]; };
    // BG: the reference frame's most common colour
    const hist = new Map();
    for (let i = 0; i < R.data.length; i += 4 * 7) { const k = (R.data[i] << 16) | (R.data[i + 1] << 8) | R.data[i + 2]; hist.set(k, (hist.get(k) ?? 0) + 1); }
    let bk = 0, bn = 0; for (const [k, n] of hist) if (n > bn) { bn = n; bk = k; }
    const BG = [bk >> 16, (bk >> 8) & 255, bk & 255];
    const sides = [];
    const skips = { iu: 0, uu: 0, first: 0, far: 0 };
    // K1548 (27U) LINKA: a side's reference U is its outline ink in a renderer's own fl=0
    // frame: the lateral sample of largest |P-BG| within 1.3 half-widths at the walk's far end.
    const sideU = (D, g) => {
      const p = g.prof[g.prof.length - 1], q = g.prof[g.prof.length - 2];
      const tx = p.x - q.x, ty = p.y - q.y, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
      const hd = g.hOver * d.scale * 1.3; let best = -1, bu = [0, 0, 0];
      for (let o = -hd; o <= hd; o += 1) { const P = px(D, p.x + nx * o, p.y + ny * o); const v = [P[0] - BG[0], P[1] - BG[1], P[2] - BG[2]]; const nn = v[0] ** 2 + v[1] ** 2 + v[2] ** 2; if (nn > best) { best = nn; bu = v; } }
      return { U: bu, uu: best };
    };
    for (const g of d.geo.sides) {
      // the gap's outer end in the reference (today fl=0): the first point past hOver + margin + 0.08 of the over thread
      const reach = g.hOver + (g.slot?.margin ?? 0.1) + 0.08;
      const iu = g.prof.findIndex((p) => p.dO > reach);
      if (iu < 0 || iu > g.prof.length - 5) { skips.iu++; continue; }
      const Uat = (i) => px(R, g.prof[Math.max(i, iu)].x, g.prof[Math.max(i, iu)].y).map((v, k) => v - BG[k]);
      const U0 = Uat(iu); const uu0 = U0[0] ** 2 + U0[1] ** 2 + U0[2] ** 2;
      let UT = null, UG = null;
      if (d.linkA) { const a = sideU(R, g), b = sideU(G0, g); UT = a.U; UG = b.U; if (b.uu < 100 || a.uu < 40) { skips.uu++; continue; } } // LINKA: outline ink too faint in one renderer to read
      else if (uu0 < 1200) { skips.uu++; continue; } // the under colour too close to the backdrop to read
      const cov = (D, i) => { const U = Uat(i), uu = U[0] ** 2 + U[1] ** 2 + U[2] ** 2; if (uu < 600) return NaN; const P = px(D, g.prof[i].x, g.prof[i].y); return ((P[0] - BG[0]) * U[0] + (P[1] - BG[1]) * U[1] + (P[2] - BG[2]) * U[2]) / uu; };
      // walk inward from the far end; the first crossing of each level (outside the over thread's own body)
      const first = g.prof.findIndex((p) => p.dO > g.hOver + 0.5 / d.scale);
      if (first < 0) { skips.first++; continue; }
      const levels = (D) => {
        const c0 = g.prof.map((_, i) => cov(D, i));
        // each renderer's levels against its OWN full thread (the walk's far end): gf's under colour differs from
        // today's by a few levels, which moved a 0.9 crossing by a whole ramp on a shallow fade
        const full = c0[c0.length - 1];
        const c = full > 0.5 ? c0.map((v) => v / full) : c0;
        const outv = {};
        for (const L of [0.9, 0.5, 0.1]) {
          let t = null;
          for (let i = g.prof.length - 1; i > first; i--) {
            const a = c[i], b = c[i - 1];
            if (!(a >= L)) { if (i === g.prof.length - 1) { t = "far"; break; } continue; }
            if (b < L) { t = g.prof[i - 1].da + (g.prof[i].da - g.prof[i - 1].da) * ((L - b) / (a - b)); break; }
          }
          if (t === null) t = g.prof[first].da; // never drops below L before the over thread: the edge
          outv[L] = t;
        }
        return { lv: outv, c };
      };
      const row = { ci: g.ci, side: g.side, at: g.at, self: g.sel };
      let T;
      if (d.linkA) { // LINKA: distances are not read (the centreline carries no ink); levels zeroed, the dot scan below is the read
        T = { lv: { 0.9: 0, 0.5: 0, 0.1: 0 }, c: g.prof.map(() => 0) };
        row.today = T.lv; row.c = { today: T.c };
        for (const k of Object.keys(S)) if (k !== "today") { row[k] = T.lv; row.c[k] = T.c; }
      } else {
        T = levels(S.today);
        if (T.lv[0.9] === "far") { skips.far++; continue; } // today's under thread is not full at the walk's end: overlapping ramps
        row.today = T.lv;
        row.c = { today: T.c };
        for (const k of Object.keys(S)) if (k !== "today") { const L = levels(S[k]); row[k] = L.lv; row.c[k] = L.c; }
      }
      row.da = g.prof.map((p) => p.da);
      // K1460: dots. The under thread's footprint (lateral offsets within 0.85 of its half width) where today's
      // centreline coverage is under 0.5 and outside the over thread's body; a pixel is a dot in a renderer when its
      // coverage exceeds today's there by 0.2 AND the mean of its four neighbours by 0.12 AND its brightest
      // neighbour by 0.08 (K1494, 27C: an isolated spike, not an edge step - gf's per-pixel edge quantises in one
      // pixel where today blends over two, so edge-contour pixels beat the neighbour mean while equalling their
      // brightest neighbour; on master every old-counted dot had brightest-neighbour excess <= 0.003, at fl 0 too,
      // where no fade ramp exists. A fringe speck in a faded span stands above all four neighbours.)
      // ramp placed differently). c12feaf6..854ac158's gf drew a dotted line on the over thread's edge contour there.
      // K1494: dotFeat records [x, y, cv, ct, cv-maxGfNeighbour, maxGfNeighbour, todayLocalRange] per counted dot (27C).
      // K1548 (27H) control, this link (seed 3, hash f9d72040; dots over sides, sides with >2; gf = gfh): OLD rule
      // 1de01c120 fl0 1918/259, fl0.5 862/146, fl1.2 620/105, fl0.14 961/162 - a8d36be33 1998/264, 862/144, 622/105,
      // 960/162 - master 620/84, 627/96, 437/67, 675/105. NEW rule: 0 sides >2 on all three (1 dot at fl0.14 on the
      // two old builds). So on this link the parent build's counted dots are the same edge steps as the fixed
      // build's (supporters 3-6 of 8, brightest-neighbour excess <0.02 on both; crops crops_1de_fl*.png): no
      // dotted line lives here, and no gate of this family can fail one build and pass the other. K1460's line
      // was on link A (Q=3.FGH1HtvQeDjm6e4BII), which this measure cannot read: 654 of 700 sides skip on uu
      // (today's under colour within ~35 levels of the flat backdrop), 46 on iu. dotsOld/dotFeatOld stay counted
      // beside the verdict so a future link-A-capable measure has the old rule to compare against.
      // K1548 (27U): that measure now exists (LINKA=1, the ink read above). On link A (hash fff8c9e5,
      // kept 554 of 700 sides on every build) OLD reads 7,272-7,288 / 10,887-10,899 / 13,705-13,723 /
      // 9,383-9,401 dots over 489-552 sides and NEW reads 4-8 dots over 0 sides at fl 0 / 0.5 / 1.2 /
      // 0.14, on 1de01c120, a8d36be33 and master alike (two loads per build, sides>2 agree 0/0; the
      // mend candidates tried offline - today's ink max over 5x5 under 0.35, and that plus an
      // interior-only footprint - also agree within 1 side: C gives 85 sides on 1de, 86 on master at
      // fl 1.2). The parent build draws no dotted line on link A for any gate: there the fringe
      // pixel's neighbour colour is the backdrop-dark thread body, and the two builds' gf frames
      // differ by ~10 px over 24 levels in the whole knot. A rule that fails 1de and passes the
      // fixed builds still has no control to read on either link (27H on ?3, this on link A).
      const seen = new Set(), pix = [];
      const hd = g.hOver * d.scale * 0.85;
      for (let i = first; i < g.prof.length - 1; i++) {
        if ((d.linkA ? !(g.prof[i].da <= g.prof[iu].da + d.fl + 0.05) : !(T.c[i] < 0.5)) || !(g.prof[i].dO > g.hOver + 1.5 / d.scale)) continue; // LINKA: the faded zone is geometric, within fl of the gap's outer end
        const tx = g.prof[i + 1].x - g.prof[i].x, ty = g.prof[i + 1].y - g.prof[i].y, tl = Math.hypot(tx, ty) || 1;
        const nx = -ty / tl, ny = tx / tl;
        for (let o = -hd; o <= hd; o += 0.5) {
          const x = Math.round(g.prof[i].x + nx * o), y = Math.round(g.prof[i].y + ny * o), k = y * 100000 + x;
          if (!seen.has(k)) { seen.add(k); pix.push([x, y, i]); }
        }
      }
      const covAt = (D, x, y, i) => { const U = d.linkA ? (D === S.today ? UT : UG) : Uat(i), uu = U[0] ** 2 + U[1] ** 2 + U[2] ** 2; const P = px(D, x, y); return ((P[0] - BG[0]) * U[0] + (P[1] - BG[1]) * U[1] + (P[2] - BG[2]) * U[2]) / uu; }; // LINKA: each renderer read against its own outline ink
      row.dots = {}; row.dotAt = {}; row.dotFeat = {}; row.dotsOld = {}; row.dotAtOld = {}; row.dotOldXY = {}; row.dotFeatOld = {};
      for (const k of Object.keys(S)) if (k !== "today") {
        let n = 0, nOld = 0; const at = [], atOld = [], xyOld = [], featOld = []; const feat = [];
        for (const [x, y, i] of pix) {
          const cv = covAt(S[k], x, y, i), ct = covAt(S.today, x, y, i);
          if (!(cv - ct > 0.2)) continue;
          const gNb = [covAt(S[k], x + 1, y, i), covAt(S[k], x - 1, y, i), covAt(S[k], x, y + 1, i), covAt(S[k], x, y - 1, i)]; const nb = (gNb[0] + gNb[1] + gNb[2] + gNb[3]) / 4;
          if (cv - nb > 0.12) { nOld++; xyOld.push([x, y]); if (atOld.length < 6) atOld.push([x, y]); const dg = [covAt(S[k], x + 1, y + 1, i), covAt(S[k], x - 1, y + 1, i), covAt(S[k], x + 1, y - 1, i), covAt(S[k], x - 1, y - 1, i)]; const sup = [...gNb, ...dg].filter((v) => v >= cv - 0.05).length; featOld.push([x, y, +cv.toFixed(3), +ct.toFixed(3), +(cv - Math.max(...gNb)).toFixed(3), +(cv - Math.max(...dg)).toFixed(3), sup]); } // K1548: the pre-27C rule, counted beside the new one; featOld = [x,y,cv,ct,cv-maxNb4,cv-maxDiag,supporters>=cv-0.05 of 8]
          if (cv - nb > 0.12 && cv - Math.max(...gNb) > 0.08) { n++; if (at.length < 6) at.push([x, y]); const tNb = [covAt(S.today, x + 1, y, i), covAt(S.today, x - 1, y, i), covAt(S.today, x, y + 1, i), covAt(S.today, x, y - 1, i)]; feat.push([x, y, +cv.toFixed(3), +ct.toFixed(3), +(cv - Math.max(...gNb)).toFixed(3), +Math.max(...gNb).toFixed(3), +(Math.max(...tNb, ct) - Math.min(...tNb, ct)).toFixed(3)]); }
        }
        row.dots[k] = n; row.dotAt[k] = at; row.dotFeat[k] = feat; row.dotsOld[k] = nOld; row.dotAtOld[k] = atOld; row.dotOldXY[k] = xyOld; row.dotFeatOld[k] = featOld;
      }
      row.dotPix = pix.length;
      sides.push(row);
    }
    return { BG, sides, skips };
  }, { ref: Buffer.from(ref).toString("base64"), shots: Object.fromEntries(Object.entries(shots).map(([k, v]) => [k, Buffer.from(v).toString("base64")])), geo, scale: geo.view.s * DSF, refGf: refGf ? Buffer.from(refGf).toString("base64") : null, linkA: LINKA, fl });
  await page.close();
  return res;
}
let failed = false;
try {
  const R = await load("today", 0);
  const geo = await geometry(R.page);
  let refGfPng = null;
  if (LINKA) { for (let t = 0; t < TRIES && !refGfPng; t++) { const P = await load("gf", 0); if (P.hash === R.hash) refGfPng = P.png; await P.page.close(); } console.log(`[LINKA] ink read: gf fl=0 reference ${refGfPng ? "kept" : "MISSING"}`); }
  console.log(`view s ${geo.view.s.toFixed(2)} css px/world (1 device px = ${(1 / (geo.view.s * DSF)).toFixed(4)} world), crossings ${geo.crossings}, sides on screen ${geo.sides.length}`);
  const refPng = R.png;
  const summary = [];
  for (const fl of FLS) {
    const shots = {};
    const hashes = {};
    // K1460: retry a load until it lands in the reference page's state
    const same = async (mode) => { let P; for (let t = 0; t < TRIES; t++) { P = await load(mode, fl); if (P.hash === R.hash) break; console.log(`[${mode} fl=${fl}] hash ${P.hash} != ${R.hash}, retry`); if (t < TRIES - 1) await P.page.close(); } return P; };
    if (fl === 0) { shots.today = refPng; hashes.today = R.hash; } else { const T = await same("today"); shots.today = T.png; hashes.today = T.hash; await T.page.close(); }
    for (const v of VARS) { const P = await same(v); shots[v] = P.png; hashes[v] = P.hash; await P.page.close(); }
    const sameState = Object.values(hashes).every((h) => h === R.hash);
    const m = await measure(geo, refPng, shots, refGfPng, fl);
    console.log(`[measure fl=${fl}] skips ${JSON.stringify(m.skips)} kept ${m.sides.length}`);
    const px1 = 1 / (geo.view.s * DSF);
    writeFileSync(join(outDir, `fade_fl${fl}.json`), JSON.stringify({ fl, hashes, BG: m.BG, px1, sides: m.sides }, null, 1));
    for (const v of VARS) {
      let pass = 0; const errs = [];
      const xs = new Set(), xsFail = new Set();
      for (const s of m.sides) {
        xs.add(s.ci);
        let ok = true;
        for (const L of [0.9, 0.5, 0.1]) {
          const a = s.today[L], b = s[v][L];
          if (b === "far") { ok = false; errs.push(9); continue; }
          const e = Math.abs(b - a); errs.push(e);
          if (e > Math.max(0.15 * a, px1) + 1e-9) ok = false;
        }
        if (ok) pass++; else xsFail.add(s.ci);
      }
      errs.sort((a, b) => a - b);
      const med = errs.length ? errs[errs.length >> 1] : NaN, p90 = errs.length ? errs[Math.floor(errs.length * 0.9)] : NaN;
      const dotSides = m.sides.filter((s) => s.dots[v] > DOTS), dotsAll = m.sides.reduce((p, s) => p + s.dots[v], 0);
      const good = xs.size >= MINX && pass >= PASS * m.sides.length && dotSides.length === 0;
      if (!good || !sameState) failed = true;
      const ld = `fl=${fl} ${v}: dots ${dotsAll} over ${m.sides.length} sides (${m.sides.reduce((p, s) => p + s.dotPix, 0)} px scanned), sides with more than ${DOTS}: ${dotSides.length}` + (dotSides.length ? ` [${dotSides.slice(0, 8).map((s) => `x${s.ci}${s.side > 0 ? "+" : "-"}@${s.at}:${s.dots[v]}`).join(" ")}]` : "");
      console.log(ld); summary.push(ld);
      const dotSidesOld = m.sides.filter((s) => s.dotsOld[v] > DOTS), dotsOldAll = m.sides.reduce((p, s) => p + s.dotsOld[v], 0);
      const lo = `fl=${fl} ${v}: OLD rule dots ${dotsOldAll}, sides with more than ${DOTS}: ${dotSidesOld.length}` + (dotSidesOld.length ? ` [${dotSidesOld.slice(0, 8).map((s) => `x${s.ci}${s.side > 0 ? "+" : "-"}@${s.at}:${s.dotsOld[v]}`).join(" ")}]` : "");
      console.log(lo); summary.push(lo);
      const line = `fl=${fl} ${v}: sides ${m.sides.length} (crossings ${xs.size}), pass ${pass} (crossings with every side passing ${xs.size - xsFail.size}), |d-today| median ${med.toFixed(4)} p90 ${p90.toFixed(4)} world, sameState ${sameState} -> ${good && sameState ? "PASS" : "FAIL"}`;
      console.log(line); summary.push(line);
      // today's three distances, averaged, against this variant's
      const mean = (k, L) => { const a = m.sides.map((s) => s[k][L]).filter((x) => typeof x === "number"); return a.length ? (a.reduce((p, q) => p + q, 0) / a.length).toFixed(3) : "-"; };
      const l2 = `   mean d90/d50/d10: today ${mean("today", 0.9)}/${mean("today", 0.5)}/${mean("today", 0.1)}  ${v} ${mean(v, 0.9)}/${mean(v, 0.5)}/${mean(v, 0.1)}`;
      console.log(l2); summary.push(l2);
    }
  }
  writeFileSync(join(outDir, "summary.txt"), summary.join("\n") + "\n");
} finally { await browser.close(); }
console.log(failed ? "FADE GUARD: FAIL" : "FADE GUARD: PASS");
process.exit(failed ? 1 : 0);
