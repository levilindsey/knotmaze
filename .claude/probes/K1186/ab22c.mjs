// K1209 run C (batch 22, 22C): Run B's build against the retired tree
// at each of 21E's flip states. Copied from ab21e.mjs (batch21e.txt's
// stand links, drags and pinned clocks verbatim, rule 11); named
// changes: the A/B phase restores each captured flip state on the
// retired build (K1209_RET, no voteOverride there) instead of forcing
// the vote, and a retired-build control pair is added per stand.
// K1186 run E (batch 21, 21E): each layer-vote flip's own ink, same
// state, both ways. Probe only; the only src change is the probe-only
// vote override (joinery.ts voteOverride, default unset).
//
// Stands and drags replayed verbatim from flips.mjs (rule 11): seed3
// ?3&am=instant&snd=none&fw=0&phw=0 and fat11
// ?11&am=instant&snd=none&fw=0&phw=0&tw=0.72&cr=4.5; per target
// junction, start on arm0 at 0.85 world from the centre, 8 steps to
// arm1 at 0.85 world, 8 steps back; control-drag first, then drag1-3.
// Named changes from flips.mjs (the report names them too):
//   1. The per-rebuild sampler (flips.mjs's INSTALL, copied) also
//      records each arm's chain/slot/dir (its vote key) and gap-near
//      (flips recomputes gap-near for the reach bound; here the raw
//      value is kept for the near-jump record).
//   2. The wrapper QUEUES a captureScene() at every rebuild where an
//      arm's (top, dives) vote flips against the previous rebuild
//      (19B only counted flips; sweeps are not replayed - the brief's
//      subject is drag flips, ji116/ji55 chatter included).
//   3. After the drags, physics frozen (ps.step no-op, phw=0), each
//      queued flip is rendered both ways at its captured state:
//      restore + vote as resolved, then restore + override forcing
//      the flip's BEFORE pair on that one arm; the junction's 260 CSS
//      px crop is diffed (changed px, any channel over 8 - 20D's
//      threshold). First, a same-build control: one captured state
//      rendered twice, override unset (0 px expected).
//   4. The sheet (control first, then each flip's resolved / forced /
//      diff at 3x) is composed here in crops.mjs's manner.
//
//   node ab21e.mjs [outDir]        (default out21e)
import puppeteer from "puppeteer-core";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, process.argv[2] || "out21e");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.K1186_BASE || "http://127.0.0.1:5890";
const RET = process.env.K1209_RET || "http://127.0.0.1:5891";
const DSF = 1.5;
const STANDS = {
  seed3: { q: "3&am=instant&snd=none&fw=0&phw=0" },
  fat11: { q: "11&am=instant&snd=none&fw=0&phw=0&tw=0.72&cr=4.5" },
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// flips.mjs's INSTALL sampler, copied, with named change 1 and the
// flip queue (named change 2). One snapshot per rebuild; on a per-arm
// vote flip, captureScene() at that state joins the queue.
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
        const near = gapNearOf(a);
        return [a.top ? 1 : 0, a.dives ? 1 : 0, bound, +reach.toFixed(5), +a.dx.toFixed(4), +a.dy.toFixed(4), a.chain, a.slot, a.dir, near === Infinity ? -1 : +near.toFixed(5)];
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
  window.__k1186e = { queue: [], prev: null, overflow: 0 };
  const orig = r.rebuildFillets.bind(r);
  let n = 0;
  r.rebuildFillets = (force) => {
    const rv = orig(force);
    const s = snap(n++);
    window.__k1186.samples.push(s);
    const E = window.__k1186e;
    if (E.prev) {
      for (let ji = 0; ji < s.J.length; ji++) {
        const a = E.prev.J[ji], b = s.J[ji];
        if (!a || !b) continue;
        const m = Math.min(a.A.length, b.A.length);
        for (let k = 0; k < m; k++) {
          if (a.A[k][0] === b.A[k][0] && a.A[k][1] === b.A[k][1]) continue;
          if (E.queue.length >= 200) { E.overflow++; continue; }
          E.queue.push({
            n: s.n, mark: s.mark, ji, armIdx: k,
            key: `${b.A[k][6]}:${b.A[k][7]}:${b.A[k][8]}`,
            before: [a.A[k][0], a.A[k][1]], after: [b.A[k][0], b.A[k][1]],
            nearBefore: a.A[k][9], nearAfter: b.A[k][9],
            centre: b.c, rec: b.rec, capture: r.captureScene(),
          });
        }
      }
    }
    E.prev = s;
    return rv;
  };
  return r.junctionArms.length;
};

