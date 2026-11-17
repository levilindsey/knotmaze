// K1439 Done 2 (flag off: pixels as on master): a cross-build same-state A/B of whole frames. For each scene it
// loads A, B and A again (the control) on `<link>&am=instant&snd=none&stb=0&fw=0&phw=0&rp=gf` (no gfh), steps to sim
// 40 and freezes (hash checked), pins every clock (k1439_sheet.mjs's recipe), hides the chrome, shoots the canvas,
// and counts differing pixels in-page (canvas getImageData). Run under the perf lock with no other server load:
//   node .claude/probes/K1439/k1439_offab.mjs http://127.0.0.1:5522 http://127.0.0.1:5523 [tag]
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [, , A, B, tagArg] = process.argv;
const tag = tagArg ?? "offab";
const outDir = join(dirname(fileURLToPath(import.meta.url)), "out", tag);
mkdirSync(outDir, { recursive: true });
const TAIL = "&am=instant&snd=none&stb=0&fw=0&phw=0&rp=gf";
// the census scenes' capture links, as k1439_sheet.mjs
const SCENES = [
  { name: "muse_hash", link: "3&tlk=border&tw=1.1&cr=6&bg=wash&bgcm=custom&bgc0=e6e9ee", hash: "733ee14a" },
  { name: "g41_user_tw64", link: "s=1471kin&gs=12&rep=1&bd=1&sm=.25&ga=0&tw=.64&gap=.12&cr=3&fl=0&fv=1.15&vol=.18&hs=312&pal=moss&pc=6c644c&as=2.1&tlk=border", hash: "0d51331b" },
];
const VW = 1240, VH = 900, DSF = 2;
const profileDir = join(tmpdir(), `k1439-offab-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false, userDataDir: profileDir, defaultViewport: { width: VW, height: VH, deviceScaleFactor: DSF },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    `--window-size=${VW + 40},${VH + 160}`, "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function shot(base, sc, label) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.goto(`${base}/?${sc.link}${TAIL}`, { waitUntil: "load", timeout: 120000 });
  await page.bringToFront();
  await page.mouse.move(1, 1);
  await page.waitForFunction(() => typeof window.__knotStepUntil === "function" && !!window.__knotPS?.() &&
    window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000, polling: 100 });
  const info = await page.evaluate(async () => {
    let lost = 0;
    let mc = null, area = -1;
    for (const c of document.querySelectorAll("canvas")) {
      if (c.id === "knot-loading-canvas") continue;
      const r = c.getBoundingClientRect();
      if (r.width * r.height >= area) { area = r.width * r.height; mc = c; }
    }
    mc.addEventListener("webglcontextlost", () => { lost++; window.__k1439lost = lost; });
    await window.__knotStepUntil(40);
    const d1 = await window.__knotPhysDump();
    await window.__knotPhysFreeze(true);
    window.__knotLoop?.({ continuous: true });
    const r = window.__knotRenderer(), proto = Object.getPrototypeOf(r);
    r.advanceClocks = function () {}; r.paintClock = 100; r.pulseBorn = 0;
    r.tickPaint = function () { return proto.tickPaint.call(this, 0); };
    try {
      const Bg = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
      if (Bg) { Bg.tick = function () { return false; }; Bg.clock.time = 40; if (Bg.active) Bg.renderTexture(); }
    } catch (e) { /* none */ }
    const stamp = document.body.innerText.match(/P\d v[\d.]+ \w+\+?/)?.[0] ?? null;
    mc.setAttribute("data-k1439-main", "1");
    const st = document.createElement("style");
    st.textContent = "body * { visibility: hidden !important; } canvas[data-k1439-main] { visibility: visible !important; }";
    document.head.appendChild(st);
    const rc = mc.getBoundingClientRect();
    return { hash: d1.hashes.all, rect: { x: rc.left, y: rc.top, width: rc.width, height: rc.height },
      stamp, gfHome: globalThis.__knotGfHome ?? null };
  });
  // wait for the gf pass to go quiet (no build for 800 ms) and the view to hold
  let last = "", t = Date.now();
  for (let i = 0; i < 150; i++) {
    await sleep(100);
    const k = await page.evaluate(() => { const g = globalThis.__knotGf; const v = window.__knotView(); return `${g?.stats.rebuilds}|${v.s},${v.x},${v.y}`; });
    if (k !== last) { last = k; t = Date.now(); continue; }
    if (Date.now() - t >= 800) break;
  }
  const gf = await page.evaluate(() => { const g = globalThis.__knotGf; return g ? { rebuilds: g.stats.rebuilds, passes: g.stats.passes, home: g.home ?? null, fallback: g.stats.fallback } : null; });
  const file = join(outDir, `${sc.name}_${label}.png`);
  const buf = await page.screenshot({ path: file, clip: info.rect, encoding: "base64" });
  const lost = await page.evaluate(() => window.__k1439lost ?? 0);
  await page.close();
  return { label, base, ...info, gf, lost, errors, file, b64: buf };
}

async function diff(a, b) {
  const p = await browser.newPage();
  const r = await p.evaluate(async (x, y) => {
    const load = (s) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = "data:image/png;base64," + s; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { sizeMismatch: [ia.width, ia.height, ib.width, ib.height] };
    const get = (im) => { const c = new OffscreenCanvas(im.width, im.height); const g = c.getContext("2d"); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
    const da = get(ia), db = get(ib);
    let px = 0, max = 0, first = null;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      if (d > 0) { px++; if (d > max) max = d; if (!first) first = [(i / 4) % ia.width, Math.floor(i / 4 / ia.width)]; }
    }
    return { w: ia.width, h: ia.height, px, max, first };
  }, a.b64, b.b64);
  await p.close();
  return r;
}

const out = [];
try {
  for (const sc of SCENES) {
    const a1 = await shot(A, sc, "A"); const b1 = await shot(B, sc, "B"); const a2 = await shot(A, sc, "A2");
    const ab = await diff(a1, b1); const aa = await diff(a1, a2);
    const strip = (s) => { const { b64, ...rest } = s; return { ...rest, hashOk: s.hash === sc.hash }; };
    const rec = { scene: sc.name, A: strip(a1), B: strip(b1), A2: strip(a2), AvsB: ab, AvsA2: aa };
    out.push(rec);
    console.log(`${sc.name}: A ${a1.stamp} hash ${a1.hash} | B ${b1.stamp} hash ${b1.hash} | A2 hash ${a2.hash} (want ${sc.hash}); B gfHome ${b1.gfHome} home ${JSON.stringify(b1.gf?.home)}; lost ${a1.lost}/${b1.lost}/${a2.lost}`);
    console.log(`  A vs B: ${JSON.stringify(ab)}   control A vs A2: ${JSON.stringify(aa)}`);
  }
} finally {
  writeFileSync(join(outDir, `${tag}.json`), JSON.stringify(out, null, 1));
  await browser.close();
  rmSync(profileDir, { recursive: true, force: true });
}
