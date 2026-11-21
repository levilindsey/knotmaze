// K1537 (27G): count px over tol between two saved shots, inside a box
// and outside it, decoding in a blank Chrome page (the repro's in-page
// recipe, minus the panel lookup: cross-load pairs exclude the panel's
// device-x range and the bottom stamp strip instead).
//   node .claude/probes/K1537/cmp.mjs <a.png> <b.png> <profileDir> [x0 y0 x1 y1] [tol]
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
const [, , aPath, bPath, profileDir, x0 = "740", y0 = "74", x1 = "830", y1 = "164", tol = "6"] = process.argv;
const box = { x0: +x0, y0: +y0, x1: +x1, y1: +y1 };
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=800,600",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.goto("about:blank");
  const r = await page.evaluate(async (a, b, bx, t) => {
    const load = (s) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + s; });
    const img = async (s) => { const im = await load(s); const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height; const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0); return cx.getImageData(0, 0, im.width, im.height); };
    const A = await img(a), B = await img(b);
    let inN = 0, outN = 0, maxIn = 0, maxOut = 0, bb = null;
    for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
      if (x >= 2500) continue; // the panel (cross-load pairs only)
      if (y > A.height - 80) continue; // the stamp strip
      const o = (y * A.width + x) * 4;
      const d = Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2]));
      if (d <= t) continue;
      const inside = x >= bx.x0 && x <= bx.x1 && y >= bx.y0 && y <= bx.y1;
      if (inside) { inN++; if (d > maxIn) maxIn = d; }
      else { outN++; if (d > maxOut) maxOut = d; if (!bb) bb = [x, y, x, y]; else { bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); } }
    }
    return { inN, outN, maxIn, maxOut, outBox: bb };
  }, readFileSync(aPath).toString("base64"), readFileSync(bPath).toString("base64"), box, +tol);
  console.log(`${aPath} vs ${bPath}: in ${r.inN} (max ${r.maxIn}) out ${r.outN} (max ${r.maxOut}) outBox ${JSON.stringify(r.outBox)}`);
} finally { await browser.close().catch(() => {}); }
