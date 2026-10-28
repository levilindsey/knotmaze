// bisect2.mjs: the render-sync bisect driver. Finds the one commit behind a step in a scan (scan.mjs) with single-run probes on
// the phone, then confirms each pair ABBA, two runs a build, on the links asked for.
//
// Each pass: build the probed commits into <round>/pool (build_pool.ps1), copy them into the pass folder, `phone_pass.ps1 -Phase start`,
// scan.mjs (a PLAN of cells), `-Phase cleanup`. Every child writes its stdio to files in the pass folder: a piped or captured
// `-Phase start` hangs its caller (the servers and the watchdog inherit the pipe), so never run it through a pipe or Tee-Object.
// A failed start or scan (a watchdog trip ends a scan) stops the driver after that pass's cleanup: no retry.
//
// Call (from anywhere; it takes minutes, so run it in the background and poll <round-dir>/bisect.log):
//   node scripts/phone_pass/bisect2.mjs <round-dir> [--stop hh:mm] [--stop2 hh:mm]
//   --stop    no bisect pass starts at or after hh:mm (local time; env STOP; default none)
//   --stop2   no confirm starts at or after hh:mm (env STOP2; default none)
// The phone must be awake and unlocked, and the idle wait (idle_wait.ps1) and the phone lock belong to the caller.
//
// <round-dir>/round.json (base, head and commits: round.mjs):
//   "steps":    [{ "id": "T1", "link": "dense", "lo": 29, "hi": 59, "thr": 58.05, "up": true, "prio": 0, "firstMid": 40 }]
//               a step is the interval (lo, hi] of list indexes, measured on its link (dense | maxfab | knot24, as scan.mjs names
//               them); its render sync reads below thr at lo and above it at hi when "up", below it at hi when not (thr: the midpoint of
//               the two scan values); a probe is one run, a value that cannot be read stops the driver; "prio" orders open steps
//               (higher first), "firstMid" overrides the first midpoint. Two open steps share a pass (one build and one cell each);
//               one open step probes two builds a pass, at thirds.
//   "confirms": [{ "step": "T1" }, { "id": "S3", "lo": "fddb71b5", "hi": "ccae4ffe", "links": ["dense", "knot24"] }]
//               in this order, after the bisect: ABBA, two runs a build, on each link (default "confirmLinks"). {"step": id}
//               confirms that step's resolved pair (skipped while its interval is open); lo and hi are a list index or a ref. Without
//               "confirms", every resolved step is confirmed, in step order.
//   "confirmLinks": ["dense", "maxfab", "knot24"]   (the default)
// Writes in the round folder: bisect.log, bisect_state.json (intervals and probes), bisect_summary.json (steps, probes, confirms),
// logs/, and one folder per pass: d<n> (bisect probes) and e<n> (confirms), each with config.json, builds/, logs/ and scan/results.json.
// A confirm's log lines give the medians a build, the delta of the means and paramDiff a link (empty: the same maze).
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync, cpSync, openSync, closeSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { REPO, loadRound, paramDiff } from "./round.mjs";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : undefined; };
const R = loadRound(args[0]);
const root = R.dir;
const at = (hhmm) => { if (!hhmm) return null; const d = new Date(); const [h, m] = hhmm.split(":").map(Number); d.setHours(h, m, 0, 0); return d; };
const stopAt = at(flag("stop") || process.env.STOP);
const stopAt2 = at(flag("stop2") || process.env.STOP2);
const PHONE_PASS = REPO + "/scripts/phone_pass.ps1";
const BUILD_POOL = REPO + "/scripts/phone_pass/build_pool.ps1";
const SCAN = REPO + "/scripts/phone_pass/scan.mjs";
const LOG = root + "/bisect.log";
const log = (...a) => { const s = new Date().toTimeString().slice(0, 8) + " " + a.join(" "); console.log(s); appendFileSync(LOG, s + "\n"); };
function run(cmd, cmdArgs, logFile, env = {}) {
  const fd = openSync(logFile, "a");
  const r = spawnSync(cmd, cmdArgs, { stdio: ["ignore", fd, fd], env: { ...process.env, ...env }, windowsHide: true });
  closeSync(fd);
  return r.status;
}
function cleanup(name) {
  mkdirSync(`${root}/${name}/logs`, { recursive: true });
  const st = run("pwsh", ["-NoProfile", "-File", PHONE_PASS, "-Phase", "cleanup", "-Out", `${root}/${name}`], `${root}/${name}/logs/cleanup.txt`);
  log("cleanup", name, "exit", st);
  return st;
}
// One pass: base and head are full shas; plan is scan.mjs's PLAN ([[base|head, link], ...]). Returns the runs, or null on a failure.
function pass(name, baseSha, headSha, plan) {
  const dir = `${root}/${name}`;
  mkdirSync(dir + "/logs", { recursive: true });
  run("pwsh", ["-NoProfile", "-File", BUILD_POOL, "-Round", root, "-Refs", [baseSha, headSha].join(",")], `${root}/logs/build_${name}.txt`);
  const shorts = [baseSha, headSha].map((s) => s.slice(0, 8));
  for (const s of shorts) {
    const dst = `${dir}/builds/${s}`;
    if (existsSync(dst + "/index.html")) continue;
    if (!existsSync(`${root}/pool/${s}/index.html`)) { log("NO BUILD", s, "(see logs/build_" + name + ".txt)"); return null; }
    mkdirSync(dir + "/builds", { recursive: true });
    cpSync(`${root}/pool/${s}`, dst, { recursive: true });
  }
  log("pass", name, "base", shorts[0], "head", shorts[1], "plan", JSON.stringify(plan));
  const st = run("pwsh", ["-NoProfile", "-File", PHONE_PASS, "-Phase", "start", "-Base", shorts[0], "-Head", shorts[1], "-Out", dir, "-Reps", "1"], `${dir}/logs/start.txt`);
  if (st !== 0) { log("START FAILED", name, st); cleanup(name); return null; }
  const sc = run("node", [SCAN, dir + "/config.json"], `${dir}/logs/scan.out.txt`, { DIR: "scan", PLAN: JSON.stringify(plan), ITER: "60" });
  cleanup(name);
  if (sc !== 0) { log("SCAN FAILED", name, sc); return null; }
  const runs = JSON.parse(readFileSync(`${dir}/scan/results.json`, "utf8")).runs;
  const bad = runs.filter((r) => r.error);
  if (bad.length) { log("CELL ERRORS", name, bad.map((r) => `${r.link} ${r.build}: ${r.error}`).join(" | ")); return null; }
  return runs;
}
const med = (runs, build, link) => runs.filter((r) => r.build === build && r.link === link).map((r) => r.renderLoop && r.renderLoop.median).filter((v) => typeof v === "number");
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

