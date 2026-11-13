// K1362 s3: prints a run file (out/s3/desk_*.json or phone_*.json) compactly: per bench and scene the pixels, the
// candidates, the table build, and each variant's pass by mode (p50/p90, ms). "-e" = minus the empty variant's p50.
//   node .claude/probes/K1362/k1362s3_sum.mjs <run.json> [<run.json> ...]
import { readFileSync } from "node:fs";

const f2 = (x) => (x == null || Number.isNaN(x) ? "-" : (+x).toFixed(2));
for (const file of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(file, "utf8"));
  console.log(`== ${file.split(/[\\/]/).pop()} ${j.error ? "ERROR " + j.error : ""}`);
  for (const b of j.benches) {
    const i = b.info;
    console.log(`  ${b.cfg.w}x${b.cfg.h} fit ${b.cfg.fit} | ${String(i.renderer).slice(0, 60)} | timer ${i.timerQuery} | th ${JSON.stringify(b.thermalBefore ?? "")} -> ${JSON.stringify(b.thermalAfter ?? "")}`);
    for (const [name, s] of Object.entries(b.scenes)) {
      const c = s.counts ?? {};
      const T = s.tables;
      console.log(`  ${name}: px ${(s.px / 1e6).toFixed(3)}M seg/px ${c.segMean ?? "-"} (live ${c.liveMean ?? "-"} on ${c.livePx ? (c.livePx / 1e6).toFixed(3) + "M" : "-"}) k/px ${c.kMean ?? "-"} | tables ${f2(T.total.p50)}/${f2(T.total.p90)} (vtx ${f2(T.vtx.p50)} pins ${f2(T.pins.p50)} arms ${f2(T.arms.p50)} corners ${f2(T.corners.p50)} bins ${f2(T.bins.p50)}) pack ${f2(s.pack.p50)} upload ${f2(s.upload.p50)} glErr ${s.glError}`);
      const e = s.pass.empty ?? {};
      for (const [vn, r] of Object.entries(s.pass)) {
        const cells = Object.entries(r).filter(([k]) => !/_early|_rafMs/.test(k)).map(([k, v]) => {
          const ee = e[k]?.p50 ?? 0;
          return `${k} ${f2(v.p50)}/${f2(v.p90)}${vn === "empty" ? "" : ` (-e ${f2(v.p50 - ee)})`}`;
        });
        const extra = ["frame1", "busy"].filter((k) => r[k + "_early"]).map((k) => `${k} early ${f2(r[k + "_early"].p50)} raf ${f2(r[k + "_rafMs"].p50)}`);
        console.log(`    ${vn.padEnd(6)} ${cells.join("  ")}  | ${extra.join("  ")}`);
      }
    }
  }
  if (j.drag) { const p = j.drag.parts; console.log(`  drag: ${j.drag.frames} frames x ${j.drag.reps}: total ${f2(p.total.p50)}/${f2(p.total.p90)} (vtx ${f2(p.vtx.p50)} pins ${f2(p.pins.p50)} arms ${f2(p.arms.p50)} corners ${f2(p.corners.p50)} bins ${f2(p.bins.p50)}) wall ${f2(p.wall.p50)}/${f2(p.wall.p90)}`); }
  if (j.engine && Object.keys(j.engine).length) for (const [w, r] of Object.entries(j.engine)) {
    if (!r || !r.parts) { console.log(`  engine ${w}: ${JSON.stringify(r)}`); continue; }
    const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
    console.log(`  engine ${w}: ` + Object.entries(r.parts).map(([k, v]) => `${k} ${q(v, 0.5).toFixed(1)}/${q(v, 0.95).toFixed(1)}`).join("  "));
  }
}
