// K1369 s4: is the snapshot channel exact? One page (rp=gf, __knotGfOpts.chan, the physics worker, interpolation off),
// phone viewport. At rest and frozen mid-drag: C = what the channel installed (the gf worker's samples, now the
// renderer's chainSamples, and its tables), M = main's own path from the same physics state (renderer.update() from
// main's mirror, lean, then a posted build of main's gather). Compares, per chain, count, closed, totalLength, positions,
// tangents and controlArcLengths, and every table field, as FNV-1a hashes of their bytes. Then a phw=0 page: the
// channel must say "unavailable" and gf must still build. Exit 1 on any mismatch.
//   node .claude/probes/K1369/k1369s4_chan.mjs <base url> [link=b.FMKB4DIQ]
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";

const [, , base, linkArg] = process.argv;
const link = linkArg ?? "b.FMKB4DIQ";
const profileDir = join(tmpdir(), `k1369s4-chan-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=520,900",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CAP = () => {
  const r = window.__knotRenderer?.(); const g = window.__knotGf;
  if (!r || !g || !g.tables) return { err: "no renderer or tables" };
  const fnv = (u8) => { let h = 0x811c9dc5; for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 16777619) >>> 0; } return h.toString(16); };
  const bytes = (v) => new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  const s = r.chainSamples.map((x) => x && [x.count, x.closed, x.totalLength,
    fnv(bytes(x.positions.subarray(0, x.count * 2))), fnv(bytes(x.tangents.subarray(0, x.count * 2))), fnv(bytes(Float64Array.from(x.controlArcLengths)))].join(" "));
  const T = {};
  for (const [k, v] of Object.entries(g.tables)) {
    if (k === "ms") continue;
    T[k] = ArrayBuffer.isView(v) ? `${v.constructor.name}:${v.length}:${fnv(bytes(v))}` : JSON.stringify(v);
  }
  const st = g.stats;
  return { s, T, chan: st.chan, chanBuilds: st.chanBuilds, chanOpens: st.chanOpens, rebuilds: st.rebuilds, workerBuilds: st.workerBuilds };
};
const diff = (a, b) => {
  const out = [];
  a.s.forEach((x, c) => { if (x !== b.s[c]) out.push(`chain ${c}: ${x} vs ${b.s[c]}`); });
  for (const k of new Set([...Object.keys(a.T), ...Object.keys(b.T)])) if (a.T[k] !== b.T[k]) out.push(`T.${k}`);
  return out;
};
const waitFor = async (page, fn, arg, ms = 15000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg)) return true; await sleep(100); }
  return false;
};
// M: the channel off, main's own update from its mirror, a posted build of main's gather.
const mainPath = async (page) => {
  const n0 = await page.evaluate(() => window.__knotGf.stats.rebuilds);
  await page.evaluate(() => { window.__knotGfOpts.chan = false; window.__knotGf.redraw(); });
  await waitFor(page, () => window.__knotGf.stats.chan === "off");
  await page.evaluate(() => { window.__knotRenderer().update(); window.__knotGf.rebuild(); });
  const ok = await waitFor(page, (n) => window.__knotGf.stats.rebuilds > n + 0, n0);
  await sleep(300);
  // Read the samples main's update wrote, not a later frame's: update again (frozen state, same result).
  return { ok, cap: await page.evaluate(CAP) };
};
// C: the channel (re)opened, its first build installed.
const chanPath = async (page) => {
  const b0 = await page.evaluate(() => window.__knotGf.stats.chanBuilds);
  await page.evaluate(() => { window.__knotGfOpts.chan = true; window.__knotGf.redraw(); });
  const ok = await waitFor(page, (b) => window.__knotGf.stats.chan === "open" && window.__knotGf.stats.chanBuilds > b, b0);
  await sleep(500);
  return { ok, cap: await page.evaluate(CAP) };
};
let bad = false;
const verdict = (label, C, M) => {
  const d = C.ok && M.ok && !C.cap.err && !M.cap.err ? diff(C.cap, M.cap) : ["not captured"];
  console.log(`${label}: chan ${C.cap.chan} chanBuilds ${C.cap.chanBuilds} opens ${C.cap.chanOpens} | main rebuilds ${M.cap.rebuilds} | chains ${C.cap.s?.length} fields ${Object.keys(C.cap.T ?? {}).length} | ${d.length ? "MISMATCH " + d.slice(0, 6).join("; ") : "exact"}`);
  if (d.length) bad = true;
};
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(() => { globalThis.__knotGfOpts = { chan: true }; globalThis.__knotHostOpts = { interpolate: false }; });
  await page.goto(`${base}/?${link}&am=instant&snd=none&rp=gf`, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { const p = await page.evaluate(() => window.__knotPerf?.(1)); if (p && p.asleep && p.state !== "loading" && p.totalFrames > 30) break; await sleep(200); }
  await sleep(800);
  // At rest: the channel built from the sleeping state (its open flushes one snapshot).
  const C0 = { ok: await waitFor(page, () => window.__knotGf?.stats.chan === "open" && window.__knotGf.stats.chanBuilds > 0), cap: await page.evaluate(CAP) };
  const M0 = await mainPath(page);
  verdict("rest", C0, M0);
  // Mid-drag, frozen: main first (channel off), then the channel reopened on the same state.
  await page.evaluate(() => { window.__knotGfOpts.chan = true; });
  await sleep(500);
  const [x0, y0, x1, y1] = [150, 330, 265, 455];
  await page.touchscreen.touchStart(x0, y0);
  for (let i = 1; i <= 24; i++) { const u = i / 60; await page.touchscreen.touchMove(x0 + (x1 - x0) * u, y0 + (y1 - y0) * Math.sin(u * Math.PI)); await sleep(50); }
  const during = await page.evaluate(() => ({ chan: window.__knotGf.stats.chan, chanBuilds: window.__knotGf.stats.chanBuilds, gated: window.__knotGf.stats.gated }));
  console.log("during drag:", JSON.stringify(during));
  await page.evaluate(async () => { await window.__knotPhysFreeze(true); });
  await sleep(400);
  const M1 = await mainPath(page);
  const C1 = await chanPath(page);
  verdict("drag", C1, M1);
  // The control must differ: rest against drag (a probe that read one state twice would pass the checks above).
  const ctl = C0.cap.s && C1.cap.s ? C0.cap.s.filter((x, c) => x !== C1.cap.s[c]).length : 0;
  console.log(`control (rest vs drag): ${ctl} of ${C0.cap.s?.length} chains differ`);
  if (!(ctl > 0)) bad = true;
  await page.touchscreen.touchEnd();
  await page.evaluate(async () => { await window.__knotPhysFreeze(false); });
  await page.close();
  // phw=0: no port, the posted path.
  const p2 = await browser.newPage();
  await p2.setViewport({ width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  await p2.evaluateOnNewDocument(() => { globalThis.__knotGfOpts = { chan: true }; });
  await p2.goto(`${base}/?${link}&am=instant&snd=none&rp=gf&phw=0`, { waitUntil: "load", timeout: 60000 });
  await p2.bringToFront();
  await waitFor(p2, () => (window.__knotGf?.stats.rebuilds ?? 0) > 0 && window.__knotGf.stats.chan !== "", undefined, 30000);
  const p0 = await p2.evaluate(() => ({ chan: window.__knotGf?.stats.chan, rebuilds: window.__knotGf?.stats.rebuilds, fallback: window.__knotGf?.stats.fallback, host: window.__knotPerf?.(1)?.host?.kind }));
  console.log("phw=0:", JSON.stringify(p0));
  if (p0.chan !== "unavailable" || !(p0.rebuilds > 0) || p0.fallback) bad = true;
  console.log(bad ? "CHECK chan: MISMATCH" : "CHECK chan: exact (channel vs main, at rest and mid-drag; phw=0 unavailable, gf builds)");
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* in use */ }
}
process.exit(bad ? 1 : 0);
