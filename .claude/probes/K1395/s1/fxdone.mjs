// K1395 s1: per chain, the FX settle time (kcv[ch].fxDone, KGEOM G0.z) against the pinned FX clock, today vs gf.
//   node fxdone.mjs <base> <link> <today|gf> [frac=0.55]
// Prints the reveal duration, uKFx (through paint_state's own clock: paintClock - revealWall0), and per chain
// fxDone + revealSpan + whether fxHere holds, at the pinned reveal time.
import puppeteer from "puppeteer-core";
const [, , base, link, mode, fracS] = process.argv;
const frac = +(fracS ?? 0.55);
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=940,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} window.__knotGfOpts = Object.assign(window.__knotGfOpts ?? {}, { midReveal: true }); });
  await p.goto(`${base}/?${link}&snd=none&phw=0&fw=0${mode === "gf" ? "&rp=gf" : ""}`, { waitUntil: "load", timeout: 120000 });
  await p.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 600000, polling: 100 });
  await p.evaluate(() => window.__knotRenderer().revealPin(1e-4));
  await p.waitForFunction(() => window.__knotPerf?.().asleep === true, { timeout: 180000, polling: 250 }).catch(() => console.log("not asleep"));
  const dur = await p.evaluate(() => window.__knotReveal().duration);
  const at = async (t) => {
    await p.evaluate((t) => window.__knotRenderer().revealPin(t), t);
    await new Promise((r) => setTimeout(r, 800));
    return p.evaluate(() => {
      const R = window.__knotRenderer();
      const fx = R.revealFx;
      const fxNow = R.paintClock - fx.revealWall0;
      const rows = [];
      for (let ch = 0; ch < R.kcv.length; ch++) {
        const c = R.kcv[ch];
        if (!c) continue;
        let span = null;
        try { span = fx.paintScene.revealSpan(ch); } catch {}
        let now = null;
        try { now = fx.chainFxDone(ch); } catch {}
        rows.push([ch, +c.fxDone.toFixed(3), now === null ? null : +now.toFixed(3), span ? span.map((v) => +(+v).toFixed(3)) : null, fxNow < c.fxDone ? 1 : 0]);
      }
      return { fxNow: +fxNow.toFixed(3), fxEnd: fx.fxEnd, appearFx: fx.appearFx, look: R.style?.threadLook, seq: fx.revealAnim?.sequence ?? null, rows };
    });
  };
  const r = await at(frac * dur);
  console.log(JSON.stringify({ mode, dur, frac, fxNow: r.fxNow, fxEnd: r.fxEnd, appearFx: r.appearFx, look: r.look, seq: r.seq }));
  if (process.env.HEAD) process.exit(0);
  const live = r.rows.filter((x) => x[4]).length;
  const stale = r.rows.filter((x) => x[2] !== null && Math.abs(x[1] - x[2]) > 1e-3);
  console.log("chains", r.rows.length, "fxHere", live, "stale fxDone (kcv vs chainFxDone now)", stale.length);
  for (const x of r.rows.slice(0, 400)) console.log(JSON.stringify(x));
} finally { await b.close(); }
