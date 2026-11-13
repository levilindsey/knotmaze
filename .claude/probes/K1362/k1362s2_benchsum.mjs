// K1362 s2: one line per bench run (k1362s2_bench.mjs's JSON): build, scene, mode, then frameMs p50/p95
// at rest and mid-drag, and for rp=gf the GPU pass (net of the empty query), the table build on main,
// pixels shaded, and candidates per pixel.
//   node k1362s2_benchsum.mjs <bench.json>
import { readFileSync } from "node:fs";

const b = JSON.parse(readFileSync(process.argv[2], "utf8"));
const f = (s) => (s ? `${s.p50}/${s.p95}` : "-");
for (const r of b.runs) {
  const u = new URL(r.url);
  const build = u.port === "5373" ? "master" : "branch";
  const q = u.search.slice(1).split("&");
  const scene = q[0];
  const mode = (q.find((x) => x.startsWith("rp=")) ?? "look").replace("rp=", "");
  let line = `${build.padEnd(6)} ${scene.padEnd(22)} ${mode.padEnd(7)} rest ${f(r.rest?.frameMs).padEnd(11)} drag ${f(r.drag?.frameMs).padEnd(11)} iv ${f(r.drag?.intervalMs)}`;
  const g = r.drag?.gf;
  if (g) {
    const c = g.counts;
    line += ` | gpu ${f(g.gpu?.net)} (raw ${f(g.gpu?.raw)}, empty ${f(g.gpu?.empty)}, n ${g.gpu?.arrived}/${g.gpu?.passes}, dj ${g.gpu?.disjoint})`;
    line += ` | build ${f(g.buildTotalMs)} = exp ${f(g.exportMs)} tab ${f(g.tablesMs)} pack ${f(g.packMs)} up ${f(g.uploadMs)}`;
    line += ` | px ${g.px ? `${(g.px.p50 / 1e6).toFixed(2)}M` : "-"} | seg ${c ? `${c.segMean.toFixed(1)}/${c.segP95}` : "-"} k ${c ? `${c.kMean.toFixed(2)}/${c.kP95}` : "-"} live ${c && c.liveMean !== undefined ? `${c.liveMean.toFixed(1)}/${c.liveP95} on ${(c.livePx / 1e6).toFixed(2)}M` : "-"}`;
    line += ` | rebuilds ${g.rebuilds} passes ${g.passes}${g.fallback ? ` FALLBACK ${g.fallback}` : ""}`;
  }
  if (r.errors?.length) line += ` | errors ${r.errors.length}`;
  console.log(line);
}
