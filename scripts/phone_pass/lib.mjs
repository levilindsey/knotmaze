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
// K193 (2026-10-14): the viewport the pass measures at. "portrait" (the default, cfg.viewport) emulates the
// phone's portrait viewport (411x753 CSS px at dpr 2.625) over CDP in the pass's own tab, whatever way the
// phone sits (docked in landscape, 2424x1080, or off the dock); "native" leaves the tab at the phone's own
// viewport (an old landscape pass reproduces with -Viewport native). No phone setting changes: a DevTools
// override lives with the session that set it, so every script sets it again (myPage) and it ends with that
// script's connection.
export const VIEWPORT = CFG.viewport === "native" ? "native" : "portrait";
export const EMU_VP = { width: PHONE_VP.width, height: PHONE_VP.height, deviceScaleFactor: CFG.dpr || PHONE_VP.deviceScaleFactor };
const isMine = (url) => BUILDS.some((b) => url.startsWith(b.host + "/"));

// The CDP session that holds each page's override (kept so it stays attached while the script runs).
const emuSessions = new WeakMap();
// Sets (or re-sets: idempotent and cheap) the pass tab's viewport override. A viewport `vp` other than the pass's
// own (emulation.mjs asks for a size the phone does not have) is applied even in native mode. Returns the session.
export async function emulate(page, vp = EMU_VP) {
  if (VIEWPORT === "native" && vp === EMU_VP) return null;
  let cdp = emuSessions.get(page);
  if (!cdp) { cdp = await page.createCDPSession(); emuSessions.set(page, cdp); }
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor, mobile: true,
    screenOrientation: vp.width > vp.height ? { type: "landscapePrimary", angle: 90 } : { type: "portraitPrimary", angle: 0 },
  });
  if (DRY) await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 }); // a real phone has touch already
  return cdp;
}
// Called before every navigation of a script (the override survives a navigation in the same session, but a
// page that loads under it must find it already set: mobile emulation keeps the layout width it loaded with).
export const ensureViewport = (page) => emulate(page);

// What the page itself says about its viewport (page.evaluate(EMU_READ)): innerWidth x innerHeight x dpr, the
// orientation media query, the visual viewport, the document's client size, the screen, and the biggest canvas
// (backing size and CSS box). The proof that the emulation is real, not merely accepted.
export const EMU_READ = () => {
  const cs = [...document.querySelectorAll("canvas")].map((c) => {
    const r = c.getBoundingClientRect();
    return { w: c.width, h: c.height, cw: +r.width.toFixed(1), ch: +r.height.toFixed(1) };
  }).sort((a, b) => b.w * b.h - a.w * a.h);
  const vv = window.visualViewport;
  return {
    vp: [window.innerWidth, window.innerHeight, +window.devicePixelRatio.toFixed(3)],
    portrait: matchMedia("(orientation: portrait)").matches,
    doc: [document.documentElement.clientWidth, document.documentElement.clientHeight],
    vv: vv ? [+vv.width.toFixed(1), +vv.height.toFixed(1), +vv.scale.toFixed(3)] : null,
    screen: [screen.width, screen.height, screen.orientation ? screen.orientation.type : null],
    canvas: cs[0] || null, canvases: cs.length,
  };
};

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
// Sets the tab's viewport override first (K193), unless { raw: true } (emulation.mjs reads the tab as it sits).
export async function myPage(browser, { raw = false } = {}) {
  const mine = (await browser.pages()).filter((p) => isMine(p.url()));
  let page = null;
  for (const p of mine) if ((await p.evaluate(() => document.visibilityState)) === "visible") { page = p; break; }
  page ??= mine[0];
  if (!page) {
    if (!DRY) throw new Error("no pass tab on " + BUILDS.map((b) => b.host).join(" / ") + " (phone_pass.ps1 -Phase start opens one)");
    page = await browser.newPage();
    await page.goto(`${CFG.hostB}/favicon.svg`, { waitUntil: "load" }).catch(() => {}); // a static file: a bare page URL would boot today's daily
  }
  if (DRY) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  if (!raw) await emulate(page);
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
  await ensureViewport(page);
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
  await ensureViewport(page);
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
