// K1456 s3: a link without rp=gf must start no gf compile worker and link no gf program (the early start in
// frame_loop.ts runs under rp=gf only). Counts, for <secs> after the load event: Workers by name, main-thread
// fragment programs over 20k chars (gf's are 40-80k; today's are under 20k), and requests for gf's code chunks.
//   node nogf.mjs <url> <profileDir> [secs=20]
import puppeteer from "puppeteer-core";
const [, , url, prof, secs = "20"] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=940,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  const reqs = [];
  p.on("request", (r) => { const u = r.url(); if (/gf_|gpu_field/i.test(u)) reqs.push(u.replace(/^.*\//, "")); });
  await p.evaluateOnNewDocument(() => {
    try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {}
    const k = (globalThis.__nogf = { workers: [], big: 0, progs: 0 });
    const W0 = globalThis.Worker;
    globalThis.Worker = class extends W0 { constructor(u, o) { super(u, o); k.workers.push(o?.name ?? String(u)); } };
    const G = WebGL2RenderingContext.prototype, src = new WeakMap();
    const ss = G.shaderSource; G.shaderSource = function (s, x) { src.set(s, x); return ss.call(this, s, x); };
    const at = G.attachShader; G.attachShader = function (pr, s) { const x = src.get(s) ?? ""; if (!/gl_Position/.test(x)) { k.progs++; if (x.length > 20000) k.big++; } return at.call(this, pr, s); };
  });
  await p.goto(url, { waitUntil: "load", timeout: 300000 });
  await sleep(+secs * 1000);
  const k = await p.evaluate(() => globalThis.__nogf);
  console.log(JSON.stringify({ url, workers: k.workers, fragPrograms: k.progs, gfSizedPrograms: k.big, gfChunks: [...new Set(reqs)] }));
} finally {
  await b.close();
}
