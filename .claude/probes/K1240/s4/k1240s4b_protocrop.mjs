// K1240 S4b: the prototype at the app's crop spots, next to the app's
// rp=outline crop (k1240s4_crops' <spot>_outline.png), to tell whether a
// mark in the app's column is the prototype's too.
//   node .claude/probes/K1240/s4/k1240s4b_protocrop.mjs <base> <cropsDir>
// The prototype page (proto/index.html) fetches ../out/scenes/<scene>.json:
// copy .claude/probes/K868/scenes/def.json there first (the same state the
// crops tool steps to, hash 910ff135). Its crop (&cx&cy&zoom) centres the
// world point on the 1240x900 canvas and zooms the scene camera's scale by
// zoom; zoom = 150 / pxPerUnit matches the crops tool's 2.0 world units
// over 300 CSS px. Writes <cropsDir>/<spot>_proto.png and
// <cropsDir>/<spot>_proto_vs_app.png (prototype | app outline).
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , base, cropsDir] = process.argv;
const CLIP = 300, SPAN = 2.0;
const SPOTS = [["def_j16", 4.190, 34.688], ["def_j14", 3.421, 33.823], ["def_j156", 13.937, 20.813], ["def_j81", 13.219, 21.695]];
const scene = JSON.parse(readFileSync(".claude/probes/K1240/out/scenes/def.json", "utf8"));
const ppu = scene.camera.pxPerUnit;
const [vw, vh] = scene.camera.viewport;
const zoom = CLIP / SPAN / ppu;

const profileDir = join(tmpdir(), `k1240s4b-protocrop-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: [
    "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", "--window-size=1360,1040",
    "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
  ],
});
try {
  for (const [spot, x, y] of SPOTS) {
    const page = await browser.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 200)));
    await page.setViewport({ width: vw, height: vh, deviceScaleFactor: 2 });
    await page.goto(`${base}/.claude/probes/K1240/proto/index.html?scene=def&cx=${x}&cy=${y}&zoom=${zoom}`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => !!window.__k1240, { timeout: 300000, polling: 250 });
    const res = await page.evaluate(() => window.__k1240.error ?? "ok");
    // The dev server's HTML plugin injects the app's inline loader (K313)
    // into every page, and nothing dismisses it here: show canvas#c alone.
    await page.addStyleTag({ content: "body * { visibility: hidden !important; } #c { visibility: visible !important; }" });
    const file = join(cropsDir, `${spot}_proto.png`);
    writeFileSync(file, await page.screenshot({ clip: { x: vw / 2 - CLIP / 2, y: vh / 2 - CLIP / 2, width: CLIP, height: CLIP } }));
    console.log(`${spot}: ${res}, errors ${errs.length} ${errs.join(" | ")}`);
    await page.close();
  }
  const page = await browser.newPage();
  await page.setViewport({ width: 2 * CLIP + 3 * 6, height: 400, deviceScaleFactor: 2 });
  const img = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
  const css = `body{margin:0;background:#777;font:12px monospace;color:#fff} .r{padding:3px 6px} .c{display:flex;gap:6px} img{width:${CLIP}px;height:${CLIP}px;display:block}`;
  for (const [spot] of SPOTS) {
    await page.setContent(`<style>${css}</style><div class="r"><div>${spot}: prototype | app rp=outline</div><div class="c"><img src="${img(join(cropsDir, `${spot}_proto.png`))}"><img src="${img(join(cropsDir, `${spot}_outline.png`))}"></div></div>`);
    const el = await page.$(".r");
    writeFileSync(join(cropsDir, `${spot}_proto_vs_app.png`), await el.screenshot());
  }
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
