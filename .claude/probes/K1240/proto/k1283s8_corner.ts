// K1283 s8: print a frame corner's fallback inputs from src's outline (k1283s8_dbg_outline.ts, made by
// k1283s8_bord.ps1 with K1283S8_TOOL=k1283s8_corner.ts): its arms (chain, sR, dir, L, Lcut), the meet
// (x, y, sA, sB, dA, dB), each chain's depth at the meet's s, w, rCap and ramp, and the stations.
//   K1283S8_TOOL=k1283s8_corner.ts pwsh .claude/probes/K1240/proto/k1283s8_bord.ps1 muse_hash 164 [165 ...]
import * as O from "./k1283s8_dbg_outline";
import { loadScene } from "./k1279_census";

const [name, ...cis] = process.argv.slice(2);
const scene = loadScene(name);
const st = O.structure(scene);
O.frame(st, scene);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = (O as any).__fastCaches.get(st);
const f = (v: number): string => (Number.isFinite(v) ? v.toFixed(3) : String(v));
const armTxt = (ai: number): string => `arm ${ai} ch${C.armObj[ai].pi} sR ${f(C.armSR[ai])} dir ${C.armDir[ai]} L ${f(C.armL[ai])} Lcut ${f(C.armLcut[ai])}`;
for (const cs of cis) {
  const ci = Number(cs);
  const dc = st.corners[ci];
  console.log(`corner ${ci} j${dc.ji} why ${C.cWhy[ci]} ok ${C.cOk[ci]} meet ${C.cMeet[ci]} V (${f(C.cVx[ci])}, ${f(C.cVy[ci])})`);
  console.log(`  A ${armTxt(dc.aArm)} | B ${armTxt(dc.bArm)}`);
  console.log(`  TA (${f(C.cTax[ci])}, ${f(C.cTay[ci])}) sA ${f(C.cSA[ci])} dA ${f(C.cDA[ci])} | TB (${f(C.cTbx[ci])}, ${f(C.cTby[ci])}) sB ${f(C.cSB[ci])} dB ${f(C.cDB[ci])}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mt = (O as any).__meetScratch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bm = (O as any).__borderMeetC as (C: unknown, ci: number, a: number, sa: number, b: number, sb: number) => boolean;
  const sideA = C.armDir[dc.aArm]; const sideB = -C.armDir[dc.bArm];
  if (bm && bm(C, ci, dc.aArm, sideA, dc.bArm, sideB)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dz = (O as any).__depthAtC as (C: unknown, pi: number, s: number, w: number) => number;
    const zA = dz(C, C.armObj[dc.aArm].pi, mt.sA, C.depthWindow * C.ctrlArc);
    const zB = dz(C, C.armObj[dc.bArm].pi, mt.sB, C.depthWindow * C.ctrlArc);
    const zt = 0.1 * C.depthAmp;
    console.log(`  meet (${f(mt.x)}, ${f(mt.y)}) sA ${f(mt.sA)} dA ${f(mt.dA)} sB ${f(mt.sB)} dB ${f(mt.dB)} zA ${f(zA)} zB ${f(zB)} zt ${f(zt)}`);
  } else console.log("  no border meet");
}
