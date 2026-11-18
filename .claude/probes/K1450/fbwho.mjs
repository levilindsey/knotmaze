// K1450 diagnosis: who leaves a framebuffer bound when gf's composite (a Pixi RenderContainer) runs?
// Wraps bindFramebuffer before load; each non-null FRAMEBUFFER/DRAW bind records its caller's stack in
// globalThis.__fbWho (a null bind clears it). Needs the build's temporary __fbWhoN counter in gf_app's
// render callback (K1450 diagnosis only).
//   node fbwho.mjs <url> <profileDir> [waitMs]
import puppeteer from "puppeteer-core";
const [, , url, profileDir, waitArg = "6000"] = process.argv;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    const P = WebGL2RenderingContext.prototype;
    const orig = P.bindFramebuffer;
    P.bindFramebuffer = function (t, fb) {
      if (t !== this.READ_FRAMEBUFFER) {
        if (fb) {
          const s = (new Error().stack ?? "").split("\n").slice(2, 7).map((l) => l.trim().replace(/https?:\/\/[^/]+\/assets\//, "")).join(" < ");
          globalThis.__fbWho = s;
        } else globalThis.__fbWho = null;
      }
      return orig.call(this, t, fb);
    };
  });
  await page.goto(url, { waitUntil: "load", timeout: 600000 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.passes ?? 0) > 0, { timeout: 600000, polling: 200 });
  await new Promise((r) => setTimeout(r, Number(waitArg)));
  const out = await page.evaluate(() => ({ who: globalThis.__fbWhoN, s: { passes: globalThis.__knotGf.stats.passes, composites: globalThis.__knotGf.stats.composites, rcFb: globalThis.__knotGf.stats.rcFb } }));
  console.log(JSON.stringify(out, null, 1));
} finally {
  await browser.close();
}
