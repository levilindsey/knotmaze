// S3f stage 4: a run takes the border direction whose arc length
// matches the centre distance between its end features (diagram
// station order and frame cut order can differ for a crossing's
// two stations; the long way duplicated whole borders).
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
function once(find, replace, label) {
  const n = text.split(find).length - 1;
  if (n !== 1) { console.error(label + ": found " + n); process.exit(1); }
  text = text.replace(find, replace);
}
once(`          let seqPts: BPt[] = [];
          let seqSegs: number[] = [];
          if (ivD.aSt === ivD.bSt) { seqPts = B.pts.slice(); }
          else { const sq = borderSeq(pi, side, fromRef.idx, toRef.idx, true); seqPts = sq.pts; seqSegs = sq.segs; }
          const p = polys[pi];
          let expLen = 0;
          if (biv) expLen = biv.len; else { let d = stB.cS - stA.cS; if (p.closed && d <= 0) d += p.len; expLen = Math.max(0, d); }
          let plen = 0;
          for (let i = 1; i < seqPts.length; i++) plen += Math.hypot(seqPts[i].x - seqPts[i - 1].x, seqPts[i].y - seqPts[i - 1].y);
          let passed = !fromPt || !toPt || seqPts.length < 2 || (plen > expLen + 4 * h && plen > 1.5 * expLen + 2 * h);
          if (passed && fromPt && toPt && ivD.aSt !== ivD.bSt) {
            const back = borderSeq(pi, side, fromRef.idx, toRef.idx, false);
            if (back.pts.length >= 2) {
              let blen = 0;
              for (let i = 1; i < back.pts.length; i++) blen += Math.hypot(back.pts[i].x - back.pts[i - 1].x, back.pts[i].y - back.pts[i - 1].y);
              if (blen < plen) { seqPts = back.pts; seqSegs = back.segs; plen = blen; passed = seqPts.length < 2; }
            }
          }
          if (passed) {`,
`          let seqPts: BPt[] = [];
          let seqSegs: number[] = [];
          const p = polys[pi];
          let plen = 0;
          let passed = !fromPt || !toPt;
          if (ivD.aSt === ivD.bSt) {
            seqPts = B.pts.slice();
            for (let i = 1; i < seqPts.length; i++) plen += Math.hypot(seqPts[i].x - seqPts[i - 1].x, seqPts[i].y - seqPts[i - 1].y);
          } else if (fromPt && toPt) {
            const fwd = borderSeq(pi, side, fromRef.idx, toRef.idx, true);
            const back = borderSeq(pi, side, fromRef.idx, toRef.idx, false);
            const lenOf = (pts: BPt[]): number => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return L; };
            const plenF = lenOf(fwd.pts); const plenB = lenOf(back.pts);
            let dF = toRef.s - fromRef.s;
            if (p.closed && p.len > 0) dF = ((dF % p.len) + p.len) % p.len;
            const dB = p.closed && p.len > 0 ? p.len - dF : -dF;
            const pickBack = Math.abs(plenB - Math.abs(dB)) < Math.abs(plenF - Math.abs(dF));
            seqPts = pickBack ? back.pts : fwd.pts; seqSegs = pickBack ? back.segs : fwd.segs; plen = pickBack ? plenB : plenF;
            const dPick = Math.abs(pickBack ? dB : dF);
            passed = seqPts.length < 2 || (plen > dPick + 4 * h && plen > 1.5 * dPick + 2 * h);
          }
          if (passed) {`, "direction");
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log("stage4 applied");
