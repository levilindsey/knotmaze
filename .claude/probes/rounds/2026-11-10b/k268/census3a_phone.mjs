// K76 stage 2b census: the GPU frame against the CPU model's visibility, on
// one frozen state (static link, clocks pinned, pointer parked), headed
// off-screen Chrome on the real GPU.
//
//   node census.mjs <host> <outDir> <moves> [look]
//
// GAPS (every registered crossing whose center is on screen): the pixels a
// crossing cuts are found by same-state SLOT CLEARING (the frame with the
// slot, minus the frame with the slot rejected), mode off and mode on.
//   - over visible (vis 1 at the over pass), under visible: the mode-on cut
//     must be the mode-off cut, pixel for pixel (the gap is kept exactly);
//   - over hidden (vis 0): the mode-on cut must be empty, and the pixels the
//     slot WOULD cut as solved (2a's behavior) are counted;
//   - fading over passes are reported, not judged.
// JOINTS: the fan layer's pixels (frame minus the frame with both fillet
// meshes hidden), mode off and on, in a disc at every junction and free tip:
//   - the renderer hides a junction exactly when its walk vertex is unvisited;
//   - a hidden joint paints no fan pixel; a shown one paints mode-off's
//     pixels exactly (same set, same colors).
// MARKERS: each marker gap slot's factor against the model's vis.
//
// K76 stage 2d (census2d.mjs, from K268 stage 1's S/R/F census): env
// WALK=new (2c's walk to new vertices), EXTRA (link keys, e.g. &cam=follow),
// the halo breath pinned (exploreClock 2500, the 2c census's pin), HC=1 (the
// reveal's High contrast: white dots, the cut at full strength; the proof's
// CPU look drops the (1 - 0.55 u^2) factor for dots and beacon), "visible
// kept exactly" skipped (not failed) when no crossing has both threads
// shown, the joint check split into SOLID joints (every arm vis 1 from its
// slot 3 ctrl out: mode off's pixels exactly) and FADING ones (no fan pixel
// outside mode off's set), and an ATTRIBUTION per junction that differs:
// each arm's least vis along its strip, the crossing slots nearby and their
// kinds, and the fan layer re-shot with every live slot reset to solved (the
// gap gate undone): matching then means the difference is the gap gate's
// (a hidden foreign over thread no longer cuts the fan, by design).
// PROOF_UNTIL defaults to 06:20 PDT today (the stage's cap is 06:41).
//
// K268 stage 3a (census3a.mjs, from census2d.mjs): the proof sweep's deadline
// is now + BUDGET_MS (PROOF_UNTIL only when set); every slot's restore is
// judged by PIXELS (the clip re-shot after the gate rebuilt it = the frame
// before), and a shaped slot's cut must lie inside its full cut (S - R within
// F - R; the proof judges the coverage in between). JOINTS: a solid joint
// paints mode off's pixels exactly; a FADING one paints mode off's pixels
// times the arm's visibility, premultiplied over what lies beneath it with
// the mode on (N = U + a (O - U), one a per pixel for all three channels,
// within the arms' vis range). ATTRIBUTION adds, mode on against off: the
// fan RECORDS (fieldProbe arms: arc0, domain, top, dives, profiles), the
// STRIP rows the record names (the strip table), the GEOMETRY (fan vertices
// by record, per layer), and the fans rebuilt with the K430 RAMP's windows
// (the CPU side of the gap gate, which census2d's texel reset never undid).
// A junction whose fans the ramp swap repaints (fan set exact, colors
// within one level - K522's flicker floor) counts as attributed
// (attributedUW), not failed: the fans follow the ramp's windows, which
// UWRAMP above also checks directly against the renderer's own windows.
// K431: prepare waits for a BIT-EXACT view (frames forced), not
// viewStill's three decimals. PROOF's shaped-slot points come from the
// over chain's SAMP range (G3-1 emptied readSlot's pts). env ONES=shaped
// (or a slot list): the
// all-ones control, per shaped slot: clips S (as shot), R (rejected), F
// (solved, factor 1) and O (shaped with an all-ones profile: flags 0, no
// ramps, so exploreCutCover returns 1 and only the shaped branch's own path
// differs from F), each also with the fans hidden; logged as ONES [...].
// TARGETS (default 56,57,58,161): the junctions the attribution always dumps.
//
//   WALK=new EXTRA=&cam=follow PROOF=2.5:fade,2.5:beacon BUDGET_MS=600000
//   node census3a.mjs http://localhost:5850 out/census3a_master_r2 10 fade
import puppeteer from "puppeteer-core";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { decodePNG, encodePNG } from "./png.mjs";

const PROFILES = join(import.meta.dirname, "udd");
mkdirSync(PROFILES, { recursive: true });
const [, , HOST, OUTARG, MOVESARG = "2", LOOK = "fade"] = process.argv;
const MOVES = Number(MOVESARG);
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const WALK = process.env.WALK || "away";
const EXTRA = process.env.EXTRA || "";
const HC = process.env.HC === "1";
const LINK_STATIC = "k111.L&am=instant&snd=none&fw=0&phy=0" + EXTRA;
// The proof sweep stops starting new configurations after this many ms.
const DEADLINE = Math.min(Date.now() + Number(process.env.BUDGET_MS || 20 * 60 * 1000),
  process.env.PROOF_UNTIL ? Date.parse(process.env.PROOF_UNTIL) : Infinity);
// The junctions the ATTRIBUTION always dumps (shown or not, differing or not).
const TARGETS = (process.env.TARGETS || "56,57,58,161").split(",").filter(Boolean).map(Number);
const VP = { width: 1400, height: 900, deviceScaleFactor: 1 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const log = { host: HOST, moves: MOVES, look: LOOK, walk: WALK, extra: EXTRA, hc: HC };
function check(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail !== undefined ? "  " + JSON.stringify(detail).slice(0, 600) : ""}`);
}

// ---- K156 round 2026-11-09 phone port ----
const PASS = JSON.parse(readFileSync(process.env.PASSCFG, "utf8"));
const TRIPFILE = join(PASS.out, "state", "watchdog.trip");
const TRIP = () => { if (existsSync(TRIPFILE)) throw new Error("WATCHDOG TRIPPED: " + readFileSync(TRIPFILE, "utf8").trim()); };
const CVP = (process.env.CVP || "1400x900").split("x").map(Number);
let PASS_PAGE = null, EMU_CDP = null;
async function openBrowser() {
  TRIP();
  return puppeteer.connect({ browserURL: PASS.cdp, defaultViewport: null, protocolTimeout: 120000 });
}
async function passTab(browser) {
  const mine = (await browser.pages()).filter((p) => [PASS.hostA, PASS.hostB].some((h) => p.url().startsWith(h + "/")));
  let page = null;
  for (const p of mine) if ((await p.evaluate(() => document.visibilityState)) === "visible") { page = p; break; }
  page ??= mine[0];
  if (!page) throw new Error("no pass tab on " + PASS.hostA + " / " + PASS.hostB);
  PASS_PAGE = page;
  return page;
}
async function EMU(page) {
  // puppeteer's own page session holds the override, so its page.screenshot() captures under it (a capture from
  // another session than the override's intersects to zero height on the phone, lib.mjs K514).
  await page.setViewport({ width: CVP[0], height: CVP[1], deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  log.viewport = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
  console.log("VIEWPORT " + JSON.stringify(log.viewport));
}
async function PARK(browser) {
  try { if (PASS_PAGE) await PASS_PAGE.goto(PASS.hostB + "/favicon.svg", { waitUntil: "load", timeout: 30000 }); } catch { /* parked or gone */ }
  try { if (EMU_CDP) await EMU_CDP.detach(); } catch { /* gone */ }
  await browser.disconnect();
}
async function openBrowserDesktop() {
  const udd = mkdtempSync(join(PROFILES, "cen-"));
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: false,
    userDataDir: udd,
    args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
      "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding", "--window-size=1520,1000"],
  });
  const close = browser.close.bind(browser);
  browser.close = async () => {
    try { await close(); } finally {
      for (let i = 0; i < 10; i++) {
        try { rmSync(udd, { recursive: true, force: true }); break; } catch { await sleep(300); }
      }
    }
  };
  return browser;
}
const frames = async (page, n = 3) => {
  TRIP();
  for (let i = 0; i < n; i++) await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
};
const stampText = (page) =>
  page.evaluate(() => [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /sim .* wall/.test(t)) || "");
const buildStamp = (page) =>
  page.evaluate(() => ([...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t)) || "").slice(0, 60));
async function waitAsleep(page, timeout = 30000) {
  let n = 0, s = "";
  for (const t0 = Date.now(); Date.now() - t0 < timeout; await sleep(300)) {
    s = await stampText(page);
    n = /asleep/.test(s) ? n + 1 : 0;
    if (n >= 3) return s;
  }
  return "TIMEOUT " + s;
}
async function viewStill(page, timeout = 8000) {
  let last = "", n = 0;
  for (const t0 = Date.now(); Date.now() - t0 < timeout; await sleep(120)) {
    const v = await page.evaluate(() => { const v = window.__knotView(); return [v.x, v.y, v.s].map((a) => a.toFixed(3)).join(","); });
    n = v === last ? n + 1 : 0;
    last = v;
    if (n >= 4) return true;
  }
  return false;
}
const clickBox = (page, label) =>
  page.evaluate((label) => {
    const row = [...document.querySelectorAll(".tp-lblv")].find(
      (r) => r.querySelector(".tp-lblv_l")?.firstChild?.textContent.trim() === label
    );
    const el = row?.querySelector("input[type=checkbox]");
    if (!el) return null;
    el.click();
    return el.checked;
  }, label);
// k76_probe's prepare with `moves` moves: the cheapest choice for the first
// two, then the costliest that does not go straight back (explores away
// from the exit, so ten moves never finish the maze).
async function prepare(page) {
  await page.goto(`${HOST}/?${LINK_STATIC}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  /* phone port: no pointer to park */
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer() && window.__knotFabric && window.__knotFabric(), { timeout: 60000 });
  const asleep = await waitAsleep(page);
  await sleep(300);
  await clickBox(page, "Reduced motion");
  await sleep(250);
  await clickBox(page, "Reduced motion");
  await sleep(250);
  const moved = [];
  let prev = null;
  const visited = new Set([await page.evaluate(() => window.__knotFabric().head)]);
  for (let m = 0; m < MOVES; m++) {
    await viewStill(page);
    const ch = await page.evaluate(() => window.__knotFabric().choices);
    if (!ch.length) break;
    const head0 = await page.evaluate(() => window.__knotFabric().head);
    let pick;
    const fresh = ch.filter((c) => !visited.has(c.far));
    const open = fresh.filter((c) => !c.farDeadEnd);
    if (WALK === "new" && fresh.length) pick = (open.length ? open : fresh).reduce((a, b) => (b.cost > a.cost ? b : a));
    else if (m < 2) pick = ch.reduce((a, b) => (b.cost < a.cost ? b : a));
    else {
      // A choice names its far vertex `far` (main.ts __knotFabric); the
      // first ten-move run read `to`/`target` and bounced over 3 vertices.
      const away = ch.filter((c) => c.far !== prev);
      const pool = away.length ? away : ch;
      pick = pool.reduce((a, b) => (b.cost > a.cost ? b : a));
    }
    await page.touchscreen.tap(pick.screen.x, pick.screen.y);
    for (let i = 0; i < 100; i++) {
      await sleep(100);
      const f = await page.evaluate(() => { const k = window.__knotFabric(); return { a: k.animating, h: k.head }; });
      if (!f.a && f.h !== head0) break;
    }
    prev = head0;
    moved.push(await page.evaluate(() => window.__knotFabric().head));
    visited.add(moved[moved.length - 1]);
  }
  /* phone port: no pointer to park */
  await sleep(400);
  const still = await viewStill(page);
  // K431: viewStill's three decimals are not pixel-still under cam=follow
  // (the camera spring's tail moves the view ~1e-5 a shot for ~10 s, which
  // shifted every clip in the 2026-10-16 ramp run: VIEWS same=false, cuts
  // "not kept exactly" at a moved view). Wait for a BIT-EXACT stop, as
  // sheet3a's EXACT=1 does, before any frame is judged.
  const exactT0 = Date.now();
  let exactMs = -1;
  {
    let same = 0, prev = null;
    while (Date.now() - exactT0 < 60000) {
      await frames(page, 3);
      const k = await page.evaluate(() => { const v = window.__knotView(); return [v.x, v.y, v.s].join(","); });
      if (k === prev) same++; else same = 0;
      prev = k;
      if (same >= 10) { exactMs = Date.now() - exactT0; break; }
      await sleep(100);
    }
  }
  console.log(`EXACT view bit-still after ${exactMs} ms`);
  const state = await page.evaluate(() => {
    const k = window.__knotFabric();
    return { head: k.head, choices: k.choices.length, pathEdges: k.pathEdges.length, solved: !!k.solved };
  });
  return { asleep, moved, still, state };
}
const PIN = () => {
  const r = window.__knotRenderer();
  const proto = Object.getPrototypeOf(r);
  r.advanceClocks = function () {};
  r.paintClock = 100;
  r.pulseBorn = 0;
  r.tickPaint = function () { return proto.tickPaint.call(this, 0); };
  try {
    const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
    if (L) { L.tick = function () { return false; }; L.clock.time = 40; if (L.active) L.renderTexture(); }
  } catch { /* no background layer */ }
  for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
};
async function settle(page) {
  await page.evaluate(() => { const r = window.__knotRenderer(); r.paintClock = 100; r.tickPaint(0); });
  await frames(page, 3);
  await sleep(120);
}
function img(buf) {
  const a = decodePNG(buf);
  return a;
}
// A full screenshot once two in a row are identical (the backdrop and any
// fade-in settled); returns it decoded, with the tries it took.
async function stableShot(page, tries = 20) {
  TRIP();
  let prev = await page.screenshot();
  for (let i = 0; i < tries; i++) {
    await sleep(300);
    await settle(page);
    const cur = await page.screenshot();
    if (Buffer.compare(prev, cur) === 0) return { im: img(cur), tries: i + 1, buf: cur };
    prev = cur;
  }
  return { im: img(prev), tries: -1, buf: prev };
}
// Pixels (indices) where two same-size images differ.
function diffSet(a, b) {
  const out = new Set();
  for (let i = 0; i < a.W * a.H; i++) {
    const p = i * a.ch, q = i * b.ch;
    if (a.data[p] !== b.data[q] || a.data[p + 1] !== b.data[q + 1] || a.data[p + 2] !== b.data[q + 2]) out.add(i);
  }
  return out;
}
const sameColor = (a, b, i) => {
  const p = i * a.ch, q = i * b.ch;
  return a.data[p] === b.data[q] && a.data[p + 1] === b.data[q + 1] && a.data[p + 2] === b.data[q + 2];
};

