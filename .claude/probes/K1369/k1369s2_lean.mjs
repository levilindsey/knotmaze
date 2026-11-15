// K1369 s2: is gf's `lean` gap solve exact for what gf reads? One page (rp=gf, __knotGfOpts.lean, in-thread physics),
// phone viewport, at rest and frozen mid-drag: in ONE synchronous call, renderer.update() with the full solve (the
// prototype's computeGapSlot), then with diagData poisoned (NaN) and the lean solve, then lean, then full again.
// Compares every renderer field gatherSceneInputLean reads that update() writes: chainSamples (count, closed,
// totalLength, positions, controlArcLengths), chainTipFused, freeTips, diagData x, y per diagram crossing. Bitwise
// (Object.is). F/F2 = the full-vs-full control; F/L and F2/L2 = the check. Exit 1 on any mismatch or NaN left.
//   node .claude/probes/K1369/k1369s2_lean.mjs <base url> [link=b.FMKB4DIQ]
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";

const [, , base, linkArg] = process.argv;
const link = linkArg ?? "b.FMKB4DIQ";
const profileDir = join(tmpdir(), `k1369s2-lean-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=520,900",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CHECK = () => {
  const r = window.__knotRenderer?.(); const ps = window.__knotPS?.();
  if (!r || !ps) return { err: "no renderer" };
  if (!Object.prototype.hasOwnProperty.call(r, "computeGapSlot")) return { err: "lean not attached" };
  const lean = r.computeGapSlot;
  const nx = ps.crossings.length;
  const cap = () => ({
    s: r.chainSamples.map((s) => s && { count: s.count, closed: s.closed, total: s.totalLength,
      pos: Array.from(s.positions.slice(0, s.count * 2)), arc: Array.from(s.controlArcLengths) }),
    tuck: JSON.stringify(r.chainTipFused), free: JSON.stringify(r.freeTips.map((t) => [t.chain, t.atEnd])),
    dd: Array.from({ length: nx * 2 }, (_, i) => r.diagData[Math.floor(i / 2) * 5 + (i % 2)]),
  });
  const full = () => { delete r.computeGapSlot; r.update(); r.computeGapSlot = lean; };
  const leanUp = () => { r.update(); };
  const diff = (a, b) => {
    let n = 0, first = null;
    const eq = (x, y, where) => { if (!Object.is(x, y)) { n++; first ??= `${where}: ${x} vs ${y}`; } };
    a.s.forEach((sa, c) => { const sb = b.s[c];
      eq(sa.count, sb.count, `c${c} count`); eq(sa.closed, sb.closed, `c${c} closed`); eq(sa.total, sb.total, `c${c} total`);
      sa.pos.forEach((v, i) => eq(v, sb.pos[i], `c${c} pos${i}`)); sa.arc.forEach((v, i) => eq(v, sb.arc[i], `c${c} arc${i}`)); });
    eq(a.tuck, b.tuck, "tuck"); eq(a.free, b.free, "freeTips");
    a.dd.forEach((v, i) => eq(v, b.dd[i], `diag${i}`));
    return { n, first };
  };
  full(); const F = cap();
  r.diagData.fill(NaN); leanUp(); const L = cap();
  r.diagData.fill(NaN); leanUp(); const L2 = cap();
  full(); const F2 = cap();
  const nan = (x) => x.dd.filter((v) => Number.isNaN(v)).length;
  return { crossings: nx, chains: r.chainSamples.length, ctrl: diff(F, F2), FL: diff(F, L), F2L2: diff(F2, L2), nanL: nan(L), nanL2: nan(L2), leanOwn: true };
};
let bad = false;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  await page.evaluateOnNewDocument(() => { globalThis.__knotGfOpts = { lean: true }; });
  await page.goto(`${base}/?${link}&am=instant&snd=none&rp=gf&phw=0`, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { const p = await page.evaluate(() => window.__knotPerf?.(1)); if (p && p.asleep && p.state !== "loading" && p.totalFrames > 30) break; await sleep(200); }
  await sleep(500);
  const rest = await page.evaluate(CHECK);
  console.log("rest:", JSON.stringify(rest));
  const [x0, y0, x1, y1] = [150, 330, 265, 455];
  await page.touchscreen.touchStart(x0, y0);
  for (let i = 1; i <= 24; i++) { const u = i / 60; await page.touchscreen.touchMove(x0 + (x1 - x0) * u, y0 + (y1 - y0) * Math.sin(u * Math.PI)); await sleep(50); }
  await page.evaluate(async () => { if (typeof window.__knotPhysFreeze === "function") await window.__knotPhysFreeze(true); else window.__knotPS().step = function () {}; });
  await sleep(200);
  const drag = await page.evaluate(CHECK);
  console.log("drag:", JSON.stringify(drag));
  await page.touchscreen.touchEnd();
  for (const x of [rest, drag]) if (x.err || x.ctrl.n || x.FL.n || x.F2L2.n || x.nanL || x.nanL2) bad = true;
  console.log(bad ? "CHECK lean: MISMATCH" : "CHECK lean: exact (full vs lean bitwise, at rest and mid-drag; control 0)");
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* in use */ }
}
process.exit(bad ? 1 : 0);
