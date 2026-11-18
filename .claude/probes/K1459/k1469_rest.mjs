import puppeteer from "puppeteer-core";
const [, , base, link, am, mode, out] = process.argv;
const browser = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false, protocolTimeout: 600000, userDataDir: process.env.PROFILE,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=560,680", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 520, height: 520, deviceScaleFactor: 1 });
  page.on("console", (m) => { const x = m.text(); if (/error|warn|fail|gf|shader|compile/i.test(x)) console.log("CON", m.type(), x.slice(0, 300)); });
  page.on("pageerror", (e) => console.log("PGERR", String(e).slice(0, 300)));
  const url = `${base}/?${link}${am !== "def" ? `&am=${am}` : ""}&snd=none&phw=0&fw=0${mode === "gf" ? "&rp=gf" : ""}`;
  await page.goto(url, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 12000));
  const st = await page.evaluate(() => ({ g: JSON.stringify(globalThis.__knotGf?.stats ?? null).slice(0, 600), rv: JSON.stringify(window.__knotReveal?.() ?? null).slice(0, 200) }));
  console.log(JSON.stringify(st));
  await page.screenshot({ path: out });
} finally { await browser.close(); }
