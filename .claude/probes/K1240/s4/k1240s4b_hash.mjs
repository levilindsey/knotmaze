// K1240 S4b: does a link flag move the physics? Loads each URL <runs> times,
// steps to sim 40 with __knotStepUntil (as k1240s4_crops does) and prints
// the physics hash, so a look flag (rp=outline) can be checked against the
// same link without it.
//   node .claude/probes/K1240/s4/k1240s4b_hash.mjs <runs> <url>...
import puppeteer from "puppeteer-core";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , runsArg, ...urls] = process.argv;
const runs = Number(runsArg);
const dir = join(tmpdir(), `k1240s4b-hash-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: dir,
  args: [
    "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=1360,1040",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ],
});
try {
  for (let r = 0; r < runs; r++) {
    for (const url of urls) {
      const page = await browser.newPage();
      await page.setViewport({ width: 1240, height: 900, deviceScaleFactor: 2 });
      await page.goto(url, { waitUntil: "load", timeout: 120000 });
      await page.waitForFunction(() => typeof window.__knotStepUntil === "function" && !!window.__knotPS?.(), { timeout: 120000, polling: 100 });
      const h = await page.evaluate(async () => {
        const t = await window.__knotStepUntil(40);
        const d = await window.__knotPhysDump();
        return `${d.hashes.all} at sim ${t}`;
      });
      console.log(`run ${r}: ${h}  ${url}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}
