// K1321 Done 1: at each spot, old reference (s5: every K1321 flag off) | new reference | rp=outline (master),
// P x P px, <zoom> h wide, a magenta tick at the spot. Prints per spot how many pixels the reference changed
// (|ink| > 0.1 or a different chain) and the largest ink change, so "untouched" is a number, not a look.
//   node scripts/run_node.mjs .claude/probes/K1321/k1321_crops.ts [--zoom=3] [--px=220] [--out=<dir>]
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runAt, runColour, type RGB } from "../../../src/render/outline/paint";
import { ARC_BAND, buildModel, FILLET_CONE, rasterOutline, refEval, VROUND, YIELD_FILL } from "../K1314/k1314_census";
import { writePng } from "../K1314/k1314_crops";

const here = dirname(fileURLToPath(import.meta.url));
const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const P = +(opt("px") ?? 220); const Z = +(opt("zoom") ?? 3); const dir = opt("out") ?? join(here, "out");
const SPOTS: [string, string, number, number][] = [
  ["c", "g41_def_tw64 j45", 34.85, 12.73], ["c", "g41_def_tw64 j48", 28.42, 20.425], ["c", "g41_user_tw64 j39", 3.61, 18.97],
  ["a", "def j174", 6.855, 25.66], ["a", "ring j12", 9.725, 0.99], ["a", "g41_ring_tw42 j12", 9.715, 0.985], ["a", "g41_user_tw64 j28", 2.965, 3.355],
  ["y", "muse_hash j135", 4.745, 24.325], ["y", "muse_hash j78c", 5.90, 8.965], ["y", "muse_hash j98", 17.323, 29.666], ["y", "g41_user_tw64 j49", 12.885, 6.665],
  ["u", "g41_ring_tw64 x68", 20.10, 20.50], ["u", "g41_user_tw64 j71", 4.985, 7.55], ["u", "g41_ring_tw64 x67", 18.085, 20.685],
];
// --spots=<scene>:<label>:<x>:<y>[;...] replaces the list (class "q"), for a census find's neighbourhood.
const cli = opt("spots"); if (cli) SPOTS.splice(0, SPOTS.length, ...cli.split(";").map((t): [string, string, number, number] => { const [sc, lb, x, y] = t.split(":"); return ["q", `${sc} ${lb}`, +x, +y]; }));
const flags = [VROUND, FILLET_CONE, ARC_BAND, YIELD_FILL];
mkdirSync(dir, { recursive: true });
const models = new Map<string, ReturnType<typeof buildModel>>();
SPOTS.forEach(([cls, label, X, Y], k) => {
  const nm = label.split(" ")[0]; let m = models.get(nm); if (!m) { m = buildModel(nm); models.set(nm, m); }
  const h = m.scene.look.halfWidth; const ppu = P / (Z * h);
  const c0 = Math.round(X * ppu - P / 2); const r0 = Math.round(Y * ppu - P / 2);
  const Wt = 3 * P + 8; const out = new Uint8Array(Wt * P * 3).fill(255);
  const put = (pn: number, c: number, r: number, v: number[]): void => { const o = 3 * (r * Wt + pn * (P + 4) + c); out[o] = v[0]; out[o + 1] = v[1]; out[o + 2] = v[2]; };
  const col: RGB = [0, 0, 0];
  const comp = (chain: number, s: number, top: number, ink: number): number[] => {
    let f = [1, 1, 1]; if (top >= 0 && chain >= 0) { const q = runAt(m.sp, chain, s); if (q >= 0) { runColour(m.sp.runs[q], s, col); f = [col[0], col[1], col[2]]; } }
    const a = Math.min(1, Math.max(0, ink)); return f.map((v) => Math.round(255 * v * (1 - a)));
  };
  let nCh = 0; let dMax = 0;
  for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) {
    const x = (c0 + c + 0.5) / ppu; const y = (r0 + r + 0.5) / ppu;
    for (const f of flags) f.on = false; const a = refEval(m, x, y);
    for (const f of flags) f.on = true; const b = refEval(m, x, y);
    put(0, c, r, comp(a.chain, a.s, a.top, a.ink)); put(1, c, r, comp(b.chain, b.s, b.top, b.ink));
    const ia = Math.min(1, Math.max(0, a.ink)); const ib = Math.min(1, Math.max(0, b.ink)); const d = Math.abs(ia - ib);
    dMax = Math.max(dMax, d); if (d > 0.1 || (a.top < 0 ? -1 : a.chain) !== (b.top < 0 ? -1 : b.chain)) nCh++;
  }
  const R = rasterOutline(m, c0, r0, P, P, ppu);
  for (let i = 0; i < P * P; i++) {
    const c = i % P; const r = (i - c) / P; const a = Math.min(1, Math.max(0, R.ink[i]));
    const f = R.own[i] > 0 && R.rgb[3 * i] >= 0 ? [R.rgb[3 * i], R.rgb[3 * i + 1], R.rgb[3 * i + 2]] : [1, 1, 1];
    put(2, c, r, f.map((v) => Math.round(255 * v * (1 - a))));
  }
  const cx = Math.round(X * ppu - c0 - 0.5); const cy = Math.round(Y * ppu - r0 - 0.5);
  for (let pn = 0; pn < 3; pn++) for (let d = 4; d <= 9; d++) { put(pn, Math.min(P - 1, cx + d), cy, [255, 0, 255]); put(pn, Math.max(0, cx - d), cy, [255, 0, 255]); }
  const file = join(dir, `crop_${String(k).padStart(2, "0")}_${cls}_${label.replace(/ /g, "_")}.png`);
  writePng(file, out, Wt, P);
  console.log(`${cls} ${label.padEnd(20)} changed px ${String(nCh).padStart(5)} of ${P * P}, max |d ink| ${dMax.toFixed(3)}  ${file.split(/[\\/]/).pop()}`);
});
