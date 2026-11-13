// K1351 s1: counts for the thruGate cost: piecesD / thru pieces (in structure, per frame gated-in,
// points), fill nV / idx / tail items, band layout Q, paint vertices, for one s18 drag.
//   [K1314S13_SET=thruGate=1] node scripts/run_node.mjs .claude/probes/K1314/k1314s13_set.ts .claude/probes/K1351/k1351s1_count.ts <dragDir>
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import * as O from "../../../src/render/outline/outline";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { bandLayout } from "../../../src/render/outline/band_rec";

const dir = process.argv[2];
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const scenes = files.map((f) => {
  const s = JSON.parse(readFileSync(join(dir, f), "utf8"));
  s.look.ctrlArc ??= 0.47;
  Object.assign(s.look, { fillRec: 2, bandRec: 1, bandRecGpu: 1 });
  return s;
});
O.OB_DI.on = true;
const m = new OutlineModel(scenes[0]);
const st: any = (m as any).st;
const thruD: number[] = [];
st.piecesD.forEach((d: any, k: number) => { if (d.kind === "tail" && d.interval >= 2) thruD.push(k); });
const tailItems = (m as any).fs.items.filter((it: any) => it.kind === "tail").length;
const thruTailItems = (m as any).fs.items.filter((it: any) => it.kind === "tail" && st.piecesD[it.piece]?.interval >= 2).length;
console.log(`piecesD ${st.piecesD.length} thruD ${thruD.length} fillItems ${(m as any).fs.items.length} tailItems ${tailItems} thruTailItems ${thruTailItems}`);
console.log(`fill nV ${(m as any).fs.nV} idx ${(m as any).fs.idx.length} pdSrc ${(m as any).pd.src.length} pdCopies ${(m as any).pd.copies}`);
const lay = bandLayout(st, m.table);
console.log(`band Q ${lay.Q} capThru ${thruD.reduce((a, d) => a + lay.cap[d], 0)}`);
let totThru = 0, totIn = 0, totPts = 0, totPieces = 0;
for (let i = 1; i < scenes.length; i++) {
  m.update(scenes[i]);
  let nIn = 0, nPts = 0;
  m.table.pieces.forEach((p: any) => {
    const d = p.di !== undefined ? st.piecesD[p.di] : undefined;
    if (d && d.kind === "tail" && d.interval >= 2) { totThru++; if (p.pts.length >= 4) { nIn++; nPts += p.pts.length / 2; } }
  });
  totIn += nIn; totPts += nPts; totPieces += m.table.pieces.length;
}
const nf = scenes.length - 1;
console.log(`frames ${nf} pieces/frame ${(totPieces / nf).toFixed(1)} thruPiecesChecked/frame ${(totThru / nf).toFixed(1)} gatedIn/frame ${(totIn / nf).toFixed(2)} thruPts/frame ${(totPts / nf).toFixed(1)}`);
