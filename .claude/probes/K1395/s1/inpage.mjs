// K1395 s1: today's ribbon layer and gf's pass on ONE page and one pinned state. rp=gf with midReveal and
// gate:false (main's ribbon update runs every frame, so today's hidden layer stays current); after gf's shot,
// lock today's layers visible and gf's container hidden, and shoot again. A difference between the two shots
// is gf's drawing of the same state, not a load, clock or settle difference. (Today's fan layer is nulled
// under gf, so junction fans are missing from the today shot.)
//   node inpage.mjs <base> <link> <outPrefix> [fracs=0.25,0.4]
// Run under scripts/perf_lock.ps1. Outputs <outPrefix>_<frac>_{gf,today}.png.
import puppeteer from "puppeteer-core";
const [, , base, link, out, fracS] = process.argv;
const FR = (fracS ?? "0.25,0.4").split(",").map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=940,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} window.__knotGfOpts = Object.assign(window.__knotGfOpts ?? {}, { midReveal: true, gate: false }); });
  p.on("pageerror", (e) => console.log("pageerror", e.message.slice(0, 200)));
  await p.goto(`${base}/?${link}&snd=none&phw=0&fw=0&rp=gf`, { waitUntil: "load", timeout: 120000 });
  await p.bringToFront();
  await p.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 600000, polling: 100 });
  const dur = await p.evaluate(() => window.__knotReveal().duration);
  await p.evaluate(() => window.__knotRenderer().revealPin(1e-4));
  let stable = 0, last = "";
  for (let k = 0; k < 600 && stable < 10; k++) {
    const s = await p.evaluate(() => { const g = globalThis.__knotGf?.stats; return g ? `${g.compileIssued}/${g.compileReady}/${g.switchedMs > 0}` : "none"; });
    const [i, r, sw] = s.split("/");
    if (sw === "true" && i === r && +i > 0 && s === last) stable++; else stable = 0;
    last = s;
    await sleep(1000);
  }
  console.log("gf", last);
  await p.waitForFunction(() => window.__knotPerf?.().asleep === true, { timeout: 180000, polling: 250 }).catch(() => console.log("not asleep"));
  await p.evaluate(() => window.__knotLoop({ continuous: true }));
  const kids = await p.evaluate(() => window.__knotRenderer().root.children.map((c, i) => `${i}:${c.constructor?.name}:${c.label ?? ""}:${c.visible}`));
  console.log("root children", kids.join(" | "));
  for (const fr of FR) {
    await p.evaluate(() => {
      const ch = window.__knotRenderer().root.children;
      for (const c of ch) if (Object.prototype.hasOwnProperty.call(c, "visible")) delete c.visible;
      if (ch[2] && window.__k1395locked) { ch[0].visible = false; if (ch[1]) ch[1].visible = false; ch[2].visible = true; }
    });
    await sleep(800);
    await p.evaluate((t) => window.__knotRenderer().revealPin(t), Math.max(fr * dur, 1e-4));
    await sleep(1500);
    // gf's own frame decides visibility: today's layers hidden, its container shown
    await p.screenshot({ path: `${out}_${fr}_gf.png` });
    const vis = await p.evaluate(() => {
      const R = window.__knotRenderer();
      const ch = R.root.children;
      const lock = (c, v) => { c.visible = v; Object.defineProperty(c, "visible", { configurable: true, get: () => v, set: () => {} }); };
      // the two layers gf hides are children 0 and 1; gf's container sits at index 2
      lock(ch[0], true);
      if (ch[1]) lock(ch[1], true);
      if (ch[2]) lock(ch[2], false);
      window.__k1395locked = true;
      return ch.map((c, i) => `${i}:${c.constructor?.name}`).join(" ");
    });
    await sleep(1500);
    await p.screenshot({ path: `${out}_${fr}_today.png` });
    console.log("frac", fr, "t", (fr * dur).toFixed(3), vis);
  }
} finally { await b.close(); }
