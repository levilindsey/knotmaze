// K1362 s2: where rp=gf's GPU pass spends its time. On the worktree's DEV server (module URLs are
// importable there), a page at rest under rp=gf: gf_pass.ts's GfPass.prototype.draw is wrapped to
// catch the app's pass, then the pass's program is swapped for timing-only variants of gf_glsl.ts's
// source (text surgery, nothing in src/ changes) and each is drawn N times with the pass's own timer
// query. Variants:
//   full    the shipped shader
//   notan   gfFs(false, false): the tangent-point terms off
//   scan    returns after the candidate scan (cells, chunks, segments, the piece-array bookkeeping)
//   dist    the scan with each segment's body cut to the distance and a min (no piece arrays)
//   cells   the cell and chunk walk only (no segment loop)
//   empty   writes a constant: the raster of the scissor rect
//   node k1362s2_breakdown.mjs <out.json> <url> [<url> ...]   (run under the perf lock)
import puppeteer from "puppeteer-core";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , outFile, ...urls] = process.argv;
const N = 30;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "k1362s2-bd-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--window-size=1720,1060"],
});
const out = [];
try {
  for (const url of urls) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
    await page.goto(url, { waitUntil: "load", timeout: 120000 });
    await page.bringToFront();
    await page.mouse.move(1, 1);
    await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000 });
    await page.evaluate(() => window.__knotLoop?.({ continuous: true }));
    await page.waitForFunction(() => window.__knotGf?.stats.passes > 0 && window.__knotPerf().asleep, { timeout: 90000, polling: 250 });
    await sleep(1000);
    const rec = await page.evaluate(async (N) => {
      const imp = new Function("p", "return import(p)");
      const M = await imp("/src/render/gpu_field/gf_pass.ts");
      const G = await imp("/src/render/gpu_field/gf_glsl.ts");
      const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
      let cap = null;
      const orig = M.GfPass.prototype.draw;
      M.GfPass.prototype.draw = function (target, map, rect, time) {
        if (!this.probe && !cap) cap = { pass: this, target, map, rect };
        return orig.call(this, target, map, rect, time);
      };
      window.__knotGf.redraw();
      for (let i = 0; i < 60 && !cap; i++) await raf();
      M.GfPass.prototype.draw = orig;
      if (!cap) return { error: "no draw caught" };
      const { pass, target, map, rect } = cap;
      const gl = pass.gl;
      const src = G.gfFs(false);
      const rep = (s, a, b) => { if (!s.includes(a)) throw new Error("surgery: missing " + a); return s.replace(a, b); };
      const early = (s, v) => rep(s, "    // keys and membership", `    o0 = ${v}; return;\n    // keys and membership`);
      const V = {
        full: src,
        notan: G.gfFs(false, false),
        scan: early(src, "vec4(float(np), float(nSeg), pd[0], 1.0)"),
        dist: early(rep(rep(src, "int nSeg = 0; int nK = 0;", "int nSeg = 0; int nK = 0; float acc = BIG;"), "if (d2 >= rc2) continue;", "acc = min(acc, d2); continue;"), "vec4(acc, float(nSeg), 0.0, 1.0)"),
        cells: early(rep(src, "for (int i = 0; i < chn; i++) {", "nSeg += chn + v0; for (int i = 0; i < 0; i++) {"), "vec4(float(nSeg), 0.0, 0.0, 1.0)"),
        empty: rep(src, "void main() {", "void main() {\n  o0 = vec4(gl_FragCoord.xy * 1e-4, 0.0, 1.0); return;"),
      };
      const prog0 = pass.prog; const u0 = pass.u;
      const res = {};
      try {
        for (const [name, fs] of Object.entries(V)) {
          const t0 = performance.now();
          const prog = M.compileProgram(gl, G.GF_VS, fs);
          const compileMs = performance.now() - t0;
          const u = new Map(); for (const k of u0.keys()) u.set(k, gl.getUniformLocation(prog, k));
          pass.prog = prog; pass.u = u;
          const n0 = pass.gpuMs.length;
          for (let i = 0; i < 3; i++) pass.draw(target, map, rect, false);
          for (let i = 0; i < N; i++) { pass.draw(target, map, rect, true); if (i % 3 === 2) await raf(); }
          for (let i = 0; i < 120 && pass.gpuMs.length < n0 + N; i++) { await raf(); pass.poll(); }
          const ms = pass.gpuMs.slice(n0).sort((a, b) => a - b);
          res[name] = { n: ms.length, p50: +(ms[ms.length >> 1] ?? NaN).toFixed(3), min: +(ms[0] ?? NaN).toFixed(3), max: +(ms[ms.length - 1] ?? NaN).toFixed(3), compileMs: +compileMs.toFixed(0) };
          pass.prog = prog0; pass.u = u0;
          gl.deleteProgram(prog);
        }
      } finally {
        pass.prog = prog0; pass.u = u0;
        window.__knotGf.redraw();
      }
      return { rect, px: (rect[2] - rect[0]) * (rect[3] - rect[1]), res, disjoint: pass.disjoint };
    }, N);
    rec.url = url; rec.errors = errors;
    out.push(rec);
    console.log(JSON.stringify(rec));
    await page.close();
  }
} finally {
  writeFileSync(outFile, JSON.stringify(out, null, 1));
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
