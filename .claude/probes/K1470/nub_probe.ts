// K1470 follow-up: the fill look's nub of gap at j71 of g41_user_tw64, through the CPU mirror (GfEval) of this src.
//   $env:GF_KRETRY = '1'; node scripts/run_node.mjs .claude/probes/K1470/nub_probe.ts <scene> <wx> <wy> [half=0.6] [ppu=60] [px,py ...]
// env CUT=<gap margin>: a filled pixel prints '!' where the look form's gap test would clear it with no window (lkGap: a piece
// whose key is above the label's by more than zt and whose centre line is nearer than h + margin; fade 0), whatever the piece.
// Prints a map of the box centred on (wx, wy): '.' = no fill (cov < 0.5), a letter = the label chain of a filled
// pixel (UPPER case where the outline's ink >= 0.5), '@' = the centre. Then, for each extra world point px,py, the
// mirror's pieces there (chain, s, d, depth, key, group, ramp) and its result.
import { tablesOf } from "../K1436/k1436_lib.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [nm, xs, ys, hs, ps, ...pts] = process.argv.slice(2);
const X = +xs, Y = +ys, H = +(hs ?? 0.6), PPU = +(ps ?? 60);
const T: any = tablesOf(nm); const E: any = new GfEval(T);
console.log(`scene ${nm}: half width ${T.h}, W ${T.W}, aa ${T.aa}, chains ${T.nC}; box ${X - H}..${X + H} x ${Y - H}..${Y + H} at ${PPU} px per unit`);
const N = Math.round(2 * H * PPU); const letters = new Map<number, string>(); const AB = "abcdefghijklmnopqrstuvwxyz";
const rows: string[] = []; const CUT = process.env.CUT ? +process.env.CUT : -1; const cutters = new Set<string>();
for (let r = 0; r < N; r++) {
  let line = "";
  for (let c = 0; c < N; c++) {
    const wx = X - H + (c + 0.5) / PPU, wy = Y - H + (r + 0.5) / PPU; const o = E.eval(wx, wy);
    if (Math.abs(wx - X) < 0.5 / PPU && Math.abs(wy - Y) < 0.5 / PPU) { line += "@"; continue; }
    if (o.cov < 0.5) { line += o.ink >= 0.5 ? "#" : "."; continue; }
    if (!letters.has(o.chain)) letters.set(o.chain, AB[letters.size % 26]);
    let cutBy = -1; if (CUT >= 0) { let lk = 1e9, ld = 1e9; for (let j = 0; j < E.np; j++) if (E.pc[j] === o.chain && E.pd[j] < ld) { ld = E.pd[j]; lk = E.pkey[j]; } for (let j = 0; j < E.np; j++) if (E.pkey[j] > lk + T.zt && E.pd[j] < T.h + CUT) cutBy = E.pc[j]; }
    if (cutBy >= 0) { cutters.add(`${o.chain}<${cutBy}`); line += cutBy === 30 ? "!" : "~"; continue; }
    const ch = letters.get(o.chain)!; line += o.ink >= 0.5 ? ch.toUpperCase() : ch;
  }
  rows.push(`${(Y - H + (r + 0.5) / PPU).toFixed(3)} ${line}`);
}
console.log(`x from ${(X - H).toFixed(3)}, one column = ${(1 / PPU).toFixed(4)}`); console.log(rows.join("\n"));
if (CUT >= 0) console.log(`cut (label<cutter chain; ! = by chain 30, ~ = by another): ${[...cutters].join(", ")}; zt ${T.zt}, margin ${CUT}`);
console.log("letters: " + [...letters].map(([c, l]) => `${l} = chain ${c}${T.cClosed?.[c] ? " (closed)" : ""}`).join(", "));
for (const p of pts) {
  const [wx, wy] = p.split(",").map(Number); const o = { ...E.eval(wx, wy) };
  console.log(`point ${wx},${wy}: ${JSON.stringify(o)}`);
  for (let j = 0; j < E.np; j++) console.log(`  piece ${j} chain ${E.pc[j]} s ${E.ps[j].toFixed(3)} d ${E.pd[j].toFixed(3)} z ${E.pz[j].toFixed(3)} key ${E.pkey[j].toFixed(3)} group ${E.pg[j]} ramp ${E.pramp[j]}`);
}
