// K279 stage 1 on the phone (round 2026-10-14c, K156): the ripple at phone size, what flashes, the tap's frame cost
// and the tug's wake. HEAD build only, the pass's own tab, real touch taps (page.touchscreen.tap -> pickThread ->
// tapPluck). Run: node k279_phone.mjs <config.json> [cost|wake|all] [variantKeys,comma]
// Per variant (a load each): cost phase = three real taps with an in-page rAF recorder (no CDP round trips while it
// runs; the FIRST tap after a load is reported apart), then a shot phase = clocks paused, a real tap, the pluck and
// ripple clocks set to each AGE, full-viewport frames (flash stats vs the pre-tap frame) and crops (sheet).
import { writeFileSync, appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
// K279 stage 2: the repo's own phone-pass kit (scripts/phone_pass/), not stage 1's worktree copy.
// round 2026-11-09b (K365): the kit of the round's worktree, and K279_BUILD picks the build (0 = base = floor 68, 1 = head = floor 56)
const KIT = pathToFileURL(process.env.K279_KIT || "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-ab935dd12e804fe68/scripts/phone_pass/");
const { CFG, BUILDS, connect, myPage, load, sleep, out, assertFree, checkBuild, shotViewport, thermal } = await import(new URL("lib.mjs", KIT).href);
const { composeSheet } = await import(new URL("sheet.mjs", KIT).href);
const { decodePNG, toRGB } = await import(new URL("png.mjs", KIT).href);

const MODE = process.argv[3] || "all";
const OUTDIR = process.env.K279_OUT || "k279";
const ONLY = (process.argv[4] || "").split(",").filter(Boolean);
const head = BUILDS[Number(process.env.K279_BUILD ?? 1)];
const log = (...a) => { const s = a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "); console.log(s); appendFileSync(out(OUTDIR, "log.txt"), s + "\n"); };
const r1 = (v) => (typeof v === "number" ? Number(v.toFixed(1)) : null);
const r2 = (v) => (typeof v === "number" ? Number(v.toFixed(2)) : null);

const KNOT = "7k&mf=0&am=instant&snd=none";
const OLD = "&prp=off&psh=0&ptg=0&pag=1&psz=1.75&pgh=.35&pw=.5";
const VARIANTS = [
  { key: "old", label: "old look (prp=off psh=0 ptg=0 pag=1 psz=1.75 pgh=.35 pw=.5)", q: OLD },
  { key: "wave", label: "wave (the default)", q: "&prp=wave" },
  { key: "glint", label: "glint", q: "&prp=glint" },
  { key: "ring", label: "ring", q: "&prp=ring" },
  { key: "vib", label: "new vibration only (prp=off psh=0; psz 2, pgh .5, pw .75)", q: "&prp=off&psh=0" },
  { key: "sheen", label: "sheen .5 only (prp=off; new vibration)", q: "&prp=off" },
];
const AGES = [0.05, 0.15, 0.25, 0.4];
const CROP_CSS = [230, 180];

// ---- in-page snippets (functions, run through page.evaluate) ----
const RECSTART = () => {
  const perf = () => (window.__knotPerf ? window.__knotPerf(1) : {});
  const rec = { dts: [], ts: [], tapT: null, perfStart: perf(), perfTap: null, perfPost: null, perfEnd: null, ripples0: window.__knotRipple ? window.__knotRipple().count : null, ripMax: null, ripFrames: 0, done: false };
  window.__rec = rec;
  rec.onDown = () => { if (rec.tapT == null) { rec.tapT = performance.now(); rec.perfTap = perf(); } };
  window.addEventListener("pointerdown", rec.onDown, true);
  let last = performance.now();
  const step = (t) => {
    rec.dts.push(t - last); rec.ts.push(t); last = t;
    if (rec.tapT != null && rec.perfPost == null && t >= rec.tapT + 1200) rec.perfPost = perf();
    // K279 stage 2 (K289 k): read the ripples WHILE they live (0.9 s), every frame after the tap;
    // RECSTOP runs 1.9 s after it, when they are long gone (stage 1's phone run read 0 for every look).
    if (rec.tapT != null && window.__knotRipple) {
      const n = window.__knotRipple().count;
      rec.ripMax = Math.max(rec.ripMax ?? 0, n);
      if (n > 0) rec.ripFrames++;
    }
    if (!rec.done) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const RECSTOP = () => {
  const r = window.__rec;
  r.done = true;
  window.removeEventListener("pointerdown", r.onDown, true);
  const perf = window.__knotPerf ? window.__knotPerf(1) : {};
  const rip = window.__knotRipple ? window.__knotRipple() : {};
  const P = window.__knotRenderer().plucks;
  return { dts: r.dts, ts: r.ts, tapT: r.tapT, perfStart: r.perfStart, perfTap: r.perfTap, perfPost: r.perfPost, perfEnd: perf, ripples0: r.ripples0, ripples1: r.ripMax, rippleFrames: r.ripFrames, ripplesAtStop: rip.count ?? null, active1: P.active.length };
};
const FREEZE = () => {
  const o = {};
  try {
    const r = window.__knotRenderer(), proto = Object.getPrototypeOf(r);
    r.flowStrength = 0; r.advanceClocks = function () {}; r.paintClock = 100; r.pulseBorn = 0;
    r.tickPaint = function () { return proto.tickPaint.call(this, 0); };
    const P = r.plucks, orig = Object.getPrototypeOf(P).tick;
    P.tick = function () { return orig.call(this, 0); };
    o.ok = true;
  } catch (e) { o.err = String(e); }
  try { window.__knotRipple({ paused: true }); } catch (e) { o.ripErr = String(e); }
  try {
    const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
    if (L) { L.tick = function () { return false; }; L.clock.time = 7.5; L.clock.dirty = false; if (L.active) L.renderTexture(); }
  } catch (e) { o.bgErr = String(e); }
  for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
  return o;
};
const SETT = (t) => { for (const p of window.__knotRenderer().plucks.active) p.t = t; window.__knotRipple({ t }); return { active: window.__knotRenderer().plucks.active.length, ripples: window.__knotRipple().count }; };
const CANDS = () => {
  const W = innerWidth, H = innerHeight;
  const r = window.__knotRenderer(), host = r.plucks.host, v = window.__knotView();
  const all = host.allSamples(), sc = new Float32Array(4), out = [];
  for (let c = 0; c < all.length; c++) {
    const s = all[c];
    if (!s) continue;
    const closed = host.closed(c), total = s.totalLength;
    const nodes = host.nodes(c).map((n) => n.arc).sort((a, b) => a - b);
    const spans = [];
    for (let i = 0; i + 1 < nodes.length; i++) spans.push([nodes[i], nodes[i + 1]]);
    if (closed && nodes.length > 0) spans.push([nodes[nodes.length - 1], nodes[0] + total]);
    for (const [s0, s1] of spans) {
      const L = s1 - s0;
      if (L < 1.2 || L > 8) continue;
      const mid = (s0 + s1) / 2, a = closed ? ((mid % total) + total) % total : Math.min(mid, total);
      host.sampleAt(s, a, sc, 0);
      const X = v.x + sc[0] * v.s, Y = v.y + sc[1] * v.s;
      if (X < 0.15 * W || X > 0.85 * W || Y < 0.15 * H || Y > 0.85 * H) continue;
      out.push({ chain: c, arc: a, ctrl: r.ctrlAtArc(s, a), L: +L.toFixed(3), X, Y, d: Math.hypot(X - W / 2, Y - H / 2) });
    }
  }
  return { view: { x: v.x, y: v.y, s: v.s }, W, H, dpr: devicePixelRatio, sites: out.sort((p, q) => p.d - q.d) };
};
const WAKE_INSTALL = () => {
  window.__wakeStart = (maxMs) => {
    const ps = window.__knotPS(), perf = () => window.__knotPerf(1);
    const s0 = perf().steps, sim0 = ps.simTime, t0 = performance.now(), dts = [];
    let last = t0;
    window.__wakeP = new Promise((resolve) => {
      const step = (t) => {
        dts.push(t - last); last = t;
        const p = perf(), el = t - t0, slept = !!(p.asleep && p.steps > s0);
        if (slept || el > maxMs) { resolve({ el, dts, steps: p.steps - s0, simS: ps.simTime - sim0, asleep: p.asleep, slept }); return; }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };
  return true;
};
const HOOKS = () => {
  if (window.__ctxHook) return;
  window.__ctxHook = 1; window.__ctxLost = 0;
  window.addEventListener("webglcontextlost", () => window.__ctxLost++, true);
};
const waitAsleep = (page, ms) => page.evaluate((ms) => new Promise((res) => {
  const t0 = performance.now();
  const f = () => { const p = window.__knotPerf && window.__knotPerf(1); if (p && p.asleep && p.state === "live") return res(true); if (performance.now() - t0 > ms) return res(false); requestAnimationFrame(f); };
  f();
}), ms);
async function waitView(page) {
  let last = null;
  for (let i = 0, still = 0; i < 60 && still < 4; i++) {
    const v = await page.evaluate(() => window.__knotView());
    if (last && Math.abs(v.x - last.x) < 1e-3 && Math.abs(v.y - last.y) < 1e-3 && Math.abs(v.s - last.s) < 1e-6) still++; else still = 0;
    last = v; await sleep(150);
  }
  return last;
}

// ---- node-side helpers ----
const quant = (s, f) => s[Math.floor(f * (s.length - 1))];
function winStats(dts) {
  if (!dts || !dts.length) return null;
  const s = [...dts].sort((a, b) => a - b), sum = dts.reduce((a, b) => a + b, 0);
  return { n: dts.length, fps: r1(dts.length / (sum / 1000)), p50: r1(quant(s, 0.5)), p95: r1(quant(s, 0.95)), max: r1(s[s.length - 1]), over25: dts.filter((d) => d > 25).length, over40: dts.filter((d) => d > 40).length, over50: dts.filter((d) => d > 50).length };
}
const cpuPer = (a, b) => (a && b && b.totalFrames > a.totalFrames ? r2((b.totalCostMs - a.totalCostMs) / (b.totalFrames - a.totalFrames)) : null);
function tapRecord(raw) {
  if (raw.tapT == null) return { error: "no pointerdown seen" };
  let i0 = raw.ts.findIndex((t) => t >= raw.tapT);
  if (i0 < 0) i0 = raw.ts.length;
  const pre = raw.dts.slice(1, i0);
  // the post window holds every frame that STARTED within 1.2 s of the tap (a frame straddling the window's end counts,
  // which the first run's `ts < tapT + 1200` missed: a stall of more than 1.1 s showed as n=3)
  const postIdx = []; for (let i = i0; i < raw.ts.length; i++) if (raw.ts[i] - raw.dts[i] < raw.tapT + 1200) postIdx.push(i);
  const post = postIdx.map((i) => raw.dts[i]);
  const big = []; for (let i = 1; i < raw.ts.length; i++) if (raw.dts[i] > 25) big.push({ at: r1(raw.ts[i] - raw.dts[i] - raw.tapT), dt: r1(raw.dts[i]) });
  return {
    pre: winStats(pre), post: winStats(post), firstFrameAfter: r1(raw.dts[i0]), first3max: r1(Math.max(...raw.dts.slice(i0, i0 + 3))),
    nFramesAll: raw.ts.length, totalS: r2((raw.ts.at(-1) - raw.ts[0]) / 1000), bigFrames: big.slice(0, 12),
    cpuPre: cpuPer(raw.perfStart, raw.perfTap), cpuPost: cpuPer(raw.perfTap, raw.perfPost), ripples: [raw.ripples0, raw.ripples1], rippleFrames: raw.rippleFrames, activePlucks: raw.active1,
  };
}
const LIN = (() => { const t = new Float64Array(256); for (let i = 0; i < 256; i++) { const c = i / 255; t[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; } return t; })();
function lumDiff(A, B) {
  // the two frames can differ in size by a CSS px (a real tap changed the layout viewport 411 -> 412 in the first run), so
  // compare the common top-left region with each image's own stride; sizes are reported
  const W = Math.min(A.W, B.W), H = Math.min(A.H, B.H), n = W * H;
  let sa = 0, c05 = 0, c10 = 0, c20 = 0, maxd = 0, sd = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ja = (y * A.W + x) * 3, jb = (y * B.W + x) * 3;
      const ya = LIN[A.data[ja]] * 0.2126 + LIN[A.data[ja + 1]] * 0.7152 + LIN[A.data[ja + 2]] * 0.0722;
      const yb = LIN[B.data[jb]] * 0.2126 + LIN[B.data[jb + 1]] * 0.7152 + LIN[B.data[jb + 2]] * 0.0722;
      const d = yb - ya, ad = Math.abs(d);
      sa += ya; sd += d;
      if (ad > maxd) maxd = ad;
      if (ad >= 0.05) c05++;
      if (ad >= 0.1) c10++;
      if (ad >= 0.2) c20++;
    }
  }
  return { meanY: r2(sa / n), dMeanY: Number((sd / n).toFixed(4)), areaGe05: Number((c05 / n).toFixed(4)), areaGe10: Number((c10 / n).toFixed(4)), areaGe20: Number((c20 / n).toFixed(4)), maxAbsD: r2(maxd), sizes: [A.W + "x" + A.H, B.W + "x" + B.H] };
}
function cropRGB(img, cx, cy, w, h) {
  const x0 = Math.max(0, Math.min(img.W - w, Math.round(cx - w / 2))), y0 = Math.max(0, Math.min(img.H - h, Math.round(cy - h / 2)));
  const data = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) img.data.copy(data, y * w * 3, ((y0 + y) * img.W + x0) * 3, ((y0 + y) * img.W + x0 + w) * 3);
  return { W: w, H: h, data };
}
const prep = async (page) => {
  page.removeAllListeners("pageerror");
  page.on("pageerror", (e) => results.errors.push("pageerror: " + String(e.message).slice(0, 160)));
  await page.evaluateOnNewDocument(HOOKS);
  const reduce = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  if (reduce) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  return reduce;
};

// ---- the run ----
const results = { head: head.sha, build: head.key, host: head.host, viewport: null, variants: {}, wake: {}, errors: [] };
const save = () => writeFileSync(out(OUTDIR, "results.json"), JSON.stringify(results, null, 1));
const crops = {}; // key -> { pre, age -> RGB crop }
let browser;
try {
  browser = await connect();
  results.thermalStart = thermal();
  const doVariant = async (v) => {
    assertFree();
    const page = await myPage(browser);
    const reduce = await prep(page);
    const t0 = Date.now();
    const ld = await load(page, `${head.host}/?${KNOT}${v.q}`, 60000);
    checkBuild(head, ld.stamp);
    await sleep(1500);
    const entry = { label: v.label, link: `?${KNOT}${v.q}`, reduceReportedByPhone: reduce, sleptAt: ld.sleptAt, loadS: r1((Date.now() - t0) / 1000), taps: [], flash: {}, errors: [] };
    results.variants[v.key] = entry;
    const c = await page.evaluate(CANDS);
    results.viewport = { innerW: c.W, innerH: c.H, dpr: c.dpr };
    entry.view = c.view; entry.nSites = c.sites.length;
    const picks = [];
    for (const s of c.sites.filter((s) => s.L >= 2).concat(c.sites.filter((s) => s.L < 2))) {
      if (picks.every((p) => Math.hypot(p.X - s.X, p.Y - s.Y) > 70)) picks.push(s);
      if (picks.length >= 4) break;
    }
    entry.sites = picks.map((s) => ({ X: r1(s.X), Y: r1(s.Y), L: s.L }));
    // COST: three real taps, the first one apart
    for (let k = 0; MODE !== "shots" && k < (MODE === "first" ? 1 : 3) && k < picks.length; k++) {
      assertFree();
      const s = picks[k];
      await page.evaluate(RECSTART);
      await sleep(700);
      await page.touchscreen.tap(s.X, s.Y);
      await sleep(MODE === "first" ? 4500 : 1900);
      const raw = await page.evaluate(RECSTOP);
      const rec = tapRecord(raw);
      rec.tap = k === 0 ? "first" : "warm" + k;
      rec.site = { X: r1(s.X), Y: r1(s.Y) };
      entry.taps.push(rec);
      log(v.key, rec.tap, JSON.stringify({ post: rec.post, pre: rec.pre && { fps: rec.pre.fps, p95: rec.pre.p95, max: rec.pre.max }, first: rec.firstFrameAfter, first3max: rec.first3max, big: rec.bigFrames, nAll: rec.nFramesAll, totalS: rec.totalS, cpuPre: rec.cpuPre, cpuPost: rec.cpuPost, ripples: rec.ripples, rippleFrames: rec.rippleFrames, active: rec.activePlucks }));
      await waitAsleep(page, 15000);
      await sleep(2200); // the ripple's 0.9 s life and the pluck ring out
    }
    save();
    if (MODE === "cost" || MODE === "first") return;
    // SHOTS: clocks paused, a real tap, the clocks set to each age, then a baseline (plucks cleared, ripple past its life)
    // taken AFTER the tap so that it has the post-tap viewport size (a real tap changed the layout width by a CSS px)
    assertFree();
    entry.freeze = await page.evaluate(FREEZE);
    await waitView(page);
    await sleep(300);
    const preBuf = await shotViewport(page);
    writeFileSync(out(OUTDIR, "shots", `${v.key}_pre.png`), preBuf);
    const pre = toRGB(decodePNG(preBuf));
    const scale = pre.W / c.W;
    const cw = Math.round(CROP_CSS[0] * scale), ch = Math.round(CROP_CSS[1] * scale);
    let tapped = null;
    for (const s of picks) {
      assertFree();
      await page.evaluate(() => { window.__knotRenderer().plucks.clear(); window.__knotRipple({ paused: false, t: 5 }); });
      await sleep(150);
      await page.evaluate(() => window.__knotRipple({ paused: true }));
      const n0 = await page.evaluate(() => window.__knotRipple().count);
      await page.touchscreen.tap(s.X, s.Y);
      await sleep(200);
      const st = await page.evaluate(() => ({ ripples: window.__knotRipple().count, active: window.__knotRenderer().plucks.active.length }));
      if (st.active > 0 && (["old", "vib", "sheen"].includes(v.key) || st.ripples > n0)) { tapped = { site: s, st, n0 }; break; }
    }
    if (!tapped) { entry.errors.push("no tap produced a pluck"); log(v.key, "NO PLUCK"); save(); return; }
    entry.shotTap = { X: r1(tapped.site.X), Y: r1(tapped.site.Y), ...tapped.st, ripples0: tapped.n0 };
    crops[v.key] = {};
    const aged = {};
    for (const t of AGES) {
      assertFree();
      const set = await page.evaluate(SETT, t);
      await sleep(260);
      const buf = await shotViewport(page);
      writeFileSync(out(OUTDIR, "shots", `${v.key}_t${t}.png`), buf);
      aged[t] = { img: toRGB(decodePNG(buf)), plucks: set.active, ripples: set.ripples };
    }
    assertFree();
    await page.evaluate(() => { window.__knotRenderer().plucks.clear(); window.__knotRipple({ t: 5 }); });
    await sleep(300);
    const baseBuf = await shotViewport(page);
    writeFileSync(out(OUTDIR, "shots", `${v.key}_base.png`), baseBuf);
    const base = toRGB(decodePNG(baseBuf));
    const sc2 = base.W / c.W;
    crops[v.key].pre = cropRGB(base, tapped.site.X * sc2, tapped.site.Y * sc2, cw, ch);
    for (const t of AGES) {
      entry.flash["t" + t] = { ...lumDiff(base, aged[t].img), plucks: aged[t].plucks, ripples: aged[t].ripples };
      crops[v.key][t] = cropRGB(aged[t].img, tapped.site.X * sc2, tapped.site.Y * sc2, cw, ch);
    }
    entry.ctxLost = await page.evaluate(() => window.__ctxLost ?? null);
    log(v.key, "flash", JSON.stringify(entry.flash));
    entry.scalePxPerWorld = r2(c.view.s);
    save();
    // the sheet: old on the left (blue), this variant on the right (orange); pre-tap, then the ages
    if (v.key !== "old" && crops.old) {
      const cells = [{ a: crops.old.pre, b: crops[v.key].pre, crop: true }, ...AGES.map((t) => ({ a: crops.old[t], b: crops[v.key][t], crop: true }))];
      const f = out(OUTDIR, `sheet_${v.key}.png`);
      const sz = composeSheet(cells, f);
      entry.sheet = f; entry.sheetSize = sz;
      log(v.key, "sheet", f, `${sz.W}x${sz.H}`);
      save();
    }
  };

  if (["cost", "all", "shots", "first"].includes(MODE)) {
    for (const v of VARIANTS) {
      if (ONLY.length && !ONLY.includes(v.key)) continue;
      try { await doVariant(v); } catch (e) { if (String(e.message).includes("WATCHDOG")) throw e; results.errors.push(v.key + ": " + e.message); log("ERROR", v.key, e.message); save(); }
    }
  }

  if (MODE === "wake" || MODE === "all") {
    // The tug's wake: knot mode with a REAL tap (the link's ptg 0 vs 0.3), then fabric with __knotPluck (a real tap there is a move)
    const WAKE = [
      { tag: "knot-real-ptg0", q: `${KNOT}&ptg=0`, real: true, tug: 0 },
      { tag: "knot-real-ptg0.3", q: `${KNOT}&ptg=0.3`, real: true, tug: 0.3 },
      { tag: "fabric-pluck-tug0-vs-0.3", q: "b&am=instant&snd=none", real: false },
    ];
    for (const w of WAKE) {
      if (ONLY.length && !ONLY.some((k) => w.tag.includes(k))) continue;
      try {
        assertFree();
        const page = await myPage(browser);
        await prep(page);
        const ld = await load(page, `${head.host}/?${w.q}`, 90000);
        checkBuild(head, ld.stamp);
        await sleep(1500);
        await page.evaluate(WAKE_INSTALL);
        const c = await page.evaluate(CANDS);
        const picks = [];
        for (const s of c.sites.filter((s) => s.L >= 2)) { if (picks.every((p) => Math.hypot(p.X - s.X, p.Y - s.Y) > 70)) picks.push(s); if (picks.length >= 3) break; }
        const rows = [];
        const sum = (r) => { const s = winStats(r.dts); return { tug: r.tug, site: r.site, wokeSteps: r.steps, simS: r2(r.simS), wallS: r2(r.el / 1000), sleptAgain: r.slept, fps: s && s.fps, p50: s && s.p50, p95: s && s.p95, max: s && s.max, over25: s && s.over25, over50: s && s.over50 }; };
        if (w.real) {
          for (let k = 0; k < Math.min(2, picks.length); k++) {
            assertFree();
            await waitAsleep(page, 40000); await sleep(500);
            await page.evaluate((ms) => window.__wakeStart(ms), w.tug > 0 ? 45000 : 2500);
            await page.touchscreen.tap(picks[k].X, picks[k].Y);
            const r = await page.evaluate(() => window.__wakeP);
            rows.push(sum({ ...r, tug: w.tug, site: k }));
            log(w.tag, JSON.stringify(rows.at(-1)));
          }
        } else {
          for (let k = 0; k < Math.min(2, picks.length); k++) {
            for (const tug of [0, 0.3]) {
              assertFree();
              await waitAsleep(page, 40000); await sleep(500);
              const s = picks[k];
              const r = await page.evaluate(({ s, tug, side, ms }) => { window.__wakeStart(ms); window.__knotPluck(s.chain, s.ctrl, { side, tug }); return window.__wakeP; }, { s, tug, side: k % 2 ? -1 : 1, ms: tug > 0 ? 45000 : 2500 });
              rows.push(sum({ ...r, tug, site: k }));
              log(w.tag, JSON.stringify(rows.at(-1)));
            }
          }
        }
        results.wake[w.tag] = { link: "?" + w.q, rows };
        save();
      } catch (e) { if (String(e.message).includes("WATCHDOG")) throw e; results.errors.push(w.tag + ": " + e.message); log("ERROR", w.tag, e.message); save(); }
    }
  }
} catch (e) {
  results.errors.push("ABORT: " + e.message);
  log("ABORT", e.message);
} finally {
  try { results.thermalEnd = thermal(); } catch {}
  save();
  try { if (browser) await browser.disconnect(); } catch {}
}
log("done", JSON.stringify({ variants: Object.keys(results.variants), wake: Object.keys(results.wake), errors: results.errors }));
