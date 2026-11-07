// S3f stage 8: whole-run shrink (nearest exposed vertex in the
// run); a fully covered run is one point on the covering outline.
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
function once(find, replace, label) {
  const n = text.split(find).length - 1;
  if (n !== 1) { console.error(label + ": found " + n); process.exit(1); }
  text = text.replace(find, replace);
}
const startA = "            // Per sub-stretch (between border intersection";
const endA = "            if (rid < 0 && seqSegs.length) rid = segRegion[pi][bi][seqSegs[0]] ?? -1;";
const si = text.indexOf(startA); const ei = text.indexOf(endA);
if (si < 0 || ei < 0 || ei <= si) { console.error("anchors", si, ei); process.exit(1); }
const mid = `            // Covered points shrink onto the nearest exposed
            // vertex of this run; a fully covered run is one
            // point on the covering outline. One piece throughout.
            const exp = exposed[pi][bi];
            const aligned = seqSegs.length === seqPts.length - 1;
            const segExp: boolean[] = [];
            for (let m = 0; m + 1 < seqPts.length; m++) segExp.push(aligned ? !!exp[seqSegs[m]] : true);
            const pushRunPt = (pt: BPt): void => { pts.push(pt.x, pt.y); const f = footFlat(pi, pt.s); cpts.push(f[0], f[1]); };
            let firstExp = -1; let lastExpEnd = -1;
            for (let m = 0; m < segExp.length; m++) if (segExp[m]) { if (firstExp < 0) firstExp = m; lastExpEnd = m; }
            if (firstExp < 0) {
              const segIdx = aligned && seqSegs.length ? seqSegs[0] : -1;
              if (segIdx >= 0 && collapseOk[pi][bi][segIdx]) { pts.push(collapseX[pi][bi][segIdx], collapseY[pi][bi][segIdx]); const f = footFlat(pi, seqPts[0].s); cpts.push(f[0], f[1]); s0 = seqPts[0].s; s1 = seqPts[0].s; }
              else if (seqPts.length) { pushRunPt(seqPts[0]); s0 = seqPts[0].s; s1 = seqPts[0].s; }
            } else {
              for (let m = 0; m < seqPts.length; m++) {
                const segBefore = m > 0 ? segExp[m - 1] : false;
                const segAfter = m < segExp.length ? segExp[m] : false;
                if (segBefore || segAfter) { pushRunPt(seqPts[m]); continue; }
                pushRunPt(seqPts[m - firstExp <= lastExpEnd + 1 - m ? firstExp : lastExpEnd + 1]);
              }
              if (seqPts.length) { s0 = seqPts[0].s; s1 = seqPts[seqPts.length - 1].s; }
            }
            `;
text = text.slice(0, si) + mid + text.slice(ei);
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log("stage8 applied");
