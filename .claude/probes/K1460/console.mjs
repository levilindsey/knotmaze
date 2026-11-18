import puppeteer from "puppeteer-core";
const [, , url, prof] = process.argv;
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: prof, protocolTimeout: 600000,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=1000,700", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
const p = await b.newPage();
p.on("console", (m) => { const t = m.text(); if (/error|ERROR|warn|fail/i.test(t) || m.type() !== "log") console.log(m.type(), t.slice(0, 1500)); });
p.on("pageerror", (e) => console.log("pageerror", e.message));
await p.goto(url);
for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 3000)); const c = await p.evaluate(() => globalThis.__knotGf?.stats?.composites ?? -1); if (c > 0) { console.log("composites", c, "at", i * 3, "s"); break; } }
await b.close();
