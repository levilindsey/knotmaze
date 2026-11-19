// K1519 (26V): why does one census scene freeze on two states? Replicates k1436_screen.mjs's load+freeze
// sequence per load and records, before the freeze, the live state (simTime, substeps, asleep, settle,
// pending accumulator) and, after StepUntil, the reached simTime + dump hashes; then steps two more
// 1/60 frames recording each hash, so an alt state can be identified as a neighbour frame.
//   node .claude/probes/K1519/k1519_freeze.mjs <base> <profileDir> <out.json> <scene,scene> [loads=6]
//   env EARLY=1  freeze right after the perf state leaves "loading" (skip the gf-switch/frames waits)
import puppeteer from "puppeteer-core";
import { writeFileSync, readFileSync } from "node:fs";
const [, , base, profileDir, outPath, scenesS, loadsS = "6"] = process.argv;
const LOADS = +loadsS, EARLY = process.env.EARLY === "1";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sceneDir = new URL("../K868/scenes/", import.meta.url).pathname.replace(/^\//, "").replaceAll("/", "\\");
function jobFor(s) {
  const d = JSON.parse(readFileSync(`${sceneDir}${s}.diag.json`, "utf8"));
  const u = String(d.job.url); let q = u.substring(u.indexOf("?") + 1);
  q = q.split("&").filter((p) => !/^(bg|bgcm|bgc0|cs|rp|gfh|tlk)=/.test(p)).join("&");
  q += "&tlk=fill&cs=mono&bg=none&rp=gf&gfh=1";
  return { name: s, query: q, hash: String(d.step.frozenHash), t: +d.step.frozenSim };
}
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1300,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const rows = [];
for (const s of scenesS.split(",")) {
  const job = jobFor(s);
  for (let k = 0; k < LOADS; k++) {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument((m) => { window.__knotLoopMode = "continuous"; globalThis.__freezeMode = m[0]; globalThis.__frozenSim = m[1]; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} }, [process.env.MODE ?? "none", job.t]);
    await page.setViewport({ width: 1240, height: 900, deviceScaleFactor: 3 });
    const t0 = Date.now(); const marks = {};
    await page.goto(`${base}/?${job.query}`, { waitUntil: "load", timeout: 900000 });
    await page.waitForFunction(() => { const st = window.__knotPerf?.()?.state; return st && st !== "loading"; }, { timeout: 900000, polling: 300 });
    marks.loadedMs = Date.now() - t0;
    if (!EARLY) {
      await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && globalThis.__knotGf.stats.composites > 0, { timeout: 900000, polling: 300 });
      marks.switchedMs = Date.now() - t0;
      const f0 = await page.evaluate(() => window.__knotLoop().frames);
      await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 900000, polling: 500 }, f0);
      marks.framesMs = Date.now() - t0;
    }
    const rec = await page.evaluate(async (t) => {
      const before = {};
      try { const p = window.__knotPerf(); before.perf = { state: p.state, asleep: p.asleep, frozen: p.frozen, simTime: p.simTime, substeps: p.substeps, lagS: p.lagS, kind: p.kind }; } catch (e) { before.perfErr = String(e); }
      try { before.settle = window.__knotSettle(); } catch {}
      try { const ps = window.__knotPS(); before.ps = { simTime: ps.simTime, pending: ps.pendingTime, maxMove: ps.maxMove }; } catch (e) { before.psErr = String(e); }
      try { const d = await window.__knotPhysDump(); before.dump = { simTime: d.simTime, hashes: d.hashes }; } catch (e) { before.dumpErr = String(e); }
      const fr = await window.__knotPhysFreeze(true);
      const mode = globalThis.__freezeMode;
      if (mode === "reset") { try { window.__knotPS().reset(); } catch (e) { before.resetErr = String(e); } }
      if (mode === "parity") { try { const ps = window.__knotPS(); const want = Math.round(globalThis.__frozenSim * 120); if (Math.round(ps.simTime * 120) % 2 !== want % 2) ps.accumulator = (ps.accumulator ?? 0) + 1 / 120; } catch (e) { before.parityErr = String(e); } }
      const reached = await window.__knotStepUntil(t);
      const after = await window.__knotPhysDump();
      const chain = [{ simTime: after.simTime, hashes: after.hashes }];
      for (let i = 0; i < 2; i++) { await window.__knotStepUntil(after.simTime + (i + 1) / 60); const d2 = await window.__knotPhysDump(); chain.push({ simTime: d2.simTime, hashes: d2.hashes }); }
      return { before, freeze: fr, reached, chain };
    }, job.t - 0.008);
    rows.push({ scene: s, load: k, expected: job.hash, target: job.t, marks, ...rec });
    console.log(`${s} #${k} before sim=${rec.before.dump?.simTime} substeps=${rec.before.perf?.substeps} asleep=${rec.before.perf?.asleep} settle=${JSON.stringify(rec.before.settle?.phase)} -> ${rec.chain.map((c) => `${c.hashes.all}@${c.simTime.toFixed(4)}`).join(" ")} (want ${job.hash})`);
    await page.close();
  }
}
writeFileSync(outPath, JSON.stringify(rows, null, 1));
await browser.close();
console.log("wrote", outPath);
