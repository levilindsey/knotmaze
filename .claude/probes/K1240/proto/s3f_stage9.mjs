// S3f stage 9: fully covered run without a covering collapse
// point lands on its own border's nearest exposed segment midpoint.
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
function once(find, replace, label) {
  const n = text.split(find).length - 1;
  if (n !== 1) { console.error(label + ": found " + n); process.exit(1); }
  text = text.replace(find, replace);
}
once("              else if (seqPts.length) { pushRunPt(seqPts[0]); s0 = seqPts[0].s; s1 = seqPts[0].s; }",
`              else if (seqPts.length) {
                let bx = seqPts[0].x; let by = seqPts[0].y; let bd = Infinity;
                const expB = exposed[pi][bi]; const BP = borders[pi][bi].pts;
                for (let q = 0; q < expB.length; q++) { if (!expB[q]) continue; const cx2 = (BP[q].x + BP[q + 1].x) / 2; const cy2 = (BP[q].y + BP[q + 1].y) / 2; const d = (cx2 - seqPts[0].x) * (cx2 - seqPts[0].x) + (cy2 - seqPts[0].y) * (cy2 - seqPts[0].y); if (d < bd) { bd = d; bx = cx2; by = cy2; } }
                pts.push(bx, by); const f = footFlat(pi, seqPts[0].s); cpts.push(f[0], f[1]); s0 = seqPts[0].s; s1 = seqPts[0].s;
              }`, "own border collapse");
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log("stage9 applied");