// table.mjs's drawn-ink diff, copied: changed px, any channel over 8.
function diffCount(pa, pb) {
  const a = decodePNG(pa), b = decodePNG(pb);
  if (a.W !== b.W || a.H !== b.H) return { n: -1, maxD: -1 };
  let n = 0, maxD = 0;
  for (let i = 0; i < a.data.length; i += a.ch) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    if (d > 8) n++;
    if (d > maxD) maxD = d;
  }
  return { n, maxD };
}
// Diff visualisation at native size: changed px red over the resolved
// crop dimmed to a quarter (g3_probe's ab manner).
function diffImage(pa, pb) {
  const a = toRGB(decodePNG(pa)), b = decodePNG(pb);
  const bb = toRGB(b);
  const out = Buffer.alloc(a.W * a.H * 3);
  for (let i = 0; i < a.W * a.H; i++) {
    const d = Math.max(Math.abs(a.data[i * 3] - bb.data[i * 3]), Math.abs(a.data[i * 3 + 1] - bb.data[i * 3 + 1]), Math.abs(a.data[i * 3 + 2] - bb.data[i * 3 + 2]));
    if (d > 8) { out[i * 3] = 255; out[i * 3 + 1] = 0; out[i * 3 + 2] = 0; }
    else { out[i * 3] = a.data[i * 3] >> 2; out[i * 3 + 1] = a.data[i * 3 + 1] >> 2; out[i * 3 + 2] = a.data[i * 3 + 2] >> 2; }
  }
  return encodePNG({ W: a.W, H: a.H, data: out });
}

