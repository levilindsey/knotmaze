// K1247 s23: the band's vertices on a captured drag (Node): ob=1's fixed layout (6 Q) against today's band
// (6 x its used quads), per frame, with the layout's capacity split by what sized it (record runs q0 + 2,
// runs widened at structure creation, arcs, absent pieces, the rest) and the pieces decimated (how 3).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s23_slack.ts <dragDir> [<dragDir> ...]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OB_DI, alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { zChains } from "../../../src/render/outline/draw";
import { BandRecState } from "../../../src/render/outline/band_rec";

OB_DI.on = true;
for (const dir of process.argv.slice(2)) {
  const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
  const scenes: SceneIn[] = files.map((f) => { const s = JSON.parse(readFileSync(join(dir, f), "utf8")); s.look.ctrlArc ??= 0.47; return s; });
  const st = structure(scenes[0]);
  const SC = new BandRecState(true);
  let todayMax = 0; let todaySum = 0; let dec = 0; let decF = 0; let Qmax = 0; let relay = 0;
  const split = { rec: 0, wide: 0, arc: 0, absent: 0, other: 0 };
  let cat: string[] = []; let qMax: Int32Array | null = null; const decBy: Record<string, number> = {};
  for (let f = 0; f < scenes.length; f++) {
    const sc = f === 0 ? scenes[0] : alignJunctionArms(st, scenes[f]); const zz = zChains(sc);
    const tb = frame(st, sc);
    const before = SC.relayouts;
    SC.band(st, tb, sc, zz); const lay = SC.lay!;
    if (SC.relayouts > before && f > 0) relay++;
    let q = 0; for (const p of tb.pieces) { const np = p.pts.length / 2; if (np >= 2) q += np - 1; }
    todayMax = Math.max(todayMax, 6 * q); todaySum += 6 * q; Qmax = Math.max(Qmax, 6 * lay.Q);
    if (!qMax) qMax = new Int32Array(lay.cap.length);
    for (const p of tb.pieces) if (p.di !== undefined && p.di >= 0) qMax[p.di] = Math.max(qMax[p.di], p.pts.length / 2 - 1);
    let d3 = 0; for (let d = 0; d < lay.how.length; d++) if (lay.how[d] === 3) { d3++; if (cat.length) decBy[cat[d]] = (decBy[cat[d]] ?? 0) + 1; }
    dec += d3; if (d3 > 0) decF++;
    if (f === 0) {
      const q0 = new Int32Array(lay.cap.length).fill(-1);
      for (const p of tb.pieces) if (p.di !== undefined && p.di >= 0) q0[p.di] = Math.max(q0[p.di], p.pts.length / 2 - 1);
      for (let d = 0; d < lay.cap.length; d++) {
        const k = st.piecesD[d].kind; const c = 6 * lay.cap[d];
        cat[d] = q0[d] < 1 ? "absent" : k === "arc" ? "arc" : (k === "run" || k === "ghost") && lay.cap[d] === q0[d] + 2 ? "rec" : k === "run" || k === "ghost" ? "wide" : "other:" + k;
        if (q0[d] < 1) split.absent += c;
        else if (k === "arc") split.arc += c;
        else if ((k === "run" || k === "ghost") && lay.cap[d] === q0[d] + 2) split.rec += c;
        else if (k === "run" || k === "ghost") split.wide += c;
        else split.other += c;
      }
    }
  }
  const need: Record<string, [number, number, number]> = {};
  for (let d = 0; d < cat.length; d++) { const e = (need[cat[d]] ??= [0, 0, 0]); e[0] += 6 * SC.lay!.cap[d]; e[1] += 6 * Math.max(0, qMax![d]); e[2]++; }
  console.log("  per kind (cap verts / max used verts / pieces): " + Object.entries(need).map(([k, v]) => `${k} ${v[0]}/${v[1]}/${v[2]}`).join(", ") + "; decimated by kind " + JSON.stringify(decBy));
  console.log(`${dir.split(/[\\/]/).pop()}: ${scenes.length} frames; ob=1 verts ${Qmax} (6 Q, max over frames); today max ${todayMax}, mean ${Math.round(todaySum / scenes.length)}; ratio ${(Qmax / todayMax).toFixed(3)}`);
  console.log(`  f0 split (verts): rec runs ${split.rec}, widened runs ${split.wide}, arcs ${split.arc}, absent ${split.absent}, other ${split.other}; decimated pieces ${dec} over ${decF} frames; relayouts after f0 ${relay}`);
}
