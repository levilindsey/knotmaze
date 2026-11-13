// K1314 s13: form B | app (A) | app (B) ink grids over a box (digit = ink * 9.99), plus mean |d| vs form B for A
// and B. A = K1314S13 all off unless --a sets flags; B = --b's flags on top of A's (Flags: S12.x=0|1, S13.x=0|1).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314s13_ab.ts <scene> <x0,y0> <x1,y1> [--n=24]
//        [--a=S13.liftOwn=0] [--b=S12.ownSide=1,S13.liftOwn=1] [--quiet] (summary only) [--rec] (bandRec's CPU triangles in place of bandGpu's; muse_hash throws "relayout did not fit" there)
import { buildModel, refEval } from "./k1314_census";
import { appInk } from "./k1314s11_view";
import { BandRecState } from "../../../src/render/outline/band_rec";
import * as D from "../../../src/render/outline/draw";
import * as O from "../../../src/render/outline/outline";
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, a, b] = args.filter((s) => !s.startsWith("--"));
const [x0, y0] = a.split(",").map(Number); const [x1, y1] = b.split(",").map(Number);
const N = Number(opt("n") ?? 24);
const set = (spec: string | undefined): void => {
  for (const kv of (spec ?? "").split(",").filter(Boolean)) {
    const [k, v] = kv.split("="); const [o, f] = k.split(".");
    const obj = (o === "S12" ? O.K1314S12 : o === "S13" ? O.K1314S13 : (O as any)[o]) as Record<string, boolean>;
    obj[f] = v === "1" || v === "true";
  }
};
Object.keys(O.K1314S13).forEach((k) => ((O.K1314S13 as any)[k] = false));
set(opt("a")); const mA = buildModel(nm);
set(opt("b")); const mB = buildModel(nm);
const ppu = N / (x1 - x0); const c0 = Math.round(x0 * ppu); const r0 = Math.round(y0 * ppu);
// --rec: appInk's raster over bandRec's triangles (the app's ob=1 band) in place of bandGpu's.
const raster = (m: any, b: any): Float32Array => {
  const tie = D.tieAlpha(m.zz, b.h, b.W, b.zt); const ink = new Float32Array(N * N);
  for (let t = 0; 3 * t + 2 < b.count; t++) {
    const v = [3 * t, 3 * t + 1, 3 * t + 2]; const X = v.map((k) => b.pos[2 * k]); const Y = v.map((k) => b.pos[2 * k + 1]);
    if (Math.max(...X) < c0 / ppu || Math.min(...X) > (c0 + N) / ppu || Math.max(...Y) < r0 / ppu || Math.min(...Y) > (r0 + N) / ppu) continue;
    const ch = b.chain[v[0]]; const den = (Y[1] - Y[2]) * (X[0] - X[2]) + (X[2] - X[1]) * (Y[0] - Y[2]); if (!(Math.abs(den) > 1e-18)) continue;
    const sl = b.slots.subarray(4 * v[0], 4 * v[0] + 4); const tied = ch >= 0 && Array.from(sl as ArrayLike<number>).some((q) => q >= 0);
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
      const l1 = ((Y[1] - Y[2]) * (x - X[2]) + (X[2] - X[1]) * (y - Y[2])) / den; const l2 = ((Y[2] - Y[0]) * (x - X[2]) + (X[0] - X[2]) * (y - Y[2])) / den; const l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      const L = [l1, l2, l3]; const at = (k: number): number => L[0] * b.attr[4 * v[0] + k] + L[1] * b.attr[4 * v[1] + k] + L[2] * b.attr[4 * v[2] + k];
      const a = Math.min(1, Math.max(0, tied ? at(3) * tie(ch, x, y, at(0), at(1)) : at(3)));
      const i = r * N + c; ink[i] = 1 - (1 - ink[i]) * (1 - a);
    }
  }
  return ink;
};
const ink = (m: any): Float32Array => args.includes("--rec") ? raster(m, new BandRecState(false).band(m.st, m.table, m.scene, m.zz)) : appInk(m, c0, r0, N, N, ppu);
const iA = ink(mA); const iB = ink(mB);
const d = (v: number): string => String(Math.min(9, Math.max(0, Math.floor(v * 9.99))));
let dA = 0; let dB = 0; const rows: string[] = [];
for (let r = 0; r < N; r++) {
  const y = (r0 + r + 0.5) / ppu; let sf = ""; let sa = ""; let sb = "";
  for (let c = 0; c < N; c++) {
    const x = (c0 + c + 0.5) / ppu; const f = refEval(mA, x, y).ink; const i = r * N + c;
    dA += Math.abs(iA[i] - f); dB += Math.abs(iB[i] - f);
    sf += d(f); sa += d(iA[i]); sb += iB[i] !== iA[i] && Math.abs(iB[i] - iA[i]) > 0.02 ? d(iB[i]) : "-";
  }
  rows.push(`${y.toFixed(3)} ${sf} | ${sa} | ${sb}`);
}
if (!args.includes("--quiet")) { console.log(`cols x ${(c0 / ppu).toFixed(3)}..${((c0 + N) / ppu).toFixed(3)}; form B | app A | app B (- = same as A)`); rows.forEach((s) => console.log(s)); }
console.log(`mean |d| vs form B: A ${((100 * dA) / (N * N)).toFixed(2)}%  B ${((100 * dB) / (N * N)).toFixed(2)}%`);