// Every registered crossing on screen: its center (screen), the window
// half-size in px, the over and under visibility.
const CROSSINGS = () => {
  const r = window.__knotRenderer(), ps = window.__knotPS(), v = window.__knotView();
  const out = [];
  const nCr = ps.crossings.length;
  const thr = r.style.threadWidth;
  for (let c = 0; c < nCr; c++) {
    if (!r.slotLive[c]) continue;
    const cr = ps.crossings[c];
    const n = ps.chains[cr.over.chain].length;
    const oc = r.renderCtrl(cr.over), uc = r.renderCtrl(cr.under);
    const q = window.__knotPoint(cr.over.chain, ((oc % n) + n) % n);
    if (!q) continue;
    const x = q.x * v.s + v.x, y = q.y * v.s + v.y;
    const R = Math.ceil((thr * 2.2 + 0.6) * v.s);
    if (x - R < 0 || y - R < 0 || x + R >= innerWidth || y + R >= innerHeight) continue;
    // The least vis within 2 ctrl of a pass (the window the clip sees).
    const minNear = (chain, c0) => {
      const m = ps.chains[chain].length;
      const closed = ps.chainBreakAfter[chain] < 0;
      let lo = Infinity;
      for (let t = -2; t <= 2; t += 0.25) {
        let cc = c0 + t;
        cc = closed ? ((cc % m) + m) % m : Math.max(0, Math.min(m - 1, cc));
        lo = Math.min(lo, r.exploreVisAt(chain, cc));
      }
      return lo;
    };
    out.push({
      c, x, y, R,
      overChain: cr.over.chain, underChain: cr.under.chain,
      vo: r.exploreVisAt(cr.over.chain, oc), vu: r.exploreVisAt(cr.under.chain, uc),
      vo2: minNear(cr.over.chain, oc), vu2: minNear(cr.under.chain, uc),
      k: r.gaps.visOf(c),
    });
  }
  return out;
};
// K268: a slot is set to a factor k (k = 1 as solved, 0 rejected; a shaped
// slot loses its profile first, so k = 1 is the full solved cut), or
// RESTORED (k = null) by re-running the renderer's gap gate, which rebuilds
// every slot (shaped ones included) from the same state. setVis(k0) cannot
// restore a shaped slot: its factor reads NaN.
const setSlot = (page, c, k) =>
  page.evaluate((c, k) => {
    const r = window.__knotRenderer(), g = r.gaps;
    if (k === null) r.applyExploreGaps();
    else {
      if (k > 0) g.setShape(c, null);
      g.setVis(c, k);
    }
    g.upload();
    return { k: g.visOf(c), shaped: g.isShaped(c) };
  }, c, k);
// The view, exactly (puppeteer returns doubles round-trip exact).
const viewExact = (page) => page.evaluate(() => { const v = window.__knotView(); return [v.x, v.y, v.s]; });
// Round 2026-11-09b: captureBeyondViewport: false on every clip shot. With it on (puppeteer's default) a clip
// capture on the phone fires a page resize, which re-solves every gap slot before the pixels are taken, so a
// cleared slot never reached a clip (0/353 cut under a still camera; camera-tail noise under follow).
async function clipShot(page, cx) {
  return img(await page.screenshot({ captureBeyondViewport: false, clip: { x: Math.round(cx.x - cx.R), y: Math.round(cx.y - cx.R), width: 2 * cx.R, height: 2 * cx.R } }));
}

async function gapCensus(page, crossings, on) {
  // Per crossing: the pixels its slot cuts in this mode (frame - frame with
  // the slot rejected), and for hidden over passes the pixels the slot
  // would cut as solved.
  const res = new Map();
  for (const cx of crossings) {
    const s0 = await page.evaluate((c) => { const g = window.__knotRenderer().gaps; return { k: g.visOf(c), shaped: g.isShaped(c) }; }, cx.c);
    const k0 = s0.k;
    await settle(page);
    const A = await clipShot(page, cx);
    const vA = await viewExact(page);
    await setSlot(page, cx.c, 0);
    await settle(page);
    const B = await clipShot(page, cx);
    const cut = diffSet(A, B);
    let wouldCut = null, fullCut = null, S2 = null;
    // 2b's "would cut" frame for hidden over passes costs a third shot per
    // slot: WOULD=1 only. Shaped slots always get it (the proof's F).
    if (on && (s0.shaped || (process.env.WOULD === "1" && k0 < 1))) {
      await setSlot(page, cx.c, 1);
      await settle(page);
      S2 = await clipShot(page, cx);
      fullCut = diffSet(S2, B);
      wouldCut = fullCut.size;
    }
    const vB = await viewExact(page), vS2 = S2 ? await viewExact(page) : null;
    const back = await setSlot(page, cx.c, null);
    // K268 stage 3a: the restore judged by pixels (a shaped slot's factor
    // reads NaN, so the scalar cannot judge it).
    await settle(page);
    const A2 = await clipShot(page, cx);
    const vA2 = await viewExact(page);
    const restoredPx = diffSet(A, A2).size;
    // Stage 3a, crossing 100's pixel: a shaped slot is shot once more
    // rejected (B2) and restored (A3), with the exact view at every shot, so a
    // state-caused flip (S vs R at one view) and a view-caused one (the follow
    // camera's tail between shots) read differently.
    let B2 = null, A3 = null, vB2 = null, vA3 = null, restoredPx3 = 0;
    if (on && s0.shaped) {
      await setSlot(page, cx.c, 0); await settle(page);
      B2 = await clipShot(page, cx); vB2 = await viewExact(page);
      await setSlot(page, cx.c, null); await settle(page);
      A3 = await clipShot(page, cx); vA3 = await viewExact(page);
      restoredPx3 = diffSet(A, A3).size;
    }
    const views = on && s0.shaped ? { A: vA, B: vB, S2: vS2, A2: vA2, B2: vB2, A3: vA3 } : null;
    if (views) {
      const ks = Object.keys(views).filter((k) => views[k]);
      const same = ks.every((k) => views[k].join() === views.A.join());
      console.log(`VIEWS c=${cx.c} same=${same} ` + ks.map((k) => `${k}=[${views[k].join(",")}]`).join(" "));
    }
    // A shaped slot's cut lies inside its full cut (S - R within F - R).
    // Stage 3a's KSWEEP: master's own scalar path is not monotone in a
    // slot's strength by one 8-bit level at some AA pixels (crossing 100's
    // pixel reads G 206 at k 0.6-0.85 and 207 at k 0 and 1; 84 clip pixels
    // leave [R, F] by one level somewhere in the sweep). So a pixel where F
    // = R and S is within one level of R in every channel is quantization
    // (outsideOne, reported), and only a deeper one is a cut outside F.
    let outsideFull = null, outsidePx = null, outsideOne = null;
    if (s0.shaped && fullCut) {
      outsideFull = 0; outsidePx = []; outsideOne = 0;
      const x0 = Math.round(cx.x - cx.R), y0 = Math.round(cx.y - cx.R);
      const col = (im, i) => [im.data[i * im.ch], im.data[i * im.ch + 1], im.data[i * im.ch + 2]];
      for (const i of cut) if (!fullCut.has(i)) {
        const sC = col(A, i), rC = col(B, i);
        const one = Math.max(...sC.map((v, j) => Math.abs(v - rC[j]))) <= 1;
        if (one) outsideOne++; else outsideFull++;
        // Where it is and what each frame paints there: A as shot (S),
        // B rejected (R), S2 full (F), and its 3x3 neighbourhood's cut/full
        // membership (an edge pixel has full-cut neighbours).
        if (outsidePx.length < 8) {
          const px = i % A.W, py = Math.floor(i / A.W);
          let nCut = 0, nFull = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const q = (py + dy) * A.W + px + dx;
            if (cut.has(q)) nCut++;
            if (fullCut.has(q)) nFull++;
          }
          outsidePx.push({ x: x0 + px, y: y0 + py, one, S: col(A, i), R: col(B, i), F: col(S2, i), S_A2: col(A2, i), R_B2: B2 && col(B2, i), S_A3: A3 && col(A3, i), nCut, nFull });
        }
      }
    }
    res.set(cx.c, { k0, shaped: s0.shaped, back, cut, A, wouldCut, outsideFull, outsideOne, outsidePx, restoredPx, restoredPx3, views, restored: Object.is(back.k, k0) && back.shaped === s0.shaped && restoredPx === 0 && restoredPx3 === 0 });
  }
  return res;
}

