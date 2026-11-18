// K1444: drag the panel's "Crossing fade" slider with the real mouse (as Levi does) and crop the maze after each stop.
// Usage: node drag.mjs <url> <outPrefix> <profileDir> <v1,v2,...> [waitMs]   env CLIP=x,y,w,h DSF=2 FULL=1
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , url, pre, profileDir, vals, waitMs = "7000"] = process.argv;
const c = (process.env.CLIP ?? "440,300,360,260").split(",").map(Number);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: Number(process.env.DSF ?? 2) });
  await page.goto(url, { waitUntil: "load", timeout: 400000 });
  await new Promise((r) => setTimeout(r, Number(waitMs)));
  const shot = async (tag) => writeFileSync(`${pre}_${tag}.png`, await page.screenshot({ type: "png", clip: { x: c[0], y: c[1], width: c[2], height: c[3] } }));
  const rect = async () => page.evaluate(() => {
    const lab = [...document.querySelectorAll(".tp-lblv_l")].find((e) => e.textContent.startsWith("Crossing fade"));
    if (!lab) return null;
    const row = lab.closest(".tp-lblv");
    for (let f = row; f; f = f.parentElement) if (f.classList?.contains("tp-fldv") && !f.classList.contains("tp-fldv-expanded")) f.querySelector(".tp-fldv_b")?.click();
    row.scrollIntoView({ block: "center" });
    const t = row.querySelector(".tp-sldv_t"), k = row.querySelector(".tp-sldv_k"), i = row.querySelector("input");
    const r = t?.getBoundingClientRect(), kr = k?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height, kx: kr ? kr.x + kr.width / 2 : null, box: i?.value } : "notrack";
  });
  let r = await rect();
  await new Promise((q) => setTimeout(q, 800));
  r = await rect();
  console.log("track", JSON.stringify(r));
  if (process.env.FULL) writeFileSync(`${pre}_full.jpg`, await page.screenshot({ type: "jpeg", quality: 70 }));
  await shot("start");
  for (const v of vals.split(",")) {
    r = await rect();
    const y = r.y + r.h / 2, x0 = r.kx ?? r.x + r.w * (Number(r.box) / 1.2), x1 = r.x + 1 + (r.w - 2) * (Number(v) / 1.2);
    await page.mouse.move(x0, y); await page.mouse.down();
    for (let s = 1; s <= 12; s++) { await page.mouse.move(x0 + (x1 - x0) * s / 12, y); await new Promise((q) => setTimeout(q, 40)); }
    await page.mouse.up(); await page.mouse.move(c[0] - 30, c[1] - 30);
    await new Promise((q) => setTimeout(q, 2500));
    const now = await page.evaluate(() => ({ search: location.search, home: globalThis.__knotGf?.home, fl: globalThis.__knotParams?.().fadeLength }));
    console.log("drag to", v, "box", (await rect()).box, JSON.stringify(now));
    await shot(`v${v}`);
  }
} finally { await browser.close(); }
