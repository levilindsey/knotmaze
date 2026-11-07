// K1040 S4c: flag-off whole-frame diff, this build vs master's build.
// Loads def and muse (seed links, phy=0 fw=0, as app_ab) on two bases,
// screenshots each, and diffs in-page (diff px, max channel delta, the
// 100 px cells with the most differing pixels).
// Usage: node ab_master.mjs <baseA> <baseB> <outDir>
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , baseA, baseB, outDir] = process.argv;
mkdirSync(outDir, { recursive: true });
const SEEDS = { muse: "3", def: "b" };
const profileDir = join(tmpdir(), `k1040-s4c-abm-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function shoot(base, fam) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });
  const url = `${base}/?${SEEDS[fam]}&tlk=border&am=instant&snd=none&phy=0&fw=0`;
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await sleep(15000);
  const buf = await page.screenshot({ type: "png" });
  await page.close();
  return buf;
}
const page = await browser.newPage();
async function decodePair(a, b) {
  return page.evaluate(async (x, y) => {
    const load = async (b64) => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const cv = document.createElement("canvas");
      cv.width = img.width; cv.height = img.height;
      const cx = cv.getContext("2d");
      cx.drawImage(img, 0, 0);
      return cx.getImageData(0, 0, img.width, img.height);
    };
    const da = await load(x), db = await load(y);
    let diff = 0, maxd = 0;
    const grid = new Map();
    for (let k = 0; k < da.data.length; k += 4) {
      const d = Math.max(Math.abs(da.data[k] - db.data[k]), Math.abs(da.data[k + 1] - db.data[k + 1]), Math.abs(da.data[k + 2] - db.data[k + 2]));
      if (d > 0) {
        diff++;
        if (d > maxd) maxd = d;
        const px = (k / 4) % da.width, py = Math.floor(k / 4 / da.width);
        const key = Math.floor(px / 100) + "," + Math.floor(py / 100);
        grid.set(key, (grid.get(key) ?? 0) + 1);
      }
    }
    return { w: da.width, h: da.height, diff, maxd, top: [...grid.entries()].sort((p, q) => q[1] - p[1]).slice(0, 6) };
  }, a.toString("base64"), b.toString("base64"));
}
for (const fam of ["def", "muse"]) {
  await shoot(baseA, fam);
  const a = await shoot(baseA, fam);
  const b = await shoot(baseB, fam);
  writeFileSync(join(outDir, `${fam}_a.png`), a);
  writeFileSync(join(outDir, `${fam}_b.png`), b);
  const r = await decodePair(a, b);
  console.log(`${fam}: ${r.w}x${r.h} diff px ${r.diff} max ${r.maxd}; top 100px cells ${JSON.stringify(r.top)}`);
}
await browser.close();
rmSync(profileDir, { recursive: true, force: true });
