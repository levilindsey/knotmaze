// K1537 (27G): 4x side-by-side crop of two saved shots around a device-px
// centre, plus RGB samples at named points.
//   node .claude/probes/K1537/crop.mjs <a.png> <b.png> <profileDir> <out.png> [cx cy half]
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync } from "node:fs";
const [, , aPath, bPath, profileDir, outPath, cx = "785", cy = "119", half = "90"] = process.argv;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-position=2200,50", "--window-size=800,600",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.goto("about:blank");
  const r = await page.evaluate(async (a, b, ccx, ccy, hh) => {
    const load = (s) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + s; });
    const A = await load(a), B = await load(b);
    const S = 4, cw = hh * 2;
    const cv = document.createElement("canvas"); cv.width = cw * S * 2 + 8; cv.height = cw * S;
    const cx2 = cv.getContext("2d"); cx2.imageSmoothingEnabled = false; cx2.fillStyle = "#888"; cx2.fillRect(0, 0, cv.width, cv.height);
    cx2.drawImage(A, ccx - hh, ccy - hh, cw, cw, 0, 0, cw * S, cw * S);
    cx2.drawImage(B, ccx - hh, ccy - hh, cw, cw, cw * S + 8, 0, cw * S, cw * S);
    const px = (im, x, y) => { const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(im, 0, 0); return [...g.getImageData(x, y, 1, 1).data]; };
    const pts = [[ccx, ccy], [ccx - 300, ccy - 60], [ccx + 200, ccy + 300], [100, 100], [1500, 800]];
    return { url: cv.toDataURL("image/png"), samples: pts.map(([x, y]) => ({ at: [x, y], a: px(A, x, y), b: px(B, x, y) })) };
  }, readFileSync(aPath).toString("base64"), readFileSync(bPath).toString("base64"), +cx, +cy, +half);
  writeFileSync(outPath, Buffer.from(r.url.split(",")[1], "base64"));
  console.log(JSON.stringify(r.samples));
  console.log("wrote " + outPath);
} finally { await browser.close().catch(() => {}); }
