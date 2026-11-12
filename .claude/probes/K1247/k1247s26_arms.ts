import { readFileSync } from "node:fs";
import { buildOutlineFull, type SceneIn } from "../../../src/render/outline/outline";
import { groupArms, zChains } from "../../../src/render/outline/draw";
const [nm, ...cs] = process.argv.slice(2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${nm}.json`, "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const zz = zChains(scene); const { zc } = zz; const h = scene.look.halfWidth;
const nX = zc.map(() => 0);
for (const x of scene.crossings) { const a = zz.idx.get(x.a.chain); const b = zz.idx.get(x.b.chain); if (a !== undefined) nX[a]++; if (b !== undefined) nX[b]++; }
const xp = zz.passes.map((P, i) => P.slice(0, nX[i]));
const norm = (c: any, s: number): number => (c.closed && c.len > 0 ? ((s % c.len) + c.len) % c.len : s);
const tan = (c: any, s: number): [number, number] => { const u = norm(c, s); let k = 0; while (k + 2 < c.n && c.s[k + 1] <= u) k++; const j = c.closed ? (k + 1) % c.n : Math.min(k + 1, c.n - 1); const dx = c.xs[j] - c.xs[k]; const dy = c.ys[j] - c.ys[k]; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const posAt = (c: any, s: number): [number, number] => { const m = c.n - 1; const u = c.closed && c.len > 0 ? norm(c, s) : Math.min(Math.max(s, 0), c.s[m]); if (u >= c.s[m]) { if (!c.closed) return [c.xs[m], c.ys[m]]; const l = c.len - c.s[m]; const t = l > 0 ? (u - c.s[m]) / l : 0; return [c.xs[m] + (c.xs[0] - c.xs[m]) * t, c.ys[m] + (c.ys[0] - c.ys[m]) * t]; } let lo = 0; let hi = m; while (hi - lo > 1) { const k = (lo + hi) >> 1; if (c.s[k] <= u) lo = k; else hi = k; } const l = c.s[lo + 1] - c.s[lo]; const t = l > 0 ? (u - c.s[lo]) / l : 0; return [c.xs[lo] + (c.xs[lo + 1] - c.xs[lo]) * t, c.ys[lo] + (c.ys[lo + 1] - c.ys[lo]) * t]; };
const mine = groupArms(scene, zc, zz.idx, xp, h, norm, tan, posAt);
const full = buildOutlineFull(scene); const ex = (full.debug as any).arms as any[]; const groups = (full.debug as any).groups as number[];
for (const c of cs.map(Number)) {
  console.log(`c${c} len ${zc[c].len.toFixed(3)} closed ${zc[c].closed}`);
  ex.filter((a) => a.pi === c).forEach((a) => console.log(`  exact j${a.ji} g${groups[a.ji]} sR ${a.sR.toFixed(3)} dir ${a.dir} L ${a.L.toFixed(3)} Lcut ${a.Lcut.toFixed(3)}`));
  mine[c].forEach((a) => console.log(`  mine g${a.g} s ${a.s.toFixed(3)} dir ${a.dir} L ${a.L.toFixed(3)}`));
}
