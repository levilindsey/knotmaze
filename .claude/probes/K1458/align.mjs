// K1458: does gf's gap-window bake line up with the field's vertex table? The bake (GfGapTable.values) writes
// one entry per KEPT chain sample; the shader reads it at the field segment index (lkWinM / lkGwSlot). Per chain,
// the field's vertex count against the kept count, and the largest distance between field vertex k and kept
// sample k (after the open-chain offset the shader applies). Then, at fl, the bake along one crossing's window
// (winM, over chain, kept index, scan) with the true nearest distance to that over chain.
//   node align.mjs <devBase> <profileDir> [fl=1.2] [ci=5]   (Vite DEV server)
import puppeteer from "puppeteer-core";
const [, , base, profileDir, fl = "1.2", ciArg = "5"] = process.argv;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console", m.text().slice(0, 200)); });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&rp=gf&fl=${fl}`, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
  const out = await page.evaluate(async (ci0) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(20);
    globalThis.__knotGf.rebuild();
    await new Promise((r) => setTimeout(r, 2500));
    const T = globalThis.__knotGf.tables;
    const r = window.__knotRenderer();
    const keys = T ? Object.keys(T).map((k) => { const v = T[k]; return `${k}:${v?.length ?? typeof v}`; }) : null;
    const raw = T?.raw ?? T;
    const vx = raw?.vx, vy = raw?.vy, cV0 = raw?.cV0 ?? T?.cV0, cNV = raw?.cNV ?? T?.cNV;
    const rows = [];
    if (vx && cV0) {
      for (let ch = 0; ch < r.chainSamples.length; ch++) {
        const S = r.chainSamples[ch]; if (!S) continue;
        const xy = S.positions; const kp = [];
        let l = -1;
        for (let k = 0; k < S.count; k++) { if (l >= 0 && xy[2 * k] === xy[2 * l] && xy[2 * k + 1] === xy[2 * l + 1]) continue; kp.push(xy[2 * k], xy[2 * k + 1]); l = k; }
        const closed = r.kcv[ch].closed;
        const v0 = cV0[ch], nv = cNV ? cNV[ch] : -1;
        // the shader's open-chain offset: a leading extension vertex (flagged) shifts k by one
        let best = { off: 0, max: Infinity };
        for (const off of [0, 1, -1]) {
          let mx = 0, n = 0;
          for (let k = 0; k < kp.length / 2; k++) {
            const i = v0 + k + off; if (i < v0 || (nv > 0 && i >= v0 + nv)) continue;
            mx = Math.max(mx, Math.hypot(vx[i] - kp[2 * k], vy[i] - kp[2 * k + 1])); n++;
          }
          if (n && mx < best.max) best = { off, max: mx };
        }
        rows.push({ ch, closed, kept: kp.length / 2, count: S.count, nv, off: best.off, maxDev: best.max });
      }
    }
    return { keys, rows: rows.filter((x) => x.maxDev > 1e-4 || (x.nv > 0 && Math.abs(x.nv - x.kept) > 2)).slice(0, 20), nRows: rows.length, sample: rows.slice(0, 4) };
  }, Number(ciArg));
  console.log(JSON.stringify(out, null, 1));
} finally { await browser.close(); }
