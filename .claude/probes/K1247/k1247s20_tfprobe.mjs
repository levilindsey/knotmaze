// K1247 s20: the record placement pass's cost on main. Wraps WebGL2's begin/endTransformFeedback with
// a 1-px readPixels (Chrome's finish() does not wait) (so the times are the pass's GPU work, not overlapped) and the first draw after a pass, then
// asks the outline for replies (__knotOutline.resend) at rest. Frame rates under it are void (a GPU sync per pass).
//   node .claude/probes/K1247/k1247s20_tfprobe.mjs <url> [replies=8]
import puppeteer from "puppeteer-core";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , url, nArg] = process.argv; const nRep = Number(nArg ?? 8);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "k1247s20-tf-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--window-size=1720,1060"],
});
try {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    const P = WebGL2RenderingContext.prototype; const W = (window.__tf = { tf: [], draw: [], n: [], pending: false });
    const b0 = P.beginTransformFeedback; const e0 = P.endTransformFeedback; const d0 = P.drawArrays; const d1 = P.drawElements;
    let t0 = 0; const px = new Uint8Array(4); const sync = (g) => g.readPixels(0, 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px);
    P.beginTransformFeedback = function (m) { sync(this); t0 = performance.now(); return b0.call(this, m); };
    P.drawArrays = function (m, f, c) { if (t0) W.n.push(c); const r = d0.call(this, m, f, c);
      if (W.pending) { sync(this); W.draw.push(performance.now() - W.tp); W.pending = false; } return r; };
    P.drawElements = function (m, c, t, o) { if (W.pending) { W.tp = performance.now(); } const r = d1.call(this, m, c, t, o);
      if (W.pending) { sync(this); W.draw.push(performance.now() - W.tp); W.pending = false; } return r; };
    P.endTransformFeedback = function () { const r = e0.call(this); sync(this); W.tf.push(performance.now() - t0); t0 = 0;
      W.pending = true; W.tp = performance.now(); return r; };
  });
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.bringToFront(); await page.mouse.move(1, 1);
  await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000 });
  await sleep(4000);
  for (let k = 0; k < nRep; k++) { await page.evaluate(() => window.__knotOutline?.resend()); await sleep(1200); }
  const r = await page.evaluate(() => window.__tf);
  const q = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? `n ${s.length} p50 ${s[s.length >> 1].toFixed(1)} max ${s[s.length - 1].toFixed(1)}` : "none"; };
  console.log(JSON.stringify({ url, tfMs: q(r.tf), firstDrawAfterMs: q(r.draw), points: r.n.slice(-1)[0] ?? 0 }));
} finally { await browser.close(); rmSync(profile, { recursive: true, force: true }); }
