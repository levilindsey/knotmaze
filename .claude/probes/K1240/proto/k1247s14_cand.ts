// K1247 s14: one crossing's cut candidates and picks at rest (mult 0).
// Prints candDbg rows (under side, over side, x, y, distance to the crossing
// point, under s, over s, synth, under seg, over seg), synthDbg rows, and the
// four stations (slot, cS, left/right refs with their s and point).
// Usage: node scripts/run_node.mjs <this> <scene> <crossing> [mult=0]
import { structure, frame, debugCache, candDbg, synthDbg } from "./outline";
import { sceneOf, load } from "./k1247s5_scenes";
const [nm, xS, muS] = process.argv.slice(2); const xi = +xS; const mu = Number(muS ?? 0);
const st = structure(load(nm));
candDbg.xi = xi; candDbg.rows.length = 0; synthDbg.xi = xi; synthDbg.rows.length = 0;
frame(st, sceneOf(nm, mu));
const C = debugCache(st) as any;
const f = (v: number): string => (typeof v === "number" ? v.toFixed(4) : String(v));
console.log(`${nm} crossing ${xi}: ${candDbg.rows.length} candidates (uSide oSide x y dC uS oS synth uSeg oSeg)`);
for (const r of candDbg.rows) console.log("  " + r.map(f).join(" "));
if (synthDbg.rows.length) { console.log("synth rows (uSide oSide s d seg):"); for (const r of synthDbg.rows) console.log("  " + r.map(f).join(" ")); }
const refPt = (pi2: number, ref: number): string => `ref${ref} s0 ${f(C.refS0[ref])} s ${f(C.refS[ref])} fin ${C.refFinal[ref]}`;
for (const [nmS, arr] of [["under", C.crossUnderSlot], ["over", C.crossOverSlot]] as const) for (let k = 0; k < 2; k++) {
  const s = arr[xi * 2 + k];
  console.log(`${nmS}[${k}] slot ${s} pi ${C.slotPi[s]} active ${C.stActive[s]} cS ${f(C.stCS[s])} L ${refPt(0, C.stLeft[s])} R ${refPt(0, C.stRight[s])}`);
}
