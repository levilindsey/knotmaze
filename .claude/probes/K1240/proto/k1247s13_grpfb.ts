// K1247 s13: which group rule agrees with form B. For each region with
// points, form B's top surface on a grid inside the region polygon: the share
// of covered samples whose top is a group surface (top < OWN). Classes:
//   changed : today -1, the structural rule (grpMode.adj) a group
//   keep g  : a group under both rules
//   keep -1 : -1 under both rules
// A region "agrees" with a rule when the rule says group and the share is
// >= 0.5, or the rule says -1 and the share is < 0.5.
// Usage: node scripts/run_node.mjs <this> [scene...]   (env FB_STEP grid step in h, default 0.25)
import { structure, frame, grpMode } from "./outline";
import { load, ALL } from "./k1247s5_scenes";
import { FormB, OWN } from "../../../../src/render/field/form_b";
const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const STEP = Number(process.env.FB_STEP ?? 0.25);
type Acc = { n: number; lo: number; mid: number; hi: number; sum: number };
const mk = (): Acc => ({ n: 0, lo: 0, mid: 0, hi: 0, sum: 0 });
const all = { changed: mk(), keepG: mk(), keepNeg: mk() };
let agreeToday = 0; let agreeRule = 0; let nAll = 0;
const inPoly = (q: number[], x: number, y: number): boolean => { let c = false; const n = q.length / 2; for (let i = 0, j = n - 1; i < n; j = i++) { const xi = q[2 * i]; const yi = q[2 * i + 1]; const xj = q[2 * j]; const yj = q[2 * j + 1]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
for (const nm of names) {
  const sc = load(nm); const st = structure(sc);
  grpMode.adj = false; const fA = frame(st, sc) as any; const gA: number[] = fA.regions.map((r: any) => r.group);
  grpMode.adj = true; const fB = frame(st, sc) as any; const gB: number[] = fB.regions.map((r: any) => r.group);
  const regs = fB.regions.map((r: any) => Array.from(r.pts as ArrayLike<number>) as number[]);
  grpMode.adj = false;
  const sc2 = load(nm); (sc2.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  const fb = new FormB(sc2 as never, { dpr: 2 }) as any;
  const h = sc.look.halfWidth; const step = STEP * h;
  const per = { changed: mk(), keepG: mk(), keepNeg: mk() };
  let aT = 0; let aR = 0; let nS = 0;
  for (let i = 0; i < Math.min(gA.length, gB.length); i++) {
    const q = regs[i]; if (q.length < 6) continue;
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (let k = 0; k < q.length; k += 2) { x0 = Math.min(x0, q[k]); x1 = Math.max(x1, q[k]); y0 = Math.min(y0, q[k + 1]); y1 = Math.max(y1, q[k + 1]); }
    let cov = 0; let grp = 0;
    for (let y = y0 + step / 2; y < y1; y += step) for (let x = x0 + step / 2; x < x1; x += step) {
      if (!inPoly(q, x, y)) continue;
      const e = fb.evalPoint(x, y); if (e.top < 0) continue;
      cov++; if (e.top < OWN) grp++;
    }
    if (!cov) continue;
    const share = grp / cov;
    const cls = gA[i] < 0 && gB[i] >= 0 ? "changed" : gA[i] >= 0 && gB[i] >= 0 ? "keepG" : gA[i] < 0 && gB[i] < 0 ? "keepNeg" : null;
    if (!cls) continue;
    for (const A of [per[cls], all[cls]]) { A.n++; A.sum += share; if (share < 0.25) A.lo++; else if (share < 0.75) A.mid++; else A.hi++; }
    nS++; if ((gA[i] >= 0) === (share >= 0.5)) aT++; if ((gB[i] >= 0) === (share >= 0.5)) aR++;
  }
  agreeToday += aT; agreeRule += aR; nAll += nS;
  const f = (A: Acc): string => `${A.n} (mean ${(A.n ? A.sum / A.n : 0).toFixed(2)}; <0.25 ${A.lo}, mid ${A.mid}, >=0.75 ${A.hi})`;
  console.log(`${nm}: form B group share: changed ${f(per.changed)} | keep g ${f(per.keepG)} | keep -1 ${f(per.keepNeg)}; agree with form B: today ${aT}/${nS}, rule ${aR}/${nS}`);
}
const f = (A: Acc): string => `${A.n} (mean ${(A.n ? A.sum / A.n : 0).toFixed(2)}; <0.25 ${A.lo}, mid ${A.mid}, >=0.75 ${A.hi})`;
console.log(`ALL: changed ${f(all.changed)} | keep g ${f(all.keepG)} | keep -1 ${f(all.keepNeg)}; agree with form B: today ${agreeToday}/${nAll}, rule ${agreeRule}/${nAll}`);
