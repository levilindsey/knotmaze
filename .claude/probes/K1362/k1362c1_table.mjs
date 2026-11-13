// K1362 c1: one row per run from k1362c1_bench.mjs outputs (k1362c1_run.ps1's step files).
//   node .claude/probes/K1362/k1362c1_table.mjs <dir> [step...]   (default steps: before after thread)
// Columns (drag unless marked): main = rp=gf's main CPU per frame (export+tables+pack+upload on master;
// gather+post+pack+upload on the branch), per rebuild p50; build = the off-main build (worker) p50,
// export / tables p50 wherever they ran; phys = the physics worker's ms per worker frame (grows with main's
// frame length: a longer frame grants more sim), ms per substep, ms per wall second, and sim/wall;
// iv = frame interval p50/p95 (rest p50); gpu = the pass's net GPU ms p50; lat = post to reply p50.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [, , dir, ...rest] = process.argv;
const steps = rest.length ? rest : ["before", "after", "thread"];
const NAMES = { "b.FMKB4DIQ": "def", "3.FGH1HtvQeDjm6e4BII": "muse_hash", "p9ar6.FMKB4DIQ": "fat" };
const p = (s, k = "p50") => (s && s[k] !== undefined ? s[k] : "-");
const rows = [["step", "link", "rp", "main/frame", "main/rebuild", "build", "export", "tables", "phys ms/wf", "ms/sub", "ms/s", "sim/wall", "iv p50/p95", "rest iv", "gpu", "lat", "n"]];
for (const step of steps) {
  const f = join(dir, `${step}.json`);
  if (!existsSync(f)) continue;
  for (const r of JSON.parse(readFileSync(f, "utf8")).runs) {
    const q = r.url.split("?")[1];
    const link = NAMES[q.split("&")[0]] ?? q.split("&")[0];
    const d = r.drag ?? {}, g = d.gf, ph = d.phys ?? {};
    rows.push([
      step, link, q.includes("rp=gf") ? "gf" : "look",
      g ? g.mainPerFrame : "-", g ? p(g.mainPerRebuild) : "-", g ? p(g.workMs) : "-",
      g ? p(g.exportMs) : "-", g ? p(g.tablesMs) : "-",
      ph.msPerWorkerFrame ?? "-", ph.substeps ? +(ph.stepMs / ph.substeps).toFixed(2) : "-", ph.msPerSec ?? "-", ph.simPerWall ?? "-",
      `${p(d.intervalMs)}/${p(d.intervalMs, "p95")}`, p(r.rest?.intervalMs),
      g?.gpu ? p(g.gpu.net) : "-", g ? p(g.latencyMs) : "-",
      d.intervalMs ? d.intervalMs.n : "-",
    ]);
    if (r.errors?.length) console.log(`  ${step} ${link}: errors ${JSON.stringify(r.errors).slice(0, 200)}`);
  }
}
const w = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
for (const r of rows) console.log(r.map((c, i) => String(c).padEnd(w[i])).join("  "));
