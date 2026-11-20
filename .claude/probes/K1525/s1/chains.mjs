// K1525 s1: dump the drawn centrelines (renderer.chainSamples), the half width and gf's tables' chain count for one
// frozen state, to attribute pixels gf leaves empty (which chain today's draws there, at what distance).
//   node chains.mjs <base> <out.json> <profileDir> <query> <simT> <par> [rp=gf]
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , base, out, profileDir, query, simT, par, rp] = process.argv;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1700,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--disable-gpu-watchdog"],
});
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
const gf = (rp ?? "gf") === "gf";
await page.goto(`${base}/?${query}&phw=0&snd=none&prp=off${gf ? "&rp=gf" : ""}`, { waitUntil: "load", timeout: 900000 });
await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
const r = await page.evaluate(async (t, par) => {
  await window.__knotPhysFreeze(true);
  const ps = window.__knotPS(); if (Math.round(ps.simTime * 120) % 2 !== par) ps.accumulator = (ps.accumulator ?? 0) + 1 / 120;
  await window.__knotStepUntil(t);
  const R = window.__knotRenderer();
  R.update?.();
  await new Promise((res) => setTimeout(res, 800));
  const d = await window.__knotPhysDump(); const h = d?.hashes ?? d;
  const cs = (R.chainSamples ?? []).map((s) => s ? { n: s.count, xy: Array.from(s.positions.slice(0, 2 * s.count)) } : null);
  return { hash: String(h?.all), fillHalf: R.style.threadWidth / 2, casing: R.style.casingWidth, view: window.__knotView(), chains: cs };
}, Number(simT), Number(par));
writeFileSync(out, JSON.stringify(r));
console.log("hash", r.hash, "fillHalf", r.fillHalf, "casing", r.casing, "chains", r.chains.length);
await browser.close();
