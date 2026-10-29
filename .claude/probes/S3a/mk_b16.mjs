// K992: make oracle_b16.ts from oracle_a16.ts (mk_a16.mjs). Two changes:
//  1. THE STEEP STOP. The grown ball stops where its branch turns steep:
//     den = 1 + nA·nB falls to KAPPA × its value at V (|u| = sqrt(2/den),
//     q's speed per unit of δ, has grown by 1/sqrt(KAPPA)). a16 stopped only
//     where Newton missed near the fold, where q's speed is unbounded, so
//     the stop flipped between δs a step apart and q jumped (j172/1).
//  2. THE CAP STOP, in place of the closed-form fit. The grown ball also
//     stops where a tangent foot reaches cap − W on its arm (arc length from
//     the root). a16's straight-arm closed form kept round corners whose
//     tangent points ran past the caps on curved arms (j172/1: master's
//     over() test made it sharp there).
// Each stop is located by the march's step halving (to 1e-5 h), as a miss.
// node .claude/probes/S3a/mk_b16.mjs [--kappa 0.5] [--out oracle_b16.ts]
// node .claude/probes/S3a/mk_b16.mjs --src --in <a16 made by mk_a16.mjs --src> --out <path>
//   (the landing: the same edits on src's oracle, with the rules' comments)
import { readFileSync, writeFileSync } from "node:fs";
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.indexOf(`--${k}`) >= 0 ? argv[argv.indexOf(`--${k}`) + 1] : d);
const KAPPA = Number(opt("kappa", "0.5"));
const SRC = argv.includes("--src");
const dir = ".claude/probes/S3a/";
const IN = opt("in", dir + "oracle_a16.ts");
const OUT = SRC ? opt("out", "") : dir + opt("out", "oracle_b16.ts");
if (!OUT) throw new Error("--src needs --out <path>");
let s = readFileSync(IN, "utf8").replace(/\r\n/g, "\n");
const rep = (a, b) => {
  const i = s.indexOf(a);
  if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error(`not found once: ${a.slice(0, 80)}`);
  s = s.slice(0, i) + b + s.slice(i + a.length);
};
/** Replace from the first of `starts` found to (not including) `end`. */
const repBlock = (starts, end, b) => {
  const st = starts.map((x) => s.indexOf(x)).filter((i) => i >= 0);
  if (st.length !== 1) throw new Error(`block start not found once: ${starts[0].slice(0, 60)}`);
  const e = s.indexOf(end, st[0]);
  if (e < 0) throw new Error(`block end not found: ${end.slice(0, 60)}`);
  s = s.slice(0, st[0]) + b + s.slice(e);
};
if (!SRC) rep("// K992 probe: master's oracle", `// K992 probe b16 (mk_b16.mjs, kappa ${KAPPA}): a16 with the steep stop and the cap stop. Was: master's oracle`);
rep(
  "    rWin = r,\n  ): Corner {",
  "    rWin = r,\n    /** K992: the tangent feet's limits, arc length from the root (cap − W). */\n    capLimA = Infinity,\n    capLimB = Infinity,\n  ): Corner {",
);
// R1's comment, either mk_a16 generation's.
repBlock(
  ["      // K992: the grown ball. q is V's root", "      // K992 rule 1, the grown ball:"],
  "      let qq: Sol;\n",
  `      // K992 rule 1, the grown ball: q is V's root continued along the
      // medial axis as the ball grows from δ = h to h + r, and the ball stops
      // early where its branch turns steep (den = 1 + nA·nB below ${KAPPA} of
      // its value at V) or a tangent foot passes its limit (the cap stop).
      // Each step predicts along u (nA·u = nB·u = 1, |u| = sqrt(2/den), q's
      // speed per unit of δ) and polishes with Newton held near the
      // prediction; a miss, or a step past a stop, halves the step, so each
      // stop is located to 1e-5 h. No other root is a candidate, so q cannot
      // switch branch, and q's speed at a stop is bounded (a stop at the fold
      // itself, where |u| has no bound, jumped with every step halving).
`,
);
rep(
  "        const base = r / Math.max(4, Math.ceil(r / (0.125 * h)));\n        let step = base;\n",
  `        const base = r / Math.max(4, Math.ceil(r / (0.125 * h)));
        let step = base;
        const denAt = (x: number, y: number): number => {
          const gA = footInWindow(pa, x, y, winA[0], winA[1]);
          const gB = footInWindow(pb, x, y, winB[0], winB[1]);
          return 1 + ((x - gA.x) * (x - gB.x) + (y - gA.y) * (y - gB.y)) / (gA.d * gB.d);
        };
        const denMin = ${KAPPA} * denAt(v.x, v.y);
`,
);
rep(
  "            if (n.ok && Math.hypot(n.x - gx, n.y - gy) <= acc) next = n;\n",
  `            if (n.ok && Math.hypot(n.x - gx, n.y - gy) <= acc) next = n;
            if (
              next &&
              (denAt(next.x, next.y) < denMin ||
                Math.abs(dS(pa, A.s, next.sA)) > capLimA ||
                Math.abs(dS(pb, B.s, next.sB)) > capLimB)
            )
              next = null;
`,
);
// The re-fit: the cap stop in place of a16's closed form (either generation's comment).
repBlock(
  ["      // K992: the closed-form fit, always:", "      // K992 rule 2, the closed-form fit:"],
  "      const why = capA",
  `      // K992 rule 2, the cap stop: a corner whose tangent feet pass cap − W
      // is grown again with its feet held to cap − W (rule 1's stop), so r is
      // the largest ball on V's branch that fits its caps; over() > 0 only
      // skips the corners that stop would not change. It replaces master's
      // over() walk (r −= over·tan(θ/2), six times), whose steps and root
      // changes popped.
      if (!(over() > 1e-9 * h)) continue;
`,
);
rep(
  "      const fit = this.solveCorner(c.junction, c.index, c.armA, c.a, c.armB, c.b, c.theta, c.style, rFit, c.rRule);",
  "      const fit = this.solveCorner(c.junction, c.index, c.armA, c.a, c.armB, c.b, c.theta, c.style, c.r, c.rRule, capA - this.W, capB - this.W);",
);
writeFileSync(OUT, s);
console.log(`wrote ${OUT} (kappa ${KAPPA}${SRC ? ", from src" : ""})`);
