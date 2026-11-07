// K1239: dump __knotFieldB cover as a PNG at the app_ab zoom.
// Usage: node cover_shot.mjs <base> <out.png> [family]
import puppeteer from "puppeteer-core";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const [, , base, out, fam = "def"] = process.argv;
const SEEDS = { muse: "3", def: "b", fat: "p9ar6", ring: "1rphqy1", user: "1471kin" };
const profileDir = join(tmpdir(), `k1239-covershot-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });
  const url = `${base}/?${SEEDS[fam]}&tlk=border&fbb=1&am=instant&snd=none&phy=0&fw=0&phw=0`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 60000 });
  await page.waitForFunction(() => window.__knotFieldB && window.__knotFieldB.stats.renders > 5, { timeout: 60000 });
  await sleep(1000);
  await page.mouse.move(800, 450);
  await page.keyboard.down("Control");
  for (let i = 0; i < 2; i++) { await page.mouse.wheel({ deltaY: -120 }); await sleep(60); }
  await page.keyboard.up("Control");
  await sleep(3500);
  const res = await page.evaluate(() => {
    const cov = window.__knotFieldB.readCover();
    if (!cov) return { err: "no cover" };
    const cv = document.createElement("canvas");
    cv.width = cov.w; cv.height = cov.h;
    const g = cv.getContext("2d");
    const img = g.createImageData(cov.w, cov.h);
    for (let i = 0; i < cov.w * cov.h; i++) { const v = cov.data[i]; img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    g.putImageData(img, 0, 0);
    return { url: cv.toDataURL("image/png"), w: cov.w, h: cov.h, stats: { ...window.__knotFieldB.stats }, view: window.__knotView?.() };
  });
  if (res.err) throw new Error(res.err);
  writeFileSync(out, Buffer.from(res.url.split(",")[1], "base64"));
  console.log(JSON.stringify({ w: res.w, h: res.h, stats: res.stats, view: res.view }));
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
