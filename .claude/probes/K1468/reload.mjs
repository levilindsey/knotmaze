// A warm profile, one tab, N reloads: does gf come back every time, and what does the loss guard count?
// node reload.mjs <url> <profileDir> [reloads=3] [waitSec=25]
import puppeteer from "puppeteer-core";
const [, , url, prof, n = "3", wait = "25"] = process.argv;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 600000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", ...(process.env.EXTRA ? process.env.EXTRA.split(" ") : [])] });
const p = await b.newPage();
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
await p.evaluateOnNewDocument(() => {
  globalThis.__lost = [];
  const g = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, o) {
    const c = g.call(this, t, o);
    if (c && /webgl/.test(t) && !this.__h) { this.__h = 1; this.addEventListener("webglcontextlost", () => globalThis.__lost.push([Math.round(performance.now()), this.width, this.height, this.isConnected])); }
    return c;
  };
});
p.on("console", (m) => { if (m.type() === "warn" || m.type() === "error") console.log("  console." + m.type(), m.text().slice(0, 200)); });
const read = () => p.evaluate(() => { const a = globalThis.__knotGf; return { c: a ? a.stats.composites : -1, fb: a ? a.stats.fallback : "no app", losses: sessionStorage.getItem("knotmaze.gfLosses"), lost: globalThis.__lost }; });
for (let i = 0; i <= +n; i++) {
  if (i === 0) await p.goto(url, { waitUntil: "load", timeout: 600000 }); else await p.reload({ waitUntil: "load", timeout: 600000 });
  await new Promise((r) => setTimeout(r, +wait * 1000 - 5000));
  const a = await read(); await new Promise((r) => setTimeout(r, 5000)); const z = await read();
  console.log(i === 0 ? "load  " : "reload", i, "composites", a.c, "->", z.c, "(" + ((z.c - a.c) / 5).toFixed(1) + "/s)", "fallback", JSON.stringify(z.fb), "gfLosses", z.losses, "lost", JSON.stringify(z.lost));
}
await p.screenshot({ path: prof + "_reload.png" });
await b.close();
