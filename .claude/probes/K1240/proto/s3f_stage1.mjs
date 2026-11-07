// S3f stage 1: DiagramStructure gains the fixed piece list; diagramOf
// emits stations/intervals/pieces from the diagram alone.
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
function once(find, replace, label) {
  const n = text.split(find).length - 1;
  if (n !== 1) { console.error(label + ": found " + n); process.exit(1); }
  text = text.replace(find, replace);
}
once("export interface DiagramStructure {",
`export interface DiagramStation { pi: number; key: string; kind: string; sKey: number; crossing: number; arm: number }
export interface DiagramInterval { pi: number; aSt: number; bSt: number; discard: boolean }
export interface DiagramPiece { kind: PieceKind; chain: number; side: number; corner: number; interval: number; cap: number }
export interface DiagramStructure {`, "interfaces");
once("  caps: { pi: number; atEnd: boolean }[];\n}",
`  caps: { pi: number; atEnd: boolean }[];
  stationsD: DiagramStation[];
  intervalsD: DiagramInterval[];
  piecesD: DiagramPiece[];
}`, "dg fields");
const startAnchor = '  const caps: DiagramStructure["caps"] = [];';
const endAnchor = "    arms, armsOfJ, corners, groupOfJ, caps,\n  };\n}";
const si = text.indexOf(startAnchor);
const ei = text.indexOf(endAnchor);
if (si < 0 || ei < 0 || ei <= si) { console.error("diagramOf anchors", si, ei); process.exit(1); }
const mid = `  const caps: DiagramStructure["caps"] = [];
  scene.chains.forEach((c, pi) => { if (!c.closed) { caps.push({ pi, atEnd: false }); caps.push({ pi, atEnd: true }); } });
  // S3f: the piece list is the diagram's. Stations are the diagram
  // features that delimit runs (crossing cuts, junction arms, open
  // ends, the closed seam) in the builder's key order; sKey orders
  // them along their chain from the scene's own s data (which pass
  // and root order, never a chain point coordinate).
  const stationsD: DiagramStation[] = [];
  scene.crossings.forEach((x, xi) => {
    const aPi = idxOf.get(x.a.chain); const bPi = idxOf.get(x.b.chain);
    if (aPi === undefined || bPi === undefined) return;
    const underPi = x.over === "a" ? bPi : aPi;
    const overPi = x.over === "a" ? aPi : bPi;
    const sUnder = x.over === "a" ? x.b.s : x.a.s;
    const sOver = x.over === "a" ? x.a.s : x.b.s;
    for (const oSide of [1, -1]) stationsD.push({ pi: underPi, key: "x" + xi + "|" + oSide, kind: "cross", sKey: sUnder, crossing: xi, arm: -1 });
    for (const uSide of [1, -1]) stationsD.push({ pi: overPi, key: "xo" + xi + "|" + uSide, kind: "crossOver", sKey: sOver, crossing: xi, arm: -1 });
  });
  arms.forEach((a, ai) => {
    const j = scene.junctions[a.ji];
    stationsD.push({ pi: a.pi, key: "j" + a.ji + "|a" + ai, kind: "junction", sKey: j && j.arms[a.ei] ? j.arms[a.ei].s : 0, crossing: -1, arm: ai });
  });
  scene.chains.forEach((c, pi) => {
    if (c.closed) stationsD.push({ pi, key: "seam" + pi, kind: "seam", sKey: 0, crossing: -1, arm: -1 });
    else {
      stationsD.push({ pi, key: "cap" + pi + "|0", kind: "capStart", sKey: -1e12, crossing: -1, arm: -1 });
      stationsD.push({ pi, key: "cap" + pi + "|1", kind: "capEnd", sKey: 1e12, crossing: -1, arm: -1 });
    }
  });
  const intervalsD: DiagramInterval[] = [];
  const perChainIntervals: number[][] = scene.chains.map(() => []);
  scene.chains.forEach((c, pi) => {
    const list = stationsD.map((s, i) => ({ s, i })).filter((q) => q.s.pi === pi).sort((a, b) => a.s.sKey - b.s.sKey).map((q) => q.i);
    const m = list.length;
    const isDiscard = (ia: number, ib: number): boolean => {
      const A = stationsD[ia]; const B = stationsD[ib];
      if (A.kind === "cross" && B.kind === "cross" && A.crossing >= 0 && A.crossing === B.crossing) return true;
      if (A.kind === "junction" && B.kind === "junction") {
        const a1 = arms[A.arm]; const a2 = arms[B.arm];
        if (a1 && a2 && a1.ji === a2.ji && a1.kind === "through" && a2.kind === "through") {
          const xa = scene.junctions[a1.ji] && scene.junctions[a1.ji].arms[a1.ei];
          const xb = scene.junctions[a2.ji] && scene.junctions[a2.ji].arms[a2.ei];
          if (xa && xb && xa.s === xb.s) return true;
        }
      }
      const jst = A.kind === "junction" ? A : B.kind === "junction" ? B : null;
      const cst = A.kind.startsWith("cap") ? A : B.kind.startsWith("cap") ? B : null;
      if (jst && cst && jst.pi === cst.pi) { const ja = arms[jst.arm]; if (ja && ja.kind === "end") return true; }
      return false;
    };
    if (c.closed) {
      if (m === 1) { perChainIntervals[pi].push(intervalsD.length); intervalsD.push({ pi, aSt: list[0], bSt: list[0], discard: false }); }
      else for (let k = 0; k < m; k++) { const ia = list[k]; const ib = list[(k + 1) % m]; perChainIntervals[pi].push(intervalsD.length); intervalsD.push({ pi, aSt: ia, bSt: ib, discard: isDiscard(ia, ib) }); }
    } else {
      for (let k = 0; k + 1 < m; k++) { const ia = list[k]; const ib = list[k + 1]; perChainIntervals[pi].push(intervalsD.length); intervalsD.push({ pi, aSt: ia, bSt: ib, discard: isDiscard(ia, ib) }); }
    }
  });
  const piecesD: DiagramPiece[] = [];
  scene.chains.forEach((c, pi) => {
    for (const side of [1, -1]) for (const gi of perChainIntervals[pi]) { if (intervalsD[gi].discard) continue; piecesD.push({ kind: "run", chain: pi, side, corner: -1, interval: gi, cap: -1 }); }
  });
  corners.forEach((dc, ci) => { const a = arms[dc.aArm]; piecesD.push({ kind: "arc", chain: a ? a.pi : -1, side: 0, corner: ci, interval: -1, cap: -1 }); });
  caps.forEach((cp, capIdx) => piecesD.push({ kind: "cap", chain: cp.pi, side: 0, corner: -1, interval: -1, cap: capIdx }));
  return {
    chainIds: scene.chains.map((c) => c.id),
    closed: scene.chains.map((c) => c.closed),
    nPts: scene.chains.map((c) => c.pts.length >> 1),
    crossings: scene.crossings.flatMap((x) => {
      const aPi = idxOf.get(x.a.chain); const bPi = idxOf.get(x.b.chain);
      return aPi === undefined || bPi === undefined ? [] : [{ aPi, bPi, over: x.over, emergent: !!x.emergent }];
    }),
    arms, armsOfJ, corners, groupOfJ, caps, stationsD, intervalsD, piecesD,
  };
}`;
text = text.slice(0, si) + mid + text.slice(ei + endAnchor.length);
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log("stage1 applied");
