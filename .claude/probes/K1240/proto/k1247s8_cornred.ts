// K1247 s8: one corner, full density against reduced (eps, short, armwin as
// k1247s8_acc.ts): its fields, where its tangent points sit along each chain
// (s, and whether the arm windows kept that stretch whole), and the kept
// points nearest them.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s8_cornred.ts --scene=def --corner=182 [--mult=0] --eps=0.02 --short=4 --armwin=0.5
import { structure, frame, buildOutlineFull } from "./outline";
import { load, sceneOf } from "./k1247s5_scenes";
import { selectKeep, reduceScene, armRanges } from "./k1247s8_reduce";

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const name = arg("scene") ?? "def"; const ci = +(arg("corner") ?? 0); const mult = +(arg("mult") ?? 0);
const still = load(name); const S = still.camera.pxPerUnit * 2; const h = still.look.halfWidth;
const arms = buildOutlineFull(still).structure.arms;
const ranges = arg("armwin") !== undefined ? armRanges(arms, +arg("armwin")! * h) : undefined;
const K = selectKeep(still, { eps: +(arg("eps") ?? 0.02) / S, keepShort: +(arg("short") ?? 0) * h, keepRanges: ranges, winX: arg("winx") ? +arg("winx")! * h : undefined });
const sc = sceneOf(name, mult); const red = reduceScene(sc, K);
type C = { junction: number; aChain: number; bChain: number; ok: boolean; why?: string; style: string; theta: number; r: number; Vx: number; Vy: number; qx: number; qy: number; tax: number; tay: number; tbx: number; tby: number };
const A = frame(structure(still), sc).corners as C[]; const B = frame(structure(red), red).corners as C[];
const c = A[ci]; const d = B[ci]; const f = (v: number): string => v.toFixed(4); const px = (a: number, b: number, x: number, y: number): string => (Math.hypot(a - x, b - y) * S).toFixed(3);
console.log(`${name} ${mult} corner ${ci} j${c.junction} a${c.aChain} b${c.bChain} ok ${c.ok}/${d.ok} why ${c.why ?? ""}/${d.why ?? ""} style ${c.style}/${d.style} theta ${f(c.theta)}/${f(d.theta)}`);
console.log(`  r ${f(c.r / h)} -> ${f(d.r / h)} h; V moved ${px(c.Vx, c.Vy, d.Vx, d.Vy)} px; q ${px(c.qx, c.qy, d.qx, d.qy)} px; ta ${px(c.tax, c.tay, d.tax, d.tay)} px; tb ${px(c.tbx, c.tby, d.tbx, d.tby)} px`);
// s of a point on chain index pi (nearest), full polyline.
const sOn = (pi: number, x: number, y: number): [number, number, number] => {
  const P = sc.chains[pi].pts; let best = Infinity; let bs = 0; let acc = 0; let bk = 0;
  for (let k = 0; k + 3 < P.length; k += 2) { const ax = P[k], ay = P[k + 1], ex = P[k + 2] - ax, ey = P[k + 3] - ay; const l = Math.hypot(ex, ey); let t = l > 0 ? ((x - ax) * ex + (y - ay) * ey) / (l * l) : 0; t = Math.min(1, Math.max(0, t)); const dd = Math.hypot(ax + ex * t - x, ay + ey * t - y); if (dd < best) { best = dd; bs = acc + t * l; bk = k / 2; } acc += l; }
  return [bs, best, bk];
};
for (const [lab, pi, x, y] of [["ta", c.aChain, c.tax, c.tay], ["tb", c.bChain, c.tbx, c.tby]] as const) {
  const [s, off, k] = sOn(pi, x, y);
  const rs = ranges?.get(pi) ?? []; const inWin = rs.some(([u, v]) => s >= u && s <= v);
  const kept = K.idx[pi]; let lo = -1, hi = -1; for (const q of kept) { if (q <= k) lo = q; if (q > k && hi < 0) hi = q; }
  const jn = typeof c.junction === "number" ? c.junction : +String(c.junction).replace(/\D/g, ""); const jArms = arms.filter((a) => a.pi === pi && a.ji === jn).map((a) => `arm sR ${f(a.sR / h)} h dir ${a.dir} L ${f(a.L / h)} h`).join("; ");
  console.log(`  ${lab} on chain ${pi}: s ${f(s / h)} h (off ${(off * S).toFixed(3)} px), point ${k}; in an arm window: ${inWin}; kept points around: ${lo}..${hi} (gap ${hi - lo}); ${jArms || "no arm of j" + c.junction + " on this chain"}`);
  console.log(`     windows on chain ${pi}: ${rs.map(([u, v]) => `[${f(u / h)},${f(v / h)}]`).join(" ") || "-"}`);
}
// The junction's arms, full against reduced (L depends on the nearest crossing cut's angle).
{
  const jn = typeof c.junction === "number" ? c.junction : +String(c.junction).replace(/\D/g, "");
  const aF = buildOutlineFull(sc).structure.arms; const aR = buildOutlineFull(red).structure.arms;
  aF.forEach((a, k) => { if (a.ji !== jn) return; const b = aR[k]; console.log(`  arm ${k} chain ${a.pi} sR ${f(a.sR / h)} -> ${f(b.sR / h)} h, L ${f(a.L / h)} -> ${f(b.L / h)} h (dL ${((b.L - a.L) * S).toFixed(3)} px)`); });
}