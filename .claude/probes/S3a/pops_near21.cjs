const fs = require("fs");
const [run, x, y, rad, t0, t1, ...tags] = process.argv.slice(2);
for (const t of tags) {
  const J = JSON.parse(fs.readFileSync(`.claude/probes/S3a/cmpdir19/${t}/${run}.json`, "utf8"));
  const out = [];
  J.transitions.forEach((T, i) => { if (i < +t0 || i > +t1) return; for (const p of T.pops) { const d = Math.hypot(p.cx - x, p.cy - y); if (d <= +rad) { const e = p.event >= 0 && T.events ? T.events[p.event] : null; out.push(`t${i} (${Math.round(p.cx)},${Math.round(p.cy)}) +${p.gain}/-${p.loss} ${p.cause} ${e ? (e.key ?? e.id ?? JSON.stringify(e).slice(0, 60)) : ""}`); } } });
  console.log(`${t}: ${out.join(" | ")}`);
}