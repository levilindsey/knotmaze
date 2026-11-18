// K1456 s2 item 1: where a cold rp=gf visit's wait goes. One fresh profile (Chrome's shader cache empty),
// 1600x900, headed, real time. Records, per gf program: its fragment source size, when the compile worker
// (knot-gf-compile) got it and reported it linked (the worker links one at a time, so a program's worker start
// is the previous one's end), and when the page itself issued its link and saw it complete. Also: the load event,
// gf's first composite, the switch, and what the page does meanwhile (app rAF callbacks and frames with GL draws
// per second, longest frame gap).
//   node table.mjs <url> <freshProfileDir> <out.json> [capSecs=300] [afterSecs=12]
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , url, prof, out, capArg = "300", afterArg = "12"] = process.argv;
const b = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const log = [];
try {
  const p = await b.newPage();
  await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => {
    const now = () => performance.now();
    const K = (globalThis.__k = { load: -1, first: -1, wk: { src: [], orders: [], done: [] }, page: [], frames: [], gapMax: 0 });
    addEventListener("load", () => { K.load = now(); });
    // the compile worker's traffic
    const W0 = globalThis.Worker;
    globalThis.Worker = class extends W0 {
      constructor(u, o) {
        super(u, o);
        this.__cw = o?.name === "knot-gf-compile";
        if (this.__cw) { K.wk.created = now(); this.addEventListener("message", (e) => K.wk.done.push({ t: now(), ...e.data })); }
      }
      postMessage(m, ...r) {
        if (this.__cw) {
          if (m?.sources) { K.wk.srcAt = now(); K.wk.src = m.sources.map(([v, f]) => ({ vs: v.length, fs: f.length, tag: tagOf(f) })); globalThis.__kSrc = m.sources.map(([, f]) => f); }
          if (m?.order) K.wk.orders.push({ t: now(), order: m.order });
        }
        return super.postMessage(m, ...r);
      }
    };
    function tagOf(x) {
      const look = x.includes("lkFx"), rev = x.includes("uORvK");
      return (look && rev ? "look+reveal" : look ? "look" : rev ? "reveal" : x.includes("uRvFx") ? "comp-look" : x.length < 8000 ? "small" : "plain");
    }
    // the page's own links
    const P = WebGL2RenderingContext.prototype;
    const src = new WeakMap(), rec = new WeakMap(), att = new WeakMap();
    const o = { ss: P.shaderSource, as: P.attachShader, lp: P.linkProgram, gpp: P.getProgramParameter, gul: P.getUniformLocation };
    P.shaderSource = function (s, x) { src.set(s, x); return o.ss.call(this, s, x); };
    P.attachShader = function (pr, s) { (att.get(pr) ?? att.set(pr, []).get(pr)).push(s); return o.as.call(this, pr, s); };
    P.linkProgram = function (pr) {
      const fs = (att.get(pr) ?? []).map((s) => src.get(s) ?? "").filter((x) => !/gl_Position/.test(x)).sort((a, c) => c.length - a.length)[0] ?? "";
      if (fs.length > 2000) {
        const r = { issue: now(), ready: -1, fs: fs.length, tag: tagOf(fs), widx: (globalThis.__kSrc ?? []).indexOf(fs), blockMs: 0 };
        rec.set(pr, r); K.page.push(r);
      }
      return o.lp.call(this, pr);
    };
    P.getProgramParameter = function (pr, n) {
      const r = rec.get(pr); const a = now();
      const v = o.gpp.call(this, pr, n);
      if (r) { r.blockMs += now() - a; if (v === true && r.ready < 0 && (n === 0x91b1 || n === this.LINK_STATUS)) r.ready = now(); }
      return v;
    };
    // what the page does: app rAF callbacks and frames with draws, per second
    let fid = 0, drawnFid = -1, last = 0;
    const cur = { raf: 0, draw: 0 };
    const raf0 = globalThis.requestAnimationFrame.bind(globalThis);
    globalThis.requestAnimationFrame = (cb) => raf0((t) => { if (t !== last) { if (last) K.gapMax = Math.max(K.gapMax, t - last); last = t; fid++; cur.raf++; } return cb(t); });
    for (const n of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
      const f = P[n]; P[n] = function (...a) { if (drawnFid !== fid) { drawnFid = fid; cur.draw++; } return f.apply(this, a); };
    }
    setInterval(() => { K.frames.push({ t: now(), raf: cur.raf, draw: cur.draw, gap: K.gapMax }); cur.raf = 0; cur.draw = 0; K.gapMax = 0; }, 1000);
    setInterval(() => { if (K.first < 0 && (globalThis.__knotGf?.stats?.composites ?? 0) > 0) K.first = now(); }, 20);
  });
  const t0 = Date.now();
  await p.goto(url, { waitUntil: "load", timeout: 600000 });
  await p.bringToFront();
  let firstSeenAt = -1;
  for (let i = 1; i <= +capArg; i++) {
    await new Promise((r) => setTimeout(r, Math.max(0, t0 + i * 1000 - Date.now())));
    const s = await p.evaluate(() => {
      const g = globalThis.__knotGf?.stats; const r = globalThis.__knotReveal?.();
      return { first: globalThis.__k.first, gf: g ? `i${g.compileIssued} r${g.compileReady} sw=${g.switchedMs > 0} c=${g.composites} w=${g.compileWorker}:${g.compileWarmed}` : "-", rv: r ? `${r.clock.toFixed(1)}${r.done ? "d" : ""}${r.fxAlive ? "fx" : ""}` : "-", fr: globalThis.__k.frames.at(-1) };
    }).catch((e) => ({ err: e.message }));
    const line = `${i}s rv=${s.rv} gf=${s.gf} fps(raf/draw/gap)=${s.fr?.raf}/${s.fr?.draw}/${Math.round(s.fr?.gap ?? 0)}`;
    log.push(line);
    if (i % 5 === 0 || (s.first > 0 && firstSeenAt < 0)) console.log(line);
    if (s.first > 0 && firstSeenAt < 0) firstSeenAt = i;
    if (firstSeenAt > 0 && i >= firstSeenAt + +afterArg && /w=(done|failed|none)/.test(s.gf ?? "")) break;
    if (firstSeenAt > 0 && i >= firstSeenAt + 120) break;
    if (process.env.QUICK && firstSeenAt > 0 && i >= firstSeenAt + +afterArg) break; // QUICK=1: stop afterSecs past the first composite
  }
  const K = await p.evaluate(() => { const k = globalThis.__k; const g = globalThis.__knotGf?.stats; return { ...k, switchedMs: g?.switchedMs ?? -1, build: document.title + " " + (globalThis.__knotBuild ?? "") }; });
  const rel = (t) => (t < 0 ? null : +((t - K.load) / 1000).toFixed(2));
  const wk = K.wk;
  // worker rows: start = previous program's reported end (or the sources' arrival), in the order it finished
  const rows = [];
  let prev = wk.srcAt;
  for (const d of wk.done.filter((d) => typeof d.idx === "number")) {
    const s = wk.src[d.idx];
    const pg = K.page.find((r) => r.widx === d.idx);
    rows.push({ idx: d.idx, tag: s.tag, fs: s.fs, wStart: rel(prev), wEnd: rel(d.t), wSecs: +((d.t - prev) / 1000).toFixed(2), pIssue: pg ? rel(pg.issue) : null, pReady: pg ? rel(pg.ready) : null, pSecs: pg && pg.ready > 0 ? +((pg.ready - pg.issue) / 1000).toFixed(2) : null, pBlockMs: pg ? Math.round(pg.blockMs) : null });
    prev = d.t;
  }
  const extra = K.page.filter((r) => r.widx < 0).map((r) => ({ tag: r.tag, fs: r.fs, pIssue: rel(r.issue), pReady: rel(r.ready), pBlockMs: Math.round(r.blockMs) }));
  const res = { url, build: K.build, loadMs: Math.round(K.load), firstCompositeSecs: rel(K.first), switchSecs: rel(K.switchedMs), worker: { created: rel(wk.created), sources: rel(wk.srcAt), n: wk.src.length, all: rel(wk.done.find((d) => d.all)?.t ?? -1), orders: wk.orders.map((o) => ({ t: rel(o.t), order: o.order.join(",") })) }, rows, pageOnly: extra, frames: K.frames.map((f) => ({ t: rel(f.t), raf: f.raf, draw: f.draw, gap: Math.round(f.gap) })), log };
  writeFileSync(out, JSON.stringify(res, null, 1));
  console.log(`load ${res.loadMs} ms; first composite ${res.firstCompositeSecs} s after load; switch ${res.switchSecs}`);
  console.log("idx tag           fs      wStart  wEnd   wSecs | pIssue pReady pSecs blockMs");
  for (const r of rows) console.log(`${String(r.idx).padStart(3)} ${r.tag.padEnd(12)} ${String(r.fs).padStart(6)} ${String(r.wStart).padStart(7)} ${String(r.wEnd).padStart(6)} ${String(r.wSecs).padStart(6)} | ${String(r.pIssue).padStart(6)} ${String(r.pReady).padStart(6)} ${String(r.pSecs).padStart(5)} ${r.pBlockMs}`);
  for (const r of extra) console.log(`  page-only ${r.tag} fs ${r.fs} issue ${r.pIssue} ready ${r.pReady} block ${r.pBlockMs}`);
} finally { await b.close(); }
