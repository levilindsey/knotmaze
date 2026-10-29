// K992 s2: make oracle_c17.ts from oracle_b16.ts (mk_b16.mjs). b16's two
// stops took the first point along V's branch where a test failed (den
// below KAPPA of its value at V; a tangent foot past cap − W), and both
// tests are not monotone along the branch, so the stops jumped. c17's
// stops are one smoothed measure instead (call 2):
//   r = ∫_h^{h+rRule} S(δ) dδ,  S(δ) = min over [h, δ] of w,
//   w = ss((den/den(V) − K0)/(K1 − K0)) · ss(slack/(EPSC·h)),
// slack = the smaller of cap − W − |foot| on the two arms (∞ before the
// caps exist), ss = smoothstep. S is a running minimum of a continuous
// function, so r moves continuously and monotonically with w; a dip that
// nearly closes costs the tail beyond it in proportion, with no jump.
// S is read at NODES fixed nodes (h + k·rRule/NODES) by the trapezoid rule,
// and q is the branch point at δ* = h + r. The re-fit (the caps) grows the
// corner again with the cap gate when a foot came within EPSC·h of cap − W
// anywhere on the first march (footMaxA/B), from the rule's radius.
// node .claude/probes/S3a/mk_c17.mjs [--k0 0.3] [--k1 0.7] [--epsc 0.5] [--nodes 32] [--refine 0] [--drop 0.125] [--out oracle_c17.ts]
//   --refine n: halve an interval where S drops by more than --drop, or the
//   branch folds, down to dN/2^n (c17f: --refine 10 --out oracle_c17f.ts)
// --foot track: K992 s3's tracked tangent feet (c21: --refine 10 --foot track
//   --out oracle_c21.ts); --fw N tracks within h/N (32), --ove E is the
//   overlap gate's width in h (0.05). K992_s3_landing.md F1-F3.
// --src --in <mk_b16 --src output> --out <path>: rewrite a source file in
//   place of a probe (no probe header; --out is a full path).
import { readFileSync, writeFileSync } from "node:fs";
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.indexOf(`--${k}`) >= 0 ? argv[argv.indexOf(`--${k}`) + 1] : d);
const K0 = Number(opt("k0", "0.3"));
const K1 = Number(opt("k1", "0.7"));
const EPSC = Number(opt("epsc", "0.5"));
const NODES = Number(opt("nodes", "32"));
const REFINE = Number(opt("refine", "0"));
const DROP = Number(opt("drop", "0.125"));
const dir = ".claude/probes/S3a/";
const IN = opt("in", dir + "oracle_b16.ts");
const SRC = argv.includes("--src");
const FOOT = opt("foot", "nearest");
const FW = Number(opt("fw", "32"));
const OVE = Number(opt("ove", "0.05"));
const OUT = SRC ? opt("out", "") : dir + opt("out", "oracle_c17.ts");
if (!OUT) throw new Error("--src needs --out <path>");
let s = readFileSync(IN, "utf8").replace(/\r\n/g, "\n");
const rep = (a, b) => {
  const i = s.indexOf(a);
  if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error(`not found once: ${a.slice(0, 80)}`);
  s = s.slice(0, i) + b + s.slice(i + a.length);
};
const repBlock = (starts, end, b) => {
  const st = starts.map((x) => s.indexOf(x)).filter((i) => i >= 0);
  if (st.length !== 1) throw new Error(`block start not found once: ${starts[0].slice(0, 60)}`);
  const e = s.indexOf(end, st[0]);
  if (e < 0) throw new Error(`block end not found: ${end.slice(0, 60)}`);
  s = s.slice(0, st[0]) + b + s.slice(e);
};
if (!SRC) rep(
  "// K992 probe b16 (mk_b16.mjs, kappa 0.5): a16 with the steep stop and the cap stop.",
  `// K992 probe c17 (mk_c17.mjs, k0 ${K0}, k1 ${K1}, epsc ${EPSC}, nodes ${NODES}, refine ${REFINE}, drop ${DROP}): b16 with continuous stops (a smoothed running-minimum measure). Was: a16 with the steep stop and the cap stop.`,
);
rep(
  "  fold?: number;\n",
  "  fold?: number;\n  /** K992 s2: the farthest arc length from the root each tangent foot\n   * reached on the march (the cap gate reads it). */\n  footMaxA?: number;\n  footMaxB?: number;\n",
);
repBlock(
  ["        let cur: Sol = v;\n        let d = h;\n"],
  "        const denAt = ",
  `        let cur: Sol = v;
        // K992 s2, the continuous stops: the ball grows by the measure of
        // V's branch that passes both tests, read as a running minimum, so
        // r = ∫ S dδ over δ from h to h + r, S = min over [h, δ] of
        // w = ss((den/den(V) − ${K0})/${+(K1 - K0).toFixed(6)}) · ss(slack/${EPSC}h): the steep gate
        // (den = 1 + nA·nB; |u| = sqrt(2/den) is q's speed per unit of δ) and
        // the cap gate (slack = cap − W − |foot|, the smaller of the two
        // arms). Both tests read continuous quantities, the running minimum
        // and the integral keep r continuous and monotone in them, and no
        // first crossing is taken.
`,
);
repBlock(
  ["        const denMin = 0.5 * denAt(v.x, v.y);\n"],
  "      } else qq = solve(h + r);\n",
  `        const denV = denAt(v.x, v.y);
        const ss = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
        const footA = (p: Sol): number => Math.abs(dS(pa, A.s, p.sA));
        const footB = (p: Sol): number => Math.abs(dS(pb, B.s, p.sB));
        const wAt = (p: Sol): number => {
          const gs = ss((denAt(p.x, p.y) / denV - ${K0}) / ${+(K1 - K0).toFixed(6)});
          const slack = Math.min(capLimA - footA(p), capLimB - footB(p));
          return slack === Infinity ? gs : gs * ss(slack / (${EPSC} * h));
        };
        // The branch from δ = d0 to dT: each step predicts along u and
        // polishes with Newton held near the prediction; a miss halves it.
        const advance = (from: Sol, d0: number, dT: number, st0: number): Sol | null => {
          let p = from;
          let dc = d0;
          let st = st0;
          while (dT - dc > 1e-12 * dT) {
            const d1 = Math.min(dT, dc + st);
            const dd = d1 - dc;
            const fA = footInWindow(pa, p.x, p.y, winA[0], winA[1]);
            const fB = footInWindow(pb, p.x, p.y, winB[0], winB[1]);
            const nax = (p.x - fA.x) / fA.d;
            const nay = (p.y - fA.y) / fA.d;
            const nbx = (p.x - fB.x) / fB.d;
            const nby = (p.y - fB.y) / fB.d;
            const den = 1 + nax * nbx + nay * nby;
            let next: Sol | null = null;
            if (den > 1e-9) {
              const ux = (nax + nbx) / den;
              const uy = (nay + nby) / den;
              const gx = p.x + ux * dd;
              const gy = p.y + uy * dd;
              const acc = Math.min(h, Math.max(0.5 * Math.hypot(ux, uy) * dd, 1e-3 * h));
              const n = newton(d1, gx, gy, acc, 60);
              if (n.ok && Math.hypot(n.x - gx, n.y - gy) <= acc) next = n;
            }
            if (next) {
              p = next;
              dc = d1;
              st = Math.min(st0, 2 * st);
            } else {
              st /= 2;
              if (st < 1e-5 * h) return null;
            }
          }
          return p;
        };
        // S at fixed nodes h + k·dN (trapezoid rule), until S reaches 0.${REFINE ? `
        // An interval where S drops by more than ${DROP}, or the branch folds,
        // is halved down to dN/2^${REFINE}: w can drop within one interval (a
        // tangent foot jumps to another part of its arm, den falls to 0), and
        // located this way the drop moves r continuously, not by intervals.` : ""}
        const dN = r / ${NODES};
        let S = wAt(v);
        let area = 0;
        const nodes: Sol[] = [v];
        const nodeD: number[] = [h];
        let fmA = footA(v);
        let fmB = footB(v);
        let folded = -1;
        const keep = (p: Sol, d: number, Sp: number): void => {
          nodes.push(p);
          nodeD.push(d);
          if (Sp > 0) {
            fmA = Math.max(fmA, footA(p));
            fmB = Math.max(fmB, footB(p));
          }
        };
        // The branch from p0 at d0 (running minimum S0) to d1: the area
        // under S, S at d1, and the point at d1 (null where it folds).
        const piece = (p0: Sol, d0: number, S0: number, d1: number, depth: number): { a: number; S: number; p: Sol | null } => {
          const p1 = advance(p0, d0, d1, d1 - d0);
          if (p1) {
            const S1 = Math.min(S0, wAt(p1));
            if (S0 - S1 <= ${DROP} || depth >= ${REFINE}) return { a: 0.5 * (S0 + S1) * (d1 - d0), S: S1, p: p1 };
          } else if (depth >= ${REFINE}) {
            folded = d0;
            return { a: ${REFINE ? "0.5 * S0 * (d1 - d0)" : "0"}, S: 0, p: null };
          }
          const dm = 0.5 * (d0 + d1);
          const L = piece(p0, d0, S0, dm, depth + 1);
          if (!L.p || L.S <= 0) return { a: L.a, S: 0, p: null };
          keep(L.p, dm, L.S);
          const R = piece(L.p, dm, L.S, d1, depth + 1);
          return { a: L.a + R.a, S: R.S, p: R.p };
        };
        for (let k = 1; k <= ${NODES} && S > 0; k++) {
          const res = piece(cur, h + (k - 1) * dN, S, h + k * dN, 0);
          area += res.a;
          S = res.S;
          if (!res.p) break;
          cur = res.p;
          keep(res.p, h + k * dN, S);
        }
        if (folded >= 0) c.fold = folded;
        c.footMaxA = fmA;
        c.footMaxB = fmB;
        // q: the branch point at δ* = h + area, from the last node below it.
        let iq = 0;
        while (iq + 1 < nodes.length && nodeD[iq + 1] <= h + area) iq++;
        qq = advance(nodes[iq], nodeD[iq], h + area, dN) ?? nodes[iq];
        r = area;
        c.r = r;
`,
);
rep(
  "      if (!(over() > 1e-9 * h)) continue;\n",
  `      // K992 s2: the cap gate changes only a corner whose feet came within
      // ${EPSC}h of cap − W somewhere on the first march (footMaxA/B); the
      // others keep r, which the gate would return unchanged.
      const fmA = c.footMaxA ?? Math.abs(dS(pa, c.armA.s, c.sTA));
      const fmB = c.footMaxB ?? Math.abs(dS(pb, c.armB.s, c.sTB));
      if (!(Math.max(fmA - (capA - this.W - ${EPSC} * h), fmB - (capB - this.W - ${EPSC} * h)) > 0)) continue;
`,
);
rep(
  "this.solveCorner(c.junction, c.index, c.armA, c.a, c.armB, c.b, c.theta, c.style, c.r, c.rRule, capA - this.W, capB - this.W);",
  "this.solveCorner(c.junction, c.index, c.armA, c.a, c.armB, c.b, c.theta, c.style, c.rRule!, c.rRule, capA - this.W, capB - this.W);",
);
// K992 s3 (--foot track): the tangent feet tracked from V's, the branch and
// den on them, and the overlap gate (K992_s3_landing.md F1-F3, call 2).
if (FOOT === "track") {
  if (!SRC) s = `// K992 probe c21 (mk_c17.mjs --foot track, fw ${FW}, ove ${OVE}): c17 with tracked tangent feet and an overlap gate.\n` + s;
  rep(
    "    const v = solve(h);\n",
    `    // K992 s3: the tangent feet are tracked, not chosen. A tracked foot is
    // the nearest point of its arm within h/${FW} of the last one, the window
    // re-centred while the foot sits on its edge: a descent that follows one
    // local minimum of |q − arm| and never jumps to another part of the arm
    // that comes as near (there the nearest point flips between two
    // contacts as q crosses the tie). Arc lengths stay in the window's
    // domain (unwrap), so a closed chain's seam does not move them.
    const unwrap = (p: Poly, s: number, win: [number, number]): number => {
      if (!p.closed) return s;
      let best = s;
      let bd = Infinity;
      for (let m = -2; m <= 2; m++) {
        const t = s + m * p.len;
        const e = t < win[0] ? win[0] - t : t > win[1] ? t - win[1] : 0;
        if (e < bd) {
          bd = e;
          best = t;
        }
      }
      return best;
    };
    const footLocal = (p: Poly, x: number, y: number, s0: number, win: [number, number]): ReturnType<typeof footInWindow> & { u: number } => {
      const w = h / ${FW};
      let s = Math.min(Math.max(s0, win[0]), win[1]);
      for (let it = 0; ; it++) {
        const lo = Math.max(win[0], s - w);
        const hi = Math.min(win[1], s + w);
        const f = footInWindow(p, x, y, lo, hi);
        const u = s + dS(p, s, f.s);
        const edge = (u <= lo + 1e-9 * h && lo > win[0]) || (u >= hi - 1e-9 * h && hi < win[1]);
        if (!edge || it >= 4096 || Math.abs(u - s) <= 1e-12 * h) return { ...f, u };
        s = u;
      }
    };
    // Newton on |q − tracked foot| = δ on both arms, each foot carried from
    // iterate to iterate.
    const newtonT = (delta: number, x0: number, y0: number, sA0: number, sB0: number, limit?: number, its = 200): Sol => {
      let x = x0;
      let y = y0;
      let ok = false;
      let fA = footLocal(pa, x, y, sA0, winA);
      let fB = footLocal(pb, x, y, sB0, winB);
      for (let it = 0; it < its; it++) {
        const ra = fA.d - delta;
        const rb = fB.d - delta;
        if (Math.abs(ra) < 1e-12 * Math.max(1, delta) && Math.abs(rb) < 1e-12 * Math.max(1, delta)) {
          ok = true;
          break;
        }
        const nax = (x - fA.x) / fA.d;
        const nay = (y - fA.y) / fA.d;
        const nbx = (x - fB.x) / fB.d;
        const nby = (y - fB.y) / fB.d;
        const det = nax * nby - nay * nbx;
        if (Math.abs(det) < 1e-12) break;
        let dx = (-ra * nby + rb * nay) / det;
        let dy = (-nax * rb + nbx * ra) / det;
        const dl = Math.hypot(dx, dy);
        const lim = limit ?? 0.5 * Math.max(delta, h);
        if (dl > lim) {
          dx *= lim / dl;
          dy *= lim / dl;
        }
        x += dx;
        y += dy;
        fA = footLocal(pa, x, y, fA.u, winA);
        fB = footLocal(pb, x, y, fB.u, winB);
      }
      const res = Math.max(Math.abs(fA.d - delta), Math.abs(fB.d - delta));
      if (res < 1e-9 * Math.max(1, delta)) ok = true;
      return { x, y, res, fa: 0, fb: 0, sA: fA.u, sB: fB.u, ok };
    };
    const v = solve(h);
`,
  );
  rep(
    "        const denAt = (x: number, y: number): number => {\n          const gA = footInWindow(pa, x, y, winA[0], winA[1]);\n          const gB = footInWindow(pb, x, y, winB[0], winB[1]);\n          return 1 + ((x - gA.x) * (x - gB.x) + (y - gA.y) * (y - gB.y)) / (gA.d * gB.d);\n        };\n        const denV = denAt(v.x, v.y);\n",
    `        // K992 s3: den from the tracked feet, and the overlap gate. ov is how
        // much nearer to q the nearest point of either arm's window is than
        // its tracked contact (0 until another part of the arm comes as near):
        // the ball stops over ov from 0 to ${OVE}h instead of a foot jumping
        // there.
        const denT = (p: Sol): number => {
          const gA = pointAt(pa, p.sA);
          const gB = pointAt(pb, p.sB);
          const ax = p.x - gA.x;
          const ay = p.y - gA.y;
          const bx = p.x - gB.x;
          const by = p.y - gB.y;
          return 1 + (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by));
        };
        const ovAt = (p: Sol): number => {
          const gA = pointAt(pa, p.sA);
          const gB = pointAt(pb, p.sB);
          const oA = Math.hypot(p.x - gA.x, p.y - gA.y) - footInWindow(pa, p.x, p.y, winA[0], winA[1]).d;
          const oB = Math.hypot(p.x - gB.x, p.y - gB.y) - footInWindow(pb, p.x, p.y, winB[0], winB[1]).d;
          return Math.max(0, oA, oB);
        };
        const vt: Sol = { ...v, sA: unwrap(pa, v.sA, winA), sB: unwrap(pb, v.sB, winB) };
        cur = vt;
        const denV = denT(vt);
`,
  );
  rep("          const gs = ss((denAt(p.x, p.y) / denV - ", `          const gs = ss(1 - ovAt(p) / (${OVE} * h)) * ss((denT(p) / denV - `);
  rep(
    "            const fA = footInWindow(pa, p.x, p.y, winA[0], winA[1]);\n            const fB = footInWindow(pb, p.x, p.y, winB[0], winB[1]);\n",
    "            const fA = footLocal(pa, p.x, p.y, p.sA, winA);\n            const fB = footLocal(pb, p.x, p.y, p.sB, winB);\n",
  );
  rep("              const n = newton(d1, gx, gy, acc, 60);\n", "              const n = newtonT(d1, gx, gy, p.sA, p.sB, acc, 60);\n");
  rep("        let S = wAt(v);\n", "        let S = wAt(vt);\n");
  rep("        const nodes: Sol[] = [v];\n", "        const nodes: Sol[] = [vt];\n");
  rep(
    "      const fA = footInWindow(pa, qq.x, qq.y, winA[0], winA[1]);\n      const fB = footInWindow(pb, qq.x, qq.y, winB[0], winB[1]);\n",
    `      // K992 s3: the tangent feet are the contacts the branch tracked to q
      // (a local descent from q's own), not a fresh nearest point: q can sit
      // where another part of an arm is as near (F1, F2).
      const fA = footLocal(pa, qq.x, qq.y, unwrap(pa, qq.sA, winA), winA);
      const fB = footLocal(pb, qq.x, qq.y, unwrap(pb, qq.sB, winB), winB);
`,
  );
}
// K992 s4 (--smin cert, c23): S by construction. S at each fixed node is the
// minimum of w over the stretch so far, certified to TAU by bounds on w's
// inputs between evaluated points (no DROP: no sample placement decides
// anything), the fold is located to 1e-6h, and footMaxA/B are certified upper
// bounds of each foot over the stretch, so the cap refit's gate is a measure.
// c23: mk_c17.mjs --refine 10 --foot track --smin cert --out oracle_c23.ts
const SMIN = opt("smin", "");
const TAU = Number(opt("tau", "1e-5"));
if (SMIN === "cert") {
  if (FOOT !== "track") throw new Error("--smin cert needs --foot track");
  if (!SRC) s = `// K992 probe c23 (mk_c17.mjs --smin cert, tau ${TAU}): c21 with S the certified running minimum at fixed nodes.\n` + s;
  repBlock(
    ["        // S at fixed nodes h + k·dN (trapezoid rule), until S reaches 0.\n"],
    "        // q: the branch point at δ* = h + area, from the last node below it.\n",
    `        // K992 s4: S by construction. S at the fixed node h + k·dN is the
        // minimum of w over [h, h + k·dN], certified to ${TAU}: between two
        // evaluated points w has a lower bound from bounds on its inputs (den
        // moves at most 2(2 − den)/δ per unit of δ, since a vertex foot turns
        // its normal at tan(φ/2)/δ; a foot moves at most tan(φ/2) =
        // sqrt(2/den − 1); the overlap margin at most |u| + 1; an interval
        // whose ends differ by more, a foot's hop at a concave vertex, takes
        // their difference), and only an interval whose bound falls below the
        // running minimum by more than ${TAU} is halved, down to 1e-6h. Where
        // the points fall decides nothing: each node's S is the minimum to
        // within ${TAU}, the trapezoid over the fixed nodes is continuous in
        // it, and a fold is located to 1e-6h. footMaxA/B are upper bounds of
        // each foot over the stretch the march covered, so the cap refit runs
        // wherever the cap gate could move r and skipping it changes nothing.
        const dN = r / ${NODES};
        const FLOOR = 1e-6 * h;
        // The overlap margin: how much farther from q than the tracked
        // contact the nearest point of the window outside the contact's basin
        // is. The basin is the run of the arm around the contact over which
        // the distance to q rises (it ends at a vertex where the distance
        // starts to fall); ov = max(0, −margin).
        const margin = (pl: Poly, x: number, y: number, sf: number, win: [number, number], dc: number): number => {
          const f0 = pointAt(pl, sf);
          const base = sf - normS(pl, sf);
          let hi = win[1];
          let k = f0.k;
          let bk = base;
          for (let it = 0; it <= pl.nseg; it++) {
            const sv = bk + pl.s[k] + pl.segLen[k];
            if (sv >= win[1]) break;
            let k2 = k + 1;
            let b2 = bk;
            if (k2 >= pl.nseg) {
              if (!pl.closed) break;
              k2 = 0;
              b2 = bk + pl.len;
            }
            const e = segB(pl, k2);
            if ((pl.x[k2] - x) * (pl.x[e] - pl.x[k2]) + (pl.y[k2] - y) * (pl.y[e] - pl.y[k2]) < 0) {
              hi = sv;
              break;
            }
            k = k2;
            bk = b2;
          }
          let lo = win[0];
          k = f0.k;
          bk = base;
          for (let it = 0; it <= pl.nseg; it++) {
            const sv = bk + pl.s[k];
            if (sv <= win[0]) break;
            let k2 = k - 1;
            let b2 = bk;
            if (k2 < 0) {
              if (!pl.closed) break;
              k2 = pl.nseg - 1;
              b2 = bk - pl.len;
            }
            if ((pl.x[k] - x) * (pl.x[k2] - pl.x[k]) + (pl.y[k] - y) * (pl.y[k2] - pl.y[k]) < 0) {
              lo = sv;
              break;
            }
            k = k2;
            bk = b2;
          }
          let d2 = Infinity;
          if (lo > win[0]) d2 = footInWindow(pl, x, y, win[0], lo).d;
          if (hi < win[1]) d2 = Math.min(d2, footInWindow(pl, x, y, hi, win[1]).d);
          return d2 - dc;
        };
        type Pt = { p: Sol; d: number; w: number; den: number; fA: number; fB: number; mA: number; mB: number };
        const at = (p: Sol, d: number): Pt => {
          const gA = pointAt(pa, p.sA);
          const gB = pointAt(pb, p.sB);
          const ax = p.x - gA.x;
          const ay = p.y - gA.y;
          const bx = p.x - gB.x;
          const by = p.y - gB.y;
          const dA = Math.hypot(ax, ay);
          const dB = Math.hypot(bx, by);
          const den = 1 + (ax * bx + ay * by) / (dA * dB);
          const mA = margin(pa, p.x, p.y, p.sA, winA, dA);
          const mB = margin(pb, p.x, p.y, p.sB, winB, dB);
          const fA = footA(p);
          const fB = footB(p);
          const slack = Math.min(capLimA - fA, capLimB - fB);
          let w = ss(1 + Math.min(0, mA, mB) / (${OVE} * h)) * ss((den / denV - ${K0}) / ${+(K1 - K0).toFixed(6)});
          if (slack !== Infinity) w *= ss(slack / (${EPSC} * h));
          return { p, d, w, den, fA, fB, mA, mB };
        };
        // The lower bound over [f0's δ, f1's δ] (length D) of a function
        // that moves at most L per unit of δ, or at most as far as its ends
        // differ where they differ by more.
        const vb = (f0: number, f1: number, L: number, D: number): number =>
          f0 === Infinity || f1 === Infinity ? Math.min(f0, f1) - L * D : 0.5 * (f0 + f1) - 0.5 * Math.max(L * D, Math.abs(f1 - f0));
        const bounds = (a: Pt, b: Pt): { w: number; fA: number; fB: number } => {
          const D = b.d - a.d;
          const den1 = vb(a.den, b.den, 4 / a.d, D);
          const denLo = Math.max(1e-9, vb(a.den, b.den, (2 * (2 - Math.max(0, den1))) / a.d, D));
          const U = Math.sqrt(2 / denLo);
          const Lf = Math.sqrt(Math.max(0, 2 / denLo - 1));
          const mLo = Math.min(vb(a.mA, b.mA, U + 1, D), vb(a.mB, b.mB, U + 1, D));
          const fA = -vb(-a.fA, -b.fA, Lf, D);
          const fB = -vb(-a.fB, -b.fB, Lf, D);
          let w = ss(1 + Math.min(0, mLo) / (${OVE} * h)) * ss((denLo / denV - ${K0}) / ${+(K1 - K0).toFixed(6)});
          const slack = Math.min(capLimA - fA, capLimB - fB);
          if (slack !== Infinity) w *= ss(slack / (${EPSC} * h));
          return { w, fA, fB };
        };
        // The minimum of w over [a, b] where it is below inc, to within ${TAU}.
        const minOn = (a: Pt, b: Pt, inc: number): number => {
          let m = Math.min(inc, b.w);
          const st: Pt[] = [a, b];
          while (st.length) {
            const rt = st.pop()!;
            const lf = st.pop()!;
            if (rt.d - lf.d <= FLOOR || bounds(lf, rt).w >= m - ${TAU}) continue;
            const dm = 0.5 * (lf.d + rt.d);
            const pm = advance(lf.p, lf.d, dm, dm - lf.d);
            if (!pm) continue;
            const M = at(pm, dm);
            if (M.w < m) m = M.w;
            st.push(M, rt, lf, M);
          }
          return m;
        };
        let P0 = at(vt, h);
        let S = P0.w;
        let area = 0;
        const nodes: Sol[] = [vt];
        const nodeD: number[] = [h];
        let fmA = P0.fA;
        let fmB = P0.fB;
        for (let k = 1; k <= ${NODES} && S > 0; k++) {
          const d0 = h + (k - 1) * dN;
          const d1 = h + k * dN;
          const p1 = advance(P0.p, d0, d1, dN);
          let P1: Pt;
          if (p1) P1 = at(p1, d1);
          else {
            // The branch folds: its last point, located to 1e-6h.
            P1 = P0;
            let hiD = d1;
            while (hiD - P1.d > FLOOR) {
              const dm = 0.5 * (P1.d + hiD);
              const pm = advance(P1.p, P1.d, dm, dm - P1.d);
              if (pm) P1 = at(pm, dm);
              else hiD = dm;
            }
          }
          const fb = bounds(P0, P1);
          fmA = Math.max(fmA, fb.fA);
          fmB = Math.max(fmB, fb.fB);
          const S1 = minOn(P0, P1, S);
          area += 0.5 * (S + S1) * (P1.d - d0);
          S = S1;
          if (!p1) {
            c.fold = P1.d;
            break;
          }
          nodes.push(P1.p);
          nodeD.push(d1);
          P0 = P1;
        }
        c.footMaxA = fmA;
        c.footMaxB = fmB;
`,
  );
}
writeFileSync(OUT, s);
console.log(`wrote ${OUT}`);


