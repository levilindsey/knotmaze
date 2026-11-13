// K1325 s1: plain form B's winning term on a grid around a spot (which part of form B draws the ink there).
//
//   node scripts/run_node.mjs .claude/probes/K1325/k1325_terms.ts <scene> <x> <y> [--half=0.3] [--n=31] [--ref]
//
// Prints one character per cell: ink level (' ' < .1, '.' < .25, ':' < .5, '+' < .75, '#'), then a grid of the
// winning term (f foot, a tA, b tB, V V, r arc; upper case = ink >= .5), then the distinct terms with their
// corner, chain, s, D, w, fade. --ref uses the census reference (refEval) for the ink grid.
import { buildModel, plainOf, refEval } from "../K1314/k1314_census";
import type { PixelEval } from "../../../src/render/field/form_b";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = pos; const X = +xs; const Y = +ys;
const half = Number(opt("half") ?? 0.3); const N = Number(opt("n") ?? 31);
const m = buildModel(nm); const fb = plainOf(m) as unknown as { evalPoint(x: number, y: number): PixelEval };
const useRef = args.includes("--ref");
const L1: string[] = []; const L2: string[] = []; const seen = new Map<string, number>();
const tk = ["-", "f", "a", "b", "V", "r"];
for (let r = 0; r < N; r++) {
  let a = ""; let b = "";
  for (let c = 0; c < N; c++) {
    const x = X - half + (2 * half * c) / (N - 1); const y = Y - half + (2 * half * r) / (N - 1);
    const e = fb.evalPoint(x, y); const ink = useRef ? refEval(m, x, y).ink : e.ink;
    a += ink < 0.1 ? " " : ink < 0.25 ? "." : ink < 0.5 ? ":" : ink < 0.75 ? "+" : "#";
    const t = e.term; let ch = t ? tk[t.kind] : "-"; if (e.ink >= 0.5) ch = ch.toUpperCase();
    b += e.ink < 0.1 ? " " : ch;
    if (t && e.ink >= 0.1) { const key = `${tk[t.kind]} corner ${t.corner} chain ${t.chain} surf ${t.surf} k ${t.k} vtx ${t.vtx}`; seen.set(key, (seen.get(key) ?? 0) + 1); }
  }
  L1.push(a); L2.push(b);
}
for (let r = 0; r < N; r++) console.log(L1[r] + " | " + L2[r]);
for (const [k, n] of seen) console.log(`${n} ${k}`);
