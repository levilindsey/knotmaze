// K1468 cold-load check: node cold.mjs <url> <profileDir> [seconds=120]
// One load on the given profile (fresh = cold shader cache). Prints a row whenever gf's stats change, every console
// error, context loss/restore, and at the end one JSON line "SUMMARY {...}":
//   firstCompositeS  seconds from navigation to gf's first composite (stats.composites > 0), -1 if never
//   lostAfter1s      webglcontextlost events later than 1 s after navigation
//   maxGapMs         the longest gap between two requestAnimationFrame callbacks from load to the first composite
//                    (today's renderer must keep drawing while gf compiles; Done 2: under 1000)
//   compositesEnd    stats.composites at the end; fallback, the app's fallback reason if any
// EXTRA="--flag ..." adds Chrome flags.
import puppeteer from "puppeteer-core";
const [, , url, prof, secs = "120"] = process.argv;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 600000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", ...(process.env.EXTRA ? process.env.EXTRA.split(" ") : [])] });
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
const t0 = Date.now(); const T = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
await p.evaluateOnNewDocument(() => {
  const st = { lost: [], restored: [], maxGap: 0, lastRaf: 0, firstComp: -1, frames: 0 };
  globalThis.__k1468 = st;
  const g = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, o) {
    const c = g.call(this, t, o);
    if (c && /webgl/.test(t) && !this.__h) { this.__h = 1; this.addEventListener("webglcontextlost", () => { st.lost.push(performance.now()); console.log("CTXLOST"); }); this.addEventListener("webglcontextrestored", () => { st.restored.push(performance.now()); console.log("CTXRESTORED"); }); }
    return c;
  };
  const tick = (now) => {
    st.frames++;
    if (st.firstComp < 0) {
      if (st.lastRaf && document.readyState !== "loading") st.maxGap = Math.max(st.maxGap, now - st.lastRaf);
      const a = globalThis.__knotGf;
      if (a && a.stats && a.stats.composites > 0) st.firstComp = now;
    }
    st.lastRaf = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warn" || /CTX/.test(m.text())) console.log(T(), "console." + m.type(), m.text().slice(0, 300)); });
p.on("pageerror", (e) => console.log(T(), "pageerror", e.message.slice(0, 300)));
const tNav = Date.now();
await p.goto(url, { waitUntil: "load", timeout: 600000 });
console.log(T(), "load event");
let last = "";
let firstS = -1;
for (let i = 0; i < +secs; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const s = await p.evaluate(() => { const a = globalThis.__knotGf; const k = globalThis.__k1468; const st = a?.stats; return { c: st?.composites ?? null, f: st?.fallback ?? null, cmp: st?.compile ? JSON.stringify(st.compile) : null, lost: k.lost.length, gap: Math.round(k.maxGap), fc: k.firstComp }; }).catch((e) => ({ err: e.message }));
  const row = JSON.stringify({ c: s.c, f: s.f, cmp: s.cmp, lost: s.lost, err: s.err });
  if (row !== last) console.log(T(), row);
  last = row;
  if (firstS < 0 && s.c > 0) firstS = (Date.now() - tNav) / 1000;
  // stop early once gf has drawn for 15 s
  if (firstS > 0 && (Date.now() - tNav) / 1000 > firstS + 15 && !process.env.FULL) break;
}
const fin = await p.evaluate(() => { const k = globalThis.__k1468; const o = performance.timeOrigin; return { lost: k.lost, maxGap: Math.round(k.maxGap), fc: k.firstComp, c: globalThis.__knotGf?.stats?.composites ?? null, f: globalThis.__knotGf?.stats?.fallback ?? null, frames: k.frames }; });
console.log("SUMMARY " + JSON.stringify({ firstCompositeS: fin.fc > 0 ? +(fin.fc / 1000).toFixed(2) : -1, firstCompositePollS: firstS, lostAfter1s: fin.lost.filter((t) => t > 1000).length, lostAt: fin.lost.map((t) => +(t / 1000).toFixed(1)), maxGapMs: fin.maxGap, compositesEnd: fin.c, fallback: fin.f, frames: fin.frames }));
await b.close();
