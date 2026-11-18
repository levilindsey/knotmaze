// K1472 s3: at a pinned reveal time, today's per-sample reveal mask/width (widthMulFor) for the samples
// inside a screen box, on either renderer (rp=gf pages call widthMulFor directly).
//   node maskprobe.mjs <base> <link> <today|gf> <frac> <x0,y0,x1,y1> <out.json>
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , base, link, mode, frac, boxS, out] = process.argv;
const box = boxS.split(",").map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: process.env.PROFILE, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=940,1060", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"] });
try {
  const p = await b.newPage();
  await p.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
  await p.evaluateOnNewDocument(() => { try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} window.__knotGfOpts = Object.assign(window.__knotGfOpts ?? {}, { midReveal: true }); });
  await p.goto(`${base}/?${link}&snd=none&phw=0&fw=0${mode === "gf" ? "&rp=gf" : ""}`, { waitUntil: "load", timeout: 120000 });
  await p.bringToFront();
  await p.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 600000, polling: 100 });
  const dur = await p.evaluate(() => window.__knotReveal().duration);
  await p.evaluate(() => window.__knotRenderer().revealPin(1e-4));
  await p.waitForFunction(() => window.__knotPerf?.().asleep === true, { timeout: 180000, polling: 250 }).catch(() => {});
  await sleep(1000);
  const t = +frac * dur;
  await p.evaluate((t) => window.__knotRenderer().revealPin(t), t);
  await sleep(2500);
  const res = await p.evaluate((box) => {
    const r = window.__knotRenderer();
    const R = r.revealFx;
    const wt = r.root.worldTransform;
    const canvas = document.querySelector("canvas").getBoundingClientRect();
    const res = R.r ? null : null;
    const rows = [];
    for (let ch = 0; ch < r.chainSamples.length; ch++) {
      const s = r.chainSamples[ch]; if (!s) continue;
      const w = R.widthMulFor(ch, s); const m = R.revealMask[ch];
      const P = s.positions; let hit = [];
      for (let k = 0; k < s.count; k++) {
        const x = wt.a * P[2 * k] + wt.c * P[2 * k + 1] + wt.tx + canvas.left; const y = wt.b * P[2 * k] + wt.d * P[2 * k + 1] + wt.ty + canvas.top;
        if (x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3]) hit.push([k, +x.toFixed(1), +y.toFixed(1), m ? +m[k].toFixed(3) : 1, w ? +w[k].toFixed(3) : 1]);
      }
      if (hit.length) rows.push({ ch, count: s.count, fxDone: r.kcv[ch].fxDone, hit });
    }
    return { rows, wt: [wt.a, wt.b, wt.c, wt.d, wt.tx, wt.ty] };
  }, box);
  writeFileSync(out, JSON.stringify({ t, dur, ...res }, null, 1));
  for (const r of res.rows) console.log(`ch${r.ch} n=${r.count} fxDone=${r.fxDone.toFixed(2)} ` + r.hit.map((h) => `${h[0]}:${h[3]}/${h[4]}`).join(" "));
  console.log("wt", res.wt.map((v) => v.toFixed(3)).join(","));
} finally { await b.close(); }
