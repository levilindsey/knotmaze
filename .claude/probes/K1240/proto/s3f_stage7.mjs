// S3f stage 7: inside a fixed run, shrink per sub-stretch (between
// border intersection vertices); a fully covered sub-stretch is one
// point on the covering outline (the S3e collapse table, restored);
// failed arcs collapse onto a neighbouring solved corner's tangent.
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
function once(find, replace, label) {
  const n = text.split(find).length - 1;
  if (n !== 1) { console.error(label + ": found " + n); process.exit(1); }
  text = text.replace(find, replace);
}
once("  if (false) {\n    // Collapse points for covered segments: the covering chain's",
"  if (frameMode) {\n    // Collapse points for covered segments: the covering chain's", "collapse restore");
once(`            // Covered segments shrink onto this run's own exposed
            // border points; a fully covered run is one point at
            // its first end feature. Nothing is parked elsewhere.
            const exp = exposed[pi][bi];
            const segExp: boolean[] = [];
            for (let m = 0; m + 1 < seqPts.length; m++) segExp.push(seqSegs.length === seqPts.length - 1 ? !!exp[seqSegs[m]] : true);
            const firstExp = segExp.indexOf(true);
            if (firstExp < 0) {
              pts = [seqPts[0].x, seqPts[0].y]; const f = footFlat(pi, seqPts[0].s); cpts = [f[0], f[1]]; s0 = seqPts[0].s; s1 = seqPts[0].s;
            } else {
              let lastExpEnd = -1;
              for (let m = 0; m < segExp.length; m++) if (segExp[m]) lastExpEnd = m;
              const pushRunPt = (pt: BPt): void => {
                pts.push(pt.x, pt.y); const f = footFlat(pi, pt.s); cpts.push(f[0], f[1]);
              };
              for (let m = 0; m < seqPts.length; m++) {
                const segBefore = m > 0 ? segExp[m - 1] : false;
                const segAfter = m < segExp.length ? segExp[m] : false;
                if (segBefore || segAfter) { pushRunPt(seqPts[m]); continue; }
                pushRunPt(seqPts[m <= firstExp ? firstExp : lastExpEnd + 1]);
              }
              s0 = seqPts[0].s; s1 = seqPts[seqPts.length - 1].s;
            }
            if (rid < 0 && seqSegs.length) rid = segRegion[pi][bi][seqSegs[0]] ?? -1;`,
`            // Per sub-stretch (between border intersection
            // vertices): exposed points draw in order, covered
            // points shrink onto the sub-stretch's own exposed
            // points, a fully covered sub-stretch is one point on
            // the covering outline. The run stays one piece.
            const exp = exposed[pi][bi];
            const aligned = seqSegs.length === seqPts.length - 1;
            const segExp: boolean[] = [];
            for (let m = 0; m + 1 < seqPts.length; m++) segExp.push(aligned ? !!exp[seqSegs[m]] : true);
            const bounds: number[] = [0];
            for (let m = 1; m + 1 < seqPts.length; m++) { const k = seqPts[m].rec ? seqPts[m].rec.k : -1; if (k === 3 || k === 4) bounds.push(m); }
            bounds.push(seqPts.length - 1);
            const pushRunPt = (pt: BPt): void => { pts.push(pt.x, pt.y); const f = footFlat(pi, pt.s); cpts.push(f[0], f[1]); };
            for (let bi2 = 0; bi2 + 1 < bounds.length; bi2++) {
              const a = bounds[bi2]; const b = bounds[bi2 + 1];
              if (b < a) continue;
              let firstExp = -1; let lastExpEnd = -1;
              for (let m = a; m < b; m++) if (segExp[m]) { if (firstExp < 0) firstExp = m; lastExpEnd = m; }
              if (firstExp < 0) {
                const segIdx = aligned && a < seqSegs.length ? seqSegs[a] : -1;
                if (segIdx >= 0 && collapseOk[pi][bi][segIdx]) { pts.push(collapseX[pi][bi][segIdx], collapseY[pi][bi][segIdx]); const f = footFlat(pi, seqPts[a].s); cpts.push(f[0], f[1]); }
                else pushRunPt(seqPts[a]);
                continue;
              }
              for (let m = a; m <= b; m++) {
                const segBefore = m > a ? segExp[m - 1] : false;
                const segAfter = m < b ? segExp[m] : false;
                if (segBefore || segAfter) { pushRunPt(seqPts[m]); continue; }
                pushRunPt(seqPts[m <= firstExp ? firstExp : lastExpEnd + 1]);
              }
            }
            if (seqPts.length) { s0 = seqPts[0].s; s1 = seqPts[seqPts.length - 1].s; }
            if (rid < 0 && seqSegs.length) rid = segRegion[pi][bi][seqSegs[0]] ?? -1;`, "sub-stretch shrink");
once("        } else { pts = [cw.qx, cw.qy]; cpts = [cw.qx, cw.qy]; }",
`        } else if (!cw.ok) {
          let ax = cw.qx; let ay = cw.qy;
          for (const nci of [dp.corner - 1, dp.corner + 1]) {
            const nc = cornerWork[nci];
            if (!nc || nc.ji !== cw.ji || !nc.ok || !(nc.r > 1e-9)) continue;
            if (nc.aArm === cw.bArm) { ax = nc.tax; ay = nc.tay; break; }
            if (nc.bArm === cw.aArm) { ax = nc.tbx; ay = nc.tby; break; }
          }
          pts = [ax, ay]; cpts = [cw.qx, cw.qy];
        } else { pts = [cw.qx, cw.qy]; cpts = [cw.qx, cw.qy]; }`, "arc neighbour");
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log("stage7 applied");
