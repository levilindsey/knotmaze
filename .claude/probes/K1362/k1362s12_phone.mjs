// K1362 s6 (from s5): the Pixel half (from k1362s3_phone.mjs). Runs in the K156 pass's OWN tab (never opens, wakes or touches
// anything else): it navigates that tab, on the pass's own origin (hostB), to <build>/k1362s12/k1362s12_bench.html,
// which k1362s12_run.mjs build made and the caller copied into the pass's build dir before phone_pass.ps1 -Phase start.
//   node .claude/probes/K1362/k1362s12_phone.mjs <pass config.json> <label> <cfg json file>
// argv[2] is the pass's config.json, so the watchdog can kill this process (and lib.mjs reads it). Between polls it
// checks the watchdog's trip file and stops at once on a trip. Writes out/s12/phone_<label>.json with the thermal
// state around each bench and the phone-minus-host Date.now() offset (k1362s12_gpuclk.mjs maps the bench's
// per-variant windows onto its host-time clock samples with it). At the end the tab goes back to the pass's link.
import { CFG, connect, myPage, thermal, tripped, sleep } from "../../../scripts/phone_pass/lib.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const label = process.argv[3];
const cfg = JSON.parse(readFileSync(process.argv[4], "utf8"));
const file = join(here, `out/s12/phone_${label}.json`);
const host = CFG.hostB;
const browser = await connect();
const page = await myPage(browser);
const back = page.url();
const out = { label, chrome: await browser.version(), started: new Date().toISOString(), benches: [] };
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
const offset = async () => { // phone Date.now() minus host Date.now(), from the tightest of 5 round trips
  let best = null;
  for (let i = 0; i < 5; i++) {
    const h0 = Date.now(); const p = await page.evaluate(() => Date.now()); const h1 = Date.now();
    if (!best || h1 - h0 < best.rtt) best = { rtt: h1 - h0, off: p - (h0 + h1) / 2 };
  }
  return best;
};
const run = async (kind, args, maxMs = 900000) => {
  await page.evaluate((k, a) => window.__start(k, a), kind, args);
  await poll("!!(window.__res || window.__err)", maxMs);
  const [res, err] = await page.evaluate(() => [window.__res, window.__err]);
  if (err) throw new Error(err);
  return res;
};
try {
  await page.goto(`${host}/k1362s12/k1362s12_bench.html`, { waitUntil: "load" });
  await poll("window.__ready === true", 30000);
  out.thermal0 = thermal();
  out.clock0 = await offset();
  for (const b of cfg.benches) {
    const t0 = Date.now();
    const th = thermal();
    const r = await run("bench", { base: "scenes", ...b });
    r.thermalBefore = th; r.thermalAfter = thermal(); r.t0 = t0; r.t1 = Date.now(); r.clock = await offset();
    out.benches.push(r); save();
    console.log(`${b.name} ${b.w}x${b.h} done in ${((Date.now() - t0) / 1000).toFixed(0)} s; thermal ${JSON.stringify(r.thermalAfter)}`);
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