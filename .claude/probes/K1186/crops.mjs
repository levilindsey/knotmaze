// K1186 run D (batch 20, 20D) task 2: re-shoot the five flips rank.mjs
// named, before / after / held, for the sheet Claude judges. Probe only;
// no src change. Held pairs: joinery's choices are recomputed inside
// rebuildFillets' closure each rebuild (no setter; fieldProbe only
// reads), so no piece can be held from outside joinery.ts. Every held
// crop here is therefore the brief's stated stand-in: the drag paused
// at the before sample for one step interval, mouse still down - the
// geometry one drag step behind the after frame. The wrapper below
// (WRAP, flips.mjs's sampler shape) wraps rebuildFillets to READ the
// choices per rebuild; it holds nothing, and the report says so per row.
//   node crops.mjs [outDir]       (default out20d; rank.mjs ran first)
// Stands verbatim from flips.mjs (rule 11): seed3 is K859's frozen
// seed-3 link without its border-look keys (named in flips.mjs), fat11
// is 19B's addition (?11&...&tw=0.72&cr=4.5). Drag paths and sample
// points come from ranking.json (19B's raw dumps' pathWorld, verbatim).
// Named changes from flips.mjs's drag: dwell is 140 ms move + 140 ms
// paused-held per step (flips.mjs: 140 ms + one screenshot), so a held
// frame exists at every step; crops centre on the FLIPPING junction
// (260 CSS px clip, as 19B) instead of the drag target.
import puppeteer from "puppeteer-core";
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, process.argv[2] || "out20d");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.K1186_BASE || "http://127.0.0.1:5781";
const DSF = 1.5;
const STANDS = {
  seed3: { q: "3&am=instant&snd=none&fw=0&phw=0" },
  fat11: { q: "11&am=instant&snd=none&fw=0&phw=0&tw=0.72&cr=4.5" },
};
const ranking = JSON.parse(readFileSync(join(OUT, "ranking.json"), "utf8"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// flips.mjs's INSTALL, copied: per-rebuild sampler over fieldProbe.
const INSTALL = () => {
  const r = window.__knotRenderer();
  const FH = () => r.style.threadWidth / 2;
  const gapNearOf = (arm) => {
    const win = r.underWindows.get(arm.chain);
    if (!win) return Infinity;
    let near = Infinity;
    for (let i = 0; i < win.length; i += 3) {
      let along = (win[i] - arm.arc0) * arm.dir;
      if (arm.closed) {
        along = ((along % arm.total) + arm.total) % arm.total;
        if (along > arm.total / 2) along -= arm.total;
      }
      const far = along + (arm.dir > 0 ? win[i + 2] : win[i + 1]);
      if (far <= 0) continue;
      const nearEdge = along - (arm.dir > 0 ? win[i + 1] : win[i + 2]);
      if (nearEdge < near) near = nearEdge;
    }
    return near;
  };
  const snap = (n) => {
    const fp = r.fieldProbe;
    const fillHalf = FH();
    const L = fillHalf * 1.25 * r.cuspRadius;
    const floor = L * 0.3;
    const J = [];
    for (let ji = 0; ji < r.junctionArms.length; ji++) {
      const arms = fp.arms(ji);
      const c = fp.center(ji);
      if (!arms || !c) { J.push(null); continue; }
      const A = arms.map((a) => {
        const dom = Math.min(L, Math.max(floor, a.domain));
        const gapTerm = Math.max(floor, gapNearOf(a) - fillHalf * 1.0);
        const reach = Math.min(dom, gapTerm);
        const bound = reach === floor ? 2 : dom <= gapTerm ? 0 : 1;
        return [a.top ? 1 : 0, a.dives ? 1 : 0, bound, +reach.toFixed(5), +a.dx.toFixed(4), +a.dy.toFixed(4)];
      });
      const jt = A.some((a) => a[0] === 1);
      const W = [];
      for (let k = 0; k < A.length; k++) {
        const a = A[k], b = A[(k + 1) % A.length];
        W.push((jt || a[0] === 1 || b[0] === 1) && a[1] === 0 && b[1] === 0 ? 1 : 0);
      }
      const disc = A.some((a) => a[0] === 1) && !A.some((a) => a[1] === 1) ? 1 : 0;
      const cov = A.map((a) => (jt && a[1] === 0 ? 1 : 0));
      J.push({ c: [+c[0].toFixed(3), +c[1].toFixed(3)], rec: fp.record(ji), A, W, disc, cov });
    }
    return { n, mark: window.__k1186.mark || "", t: performance.now(), fh: fillHalf, L, J };
  };
  window.__k1186 = { mark: "", samples: [] };
  const orig = r.rebuildFillets.bind(r);
  let n = 0;
  r.rebuildFillets = (force) => { const rv = orig(force); window.__k1186.samples.push(snap(n++)); return rv; };
  return r.junctionArms.length;
};

function pieceValue(sample, ji, kind, idx) {
  const j = sample?.J?.[ji];
  if (!j) return null;
  if (kind === "reachBound") return { bound: j.A[idx]?.[2] ?? null, reach: j.A[idx]?.[3] ?? null };
  if (kind === "cover") return j.cov[idx] ?? null;
  if (kind === "wedge") return j.W[idx] ?? null;
  if (kind === "armVote") return j.A[idx] ? [j.A[idx][0], j.A[idx][1]] : null;
  if (kind === "disc") return j.disc;
  return null;
}
const sameVal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// table.mjs's drawn-ink diff, copied: changed px, any channel over 8.
function diffPx(pa, pb) {
  const a = decodePNG(pa), b = decodePNG(pb);
  if (a.W !== b.W || a.H !== b.H) return -1;
  let n = 0;
  for (let i = 0; i < a.data.length; i += a.ch) {
    if (Math.abs(a.data[i] - b.data[i]) > 8 || Math.abs(a.data[i + 1] - b.data[i + 1]) > 8 || Math.abs(a.data[i + 2] - b.data[i + 2]) > 8) n++;
  }
  return n;
}

// Subset re-shoot (the flip2/flip5 retry): K1186_ROWS=flip2,flip5
// K1186_EXACT=1 (held shot immediately, no 140 ms held pause - flips.mjs's
// own step timing). Without K1186_ROWS every row is shot and crops.json
// is rewritten whole; with it, crops.json's other rows are kept and the
// sheet is recomposed from the merged set.
const ONLY = (process.env.K1186_ROWS || "").split(",").map((s) => s.trim()).filter(Boolean);
const EXACT = process.env.K1186_EXACT === "1";
const HELD_MS = EXACT ? 0 : 140;
let priorRows = [];
if (ONLY.length) {
  try { priorRows = JSON.parse(readFileSync(join(OUT, "crops.json"), "utf8")).rows.filter((r) => !ONLY.includes(r.rowId)); } catch {}
}
const udd = mkdtempSync(join(tmpdir(), "k1186d-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: udd,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--window-size=1760,1060"],
});
const results = [];
try {
  const rowDefs = [ranking.control, ...ranking.rows].filter((r) => !ONLY.length || ONLY.includes(r.rowId));
  for (const row of rowDefs) {
    const isControl = row.rowId === "control";
    const st = STANDS[row.stand];
    const page = await browser.newPage();
    const log = [];
    page.on("console", (m) => log.push(`[${m.type()}] ${m.text()}`));
    page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
    await page.setViewport({ width: 1700, height: 950, deviceScaleFactor: DSF });
    const cdp = await page.createCDPSession();
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    await page.evaluateOnNewDocument(() => {
      window.__knotLoopMode = "continuous";
      window.__ctxLost = 0;
      document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true);
      try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {}
    });
    await page.goto(`${BASE}/?${st.q}`, { waitUntil: "load", timeout: 90000 });
    await page.bringToFront();
    await page.mouse.move(2, 2);
    await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
    const waitAsleep = async (timeout = 60000) => {
      for (const t0 = Date.now(); Date.now() - t0 < timeout; await sleep(400)) {
        const a = await page.evaluate(() => { const p = window.__knotPerf(); return !!(p && p.asleep); });
        if (a) return true;
      }
      return false;
    };
    if (!(await waitAsleep())) throw new Error(`${row.rowId}: stand never slept`);
    await page.evaluate(() => {
      window.__knotPinClocks(100);
      for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
    });
    await sleep(300);
    const nj = await page.evaluate(INSTALL);
    // Resolve the flipping junction live: ranked ji if its centre still
    // matches, else the nearest centre (report names which happened).
    const resolved = await page.evaluate((jiRanked, centre) => {
      const r = window.__knotRenderer(), fp = r.fieldProbe;
      const c0 = jiRanked >= 0 ? fp.center(jiRanked) : null;
      const d0 = c0 ? Math.hypot(c0[0] - centre[0], c0[1] - centre[1]) : Infinity;
      if (d0 <= 1.0) return { ji: jiRanked, centre: c0, rec: fp.record(jiRanked), dist: d0, searched: false };
      let best = -1, bd = Infinity, bc = null;
      for (let ji = 0; ji < r.junctionArms.length; ji++) {
        const c = fp.center(ji);
        if (!c) continue;
        const d = Math.hypot(c[0] - centre[0], c[1] - centre[1]);
        if (d < bd) { bd = d; best = ji; bc = c; }
      }
      return { ji: best, centre: bc, rec: best >= 0 ? fp.record(best) : -1, dist: bd, searched: true };
    }, row.ji, row.centre);
    const jiUsed = resolved.ji;
    const view = await page.evaluate(() => window.__knotView());
    const toS = (x, y) => ({ x: x * view.s + view.x, y: y * view.s + view.y });
    const cs = toS(resolved.centre[0], resolved.centre[1]);
    const clip = { x: Math.min(Math.max(0, Math.round(cs.x - 130)), 1700 - 260), y: Math.min(Math.max(0, Math.round(cs.y - 130)), 950 - 260), width: 260, height: 260 };
    const setMark = (m) => page.evaluate((m) => { window.__k1186.mark = m; }, m);
    const takeSamples = () => page.evaluate(() => { const s = window.__k1186.samples; window.__k1186.samples = []; return s; });
    await takeSamples();
    const path = row.pathWorld;
    const p0 = toS(path[0].x, path[0].y);
    await page.mouse.move(p0.x, p0.y);
    await sleep(120);
    await page.mouse.down();
    const initShot = await page.screenshot({ clip });
    await sleep(HELD_MS);
    const initHeld = await page.screenshot({ clip });
    let lastSample = (await takeSamples()).pop() || null;
    const kind = isControl ? null : row.headline.kind, idx = isControl ? -1 : row.headline.idx;
    const vals = [lastSample ? pieceValue(lastSample, jiUsed, kind, idx) : null];
    const heldVals = [];
    const stepShots = [], heldShots = [];
    for (let i = 0; i < path.length; i++) {
      await setMark(`${row.rowId}:step${i}`);
      const p = toS(path[i].x, path[i].y);
      await page.mouse.move(p.x, p.y, { steps: 2 });
      await sleep(140);
      const drained = await takeSamples();
      if (drained.length) lastSample = drained[drained.length - 1];
      vals.push(lastSample ? pieceValue(lastSample, jiUsed, kind, idx) : null);
      stepShots.push(await page.screenshot({ clip }));
      await sleep(HELD_MS);
      const drained2 = await takeSamples();
      if (drained2.length) lastSample = drained2[drained2.length - 1];
      heldVals.push(lastSample ? pieceValue(lastSample, jiUsed, kind, idx) : null);
      heldShots.push(await page.screenshot({ clip }));
    }
    await page.mouse.up();
    await setMark(`${row.rowId}:release`);
    await sleep(250);
    const ctxLost = await page.evaluate(() => window.__ctxLost);
    // First step whose end-state headline value differs from the prior.
    let obsStep = -1;
    if (!isControl) for (let i = 0; i < path.length; i++) { if (!sameVal(vals[i + 1], vals[i])) { obsStep = i; break; } }
    const rankedStep = row.step;
    const useStep = obsStep >= 0 ? obsStep : rankedStep;
    const beforeBuf = useStep <= 0 ? initShot : stepShots[useStep - 1];
    const afterBuf = stepShots[useStep];
    const heldBuf = useStep <= 0 ? initHeld : heldShots[useStep - 1];
    const flipPx = diffPx(beforeBuf, afterBuf), heldPx = diffPx(beforeBuf, heldBuf);
    const files = {};
    for (const [tag, buf] of [["before", beforeBuf], ["after", afterBuf], ["held", heldBuf]]) {
      const f = `${row.rowId}_${tag}.png`;
      writeFileSync(join(OUT, f), buf);
      files[tag] = f;
    }
    const rec = { rowId: row.rowId, source: isControl ? "control" : row.source, stand: row.stand, link: st.q, script: row.script, jiRanked: row.ji, jiUsed, centreRanked: row.centre, centreLive: resolved.centre, centreDist: resolved.dist, centreSearched: resolved.searched, recRanked: row.rec ?? row.record ?? null, recLive: resolved.rec, nj, rankedStep, observedStep: obsStep, reproducedAtRankedStep: obsStep === rankedStep, usedStep: useStep, headline: isControl ? null : row.headline, values19B: isControl ? null : { before: row.headline.before, after: row.headline.after }, valuesObserved: isControl ? null : { before: vals[useStep], after: vals[useStep + 1], heldAfter: heldVals[useStep - 1] ?? null, heldFlippedDuringPause: useStep >= 1 ? !sameVal(heldVals[useStep - 1], vals[useStep]) : false, trace: vals, heldTrace: heldVals }, flipsAtTargetControl: isControl ? vals : undefined, clip, ctxLost, flipPx, heldPx, excessPx: flipPx - heldPx, files, holdMethod: EXACT ? "paused stand-in (held shot immediately after the before shot, drag paused at the before sample, mouse down); no joinery choice can be held from outside rebuildFillets" : "paused stand-in (drag paused at the before sample, mouse down, one 140 ms step interval); no joinery choice can be held from outside rebuildFillets", stepTiming: EXACT ? "exact 19B step timing (140 ms move dwell; held shot immediately after the before shot)" : "140 ms move dwell + 140 ms held pause per step", retryOf: ONLY.length ? "subset re-shoot (K1186_EXACT=1)" : null, logTail: log.slice(-5) };
    results.push(rec);
    console.log(`${row.rowId}: ${row.stand}/${row.script} ji${row.ji}->${jiUsed} rankedStep=${rankedStep} observed=${obsStep} flipPx=${flipPx} heldPx=${heldPx} excess=${flipPx - heldPx} ctxLost=${ctxLost}`);
    await page.close();
  }
} finally {
  await browser.close();
  try { rmSync(udd, { recursive: true, force: true }); } catch {}
}