const results = { base: BASE, ret: RET, stands: {}, sheetRows: [] };
const udd = mkdtempSync(join(tmpdir(), "k1186e-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: udd,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--window-size=1760,1060"],
});
try {
  for (const [standName, st] of Object.entries(STANDS)) {
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
    if (!(await waitAsleep())) throw new Error(`${standName}: stand never slept`);
    await page.evaluate(() => {
      window.__knotPinClocks(100);
      for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
    });
    await sleep(300);
    const nj = await page.evaluate(INSTALL);
    const view0 = await page.evaluate(() => window.__knotView());
    console.log(`${standName}: ${nj} junctions, scale ${view0.s.toFixed(2)} css px/world`);

    const setMark = (m) => page.evaluate((m) => { window.__k1186.mark = m; }, m);
    const takeSamples = () => page.evaluate(() => { const s = window.__k1186.samples; window.__k1186.samples = []; return s; });
    const drainQueue = () => page.evaluate(() => { const q = window.__k1186e.queue; window.__k1186e.queue = []; return q; });
    const resetBaseline = () => page.evaluate(() => { window.__k1186e.prev = null; window.__k1186e.queue = []; });

    // Targets, verbatim from flips.mjs.
    const targets = await page.evaluate(() => {
      const r = window.__knotRenderer(), fp = r.fieldProbe, v = window.__knotView();
      const cand = [];
      for (let ji = 0; ji < r.junctionArms.length; ji++) {
        const arms = fp.arms(ji), c = fp.center(ji);
        if (!arms || arms.length < 3 || !c) continue;
        const hot = arms.some((a) => a.top || a.dives) ? 0 : 1;
        cand.push({ ji, hot, c, rec: fp.record(ji), sx: c[0] * v.s + v.x, sy: c[1] * v.s + v.y, dirs: arms.map((a) => [a.dx, a.dy]) });
      }
      cand.sort((a, b) => a.hot - b.hot || a.ji - b.ji);
      const picked = [];
      for (const c of cand) {
        if (picked.every((p) => Math.hypot(p.sx - c.sx, p.sy - c.sy) > 220)) picked.push(c);
        if (picked.length === 3) break;
      }
      return picked;
    });
    console.log("targets:", targets.map((t) => `ji${t.ji}@${t.c.map((x) => x.toFixed(1))} rec${t.rec}`).join(" "));

    const clipFor = async (centre) => {
      const v = await page.evaluate(() => window.__knotView());
      const cs = { x: centre[0] * v.s + v.x, y: centre[1] * v.s + v.y };
      return { x: Math.min(Math.max(0, Math.round(cs.x - 130)), 1700 - 260), y: Math.min(Math.max(0, Math.round(cs.y - 130)), 950 - 260), width: 260, height: 260 };
    };

    // Same-build control first (brief task 3): one captured state at
    // rest, rendered twice, override unset.
    const ctlClip = await clipFor(targets[0].c);
    const ctlCap = await page.evaluate(() => window.__knotRenderer().captureScene());
    const ctl1 = await page.screenshot({ clip: ctlClip });
    await page.evaluate((s) => { const r = window.__knotRenderer(); r.restoreScene(s); r.rebuildFillets(true); }, ctlCap);
    await sleep(250);
    const ctl2 = await page.screenshot({ clip: ctlClip });
    const ctlDiff = diffCount(ctl1, ctl2);
    writeFileSync(join(OUT, `${standName}_control_resolved.png`), ctl1);
    writeFileSync(join(OUT, `${standName}_control_forced.png`), ctl2);
    writeFileSync(join(OUT, `${standName}_control_diff.png`), diffImage(ctl1, ctl2));
    results.sheetRows.push({ rowId: `control-${standName}`, stand: standName, kind: "control", ji: targets[0].ji, centre: targets[0].c, rec: targets[0].rec, files: { resolved: `${standName}_control_resolved.png`, forced: `${standName}_control_forced.png`, diff: `${standName}_control_diff.png` }, px: ctlDiff.n, maxD: ctlDiff.maxD });
    console.log(`${standName} control: ji${targets[0].ji} diff ${ctlDiff.n} px (max ${ctlDiff.maxD})`);

    // Drags, verbatim path/timing from flips.mjs's runDrag (shots not
    // kept; the queue carries the flips).
    const standFlips = [];
    const scriptCounts = {};
    async function runDrag(script, t) {
      const v = await page.evaluate(() => window.__knotView());
      const toS = (x, y) => ({ x: x * v.s + v.x, y: y * v.s + v.y });
      const A = { x: t.c[0] + t.dirs[0][0] * 0.85, y: t.c[1] + t.dirs[0][1] * 0.85 };
      const B = { x: t.c[0] + t.dirs[1][0] * 0.85, y: t.c[1] + t.dirs[1][1] * 0.85 };
      const path = [];
      for (let i = 0; i <= 8; i++) path.push({ x: A.x + ((B.x - A.x) * i) / 8, y: A.y + ((B.y - A.y) * i) / 8 });
      for (let i = 1; i <= 8; i++) path.push({ x: B.x + ((A.x - B.x) * i) / 8, y: B.y + ((A.y - B.y) * i) / 8 });
      const p0 = toS(path[0].x, path[0].y);
      await page.mouse.move(p0.x, p0.y);
      await sleep(120);
      await page.mouse.down();
      for (let i = 0; i < path.length; i++) {
        await setMark(`${script}:step${i}`);
        const p = toS(path[i].x, path[i].y);
        await page.mouse.move(p.x, p.y, { steps: 2 });
        await sleep(140);
      }
      await page.mouse.up();
      await setMark(`${script}:release`);
      await sleep(250);
      const samples = await takeSamples();
      const q = await drainQueue();
      for (const e of q) { e.script = script; e.dragJi = t.ji; }
      standFlips.push(...q);
      scriptCounts[script] = { rebuilds: samples.length, flips: q.length };
      console.log(`${script}: ji${t.ji} ${samples.length} rebuilds, ${q.length} vote flips queued`);
    }
    await takeSamples();
    await resetBaseline();
    await runDrag("control-drag1", targets[0]);
    await waitAsleep(45000);
    await takeSamples();
    await resetBaseline();
    for (let d = 0; d < 3; d++) {
      await runDrag(`drag${d + 1}`, targets[d]);
      await waitAsleep(45000);
      await takeSamples();
      await resetBaseline();
    }
    const overflow = await page.evaluate(() => window.__k1186e.overflow);
    const ctxLost = await page.evaluate(() => window.__ctxLost);
    console.log(`${standName}: ${standFlips.length} vote flips over drags (overflow ${overflow}, ctxLost ${ctxLost})`);

    // A/B phase: physics frozen; each flip rendered both ways at its
    // captured state (brief order: resolved first, then forced).
    await page.evaluate(() => { window.__knotPS().step = function () {}; });
    await sleep(300);
    // K1209 (22C): the retired build's page for this stand - same link,
    // clocks pinned the same way, physics frozen; each base capture is
    // restored here for the cross-build shot.
    const retPage = await browser.newPage();
    retPage.on("console", (m) => log.push(`[ret ${m.type()}] ${m.text()}`));
    retPage.on("pageerror", (e) => log.push(`[ret pageerror] ${e.message}`));
    await retPage.setViewport({ width: 1700, height: 950, deviceScaleFactor: DSF });
    const retCdp = await retPage.createCDPSession();
    await retCdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    await retPage.evaluateOnNewDocument(() => {
      window.__knotLoopMode = "continuous";
      window.__ctxLost = 0;
      document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true);
      try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {}
    });
    await retPage.goto(`${RET}/?${st.q}`, { waitUntil: "load", timeout: 90000 });
    await retPage.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
    for (const t0 = Date.now(); Date.now() - t0 < 60000; await sleep(400)) {
      const a = await retPage.evaluate(() => { const p = window.__knotPerf(); return !!(p && p.asleep); });
      if (a) break;
    }
    await retPage.evaluate(() => {
      window.__knotPinClocks(100);
      for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
      window.__knotPS().step = function () {};
    });
    await sleep(300);
    {
      const cap = await retPage.evaluate(() => window.__knotRenderer().captureScene());
      const s1 = await retPage.screenshot({ clip: ctlClip });
      await retPage.evaluate((s) => { const r = window.__knotRenderer(); r.restoreScene(s); r.rebuildFillets(true); }, cap);
      await sleep(250);
      const s2 = await retPage.screenshot({ clip: ctlClip });
      const cd = diffCount(s1, s2);
      writeFileSync(join(OUT, `${standName}_controlret_resolved.png`), s1);
      writeFileSync(join(OUT, `${standName}_controlret_forced.png`), s2);
      writeFileSync(join(OUT, `${standName}_controlret_diff.png`), diffImage(s1, s2));
      results.sheetRows.push({ rowId: `controlret-${standName}`, stand: standName, kind: "control", ji: targets[0].ji, centre: targets[0].c, rec: targets[0].rec, files: { resolved: `${standName}_controlret_resolved.png`, forced: `${standName}_controlret_forced.png`, diff: `${standName}_controlret_diff.png` }, px: cd.n, maxD: cd.maxD });
      console.log(`${standName} retired control: diff ${cd.n} px (max ${cd.maxD})`);
    }
    await page.bringToFront();
    const flipRows = [];
    for (let fi = 0; fi < standFlips.length; fi++) {
      const e = standFlips[fi];
      const clip = await clipFor(e.centre);
      await page.evaluate((s) => { const r = window.__knotRenderer(); r.voteOverride = null; r.restoreScene(s); r.rebuildFillets(true); }, e.capture);
      await sleep(250);
      const resolvedVote = await page.evaluate((ji, k) => { const a = window.__knotRenderer().fieldProbe.arms(ji)[k]; return a ? [a.top ? 1 : 0, a.dives ? 1 : 0] : null; }, e.ji, e.armIdx);
      const shotR = await page.screenshot({ clip });
      await retPage.evaluate((s) => { const r = window.__knotRenderer(); r.restoreScene(s); r.rebuildFillets(true); }, e.capture);
      await sleep(250);
      const forcedVote = await retPage.evaluate((ji, k) => { const a = window.__knotRenderer().fieldProbe.arms(ji)[k]; return a ? [a.top ? 1 : 0, a.dives ? 1 : 0] : null; }, e.ji, e.armIdx);
      const shotF = await retPage.screenshot({ clip });
     const d = diffCount(shotR, shotF);
      const tag = `${standName}_f${String(fi + 1).padStart(2, "0")}_ji${e.ji}`;
      writeFileSync(join(OUT, `${tag}_resolved.png`), shotR);
      writeFileSync(join(OUT, `${tag}_forced.png`), shotF);
      writeFileSync(join(OUT, `${tag}_diff.png`), diffImage(shotR, shotF));
      const nearJump = (e.nearBefore < 0) !== (e.nearAfter < 0) || (e.nearBefore >= 0 && e.nearAfter >= 0 && Math.abs(e.nearAfter - e.nearBefore) > 1.0);
      const row = { rowId: tag, stand: standName, kind: "flip", script: e.script, dragJi: e.dragJi, rebuild: e.n, mark: e.mark, ji: e.ji, centre: e.centre, rec: e.rec, armIdx: e.armIdx, key: e.key, before: e.before, after: e.after, resolvedVote, forcedVote, nearBefore: e.nearBefore, nearAfter: e.nearAfter, nearJump, clip, files: { resolved: `${tag}_resolved.png`, forced: `${tag}_forced.png`, diff: `${tag}_diff.png` }, px: d.n, maxD: d.maxD };
      flipRows.push(row);
      results.sheetRows.push(row);
      console.log(`${tag}: ${e.script} arm${e.armIdx} ${e.key} [${e.before}]->[${e.after}] diff ${d.n} px (max ${d.maxD}) near ${e.nearBefore}->${e.nearAfter}${nearJump ? " NEAR-JUMP" : ""} votes resolved=${JSON.stringify(resolvedVote)} forced=${JSON.stringify(forcedVote)}`);
    }
    results.stands[standName] = { link: st.q, nj, view: view0, targets: targets.map((t) => ({ ji: t.ji, c: t.c, rec: t.rec })), scriptCounts, flips: flipRows, controlPx: ctlDiff.n, overflow, ctxLost, logTail: log.slice(-5) };
    await retPage.close();
    await page.close();
  }
} finally {
  await browser.close();
  try { rmSync(udd, { recursive: true, force: true }); } catch {}
}

