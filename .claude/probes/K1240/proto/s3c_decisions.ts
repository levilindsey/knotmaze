// K1240 S3c Done 2: how many decisions a fresh structure(S') makes
// differently from structure(S), per scene: pieces, exposure, corners.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3c_decisions.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, type SceneIn, type OutlineStructure } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "s3c");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) {
    const x = c.pts[i]; const y = c.pts[i + 1];
    c.pts[i] = x + A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
    c.pts[i + 1] = y + A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
  }
  return sc;
}
function decisions(a: OutlineStructure, b: OutlineStructure): Record<string, number> {
  let runOnlyA = 0; let runOnlyB = 0; let expDiff = 0; let expLenDiff = 0;
  const stable = new Set<number>();
  a.borders.forEach((bs, bi) => { const o = b.borders[bi]; if (o && o.seqPool.length === bs.seqPool.length && o.exposed.length === bs.exposed.length) stable.add(bi); });
  const runKey = (st: OutlineStructure): Set<string> => {
    const s = new Set<string>();
    st.borders.forEach((bs, bi) => { if (!stable.has(bi)) return; for (let r = 0; r + 2 < bs.runs.length; r += 3) s.add(`${bi}|${bs.runs[r]}|${bs.runs[r + 1]}`); });
    return s;
  };
  const ra = runKey(a); const rb = runKey(b);
  for (const k of ra) if (!rb.has(k)) runOnlyA++;
  for (const k of rb) if (!ra.has(k)) runOnlyB++;
  a.borders.forEach((bs, bi) => {
    const o = b.borders[bi];
    if (!o || o.exposed.length !== bs.exposed.length) { expLenDiff++; return; }
    for (let j = 0; j < bs.exposed.length; j++) if (bs.exposed[j] !== o.exposed[j]) expDiff++;
  });
  let okFlip = 0; let styleFlip = 0; let pairChange = 0;
  const nC = Math.min(a.corners.length, b.corners.length);
  for (let i = 0; i < nC; i++) {
    const x = a.corners[i]; const y = b.corners[i];
    if (x.ok !== y.ok) okFlip++;
    if (x.style !== y.style) styleFlip++;
    if (x.ji !== y.ji || x.aArm !== y.aArm || x.bArm !== y.bArm) pairChange++;
  }
  let capDiff = 0;
  const nCap = Math.min(a.caps.length, b.caps.length);
  for (let i = 0; i < nCap; i++) if (JSON.stringify(a.caps[i].runs) !== JSON.stringify(b.caps[i].runs)) capDiff++;
  const totalPieces = (st: OutlineStructure): number => st.borders.reduce((s, bs) => s + bs.runs.length / 3, 0) + st.corners.filter((c) => c.ok).length + st.caps.reduce((s, c) => s + c.runs.length, 0);
  const piecesA = totalPieces(a);
  const piecesB = totalPieces(b);
  return {
    piecesA, piecesB, runsOnlyStructure: runOnlyA, runsOnlyFresh: runOnlyB, stableBorders: stable.size, bordersTotal: a.borders.length,
    exposureSegDiff: expDiff, exposureBordersLenDiff: expLenDiff,
    cornerOkFlips: okFlip, cornerStyleFlips: styleFlip, cornerPairChanges: pairChange, cornersTotal: nC,
    capRunDiffs: capDiff, capsTotal: nCap,
  };
}
const rows: Record<string, unknown>[] = [];
for (const name of ALL) {
  const scene = load(name);
  const st = structure(scene);
  for (const mult of name === "def" || name === "ring" || name === "fat" ? [0.1, 0.5] : [0.1]) {
    const stF = structure(perturb(scene, mult * scene.look.halfWidth));
    const d = decisions(st, stF);
    rows.push({ scene: name, move: mult, ...d });
    console.log(`${name} @${mult}h: pieces ${d.piecesA}->${d.piecesB} runsOnly(stable ${d.stableBorders}/${d.bordersTotal} borders) ${d.runsOnlyStructure}/${d.runsOnlyFresh} expSegDiff ${d.exposureSegDiff} (lenDiffBorders ${d.exposureBordersLenDiff}) corners okFlip ${d.cornerOkFlips} styleFlip ${d.cornerStyleFlips} pairChange ${d.cornerPairChanges} of ${d.cornersTotal} caps diff ${d.capRunDiffs}/${d.capsTotal}`);
  }
}
writeFileSync(join(outDir, "decisions.json"), JSON.stringify(rows, null, 1));
console.log("wrote decisions.json");
