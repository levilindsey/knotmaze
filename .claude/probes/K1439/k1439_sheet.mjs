// K1439: real-GPU sheets of the open spots and the worse site (K1438), and the live fadeLength check.
//   node .claude/probes/K1439/k1439_sheet.mjs <base url> [tag]      (run under k1439_locked.ps1: pixel-exact GPU)
// Per scene: the census link (k1362s2_links.ts: the K868 scene's captured params on its seed) plus
// &am=instant&snd=none&stb=0&fw=0&phw=0, in a headed, off-screen, real-GPU Chrome (1240x900, dsf 2, a fresh profile
// deleted after; never --virtual-time-budget), three pages: rp=gf, rp=gf&gfh=1, rp=outline. Each steps the sim to
// 40 s (__knotStepUntil, in-thread), checks the physics hash against the K868 diag's, freezes, hides the DOM chrome,
// and per spot zooms (one ctrl+wheel, then wheel pans; export_scene.mjs's zoomTo) to 8x the full frame's px/unit
// centred on the spot, then sets fadeLength LIVE through the panel's "Crossing fade" input (0, 0.14, 1.2) and
// captures each, reading __knotGf.stats.rebuilds / passes and __knotGf.home before and after. On the gfh=1 page the
// first spot also gets a slider-like sweep (25 values 0 -> 1.2, 40 ms apart) with the rebuild counter around it.
// Output under .claude/probes/K1439/out/<tag>/: the cells, sheet_<scene>.png (rows the spots; columns off at the
// link's fl | on fl 0 | on 0.14 | on 1.2 | rp=outline), sheet_offfl_<scene>.png (off at 0 / 0.14 / 1.2: what fl does
// without home) and <tag>.json.
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [, , baseArg, tagArg] = process.argv;
const base = baseArg.replace(/\/$/, "");
const tag = tagArg ?? "sheets";
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out", tag);
mkdirSync(outDir, { recursive: true });
const TAIL = "&am=instant&snd=none&stb=0&fw=0&phw=0";
const SCENES = [
  { name: "muse_hash", link: "3.FGH1HtvQeDjm6e4BII", hash: "733ee14a",
    spots: [["s22", 22.56, 34.84], ["s29", 29.74, 20.26], ["s5", 5.88, 8.5], ["s19", 19.41, 14.16]] },
  { name: "g41_user_tw64", link: "1471kin.FGH0yfoS9h8PAZC", hash: "0d51331b", spots: [["worse", 17.8, 9.55]] },
];
const FLS = [0, 0.14, 1.2];
const ZOOM = 8;
const CROP = 400; // CSS px, centred on the spot
const VW = 1240, VH = 900, DSF = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profileDir = join(tmpdir(), `k1439-sheet-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false, userDataDir: profileDir, defaultViewport: { width: VW, height: VH, deviceScaleFactor: DSF },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    `--window-size=${VW + 40},${VH + 160}`, "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});

// In-page helpers (export_scene.mjs's mainCanvas / hideChrome / settleView / zoomTo / setRow, trimmed).
function pageLib() {
  const L = (window.__k1439 = window.__k1439 || {});
  L.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  L.lost = L.lost ?? 0;
  L.mainCanvas = () => {
    let best = null, area = -1;
    for (const c of document.querySelectorAll("canvas")) {
      if (c.id === "knot-loading-canvas") continue;
      const r = c.getBoundingClientRect();
      if (r.width * r.height >= area) { area = r.width * r.height; best = c; }
    }
    return best;
  };
  const mc = L.mainCanvas();
  if (mc && !mc.__k1439lost) { mc.__k1439lost = true; mc.addEventListener("webglcontextlost", () => L.lost++); }
  L.hideChrome = () => {
    const c = L.mainCanvas();
    c.setAttribute("data-k1439-main", "1");
    if (!document.getElementById("k1439-style")) {
      const st = document.createElement("style");
      st.id = "k1439-style";
      st.textContent = "body * { visibility: hidden !important; } canvas[data-k1439-main] { visibility: visible !important; }";
      document.head.appendChild(st);
    }
    const r = c.getBoundingClientRect();
    return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  L.view = () => window.__knotView();
  L.settleView = async (need = 8) => {
    let last = "", same = 0;
    for (let i = 0; i < 200; i++) {
      await L.sleep(100);
      const v = L.view();
      const k = `${v.s},${v.x},${v.y}`;
      same = k === last ? same + 1 : 0;
      last = k;
      if (same >= need) return v;
    }
    throw new Error(`the view never held still: ${last}`);
  };
  L.zoomTo = async (at, target) => {
    const cv = L.mainCanvas();
    const r = cv.getBoundingClientRect();
    const scr = (v) => [at[0] * v.s + v.x + r.left, at[1] * v.s + v.y + r.top];
    const wheel = (o) => cv.dispatchEvent(new WheelEvent("wheel", { deltaMode: 0, bubbles: true, cancelable: true, ...o }));
    let v = L.view();
    for (let i = 0; i < 6 && Math.abs(v.s - target) / target > 1e-4; i++) {
      const [px, py] = scr(v);
      wheel({ deltaX: 0, deltaY: -Math.log(target / v.s) / 0.01, ctrlKey: true, clientX: px, clientY: py });
      v = await L.settleView();
    }
    for (let i = 0; i < 6; i++) {
      const [px, py] = scr(v);
      const dx = r.left + r.width / 2 - px, dy = r.top + r.height / 2 - py;
      if (Math.hypot(dx, dy) < 0.25) break;
      wheel({ deltaX: dx === 0 ? 1e-6 : -dx, deltaY: -dy, ctrlKey: false, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 });
      v = await L.settleView();
    }
    const p = scr(v);
    return { s: v.s, x: v.x, y: v.y, poiCss: p };
  };
  L.setRow = (label, value) => {
    const text = (l) => (l ? [...l.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim() : "");
    const row = [...document.querySelectorAll(".tp-lblv")].find((r) => text(r.querySelector(".tp-lblv_l")) === label);
    if (!row) throw new Error(`no panel row "${label}"`);
    const inp = row.querySelector("input.tp-txtv_i") ?? row.querySelector("input");
    inp.value = String(value);
    inp.dispatchEvent(new Event("change", { bubbles: true }));
    return inp.value;
  };
  L.gf = () => {
    const g = globalThis.__knotGf;
    if (!g) return null;
    return { rebuilds: g.stats.rebuilds, passes: g.stats.passes, home: g.home ?? null, fallback: g.stats.fallback };
  };
  // Wait until the gf pass has drawn and no build has landed for `quiet` ms (frames continuous).
  L.gfQuiet = async (quiet = 600) => {
    const g0 = L.gf();
    if (!g0) { await L.sleep(quiet); return null; }
    let last = L.gf(), t = performance.now();
    for (let i = 0; i < 100; i++) {
      await L.sleep(100);
      const g = L.gf();
      if (g.rebuilds !== last.rebuilds) { last = g; t = performance.now(); continue; }
      if (performance.now() - t >= quiet && g.passes > g0.passes) return g;
    }
    return L.gf();
  };
}

const res = { base, tag, scenes: {} };
const cells = {}; // scene -> spot -> col -> file
try {
  for (const sc of SCENES) {
    const R = (res.scenes[sc.name] = { link: sc.link, pages: {} });
    cells[sc.name] = {};
    for (const mode of ["off", "on", "outline"]) {
      const q = `?${sc.link}${TAIL}${mode === "outline" ? "&rp=outline" : "&rp=gf"}${mode === "on" ? "&gfh=1" : ""}`;
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
      await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
      await page.goto(base + "/" + q, { waitUntil: "load", timeout: 120000 });
      await page.bringToFront();
      await page.mouse.move(1, 1);
      await page.waitForFunction(() => typeof window.__knotStepUntil === "function" && !!window.__knotPS?.() &&
        window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000, polling: 100 });
      await page.evaluate(pageLib);
      const step = await page.evaluate(async () => {
        await window.__knotStepUntil(40);
        const d1 = await window.__knotPhysDump();
        await window.__knotPhysFreeze(true);
        const d2 = await window.__knotPhysDump();
        window.__knotLoop?.({ continuous: true });
        return { simTime: d1.simTime, hash: d1.hashes.all, frozenHash: d2.hashes.all };
      });
      const P = (R.pages[mode] = { url: base + "/" + q, step, hashOk: step.hash === sc.hash && step.frozenHash === sc.hash,
        params0: await page.evaluate(() => ({ fl: window.__knotParams?.().fadeLength, rp: window.__knotParams?.().renderPath ?? null })),
        global: await page.evaluate(() => ({ gfHome: globalThis.__knotGfHome ?? null })), spots: {} });
      await page.evaluate(pageLib);
      const rect = await page.evaluate(() => window.__k1439.hideChrome());
      await page.evaluate(() => window.__k1439.settleView());
      const v0 = await page.evaluate(() => window.__k1439.view());
      P.baseView = v0;
      for (const [sid, x, y] of sc.spots) {
        const S = (P.spots[sid] = { at: [x, y] });
        cells[sc.name][sid] ??= {};
        S.zoom = await page.evaluate((at, t) => window.__k1439.zoomTo(at, t), [x, y], v0.s * ZOOM);
        S.ready = await page.evaluate(() => window.__k1439.gfQuiet());
        const clip = { x: rect.left + rect.width / 2 - CROP / 2, y: rect.top + rect.height / 2 - CROP / 2, width: CROP, height: CROP };
        const shoot = async (name) => {
          const file = join(outDir, `${sc.name}_${sid}_${name}.png`);
          await page.screenshot({ path: file, clip });
          return file;
        };
        if (mode === "outline") {
          cells[sc.name][sid].outline = await shoot("outline");
          continue;
        }
        // the link's own fl first (the off column), then the three values live
        const fl0 = P.params0.fl;
        if (mode === "off") cells[sc.name][sid].off = await shoot(`off_link${fl0}`);
        S.fl = [];
        if (mode === "on" && sid === sc.spots[0][0]) {
          // a slider-like sweep: 25 values 0 -> 1.2, 40 ms apart, the rebuild counter around it
          const before = await page.evaluate(() => window.__k1439.gf());
          for (let i = 0; i <= 24; i++) {
            await page.evaluate((v) => window.__k1439.setRow("Crossing fade", v), (1.2 * i) / 24);
            await sleep(40);
          }
          const after = await page.evaluate(() => window.__k1439.gfQuiet());
          S.sweep = { before, after, rebuilds: after.rebuilds - before.rebuilds, passes: after.passes - before.passes };
        }
        for (const fl of FLS) {
          const before = await page.evaluate(() => window.__k1439.gf());
          const set = await page.evaluate((v) => window.__k1439.setRow("Crossing fade", v), fl);
          await sleep(100);
          const after = await page.evaluate(() => window.__k1439.gfQuiet());
          const live = await page.evaluate(() => window.__knotParams?.().fadeLength);
          const file = await shoot(`${mode}_fl${fl}`);
          S.fl.push({ fl, set, live, before, after, rebuilds: after.rebuilds - before.rebuilds, passes: after.passes - before.passes, file });
          cells[sc.name][sid][`${mode}_fl${fl}`] = file;
        }
        await page.evaluate((v) => window.__k1439.setRow("Crossing fade", v), fl0);
        await page.evaluate(() => window.__k1439.gfQuiet());
      }
      P.end = await page.evaluate(async () => ({ dump: (await window.__knotPhysDump()).hashes.all, lost: window.__k1439.lost, gf: window.__k1439.gf() }));
      P.errors = errors;
      console.log(`${sc.name} ${mode}: hash ${step.hash} (want ${sc.hash}) end ${P.end.dump} lost ${P.end.lost} home ${JSON.stringify(P.end.gf?.home ?? null)} errors ${errors.length}`);
      for (const [sid, S] of Object.entries(P.spots)) {
        if (S.sweep) console.log(`  ${sid} sweep: rebuilds +${S.sweep.rebuilds}, passes +${S.sweep.passes}`);
        for (const f of S.fl ?? []) console.log(`  ${sid} fl ${f.fl} (live ${f.live}): rebuilds +${f.rebuilds}, passes +${f.passes}, home ${JSON.stringify(f.after?.home ?? null)}`);
      }
      await page.close();
    }
  }
  // the sheets
  const sp = await browser.newPage();
  await sp.setViewport({ width: 1800, height: 900, deviceScaleFactor: 1 });
  const img = (f) => (f ? `<img src="data:image/png;base64,${readFileSync(f).toString("base64")}" width="340" height="340">` : "");
  const sheet = async (name, title, cols, rowsOf) => {
    const html = `<html><body style="margin:8px;font:13px sans-serif;background:#fff"><div>${title}</div><table cellspacing="4">
      <tr><td></td>${cols.map(([, h]) => `<td>${h}</td>`).join("")}</tr>
      ${rowsOf.map(([label, C]) => `<tr><td>${label}</td>${cols.map(([k]) => `<td>${img(C[k])}</td>`).join("")}</tr>`).join("")}
      </table></body></html>`;
    await sp.setContent(html, { waitUntil: "load" });
    const file = join(outDir, name);
    await sp.screenshot({ path: file, fullPage: true });
    return file;
  };
  res.sheets = [];
  for (const sc of SCENES) {
    const fl0 = res.scenes[sc.name].pages.off.params0.fl;
    const rowsOf = sc.spots.map(([sid, x, y]) => [`${sc.name}<br>${sid}<br>${x}, ${y}`, cells[sc.name][sid]]);
    res.sheets.push(await sheet(`sheet_${sc.name}.png`,
      `K1439 ${sc.name} (?${sc.link}${TAIL}), frozen at sim 40, ${ZOOM}x, real GPU. Columns: rp=gf flag off at the link's fl ${fl0} | gfh=1 at fl 0 | 0.14 (default) | 1.2 | rp=outline`,
      [["off", `off (fl ${fl0})`], ["on_fl0", "gfh=1 fl 0"], ["on_fl0.14", "gfh=1 fl 0.14"], ["on_fl1.2", "gfh=1 fl 1.2"], ["outline", "rp=outline"]], rowsOf));
    res.sheets.push(await sheet(`sheet_offfl_${sc.name}.png`,
      `K1439 ${sc.name}: rp=gf flag OFF at fl 0 | 0.14 | 1.2 (what fadeLength does without home), then gfh=1 at the same fl`,
      [["off_fl0", "off fl 0"], ["off_fl0.14", "off fl 0.14"], ["off_fl1.2", "off fl 1.2"], ["on_fl0", "on fl 0"], ["on_fl0.14", "on fl 0.14"], ["on_fl1.2", "on fl 1.2"]], rowsOf));
  }
  console.log(`sheets: ${res.sheets.join(" ")}`);
} finally {
  writeFileSync(join(outDir, `${tag}.json`), JSON.stringify(res, null, 1));
  await browser.close();
  rmSync(profileDir, { recursive: true, force: true });
}
