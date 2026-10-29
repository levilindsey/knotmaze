// K992: make oracle_a16.ts = master's oracle (oracle_m14.ts) with two
// corner rules continuous in the geometry:
//  1. GROWN BALL. q is the root continued from V as the ball grows (δ from
//     h to h + r, a tangent predictor along the medial axis and Newton, the
//     step halved on a miss): the branch that starts at V, never another
//     root. Where that branch folds (the arms run apart no wider than
//     2(h + r): the largest ball between them is smaller), r stops at the
//     fold, so q stays on the branch and the corner stays live.
//  2. CLOSED-FORM FIT. r = min(the grown r, max(0, cap − W − |V's foot|)
//     · tan(θ/2)) on each arm, always (no over() test, no iteration): the
//     straight-arm radius whose tangent points end at cap − W.
// The windows are the rule radius's, whatever r the fit or the fold take.
// node .claude/probes/S3a/mk_a16.mjs [--fit none|tan] [--out <name>]
// node .claude/probes/S3a/mk_a16.mjs --src --out <path>   (the same edits on
//   src/render/field/oracle.ts, written to <path>: the landing)
import { readFileSync, writeFileSync } from "node:fs";
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.indexOf(`--${k}`) >= 0 ? argv[argv.indexOf(`--${k}`) + 1] : d);
const FIT = opt("fit", "tan");
const SRC = argv.includes("--src");
const dir = ".claude/probes/S3a/";
const OUT = SRC ? opt("out", "") : dir + opt("out", "oracle_a16.ts");
if (!OUT) throw new Error("--src needs --out <path>");
let s = readFileSync(SRC ? "src/render/field/oracle.ts" : dir + "oracle_m14.ts", "utf8").replace(/\r\n/g, "\n");
const rep = (a, b) => {
  const i = s.indexOf(a);
  if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error(`not found once: ${a.slice(0, 80)}`);
  s = s.slice(0, i) + b + s.slice(i + a.length);
};
if (!SRC)
  rep(
    "// K868 S3a6: master's oracle (c26a9875), frozen for the before/after runs.",
    `// K992 probe: master's oracle (oracle_m14.ts) with the grown ball and the ${FIT === "tan" ? "closed-form fit" : "fit left out (fold only)"} (mk_a16.mjs).`,
  );
rep("  rRule?: number;\n", "  rRule?: number;\n  /** K992: the δ at which the ball's branch folded (r stopped there). */\n  fold?: number;\n");
rep(
  '    style: "round" | "sharp",\n    r: number,\n  ): Corner {',
  '    style: "round" | "sharp",\n    r: number,\n    /** K992: the windows\' radius, the rule\'s r whatever r the fit or the fold take. */\n    rWin = r,\n  ): Corner {',
);
rep("const reachQ = (h + r) / Math.max(Math.sin(half), 1e-3);", "const reachQ = (h + rWin) / Math.max(Math.sin(half), 1e-3);");
rep("    const newton = (delta: number, x0: number, y0: number): Sol => {", "    const newton = (delta: number, x0: number, y0: number, limit?: number, its = 200): Sol => {");
rep("      for (let it = 0; it < 200; it++) {\n        const ra = fA.d - delta;", "      for (let it = 0; it < its; it++) {\n        const ra = fA.d - delta;");
rep("        const lim = 0.5 * Math.max(delta, h);\n        if (dl > lim) {\n          dx *= lim / dl;\n          dy *= lim / dl;\n        }\n        x += dx;\n        y += dy;\n        fA = footInWindow(pa, x, y, winA[0], winA[1]);\n        fB = footInWindow(pb, x, y, winB[0], winB[1]);\n      }\n      const res",
  "        const lim = limit ?? 0.5 * Math.max(delta, h);\n        if (dl > lim) {\n          dx *= lim / dl;\n          dy *= lim / dl;\n        }\n        x += dx;\n        y += dy;\n        fA = footInWindow(pa, x, y, winA[0], winA[1]);\n        fB = footInWindow(pb, x, y, winB[0], winB[1]);\n      }\n      const res");
