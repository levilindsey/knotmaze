// K1482 s34b: compile and link every fragment source src34.ts dumped (with its vs.vert) in a real Chrome WebGL2
// context, one program at a time, and print each one's status, info log and wall time. A GLSL check before a page
// load: the page's async compile hides a failure behind today's renderer (K1456). Run under the perf lock.
//   node compile34.mjs <dumpDir> [--headed]
import puppeteer from "puppeteer-core";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const [, , dir, ...flags] = process.argv;
const headed = flags.includes("--headed");
const vs = readFileSync(join(dir, "vs.vert"), "utf8");
const files = readdirSync(dir).filter((f) => f.endsWith(".frag")).sort();
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: !headed, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--disable-gpu-watchdog", "--no-first-run", "--window-position=2200,50", "--disable-features=CalculateNativeWinOcclusion"],
});
let bad = 0;
try {
  const page = await browser.newPage();
  await page.setContent("<canvas id=c width=4 height=4></canvas>");
  const info = await page.evaluate(() => { const gl = document.getElementById("c").getContext("webgl2"); if (!gl) return "no webgl2"; const e = gl.getExtension("WEBGL_debug_renderer_info"); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
  console.log("renderer:", info);
  for (const f of files) {
    const fs = readFileSync(join(dir, f), "utf8");
    const r = await page.evaluate((vs, fs) => {
      const gl = document.getElementById("c").getContext("webgl2"); const t0 = performance.now();
      const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      const v = mk(gl.VERTEX_SHADER, vs), f = mk(gl.FRAGMENT_SHADER, fs);
      const vOk = gl.getShaderParameter(v, gl.COMPILE_STATUS), fOk = gl.getShaderParameter(f, gl.COMPILE_STATUS);
      const p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
      const lOk = gl.getProgramParameter(p, gl.LINK_STATUS);
      return { vOk, fOk, lOk, ms: Math.round(performance.now() - t0), vLog: gl.getShaderInfoLog(v), fLog: gl.getShaderInfoLog(f), pLog: gl.getProgramInfoLog(p), lost: gl.isContextLost() };
    }, vs, fs);
    const ok = r.vOk && r.fOk && r.lOk;
    if (!ok) bad++;
    console.log(`${ok ? "OK  " : "FAIL"} ${f}: ${fs.length} chars, compile ${r.fOk} link ${r.lOk}, ${r.ms} ms${r.lost ? ", CONTEXT LOST" : ""}`);
    if (!ok) console.log(`  vs: ${r.vLog}\n  fs: ${(r.fLog || "").slice(0, 3000)}\n  link: ${(r.pLog || "").slice(0, 1000)}`);
  }
} finally { await browser.close(); }
console.log(`${files.length} programs, ${bad} failed`);
process.exit(bad ? 1 : 0);
