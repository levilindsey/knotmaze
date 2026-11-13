// K1362 s3: the clock check, observed. Reads the Pixel's GPU devfreq cur_freq (read only, world-readable on the
// GPU node; nothing is written, no input, no wake) every ~100 ms while k1362s3_phone.mjs runs a cfg, then splits
// the samples by bench (each bench's host t0/t1) and prints each bench's clock (median, p10, p90 MHz).
//   node .claude/probes/K1362/k1362s3_gpuclk.mjs <pass config.json> <label> <cfg json file>
// argv[2] is the pass's config.json (the watchdog matches it). Writes out/s3/gpuclk_<label>.json.
import { readFileSync, writeFileSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [cfgPath, label, benchCfg] = process.argv.slice(2);
const C = JSON.parse(readFileSync(cfgPath, "utf8"));
const node = execFileSync(C.adb, ["-s", C.serial, "shell", "ls -d /sys/class/devfreq/*gpu*"], { encoding: "utf8" }).trim().split(/\s+/)[0];
const samples = [];
const sampler = spawn(C.adb, ["-s", C.serial, "shell", `while true; do cat ${node}/cur_freq; sleep 0.1; done`]);
let buf = "";
sampler.stdout.on("data", (d) => {
  buf += d; const lines = buf.split(/\r?\n/); buf = lines.pop();
  for (const l of lines) if (/^\d+$/.test(l.trim())) samples.push([Date.now(), +l.trim() / 1e6]);
});
const idle0 = Date.now();
await new Promise((r) => setTimeout(r, 3000)); // idle baseline
const idle1 = Date.now();
const run = spawn(process.execPath, [join(here, "k1362s3_phone.mjs"), cfgPath, label, benchCfg], { stdio: "inherit" });
await new Promise((r) => run.on("exit", r));
sampler.kill();
const res = JSON.parse(readFileSync(join(here, `out/s3/phone_${label}.json`), "utf8"));
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const win = (t0, t1) => samples.filter(([t]) => t >= t0 && t <= t1).map(([, f]) => f);
const out = { label, node: node.split("/").pop(), idle: win(idle0, idle1), benches: [] };
const fmt = (a) => `${q(a, 0.5)} MHz (p10 ${q(a, 0.1)}, p90 ${q(a, 0.9)}, n ${a.length})`;
console.log(`idle: ${fmt(out.idle)}`);
for (const b of res.benches) {
  if (!b.t0) continue;
  const f = win(b.t0, b.t1);
  // the pass part of a bench (tables are built first): the last 60% of its window
  const g = win(b.t0 + 0.4 * (b.t1 - b.t0), b.t1);
  out.benches.push({ name: b.cfg.name, variants: b.cfg.variants, modes: b.cfg.modes, all: f, tail: g });
  const sc = Object.values(b.scenes)[0]; const v = b.cfg.variants[0]; const m = b.cfg.modes[0];
  console.log(`${b.cfg.name}: pass ${sc.pass[v][m].p50} ms | clock tail ${fmt(g)} | whole ${fmt(f)}`);
}
writeFileSync(join(here, `out/s3/gpuclk_${label}.json`), JSON.stringify(out));
