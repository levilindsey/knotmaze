// K1460 s3: why a gfh=1 load never composites again after a redraw request (shot.mjs's 60 s wait). Prints the
// gf stats every 3 s, then asks for a redraw and prints the composite count.
//   node .claude/probes/K1460/gfhprobe.mjs <url> <profileDir>
import puppeteer from "puppeteer-core";
const [, , url, prof] = process.argv;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("pageerror", e.message));
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(m.type(), m.text().slice(0, 300)); });
await p.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: "load", timeout: 900000 });
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  const s = await p.evaluate(() => { const g = globalThis.__knotGf; return g ? { sw: g.stats.switchedMs, comp: g.stats.composites, home: globalThis.__knotGfHome, st: window.__knotPerf?.()?.state } : null; });
  console.log(i, JSON.stringify(s));
  if (s && s.sw > 0 && i > 3) {
    await p.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; });
    await new Promise((r) => setTimeout(r, 2000));
    console.log("after redraw", await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(globalThis.__knotGf.stats).filter(([k, v]) => typeof v !== "object")))));
    break;
  }
}
await b.close();
