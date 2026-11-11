// K1279: does the drawn ink at the crossings move continuously? Each scene (optionally
// moved by k1247s9_union's perturbT at --cyc=<frame>) is jittered by d px (the union
// tool's jitter: seed 12345, every chain point by up to d px), and every crossing window
// (k1279_census's, ppu 80) is rasterized before and after, for master (f0c1111c
// snapshots) and mine. A pixel whose ink moves by more than --bar (0.25) under a 0.001
// or 0.01 px move, beyond the other raster's 3x3 range (a hard-edged pixel flipping is free),
// is a jump: a continuous fade moves ink by about d times its gradient.
// Usage (from the worktree root):
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1279_motion.ts [--d=0.001,0.01] [--cyc=10] [--scene=a] [--bar=0.25] [--list]
// --list names each crossing with a jump (index, centre, its jump px and largest step).
import * as curO from "./outline";
import * as curD from "./draw";
import * as baseO from "./k1279_base_outline";
import * as baseD from "./k1279_base_draw";
import { ALL, loadScene, windowsOf, rScene, rasterR } from "./k1279_census";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ds = (opt("d") ?? "0.001,0.01").split(",").map(Number);
const cyc = opt("cyc"); const filt = opt("scene"); const bar = Number(opt("bar") ?? 0.25); const ppu = 80;
const perturbT = (scene: curO.SceneIn, A: number): curO.SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as curO.SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
const impls = [
  { name: "master", O: baseO as unknown as typeof curO, D: baseD as unknown as typeof curD },
  { name: "mine", O: curO, D: curD },
];
const tot: Record<string, number> = {};
for (const nm of ALL) {
  if (filt && !nm.includes(filt)) continue;
  const s0 = loadScene(nm);
  const still = cyc !== undefined ? perturbT(s0, ((+cyc <= 20 ? +cyc : 40 - +cyc) / 20) * 0.5 * s0.look.halfWidth) : s0;
  const S = still.camera.pxPerUnit * 2;
  const wins = windowsOf(still, ppu);
  const parts: string[] = [];
  for (const im of impls) {
    const R0 = rScene(im.O.frame(im.O.structure(still), still), still, im.D);
    const base = wins.map((w) => rasterR(R0, w.c0, w.r0, w.N, ppu).ink);
    for (const dpx of ds) {
      let seed = 12345; const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      const sc = JSON.parse(JSON.stringify(still)) as curO.SceneIn;
      for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
      const R1 = rScene(im.O.frame(im.O.structure(sc), sc), sc, im.D);
      let jumps = 0; let wj = 0; let maxD = 0;
      wins.forEach((w, k) => {
        const ink = rasterR(R1, w.c0, w.r0, w.N, ppu).ink; let any = false; let wn = 0; let wm = 0;
        const b = base[k]; const N = w.N;
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const i = r * N + c; if (!w.mask[i]) continue;
          let bLo = Infinity; let bHi = -Infinity; let aLo = Infinity; let aHi = -Infinity;
          for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr; const cc = c + dc; if (rr < 0 || rr >= N || cc < 0 || cc >= N) continue; const j = rr * N + cc; bLo = Math.min(bLo, b[j]); bHi = Math.max(bHi, b[j]); aLo = Math.min(aLo, ink[j]); aHi = Math.max(aHi, ink[j]); }
          const d = Math.max(0, bLo - ink[i], ink[i] - bHi, aLo - b[i], b[i] - aHi); if (d > maxD) maxD = d; if (d > wm) wm = d; if (d > bar) { jumps++; wn++; any = true; }
        }
        if (any) { wj++; if (args.includes("--list")) parts.push(`${im.name} d ${dpx} x${w.xi} (${w.x.toFixed(3)}, ${w.y.toFixed(3)}) θ ${w.theta.toFixed(1)}°: ${wn} px (max ${wm.toFixed(3)})`); }
      });
      parts.push(`${im.name} d ${dpx}: ${jumps} px in ${wj} crossings (max ${maxD.toFixed(3)})`);
      tot[`${im.name} ${dpx}`] = (tot[`${im.name} ${dpx}`] ?? 0) + jumps;
    }
  }
  console.log(`${nm}${cyc !== undefined ? ` cyc ${cyc}` : ""}: ${parts.join(" | ")}`);
}
console.log(`ALL${cyc !== undefined ? ` cyc ${cyc}` : ""}: ${Object.entries(tot).map(([k, v]) => `${k} ${v} px`).join(", ")}`);
