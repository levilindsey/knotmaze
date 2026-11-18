// K1472 Do 4: which gf programs a load issues, in what order, and which one the switch waited for.
// Hooks WebGL2 linkProgram (the issue) and the COMPLETION_STATUS_KHR / LINK_STATUS reads that come back true
// (the finish), and tags each program from its fragment source: R = the reveal form (uORvK), L = the look form
// (lkFx), C = a composite (uRvFx = the look composite, else the plain one), P = gf's plain pass. Each second it
// prints the reveal clock, gf's compileIssued/Ready and the switch. No reload: a cold profile shows the cold order.
//   node progs.mjs <url> <profileDir> [secs=400]
import puppeteer from "puppeteer-core";
const [, , url, prof, secs = "400"] = process.argv;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=940,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => {
    const t0 = performance.now();
    const W = WebGL2RenderingContext.prototype;
    const src = new WeakMap(), tag = new WeakMap(), done = new WeakSet();
    const ev = (globalThis.__k1472p = []);
    globalThis.__k1472gap = 0; let lastF = 0; const tick = (n) => { if (lastF) globalThis.__k1472gap = Math.max(globalThis.__k1472gap, n - lastF); lastF = n; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    const ss = W.shaderSource; W.shaderSource = function (s, x) { src.set(s, x); return ss.call(this, s, x); };
    const at = W.attachShader; W.attachShader = function (pr, s) {
      const x = src.get(s) ?? "";
      if (/out\s+(highp\s+)?(u?vec4|uvec4)|gl_FragColor|fragColor|outColor/.test(x) && !/gl_Position/.test(x)) {
        const t = x.includes("uRvFx") ? "C-look" : x.includes("uORvK") && x.includes("lkFx") ? "L+R" : x.includes("lkFx") ? "L" : x.includes("uORvK") ? "R" : x.length < 4000 ? "C-plain/small" : "P";
        tag.set(pr, `${t} len=${x.length}`);
      }
      return at.call(this, pr, s);
    };
    const lk = W.linkProgram; W.linkProgram = function (pr) { if (tag.has(pr)) ev.push({ t: +((performance.now() - t0) / 1000).toFixed(1), what: "issue", prog: tag.get(pr) }); return lk.call(this, pr); };
    const gp = W.getProgramParameter; W.getProgramParameter = function (pr, n) {
      const v = gp.call(this, pr, n);
      if (v === true && tag.has(pr) && !done.has(pr) && (n === 0x91b1 || n === this.LINK_STATUS)) { done.add(pr); ev.push({ t: +((performance.now() - t0) / 1000).toFixed(1), what: "ready", prog: tag.get(pr) }); }
      return v;
    };
  });
  const t0 = Date.now();
  await p.goto(url, { waitUntil: "load", timeout: 300000 });
  await p.bringToFront();
  let seen = 0, last = "";
  for (let i = 1; i <= +secs; i++) {
    await new Promise((r) => setTimeout(r, Math.max(0, t0 + i * 1000 - Date.now())));
    const s = await p.evaluate(() => { const r = globalThis.__knotReveal?.(); const g = globalThis.__knotGf?.stats; return { ev: globalThis.__k1472p ?? [], rv: r ? `${r.clock.toFixed(2)}/${r.duration.toFixed(2)}${r.done ? " done" : ""} fx=${r.fxAlive}` : null, gf: g ? `i${g.compileIssued} r${g.compileReady} sw=${g.switchedMs > 0} c=${g.composites} rvP=${g.rvPasses} w=${g.compileWorker}:${g.compileWarmed} gap=${Math.round(globalThis.__k1472gap)}` + ((globalThis.__k1472gap = 0), "") : null }; }).catch((e) => ({ ev: [], err: e.message }));
    for (; seen < s.ev.length; seen++) console.log(`  page ${s.ev[seen].t}s ${s.ev[seen].what} ${s.ev[seen].prog}`);
    const line = `rv=${s.rv} gf=${s.gf}`;
    if (line !== last || i % 30 === 0) console.log(`${i}s ${line}`);
    last = line;
    if (/sw=true/.test(line) && /i(\d+) r\1 /.test(line) && /w=(done|failed|none)/.test(line)) { console.log("all compiled, switched, worker over"); break; }
  }
} finally { await b.close(); }
