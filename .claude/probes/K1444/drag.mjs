// K1444: drag the panel's "Crossing fade" slider with the real mouse (as Levi does) and crop the maze after each stop.
// Usage: node drag.mjs <url> <outPrefix> <profileDir> <v1,v2,...> [waitMs]   env CLIP=x,y,w,h DSF=2 FULL=1
// K1461: each stop is dragged twice. A clip screenshot hides the panel's scrollbar (the panel
// widens 310 -> 320 px and the slider track shifts +10 px) until the next value change
// re-renders the panel, so a drag measured against the shifted track lands ~+0.13 high and
// the first drag (to 0) nets back to the start value. The first drag to a stop absorbs that
// shift and restores the layout; the second, on the settled track, is the measured one. The
// grab point is the value's own track position (the .tp-sldv_k element is the filled bar,
// whose centre is half the value's fraction), and the ends are dragged past the track so
// the slider's clamp lands exactly on 0 / 1.2 (dragcheck.mjs's recipe).
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
    const t = row.querySelector(".tp-sldv_t"), i = row.querySelector("input");
    const r = t?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height, box: i?.value } : "notrack";
  });
  let r = await rect();
  await new Promise((q) => setTimeout(q, 800));
  r = await rect();
  console.log("track", JSON.stringify(r));
  if (process.env.FULL) writeFileSync(`${pre}_full.jpg`, await page.screenshot({ type: "jpeg", quality: 70 }));
  await shot("start");
  const dragOnce = async (rr, v) => {
    const y = rr.y + rr.h / 2, x0 = rr.x + rr.w * (Number(rr.box) / 1.2);
    const x1 = Number(v) <= 0 ? rr.x - 20 : Number(v) >= 1.2 ? rr.x + rr.w + 20 : rr.x + rr.w * (Number(v) / 1.2);
    await page.mouse.move(x0, y); await page.mouse.down();
    for (let s = 1; s <= 12; s++) { await page.mouse.move(x0 + (x1 - x0) * s / 12, y); await new Promise((q) => setTimeout(q, 40)); }
    await page.mouse.up(); await page.mouse.move(c[0] - 30, c[1] - 30);
  };
  for (const v of vals.split(",")) {
    r = await rect();
    await dragOnce(r, v); // primer: absorbs the clip screenshot's track shift (see header)
    await new Promise((q) => setTimeout(q, 700));
    r = await rect();
    const r2 = await rect();
    if (r2 && Math.abs(r2.x - r.x) > 0.6) { await new Promise((q) => setTimeout(q, 700)); r = await rect(); } else r = r2 ?? r;
    await dragOnce(r, v); // the measured drag, on the settled track
    await new Promise((q) => setTimeout(q, 2500));
    const now = await page.evaluate(() => ({ search: location.search, home: globalThis.__knotGf?.home, fl: globalThis.__knotParams?.().fadeLength }));
    console.log("drag to", v, "box", (await rect()).box, JSON.stringify(now));
    await shot(`v${v}`);
  }
} finally { await browser.close(); }
