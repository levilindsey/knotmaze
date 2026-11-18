// K1456 s2: how long the driver takes to compile + link given fragment sources (D3D11 ANGLE, headed Chrome).
// Each source gets a nonce (a dead branch on gl_FragCoord that survives into the HLSL), so Chrome's program
// cache never answers. Every program is issued at once on its own context with KHR_parallel_shader_compile
// enabled, then polled every 20 ms: the GPU process compiles them on its thread pool side by side, so give each
// batch its own control copy of the base source and compare within the batch.
//   node ctime.mjs <vs.glsl> <out.json> <a.frag> [b.frag ...]      (env SERIAL=1: one at a time)
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
const [, , vsPath, out, ...files] = process.argv;
const vs = readFileSync(vsPath, "utf8");
const nonce = () => (Math.random() * 1e6 + 1e6).toFixed(3);
const srcs = files.map((f) => readFileSync(f, "utf8").replace(/void\s+main\s*\(\s*(void)?\s*\)\s*\{/, (m) => `${m}\n  if (gl_FragCoord.x < -${nonce()}) discard;`));
const prof = mkdtempSync(join(process.env.TEMP ?? tmpdir(), "k1456s2-ct-"));
const b = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=400,300",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const p = await b.newPage();
  const res = await p.evaluate(async (vs, srcs, serial) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const start = (fs) => {
      const gl = document.createElement("canvas").getContext("webgl2");
      gl.getExtension("KHR_parallel_shader_compile");
      const mk = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); return x; };
      const pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, vs)); const f = mk(gl.FRAGMENT_SHADER, fs); gl.attachShader(pr, f);
      gl.linkProgram(pr);
      return { gl, pr, f, t0: performance.now(), ms: -1, ok: null, log: "" };
    };
    const finish = async (j) => {
      while (!j.gl.getProgramParameter(j.pr, 0x91b1)) await sleep(20);
      j.ms = Math.round(performance.now() - j.t0);
      j.ok = !!j.gl.getProgramParameter(j.pr, j.gl.LINK_STATUS);
      if (!j.ok) j.log = (j.gl.getShaderInfoLog(j.f) || j.gl.getProgramInfoLog(j.pr) || "").slice(0, 400);
      j.gl.getExtension("WEBGL_lose_context")?.loseContext();
      return { ms: j.ms, ok: j.ok, log: j.log };
    };
    if (serial) { const r = []; for (const s of srcs) r.push(await finish(start(s))); return r; }
    const jobs = srcs.map(start);
    return Promise.all(jobs.map(finish));
  }, vs, srcs, !!process.env.SERIAL);
  const rows = files.map((f, i) => ({ file: basename(f), len: srcs[i].length, ...res[i] }));
  writeFileSync(out, JSON.stringify(rows, null, 1));
  for (const r of rows) console.log(`${String(r.ms).padStart(7)} ms ${r.ok ? "ok " : "ERR"} ${r.file} ${r.len}${r.ok ? "" : " " + r.log.replace(/\n/g, " | ")}`);
} finally { await b.close(); rmSync(prof, { recursive: true, force: true }); }
