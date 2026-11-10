// K1247 s8: the reduced outline against the full one. Per scene and mult of
// k1247s5_scenes.ts (still, 0.1h, and 0.5h where listed), plus def's 40-frame
// cycle (k1247c_time.ts's, warm on one structure each): the piece keys (kind,
// chain, side, corner, region) in order, and each piece's Hausdorff distance
// (both ways, pts) in device px at dpr 2 (pxPerUnit * 2, as k1257_sliver.ts).
// cpts (the centreline the piece was cut from) is reported apart.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s8_acc.ts --eps=0.2 [--win=0] [--maxseg=0] [--scene=def] [--nocycle] [--list=5]
// eps in device px (the Douglas-Peucker tolerance on the centreline); win and
// maxseg in h (0 = off).
import { structure, frame, type SceneIn } from "./outline";
import { ALL, multsOf, sceneOf, load } from "./k1247s5_scenes";
import { selectKeep, reduceScene, keepStats } from "./k1247s8_reduce";

const arg = (k: string): string | undefined => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const epsPx = +(arg("eps") ?? 0.2);
const winH = +(arg("win") ?? 0);
const maxSegH = +(arg("maxseg") ?? 0);
const winJ = arg("winj"); const winX = arg("winx"); const winD = arg("wind");
const optW = (v: string | undefined, h: number): number | undefined => (v === undefined ? undefined : +v * h);
const names = arg("scene") ? arg("scene")!.split(",") : ALL;
const doCycle = !process.argv.includes("--nocycle");
const nList = +(arg("list") ?? 0);
const barPx = 0.25;

function ptSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const ex = bx - ax; const ey = by - ay; const l2 = ex * ex + ey * ey;
  let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0; t = Math.min(1, Math.max(0, t));
  return Math.hypot(ax + ex * t - px, ay + ey * t - py);
}
function ptPoly(px: number, py: number, pts: ArrayLike<number>): number {
  const n = pts.length / 2;
  if (n === 0) return Infinity;
  if (n === 1) return Math.hypot(pts[0] - px, pts[1] - py);
  let best = Infinity;
  for (let i = 0; i + 1 < n; i++) { const d = ptSeg(px, py, pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3]); if (d < best) best = d; }
  return best;
}
function hausdorff(a: ArrayLike<number>, b: ArrayLike<number>): number {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0 || b.length === 0) return Infinity;
  let m = 0;
  for (let i = 0; i + 1 < a.length; i += 2) m = Math.max(m, ptPoly(a[i], a[i + 1], b));
  for (let i = 0; i + 1 < b.length; i += 2) m = Math.max(m, ptPoly(b[i], b[i + 1], a));
  return m;
}
interface P { kind: string; chain: number; side: number; corner: number; region: number; pts: number[]; cpts: number[] }
const copy = (t: { pieces: unknown[] }): P[] => (t.pieces as { kind: string; chain: number; side: number; corner: number; region: number; pts: ArrayLike<number>; cpts?: ArrayLike<number> }[]).map((p) => ({ kind: p.kind, chain: p.chain, side: p.side, corner: p.corner, region: p.region, pts: Array.from(p.pts), cpts: Array.from(p.cpts ?? []) }));
const q = (xs: number[], p: number): number => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

interface Row { label: string; keys: string; d: number[]; dc: number[]; worst: string[] }
function compare(label: string, a: P[], b: P[], S: number): Row {
  let keys = a.length !== b.length ? `count ${a.length} vs ${b.length}` : "";
  const d: number[] = []; const dc: number[] = []; const all: [number, string][] = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const p = a[i]; const r = b[i];
    if (!keys && (p.kind !== r.kind || p.chain !== r.chain || p.side !== r.side || p.corner !== r.corner || p.region !== r.region)) keys = `piece ${i}: ${p.kind}/${p.chain}/${p.side}/${p.corner}/${p.region} vs ${r.kind}/${r.chain}/${r.side}/${r.corner}/${r.region}`;
    const x = hausdorff(p.pts, r.pts) * S; d.push(x);
    dc.push(hausdorff(p.cpts, r.cpts) * S);
    if (nList) all.push([x, `#${i} ${p.kind} ch${p.chain} side${p.side} corner${p.corner} n${p.pts.length / 2}/${r.pts.length / 2}: ${x.toFixed(3)} px`]);
  }
  all.sort((u, v) => v[0] - u[0]);
  return { label, keys, d, dc, worst: all.slice(0, nList).map((w) => w[1]) };
}
// k1247c_time.ts's (inconsistent) perturb for def's timed cycle.
function perturbT(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return sc;
}