const steps = (R.cfg.steps || []).map((s) => ({ prio: 0, ...s }));
const confirmLinks = R.cfg.confirmLinks || ["dense", "maxfab", "knot24"];
const isAfter = (s, v) => (s.up ? v > s.thr : v < s.thr);
const probes = [];
const confirmsDone = [];
const saveState = () => writeFileSync(root + "/bisect_state.json", JSON.stringify({ steps, probes }, null, 1));
log("bisect2 start; round", root, "; steps", steps.map((s) => `${s.id}(${s.lo},${s.hi}] ${s.link} thr ${s.thr} ${s.up ? "up" : "down"}`).join(" "), "; stop", stopAt ? stopAt.toTimeString().slice(0, 5) : "none", "stop2", stopAt2 ? stopAt2.toTimeString().slice(0, 5) : "none");
let n = 0, failed = false;
while (!failed) {
  const open = steps.filter((s) => s.hi - s.lo > 1);
  if (!open.length) break;
  if (stopAt && new Date() >= stopAt) { log("STOP time reached; open:", open.map((s) => `${s.id}(${s.lo},${s.hi}]`).join(" ")); break; }
  open.sort((a, b) => (b.prio || 0) - (a.prio || 0) || b.hi - b.lo - (a.hi - a.lo));
  let picks;
  const mid = (s) => (s.firstMid && !s.started ? s.firstMid : Math.floor((s.lo + s.hi) / 2));
  if (open.length >= 2) picks = [open[0], open[1]].map((s) => ({ s, idx: mid(s) }));
  else {
    const s = open[0], g = s.hi - s.lo;
    if (g >= 3) picks = [{ s, idx: s.lo + Math.floor(g / 3) }, { s, idx: s.lo + Math.floor((2 * g) / 3) }];
    else picks = [{ s, idx: s.lo + 1 }, { s: null, idx: s.hi }]; // a pair of builds is needed: the second is a filler, never measured
  }
  for (const p of picks) if (p.s) p.s.started = true;
  n++;
  const plan = picks.map((p, k) => (p.s ? [k === 0 ? "base" : "head", p.s.link] : null)).filter(Boolean);
  const runs = pass("d" + n, R.full(picks[0].idx), R.full(picks[1].idx), plan);
  if (!runs) { failed = true; break; }
  const thisPass = [];
  for (const [k, p] of picks.entries()) {
    if (!p.s) continue;
    const v = med(runs, k === 0 ? "base" : "head", p.s.link)[0];
    if (typeof v !== "number") { log("NO VALUE", p.s.id, "idx", p.idx, R.short(p.idx)); failed = true; break; }
    const after = isAfter(p.s, v);
    const pr = { step: p.s.id, idx: p.idx, sha: R.short(p.idx), link: p.s.link, value: v, after, pass: "d" + n };
    probes.push(pr);
    thisPass.push(pr);
    log("probe", p.s.id, "idx", p.idx, pr.sha, p.s.link, v, after ? "AFTER" : "before", "thr", p.s.thr);
  }
  if (failed) break;
  // Update the intervals; a step's two probes of one pass apply in ascending index order.
  const byStep = new Map();
  for (const pr of thisPass) { const s = steps.find((q) => q.id === pr.step); if (!byStep.has(s)) byStep.set(s, []); byStep.get(s).push(pr); }
  for (const [s, ps] of byStep) {
    ps.sort((a, b) => a.idx - b.idx);
    for (const pr of ps) {
      if (pr.idx <= s.lo || pr.idx >= s.hi) continue;
      if (pr.after) s.hi = pr.idx; else s.lo = pr.idx;
    }
    log("step", s.id, "now (", s.lo, R.short(s.lo), ",", s.hi, R.short(s.hi), "]");
  }
  saveState();
}
saveState();

