// K1369 s2: does a link's gf build use the slice pool? Reads __knotGf.stats.pool (slices of the last build; 0 = built
// whole on the gf worker), hardwareConcurrency and the scene's size, 8 s after load. node <this> [link=b.FMKB4DIQ] [base]
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
const profileDir = join(tmpdir(), `k1369s2-pool-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=520,900",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  await page.goto(`${process.argv[3] ?? "http://localhost:5294"}/?${process.argv[2] ?? "b.FMKB4DIQ"}&am=instant&snd=none&rp=gf`, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  await new Promise((r) => setTimeout(r, 8000));
  const res = await page.evaluate(() => {
    const s = globalThis.__knotGf?.stats;
    const r = window.__knotRenderer?.();
    return { pool: s?.pool, worker: s?.worker, workerBuilds: s?.workerBuilds, installs: s?.mainMs?.length,
      hc: navigator.hardwareConcurrency, junctionArms: r?.junctionArms?.length ?? null, chains: r?.chainSamples?.length ?? null,
      pts: r?.chainSamples?.reduce((p, c) => p + (c ? c.count : 0), 0) ?? null };
  });
  console.log(JSON.stringify(res));
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* in use */ }
}
