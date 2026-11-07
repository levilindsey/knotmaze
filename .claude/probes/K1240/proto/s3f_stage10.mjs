// S3f stage 10: covered run vertices are dropped (the piece stays
// one piece; its polyline chords across the covered gap), instead
// of being repeated at an exposed vertex.
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
function once(find, replace, label) {
  const n = text.split(find).length - 1;
  if (n !== 1) { console.error(label + ": found " + n); process.exit(1); }
  text = text.replace(find, replace);
}
once(`                if (segBefore || segAfter) { pushRunPt(seqPts[m]); continue; }
                pushRunPt(seqPts[m - firstExp <= lastExpEnd + 1 - m ? firstExp : lastExpEnd + 1]);`,
`                if (segBefore || segAfter) pushRunPt(seqPts[m]);`, "drop covered");
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log("stage10 applied");