// Sheet: control rows first (already first in sheetRows), then flips;
// columns resolved / forced / diff, each 260 CSS px crop shown at
// 780 px (3x), crops.mjs's composition.
import { readFileSync } from "node:fs";
const CELL = 780, GAP = 8;
const cols = ["resolved", "forced", "diff"];
const rows = results.sheetRows;
const sheetW = cols.length * CELL + (cols.length + 1) * GAP;
const sheetH = rows.length * CELL + (rows.length + 1) * GAP;
const sheetData = Buffer.alloc(sheetW * sheetH * 3);
for (let i = 0; i < sheetW * sheetH; i++) { sheetData[i * 3] = 24; sheetData[i * 3 + 1] = 24; sheetData[i * 3 + 2] = 24; }
rows.forEach((rec, ri) => {
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
writeFileSync(join(OUT, "flips.json"), JSON.stringify(results, null, 1));
let key = "# K1209 run C sheet key (sheet.png: controls first, then each 21E flip state; columns base (Run B) / retired (22C) / diff)\n\n";
key += "Crops: 260 CSS px at the flipping junction on its stand's pinned state (`__knotPinClocks(100)`, `phw=0`, headed real-time Chrome), shown at 780 px (3x CSS). Both builds render the flip's one captured state (captureScene in the rebuild wrapper at the flip on the base build; restoreScene on each build, physics frozen): resolved = Run B's build, forced = the retired tree at the same capture. Pixel counts at native resolution (changed px, any channel over 8, 20D's threshold). near = the flipping arm's gap-near on the base build (world; -1 = no under-window ahead); NEAR-JUMP names a window appearing (or a >1 world jump) across the flip.\n\n";
key += "| row | stand / script | junction (centre, record) | arm (key) | vote before -> after | own ink px (max) | near before -> after |\n|---|---|---|---|---|---|---|\n";
for (const r of rows) {
  if (r.kind === "control") key += `| ${r.rowId} | ${r.stand} control | ji${r.ji} (${r.centre.map((x) => x.toFixed(2)).join(", ")}) rec ${r.rec} | - | rendered twice, override unset | ${r.px} (max ${r.maxD}) | - |\n`;
  else key += `| ${r.rowId} | ${r.stand} ${r.script} (drag ji${r.dragJi}, rebuild ${r.rebuild}, ${r.mark}) | ji${r.ji} (${r.centre.map((x) => x.toFixed(2)).join(", ")}) rec ${r.rec} | arm${r.armIdx} ${r.key} | [${r.before}] -> [${r.after}] | ${r.px} (max ${r.maxD}) | ${r.nearBefore} -> ${r.nearAfter}${r.nearJump ? " NEAR-JUMP" : ""} |\n`;
}
writeFileSync(join(OUT, "sheet_key.md"), key);
console.log(key);
console.log(`sheet: ${join(OUT, "sheet.png")} (${sheetW}x${sheetH}), rows=${rows.length}`);
