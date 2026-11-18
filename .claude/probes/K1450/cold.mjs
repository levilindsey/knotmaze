// K1450: what compiles on a cold profile's first rp=gf load, and how long main waits on each program.
// Wraps WebGL2 before load (shaderSource, attachShader, linkProgram, getProgramParameter, getShaderParameter,
// getUniformLocation) and books, per program, the wall time main spent BLOCKED inside the first call that had
// to wait for the link (Chrome links in the GPU process; the first status or uniform read waits for it).
// A fresh profile per run (the GPU program cache lives in the profile and is keyed by source).
//   node .claude/probes/K1450/cold.mjs <url> <freshProfileDir> <out.json> [waitAfterComposite=8000]
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , url, profileDir, out, waitArg = "8000"] = process.argv;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
  protocolTimeout: 900000,
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    const P = WebGL2RenderingContext.prototype;
    const src = new WeakMap(), att = new WeakMap(), rec = new WeakMap();
    const progs = (globalThis.__cold = []);
    const t0 = performance.now();
    const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(16); };
    const o = { ss: P.shaderSource, as: P.attachShader, lp: P.linkProgram, gpp: P.getProgramParameter, gul: P.getUniformLocation, gsp: P.getShaderParameter };
    P.shaderSource = function (sh, s) { src.set(sh, s); return o.ss.call(this, sh, s); };
    P.attachShader = function (p, sh) { (att.get(p) ?? att.set(p, []).get(p)).push(sh); return o.as.call(this, p, sh); };
    P.linkProgram = function (p) {
      const sh = att.get(p) ?? [];
      const fs = sh.map((x) => src.get(x) ?? "").sort((a, b) => b.length - a.length)[0] ?? "";
      const name = (fs.match(/SHADER_NAME\s+(\S+)/) ?? [])[1] ?? (fs.match(/^\s*(?:\/\/[^\n]*)/m) ?? [""])[0].slice(0, 80);
      const r = { at: Math.round(performance.now() - t0), fsLen: fs.length, hash: hash(sh.map((x) => src.get(x) ?? "").join("\u0000")), name, defines: (fs.match(/#define [A-Z_0-9]+/g) ?? []).slice(0, 8).join(" "), linkMs: 0, waitMs: 0, waited: false };
      rec.set(p, r); progs.push(r);
      const a = performance.now(); const v = o.lp.call(this, p); r.linkMs = +(performance.now() - a).toFixed(1); return v;
    };
    const wait = (p, fn) => { const r = rec.get(p); if (!r || r.waited) return fn(); const a = performance.now(); const v = fn(); r.waitMs = +(performance.now() - a).toFixed(1); r.waited = true; return v; };
    P.getProgramParameter = function (p, k) { return wait(p, () => o.gpp.call(this, p, k)); };
    P.getUniformLocation = function (p, n) { return wait(p, () => o.gul.call(this, p, n)); };
  });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 500 });
  const firstComposite = Date.now() - t0;
  await new Promise((r) => setTimeout(r, Number(waitArg)));
  const progs = await page.evaluate(() => globalThis.__cold);
  progs.sort((a, b) => b.waitMs + b.linkMs - (a.waitMs + a.linkMs));
  const total = progs.reduce((s, r) => s + r.waitMs + r.linkMs, 0);
  writeFileSync(out, JSON.stringify({ url, firstComposite, programs: progs.length, blockedMs: Math.round(total), progs }, null, 1));
  console.log(`first composite ${firstComposite} ms; ${progs.length} programs; main blocked ${Math.round(total)} ms in link waits`);
  for (const r of progs.slice(0, 15)) console.log(`${String(Math.round(r.waitMs + r.linkMs)).padStart(7)} ms  at ${r.at}  fs ${r.fsLen}  ${r.hash}  ${r.name}  ${r.defines}`);
} finally {
  await browser.close();
}
