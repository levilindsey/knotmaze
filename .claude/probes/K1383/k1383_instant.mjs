// K1383 s1: am=instant under rp=gf: no reveal, so no reveal table, no reveal programs, depth 1 throughout.
import puppeteer from "puppeteer-core";
const base = process.argv[2] ?? "http://127.0.0.1:5383";
const link = process.argv[3] ?? "b.J";
const b = await puppeteer.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false,
  args: ["--no-first-run", "--window-position=2200,50", "--window-size=560,680", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 520, height: 520, deviceScaleFactor: 1 });
  const errs = [];
  p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${base}/?${link}&am=instant&snd=none&rp=gf`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 8000));
  const v = await p.evaluate(() => {
    const g = globalThis.__knotGf?.stats, rv = window.__knotReveal?.(), r = window.__knotRenderer?.();
    return { gf: !!g, builds: g?.build?.length ?? g?.builds ?? null, rvPasses: g?.rvPasses, rvBuilds: g?.rvMs?.length,
      reveal: rv && { mode: rv.mode, done: rv.done }, revealOn: r?.revealFx?.revealOn, fxLive: r?.revealFx?.fxLive };
  });
  console.log(JSON.stringify({ ...v, errs: errs.length }));
} finally { await b.close(); }
