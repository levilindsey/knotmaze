// K992 stage 3 (brief call 3): the part walk's reach solved, not stepped.
// partExtents walks on from a span's end in h/8 steps while the arm's
// cross-section overlaps another member of its cluster; the reach was the
// first step past the last overlapping one, so it moved in h/8 jumps (K1000
// H5: the caps' last jump). Here the walk's steps only find the last
// overlapping step; the parting is then bisected between it and the next
// step, to 1e-6h. Works on any oracle copy whose walk is master's.
// node .claude/probes/S3a/mk_walk21.mjs --in <oracle> --out <name> [--src]
//   (--src: no probe header; --out is then a full path)
import { readFileSync, writeFileSync } from "node:fs";
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.indexOf(`--${k}`) >= 0 ? argv[argv.indexOf(`--${k}`) + 1] : d);
const dir = ".claude/probes/S3a/";
const IN = opt("in", dir + "oracle_c21c.ts");
const OUT = opt("out", "oracle_c21w.ts");
const OUTP = OUT.includes("/") || OUT.includes("\\") ? OUT : dir + OUT;
const SRC = argv.includes("--src");
const TOL = opt("tol", "1e-6");
let s = readFileSync(IN, "utf8").replace(/\r\n/g, "\n");
const rep = (a, b) => {
  const i = s.indexOf(a);
  if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error(`not found once: ${a.slice(0, 80)}`);
  s = s.slice(0, i) + b + s.slice(i + a.length);
};
rep(
  "          for (let t = e0 + step; t <= Math.min(room, e0 + 12 * h) && t - last < h; t += step) if (hits(t)) last = t;\n          const part = Math.min(room, last + step);\n",
  `          for (let t = e0 + step; t <= Math.min(room, e0 + 12 * h) && t - last < h; t += step) if (hits(t)) last = t;
          // K992 s3: the parting is solved, not stepped. The steps above find
          // the last overlapping one; the next step overlaps nothing (the walk
          // tried it), so the parting lies between them and is bisected to
          // ${TOL}h: the reach moves with the geometry, not in h/8 jumps. Where
          // the next step lies past the walk's limit, the limit stands in for
          // it, and a run that overlaps there ends at the limit.
          const lim = Math.min(room, e0 + 12 * h);
          let tIn = last;
          let tOut = Math.min(last + step, lim);
          if (tOut < last + step && hits(tOut)) tIn = tOut;
          while (tOut - tIn > ${TOL} * h) {
            const mid = 0.5 * (tIn + tOut);
            if (hits(mid)) tIn = mid;
            else tOut = mid;
          }
          const part = Math.min(room, tOut);
`,
);
rep(
  "   * cluster: another arm's span's tube (on the walker's own chain only away\n   * from the walker), or a corner fill of the cluster. The extent becomes\n   * the last overlapping step's distance − margin, so the span ends W past\n   * the parting; caps clamp it (rawSpans).",
  "   * cluster: another arm's span's tube (on the walker's own chain only away\n   * from the walker), or a corner fill of the cluster. The parting is then\n   * bisected between the last overlapping step and the next (K992 stage 3),\n   * and the extent becomes the parting's distance − margin, so the span ends\n   * W past the parting; caps clamp it (rawSpans).",
);
if (!SRC) s = `// K992 probe (mk_walk21.mjs --in ${IN.replace(dir, "")}, tol ${TOL}).\n` + s;
writeFileSync(OUTP, s);
console.log(`wrote ${OUTP}`);
