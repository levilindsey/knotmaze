// K1247 s8: is the full outline continuous in its points? Every chain point
// moved by a seeded random offset of `d` device px (no point dropped, s values
// unchanged), against the unmoved outline: key changes and per-piece
// Hausdorff (device px), as k1247s8_acc.ts. Large jumps at tiny d mean a
// discrete decision sits near its threshold, so no point reduction (which
// moves the polyline by up to eps) can stay within a bar below that jump.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s8_jitter.ts --d=0.01,0.05 [--scene=def] [--list=2]
import type { SceneIn } from "./outline";
import { ALL, load } from "./k1247s5_scenes";
import { piecesOf, hausdorff } from "./k1247s8_reduce";

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const ds = (arg("d") ?? "0.01").split(",").map(Number);
const names = arg("scene") ? arg("scene")!.split(",") : ALL;
const nList = +(arg("list") ?? 0);
// --impl= another outline copy (k1247s8_outline_tol.ts, say); --tol= its setS8Tol (h).
const impl = arg("impl") ?? "./outline.ts";
const mod = (await import(/* @vite-ignore */ new URL(impl, import.meta.url).href)) as typeof import("./outline") & { setS8Tol?: (t: number) => void };
const { structure, frame } = mod;
if (arg("tol") !== undefined) mod.setS8Tol!(+arg("tol")!);
let seed = 12345;
const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const q = (xs: number[], p: number): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0; };
// --cyc=<frame>: def's timed cycle frame (k1247c_time.ts's inconsistent perturb) instead of the still scene.
const cyc = arg("cyc");
const perturbT = (scene: SceneIn, A: number): SceneIn => {
  const o = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of o.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return o;
};
for (const name of names) {
  const still0 = load(name);
  const still = cyc !== undefined ? perturbT(still0, ((+cyc <= 20 ? +cyc : 40 - +cyc) / 20) * 0.5 * still0.look.halfWidth) : still0; const S = still.camera.pxPerUnit * 2;
  const tF = frame(structure(still), still);
  const cornF = (tF.corners as { ok: boolean; why?: string; aChain: number; bChain: number }[]).map((c) => ({ ok: c.ok, why: c.why ?? "", a: c.aChain, b: c.bChain }));
  const full = piecesOf(tF);
  for (const dpx of ds) {
    seed = 12345;
    const sc = JSON.parse(JSON.stringify(still)) as SceneIn;
    for (const c of sc.chains) for (let i = 0; i < c.pts.length; i++) c.pts[i] += ((rnd() * 2 - 1) * dpx) / S / Math.SQRT2;
    const tJ = frame(structure(sc), sc);
    const nRegF = (tF.regions as unknown[]).length; const nRegJ = (tJ.regions as unknown[]).length;
    const j = piecesOf(tJ);
    const cornJ = tJ.corners as { ok: boolean; why?: string }[];
    const flipped = new Set<number>(); const flipCh = new Set<number>();
    cornF.forEach((c, k) => { if (c.ok !== cornJ[k].ok || c.why !== (cornJ[k].why ?? "")) { flipped.add(k); flipCh.add(c.a); flipCh.add(c.b); } });
    let keys = 0; const d: number[] = []; const worst: [number, string][] = [];
    for (let i = 0; i < full.length; i++) {
      if (full[i].key !== j[i]?.key) keys++;
      const x = hausdorff(full[i].pts, j[i].pts) * S; d.push(x);
      worst.push([x, `#${i} ${full[i].key}: ${x.toFixed(3)} px`]);
    }
    worst.sort((u, v) => v[0] - u[0]);
    const over = d.filter((x) => x > 0.25).length;
    const chainOf = (key: string): number => +key.split("/")[1];
    const overOnFlip = d.filter((x, i) => x > 0.25 && flipCh.has(chainOf(full[i].key))).length;
    console.log(`${name}${cyc !== undefined ? ` cycle frame ${cyc}` : ""} jitter ${dpx} px: regions ${nRegF} -> ${nRegJ}, keys changed ${keys}, max ${Math.max(...d).toFixed(3)} px, p99 ${q(d, 0.99).toFixed(3)}, pieces > 0.25 px: ${over}/${d.length} (${overOnFlip} on a chain of a corner whose ok/why changed; ${flipped.size} corners changed)`);
    for (const w of worst.slice(0, nList)) console.log(`    ${w[1]}`);
  }
}
