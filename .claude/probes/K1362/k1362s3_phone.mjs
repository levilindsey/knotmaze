// K1362 s3: the Pixel half. Runs in the K156 pass's OWN tab (never opens, wakes or touches anything else): it
// navigates that tab, on the pass's own origin (hostB), to <build>/k1362s3/k1362s3_bench.html, which
// k1362s3_run.mjs build made and the caller copied into the pass's build dir before phone_pass.ps1 -Phase start.
//   node .claude/probes/K1362/k1362s3_phone.mjs <pass config.json> <label> <cfg json file> [engine]
// argv[2] is the pass's config.json, so the watchdog can kill this process (and lib.mjs reads it). Between polls it
// checks the watchdog's trip file and stops at once on a trip. Writes out/s3/phone_<label>.json with the thermal
// state before and after each bench. "engine" also runs K1247 s30's engine probe (worker, then main) on the drag.
// At the end the tab goes back to the pass's link, so cleanup finds it as it left it.
import { CFG, connect, myPage, thermal, tripped, sleep } from "../../../scripts/phone_pass/lib.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const label = process.argv[3];
const cfg = JSON.parse(readFileSync(process.argv[4], "utf8"));
const withEngine = process.argv.includes("engine");
const file = join(here, `out/s3/phone_${label}.json`);
const host = CFG.hostB;
const browser = await connect();
const page = await myPage(browser);
const back = page.url();
const out = { label, chrome: await browser.version(), started: new Date().toISOString(), benches: [], drag: null, engine: {} };
const save = () => writeFileSync(file, JSON.stringify(out, null, 1));
const poll = async (expr, maxMs) => {
  const t0 = Date.now();
  for (;;) {
    const t = tripped();
    if (t) throw new Error("WATCHDOG TRIPPED: " + t);
    const v = await page.evaluate(expr);
    if (v) return v;
    if (Date.now() - t0 > maxMs) throw new Error("timed out: " + expr);
    await sleep(1500);
  }
};
const run = async (kind, args, maxMs = 900000) => {
  await page.evaluate((k, a) => window.__start(k, a), kind, args);
  await poll("!!(window.__res || window.__err)", maxMs);
  const [res, err] = await page.evaluate(() => [window.__res, window.__err]);
  if (err) throw new Error(err);
  return res;
};
try {
  await page.goto(`${host}/k1362s3/k1362s3_bench.html`, { waitUntil: "load" });
  await poll("window.__ready === true", 30000);
  out.thermal0 = thermal();
  for (const b of cfg.benches) {
    const t0 = Date.now();
    const th = thermal();
    const r = await run("bench", { base: "scenes", ...b });
    r.thermalBefore = th; r.thermalAfter = thermal();
    out.benches.push(r); save();
    console.log(`${b.w}x${b.h} done in ${((Date.now() - t0) / 1000).toFixed(0)} s; thermal ${JSON.stringify(r.thermalAfter)}`);
  }
  if (cfg.drag) {
    const frames = JSON.parse(readFileSync(join(here, "out/s3/site/drag/index.json"), "utf8"));
    const aa = cfg.drag.aa ?? out.benches[0]?.scenes?.def?.aa;
    out.drag = await run("drag", [frames.map((f) => `drag/${f}`), aa, cfg.drag.reps ?? 3]);
    out.drag.thermalAfter = thermal(); save();
    console.log("drag done");
  }
  if (withEngine) {
    const frames = JSON.parse(readFileSync(join(here, "out/s3/site/drag/index.json"), "utf8"));
    const urls = frames.map((f) => `/k1362s3/drag/${f}`);
    await page.goto(`${host}/k1362s3/k1247/k1247s30_engine.html?warm=2&reps=3&urls=${encodeURIComponent(JSON.stringify(urls))}`, { waitUntil: "load" });
    await poll("window.__ready === true", 30000);
    for (const where of ["worker", "main"]) {
      await page.evaluate((w) => { window.__r = null; window.__e = null; window.__run(w).then((r) => { window.__r = r; }, (e) => { window.__e = String(e); }); }, where);
      await poll("!!(window.__r || window.__e)", 900000);
      const [r, e] = await page.evaluate(() => [window.__r, window.__e]);
      out.engine[where] = e ? { error: e } : r; save();
      console.log(`engine ${where} done`);
    }
    out.engine.thermalAfter = thermal();
  }
} catch (e) {
  out.error = String(e && e.message || e);
  console.log("ERROR", out.error);
} finally {
  out.ended = new Date().toISOString(); save();
  if (!tripped()) await page.goto(back, { waitUntil: "load" }).catch(() => {});
  await browser.disconnect();
  console.log("wrote", file);
}
