// K1472 s3 item 0: when gf takes over on one visit of a link (unpinned, live), against the reveal's clock.
// Hooks the page's WebGL2 links like progs.mjs (L = look over plain, L+R = look over the reveal form, ...),
// polls every 100 ms (reveal clock, gf stats), and shoots the page every SHOTMS while gf has not switched
// (keeping the last two) and right after the switch, so the last today's frame and gf's first can be diffed.
//   node takeover.mjs <url> <profileDir> <outPrefix> [secs=240]
// env VW/VH (900x900), SHOTMS (250), AT_DONE=1 (a control on today's renderer: the "switch" is the reveal's end; AT_DONE=fx: the FX tail's end)
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , url, prof, out, secs = "240"] = process.argv;
const VW = +(process.env.VW ?? 900), VH = +(process.env.VH ?? 900), SHOTMS = +(process.env.SHOTMS ?? 250);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", `--window-size=${VW + 40},${VH + 160}`, "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
const log = [];
const say = (...a) => { const s = a.join(" "); console.log(s); log.push(s); };
const res = { url, events: [] };
try {
  const p = await b.newPage();
  await p.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => {
    try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {}
    const t0 = performance.now();
    const W = WebGL2RenderingContext.prototype;
    const src = new WeakMap(), tag = new WeakMap(), done = new WeakSet();
    const ev = (globalThis.__k1472p = []);
    const ss = W.shaderSource; W.shaderSource = function (s, x) { src.set(s, x); return ss.call(this, s, x); };
    const at = W.attachShader; W.attachShader = function (pr, s) {
      const x = src.get(s) ?? "";
      if (/out\s+(highp\s+)?(u?vec4|uvec4)|gl_FragColor|fragColor|outColor/.test(x) && !/gl_Position/.test(x)) {
        const t = x.includes("uRvFx") ? "C-look" : x.includes("uORvK") && x.includes("lkFx") ? "L+R" : x.includes("lkFx") ? "L" : x.includes("uORvK") ? "R" : x.length < 4000 ? "C-small" : "P";
        tag.set(pr, `${t}/${x.length}`);
      }
      return at.call(this, pr, s);
    };
    const lk = W.linkProgram; W.linkProgram = function (pr) { if (tag.has(pr)) ev.push({ t: +((performance.now() - t0) / 1000).toFixed(2), what: "issue", prog: tag.get(pr) }); return lk.call(this, pr); };
    const gp = W.getProgramParameter; W.getProgramParameter = function (pr, n) {
      const v = gp.call(this, pr, n);
      if (v === true && tag.has(pr) && !done.has(pr) && (n === 0x91b1 || n === this.LINK_STATUS)) { done.add(pr); ev.push({ t: +((performance.now() - t0) / 1000).toFixed(2), what: "ready", prog: tag.get(pr) }); }
      return v;
    };
  });
  await p.goto(url, { waitUntil: "load", timeout: 300000 });
  await p.bringToFront();
  const t0 = Date.now(); const T = () => +((Date.now() - t0) / 1000).toFixed(2);
  let seen = 0, last = "", lastShot = 0, shots = [], sw = false, swInfo = null, revealStart = null, revealEnd = null, firstInk = null;
  for (let k = 0; k < +secs * 10; k++) {
    const s = await p.evaluate(() => {
      const r = globalThis.__knotReveal?.(); const g = globalThis.__knotGf?.stats;
      return { ev: globalThis.__k1472p ?? [], now: performance.now(), fx: globalThis.__knotRenderer?.()?.fxLive, rv: r ? { c: r.clock, d: r.duration, done: r.done } : null,
        gf: g ? { c: g.composites, i: g.compileIssued, r: g.compileReady, sw: g.switchedMs, fb: g.fallback, w: `${g.compileWorker}:${g.compileWarmed}` } : null };
    }).catch((e) => ({ ev: [], err: e.message }));
    for (; seen < s.ev.length; seen++) { say(`  page ${s.ev[seen].t}s ${s.ev[seen].what} ${s.ev[seen].prog}`); res.events.push(s.ev[seen]); }
    if (s.rv && revealStart === null && s.rv.c > 0) { revealStart = T(); say(T(), "reveal clock running", s.rv.c.toFixed(2), "/", s.rv.d.toFixed(2)); }
    if (s.rv && revealEnd === null && s.rv.done) { revealEnd = T(); say(T(), "reveal done"); }
    const line = `rv=${s.rv ? `${s.rv.c.toFixed(1)}/${s.rv.d.toFixed(1)}${s.rv.done ? "d" : ""}` : null} gf=${s.gf ? `i${s.gf.i} r${s.gf.r} sw=${s.gf.sw > 0} c=${s.gf.c > 0} fb=${s.gf.fb} w=${s.gf.w}` : null}`;
    const key = line.replace(/rv=[^ ]+/, "");
    if (key !== last) say(T(), line);
    last = key;
    if (!sw && (process.env.AT_DONE ? s.rv?.done && (process.env.AT_DONE !== "fx" || s.fx === false) : s.gf && s.gf.sw > 0)) {
      sw = true;
      swInfo = { t: T(), rv: s.rv, gf: s.gf, pageSwitchS: s.gf ? +(s.gf.sw / 1000).toFixed(2) : null };
      await p.screenshot({ path: `${out}_post0.png` });
      await sleep(120);
      await p.screenshot({ path: `${out}_post1.png` });
      say(T(), "SWITCH", JSON.stringify(swInfo), "pre shots", shots.map((x) => x.t).join(","));
      for (const [i, x] of shots.entries()) writeFileSync(`${out}_pre${shots.length - 1 - i}.png`, x.buf);
    } else if (!sw && Date.now() - lastShot >= SHOTMS && s.rv) {
      lastShot = Date.now();
      const buf = await p.screenshot();
      shots.push({ t: T(), buf, rv: s.rv }); if (shots.length > 2) shots.shift();
    }
    if (sw && process.env.AT_DONE) break;
    if (sw && s.gf && s.gf.i === s.gf.r && /done|failed|none/.test(s.gf.w) && revealEnd !== null) { say(T(), "all compiled, switched, worker over"); break; }
    await sleep(100);
  }
  res.revealStart = revealStart; res.revealEnd = revealEnd; res.sw = swInfo; res.log = log;
  writeFileSync(`${out}.json`, JSON.stringify(res, null, 1));
} finally { await b.close(); }
