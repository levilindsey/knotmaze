// S3f stage 3: caps only at non-junction ends; runs/caps shrink
// covered points onto their own piece's exposed points (never
// another surface); passed ends take the short border between them.
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
function once(find, replace, label) {
  const n = text.split(find).length - 1;
  if (n !== 1) { console.error(label + ": found " + n + " for " + JSON.stringify(find.slice(0, 90))); process.exit(1); }
  text = text.replace(find, replace);
}
// Diagram caps: an open end joined to a junction by an END arm is
// capped by the junction, not by a cap piece. cap = capInfo index.
once(`  const caps: DiagramStructure["caps"] = [];
  scene.chains.forEach((c, pi) => { if (!c.closed) { caps.push({ pi, atEnd: false }); caps.push({ pi, atEnd: true }); } });`,
`  const caps: DiagramStructure["caps"] = [];
  const capInfoOf: number[] = [];
  scene.chains.forEach((c, pi) => {
    if (c.closed) return;
    for (const atEnd of [false, true]) {
      const infoIdx = capInfoOf.length; capInfoOf.push(infoIdx);
      const joined = arms.some((a) => {
        if (a.pi !== pi || a.kind !== "end") return false;
        const xa = scene.junctions[a.ji] && scene.junctions[a.ji].arms[a.ei];
        return xa ? (atEnd ? xa.s !== 0 : xa.s === 0) : false;
      });
      if (!joined) caps.push({ pi, atEnd, capInfo: infoIdx } as { pi: number; atEnd: boolean });
    }
  });`, "caps diagram");
// caps type carries capInfo index for the frame's cap table lookup.
once('  caps: { pi: number; atEnd: boolean }[];\n  stationsD:',
'  caps: { pi: number; atEnd: boolean; capInfo?: number }[];\n  stationsD:', "caps type");
once("  caps.forEach((cp, capIdx) => piecesD.push({ kind: \"cap\", chain: cp.pi, side: 0, corner: -1, interval: -1, cap: capIdx }));",
"  caps.forEach((cp) => piecesD.push({ kind: \"cap\", chain: cp.pi, side: 0, corner: -1, interval: -1, cap: cp.capInfo ?? -1 }));", "cap pieces");
// Restore the per-segment exposure table in frame mode (runs shrink
// on it; it no longer decides which pieces exist).
once("  const exposed: boolean[][][] = frameMode ? borders.map((bs) => bs.map((B) => new Array<boolean>(Math.max(0, B.pts.length - 1)).fill(false))) : borders.map((bs, pi) => bs.map((B, bi) => {",
"  const exposed: boolean[][][] = borders.map((bs, pi) => bs.map((B, bi) => {", "exposed restore");
// Runs: short-way fallback + own-border shrink for covered segments.
once(`          const passed = !fromPt || !toPt || seqPts.length < 2 || (plen > expLen + 4 * h && plen > 1.5 * expLen + 2 * h);
          if (passed) {`,
`          let passed = !fromPt || !toPt || seqPts.length < 2 || (plen > expLen + 4 * h && plen > 1.5 * expLen + 2 * h);
          if (passed && fromPt && toPt && ivD.aSt !== ivD.bSt) {
            const back = borderSeq(pi, side, fromRef.idx, toRef.idx, false);
            if (back.pts.length >= 2) {
              let blen = 0;
              for (let i = 1; i < back.pts.length; i++) blen += Math.hypot(back.pts[i].x - back.pts[i - 1].x, back.pts[i].y - back.pts[i - 1].y);
              if (blen < plen) { seqPts = back.pts; seqSegs = back.segs; plen = blen; passed = seqPts.length < 2; }
            }
          }
          if (passed) {`, "short way");
// After the normal (not passed) fill, shrink covered points. Replace
// the else branch that copies seqPts verbatim.
once(`          } else {
            for (const pt of seqPts) { pts.push(pt.x, pt.y); const f = footFlat(pi, pt.s); cpts.push(f[0], f[1]); }
            s0 = seqPts[0].s; s1 = seqPts[seqPts.length - 1].s;
            if (rid < 0 && seqSegs.length) rid = segRegion[pi][bi][seqSegs[0]] ?? -1;
          }`,
`          } else {
            // Covered segments shrink onto this run's own exposed
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
                const l = pts.length;
                if (l >= 2 && pts[l - 2] === pt.x && pts[l - 1] === pt.y) return;
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
            if (rid < 0 && seqSegs.length) rid = segRegion[pi][bi][seqSegs[0]] ?? -1;
          }`, "run shrink");
// Caps: one piece per cap; covered arc points shrink on the arc.
once(`        const ci = capInfos[dp.cap];
        if (!ci) continue;
        const pts: number[] = []; const cpts: number[] = [];
        for (const pt of ci.arc) { pts.push(pt.x, pt.y); cpts.push(ci.cx, ci.cy); }`,
`        const ci = capInfos[dp.cap];
        if (!ci) continue;
        const pts: number[] = []; const cpts: number[] = [];
        {
          const segExpC: boolean[] = [];
          for (let i = 0; i + 1 < ci.arc.length; i++) {
            const mx = (ci.arc[i].x + ci.arc[i + 1].x) / 2; const my = (ci.arc[i].y + ci.arc[i + 1].y) / 2;
            segExpC.push(!covering(mx, my, dp.chain, ci.station.cS));
          }
          const firstExpC = segExpC.indexOf(true);
          if (firstExpC < 0) { pts.push(ci.arc[0].x, ci.arc[0].y); cpts.push(ci.cx, ci.cy); }
          else {
            let lastExpEndC = -1;
            for (let m = 0; m < segExpC.length; m++) if (segExpC[m]) lastExpEndC = m;
            const pushCapPt = (pt: { x: number; y: number }): void => {
              const l = pts.length;
              if (l >= 2 && pts[l - 2] === pt.x && pts[l - 1] === pt.y) return;
              pts.push(pt.x, pt.y); cpts.push(ci.cx, ci.cy);
            };
            for (let m = 0; m < ci.arc.length; m++) {
              const segBefore = m > 0 ? segExpC[m - 1] : false;
              const segAfter = m < segExpC.length ? segExpC[m] : false;
              if (segBefore || segAfter) { pushCapPt(ci.arc[m]); continue; }
              pushCapPt(ci.arc[m <= firstExpC ? firstExpC : lastExpEndC + 1]);
            }
          }
        }`, "cap shrink");
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log("stage3 applied");
