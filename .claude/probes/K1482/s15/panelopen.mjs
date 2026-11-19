// K1482 s15: cap15.mjs closes the panel in its profile (localStorage knotmaze.panelOpen=0), and the drag checks
// (K1458/dragcheck.mjs, K1492/dragcheck_b.mjs) need it open: this sets it back to 1 in a profile.
//   node .claude/probes/K1482/s15/panelopen.mjs <base> <profileDir>
import puppeteer from "puppeteer-core";
const [, , base, profileDir] = process.argv;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=800,600"],
});
try {
  const page = await browser.newPage();
  await page.goto(`${base}/credits.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
  console.log(await page.evaluate(() => { localStorage.setItem("knotmaze.panelOpen", "1"); return localStorage.getItem("knotmaze.panelOpen"); }));
} finally {
  await browser.close();
}
