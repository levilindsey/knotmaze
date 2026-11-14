// K1362 s6 (from s5): the GPU clock beside every number (from k1362s3_gpuclk.mjs). Reads the Pixel's GPU devfreq cur_freq
// (read only; nothing is written, no input, no wake) every ~100 ms while k1362s13_phone.mjs runs a cfg, then puts
// each (scene, variant, mode) window's clock (median MHz) beside its time, minus the empty variant.
//   node .claude/probes/K1362/k1362s13_gpuclk.mjs <pass config.json> <label> <cfg json file>
// argv[2] is the pass's config.json (the watchdog matches it). Writes out/s13/gpuclk_<label>.json.
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
const run = spawn(process.execPath, [join(here, "k1362s13_phone.mjs"), cfgPath, label, benchCfg], { stdio: "inherit" });
await new Promise((r) => run.on("exit", r));
sampler.kill();
const res = JSON.parse(readFileSync(join(here, `out/s13/phone_${label}.json`), "utf8"));
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const win = (t0, t1) => samples.filter(([t]) => t >= t0 && t <= t1).map(([, f]) => f);
const out = { label, node: node.split("/").pop(), idle: win(idle0, idle1), rows: [] };
console.log(`idle clock ${q(out.idle, 0.5)} MHz`);
for (const b of res.benches) {
  const off = (b.clock || res.clock0 || { off: 0 }).off;
  for (const [sn, s] of Object.entries(b.scenes)) {
    for (const m of b.cfg.modes) {
      const e = s.pass.empty?.[m]?.p50 ?? 0;
      const cells = [];
      for (const v of b.cfg.variants) {
        const r = s.pass[v]; if (!r || !r[m]) { cells.push(`${v} -`); continue; }
        const w = r[m + "_t"]; const f = w ? win(w[0] - off, w[1] - off) : [];
        const row = { bench: b.cfg.name, scene: sn, mode: m, variant: v, p50: r[m].p50, p90: r[m].p90, net: +(r[m].p50 - e).toFixed(2), mhz: q(f, 0.5), mhzMin: q(f, 0), n: f.length, first: r.firstMs, err: r.glError };
        out.rows.push(row);
        cells.push(`${v} ${row.net}@${row.mhz}`);
      }
      console.log(`${b.cfg.name} ${sn} ${m}: ${cells.join(" ")}`);
    }
  }
}
writeFileSync(join(here, `out/s13/gpuclk_${label}.json`), JSON.stringify(out));