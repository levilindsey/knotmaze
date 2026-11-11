// K1240 S4b: where the band's time goes on a scene (counts, not timings).
import { loadScene } from "../../../../test/render/outline_digest";
import { structure, frame } from "../../../../src/render/outline/outline";
import { zChains, dSC, zAtC, footNear, sstep } from "../../../../src/render/outline/draw";
const name = process.argv[2] ?? "def";
const sc = loadScene(`.claude/probes/K868/scenes/${name}.json`);
const st = structure(sc); const tb = frame(st, sc); const zz = zChains(sc);
const { zc, passes } = zz; const h = tb.h; const W = tb.W; const zt = 0.1 * sc.look.depthAmp;
console.log("chains", sc.chains.length, "pts", sc.chains.reduce((a, c) => a + c.pts.length / 2, 0), "crossings", sc.crossings.length, "junctions", sc.junctions.length, "h", h, "W", W);
console.log("passes/chain", passes.map((p) => p.length).join(","));
const spans = passes.flat().map((P) => P.lo + P.hi); spans.sort((a, b) => a - b);
console.log("span lo+hi /h: median", (spans[spans.length >> 1] / h).toFixed(1), "p95", (spans[Math.floor(spans.length * 0.95)] / h).toFixed(1), "rO/h max", (Math.max(...passes.flat().map((P) => P.rO)) / h).toFixed(1));
const seg = zc.map((c) => { let s = 0; for (let k = 1; k < c.n; k++) s += c.s[k] - c.s[k - 1]; return s / Math.max(1, c.n - 1); });
console.log("chain sample spacing /h median", (seg.sort((a, b) => a - b)[seg.length >> 1] / h).toFixed(3));
let calls = 0, inSpan = 0, feet = 0, hits = 0, ones = 0, segVisits = 0;
const fn0 = footNear;
const SUB = h / 8;
let tiedSegs = 0, allSegs = 0, tSteps = 0;
for (const p of tb.pieces) {
  const np = p.pts.length / 2; if (np < 2) continue;
  const tied = (p.kind === "run" || p.kind === "ghost") && p.chain >= 0 && passes[p.chain].length > 0;
  if (!tied) { allSegs += np - 1; continue; }
  const C = zc[p.chain];
  const cum: number[] = [0]; for (let i = 1; i < np; i++) cum.push(cum[i - 1] + Math.hypot(p.pts[2 * i] - p.pts[2 * i - 2], p.pts[2 * i + 1] - p.pts[2 * i - 1]));
  const L = cum[np - 1] || 1; const span = p.s1 - p.s0;
  const sv: number[] = []; for (let i = 0; i < np; i++) sv.push(fn0(C, p.cpts[2 * i], p.cpts[2 * i + 1], p.s0 + (span * cum[i]) / L, 2 * h, 0, 0).s);
  const near = (s: number): boolean => passes[p.chain].some((P) => { const ds = dSC(C, P.s, s); return ds >= -P.lo - h && ds <= P.hi + h; });
  for (let i = 0; i + 1 < np; i++) {
    allSegs++;
    const sa = sv[i]; const sb = sa + dSC(C, sa, sv[i + 1]);
    if (!(near(sa) || near(sb))) continue;
    tiedSegs++;
    const lo = Math.min(sa, sb); const hi = Math.max(sa, sb);
    const m0 = Math.floor(lo / SUB) + 1; const m1 = Math.min(Math.ceil(hi / SUB) - 1, m0 + 63);
    const nt = Math.max(0, m1 - m0 + 1) + 2; tSteps += nt;
    // sample alpha at the t=0 outer and inner only (stats)
    for (const t of [0]) for (const u of [0, 0.5, 1]) {
      const ax = p.pts[2 * i], ay = p.pts[2 * i + 1];
      const x = ax + (p.cpts[2 * i] - ax) * (W / Math.max(1e-12, Math.hypot(p.cpts[2 * i] - ax, p.cpts[2 * i + 1] - ay))) * u;
      const y = ay + (p.cpts[2 * i + 1] - ay) * (W / Math.max(1e-12, Math.hypot(p.cpts[2 * i] - ax, p.cpts[2 * i + 1] - ay))) * u;
      calls++;
      let a = 1;
      for (const P of passes[p.chain]) {
        const ds = dSC(C, P.s, sa); if (ds < -P.lo || ds > P.hi) continue;
        inSpan++;
        const O = zc[P.o];
        const segs = O.closed ? O.n : O.n - 1; const approx = Math.min(segs, Math.ceil((2 * P.rO) / (O.len / segs)));
        segVisits += approx;
        const f = fn0(O, x, y, P.so, P.rO, sa, P.o === p.chain ? 3 * h : 0); feet++;
        if (!(f.d < h)) continue; hits++;
        const g = Math.min(1, Math.max(0, (h - f.d) / W));
        const keyO = zAtC(O, f.s) - (f.d * zt) / h; const keyC = zAtC(C, sa) - ((h - W * u) * zt) / h;
        a *= 1 - g * sstep(-zt, zt, keyO - keyC);
      }
      if (a === 1) ones++;
    }
  }
}
console.log("segs", allSegs, "tiedSegs", tiedSegs, "t-steps", tSteps, "est verts", tSteps * 8 * 6);
console.log("sampled vertices", calls, "passes in span/vertex", (inSpan / calls).toFixed(2), "foot hits/vertex", (hits / calls).toFixed(3), "alpha==1 frac", (ones / calls).toFixed(3), "est seg visits/footNear", (segVisits / feet).toFixed(0));
