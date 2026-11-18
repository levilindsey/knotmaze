// K1444: does the panel's "Crossing fade" slider change rp=gf's picture live? Loads a link, crops a region,
// types each value into the slider's number box (a real key sequence), crops again.
// Usage: node slider.mjs <url> <outPrefix> <profileDir> <v1,v2,...>   env CLIP=x,y,w,h DSF=2
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , url, pre, profileDir, vals] = process.argv;
const c = (process.env.CLIP ?? "640,300,360,260").split(",").map(Number);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: Number(process.env.DSF ?? 2) });
  await page.goto(url, { waitUntil: "load", timeout: 400000 });
  await new Promise((r) => setTimeout(r, 7000));
  const shot = async (tag) => writeFileSync(`${pre}_${tag}.png`, await page.screenshot({ type: "png", clip: { x: c[0], y: c[1], width: c[2], height: c[3] } }));
  await shot("start");
  for (const v of vals.split(",")) {
    const found = await page.evaluate(() => {
      const lab = [...document.querySelectorAll(".tp-lblv_l")].find((e) => e.textContent.startsWith("Crossing fade"));
      if (!lab) return null;
      let row = lab.parentElement; while (row && !row.querySelector("input")) row = row.parentElement;
      for (let f = row; f; f = f.parentElement) if (f.classList?.contains("tp-fldv") && !f.classList.contains("tp-fldv-expanded")) f.querySelector(".tp-fldv_b")?.click();
      row.scrollIntoView({ block: "center" });
      const inp = row.querySelector("input"); window.__k = row.outerHTML.slice(0, 300);
      if (!inp) return "noinput";
      inp.setAttribute("data-k1444", "1");
      return inp.value;
    });
    if (found === null || found === "noinput") { console.log("slider not found:", found); break; }
    await page.evaluate((v) => { const i = document.querySelector("input[data-k1444]"); i.focus(); i.value = String(v); i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new Event("change", { bubbles: true })); i.blur(); }, v);
    await new Promise((r) => setTimeout(r, 2500));
    const now = await page.evaluate(() => ({ box: document.querySelector("input[data-k1444]").value, url: location.search, home: globalThis.__knotGf?.home }));
    console.log("was", found, "typed", v, "->", JSON.stringify(now));
    await shot(`v${v}`);
  }
} finally { await browser.close(); }
