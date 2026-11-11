// K1277: look at the table's structure (pieces vs piecesD, junction polygons vs arcs).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1277_explore.ts [scene]
import { structure, frame } from "./outline";
import { loadScene } from "./k1279_census";

const nm = process.argv[2] ?? "def";
const scene = loadScene(nm);
const st = structure(scene);
const t = frame(st, scene);
const cnt = (a: { kind: string }[]): string => { const m: Record<string, number> = {}; for (const p of a) m[p.kind] = (m[p.kind] ?? 0) + 1; return JSON.stringify(m); };
console.log(`${nm}: h ${t.h} W ${t.W} ppu ${scene.camera.pxPerUnit} chains ${scene.chains.length} pts ${scene.chains.reduce((a, c) => a + c.pts.length / 2, 0)} crossings ${scene.crossings.length} junctions ${scene.junctions.length} deadEnds ${scene.deadEnds.length}`);
console.log(`pieces ${t.pieces.length} ${cnt(t.pieces)} | piecesD ${st.piecesD.length} ${cnt(st.piecesD)}`);
console.log(`regions ${t.regions.length} faces ${t.faces.length} intervalsD ${st.intervalsD.length} discard ${st.intervalsD.filter((i) => i.discard).length} stationsD ${st.stationsD.length} caps ${st.caps.length} corners ${st.corners.length}`);
let mis = 0; for (let k = 0; k < Math.min(t.pieces.length, st.piecesD.length); k++) if (t.pieces[k].kind !== st.piecesD[k].kind || t.pieces[k].chain !== st.piecesD[k].chain) mis++;
console.log(`piece/piecesD kind-or-chain mismatches by index: ${mis}`);
// run pieces per interval
const per = new Map<number, number[]>();
st.piecesD.forEach((d, k) => { if (d.kind === "run" || d.kind === "ghost") { const l = per.get(d.interval) ?? []; l.push(k); per.set(d.interval, l); } });
let bad = 0; for (const [iv, l] of per) { const sides = l.map((k) => st.piecesD[k].side).sort().join(","); if (sides !== "-1,1") { bad++; if (bad < 5) console.log(`interval ${iv}: pieces sides ${sides} kinds ${l.map((k) => st.piecesD[k].kind)}`); } }
console.log(`intervals with pieces ${per.size}, not one per side: ${bad}`);
// region of run pieces vs interval
const ridOf = new Map<number, Set<number>>();
st.piecesD.forEach((d, k) => { if (d.kind === "run") { const s = ridOf.get(d.interval) ?? new Set(); s.add(t.pieces[k].region); ridOf.set(d.interval, s); } });
let multi = 0; for (const [, s] of ridOf) if (s.size !== 1 || s.has(-1)) multi++;
console.log(`run intervals whose two pieces disagree on region or have -1: ${multi}`);
// first run pieces: endpoints vs region polygon
for (let k = 0; k < st.piecesD.length && k < 400; k++) {
  const d = st.piecesD[k]; const p = t.pieces[k];
  if (d.kind !== "run" || p.region < 0) continue;
  const reg = t.regions[p.region];
  if (d.side === 1 && k < 40) console.log(`run ${k} iv ${d.interval} chain ${d.chain} side ${d.side} n ${p.pts.length / 2} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} first (${p.pts[0]?.toFixed(3)}, ${p.pts[1]?.toFixed(3)}) region ${p.region} n ${reg.pts.length / 2} first (${reg.pts[0]?.toFixed(3)}, ${reg.pts[1]?.toFixed(3)})`);
}
// junction 0: region pts vs arc pieces
const jr = t.regions.filter((r) => t.pieces.some((p) => p.kind === "arc" && p.region === r.id));
console.log(`junction regions ${jr.length}`);
for (const r of jr.slice(0, 3)) {
  console.log(`region ${r.id} owner ${r.ownerChain} n ${r.pts.length / 2}: ${Array.from({ length: r.pts.length / 2 }, (_, i) => `(${r.pts[2 * i].toFixed(3)},${r.pts[2 * i + 1].toFixed(3)})`).join(" ")}`);
  for (const pi of t.pieces.map((p, k) => k).filter((k) => t.pieces[k].kind === "arc" && t.pieces[k].region === r.id)) {
    const p = t.pieces[pi]; const d = st.piecesD[pi]; const c = st.corners[d.corner];
    console.log(`  arc ${pi} corner ${d.corner} arms ${c.aArm}->${c.bArm} n ${p.pts.length / 2}: ${Array.from({ length: p.pts.length / 2 }, (_, i) => `(${p.pts[2 * i].toFixed(3)},${p.pts[2 * i + 1].toFixed(3)})`).join(" ")}`);
  }
}
// caps
for (let k = 0; k < st.piecesD.length; k++) if (st.piecesD[k].kind === "cap") { const p = t.pieces[k]; console.log(`cap ${k} chain ${p.chain} n ${p.pts.length / 2} first (${p.pts[0].toFixed(3)},${p.pts[1].toFixed(3)}) last (${p.pts[p.pts.length - 2].toFixed(3)},${p.pts[p.pts.length - 1].toFixed(3)}) centre (${p.cpts[0].toFixed(3)},${p.cpts[1].toFixed(3)})`); break; }
console.log(`stations kinds ${JSON.stringify(st.stationsD.reduce((m: Record<string, number>, s) => { m[s.kind] = (m[s.kind] ?? 0) + 1; return m; }, {}))}`);
console.log(`arms ${st.arms.length} groupOfJ ${st.groupOfJ.length}`);
