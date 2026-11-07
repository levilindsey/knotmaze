// S3f stage 2: frame() emits only structure()'s pieces; no covered pass.
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
function once(find, replace, label) {
  const n = text.split(find).length - 1;
  if (n !== 1) { console.error(label + ": found " + n + " for " + JSON.stringify(find.slice(0, 90))); process.exit(1); }
  text = text.replace(find, replace);
}
once("// K1240 S3c: decide once, follow the frame, cheaply.",
"// K1240 S3f: structure() emits the piece list from the diagram alone\n// (runs between diagram stations, one arc per corner, one cap per\n// open end); frame() computes points only for those pieces.\n// K1240 S3c: decide once, follow the frame, cheaply.", "header");
once("  const exposed: boolean[][][] = borders.map((bs, pi) => bs.map((B, bi) => {",
"  const exposed: boolean[][][] = frameMode ? borders.map((bs) => bs.map((B) => new Array<boolean>(Math.max(0, B.pts.length - 1)).fill(false))) : borders.map((bs, pi) => bs.map((B, bi) => {", "exposed");
once("  if (frameMode) {\n    // Collapse points for covered segments: the covering chain's",
"  if (false) {\n    // Collapse points for covered segments: the covering chain's", "collapse skip");
const footAnchor = "  const footFlat = (pi: number, s: number): [number, number] => { const a = pointAt(polys[pi], s); return [a.x, a.y]; };";
const block = footAnchor + `
  if (frameMode && dg) {
    // S3f: points only for structure()'s pieces. A run's points are
    // its border between its two end features; when the ends have
    // passed each other the run is one point where they met (the
    // ends' midpoint). No pass decides whether a border is covered.
    const ivByKeys = new Map<string, Interval>();
    for (const iv of intervals) ivByKeys.set(iv.A.key + ">" + iv.B.key, iv);
    for (const dp of dg.piecesD) {
      if (dp.kind === "run") {
        const ivD = dg.intervalsD[dp.interval];
        const keyA = dg.stationsD[ivD.aSt].key; const keyB = dg.stationsD[ivD.bSt].key;
        const stA = stationByKey.get(keyA); const stB = stationByKey.get(keyB);
        const pi = dp.chain; const side = dp.side; const bi = bIdx(side);
        let pts: number[] = []; let cpts: number[] = []; let s0 = 0; let s1 = 0; let rid = -1;
        const biv = ivByKeys.get(keyA + ">" + keyB);
        if (biv && biv.region >= 0) rid = biv.region;
        if (!stA || !stB) {
          const sKey = dg.stationsD[ivD.aSt].sKey;
          const p = polys[pi];
          const sFb = sKey <= -1e11 ? p.s0 : sKey >= 1e11 ? p.s0 + p.len : sKey;
          const bp = borderPointAt(pi, side, sFb);
          pts = [bp.x, bp.y]; const f = footFlat(pi, sFb); cpts = [f[0], f[1]]; s0 = sFb; s1 = sFb;
        } else {
          const fromRef = side === 1 ? stA.left : stA.right;
          const toRef = side === 1 ? stB.left : stB.right;
          const B = borders[pi][bi];
          const fromPt = B.pts[Math.min(B.pts.length - 1, Math.max(0, fromRef.idx))];
          const toPt = B.pts[Math.min(B.pts.length - 1, Math.max(0, toRef.idx))];
          let seqPts: BPt[] = [];
          let seqSegs: number[] = [];
          if (ivD.aSt === ivD.bSt) { seqPts = B.pts.slice(); }
          else { const sq = borderSeq(pi, side, fromRef.idx, toRef.idx, true); seqPts = sq.pts; seqSegs = sq.segs; }
          const p = polys[pi];
          let expLen = 0;
          if (biv) expLen = biv.len; else { let d = stB.cS - stA.cS; if (p.closed && d <= 0) d += p.len; expLen = Math.max(0, d); }
          let plen = 0;
          for (let i = 1; i < seqPts.length; i++) plen += Math.hypot(seqPts[i].x - seqPts[i - 1].x, seqPts[i].y - seqPts[i - 1].y);
          const passed = !fromPt || !toPt || seqPts.length < 2 || (plen > expLen + 4 * h && plen > 1.5 * expLen + 2 * h);
          if (passed) {
            const mx = fromPt && toPt ? (fromPt.x + toPt.x) / 2 : fromPt ? fromPt.x : toPt ? toPt.x : 0;
            const my = fromPt && toPt ? (fromPt.y + toPt.y) / 2 : fromPt ? fromPt.y : toPt ? toPt.y : 0;
            pts = [mx, my]; const f = footFlat(pi, fromRef.s); cpts = [f[0], f[1]]; s0 = fromRef.s; s1 = fromRef.s;
          } else {
            for (const pt of seqPts) { pts.push(pt.x, pt.y); const f = footFlat(pi, pt.s); cpts.push(f[0], f[1]); }
            s0 = seqPts[0].s; s1 = seqPts[seqPts.length - 1].s;
            if (rid < 0 && seqSegs.length) rid = segRegion[pi][bi][seqSegs[0]] ?? -1;
          }
        }
        const piece: OutlinePiece = { kind: "run", chain: pi, side, s0, s1, pts, cpts, region: rid, corner: -1 };
        pieces.push(piece);
        if (rid >= 0 && regions[rid]) regions[rid].pieces.push(pieces.length - 1);
      } else if (dp.kind === "arc") {
        const cw = cornerWork[dp.corner];
        if (!cw) continue;
        const rid = junctionRegion.get(cw.ji) ?? -1;
        let pts: number[] = []; let cpts: number[] = [];
        if (cw.ok && cw.r > 1e-9) {
          const aA = Math.atan2(cw.tay - cw.qy, cw.tax - cw.qx);
          let da = Math.atan2(cw.tby - cw.qy, cw.tbx - cw.qx) - aA;
          while (da > Math.PI) da -= 2 * Math.PI;
          while (da < -Math.PI) da += 2 * Math.PI;
          const steps = Math.max(1, Math.ceil(Math.abs(da) / (Math.PI / 16)));
          for (let s = 0; s <= steps; s++) { const a = aA + (da * s) / steps; pts.push(cw.qx + cw.r * Math.cos(a), cw.qy + cw.r * Math.sin(a)); cpts.push(cw.qx, cw.qy); }
        } else { pts = [cw.qx, cw.qy]; cpts = [cw.qx, cw.qy]; }
        const piece: OutlinePiece = { kind: "arc", chain: cw.aChain, side: 0, s0: cw.sA, s1: cw.sB, pts, cpts, region: rid, corner: dp.corner };
        pieces.push(piece);
        if (rid >= 0 && regions[rid]) regions[rid].pieces.push(pieces.length - 1);
      } else {
        const ci = capInfos[dp.cap];
        if (!ci) continue;
        const pts: number[] = []; const cpts: number[] = [];
        for (const pt of ci.arc) { pts.push(pt.x, pt.y); cpts.push(ci.cx, ci.cy); }
        const piece: OutlinePiece = { kind: "cap", chain: dp.chain, side: 0, s0: ci.station.cS, s1: ci.station.cS, pts, cpts, region: -1, corner: -1 };
        pieces.push(piece);
      }
    }
  }`;
once(footAnchor, block, "diagram pieces");
once("      const exp = exposed[pi][bi];\n      if (frameMode) {",
"      const exp = exposed[pi][bi];\n      if (frameMode) { return; }\n      if (false) {", "old frame runs off");
once("  cornerWork.forEach((cw, ci) => {",
"  cornerWork.forEach((cw, ci) => {\n    if (frameMode) return;", "old arcs off");
once("  for (let capIdx = 0; capIdx < capInfos.length; capIdx++) { const ci = capInfos[capIdx];",
"  for (let capIdx = 0; capIdx < capInfos.length; capIdx++) { const ci = capInfos[capIdx];\n    if (frameMode) continue;", "old caps off");
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log("stage2 applied");
