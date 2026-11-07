// K1040 S4b: master's border ink beside the fieldBand flag's, in the app, on
// one geometry: each family's link loads twice, `&phy=0&fw=0` (no physics, no
// flow: the same layout every load) with K83's paint pins, zoomed two ctrl +
// wheel steps at the centre; flag off (master's pixels: the flag off changes
// none) and flag on. A sheet page (2D canvas: the WebGL canvas reads back
// blank, K653) diffs the two shots, picks the N windows with the most
// differing pixels (non-maximum suppressed) and draws rows master | new |
// difference (red: new inks darker, blue: lighter, x4) at zoom 4.
// Usage: node app_ab.mjs <base> <outDir> [family,...] [n=6] [win=56]
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , base, outDir, only, nArg, winArg] = process.argv;
const N = Number(nArg ?? 6), WIN = Number(winArg ?? 56);
mkdirSync(outDir, { recursive: true });
const SEEDS = { muse: "3", def: "b", fat: "p9ar6", ring: "1rphqy1", user: "1471kin" };
const fams = only ? only.split(",") : ["def", "muse", "user"];
const profileDir = join(tmpdir(), `k1040-s4b-appab-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: [
    "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = [];
async function shoot(fam, on) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });
  const logs = [];
  page.on("console", (m) => { if (m.type() === "warning" || m.type() === "error") logs.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => logs.push(`PAGEERROR: ${e.message}`));
  // Env EXTRA appends link keys (`&phw=0`: the in-thread host); CONTROL=1 loads
  // the flag off in both arms (the same-build control the K83 recipe runs first).
  // ARM_A / ARM_B: each arm's own keys (default "" and "&fbb=1"; `&lbi=1` is
  // K868's label app, master's other GPU ink).
  const keys = on && !process.env.CONTROL ? (process.env.ARM_B ?? "&fbb=1") : (process.env.ARM_A ?? "");
  const url = `${base}/?${SEEDS[fam]}&tlk=border${keys}&am=instant&snd=none&phy=0&fw=0${process.env.EXTRA ?? ""}`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 60000 });
  await sleep(1500);
  await page.evaluate(() => {
    const r = window.__knotRenderer?.();
    if (r) { r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; }
    window.__knotLoop?.({ continuous: true });
  });
  await page.mouse.move(800, 450);
  await page.keyboard.down("Control");
  for (let i = 0; i < 2; i++) { await page.mouse.wheel({ deltaY: -120 }); await sleep(60); }
  await page.keyboard.up("Control");
  await sleep(3500);
  const info = await page.evaluate(async () => {
    const divs = [...document.querySelectorAll("div")].map((d) => d.textContent ?? "");
    const fb = window.__knotFieldB;
    let dump = null;
    try { const d = await window.__knotPhysDump?.({}); dump = d ? JSON.parse(JSON.stringify(d)) : null; } catch (e) { dump = String(e); }
    return { stamp: divs.find((t) => /^P\d/.test(t)) ?? "STAMP MISSING", search: location.search, view: window.__knotView?.(), fieldB: fb ? { ...fb.stats } : null, labelInk: window.__knotRenderer?.()?.labelInk ?? null, dump };
  });
  const png = await page.screenshot({ encoding: "base64" });
  await page.close();
  return { url, png, info, logs: logs.slice(0, 8) };
}
try {
  for (const fam of fams) {
    const off = await shoot(fam, false);
    const on = await shoot(fam, true);
    writeFileSync(join(outDir, `app_${fam}_off.png`), Buffer.from(off.png, "base64"));
    writeFileSync(join(outDir, `app_${fam}_on.png`), Buffer.from(on.png, "base64"));
    const sp = await browser.newPage();
    await sp.setContent("<!doctype html><body style='margin:0;background:#3c3c3c'></body>");
    const res = await sp.evaluate(async (a, b, N, WIN) => {
      const load = (s) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + s; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const W = ia.width, H = ia.height;
      const px = (im) => { const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d"); g.drawImage(im, 0, 0); return g.getImageData(0, 0, W, H).data; };
      const A = px(ia), B = px(ib);
      const lum = (d, o) => 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2];
      const diff = new Float32Array(W * H);
      let nDiff = 0, maxD = 0;
      for (let k = 0; k < W * H; k++) { const d = lum(B, 4 * k) - lum(A, 4 * k); diff[k] = d; if (Math.abs(d) > 8) nDiff++; if (Math.abs(d) > maxD) maxD = Math.abs(d); }
      // Window scores on a WIN/2 grid: differing pixels (|d| > 8) per window.
      const step = WIN >> 1, cand = [];
      for (let y = 0; y + WIN <= H; y += step)
        for (let x = 0; x + WIN <= W; x += step) {
          let s = 0;
          for (let j = 0; j < WIN; j++) for (let i = 0; i < WIN; i++) if (Math.abs(diff[(y + j) * W + x + i]) > 8) s++;
          if (s > 0) cand.push([s, x, y]);
        }
      cand.sort((p, q) => q[0] - p[0]);
      const pick = [];
      for (const c of cand) { if (pick.length >= N) break; if (pick.every((p) => Math.abs(p[1] - c[1]) >= WIN || Math.abs(p[2] - c[2]) >= WIN)) pick.push(c); }
      const Z = 4, G = 6, cw = WIN * Z, SW = 3 * cw + 4 * G, SH = Math.max(1, pick.length) * (cw + G) + G;
      const cv = document.createElement("canvas"); cv.width = SW; cv.height = SH;
      const g = cv.getContext("2d"); g.fillStyle = "#3c3c3c"; g.fillRect(0, 0, SW, SH); g.imageSmoothingEnabled = false;
      const dimg = g.createImageData(WIN, WIN);
      const tmp = document.createElement("canvas"); tmp.width = WIN; tmp.height = WIN; const tg = tmp.getContext("2d");
      pick.forEach(([s, x, y], row) => {
        const y0 = G + row * (cw + G);
        g.drawImage(ia, x, y, WIN, WIN, G, y0, cw, cw);
        g.drawImage(ib, x, y, WIN, WIN, 2 * G + cw, y0, cw, cw);
        for (let j = 0; j < WIN; j++) for (let i = 0; i < WIN; i++) {
          const d = diff[(y + j) * W + x + i], m = Math.min(255, Math.abs(d) * 4), o = 4 * (j * WIN + i);
          // d < 0: new is darker (inks more): red; d > 0: lighter: blue.
          dimg.data[o] = d < 0 ? 255 : 255 - m; dimg.data[o + 1] = 255 - m; dimg.data[o + 2] = d > 0 ? 255 : 255 - m; dimg.data[o + 3] = 255;
        }
        tg.putImageData(dimg, 0, 0);
        g.drawImage(tmp, 0, 0, WIN, WIN, 3 * G + 2 * cw, y0, cw, cw);
      });
      return { url: cv.toDataURL("image/png"), W, H, nDiff, maxD, sites: pick.map(([s, x, y]) => ({ s, x, y })) };
    }, off.png, on.png, N, WIN);
    await sp.close();
    writeFileSync(join(outDir, `app_${fam}_master_new.png`), Buffer.from(res.url.split(",")[1], "base64"));
    const row = { fam, off: { url: off.url, ...off.info, logs: off.logs }, on: { url: on.url, ...on.info, logs: on.logs }, W: res.W, H: res.H, nDiff: res.nDiff, maxD: res.maxD, sites: res.sites };
    report.push(row);
    console.log(JSON.stringify({ fam, control: !!process.env.CONTROL, extra: process.env.EXTRA ?? "", nDiff: res.nDiff, maxD: res.maxD, sites: res.sites, offStamp: off.info.stamp, onStamp: on.info.stamp, onFieldB: on.info.fieldB, offLabelInk: off.info.labelInk, onLabelInk: on.info.labelInk, offDump: off.info.dump, onDump: on.info.dump, sameView: JSON.stringify(off.info.view) === JSON.stringify(on.info.view), logs: [...off.logs, ...on.logs].slice(0, 6) }));
  }
} finally {
  writeFileSync(join(outDir, "app_ab.json"), JSON.stringify(report, null, 1));
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
