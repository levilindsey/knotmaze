// K1139 S3a same-state A/B: master against the S3a build on the five
// stands (4.4, copied verbatim from strips.mjs), clocks pinned by
// __knotPinClocks, phw=0 - no pixel may differ, since the fan reads no
// pulse band until S3b. Plus an A/A control (the same host loaded
// twice) on cross to prove the capture itself is deterministic.
//   K1139_HOST=<build> node ab.mjs <masterHost> <outDir>
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

const [MASTER, OUTARG] = process.argv.slice(2);
const BUILD = process.env.K1139_HOST || "http://127.0.0.1:5620";
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
    // Sleep + settle waits (lib.mjs's recipes, host-parameterized here).
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
    await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
    const shots = [];
    for (const t of [100, 100.78]) {
      await page.evaluate((tt) => window.__knotPinClocks(tt), t);
      await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
      await sleep(150);
      const canvas = await page.$("canvas");
      const box = await canvas.boundingBox();
      shots.push(await page.screenshot({ type: "png", clip: { x: box.x, y: box.y, width: box.width, height: box.height } }));
    }
    return shots;
  } finally {
    await browser.close();
  }
}

function diff(a, b) {
  const A = toRGB(decodePNG(Buffer.from(a))), B = toRGB(decodePNG(Buffer.from(b)));
  if (A.W !== B.W || A.H !== B.H) return { n: -1, max: -1, size: `${A.W}x${A.H} vs ${B.W}x${B.H}` };
  let n = 0, max = 0;
  for (let i = 0; i < A.data.length; i++) { const d = Math.abs(A.data[i] - B.data[i]); if (d > 0) { if (i % 3 === 0) n++; if (d > max) max = d; } }
  return { n, max, size: `${A.W}x${A.H}` };
}

let fail = 0;
const ONLY = process.argv[4] ? process.argv[4].split(",") : Object.keys(STANDS);
for (const stand of ONLY) {
  const a = await capture(MASTER, stand);
  const b = await capture(BUILD, stand);
  for (let k = 0; k < a.length; k++) {
    writeFileSync(join(OUT, `${stand}_t${k}_master.png`), a[k]);
    writeFileSync(join(OUT, `${stand}_t${k}_build.png`), b[k]);
    const d = diff(a[k], b[k]);
    console.log(`${stand} t${k}: master vs build ${d.n} px differ, max ${d.max}/255 (${d.size})`);
    if (d.n !== 0) fail = 1;
  }
}
{
  const a = await capture(MASTER, "cross");
  const b = await capture(MASTER, "cross");
  for (let k = 0; k < a.length; k++) {
    const d = diff(a[k], b[k]);
    console.log(`cross t${k} A/A control: ${d.n} px differ, max ${d.max}/255`);
    if (d.n !== 0) fail = 1;
  }
}
console.log(fail ? "A/B FAIL" : "A/B PASS (0 px)");
process.exitCode = fail;
