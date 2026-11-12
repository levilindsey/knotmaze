// K1247 s27: form B (the census's fillet reference) at a point: its pieces (chain, d, key, surface) and the
// label it picks, next to the fill's triangles there (fill_tri: the highest key wins).
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s27_fb.ts <scene> <x> <y>[;<x> <y>...]
import { FormB as FormBFillet } from "../K1314/form_b_fillet";
import { buildModel } from "../K1314/k1314_census";

const [nm, ...rest] = process.argv.slice(2);
const m = buildModel(nm);
const fb = new FormBFillet(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as {
  evalPoint(x: number, y: number): { chain: number; key: number; dkey: number; nSurf: number; s: number };
  pbuf: { chain: number; d: number; key: number; z: number; g: number; surf: number; selfW: number; s: number }[];
};
const cid = (pi: number): string => (pi >= 0 ? `c${m.scene.chains[pi].id}` : "-");
const pts = rest.join(" ").split(";").map((p) => p.trim().split(/\s+/).map(Number));
for (const [x, y] of pts) {
  const r = fb.evalPoint(x, y);
  console.log(`(${x}, ${y}) form B label ${cid(r.chain)} key ${r.key.toFixed(4)} dkey ${r.dkey.toFixed(4)} nSurf ${r.nSurf}`);
  for (const A of fb.pbuf) if (A.d < 0.8) console.log(`  piece ${cid(A.chain)} s ${A.s.toFixed(3)} d ${A.d.toFixed(3)} z ${A.z.toFixed(4)} key ${A.key.toFixed(4)} g ${A.g} surf ${A.surf} selfW ${A.selfW.toFixed(2)}`);
  // the fill: every triangle covering the point and its key there
  const P = m.fr.pos; const K = m.fr.key; const T = m.fs.idx;
  let best = -Infinity; let who = "";
  for (let t = 0; t < T.length; t += 3) {
    const a = T[t]; const b = T[t + 1]; const c = T[t + 2];
    const ax = P[2 * a]; const ay = P[2 * a + 1]; const bx = P[2 * b]; const by = P[2 * b + 1]; const cx = P[2 * c]; const cy = P[2 * c + 1];
    const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy); if (Math.abs(den) < 1e-14) continue;
    const l1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / den; const l2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / den; const l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
    const k = l1 * K[a] + l2 * K[b] + l3 * K[c];
    const it = m.vItem[a]; const item = m.fs.items[it] as { kind: string; pi: number };
    const lab = `${cid(item.pi)} item ${it} ${item.kind}`;
    console.log(`  fill tri ${t / 3} ${lab} key ${k.toFixed(4)}`);
    if (k > best) { best = k; who = lab; }
  }
  console.log(`  fill top: ${who} key ${best.toFixed(4)}`);
}
