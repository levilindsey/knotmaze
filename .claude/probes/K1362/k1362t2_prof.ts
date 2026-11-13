// K1362 t2: where pooled-build time goes (Node, one drag scene).
//   node scripts/run_node.mjs .claude/probes/K1362/k1362t2_prof.ts
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assembleGfTables, buildGfPrefix, buildTables, gfChunkBinPart, gfChunkMeta,
  gfRawChain, mergeGfChunkBins, mergeGfRaw, partitionWeighted, solveGfCorners,
} from "../../../src/render/gpu_field/tables";
import type { FieldScene } from "../../../src/render/field/scene";

const here = dirname(fileURLToPath(import.meta.url));
const load = (p: string): FieldScene => {
  const s = JSON.parse(readFileSync(p, "utf8")) as FieldScene;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
};
const med = (a: number[]): number => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const time = (label: string, fn: () => unknown, n = 15): void => {
  fn();
  const ts: number[] = [];
  for (let i = 0; i < n; i++) { const t0 = performance.now(); fn(); ts.push(performance.now() - t0); }
  console.log(`${label}: p50 ${med(ts).toFixed(2)} ms`);
};

for (const nm of ["def", "muse_hash", "fat"]) {
  const scene = load(join(here, "..", "K1247", "out", "s18", "drag", nm, "f010.json"));
  const aa = 0.5 / (scene.camera.pxPerUnit * 2);
  console.log(`--- ${nm} chains=${scene.chains.length} junctions=${scene.junctions.length}`);
  time("cold buildTables", () => buildTables(scene, { aa }));
  const N = 6;
  const blocks = new Array(scene.chains.length);
  time("raw all chains (serial sum)", () => {
    for (const [lo, hi] of partitionWeighted(scene.chains.map((c) => c.pts.length >> 1), N))
      for (let ci = lo; ci < hi; ci++) blocks[ci] = gfRawChain(scene.chains[ci].pts, scene.chains[ci].closed);
  });
  let P = buildGfPrefix(scene, { aa }, mergeGfRaw(scene, blocks));
  time("prefix from merged raw", () => { P = buildGfPrefix(scene, { aa }, mergeGfRaw(scene, blocks)); });
  console.log(`   prefix ms parts: vtx=${P.ms.vtx.toFixed(2)} pins=${P.ms.pins.toFixed(2)} arms=${P.ms.arms.toFixed(2)}`);
  const meta = gfChunkMeta(P);
  time("gfChunkMeta", () => gfChunkMeta(P));
  time("structuredClone(P) x1", () => structuredClone(P));
  const jRanges = partitionWeighted(scene.junctions.map((J) => J.arms.length), N);
  console.log(`   junction ranges: ${JSON.stringify(jRanges)}`);
  for (const [lo, hi] of jRanges) time(`  corners [${lo},${hi})`, () => solveGfCorners(P, lo, hi), 7);
  const qRanges = partitionWeighted(new Array(meta.nCh).fill(1), N);
  time("chunkBinPart one slice", () => gfChunkBinPart(P, meta, qRanges[0][0], qRanges[0][1]), 7);
  time("merge+assemble (serial, K ready)", () => {
    let K: ReturnType<typeof solveGfCorners> = [];
    // reuse precomputed K timing-free: solve once outside? approximate with cached
    return K;
  }, 3);
  const K = jRanges.flatMap(([lo, hi]) => solveGfCorners(P, lo, hi));
  const parts = qRanges.map(([lo, hi]) => gfChunkBinPart(P, meta, lo, hi));
  time("mergeGfChunkBins", () => mergeGfChunkBins(parts, meta.gW * meta.gH));
  const bins = mergeGfChunkBins(parts, meta.gW * meta.gH);
  time("assemble (K+bins ready)", () => assembleGfTables(P, K, { meta, bins }, { ...P.ms, corners: 0 }, performance.now()));
}
