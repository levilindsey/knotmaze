// K1325 s2: where the self plateau (plateauOf(m, "self")) changes form B, by what plain form B is doing there.
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_s2_gate.ts [scene] [--ppu=160] [--box=2]
// Per spot (the five self-crossings and the five junction finds s2a added), over a box of +-box h: changed pixels
// (|ink| > 0.1 or the top chain differs) split by plain's tie flag (F_TIE) and by the plateau's, plus the chains;
// gated = pixels the census reference's tie-only rule (plateauEval) changes.
import { buildModel, plainOf, plateauOf, plateauEval } from "../K1314/k1314_census";
import { F_TIE } from "../../../src/render/field/form_b";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const nm = args.find((a) => !a.startsWith("--")) ?? "muse_hash";
const ppu = Number(opt("ppu") ?? 160); const B = Number(opt("box") ?? 2);
const SPOTS: [string, number, number][] = [
  ["x304", 28.512, 18.007], ["x22", 31.538, 7.408], ["x345", 19.996, 3.944], ["j116", 25.518, 13.825], ["x58", 0.113, 15.187],
  ["n_j111", 14.433, 1.207], ["n_j116", 25.642, 13.028], ["n_j71", 27.814, 17.586], ["n_j50h", 21.822, 34.202], ["n_j50b", 21.754, 33.765],
];
const m = buildModel(nm); const pl = plainOf(m); const pz = plateauOf(m, "self"); const h = m.scene.look.halfWidth;
console.log(`tube ${pz.tube.toFixed(3)} h ${h}; self plateau: ${pz.n} changed samples, crossings ${pz.xs.join(",")}`);
for (const [label, X, Y] of SPOTS) {
  let n = 0, tieP = 0, tieZ = 0, neither = 0, nG = 0; const chains = new Map<string, number>();
  const c0 = Math.floor((X - B * h) * ppu); const c1 = Math.ceil((X + B * h) * ppu);
  const r0 = Math.floor((Y - B * h) * ppu); const r1 = Math.ceil((Y + B * h) * ppu);
  for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
    const x = (c + 0.5) / ppu; const y = (r + 0.5) / ppu;
    const a = pl.evalPoint(x, y); const b = pz.F.evalPoint(x, y); const g = plateauEval(m, pz, x, y);
    if (Math.abs(Math.min(1, Math.max(0, g.ink)) - Math.min(1, Math.max(0, a.ink))) > 0.1 || (g.top < 0 ? -1 : g.chain) !== (a.top < 0 ? -1 : a.chain)) nG++;
    const ia = Math.min(1, Math.max(0, a.ink)); const ib = Math.min(1, Math.max(0, b.ink));
    const ca = a.top < 0 ? -1 : a.chain; const cb = b.top < 0 ? -1 : b.chain;
    if (Math.abs(ia - ib) <= 0.1 && (ca === cb || Math.max(ia, ib) < 0.1)) continue;
    n++; const tp = (a.fade & F_TIE) !== 0; const tz = (b.fade & F_TIE) !== 0;
    if (tp) tieP++; if (tz) tieZ++; if (!tp && !tz) neither++;
    const k = `${ca}>${cb}`; chains.set(k, (chains.get(k) ?? 0) + 1);
  }
  const cs = [...chains].sort((p, q) => q[1] - p[1]).slice(0, 4).map(([k, v]) => `${k}:${v}`).join(" ");
  console.log(`${label.padEnd(7)} changed ${String(n).padStart(5)}  plainTie ${String(tieP).padStart(5)}  pzTie ${String(tieZ).padStart(5)}  neither ${String(neither).padStart(5)}  gated ${String(nG).padStart(5)}  chains ${cs}`);
}
