// K1362 s15: compile and link fragment shaders (with gf.vert from k1362s15_dumpfs.ts) in headed desktop Chrome (ANGLE
// D3D11), one fresh context per shader; reports compile/link status, ms and a lost context.
//   node .claude/probes/K1362/k1362s15_compile.mjs <dir with gf.vert> <a.frag> [<b.frag> ...]
import puppeteer from "puppeteer-core";
import { readFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [dir, ...frags] = process.argv.slice(2);
const vs = readFileSync(join(dir, "gf.vert"), "utf8");
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, protocolTimeout: 600000,
  userDataDir: mkdtempSync(join(tmpdir(), "k1362s15c-")),
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const page = await browser.newPage();
for (const f of frags) {
  const fs = readFileSync(f, "utf8");
  const r = await page.evaluate(async (v, s) => {
    const c = document.createElement("canvas"); const gl = c.getContext("webgl2");
    let lost = false; c.addEventListener("webglcontextlost", () => { lost = true; });
    const t0 = performance.now();
    const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x; };
    const a = sh(gl.VERTEX_SHADER, v), b = sh(gl.FRAGMENT_SHADER, s);
    const p = gl.createProgram(); gl.attachShader(p, a); gl.attachShader(p, b); gl.linkProgram(p);
    const ok = gl.getProgramParameter(p, gl.LINK_STATUS);
    const ms = performance.now() - t0;
    await new Promise((r) => setTimeout(r, 300));
    return { ok, ms: Math.round(ms), lost: lost || gl.isContextLost(), fsLog: (gl.getShaderInfoLog(b) ?? "").slice(0, 400), linkLog: (gl.getProgramInfoLog(p) ?? "").slice(0, 400) };
  }, vs, fs);
  console.log(`${f.split(/[\\/]/).pop()}: link ${r.ok} ${r.ms} ms lost ${r.lost} ${r.fsLog ? "fs: " + r.fsLog : ""} ${r.linkLog ? "link: " + r.linkLog : ""}`);
}
await browser.close();