rep("      rRule: r,\n", "      rRule: rWin,\n");
rep(
  "    if (r > 0) {\n      const qq = solve(h + r);\n",
  `    if (r > 0) {
      // K992 rule 1, the grown ball: q is V's root continued along the
      // medial axis as the ball grows from δ = h to h + r, and r stops where
      // that branch folds. Each step predicts along u (nA·u = nB·u = 1) and
      // polishes with Newton held near the prediction; a miss halves the
      // step. No other root is a candidate, so q cannot switch branch, and
      // the fold (the largest ball the arms admit) moves with the arms.
      let qq: Sol;
      if (v.ok) {
        let cur: Sol = v;
        let d = h;
        const top = h + r;
        const base = r / Math.max(4, Math.ceil(r / (0.125 * h)));
        let step = base;
        while (top - d > 1e-12 * top) {
          const d1 = Math.min(top, d + step);
          const dd = d1 - d;
          const fA = footInWindow(pa, cur.x, cur.y, winA[0], winA[1]);
          const fB = footInWindow(pb, cur.x, cur.y, winB[0], winB[1]);
          const nax = (cur.x - fA.x) / fA.d;
          const nay = (cur.y - fA.y) / fA.d;
          const nbx = (cur.x - fB.x) / fB.d;
          const nby = (cur.y - fB.y) / fB.d;
          const den = 1 + nax * nbx + nay * nby;
          let next: Sol | null = null;
          if (den > 1e-9) {
            const ux = (nax + nbx) / den;
            const uy = (nay + nby) / den;
            const gx = cur.x + ux * dd;
            const gy = cur.y + uy * dd;
            const acc = Math.min(h, Math.max(0.5 * Math.hypot(ux, uy) * dd, 1e-3 * h));
            const n = newton(d1, gx, gy, acc, 60);
            if (n.ok && Math.hypot(n.x - gx, n.y - gy) <= acc) next = n;
          }
          if (next) {
            cur = next;
            d = d1;
            step = Math.min(base, 2 * step);
          } else {
            step /= 2;
            if (step < 1e-5 * h) break;
          }
        }
        qq = cur;
        if (top - d > 1e-12 * top) {
          c.fold = d;
          r = Math.max(0, d - h);
          c.r = r;
        }
      } else qq = solve(h + r);
`,
);
if (FIT === "tan") {
  const a = s.indexOf("      if (!(over() > 1e-9 * h)) continue;");
  const bTxt = '      c.fit = `r ${(r0 / h).toFixed(3)}h → ${(c.r / h).toFixed(3)}h: ${why}${room() <= 0 ? " (no room past V: sharp)" : ""}`;\n';
  const b = s.indexOf(bTxt, a);
  if (a < 0 || b < 0) throw new Error("re-fit block not found");
  s =
    s.slice(0, a) +
    `      // K992 rule 2, the closed-form fit: r = min(the grown ball's r,
      // max(0, cap − W − |V's foot|)·tan(θ/2)) on the tighter arm, always.
      // It is the straight-arm radius whose tangent points end at cap − W,
      // continuous and monotone in the caps and V's feet: no over() test
      // and no iteration (both were discrete choices that popped).
      const rFit = Math.min(c.r, Math.max(0, room()) * Math.tan(c.theta / 2));
      if (!(rFit < c.r)) continue;
      const why = capA - Math.abs(dS(pa, c.armA.s, c.sTA)) < capB - Math.abs(dS(pb, c.armB.s, c.sTB))
        ? this.armCaps[c.junction][c.armIdxA!].why
        : this.armCaps[c.junction][c.armIdxB!].why;
      const r0 = c.r;
      const fit = this.solveCorner(c.junction, c.index, c.armA, c.a, c.armB, c.b, c.theta, c.style, rFit, c.rRule);
      Object.assign(c, { ...fit, cluster: c.cluster, armIdxA: c.armIdxA, armIdxB: c.armIdxB, rRule: c.rRule });
` +
    bTxt +
    s.slice(b + bTxt.length);
} else if (FIT === "none") {
  rep("      if (!(over() > 1e-9 * h)) continue;", "      if (!(over() > 1e-9 * h)) continue;\n      if (FIT_NONE) continue;");
  s = s.replace("export class FieldModel {", "const FIT_NONE = true;\nexport class FieldModel {");
}
writeFileSync(OUT, s);
console.log(`wrote ${OUT} (fit ${FIT}${SRC ? ", from src" : ""})`);
