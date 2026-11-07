// S3f stage 6: keep shrunk points as repeated vertices (zero-length
// segments) instead of deduping them into long chords across the
// covered gap; the exact check samples chord midpoints.
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
function once(find, replace, label) {
  const n = text.split(find).length - 1;
  if (n !== 1) { console.error(label + ": found " + n); process.exit(1); }
  text = text.replace(find, replace);
}
once(`              const pushRunPt = (pt: BPt): void => {
                const l = pts.length;
                if (l >= 2 && pts[l - 2] === pt.x && pts[l - 1] === pt.y) return;
                pts.push(pt.x, pt.y); const f = footFlat(pi, pt.s); cpts.push(f[0], f[1]);
              };`,
`              const pushRunPt = (pt: BPt): void => {
                pts.push(pt.x, pt.y); const f = footFlat(pi, pt.s); cpts.push(f[0], f[1]);
              };`, "run dedupe off");
once(`            const pushCapPt = (pt: { x: number; y: number }): void => {
              const l = pts.length;
              if (l >= 2 && pts[l - 2] === pt.x && pts[l - 1] === pt.y) return;
              pts.push(pt.x, pt.y); cpts.push(ci.cx, ci.cy);
            };`,
`            const pushCapPt = (pt: { x: number; y: number }): void => {
              pts.push(pt.x, pt.y); cpts.push(ci.cx, ci.cy);
            };`, "cap dedupe off");
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log("stage6 applied");
