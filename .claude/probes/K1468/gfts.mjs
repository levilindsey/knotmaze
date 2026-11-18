// gf stats time series on one load: node gfts.mjs <url> <profileDir> [seconds=120]
// Prints every console message and page error with its time, a row each second (app identity, composites, passes,
// rebuilds, fallback, the compile queue), and WebGL context loss / restore events.
import puppeteer from "puppeteer-core";
const [, , url, prof, secs = "120"] = process.argv;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 600000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", ...(process.env.EXTRA ? process.env.EXTRA.split(" ") : [])] });
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
const t0 = Date.now(); const T = () => ((Date.now() - t0) / 1000).toFixed(1).padStart(6);
await p.evaluateOnNewDocument(() => {
  const g = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, o) {
    const c = g.call(this, t, o);
    if (c && /webgl/.test(t) && !this.__h) { this.__h = 1; this.addEventListener("webglcontextlost", () => console.log("CTXLOST")); this.addEventListener("webglcontextrestored", () => console.log("CTXRESTORED")); }
    return c;
  };
  let id = 0; const seen = new WeakMap();
  globalThis.__gfts = () => { const a = globalThis.__knotGf; if (!a) return null; if (!seen.has(a)) seen.set(a, ++id); const s = a.stats;
    return { app: seen.get(a), c: s.composites, p: s.passes, r: s.rebuilds, f: s.fallback, q: s.compile ?? a.compile ?? null, keys: Object.keys(s).filter((k) => /comp|queue|wait|ready/i.test(k)).map((k) => k + "=" + JSON.stringify(s[k]).slice(0, 60)).join(" "), search: location.search }; };
});
p.on("console", (m) => console.log(T(), "console." + m.type(), m.text().slice(0, 400)));
p.on("pageerror", (e) => console.log(T(), "pageerror", e.message.slice(0, 400)));
p.on("framenavigated", (f) => { if (f === p.mainFrame()) console.log(T(), "navigated", f.url().slice(-70)); });
await p.goto(url, { waitUntil: "load", timeout: 600000 });
console.log(T(), "load event");
let last = "";
for (let i = 0; i < +secs; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const s = await p.evaluate(() => globalThis.__gfts()).catch((e) => ({ err: e.message }));
  const row = JSON.stringify(s);
  if (row !== last || i % 15 === 0) console.log(T(), row);
  last = row;
}
await p.screenshot({ path: prof + "_end.png" });
await b.close();
