// K1139 S3b same-state A/B: master against the S3b build on the five
// stands (4.4, copied verbatim from strips.mjs), clocks pinned by
// __knotPinClocks, phw=0. S3b changes pixels INSIDE banded records by
// design (the fan draws the bands; the arms read quiet rows there), so
// the gate is: 0 px differ OUTSIDE banded records. A diff pixel counts
// as inside when it sits within MASK_R world of a banded junction's
// screen point (either capture's; the fan's reach along an arm is
// ~0.98 world, plus the cover strips' bandEnd and a margin). The
// same-build control (build against itself on cross) runs first and
// must read 0 px everywhere, masked or not.
//   K1139_HOST=<build> node ab_s3b.mjs <masterHost> <outDir> [stands]
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer-core";
import { mkdirSync as mk, mkdtempSync, rmSync } from "node:fs";
import { join as jn } from "node:path";
import { decodePNG, toRGB } from "./png.mjs";
import { sleep } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = {
  fork: { q: Q, moves: [0], extra: "" },
  cross: { q: Q, moves: [0, 246, 82, 83, 199], extra: "" },
  src: { q: Q, moves: [0, 246, 82, 83, 199, 150], extra: "" },
  four: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180, 176], extra: "" },
  x4: { q: Q, moves: [0, 247, 248, 69, 72, 73, 95, 140, 180], extra: "&pr=8" },
};
const MASK_R = 1.35; // world units around a banded junction

const [MASTER, OUTARG] = process.argv.slice(2);
const BUILD = process.env.K1139_HOST || "http://127.0.0.1:5550";
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });

async function openBrowser() {
  mk(jn(import.meta.dirname, "udd"), { recursive: true });
  const udd = mkdtempSync(jn(import.meta.dirname, "udd", "k1139ab-"));
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
    await page.setViewport({ width: 1700, height: 950, deviceScaleFactor: 1.5 });
    const cdp = await page.createCDPSession();
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
    await page.goto(`${host}/?${st.q}${st.extra}`, { waitUntil: "load", timeout: 90000 });
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
    // Banded junctions of this state (either build declares the same
    // bands; master's hook predates the feed and returns the specs).
    const banded = await page.evaluate(() => {
      const bands = window.__knotPulseBands ? window.__knotPulseBands() : [];
      const vs = [...new Set(bands.map((b) => b.vertex))];
      const k = window.__knotFabric();
      return vs.map((v) => {
        const p = k.vertexScreen(v);
        const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
        return { v, x: p.x, y: p.y, ppw: 100 / Math.hypot(b.x - a.x, b.y - a.y) };
      });
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
    // Screen points in screenshot pixels (DSF 1.5 over the canvas box).
    const pts = banded.map((b) => ({ v: b.v, x: (b.x - box.x) * 1.5, y: (b.y - box.y) * 1.5, r: MASK_R * b.ppw * 1.5 }));
    return { shots, pts };
  } finally {
    await browser.close();
  }
}

function diff(a, b, masks) {
  const A = toRGB(decodePNG(Buffer.from(a))), B = toRGB(decodePNG(Buffer.from(b)));
  if (A.W !== B.W || A.H !== B.H) return { n: -1, out: -1, max: -1, size: `${A.W}x${A.H} vs ${B.W}x${B.H}` };
  let n = 0, out = 0, max = 0;
  for (let y = 0; y < A.H; y++) {
    for (let x = 0; x < A.W; x++) {
      const i = (y * A.W + x) * 3;
      const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
      if (d > 0) {
        n++;
        if (d > max) max = d;
        let inside = false;
        for (const m of masks) { const dx = x - m.x, dy = y - m.y; if (dx * dx + dy * dy <= m.r * m.r) { inside = true; break; } }
        if (!inside) out++;
      }
    }
  }
  return { n, out, max, size: `${A.W}x${A.H}` };
}

let fail = 0;
const ONLY = process.argv[4] ? process.argv[4].split(",") : Object.keys(STANDS);
// Same-build control first (brief task 5): build vs build on cross.
{
  const a = await capture(BUILD, "cross");
  const b = await capture(BUILD, "cross");
  for (let k = 0; k < a.shots.length; k++) {
    const d = diff(a.shots[k], b.shots[k], [...a.pts, ...b.pts]);
    console.log(`cross t${k} build/build control: ${d.n} px differ (${d.out} outside banded records), max ${d.max}/255; banded: ${a.pts.map((p) => p.v).join(",") || "none"}`);
    if (d.n !== 0) fail = 1;
  }
}
for (const stand of ONLY) {
  const a = await capture(MASTER, stand);
  const b = await capture(BUILD, stand);
  for (let k = 0; k < a.shots.length; k++) {
    writeFileSync(join(OUT, `${stand}_t${k}_master.png`), a.shots[k]);
    writeFileSync(join(OUT, `${stand}_t${k}_build.png`), b.shots[k]);
    const d = diff(a.shots[k], b.shots[k], [...a.pts, ...b.pts]);
    console.log(`${stand} t${k}: master vs build ${d.n} px differ, ${d.out} OUTSIDE banded records, max ${d.max}/255 (${d.size}); banded: ${b.pts.map((p) => p.v).join(",") || "none"}`);
    if (d.out !== 0) fail = 1;
  }
}
console.log(fail ? "A/B FAIL" : "A/B PASS (0 px outside banded records)");
process.exitCode = fail;