// The confirms: ABBA, two runs a build, on each link.
const queue = [];
for (const c of R.cfg.confirms || steps.map((s) => ({ step: s.id }))) {
  if (c.step) {
    const s = steps.find((q) => q.id === c.step);
    if (!s || s.hi - s.lo !== 1) { log("no confirm for step", c.step, "(interval open or unknown)"); continue; }
    queue.push({ id: c.step, lo: R.full(s.lo), hi: R.full(s.hi), links: c.links || confirmLinks });
  } else queue.push({ id: c.id, lo: R.resolveRef(c.lo), hi: R.resolveRef(c.hi), links: c.links || confirmLinks });
}
let e = 0;
if (!failed) for (const c of queue) {
  if (stopAt2 && new Date() >= stopAt2) { log("STOP2 time: no confirm for", c.id); continue; }
  e++;
  const plan = [];
  for (const l of c.links) plan.push(["base", l], ["head", l], ["head", l], ["base", l]);
  const name = "e" + e;
  const runs = pass(name, c.lo, c.hi, plan);
  if (!runs) { failed = true; break; }
  const out = { id: c.id, pass: name, lo: c.lo.slice(0, 8), hi: c.hi.slice(0, 8), loSubject: R.subj(c.lo), hiSubject: R.subj(c.hi), links: {} };
  for (const l of c.links) {
    const lo = med(runs, "base", l), hi = med(runs, "head", l);
    const first = (b) => runs.find((r) => r.build === b && r.link === l && r.params);
    const pd = paramDiff(first("base") && first("base").params, first("head") && first("head").params);
    const glBad = runs.filter((r) => r.link === l && ((r.glLoad && r.glLoad.errs && r.glLoad.errs.length) || (r.glAfter && ((r.glAfter.errs && r.glAfter.errs.length) || r.glAfter.ctxLost)))).length;
    out.links[l] = { lo, hi, delta: Number((mean(hi) - mean(lo)).toFixed(1)), paramDiff: pd, glBad };
    log("confirm", c.id, l, "lo", out.lo, JSON.stringify(lo), "hi", out.hi, JSON.stringify(hi), "delta", out.links[l].delta, "paramDiff", JSON.stringify(pd), "gl", glBad ? "BAD" : "ok");
  }
  confirmsDone.push(out);
}
writeFileSync(root + "/bisect_summary.json", JSON.stringify({ steps: steps.map((s) => ({ ...s, loSha: R.short(s.lo), hiSha: R.short(s.hi), hiSubject: R.subj(R.full(s.hi)) })), probes, confirms: confirmsDone }, null, 1));
log("bisect2 done; failed =", failed);
