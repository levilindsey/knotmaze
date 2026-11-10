// K1247 s13: region groups at rest, today's (memberGroupC: the cap ramp at
// cMid with the cut-limited L) against structural rules, with every
// disagreement classed by what bounds the interval. A chain's intervals are
// walked in structural order; an arm "reaches" an interval when the walk from
// its root slot in its dir meets no crossing slot (kind 0/1) and no other
// root before it (steps = intervals passed). Rules:
//   span  : the reaching arm with the fewest steps (ties: armsOfChain order)
//   adj   : only an arm whose root bounds the interval (steps 0)
// Classes print L - d at cMid for the arm today's rule picked (or the best
// reaching arm), and the kinds of the interval's two stations.
// Usage: node scripts/run_node.mjs <this> [scene...]   (env GRP_EX=n examples per scene)
import { structure, frame, debugCache } from "./outline";
import { load, ALL } from "./k1247s5_scenes";
const names = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const EX = Number(process.env.GRP_EX ?? 4);
const KN = ["U", "O", "J", "C", "S"];
const tot = new Map<string, number>();
for (const nm of names) {
  const sc = load(nm); const st = structure(sc) as any; const fr = frame(st, sc) as any; const C = debugCache(st) as any;
  const nX = st.crossings.length; const h = C.h;
  const armOf = (s: number): number => (C.slotKind[s] === 2 ? C.slotRank[s] - nX * 4 : -1);
  const armD = (ai: number, s: number): number => { const p = C.polys[C.armObj[ai].pi]; let d = (s - C.armSR[ai]) * C.armDir[ai]; if (p.closed) d = ((d % p.len) + p.len) % p.len; return d; };
  // intervals per chain, in order
  const byPi = new Map<number, number[]>();
  for (let i = 0; i < C.nIv; i++) { const pi = C.ivPi[i]; if (!byPi.has(pi)) byPi.set(pi, []); byPi.get(pi)!.push(i); }
  const reach = new Map<number, { ai: number; k: number }[]>(); // interval -> arms reaching it
  for (const [pi, ivs] of byPi) {
    const closed = C.polys[pi].closed; const m = ivs.length;
    for (let q = 0; q < m; q++) {
      const A = C.ivA[ivs[q]]; const ai = armOf(A);
      if (ai >= 0 && C.armDir[ai] > 0) {
        for (let k = 0; k < m; k++) {
          const qq = closed ? (q + k) % m : q + k; if (qq >= m) break;
          if (k > 0) { const S = C.ivA[ivs[qq]]; const kd = C.slotKind[S]; if (kd === 0 || kd === 1 || (kd === 2 && C.armSR[armOf(S)] !== C.armSR[ai]) || kd === 3) break; }
          const l = reach.get(ivs[qq]) ?? []; l.push({ ai, k }); reach.set(ivs[qq], l);
          if (closed && k === m - 1) break;
        }
      }
      const B = C.ivB[ivs[q]]; const bi = armOf(B);
      if (bi >= 0 && C.armDir[bi] < 0) {
        for (let k = 0; k < m; k++) {
          const qq = closed ? (((q - k) % m) + m) % m : q - k; if (qq < 0) break;
          if (k > 0) { const S = C.ivB[ivs[qq]]; const kd = C.slotKind[S]; if (kd === 0 || kd === 1 || (kd === 2 && C.armSR[armOf(S)] !== C.armSR[bi]) || kd === 3) break; }
          const l = reach.get(ivs[qq]) ?? []; l.push({ ai: bi, k }); reach.set(ivs[qq], l);
          if (closed && k === m - 1) break;
        }
      }
    }
  }
  let n = 0; let sameSpan = 0; let sameAdj = 0; const cls = new Map<string, number>(); const ex: string[] = [];
  for (let i = 0; i < C.nIv; i++) {
    const rid = C.ivRegion[i]; if (rid < 0) continue;
    n++;
    const cur = fr.regions[rid].group; const pi = C.ivPi[i]; const cm = C.ivCMid[i];
    const R = (reach.get(i) ?? []).slice().sort((a, b) => a.k - b.k || C.armsOfChain[pi].indexOf(a.ai) - C.armsOfChain[pi].indexOf(b.ai));
    const gSpan = R.length ? C.armObj[R[0].ai].g : -1;
    const gAdj = R.length && R[0].k === 0 ? C.armObj[R[0].ai].g : -1;
    if (gSpan === cur) sameSpan++;
    if (gAdj === cur) sameAdj++;
    if (gSpan === cur) continue;
    // today's picker: which arm, its L - d at cMid
    let best = 0; let bai = -1;
    for (const ai of C.armsOfChain[pi]) { const d = armD(ai, cm); if (d < 0 || d > C.armL[ai]) continue; const t = Math.min(1, Math.max(0, (C.armL[ai] - d) / h)); if (t > best) { best = t; bai = ai; } }
    const kA = KN[C.slotKind[C.ivA[i]]]; const kB = KN[C.slotKind[C.ivB[i]]];
    let key: string; let info: string;
    if (cur === -1) {
      const ai = R[0].ai; const d = armD(ai, cm);
      const over = (d - C.armL[ai]) / h;
      key = `cur -1, span arm (k${R[0].k}): cMid past L by ${over < 0.5 ? "<0.5h" : over < 2 ? "0.5-2h" : ">2h"}`;
      info = `arm${ai} L ${C.armL[ai].toFixed(3)} Lroot? d ${d.toFixed(3)} len ${C.ivLen[i].toFixed(3)}`;
    } else if (gSpan === -1) {
      const ai = bai; const d = ai >= 0 ? armD(ai, cm) : NaN;
      key = `cur g, span -1: ${kA}${kB}`;
      info = `arm${ai} L ${ai >= 0 ? C.armL[ai].toFixed(3) : "-"} d ${d.toFixed(3)} len ${C.ivLen[i].toFixed(3)}`;
    } else {
      key = `both arms, differ: ${R.length} reach, today's arm ${R.some((r) => r.ai === bai) ? "reaches" : "does not reach"}`;
      info = `today arm${bai} (L-d ${(C.armL[bai] - armD(bai, cm)).toFixed(3)}), span arm${R[0].ai} k${R[0].k}`;
    }
    key += ` [${kA}${kB}]`;
    cls.set(key, (cls.get(key) ?? 0) + 1); tot.set(key, (tot.get(key) ?? 0) + 1);
    if (ex.length < EX) ex.push(`r${rid} chain ${pi} iv ${i} cur ${cur} span ${gSpan}: ${info}`);
  }
  if (process.env.GRP_PRED) {
    // Root-to-crossing intervals (span arm k0, the other station a crossing
    // slot): today's group (g or -1) against diagram-only predicates.
    for (let i = 0; i < C.nIv; i++) {
      const rid = C.ivRegion[i]; if (rid < 0) continue;
      const R = (reach.get(i) ?? []).filter((r) => r.k === 0); if (!R.length) continue;
      const ai = R[0].ai; const rootAtA = armOf(C.ivA[i]) === ai; const X = rootAtA ? C.ivB[i] : C.ivA[i];
      if (C.slotKind[X] > 1) continue;
      const xi = Math.floor(C.slotRank[X] / 4); const pi = C.ivPi[i];
      const partner = C.crossUnder[xi] === pi ? C.crossOver[xi] : C.crossUnder[xi];
      const ji = C.armObj[ai].ji; const g = C.armObj[ai].g;
      const partnerArms = C.armsOfChain[partner] as number[];
      const sameJ = partnerArms.some((b) => C.armObj[b].ji === ji);
      const sameG = partnerArms.some((b) => C.armObj[b].g === g);
      const self = partner === pi;
      const under = C.crossUnder[xi] === pi;
      const grp = fr.regions[rid].group === -1 ? "-1" : "g";
      const keyP = [`self ${self ? 1 : 0}`, `sameJ ${sameJ ? 1 : 0}`, `sameG ${sameG ? 1 : 0}`, under ? "under" : "over", C.armObj[ai].kind];
      for (const k of keyP) { const kk = `PRED ${k}: today ${grp}`; tot.set(kk, (tot.get(kk) ?? 0) + 1); }
      const kk2 = `PRED all: today ${grp}`; tot.set(kk2, (tot.get(kk2) ?? 0) + 1);
    }
  }
  console.log(`${nm}: regions ${n}; span rule same ${sameSpan} (differ ${n - sameSpan}); adj rule same ${sameAdj} (differ ${n - sameAdj})`);
  for (const [k, v] of [...cls.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${v} ${k}`);
  for (const e of ex) console.log(`    ${e}`);
}
console.log("ALL:");
for (const [k, v] of [...tot.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${v} ${k}`);