// Sheet: 6 rows (control first) x 3 cols (before, after, held), no
// labels on the sheet (the report / sheet_key.md is its key). Each
// 260 CSS px crop (390 dev px at DSF 1.5) is shown at 780 px: 3x CSS.
const ORDER = ["control", "flip1", "flip2", "flip3", "flip4", "flip5"];
const sheetRows = [...priorRows, ...results].sort((a, b) => ORDER.indexOf(a.rowId) - ORDER.indexOf(b.rowId));
const CELL = 780, GAP = 8;
const cols = ["before", "after", "held"];
const sheetW = cols.length * CELL + (cols.length + 1) * GAP;
const sheetH = sheetRows.length * CELL + (sheetRows.length + 1) * GAP;
const sheetData = Buffer.alloc(sheetW * sheetH * 3);
for (let i = 0; i < sheetW * sheetH; i++) { sheetData[i * 3] = 24; sheetData[i * 3 + 1] = 24; sheetData[i * 3 + 2] = 24; }
sheetRows.forEach((rec, ri) => {
  cols.forEach((tag, ci) => {
    const img = toRGB(decodePNG(readFileSync(join(OUT, rec.files[tag]))));
    const ox = GAP + ci * (CELL + GAP), oy = GAP + ri * (CELL + GAP);
    for (let y = 0; y < CELL; y++) {
      const sy = Math.min(img.H - 1, Math.floor((y / CELL) * img.H));
      for (let x = 0; x < CELL; x++) {
        const sx = Math.min(img.W - 1, Math.floor((x / CELL) * img.W));
        const si = (sy * img.W + sx) * 3, di = ((oy + y) * sheetW + (ox + x)) * 3;
        sheetData[di] = img.data[si]; sheetData[di + 1] = img.data[si + 1]; sheetData[di + 2] = img.data[si + 2];
      }
    }
  });
});
writeFileSync(join(OUT, "sheet.png"), encodePNG({ W: sheetW, H: sheetH, data: sheetData }));
writeFileSync(join(OUT, "crops.json"), JSON.stringify({ base: BASE, rows: sheetRows }, null, 1));
let key = "# K1186 run D sheet key (sheet.png: control first, then flip1..flip5; columns before / after / held)\n\n";
key += "Crops: 260 CSS px at the flipping junction, shown at 780 px (3x CSS; 390 dev px upscaled 2x nearest). Held = paused stand-in for every row (see crops.mjs header). Pixel counts at native resolution (changed px, channel threshold 8, table.mjs's diff): flip = before->after, held = before->held, excess = flip - held.\n\n";
key += "| row | stand / script / junction | 19B ranked step | observed step | flip px | held px | excess px |\n|---|---|---|---|---|---|---|\n";
for (const r of sheetRows) key += `| ${r.rowId} | ${r.stand} ${r.script} ji${r.jiUsed} (${r.centreLive?.map((x) => x.toFixed(2)).join(", ")}) rec ${r.recLive} | ${r.rankedStep} | ${r.observedStep} | ${r.flipPx} | ${r.heldPx} | ${r.excessPx} |\n`;
writeFileSync(join(OUT, "sheet_key.md"), key);
console.log(key);
console.log(`sheet: ${join(OUT, "sheet.png")} (${sheetW}x${sheetH})`);