// ---- K268 THE PROOF: each shaped slot's cut against the CPU ideal ----
// Per shaped slot (on screen), three frames of the slot's footprint: S (as
// shaped), R (the slot rejected: no cut) and F (the full solved cut). The
// measured coverage is (S - R) / (F - R) on pixels where |F - R| >= 48/255
// (the channel with the largest step); the ideal is exploreCutCover's twin
// at the pixel's projection arc A (the nearest segment of the slot's
// polyline, texel 4's parameterization, as the shader's anchor computes it).
// A GHOST is a pixel whose ideal is 0 over [A - d, A + d] (d 1.5 px of arc)
// that S still cuts (S != R); an UNDER-CUT one whose ideal is 1 there that S
// cuts less than F (S != F). Elsewhere the error |measured - ideal| is
// reported.
const smooth01 = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
function lookCpu(look, v, u, s, lat, sideFw, pxW, tw) {
  if (u < 0 || look < 2) return v;
  if (look === 2) return 1 - smooth01((u - 0.4) / 0.6);
  if (look === 4) {
    const fl = lat * 2;
    let cov = 0;
    for (let i = -1; i <= 1; i++) {
      const cf = i * (0.5 + 0.3 * u) + 0.12 * u * Math.sin(s * 7 + i * 2.1);
      const wf = 0.34 + (0.1 - 0.34) * u;
      const c = (wf - Math.abs(fl - cf)) / Math.max(4 * sideFw, 1e-4) + 0.5;
      cov = Math.max(cov, c < 0 ? 0 : c > 1 ? 1 : c);
    }
    const g = smooth01(u / 0.12);
    cov = 1 + (cov - 1) * g;
    return cov * (1 - smooth01((u - 0.5) / 0.5));
  }
  const sp = 0.95 * tw, la = lat * tw;
  const dCap = Math.sqrt(s * s + la * la) - 0.5 * tw;
  const kk = Math.max(1, Math.floor(s / sp + 0.5));
  const dx = s - kk * sp;
  const dDot = Math.sqrt(dx * dx + la * la) - 0.3 * tw * (1 - 0.4 * u);
  const c = -Math.min(dCap, dDot) / pxW + 0.5;
  // K76 stage 2d: under High contrast the dots keep full strength.
  return (c < 0 ? 0 : c > 1 ? 1 : c) * (HC ? 1 : 1 - 0.55 * u * u);
}
function cutCover(prof, A, look, tw, pxW) {
  const fl = Math.round(prof[9]);
  const mx = (fl & 16) !== 0;
  let best = mx ? 0 : 2, bu = -1, bs = 0;
  for (let r = 0; r < 2; r++) {
    if ((fl & (1 << r)) === 0) continue;
    const aS = prof[r * 4], F = prof[r * 4 + 1], dK = prof[r * 4 + 2], tK = prof[r * 4 + 3];
    const d = (A - aS) / F;
    let v = 1, u = -1;
    if (d > 0) {
      let t = d < dK ? d * (tK / dK) : tK + (d - dK) * ((1 - tK) / Math.max(1 - dK, 1e-6));
      t = Math.min(t, 1);
      v = 1 - t * t * (3 - 2 * t);
      if (t < 1 && (fl & (4 << r)) !== 0) u = t;
    }
    if (mx ? v > best || (v === best && u < 0) : v < best) { best = v; bu = u; bs = Math.abs(A - aS); }
  }
  if (best > 1) return 1;
  return lookCpu(look, best, bu, bs, 0, pxW / Math.max(tw, 1e-6), pxW, tw);
}
function projA(sl, wx, wy) {
  const { pts, n, ps, step } = sl;
  let best = Infinity, bk = -1, bt = 0;
  for (let k = 0; k < n - 1; k++) {
    const ax = pts[2 * k], ay = pts[2 * k + 1], dx = pts[2 * k + 2] - ax, dy = pts[2 * k + 3] - ay;
    const L2 = dx * dx + dy * dy;
    let t = L2 > 0 ? ((wx - ax) * dx + (wy - ay) * dy) / L2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const qx = ax + t * dx - wx, qy = ay + t * dy - wy, d2 = qx * qx + qy * qy;
    if (d2 < best) { best = d2; bk = k; bt = t; }
  }
  return ps + Math.min(bk + bt, n - 1) * step;
}
const SHAPED_INFO = () => {
  const r = window.__knotRenderer(), g = r.gaps, v = window.__knotView();
  const st = r.exploreGapState();
  const slots = [];
  for (const c of st.shapedSlots) {
    const sl = g.readSlot(c);
    // G3-1: readSlot's pts is empty (points live in SAMP). Rebuild them
    // from the over chain's samples through the slot's SAMP range - the
    // segments the shader measures; arc frame = kStart/stride x arcPer.
    const rg = sl.range;
    const samples = r.chainSamples[r.slotOverChain[c]];
    const pts = [];
    for (let j = 0; j < rg.n; j++) {
      const raw = rg.kStart + j * rg.stride;
      const idx = rg.closed ? ((raw % rg.count) + rg.count) % rg.count : Math.max(0, Math.min(rg.count - 1, raw));
      pts.push(samples.positions[idx * 2], samples.positions[idx * 2 + 1]);
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < rg.n; i++) {
      const x = pts[2 * i] * v.s + v.x, y = pts[2 * i + 1] * v.s + v.y;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    slots.push({ c, n: rg.n, pts, ps: rg.kStart * rg.arcPer, step: rg.stride * rg.arcPer, prof: g.readShape(c), bbox: [x0, y0, x1, y1] });
  }
  const { shapedSlots, ...counts } = st;
  return { v: { x: v.x, y: v.y, s: v.s }, tw: r.style.threadWidth, look: Math.round(r.exploreLookIndex ?? -1), counts, slots, W: innerWidth, H: innerHeight };
};
async function proof(page, look, label) {
  const info = await page.evaluate(SHAPED_INFO);
  const pxW = 1 / info.v.s;
  const pad = Math.ceil((info.tw + 0.8) * info.v.s) + 3;
  const out = { label, look, counts: info.counts, slots: 0, offScreen: 0, px: 0, ghosts: 0, under: 0, between: 0, errs: [], perSlot: [] };
  for (const sl of info.slots) {
    if (process.env.PROOF_SLOT && Number(process.env.PROOF_SLOT) !== sl.c) continue;
    const x0 = Math.max(0, Math.floor(sl.bbox[0] - pad)), y0 = Math.max(0, Math.floor(sl.bbox[1] - pad));
    const x1 = Math.min(info.W, Math.ceil(sl.bbox[2] + pad)), y1 = Math.min(info.H, Math.ceil(sl.bbox[3] + pad));
    if (x1 - x0 < 4 || y1 - y0 < 4) { out.offScreen++; continue; }
    const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    await settle(page);
    const Sb = await page.screenshot({ captureBeyondViewport: false, clip });
    const S = img(Sb);
    // 2b's scalar for this slot, read while it is still shaped (texel 1.w
    // over the solved strength).
    const k2b = out.perSlot.length < 2 ? await page.evaluate((c) => {
      const g = window.__knotRenderer().gaps, s = g.solved[c * 3];
      return s > 0 ? g.data[(c + 1) * 25 * 4 + 7] / s : 1;
    }, sl.c) : null;
    await setSlot(page, sl.c, 0); await settle(page);
    const Rb = await page.screenshot({ captureBeyondViewport: false, clip });
    const R = img(Rb);
    await setSlot(page, sl.c, 1); await settle(page);
    const Fb = await page.screenshot({ captureBeyondViewport: false, clip });
    const F = img(Fb);
    // The sheet: the first two slots of each sweep entry keep their crops,
    // plus 2b's scalar cut (texel 1.w / the solved strength) beside them.
    if (k2b !== null) {
      try {
        await setSlot(page, sl.c, k2b); await settle(page);
        const Bb = await page.screenshot({ captureBeyondViewport: false, clip });
        const dir = join(OUT, "sheet");
        mkdirSync(dir, { recursive: true });
        const tag = `${label.replace(/[^\w.]+/g, "_")}_c${sl.c}`;
        for (const [k, b] of [["S", Sb], ["B", Bb], ["F", Fb], ["R", Rb]]) writeFileSync(join(dir, `${tag}_${k}.png`), b);
        out.sheet = out.sheet || [];
        out.sheet.push({ c: sl.c, tag, k2b: +k2b.toFixed(3) });
      } catch (e) { out.sheetErr = String(e); }
    }
    const back = await setSlot(page, sl.c, null);
    await settle(page);
    const S2 = img(await page.screenshot({ captureBeyondViewport: false, clip }));
    const restoredPx = diffSet(S, S2).size;
    out.slots++;

    const rec = { c: sl.c, clip, n: sl.n, prof: sl.prof.map((x) => +x.toFixed(4)), px: 0, ghosts: 0, under: 0, between: 0, maxErr: 0, restored: back.shaped && restoredPx === 0, restoredPx };
    const WANT = !!process.env.PROOF_IMG && String(process.env.PROOF_SLOT || sl.c) === String(sl.c);
    const idI = WANT ? new Uint8Array(S.W * S.H * 3) : null, mI = WANT ? new Uint8Array(S.W * S.H * 3) : null, kI = WANT ? new Uint8Array(S.W * S.H * 3) : null;
    for (let yy = 0; yy < S.H; yy++) {
      for (let xx = 0; xx < S.W; xx++) {
        const i = yy * S.W + xx, p = i * S.ch;
        let ch = 0, step = 0, dSR = 0, dSF = 0;
        for (let q = 0; q < 3; q++) {
          const fr = F.data[p + q] - R.data[p + q];
          if (Math.abs(fr) > Math.abs(step)) { step = fr; ch = q; }
          dSR = Math.max(dSR, Math.abs(S.data[p + q] - R.data[p + q]));
          dSF = Math.max(dSF, Math.abs(S.data[p + q] - F.data[p + q]));
        }
        if (Math.abs(step) < 48) { if (WANT) { for (const I of [idI, mI, kI]) { I[i * 3] = 20; I[i * 3 + 1] = 20; I[i * 3 + 2] = 60; } } continue; }
        const wx = (x0 + xx + 0.5 - info.v.x) / info.v.s, wy = (y0 + yy + 0.5 - info.v.y) / info.v.s;
        const A = projA(sl, wx, wy);
        const d = 1.5 * pxW;
        const id = cutCover(sl.prof, A, look, info.tw, pxW);
        const lo = cutCover(sl.prof, A - d, look, info.tw, pxW), hi = cutCover(sl.prof, A + d, look, info.tw, pxW);
        rec.px++;
        if (WANT) {
          const mm = Math.max(0, Math.min(1, (S.data[p + ch] - R.data[p + ch]) / step));
          const g1 = Math.round(255 * id), g2 = Math.round(255 * mm);
          idI[i * 3] = idI[i * 3 + 1] = idI[i * 3 + 2] = g1; mI[i * 3] = mI[i * 3 + 1] = mI[i * 3 + 2] = g2;
          const ghost = id === 0 && lo === 0 && hi === 0 && dSR > 3, under = id >= 0.999 && lo >= 0.999 && hi >= 0.999 && dSF > 3;
          const e2 = Math.min(1, Math.abs(mm - id) * 2);
          kI[i * 3] = ghost ? 255 : under ? 0 : Math.round(60 + 100 * e2); kI[i * 3 + 1] = ghost || under ? 0 : Math.round(60 + 100 * e2); kI[i * 3 + 2] = under ? 255 : ghost ? 0 : 60;
        }
        if (id === 0 && lo === 0 && hi === 0) { if (dSR > 3) rec.ghosts++; continue; }
        if (id >= 0.999 && lo >= 0.999 && hi >= 0.999) { if (dSF > 3) rec.under++; continue; }
        const m = (S.data[p + ch] - R.data[p + ch]) / step;
        const e = Math.abs(m - id);
        rec.between++;
        rec.maxErr = Math.max(rec.maxErr, e);
        out.errs.push(e);
      }
    }
    if (WANT) {
      const SC = 3, PW = S.W * SC, PH = S.H * SC, cols = 3, rows = 2, G = 4;
      const OW = cols * PW + (cols + 1) * G, OH = rows * PH + (rows + 1) * G;
      const od = Buffer.alloc(OW * OH * 3, 128);
      const rgb = (im) => (x, y) => { if (im.ch) { const q = (y * im.W + x) * im.ch; return [im.data[q], im.data[q + 1], im.data[q + 2]]; } const q = (y * S.W + x) * 3; return [im[q], im[q + 1], im[q + 2]]; };
      const panels = [rgb(S), rgb(R), rgb(F), rgb(idI), rgb(mI), rgb(kI)];
      panels.forEach((get, k) => {
        const ox = G + (k % cols) * (PW + G), oy = G + ((k / cols) | 0) * (PH + G);
        for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const c = get((x / SC) | 0, (y / SC) | 0), o = ((oy + y) * OW + ox + x) * 3; od[o] = c[0]; od[o + 1] = c[1]; od[o + 2] = c[2]; }
      });
      writeFileSync(join(OUT, `c${sl.c}_${label.replace(/[^\w.]+/g, "_")}_panels.png`), encodePNG({ W: OW, H: OH, data: od }));
      rec.panels = { clip };
    }
    out.px += rec.px; out.ghosts += rec.ghosts; out.under += rec.under; out.between += rec.between;
    rec.maxErr = +rec.maxErr.toFixed(3);
    out.perSlot.push(rec);
  }
  const e = out.errs.sort((a, b) => a - b);
  const q = (f) => (e.length ? +e[Math.min(e.length - 1, Math.floor(f * e.length))].toFixed(3) : null);
  out.err = { n: e.length, mean: e.length ? +(e.reduce((a, b) => a + b, 0) / e.length).toFixed(4) : null, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) };
  delete out.errs;
  out.restoredAll = out.perSlot.every((r) => r.restored);
  return out;
}

