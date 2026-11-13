import { readFileSync } from "node:fs";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import { recStrips, itemVerts as _iv } from "../../../src/render/outline/fill_tri";
const s = JSON.parse(readFileSync(process.argv[2], "utf8"));
s.look.ctrlArc ??= 0.47; Object.assign(s.look, { fillRec: 2, bandRec: 1, bandRecGpu: 1 });
const m = new OutlineModel(s) as any;
const fs = m.fs; const kinds: Record<string, number> = {}; let nStripV = 0; let Ns: number[] = [];
for (const it of fs.items) { kinds[it.kind] = (kinds[it.kind] ?? 0) + 1; if (it.kind === "strip") Ns.push(it.N); }
const rs = recStrips(fs);
const J = fs.items.filter((i: any) => i.kind === "junc"); const Rs = J.map((j: any) => j.R);
const zc = (m.band && true) ? null : null;
console.log(`nV ${fs.nV} items ${JSON.stringify(kinds)} recStrips ${rs.length} N avg ${(Ns.reduce((a, b) => a + b, 0) / Ns.length).toFixed(1)} max ${Math.max(...Ns)}`);
console.log(`junc R avg ${(Rs.reduce((a: number, b: number) => a + b, 0) / Rs.length).toFixed(1)} max ${Math.max(...Rs)}; chains ${s.chains.length} pts ${s.chains.reduce((a: number, c: any) => a + c.pts.length / 2, 0)}; crossings ${s.crossings.length} junctions ${s.junctions.length}`);
const tails = fs.items.filter((i: any) => i.kind === "tail" || i.kind === "disk");
console.log(`tail/disk items ${tails.length}`);
{ let nv = 0; const per: number[] = []; for (const t of tails) { const k = _iv(t); nv += k; per.push(k); } per.sort((a, b) => a - b);
  console.log(`tail/disk verts ${nv} (per item p50 ${per[per.length >> 1]} max ${per[per.length - 1]})`); }
