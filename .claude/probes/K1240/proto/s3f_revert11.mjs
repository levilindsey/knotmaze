// Revert stage 11 (gap collapse points measured worse).
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
const find = `              let gapPushed = false;
              for (let m = 0; m < seqPts.length; m++) {
                const segBefore = m > 0 ? segExp[m - 1] : false;
                const segAfter = m < segExp.length ? segExp[m] : false;
                if (segBefore || segAfter) { pushRunPt(seqPts[m]); gapPushed = false; continue; }
                if (!gapPushed && aligned && m < seqSegs.length && collapseOk[pi][bi][seqSegs[m]]) {
                  pts.push(collapseX[pi][bi][seqSegs[m]], collapseY[pi][bi][seqSegs[m]]);
                  const f = footFlat(pi, seqPts[m].s); cpts.push(f[0], f[1]);
                  gapPushed = true;
                }
              }`;
const rep = `              for (let m = 0; m < seqPts.length; m++) {
                const segBefore = m > 0 ? segExp[m - 1] : false;
                const segAfter = m < segExp.length ? segExp[m] : false;
                if (segBefore || segAfter) pushRunPt(seqPts[m]);
              }`;
if (text.split(find).length - 1 !== 1) { console.error("anchor fail"); process.exit(1); }
text = text.replace(find, rep);
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log("stage11 reverted");