async function jointCensus(page) {
  return page.evaluate(() => {
    const r = window.__knotRenderer(), ps = window.__knotPS(), v = window.__knotView(), k = window.__knotFabric();
    const s = window.__knotExplore({});
    const seen = (s.seen || []).map((e) => (Array.isArray(e) ? e[0] : e.id ?? e));
    const seenPts = seen.map((id) => ({ id, p: k.vertexScreen(id) })).filter((e) => e.p);
    const st = r.exploreJointState();
    const hidJ = new Set(st.junctions), hidT = new Set(st.freeTips);
    const pt = (chain, ctrl) => {
      const n = ps.chains[chain].length;
      const q = window.__knotPoint(chain, ((ctrl % n) + n) % n);
      return q ? { x: q.x * v.s + v.x, y: q.y * v.s + v.y } : null;
    };
    const jn = r.junctionArms.map((j, i) => {
      const a = j.arms[0];
      const p = pt(a.chain, a.slot);
      let best = Infinity, bestId = null;
      for (const e of seenPts) {
        const d = Math.hypot(e.p.x - p.x, e.p.y - p.y);
        if (d < best) { best = d; bestId = e.id; }
      }
      // K76 2d: each arm's least vis from its slot 3 ctrl out (the strip's
      // reach and then some), and the ctrl where it is least.
      const armMin = j.arms.map((a) => {
        const n = ps.chains[a.chain].length, closed = ps.chainBreakAfter[a.chain] < 0;
        let lo = Infinity, at = a.slot, hi = -Infinity;
        for (let t = 0; t <= 3; t += 0.125) {
          let cc = a.slot + a.dir * t;
          cc = closed ? ((cc % n) + n) % n : Math.max(0, Math.min(n - 1, cc));
          const vv = r.exploreVisAt(a.chain, cc);
          if (vv < lo) { lo = vv; at = cc; }
          if (vv > hi) hi = vv;
        }
        return { chain: a.chain, slot: +a.slot.toFixed(2), dir: a.dir, min: +lo.toFixed(4), max: +hi.toFixed(4), at: +at.toFixed(2) };
      });
      return { i, x: p.x, y: p.y, hidden: hidJ.has(i), visited: best < 6, seenDist: best, arms: j.arms.length,
        vis: j.arms.map((a) => r.exploreVisAt(a.chain, a.slot)), armMin, solid: armMin.every((a) => a.min >= 0.999) };
    });
    const tips = r.freeTips.map((t, i) => {
      const n = ps.chains[t.chain].length;
      const c = t.atEnd ? n - 1 : 0;
      const p = pt(t.chain, c);
      return { i, x: p.x, y: p.y, hidden: hidT.has(i), vis: r.exploreVisAt(t.chain, c) };
    });
    const markers = (r.markerOccluders || []).map((m, i) => ({
      i, chain: m?.chain, ctrl: m?.ctrl, exit: m?.exit === true, lifted: m?.exit === true && !!r.exploreFinish, vis: m ? r.exploreVisAt(m.chain, m.ctrl) : null, k: r.gaps.visOf(r.markerBase + i),
    }));
    return { jn, tips, markers, threadWidth: r.style.threadWidth, s: v.s, seen: seen.length };
  });
}
const fans = (page, on) =>
  page.evaluate((on) => {
    const r = window.__knotRenderer();
    for (const m of [r.filletMesh, r.filletTopMesh]) if (m && m.mesh) m.mesh.renderable = on;
  }, on);

// K268 stage 3a: what the fans of junctions `list` are built from, as the
// last rebuild left it: the RECORD (fieldProbe: center, gate, the arms with
// arc0 / domain / top / dives and their radial profiles; the record texels'
// per-arm header), the STRIP rows the record names (the strip table), the
// GEOMETRY (fan + cover-strip vertices whose aRec names the record, per
// layer), and the underWindows on the arms' chains near the joint.
const DUMP_J = (list) => {
  const r = window.__knotRenderer();
  const P = r.fieldProbe;
  if (!P) return { err: "no fieldProbe" };
  const R4 = (x) => Math.round(x * 1e4) / 1e4;
  let J = null;
  try { J = r.filletMesh.mesh.shader.resources.uJData.resource; } catch { J = null; }
  const T = r.stripTableData;
  const profN = r.fieldProfLen;
  const meshes = [["bottom", r.filletMesh], ["top", r.filletTopMesh]];
  const out = {};
  for (const ji of list) {
    const rb = P.record(ji);
    const arms = P.arms(ji).map((a) => ({
      chain: a.chain, slot: R4(a.slot), dir: a.dir, arc0: R4(a.arc0), domain: R4(Math.min(a.domain, 1e9)), toEnd: R4(Math.min(a.toEnd, 1e9)),
      top: !!a.top, dives: !!a.dives, ang: R4(a.ang), pth: [...(a.pth || [])].slice(0, profN).map(R4), ps: [...(a.ps || [])].slice(0, profN).map(R4),
      flank: a.flankPts ? a.flankPts.length : null,
    }));
    let head = null, armHead = null, strips = null;
    if (J && rb >= 0) {
      const o = rb * 4;
      head = [...J.slice(o, o + 8)].map(R4);
      const n = Math.round(J[o + 2]);
      armHead = [];
      strips = [];
      for (let i = 0; i < n; i++) {
        const ab = (rb + 2 + i * (2 + profN)) * 4;
        const h = [...J.slice(ab, ab + 8)].map(R4);
        armHead.push(h);
        const row = Math.round(J[ab + 2]);
        strips.push(T && row >= 0 ? { row, t: [...T.slice(row * 8, row * 8 + 8)].map(R4) } : null);
      }
    }
    const geom = {};
    for (const [name, m] of meshes) {
      if (!m) continue;
      const vd = m.vertexData, rd = m.recData, md = m.maskData, nv = m.vUsed;
      const fan = [], strip = [], masks = new Set();
      for (let v = 0; v < nv; v++) {
        if (Math.floor(rd[v] + 1e-6) !== rb) continue;
        const isStrip = rd[v] - Math.floor(rd[v] + 1e-6) > 0.1;
        (isStrip ? strip : fan).push(R4(vd[2 * v]), R4(vd[2 * v + 1]));
        for (let k = 0; k < 4; k++) if (md[v * 4 + k] >= 0) masks.add(md[v * 4 + k]);
      }
      geom[name] = { fan, strip, masks: [...masks].sort((a, b) => a - b) };
    }
    const c = P.center(ji);
    const uw = {};
    for (const a of P.arms(ji)) {
      const w = r.underWindows.get(a.chain);
      uw[a.chain] = w ? [...w].map(R4) : [];
    }
    const g = P.gate(ji);
    out[ji] = { rb, center: c ? [...c].map(R4) : null, gate: g ? [...g].map(R4) : null, full: P.full(ji), arms, head, armHead, strips, geom, uw };
  }
  return out;
};
// The differences between two DUMP_J entries of one junction (mode off `a`,
// mode on `b`): field by field, the largest |delta|.
function dumpDiff(a, b) {
  if (!a || !b) return { missing: !a ? "off" : "on" };
  const d = {};
  const num = (x, y) => (typeof x === "number" && typeof y === "number" ? Math.abs(x - y) : x === y ? 0 : Infinity);
  const arr = (x, y) => {
    if (!x || !y) return x === y ? 0 : Infinity;
    if (x.length !== y.length) return `len ${x.length} vs ${y.length}`;
    let m = 0;
    for (let i = 0; i < x.length; i++) m = Math.max(m, num(x[i], y[i]));
    return m;
  };
  if (a.rb !== b.rb) d.rb = [a.rb, b.rb];
  const c = arr(a.center, b.center); if (c) d.center = c;
  const g = arr(a.gate, b.gate); if (g) d.gate = [a.gate, b.gate];
  if (a.full !== b.full) d.full = [a.full, b.full];
  if (a.head && b.head) {
    // Texel 0 = (jx, jy, n, 0); texel 1 = (J1.x, J1.y, webFade, 0).
    if (arr(a.head.slice(0, 4), b.head.slice(0, 4))) d.headGeom = { off: a.head.slice(0, 4), on: b.head.slice(0, 4) };
    if (arr(a.head.slice(4), b.head.slice(4))) d.headGate = { off: a.head.slice(4), on: b.head.slice(4) };
  } else if (a.head !== b.head) d.head = { off: a.head, on: b.head };
  d.arms = [];
  for (const x of a.arms) {
    const y = b.arms.find((q) => q.chain === x.chain && q.slot === x.slot && q.dir === x.dir);
    if (!y) { d.arms.push({ chain: x.chain, slot: x.slot, missingOn: true }); continue; }
    const e = {};
    for (const k of ["arc0", "domain", "toEnd", "ang"]) { const v = num(x[k], y[k]); if (v > 1e-4) e[k] = [x[k], y[k]]; }
    for (const k of ["top", "dives", "flank"]) if (x[k] !== y[k]) e[k] = [x[k], y[k]];
    for (const k of ["pth", "ps"]) { const v = arr(x[k], y[k]); if (v) e[k] = v; }
    if (Object.keys(e).length) d.arms.push({ chain: x.chain, slot: x.slot, dir: x.dir, ...e });
  }
  if (!d.arms.length) delete d.arms;
  if (a.armHead && b.armHead) {
    const ah = a.armHead.map((x, i) => (b.armHead[i] ? arr(x.filter((_, k) => k !== 2), b.armHead[i].filter((_, k) => k !== 2)) : Infinity));
    if (ah.some((v) => v)) d.armHead = { maxDelta: ah, off: a.armHead, on: b.armHead };
    const st = a.strips.map((x, i) => (x && b.strips[i] ? arr(x.t, b.strips[i].t) : x === b.strips[i] ? 0 : Infinity));
    if (st.some((v) => v)) d.strips = { maxDelta: st, off: a.strips, on: b.strips };
  }
  d.geom = {};
  for (const L of ["bottom", "top"]) {
    const x = a.geom[L], y = b.geom[L];
    if (!x || !y) continue;
    const e = {};
    for (const k of ["fan", "strip"]) {
      if (x[k].length !== y[k].length) e[k] = `verts ${x[k].length / 2} vs ${y[k].length / 2}`;
      else { const v = arr(x[k], y[k]); if (v) e[k] = `max |dpos| ${v}`; }
    }
    if (x.masks.join() !== y.masks.join()) e.masks = [x.masks, y.masks];
    if (Object.keys(e).length) d.geom[L] = e;
  }
  if (!Object.keys(d.geom).length) delete d.geom;
  const uw = {};
  for (const ch of Object.keys(a.uw)) {
    const x = a.uw[ch], y = b.uw[ch] || [];
    if (x.join() !== y.join()) uw[ch] = { off: x, on: y };
  }
  if (Object.keys(uw).length) d.underWindows = uw;
  return d;
}
// A DUMP_J difference that can change the fan's pixels (the record texel's
// index and the CPU underWindows are inputs or bookkeeping, not output).
const MATERIAL = ["missing", "center", "full", "head", "headGeom", "headGate", "arms", "armHead", "strips", "geom"];
const isMaterial = (dd) => MATERIAL.some((k) => dd[k] !== undefined);

