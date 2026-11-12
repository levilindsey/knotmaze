// K1324 s1: the five spots' ink, rp=outline with the group skip off (master) and on, against form B.
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s1_spots.ts [--ppu=320] [--r=3] [--tau=0.999] [--spots=scene:x:y:label,...]
// Per spot, in a square of half-size r*h: holes (form B ink >= 0.9, outline < 0.5: specks inside the ink), stray
// (form B < 0.1, outline > 0.5) and the outline's lowest ink where form B is >= 0.9.
import * as D from "../../../src/render/outline/draw";
import { buildModel, rasterFormB, rasterOutline, loadScene } from "../K1314/k1314_census";

const opt = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ppu = Number(opt("ppu") ?? 320); const rh = Number(opt("r") ?? 3);
D.contactOpts.tau = Number(opt("tau") ?? D.contactOpts.tau);
const jc = (nm: string, j: number): [number, number] => { const J = (loadScene(nm) as unknown as { junctions: { c: [number, number] }[] }).junctions[j]; return J.c; };
const xc = (nm: string, x: number): [number, number] => {
  const sc = loadScene(nm) as unknown as { crossings: { a: { chain: number; s: number } }[]; chains: { id: number; pts: number[] }[] };
  const X = sc.crossings[x]; const c = sc.chains.find((q) => q.id === X.a.chain) ?? sc.chains[X.a.chain];
  let acc = 0; const p = c.pts;
  for (let i = 2; i < p.length; i += 2) { const d = Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]); if (acc + d >= X.a.s) { const u = (X.a.s - acc) / d; return [p[i - 2] + u * (p[i] - p[i - 2]), p[i - 1] + u * (p[i + 1] - p[i - 1])]; } acc += d; }
  return [p[0], p[1]];
};
type Spot = { nm: string; x: number; y: number; label: string };
const spots: Spot[] = opt("spots")?.split(",").map((s) => { const [nm, x, y, label] = s.split(":"); return { nm, x: Number(x), y: Number(y), label }; }) ?? [
  { nm: "def", ...((c) => ({ x: c[0], y: c[1] }))(jc("def", 174)), label: "j174" },
  { nm: "ring", ...((c) => ({ x: c[0], y: c[1] }))(jc("ring", 12)), label: "j12" },
  { nm: "g41_ring_tw42", ...((c) => ({ x: c[0], y: c[1] }))(jc("g41_ring_tw42", 12)), label: "j12" },
  { nm: "g41_user_tw64", ...((c) => ({ x: c[0], y: c[1] }))(jc("g41_user_tw64", 28)), label: "j28" },
  { nm: "muse_hash", ...((c) => ({ x: c[0], y: c[1] }))(xc("muse_hash", 22)), label: "x22" },
];
const byScene = new Map<string, Spot[]>(); for (const s of spots) { const l = byScene.get(s.nm) ?? []; l.push(s); byScene.set(s.nm, l); }
for (const [nm, L] of byScene) {
  const res: Record<string, string[]> = {};
  let fbs: Float32Array[] | null = null;
  for (const on of [false, true]) {
    D.contactOpts.groups = on;
    const m = buildModel(nm); const h = (m as unknown as { h?: number }).h ?? 0.3;
    const fbNow: Float32Array[] = [];
    L.forEach((s, q) => {
      const r = rh * h; const c0 = Math.round((s.x - r) * ppu); const r0 = Math.round((s.y - r) * ppu); const n = Math.round(2 * r * ppu);
      const R = rasterOutline(m, c0, r0, n, n, ppu);
      const F = fbs ? fbs[q] : rasterFormB(m, c0, r0, n, n, ppu).ink; fbNow.push(F);
      let holes = 0, stray = 0, lo = 1;
      for (let k = 0; k < n * n; k++) { const v = R.ink[k]; const f = F[k]; if (f >= 0.9) { if (v < 0.5) holes++; lo = Math.min(lo, v); } else if (f < 0.1 && v > 0.5) stray++; }
      (res[`${s.label}`] ??= []).push(`${on ? "on " : "off"} holes ${holes} stray ${stray} min ${lo.toFixed(3)}`);
    });
    fbs = fbNow;
  }
  for (const s of L) console.log(`${nm} ${s.label} (${s.x.toFixed(2)}, ${s.y.toFixed(2)}): ${res[s.label].join(" | ")}`);
}
