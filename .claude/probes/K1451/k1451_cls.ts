// K1451: classify a scan's tie-class finds by what the tie is, over the pixels within 2 px of each find's centroid
// (ppu of the scan), majority vote over pixels the composite walk calls tied:
//   cfg   the pixel mixes two configurations (a ramping piece: home fade / cap ramp) and a tie sits in one
//   zeq   the tied pair are two thread pieces at equal depth (|dz| < 0.2 zt): an off-diagram overlap keyed by distance
//   zdiff two thread pieces whose depths differ: a depth swap inside the window
//   grp   a junction-group surface is one of the pair
//   none  no tied pixel near the centroid
//   node scripts/run_node.mjs .claude/probes/K1451/k1451_cls.ts <scanDir> <variant> [--list]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { modelOf, tablesOf } from "../K1433/k1433_lib.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
const [dir, v] = process.argv.slice(2); const list = process.argv.includes("--list");
const tally: Record<string, number> = {}; const pxT: Record<string, number> = {}; const rows: string[] = [];
for (const f of readdirSync(dir).filter((n) => n.startsWith(`${v}_`) && n.endsWith(".json"))) {
  const J = JSON.parse(readFileSync(join(dir, f), "utf8")); const nm = J.scene; const ppu = J.ppu;
  const ties = J.finds.filter((x: any) => x.cls === "tie"); if (!ties.length) continue;
  modelOf(nm); const T: any = tablesOf(nm); const E: any = new GfEval(T); const zt = T.zt;
  let calls = 0; let kind = "";
  const oC = E.composite.bind(E);
  E.composite = (): number => {
    const r = oC(); calls++;
    for (let i = 0; i + 1 < E.ns; i++) {
      const a = E.sord[i], b = E.sord[i + 1]; if (!(E.skey[a] - E.skey[b] < zt)) continue;
      if (E.sa[a] <= 0 && E.sa[b] <= 0) continue;
      const ia = E.sid[a], ib = E.sid[b];
      if (ia >= 0 || ib >= 0) { if (!kind) kind = "grp"; break; }
      let za = NaN, zb = NaN; for (let j = 0; j < E.np; j++) { if (E.psurf[j] === ia) za = E.pz[j]; if (E.psurf[j] === ib) zb = E.pz[j]; }
      const k = Math.abs(za - zb) < 0.2 * zt ? "zeq" : "zdiff"; if (!kind || kind === "grp") kind = k; break;
    }
    return r;
  };
  for (const x of ties) {
    const vote: Record<string, number> = {};
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      calls = 0; kind = ""; E.eval(x.x + dx / ppu, x.y + dy / ppu);
      const k = kind ? (calls > 1 ? "cfg" : kind) : "none"; vote[k] = (vote[k] ?? 0) + 1;
    }
    delete vote.none; const best = Object.entries(vote).sort((p, q) => q[1] - p[1])[0]?.[0] ?? "none";
    tally[best] = (tally[best] ?? 0) + 1; pxT[best] = (pxT[best] ?? 0) + x.px;
    if (list) rows.push(`${nm}:${x.x.toFixed(2)}:${x.y.toFixed(2)}\t${x.kind}\t${x.px}\t${best}\t${JSON.stringify(vote)}`);
  }
}
if (list) console.log(rows.join("\n"));
console.log(`${v}: ` + Object.entries(tally).map(([k, n]) => `${k} ${n} (${pxT[k]} px)`).join(", "));
