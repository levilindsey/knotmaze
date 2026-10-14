// phone_pass: shared helpers (K156; the K81 phone gate kit made generic).
// Everything comes from the config file that scripts/phone_pass.ps1 writes
// (argv[2]): no constants for one gate. A = the base build (host A), B = the
// head build (host B); an A/A pass serves ONE build on both ports. These
// scripts drive ONLY the tab the pass opened (a page on one of its two
// hosts); Levi's own tabs are never navigated or closed. The watchdog's trip
// file aborts every wait. cfg.dry runs the same scripts against a desktop
// Chrome with the phone's viewport emulated: a harness check, never a result.
import puppeteer from "puppeteer-core";
import { existsSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";

export const CFG = JSON.parse(readFileSync(process.argv[2], "utf8"));
export const DRY = !!CFG.dry;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const BUILDS = [
  { key: "base", host: CFG.hostA, sha: CFG.shaA, ref: CFG.refA },
  { key: "head", host: CFG.hostB, sha: CFG.shaB, ref: CFG.refB },
];
// The phone's Chrome with the toolbar showing (measured 2026-10-13).
export const PHONE_VP = { width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true };
const isMine = (url) => BUILDS.some((b) => url.startsWith(b.host + "/"));

// Output path under the pass's folder (parents created).
export function out(...parts) {
  const f = join(CFG.out, ...parts);
  mkdirSync(dirname(f), { recursive: true });
  return f;
}
export const logLine = (file, obj) => appendFileSync(out(file), (typeof obj === "string" ? obj : JSON.stringify(obj)) + "\n");

export function tripped() {
  const f = join(CFG.out, "state", "watchdog.trip");
  return existsSync(f) ? readFileSync(f, "utf8").trim() : null;
}
export function assertFree() {
  const t = tripped();
  if (t) throw new Error(`WATCHDOG TRIPPED: ${t}`);
}

export const connect = () => puppeteer.connect({ browserURL: CFG.cdp, defaultViewport: null, protocolTimeout: 60000 });

// The pass's own tab (the visible one on its hosts). Throws when there is
// none on a phone: never opens or touches anything else. DRY opens one.
export async function myPage(browser) {
  const mine = (await browser.pages()).filter((p) => isMine(p.url()));
  let page = null;
  for (const p of mine) if ((await p.evaluate(() => document.visibilityState)) === "visible") { page = p; break; }
  page ??= mine[0];
  if (!page) {
    if (!DRY) throw new Error("no pass tab on " + BUILDS.map((b) => b.host).join(" / ") + " (phone_pass.ps1 -Phase start opens one)");
    page = await browser.newPage();
    await page.goto(`${CFG.hostB}/favicon.svg`, { waitUntil: "load" }).catch(() => {}); // a static file: a bare page URL would boot today's daily
  }
  if (DRY) {
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    await page.setViewport(PHONE_VP);
  }
  return page;
}

export const stampOf = (page) =>
  page.evaluate(() => {
    const t = [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((s) => /^P\d/.test(s.trim()));
    return (t || "").trim();
  });
export const stampSha = (stamp) => ((/v[\d.]+\s+(\S+)/.exec(stamp || "") || [])[1] || "").replace(/\+$/, "") || null;
// Every sample checks its page's stamp SHA (by prefix; a "+" means built with
// uncommitted changes), so a stale server on a pass port can't pass as a build.
export function checkBuild(build, stamp) {
  const sha = stampSha(stamp);
  if (!sha || !(build.sha.startsWith(sha) || sha.startsWith(build.sha))) {
    throw new Error(`wrong build on ${build.host}: stamp "${String(stamp).slice(0, 48)}", expected ${build.sha}`);
  }
}

// Load a link in the tab and wait until the knot sleeps (or settleMs).
export async function load(page, url, settleMs = 30000, { wake = true } = {}) {
  assertFree();
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  if (wake) await page.evaluate(() => navigator.wakeLock?.request("screen").catch(() => {})); // keeps the screen on; wakes nothing
  const t0 = Date.now();
  let stamp = "", sleptAt = null;
  while (Date.now() - t0 < settleMs) {
    await sleep(500);
    assertFree();
    stamp = await stampOf(page);
    if (/asleep/.test(stamp)) { sleptAt = (Date.now() - t0) / 1000; break; }
  }
  return { stamp, sleptAt };
}

// Wait for a frozen layout (phy=0 links): a deterministic, pinned frame.
export async function loadFrozen(page, url) {
  assertFree();
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.waitForFunction(() => typeof window.__knotPerf === "function" && window.__knotPerf().state === "frozen", { timeout: 90000, polling: 250 });
  await sleep(1200);
  assertFree();
  return { stamp: await stampOf(page), sleptAt: null };
}

// rAF intervals for `ms` (the K10 method: fps = intervals / seconds), plus
// the long-frame counts the vsync-capped median hides.
export function rafWindow(page, ms = 4000) {
  return page.evaluate(async (ms) => {
    const bg0 = window.__knotBackground?.(), perf0 = window.__knotPerf?.(1);
    const dts = await new Promise((res) => {
      const o = [];
      let last = performance.now();
      const t0 = last;
      const step = (t) => { o.push(t - last); last = t; if (t - t0 < ms) requestAnimationFrame(step); else res(o); };
      requestAnimationFrame(step);
      setTimeout(() => res(o), ms * 2 + 4000); // never hang on a hidden tab
    });
    const bg1 = window.__knotBackground?.(), perf1 = window.__knotPerf?.(1);
    const s = [...dts].sort((a, b) => a - b);
    const q = (f) => s[Math.floor(f * (s.length - 1))];
    const over = (x) => dts.filter((d) => d > x).length;
    const wallS = dts.reduce((a, v) => a + v, 0) / 1000;
    const r1 = (v) => (typeof v === "number" ? Number(v.toFixed(1)) : null);
    return {
      n: dts.length, wallS: +wallS.toFixed(3), fps: +(dts.length / (ms / 1000)).toFixed(1),
      p50: r1(q(0.5)), p90: r1(q(0.9)), p95: r1(q(0.95)), p99: r1(q(0.99)), max: r1(s[s.length - 1]),
      over20: over(20), over25: over(25), over40: over(40), over50: over(50),
      // main-thread ms per ticker callback over exactly this window
      cpuMs: perf1 && perf0 ? +((perf1.totalCostMs - perf0.totalCostMs) / Math.max(1, perf1.totalFrames - perf0.totalFrames)).toFixed(3) : null,
      bg: bg1 && bg0 ? { id: bg1.id, speed: bg1.speed, passesPerS: +((bg1.stats.renders - bg0.stats.renders) / wallS).toFixed(2), rt: `${bg1.stats.rtW}x${bg1.stats.rtH}` } : null,
    };
  }, ms);
}

export const median = (a) => {
  const s = a.filter((v) => typeof v === "number").sort((x, y) => x - y);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : null;
};

// The phone's thermal state (adb; null on a dry run): status + skin temps.
export function thermal() {
  if (DRY || !CFG.adb) return null;
  try {
    const o = execFileSync(CFG.adb, ["-s", CFG.serial, "shell", "dumpsys thermalservice | grep -E 'Thermal Status' ; dumpsys thermalservice | sed -n '/Current temperatures from HAL/,/Current cooling/p' | grep -E 'mName=(VIRTUAL-SKIN|soc_therm|battery),'"], { encoding: "utf8", timeout: 15000 });
    const status = (o.match(/Thermal Status: (\d+)/) || [])[1];
    const temps = [...o.matchAll(/mValue=([\d.]+), mType=-?\d+, mName=([\w-]+)/g)].map((m) => m[2] + " " + Number(m[1]).toFixed(1));
    return { status: Number(status), temps };
  } catch (e) {
    return { error: String(e.message).slice(0, 80) };
  }
}