let fails = 0; let totFull = 0; let totKept = 0; let worstAll = 0;
const report = (r: Row, extra = ""): void => {
  const mx = r.d.length ? Math.max(...r.d) : 0; const mxc = r.dc.length ? Math.max(...r.dc) : 0;
  const bad = !!r.keys || mx > barPx;
  if (bad) fails++;
  worstAll = Math.max(worstAll, mx);
  console.log(`${bad ? "FAIL" : "ok  "} ${r.label}: ${r.keys ? `KEYS ${r.keys}; ` : ""}max ${mx.toFixed(3)} px, p99 ${q(r.d, 0.99).toFixed(3)}, p50 ${q(r.d, 0.5).toFixed(4)} (${r.d.length} pieces); cpts max ${mxc.toFixed(3)}${extra}`);
  for (const w of r.worst) console.log(`    ${w}`);
};
for (const name of names) {
  const still = load(name);
  const S = still.camera.pxPerUnit * 2; const h = still.look.halfWidth;
  const K = selectKeep(still, { eps: epsPx / S, win: winH * h, winJ: optW(winJ, h), winX: optW(winX, h), winD: optW(winD, h), maxSeg: maxSegH > 0 ? maxSegH * h : Infinity });
  const ks = keepStats(K); totFull += ks.full; totKept += ks.kept;
  const stF = structure(still);
  const stR = structure(reduceScene(still, K));
  for (const mult of multsOf(name)) {
    const sc = sceneOf(name, mult);
    // Cold, as k1247c_coldwarm's cold: a new structure per case.
    const a = copy(frame(structure(still), sc));
    const b = copy(frame(structure(reduceScene(still, K)), reduceScene(sc, K)));
    report(compare(`${name} ${mult}`, a, b, S), mult === 0 ? `; points ${ks.kept}/${ks.full} (${(ks.kept / ks.full * 100).toFixed(1)}%), h ${(h * S).toFixed(1)} px` : "");
  }
  if (doCycle && name === "def") {
    const STEPS = 20;
    const fwd = Array.from({ length: STEPS + 1 }, (_, k) => (k === 0 ? still : perturbT(still, (k / STEPS) * 0.5 * h)));
    const cycle = [...fwd, ...fwd.slice(1, STEPS).reverse()];
    const agg: Row = { label: "def cycle (40 frames, warm)", keys: "", d: [], dc: [], worst: [] };
    let worstF = -1; let worstV = -1;
    for (let f = 0; f < cycle.length; f++) {
      const r = compare(`def cycle frame ${f}`, copy(frame(stF, cycle[f])), copy(frame(stR, reduceScene(cycle[f], K))), S);
      if (r.keys && !agg.keys) agg.keys = `frame ${f}: ${r.keys}`;
      agg.d.push(...r.d); agg.dc.push(...r.dc);
      const m = Math.max(...r.d); if (m > worstV) { worstV = m; worstF = f; agg.worst = r.worst; }
    }
    report(agg, `; worst frame ${worstF}`);
  }
}
console.log(`eps ${epsPx} px, win ${winH} h (j ${winJ ?? "-"} x ${winX ?? "-"} d ${winD ?? "-"}), maxseg ${maxSegH} h: points ${totKept}/${totFull} (${(totKept / totFull * 100).toFixed(1)}%); worst ${worstAll.toFixed(3)} px; ${fails ? `${fails} FAILURES` : `ALL WITHIN ${barPx} px`}`);
