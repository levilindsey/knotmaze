// K1247 s22: why the band restructures. Over a captured drag (k1247s18_capture.mjs), frame() per frame
// with frame 0's structure, as OutlineModel.update; per consecutive pair: piece count, and per piece
// (matched by kind|chain|side|corner and its order among those) the change in point count, s0/s1 and kind.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s22_why.ts <dragDir> [maxFrames]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { alignJunctionArms, frame, structure, type OutlinePiece, type SceneIn } from "../../../src/render/outline/outline";

const dir = process.argv[2]; const MAXF = Number(process.argv[3] ?? 1e9);
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort().slice(0, MAXF);
const scenes: SceneIn[] = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; return s; });
const st = structure(scenes[0]);
const keyOf = (ps: OutlinePiece[]): string[] => {
  const seen = new Map<string, number>();
  return ps.map((p) => { const k = `${p.kind}|${p.chain}|${p.side}|${p.corner}`; const n = seen.get(k) ?? 0; seen.set(k, n + 1); return `${k}#${n}`; });
};
let prev: OutlinePiece[] | null = null; let prevK: string[] = [];
const kindChg = new Map<string, number>(); // kind -> pieces whose np changed (summed over frames)
const kindAll = new Map<string, number>();
const dnp: number[] = [];
let restr = 0;
for (let f = 0; f < scenes.length; f++) {
  const sc = f === 0 ? scenes[0] : alignJunctionArms(st, scenes[f]);
  const tb = frame(st, sc);
  const ps = tb.pieces.filter((p) => p.pts.length >= 4);
  const K = keyOf(ps);
  let nQ = 0; for (const p of ps) nQ += p.pts.length / 2 - 1;
  if (prev) {
    const pm = new Map<string, OutlinePiece>(); prevK.forEach((k, i) => pm.set(k, (prev as OutlinePiece[])[i]));
    const cm = new Set(K);
    const gone = prevK.filter((k) => !cm.has(k)); const born = K.filter((k) => !pm.has(k));
    let chg = 0; const byKind: Record<string, number> = {};
    ps.forEach((p, i) => {
      kindAll.set(p.kind, (kindAll.get(p.kind) ?? 0) + 1);
      const q = pm.get(K[i]); if (!q) return;
      const d = p.pts.length / 2 - q.pts.length / 2;
      if (d !== 0) { chg++; byKind[p.kind] = (byKind[p.kind] ?? 0) + 1; kindChg.set(p.kind, (kindChg.get(p.kind) ?? 0) + 1); dnp.push(Math.abs(d)); }
    });
    const prevQ = prev.reduce((a, p) => a + p.pts.length / 2 - 1, 0);
    if (nQ !== prevQ || gone.length || born.length || chg) restr++;
    console.log(`f${f}: pieces ${ps.length} quads ${nQ} (d ${nQ - prevQ}) gone ${gone.length} born ${born.length} np-changed ${chg} ${JSON.stringify(byKind)}${gone.length ? " gone " + gone.slice(0, 3).join(",") : ""}${born.length ? " born " + born.slice(0, 3).join(",") : ""}`);
  } else console.log(`f0: pieces ${ps.length} quads ${nQ} kinds ${JSON.stringify(ps.reduce((a: Record<string, number>, p) => { a[p.kind] = (a[p.kind] ?? 0) + 1; return a; }, {}))}`);
  prev = ps; prevK = K;
}
dnp.sort((a, b) => a - b);
console.log(`restructured ${restr} of ${scenes.length - 1}; np-changed by kind ${JSON.stringify(Object.fromEntries(kindChg))} of ${JSON.stringify(Object.fromEntries(kindAll))}; |dnp| p50 ${dnp[dnp.length >> 1]} max ${dnp[dnp.length - 1]}`);