async function main() {
  const browser = await openBrowser();
  try {
    const page = await passTab(browser);
    // K268 round 2026-11-10: one framing in both modes. Under cam=follow the camera spring takes ~10 s to stop (K431), so
    // after EVERY explore-mode toggle wait at least 12 s, then for a bit-exact view, before any frame is judged.
    {
      const _ev = page.evaluate.bind(page);
      let inWait = false;
      page.evaluate = async (fn, ...a) => {
        const r = await _ev(fn, ...a);
        if (!inWait && /__knotExplore\(\s*\{\s*on\b/.test(String(fn))) {
          inWait = true;
          try {
            const t0 = Date.now(); let same = 0, prev = null, ms = -1;
            while (Date.now() - t0 < 60000) {
              TRIP();
              await frames(page, 3);
              const k = await _ev(() => { const v = window.__knotView(); return [v.x, v.y, v.s].join(","); });
              if (k === prev) same++; else same = 0;
              prev = k;
              if (same >= 10 && Date.now() - t0 >= 12000) { ms = Date.now() - t0; break; }
              await sleep(100);
            }
            console.log(`TOGGLE wait: view bit-still after ${ms} ms`);
          } finally { inWait = false; }
        }
        return r;
      };
    }
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message ?? e)));
    await page.evaluateOnNewDocument(() => {
      window.__ctxLost = [];
      window.addEventListener("webglcontextlost", () => window.__ctxLost.push(["lost", performance.now()]), true);
      window.addEventListener("webglcontextrestored", () => window.__ctxLost.push(["restored", performance.now()]), true);
      try { localStorage.removeItem("knotmaze.motion"); localStorage.removeItem("knotmaze.contrast"); } catch { /* none */ }
    });
    await EMU(page);
    const cdp = await page.createCDPSession();
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    const prep = await prepare(page);
    log.prep = prep;
    log.stamp = await buildStamp(page);
    check(`settled, moved ${MOVES} times, view still, not solved`, !/TIMEOUT/.test(prep.asleep) && prep.moved.length === MOVES && prep.still && !prep.state.solved, prep);
    await page.evaluate(PIN);
    await settle(page);

    // ---- mode off ----
    const st0 = await stableShot(page);
    log.stableTries = st0.tries;
    check("the mode-off frame is stable (two identical in a row)", st0.tries > 0, st0.tries);
    const offFull = st0.im;
    writeFileSync(join(OUT, `m${MOVES}_off0.png`), st0.buf);
    await fans(page, false); await settle(page);
    const offNoFans = img(await page.screenshot());
    await fans(page, true); await settle(page);
    const crossingsOff = await page.evaluate(CROSSINGS);
    const gOff = await gapCensus(page, crossingsOff, false);
    // K76 2d attribution: keep master's fan program (junctionShader) for the
    // program test below.
    await page.evaluate(() => { const r = window.__knotRenderer(); window.__fanShaderOff = r.filletMesh ? r.filletMesh.mesh.shader : null; });
    // K268 stage 3a: every junction's fan inputs, and the CPU gap bookkeeping
    // (underWindows), as mode off's last rebuild left them.
    const nJ = await page.evaluate(() => window.__knotRenderer().junctionArms.length);
    const allJ = Array.from({ length: nJ }, (_, i) => i);
    const UW = () => [...window.__knotRenderer().underWindows].map(([k, v]) => [k, [...v]]);
    const dumpOff = await page.evaluate(DUMP_J, allJ);
    const uwOff = await page.evaluate(UW);

    // ---- mode on ----
    const decl = await page.evaluate((look) => {
      const s = window.__knotExplore({ on: true, look });
      return { pieces: s.view.pieces.length, frontiers: s.view.frontiers.length, seen: s.seen.length, runs: s.runs.length };
    }, LOOK);
    log.declared = decl;
    await frames(page, 6); await sleep(300); await settle(page);
    // K268 stage 2 / K76 2c: still the halos' breath (exploreClock drives it
    // every frame; 2500 s is 1000 breaths, the breath's low end).
    log.hcState = await page.evaluate((hc) => {
      const f = window.__knotFabricRenderer(), r = window.__knotRenderer();
      Object.defineProperty(f, "exploreClock", { get: () => 2500, set: () => {}, configurable: true });
      if (!hc) return null;
      // K76 stage 2d: the reveal's High contrast alone (main.ts writes the
      // fabric's exploreContrast every tick: pin it, then forward).
      Object.defineProperty(f, "exploreContrast", { get: () => true, set() {}, configurable: true });
      r.setExploreContrast(true);
      let E0 = null;
      try {
        const b = atob(r.captureScene().uniforms.uKExplore);
        E0 = new Float32Array(Uint8Array.from(b, (ch) => ch.charCodeAt(0)).buffer)[0];
      } catch (e) { E0 = String(e); }
      return { renderer: r.exploreContrast, E0 };
    }, HC);
    await frames(page, 6); await sleep(300); await settle(page);
    const pending = await page.evaluate(() => window.__knotRenderer().exploreUpdatePending);
    check("mode on: no update pending once declared (the gate settled)", pending === false, pending);
    const onFull = img(await page.screenshot());
    await fans(page, false); await settle(page);
    const onNoFans = img(await page.screenshot());
    await fans(page, true); await settle(page);
    const dumpOn = await page.evaluate(DUMP_J, allJ);
    const uwOn = await page.evaluate(UW);
    {
      // Under windows the reveal dropped (or changed), per under chain.
      const on = new Map(uwOn);
      let dropped = 0, chains = 0;
      for (const [k, v] of uwOff) {
        const w = on.get(k) || [];
        if (w.join() !== v.join()) { chains++; dropped += (v.length - w.length) / 3; }
      }
      log.underWindows = { chainsOff: uwOff.length, chainsOn: uwOn.length, chainsChanged: chains, windowsDropped: dropped };
    }
    // K430 RAMP: the windows the ramp rule predicts, from the renderer's
    // own ungated slot data and each over pass's visibility (extents x vis,
    // absent at vis 0). Judged against the windows the renderer holds.
    const UW_RAMP = () => {
      const r = window.__knotRenderer();
      const by = new Map();
      for (let s = 0; s < r.markerBase; s++) {
        if (!r.slotLive[s]) continue;
        const uc = r.slotUnderChain[s];
        if (uc < 0) continue;
        const v = r.exploreVisAt(r.slotOverChain[s], r.slotOverCtrl[s]);
        const sc = v <= 0 ? 0 : v >= 1 ? 1 : v;
        if (!(sc > 0)) continue;
        let w = by.get(uc);
        if (!w) { w = []; by.set(uc, w); }
        w.push(r.slotUnderCenter[s], r.slotCutNeg[s] * sc, r.slotCutPos[s] * sc);
      }
      return [...by].map(([k, v]) => [k, v]);
    };
    const uwRamp = await page.evaluate(UW_RAMP);
    {
      const on = new Map(uwOn);
      let bad = 0, worst = 0;
      const keys = new Set([...on.keys(), ...new Map(uwRamp).keys()]);
      for (const k of keys) {
        const a = on.get(k) || [], b = new Map(uwRamp).get(k) || [];
        if (a.length !== b.length) { bad++; worst = Math.max(worst, 1); continue; }
        for (let i = 0; i < a.length; i++) {
          const d = Math.abs(a[i] - b[i]);
          if (d > 1e-4) bad++;
          worst = Math.max(worst, d);
        }
      }
      log.underWindows.rampMismatch = { entries: bad, worstDelta: worst, chainsExpected: uwRamp.length };
      console.log(`UWRAMP entries mismatched=${bad} worstDelta=${worst} chainsExpected=${uwRamp.length} chainsOn=${uwOn.length}`);
    }
    const crossingsOn = await page.evaluate(CROSSINGS);

    // K268 stage 3a, THE STRENGTH SWEEP (env KSWEEP = a slot; KPX = "x,y",
    // a page pixel, default 623,531): the slot UNSHAPED at factor k from 1
    // (F) to 0 (R), same state. Logs the pixel's colour per k, each frame's
    // pixels differing from R and F, and every clip pixel whose colour at
    // some k leaves [min(R, F), max(R, F)] in a channel (the frame is then
    // not monotone in the gap's strength: master's own path, no shape).
    // KSWEEP_ONLY ends the run there.
    if (process.env.KSWEEP) {
      const c = Number(process.env.KSWEEP);
      const cx = crossingsOn.find((q) => q.c === c);
      const [px, py] = (process.env.KPX || "623,531").split(",").map(Number);
      const x0 = Math.round(cx.x - cx.R), y0 = Math.round(cx.y - cx.R);
      const pix = (im, i) => [im.data[i * im.ch], im.data[i * im.ch + 1], im.data[i * im.ch + 2]];
      const ip = (im) => (py - y0) * im.W + (px - x0);
      const ks = [1, 0.999, 0.99, 0.97, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05, 0.02, 0.01, 0.001, 0];
      await settle(page);
      const S = await clipShot(page, cx);
      const shots = new Map();
      for (const k of ks) {
        await setSlot(page, c, k); await settle(page);
        shots.set(k, await clipShot(page, cx));
      }
      const R = shots.get(0), F = shots.get(1);
      const rows = ks.map((k) => { const im = shots.get(k); return { k, px: pix(im, ip(im)), vsR: diffSet(im, R).size, vsF: diffSet(im, F).size }; });
      const nonMono = [];
      for (let i = 0; i < R.W * R.H; i++) {
        const r = pix(R, i), f = pix(F, i);
        for (const k of ks) {
          const v = pix(shots.get(k), i);
          const out = [0, 1, 2].map((ch) => v[ch] < Math.min(r[ch], f[ch]) ? v[ch] - Math.min(r[ch], f[ch]) : v[ch] > Math.max(r[ch], f[ch]) ? v[ch] - Math.max(r[ch], f[ch]) : 0);
          if (out.some((o) => o !== 0)) { nonMono.push({ x: x0 + (i % R.W), y: y0 + Math.floor(i / R.W), k, v, R: r, F: f, out }); break; }
        }
      }
      await setSlot(page, c, null); await settle(page);
      const back = await clipShot(page, cx);
      log.ksweep = { c, px: [px, py], S: pix(S, ip(S)), rows, nonMonoPx: nonMono.length, nonMono: nonMono.slice(0, 16), restoredPx: diffSet(S, back).size };
      console.log("KSWEEP " + JSON.stringify(log.ksweep));
      if (process.env.KSWEEP_ONLY) return;
    }

    const gOn = await gapCensus(page, crossingsOn, true);

    // K268 stage 3a, THE ALL-ONES CONTROL (env ONES = "shaped" or a slot
    // list): per shaped slot on screen, the clip as shot (S), rejected (R),
    // full (F: the shape cleared, factor 1) and shaped with an ALL-ONES
    // profile (O: the bit set and no ramps, so exploreCutCover returns 1 and
    // only the shaped branch's own arithmetic differs from F), each also with
    // the fan meshes hidden (nf). O = F everywhere: the branch alone moves no
    // pixel, so a pixel S cuts outside F comes from the profile's values;
    // O = S there: the branch does it.
    if (process.env.ONES) {
      const want = process.env.ONES === "shaped" ? null : new Set(process.env.ONES.split(",").map(Number));
      const ones = [];
      for (const cx of crossingsOn) {
        const g = gOn.get(cx.c);
        if (!g || !g.shaped || (want && !want.has(cx.c))) continue;
        const shots = {};
        const shoot = async (tag) => {
          await settle(page);
          shots[tag] = await clipShot(page, cx);
          await fans(page, false); await settle(page);
          shots[tag + "nf"] = await clipShot(page, cx);
          await fans(page, true); await settle(page);
        };
        await shoot("S");
        await setSlot(page, cx.c, 0); await shoot("R");
        await setSlot(page, cx.c, 1); await shoot("F");
        const oset = await page.evaluate((c) => {
          const g = window.__knotRenderer().gaps;
          g.setShape(c, null); g.setVis(c, 1);
          const changed = g.setShape(c, { k2b: 1, ramps: [], max: false });
          g.upload();
          return { changed, shaped: g.isShaped(c), prof: g.readShape(c) };
        }, cx.c);
        await shoot("O");
        await setSlot(page, cx.c, null);
        await settle(page);
        const back = await clipShot(page, cx);
        const n = (a, b) => diffSet(shots[a], shots[b]).size;
        const x0 = Math.round(cx.x - cx.R), y0 = Math.round(cx.y - cx.R);
        const W = shots.S.W;
        const col = (im, i) => [im.data[i * im.ch], im.data[i * im.ch + 1], im.data[i * im.ch + 2]];
        const at = (i) => ({ x: x0 + (i % W), y: y0 + Math.floor(i / W) });
        const SR = diffSet(shots.S, shots.R), FR = diffSet(shots.F, shots.R), OF = diffSet(shots.O, shots.F);
        const outside = [...SR].filter((i) => !FR.has(i));
        ones.push({
          c: cx.c, oset,
          SR: SR.size, FR: FR.size, OR: n("O", "R"), OF: OF.size, SO: n("S", "O"), SF: n("S", "F"),
          nf: { SR: n("Snf", "Rnf"), FR: n("Fnf", "Rnf"), OF: n("Onf", "Fnf"), SF: n("Snf", "Fnf") },
          outside: outside.slice(0, 8).map((i) => ({ ...at(i), S: col(shots.S, i), R: col(shots.R, i), F: col(shots.F, i), O: col(shots.O, i), Snf: col(shots.Snf, i), Rnf: col(shots.Rnf, i), Fnf: col(shots.Fnf, i), Onf: col(shots.Onf, i) })),
          ofPx: [...OF].slice(0, 8).map((i) => ({ ...at(i), O: col(shots.O, i), F: col(shots.F, i), R: col(shots.R, i), S: col(shots.S, i) })),
          restoredPx: diffSet(shots.S, back).size,
        });
      }
      log.ones = ones;
      console.log("ONES " + JSON.stringify(ones));
      check("ONES (3a): every slot restored after the all-ones control (0 px)", ones.length > 0 && ones.every((o) => o.restoredPx === 0), ones.map((o) => ({ c: o.c, px: o.restoredPx })));
    }

    // ---- gap verdicts ----
    const rows = [];
    let visibleBoth = 0, keptExact = 0, hiddenOver = 0, hiddenCutZero = 0, prevented = 0, preventedAt = 0, fading = 0, underHidden = 0;
    let visibleK1 = 0, visibleShaped = 0, visibleBothShaped = 0, hiddenShaped = 0, shapedOn = 0;
    // K268, by the slot's CLASS (the classifier's verdict, not the pass's
    // vis): a hidden slot (factor 0, unshaped) cuts nothing; a solid one
    // (factor 1, unshaped) under a visible under thread cuts mode-off's
    // pixels exactly. Shaped slots go to the proof.
    let clsHidden = 0, clsHiddenOk = 0, clsSolid = 0, clsSolidOk = 0;
    const bad = [], clsBad = [];
    const sameCut = (a, b) => {
      if (a.size !== b.size) return false;
      for (const i of a) if (!b.has(i)) return false;
      return true;
    };
    for (const cx of crossingsOn) {
      const on = gOn.get(cx.c), off = gOff.get(cx.c);
      if (!off) continue;
      const row = { c: cx.c, vo: +cx.vo.toFixed(3), vu: +cx.vu.toFixed(3), vo2: +cx.vo2.toFixed(3), vu2: +cx.vu2.toFixed(3), k: on.k0, shaped: on.shaped, cutOff: off.cut.size, cutOn: on.cut.size, wouldCut: on.wouldCut, outsideFull: on.outsideFull, outsideOne: on.outsideOne, outsidePx: on.outsidePx, views: on.views, restoredPx: [off.restoredPx, on.restoredPx, on.restoredPx3], restored: on.restored && off.restored };
      if (on.shaped) shapedOn++;
      if (cx.vo >= 1) {
        // A visible over pass keeps its slot as solved (factor 1), or is
        // shaped (a fade end inside its footprint).
        if (on.k0 === 1) visibleK1++;
        else if (on.shaped) visibleShaped++;
      }
      if (cx.vo2 >= 1 && cx.vu2 >= 1) {
        visibleBoth++;
        const same = sameCut(on.cut, off.cut);
        row.same = same;
        if (on.shaped) visibleBothShaped++;
        if (same) keptExact++; else bad.push(row);
      } else if (cx.vo <= 0 && !on.shaped) {
        hiddenOver++;
        if (on.cut.size === 0) hiddenCutZero++; else bad.push(row);
        if (cx.vu > 0 && on.wouldCut) { prevented += on.wouldCut; preventedAt++; }
      } else if (cx.vo <= 0) hiddenShaped++;
      else if (cx.vu2 <= 0) underHidden++;
      else fading++;
      if (!on.shaped && on.k0 === 0) {
        clsHidden++;
        if (on.cut.size === 0) clsHiddenOk++; else clsBad.push({ ...row, cls: "hidden" });
      } else if (!on.shaped && on.k0 === 1 && cx.vu2 >= 1) {
        clsSolid++;
        if (sameCut(on.cut, off.cut)) clsSolidOk++; else clsBad.push({ ...row, cls: "solid" });
      }
      rows.push(row);
    }
    const overVisible = crossingsOn.filter((c) => c.vo >= 1).length;
    // The probe sees the slot table: clearing a slot changes the frame at
    // most crossings with the mode off (a clipped or fully covered one may not).
    const cutting = [...gOff.values()].filter((g) => g.cut.size > 0).length;
    check("probe sanity: clearing a slot changes the mode-off frame at most crossings", gOff.size > 0 && cutting >= 0.8 * gOff.size, { cutting, of: gOff.size });
    log.gapGate = await page.evaluate(() => window.__knotExplore({}).gaps);
    log.gaps = { onScreen: crossingsOn.length, shapedOn, visibleBoth, visibleBothShaped, keptExact, overVisible, visibleK1, visibleShaped, hiddenOver, hiddenCutZero, hiddenShaped, underHidden, fading, preventedPxUnderVisible: prevented, preventedAt, clsHidden, clsHiddenOk, clsSolid, clsSolidOk, rows };
    check("GAPS: every visible over pass keeps its slot as solved (factor 1) or is shaped", visibleK1 + visibleShaped === overVisible, { overVisible, visibleK1, visibleShaped });
    // K76 2d (K268.md "For the next stage" item 3): skipped, not failed,
    // when no crossing on screen has both threads shown.
    check(visibleBoth > 0 ? "GAPS: every visible crossing keeps its gap exactly (mode-on cut = mode-off cut)" : "GAPS: visible crossings kept exactly: SKIPPED (no crossing with both threads shown)", visibleBoth === 0 || keptExact === visibleBoth, { visibleBoth, visibleBothShaped, keptExact, bad: bad.filter((b) => b.same === false).slice(0, 6) });
    check("GAPS: no hidden over thread cuts anything (mode-on cut empty; unshaped)", hiddenOver > 0 && hiddenCutZero === hiddenOver, { hiddenOver, hiddenCutZero, hiddenShaped, prevented });
    check("GAPS (K268 class): every hidden-class slot cuts nothing", clsHidden > 0 && clsHiddenOk === clsHidden, { clsHidden, clsHiddenOk, bad: clsBad.filter((b) => b.cls === "hidden").slice(0, 4) });
    check("GAPS (K268 class): every solid-class slot under a visible thread keeps mode-off's cut exactly", clsSolid > 0 && clsSolidOk === clsSolid, { clsSolid, clsSolidOk, bad: clsBad.filter((b) => b.cls === "solid").slice(0, 4) });
    check("GAPS (K268): the gate's counts have no mismatch", log.gapGate && log.gapGate.mismatch === 0, log.gapGate);
    const shapedRows = rows.filter((r) => r.shaped && r.outsideFull !== null);
    check("GAPS (K268 S/R/F): every shaped slot cuts inside its full cut (S - R within F - R, one level of quantization allowed)", shapedRows.every((r) => r.outsideFull === 0), { shaped: shapedRows.length, oneLevel: shapedRows.filter((r) => r.outsideOne).map((r) => ({ c: r.c, n: r.outsideOne })), bad: shapedRows.filter((r) => r.outsideFull).slice(0, 6) });
    for (const r of shapedRows.filter((r) => r.outsideFull || r.outsideOne)) console.log(`OUTSIDE c=${r.c} n=${r.outsideFull} one=${r.outsideOne} restoredPx=${JSON.stringify(r.restoredPx)} px=${JSON.stringify(r.outsidePx)}`);
    check("GAPS: every slot restored after the census (factor and pixels)", rows.every((r) => r.restored), rows.filter((r) => !r.restored).slice(0, 4));

    // ---- joints ----
    const J = await jointCensus(page);
    const fOff = diffSet(offFull, offNoFans);
    const fOn = diffSet(onFull, onNoFans);
    const W = offFull.W;
    const discPx = (x, y, r) => {
      const out = [];
      for (let yy = Math.max(0, Math.floor(y - r)); yy <= Math.min(offFull.H - 1, Math.ceil(y + r)); yy++) {
        for (let xx = Math.max(0, Math.floor(x - r)); xx <= Math.min(W - 1, Math.ceil(x + r)); xx++) {
          if ((xx - x) ** 2 + (yy - y) ** 2 <= r * r) out.push(yy * W + xx);
        }
      }
      return out;
    };
    const rJ = Math.max(3, 0.6 * J.threadWidth * J.s);
    let jHidOk = 0, jHid = 0, jShowOk = 0, jShow = 0, agree = 0, onScreenJ = 0;
    let jSolid = 0, jSolidOk = 0, jFade = 0, jFadeOk = 0;
    const jBad = [], jDiffer = [];
    const jStats = (j, A, B, fA, fB) => {
      const px = discPx(j.x, j.y, rJ);
      return {
        nOn: px.filter((i) => fA.has(i)).length,
        nOff: px.filter((i) => fB.has(i)).length,
        same: px.every((i) => fA.has(i) === fB.has(i) && (!fB.has(i) || sameColor(A, B, i))),
        outside: px.filter((i) => fA.has(i) && !fB.has(i)).length,
        colorPx: px.filter((i) => fA.has(i) && fB.has(i) && !sameColor(A, B, i)).length,
      };
    };
    // K268 stage 3a: a FADING joint paints mode off's pixels times its arms'
    // visibility over what lies beneath it with the mode on. Per fan pixel
    // (either frame), U = mode on without fans, O = mode off, N = mode on:
    // N = U + a (O - U), one a for all three channels (taken on the channel
    // where O - U is largest), with a inside the arms' vis range (their
    // least and greatest vis from the slot 3 ctrl out, +-0.03) and residual
    // <= 4 per channel. Where |O - U| < 8, a is unmeasurable: then the fan
    // may add no more than mode off did, +3. A pixel whose no-fan frames
    // differ between the modes (the underlay changed) is CONFOUNDED: counted,
    // not judged.
    const fadeModel = (j) => {
      let aLo = Infinity, aHi = -Infinity;
      for (const a of j.armMin) { aLo = Math.min(aLo, a.min); aHi = Math.max(aHi, a.max); }
      const out = { judged: 0, viol: 0, confounded: 0, confViol: 0, aMin: Infinity, aMax: -Infinity, aRange: [aLo, aHi], worst: null };
      const ch = (im, p) => [im.data[p], im.data[p + 1], im.data[p + 2]];
      for (const i of discPx(j.x, j.y, rJ)) {
        if (!(fOn.has(i) || fOff.has(i))) continue;
        const p = i * onFull.ch;
        const U = ch(onNoFans, p), O = ch(offFull, p), N = ch(onFull, p), O0 = ch(offNoFans, p);
        const conf = O0.some((x, k) => x !== U[k]);
        let km = 0;
        for (let k = 1; k < 3; k++) if (Math.abs(O[k] - U[k]) > Math.abs(O[km] - U[km])) km = k;
        const dO = Math.abs(O[km] - U[km]);
        let bad, a = null, res;
        if (dO < 8) {
          const dN = Math.max(...N.map((x, k) => Math.abs(x - U[k])));
          res = dN - dO;
          bad = dN > dO + 3;
        } else {
          a = (N[km] - U[km]) / (O[km] - U[km]);
          res = Math.max(...N.map((x, k) => Math.abs(x - (U[k] + a * (O[k] - U[k])))));
          bad = res > 4 || a < aLo - 0.03 || a > aHi + 0.03 || a < -0.02 || a > 1.02;
        }
        if (conf) { out.confounded++; if (bad) out.confViol++; continue; }
        out.judged++;
        if (a !== null) { out.aMin = Math.min(out.aMin, a); out.aMax = Math.max(out.aMax, a); }
        if (bad) {
          out.viol++;
          if (!out.worst || res > out.worst.res) out.worst = { x: i % W, y: (i / W) | 0, U, O, N, a: a === null ? null : +a.toFixed(3), res: +res.toFixed(1) };
        }
      }
      if (out.aMin === Infinity) { out.aMin = null; out.aMax = null; } else { out.aMin = +out.aMin.toFixed(3); out.aMax = +out.aMax.toFixed(3); }
      return out;
    };
    for (const j of J.jn) {
      if (j.x < 0 || j.y < 0 || j.x >= W || j.y >= offFull.H) continue;
      onScreenJ++;
      if (j.hidden === !j.visited) agree++;
      const st = jStats(j, onFull, offFull, fOn, fOff);
      if (j.hidden) {
        jHid++;
        if (st.nOn === 0) jHidOk++; else jBad.push({ ...j, ...st });
      } else {
        jShow++;
        if (st.same) jShowOk++; else jDiffer.push({ ...j, ...st });
        // A SOLID joint (every arm vis 1 along its strip) paints mode off's
        // pixels exactly; a FADING one follows fadeModel.
        if (j.solid) { jSolid++; if (st.same) jSolidOk++; else jBad.push({ ...j, ...st, cls: "solid" }); }
        else {
          jFade++;
          const fm = fadeModel(j);
          j.fade = fm;
          if (fm.viol === 0) jFadeOk++; else jBad.push({ ...j, ...st, cls: "fading", fade: fm });
        }
      }
    }
    log.joints = { onScreen: onScreenJ, agreeVisited: agree, hidden: jHid, hiddenNoFan: jHidOk, shown: jShow, shownMatch: jShowOk, solid: jSolid, solidMatch: jSolidOk, fading: jFade, fadingModelOk: jFadeOk, discRadiusPx: rJ, bad: jBad.slice(0, 12), differ: jDiffer.map((j) => ({ i: j.i, solid: j.solid, nOn: j.nOn, nOff: j.nOff, outside: j.outside, colorPx: j.colorPx, armMin: j.armMin, fade: j.fade })), fadingDetail: J.jn.filter((j) => j.fade).map((j) => ({ i: j.i, ...j.fade })), fanPxOff: fOff.size, fanPxOn: fOn.size };
    // ---- K268 stage 3a: fan inputs, mode on against off, every shown junction ----
    {
      const shownJ = J.jn.filter((j) => !j.hidden && j.x >= 0 && j.y >= 0 && j.x < W && j.y < offFull.H);
      const cmp = shownJ.map((j) => ({ i: j.i, solid: j.solid, pixelsDiffer: jDiffer.some((q) => q.i === j.i), dd: dumpDiff(dumpOff[j.i], dumpOn[j.i]) }));
      log.recCompare = {
        shown: cmp.length,
        material: cmp.filter((c) => isMaterial(c.dd)).map((c) => c.i),
        pixelsDiffer: jDiffer.map((j) => j.i),
        uwChanged: cmp.filter((c) => c.dd.underWindows).map((c) => c.i),
        byJunction: cmp.filter((c) => isMaterial(c.dd) || c.pixelsDiffer || TARGETS.includes(c.i)),
      };
      for (const c of log.recCompare.byJunction) console.log(`REC j${c.i} solid=${c.solid} pixelsDiffer=${c.pixelsDiffer}: ${JSON.stringify(c.dd).slice(0, 900)}`);
      const keep = new Set([...TARGETS, ...jDiffer.map((j) => j.i)]);
      log.dumps = { off: Object.fromEntries([...keep].map((i) => [i, dumpOff[i]])), on: Object.fromEntries([...keep].map((i) => [i, dumpOn[i]])) };
    }
    check("JOINTS: a junction is hidden exactly when its vertex is unvisited", onScreenJ > 0 && agree === onScreenJ, { onScreenJ, agree, mism: J.jn.filter((j) => j.hidden === j.visited).slice(0, 6) });
    check("JOINTS: no hidden junction paints a fan pixel", jHid > 0 && jHidOk === jHid, { jHid, jHidOk });
    // K268 stage 3a: the two joint checks are judged after the ATTRIBUTION
    // block below, which may explain a mismatch (jointChecks()).
    const jointChecks = (attr) => {
      // A junction whose fans repaint mode off's pixels exactly once they
      // read the K430 ramp's underWindows is ATTRIBUTED: the reveal shrank an
      // under window whose over pass it hides (computeGapSlot's
      // slotExploreHid), and the fillets follow (armReach, dives, layer).
      const uwAttr = new Set((attr || []).filter((a) => a.underWindowsRampOnTol.sameTol).map((a) => a.i));
      const solidBad = jBad.filter((b) => b.cls === "solid"), fadeBad = jBad.filter((b) => b.cls === "fading");
      check("JOINTS (3a): every SOLID shown junction paints mode-off's fan pixels exactly, or the underWindows RAMP (K430) explains it exactly",
        solidBad.every((b) => uwAttr.has(b.i)),
        { jSolid, jSolidOk, attributedUW: solidBad.filter((b) => uwAttr.has(b.i)).map((b) => b.i), bad: solidBad.filter((b) => !uwAttr.has(b.i)).map((b) => ({ i: b.i, nOn: b.nOn, nOff: b.nOff, outside: b.outside, colorPx: b.colorPx })) });
      check("JOINTS (3a): every FADING shown junction paints mode-off's fan pixels times its arms' vis (N = U + a (O - U)), or the underWindows RAMP (K430) explains it exactly",
        fadeBad.every((b) => uwAttr.has(b.i)),
        { jFade, jFadeOk, attributedUW: fadeBad.filter((b) => uwAttr.has(b.i)).map((b) => b.i), bad: fadeBad.filter((b) => !uwAttr.has(b.i)).map((b) => ({ i: b.i, nOn: b.nOn, nOff: b.nOff, outside: b.outside, fade: b.fade })) });
    };
    if (!jDiffer.length) jointChecks([]);
    console.log(`JOINTS shown ${jShow}: identical ${jShowOk}; solid ${jSolid} (match ${jSolidOk}), fading ${jFade} (model ok ${jFadeOk}); differ: ${jDiffer.map((j) => j.i).join(",")}`);
    for (const j of J.jn.filter((q) => q.fade)) console.log(`FADE j${j.i}: ${JSON.stringify(j.fade)}`);
    // ---- K76 2d: ATTRIBUTION of each shown junction that differs ----
    if (jDiffer.length) {
      // Crossing slots near each junction (from the gap census), their kind
      // and their threads' vis.
      const near = (j) => crossingsOn.filter((c) => Math.hypot(c.x - j.x, c.y - j.y) < rJ + c.R).map((c) => {
        const on = gOn.get(c.c);
        return { c: c.c, d: +Math.hypot(c.x - j.x, c.y - j.y).toFixed(1), overChain: c.overChain, underChain: c.underChain, vo: +c.vo.toFixed(3), vu: +c.vu.toFixed(3), k: on?.k0, shaped: on?.shaped, cutOn: on?.cut.size, cutOff: gOff.get(c.c)?.cut.size };
      });
      // The gap gate undone: every live slot back to its solved cut, the
      // mode-on frame and its fan layer re-shot.
      const nLive = await page.evaluate(() => {
        const r = window.__knotRenderer(), g = r.gaps;
        let n = 0;
        for (let c = 0; c < r.slotLive.length; c++) if (r.slotLive[c]) { g.setShape(c, null); g.setVis(c, 1); n++; }
        g.upload();
        return n;
      });
      await settle(page); await sleep(200); await settle(page);
      const gFull = img(await page.screenshot());
      await fans(page, false); await settle(page);
      const gNoFans = img(await page.screenshot());
      await fans(page, true);
      await page.evaluate(() => { const r = window.__knotRenderer(); r.applyExploreGaps(); r.gaps.upload(); });
      await settle(page); await sleep(200); await settle(page);
      const back = img(await page.screenshot());
      const fG = diffSet(gFull, gNoFans);
      // The PROGRAM test: the mode on, the same records and strips, the fans
      // on master's program (junctionShader) instead of the explore variant.
      // A solid joint that then paints mode off's pixels exactly differs
      // because of the explore program (its premultiplied path or its gap
      // edits), not its records or geometry.
      const progSwap = await page.evaluate(() => {
        const r = window.__knotRenderer();
        if (!window.__fanShaderOff || !r.filletMesh) return false;
        window.__fanShaderOn = r.filletMesh.mesh.shader;
        for (const m of [r.filletMesh, r.filletTopMesh]) if (m && m.mesh) m.mesh.shader = window.__fanShaderOff;
        return window.__fanShaderOn !== window.__fanShaderOff;
      });
      await settle(page); await sleep(200); await settle(page);
      const pFull = img(await page.screenshot());
      await fans(page, false); await settle(page);
      const pNoFans = img(await page.screenshot());
      await fans(page, true);
      await page.evaluate(() => {
        const r = window.__knotRenderer();
        for (const m of [r.filletMesh, r.filletTopMesh]) if (m && m.mesh && window.__fanShaderOn) m.mesh.shader = window.__fanShaderOn;
      });
      await settle(page); await sleep(200); await settle(page);
      const back2 = img(await page.screenshot());
      const fP = diffSet(pFull, pNoFans);
      // K268 stage 3a, the UNDERWINDOWS test: the mode on, the fans rebuilt
      // with the K430 ramp's underWindows (extents x the over pass's vis).
      // computeGapSlot ramps a slot's window by its over thread's vis, so an
      // arm near it loses armReach's clamp, coverCap and its dive vote; the
      // texel reset above never touched that CPU side. Then the same with the
      // texel gate undone as well.
      const uwSwapped = await page.evaluate((uw) => {
        const r = window.__knotRenderer();
        window.__uwSaved = r.underWindows;
        r.underWindows = new Map(uw);
        r.rebuildFillets(true);
        return r.underWindows.size;
      }, uwRamp);
      await settle(page); await sleep(200); await settle(page);
      const uFull = img(await page.screenshot());
      await fans(page, false); await settle(page);
      const uNoFans = img(await page.screenshot());
      await fans(page, true); await settle(page);
      const dumpSwap = await page.evaluate(DUMP_J, allJ);
      await page.evaluate(() => {
        const r = window.__knotRenderer(), g = r.gaps;
        for (let c = 0; c < r.slotLive.length; c++) if (r.slotLive[c]) { g.setShape(c, null); g.setVis(c, 1); }
        g.upload();
      });
      await settle(page); await sleep(200); await settle(page);
      const ugFull = img(await page.screenshot());
      await fans(page, false); await settle(page);
      const ugNoFans = img(await page.screenshot());
      await fans(page, true);
      await page.evaluate(() => {
        const r = window.__knotRenderer();
        r.applyExploreGaps(); r.gaps.upload();
        r.underWindows = window.__uwSaved;
        r.rebuildFillets(true);
      });
      await settle(page); await sleep(200); await settle(page);
      const back3 = img(await page.screenshot());
      const fU = diffSet(uFull, uNoFans), fUG = diffSet(ugFull, ugNoFans);
      // Crops of each differing junction for the handoff, 4x nearest:
      // mode off | mode on | on with the ramp's underWindows | that + gate undone.
      for (const j of jDiffer) {
        const C = 60, S = 4, x0 = Math.max(0, Math.min(W - C, Math.round(j.x - C / 2))), y0 = Math.max(0, Math.min(offFull.H - C, Math.round(j.y - C / 2)));
        const panels = [offFull, onFull, uFull, ugFull];
        const OW = panels.length * (C * S + 4), OH = C * S;
        const data = Buffer.alloc(OW * OH * 3, 255);
        panels.forEach((im, pi) => {
          for (let yy = 0; yy < OH; yy++) for (let xx = 0; xx < C * S; xx++) {
            const p = ((y0 + ((yy / S) | 0)) * W + x0 + ((xx / S) | 0)) * im.ch;
            const o = (yy * OW + pi * (C * S + 4) + xx) * 3;
            data[o] = im.data[p]; data[o + 1] = im.data[p + 1]; data[o + 2] = im.data[p + 2];
          }
        });
        writeFileSync(join(OUT, `j${j.i}_off_on_uw_uwgate.png`), encodePNG({ W: OW, H: OH, data }));
      }
      // The largest channel difference at a joint's differing fan pixels.
      const maxD = (j) => {
        let m = 0;
        for (const i of discPx(j.x, j.y, rJ)) {
          if (!(fOn.has(i) || fOff.has(i))) continue;
          const p = i * onFull.ch, q = i * offFull.ch;
          for (let k = 0; k < 3; k++) m = Math.max(m, Math.abs(onFull.data[p + k] - offFull.data[q + k]));
        }
        return m;
      };
      // The UNDERLAY test: where the frames WITHOUT fans differ between the
      // mode on and off (a hidden thread no longer drawn beneath or over the
      // fan, a gap no longer cut), dilated by 1 px for AA. A junction whose
      // every differing fan pixel lies there differs because what the fan
      // composites with changed, not the fan (consistent with, not proof).
      const under = diffSet(onNoFans, offNoFans);
      const underD = new Set(under);
      for (const i of under) {
        const x = i % W, y = (i - x) / W;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < W && yy < offFull.H) underD.add(yy * W + xx);
        }
      }
      const underlay = (j) => {
        const px = discPx(j.x, j.y, rJ).filter((i) => fOn.has(i) !== fOff.has(i) || (fOn.has(i) && fOff.has(i) && !sameColor(onFull, offFull, i)));
        return { diffPx: px.length, inUnder: px.filter((i) => underD.has(i)).length, inUnderExact: px.filter((i) => under.has(i)).length };
      };
      // Frontier halos near each junction (beacon and halo looks).
      const halos = await page.evaluate(() => {
        const F = window.__knotFabricRenderer(), v = window.__knotView();
        const L = F.haloLayer;
        return L ? L.children.filter((s) => s.visible !== false && s.renderable !== false).map((s) => ({ x: s.x * v.s + v.x, y: s.y * v.s + v.y, a: +s.alpha.toFixed(3) })) : [];
      }).catch(() => []);
      log.attribution = {
        liveSlotsReset: nLive, restoredPx: diffSet(onFull, back).size,
        programSwapped: progSwap, programRestoredPx: diffSet(onFull, back2).size,
        uwSwapped, uwRestoredPx: diffSet(onFull, back3).size,
        junctions: jDiffer.map((j) => {
          const gg = jStats(j, gFull, offFull, fG, fOff);
          const pg = jStats(j, pFull, offFull, fP, fOff);
          const uu = jStats(j, uFull, offFull, fU, fOff);
          const uuOn = jStats(j, uFull, onFull, fU, fOn);
          // K430 + K522's flicker floor: the ramp attribution holds when
          // the swapped fans' SET is the as-shot set and every shared fan
          // pixel is within one 8-bit level (the backdrop flicker census2d
          // measured; census3a's own S/R/F allows one level, K433).
          const rampTol = (() => {
            let worst = 0;
            for (const i of discPx(j.x, j.y, rJ)) {
              if (fU.has(i) !== fOn.has(i)) return { sameTol: false, worst: 99 };
              if (!fOn.has(i)) continue;
              const p = i * onFull.ch;
              for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(uFull.data[p + k] - onFull.data[p + k]));
              if (worst > 1) return { sameTol: false, worst };
            }
            return { sameTol: true, worst };
          })();
          const ug = jStats(j, ugFull, offFull, fUG, fOff);
          const ul = underlay(j);
          const ulAll = ul.diffPx > 0 && ul.inUnder === ul.diffPx;
          const swapDd = dumpDiff(dumpOff[j.i], dumpSwap[j.i]);
          return {
            i: j.i, x: +j.x.toFixed(1), y: +j.y.toFixed(1), arms: j.arms, solid: j.solid, armMin: j.armMin,
            asShot: { nOn: j.nOn, nOff: j.nOff, outside: j.outside, colorPx: j.colorPx, maxDelta: maxD(j) },
            gapGateUndone: gg, masterProgram: pg, underWindowsRamp: uu, underWindowsRampOn: uuOn, underWindowsRampOnTol: rampTol, underWindowsRampGateUndone: ug, underlay: ul,
            recordsOnVsOff: dumpDiff(dumpOff[j.i], dumpOn[j.i]),
            recordsSwapVsOff: swapDd, swapMaterial: isMaterial(swapDd),
            verdict: gg.same ? "gap gate (by design: a hidden over thread no longer cuts the fan)"
              : rampTol.sameTol ? "underWindows RAMP (K430: fans rebuilt with the ramp's windows repaint the as-shot fan set, colors within one level)"
              : uu.same ? "underWindows RAMP (K430: the ramp's windows rebuild mode off's fans)"
              : ug.same ? "underWindows RAMP + the texel gap gate (both together rebuild mode off's fans)"
              : pg.same ? "the explore fan program (master's program over the same records paints mode off's pixels)"
              : ulAll ? `underlay (every differing fan pixel lies where the no-fan frames differ${j.solid ? "" : "; an arm also fades"})`
              : j.solid ? "unattributed (solid arms, slots solved; not the program)" : "joint fade (an arm fades along its strip)",
            near: near(j),
            halos: halos.filter((h) => Math.hypot(h.x - j.x, h.y - j.y) < 3 * rJ + 20).length,
          };
        }),
      };
      check("ATTRIBUTION: restored after the gap-gate re-shoot (0 px)", log.attribution.restoredPx === 0, { restoredPx: log.attribution.restoredPx });
      check("ATTRIBUTION: the program test swapped and restored (0 px)", progSwap && log.attribution.programRestoredPx === 0, { progSwap, restoredPx: log.attribution.programRestoredPx });
      check("ATTRIBUTION (3a): the underWindows test restored (0 px)", log.attribution.uwRestoredPx === 0, { uwSwapped, restoredPx: log.attribution.uwRestoredPx });
      // K430: the attribution verdicts stand on their own evidence (the
      // swapped fans against the as-shot frame); the restore check above
      // reports its own failure separately (434 px on master too, pre-ramp).
      jointChecks(log.attribution.junctions);
      for (const a of log.attribution.junctions) console.log(`ATTR j${a.i} solid=${a.solid} asShot=${JSON.stringify(a.asShot)} gateUndone=${JSON.stringify(a.gapGateUndone)} masterProgram=${JSON.stringify(a.masterProgram)} uwRamp=${JSON.stringify(a.underWindowsRamp)} uwRampOn=${JSON.stringify(a.underWindowsRampOn)} uwRamp+gate=${JSON.stringify(a.underWindowsRampGateUndone)} underlay=${JSON.stringify(a.underlay)} swapMaterial=${a.swapMaterial} -> ${a.verdict}; near ${JSON.stringify(a.near)}; armMin ${JSON.stringify(a.armMin)}`);
    }
    let tHid = 0, tHidOk = 0, tShow = 0, tShowOk = 0, tAgree = 0, tOn = 0;
    for (const t of J.tips) {
      if (t.x < 0 || t.y < 0 || t.x >= W || t.y >= offFull.H) continue;
      tOn++;
      if (t.hidden === t.vis < 0.98) tAgree++;
      const px = discPx(t.x, t.y, rJ);
      if (t.hidden) { tHid++; if (px.every((i) => !fOn.has(i))) tHidOk++; }
      else { tShow++; if (px.every((i) => fOn.has(i) === fOff.has(i) && (!fOff.has(i) || sameColor(onFull, offFull, i)))) tShowOk++; }
    }
    log.tips = { onScreen: tOn, agree: tAgree, hidden: tHid, hiddenNoCap: tHidOk, shown: tShow, shownMatch: tShowOk };
    check("TIPS: a free tip's cap hides exactly when its thread is not solid at the tip", tAgree === tOn, log.tips);
    check("TIPS: hidden caps paint nothing, shown caps paint mode-off's pixels", tHidOk === tHid && tShowOk === tShow, log.tips);
    log.markers = J.markers;
    check("MARKERS (exit-aware, K465): a marker gap slot is on exactly when its thread point is solid, except the lifted exit which is on at any vis", J.markers.every((m) => m.chain === undefined || (m.lifted ? m.k === 1 : (m.vis >= 0.98 ? m.k === 1 : m.k === 0))), J.markers);

    // ---- K268 the proof: shaped slots against the CPU ideal ----
    const LOOKS = ["fade", "halo", "glow", "dots", "fray", "beacon"];
    const sweep = (process.env.PROOF || "2.5:fade,2.5:beacon,2.5:dots,2.5:glow,2.5:fray,2.5:halo,1.0:beacon,1.5:beacon,2.0:fade,3.0:fade,3.0:beacon").split(",").map((s) => s.split(":"));
    log.proof = [];
    for (const [reach, look] of sweep) {
      if (Date.now() > DEADLINE) { log.proofCut = `deadline before ${reach}:${look}`; break; }
      await page.evaluate((reach, look) => window.__knotExplore({ on: true, reach, look }), Number(reach), look);
      await frames(page, 6); await sleep(300); await settle(page);
      const pr = await proof(page, LOOKS.indexOf(look), `reach ${reach} ${look}`);
      log.proof.push(pr);
      console.log(`PROOF reach ${reach} ${look}: ${JSON.stringify({ counts: pr.counts, slots: pr.slots, px: pr.px, ghosts: pr.ghosts, under: pr.under, between: pr.between, err: pr.err, restoredAll: pr.restoredAll })}`);
    }
    const P = log.proof;
    const tot = (k) => P.reduce((a, p) => a + p[k], 0);
    check("PROOF: shaped slots were exercised", tot("slots") > 0, { slots: tot("slots"), px: tot("px") });
    check("PROOF: no ghost (ideal 0, cut drawn) and no under-cut (ideal 1, cut short)", tot("ghosts") === 0 && tot("under") === 0, { ghosts: tot("ghosts"), under: tot("under"), worst: P.flatMap((p) => p.perSlot.filter((r) => r.ghosts || r.under).map((r) => ({ label: p.label, ...r, prof: undefined }))).slice(0, 8) });
    check("PROOF: in between, the measured coverage follows the ideal (p95 <= 0.08)", P.every((p) => p.err.n === 0 || p.err.p95 <= 0.08), P.map((p) => ({ label: p.label, err: p.err })));
    check("PROOF: every shaped slot restored (0 px) after its frames", P.every((p) => p.restoredAll), P.flatMap((p) => p.perSlot.filter((r) => !r.restored).map((r) => ({ label: p.label, c: r.c, px: r.restoredPx }))).slice(0, 6));

    // ---- visitAll (every chain whole) draws the mode-off frame ----
    await page.evaluate(() => window.__knotExplore({ on: true, reach: 1000, look: "beacon", visitAll: true }));
    await frames(page, 6); await sleep(300); await settle(page);
    const allBuf = await page.screenshot();
    const dAll = diffSet(offFull, img(allBuf));
    log.visitAllGaps = await page.evaluate(() => window.__knotExplore({}).gaps);
    if (dAll.size) writeFileSync(join(OUT, `m${MOVES}_visitall.png`), allBuf);
    check("visitAll (reach 1000) = the mode-off frame (0 px)", dAll.size === 0, { differingPx: dAll.size, gaps: log.visitAllGaps });

    // ---- the mode off again ----
    await page.evaluate(() => window.__knotExplore({ on: false }));
    await frames(page, 6); await sleep(300); await settle(page);
    const offAgainBuf = await page.screenshot();
    writeFileSync(join(OUT, `m${MOVES}_off_again.png`), offAgainBuf);
    const offAgain = img(offAgainBuf);
    const d = diffSet(offFull, offAgain);
    const bb = [offFull.W, offFull.H, -1, -1];
    for (const i of d) { const x = i % offFull.W, y = (i / offFull.W) | 0; bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); }
    check("mode off again = the first mode-off frame (0 px)", d.size === 0, { differingPx: d.size, of: offFull.W * offFull.H, bbox: d.size ? bb : null });
    if (d.size) {
      const stA = await stableShot(page);
      writeFileSync(join(OUT, `m${MOVES}_off_again_stable.png`), stA.buf);
      log.offAgainStable = { px: diffSet(offFull, stA.im).size, tries: stA.tries };
    }
    check("0 page errors", errors.length === 0, errors);
    check("no WebGL context loss", (await page.evaluate(() => window.__ctxLost ?? [])).length === 0, await page.evaluate(() => window.__ctxLost ?? null));
  } finally {
    await PARK(browser);
  }
}

try { await main(); } catch (e) { check("probe ran to the end", false, String(e && e.stack ? e.stack : e)); }
const failed = checks.filter((c) => !c.ok);
log.checks = checks;
writeFileSync(join(OUT, `census_m${MOVES}.json`), JSON.stringify(log, null, 1));
console.log(`\nCHECK census m${MOVES}: ${checks.length - failed.length}/${checks.length} passed${failed.length ? "; FAILED: " + failed.map((c) => c.name).join(" | ") : ""}`);
try { rmSync(PROFILES, { recursive: true, force: true }); } catch { /* a profile still held */ }
process.exit(failed.length ? 1 : 0);
