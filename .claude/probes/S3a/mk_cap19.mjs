// K1000 stage 1: make an oracle with the cut loop instrumented (--mode dbg)
// or with continuous caps (--mode cont) from any oracle copy whose cut loop
// is master's (oracle_m14.ts, oracle_c17f.ts, src: the text is identical).
// --mode cont also takes θ from interpolated tangents (cap19_tan.ts.txt) and
// drops the binary holders/cutAt the new loop replaces.
// node .claude/probes/S3a/mk_cap19.mjs --mode dbg|cont --in <oracle> --out <name> [--src]
import { readFileSync, writeFileSync } from "node:fs";
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.indexOf(`--${k}`) >= 0 ? argv[argv.indexOf(`--${k}`) + 1] : d);
const MODE = opt("mode", "dbg");
const dir = ".claude/probes/S3a/";
const IN = opt("in", dir + "oracle_m14.ts");
const OUT = opt("out", "oracle_m19d.ts");
const OUTP = OUT.includes("/") || OUT.includes("\\") ? OUT : dir + OUT;
const SRC = argv.includes("--src");
let s = readFileSync(IN, "utf8").replace(/\r\n/g, "\n");
const rep = (a, b) => {
  const i = s.indexOf(a);
  if (i < 0 || s.indexOf(a, i + 1) >= 0) throw new Error(`not found once: ${a.slice(0, 80)}`);
  s = s.slice(0, i) + b + s.slice(i + a.length);
};
const cut = (a, b) => {
  const i = s.indexOf(a);
  const j = s.indexOf(b, i);
  if (i < 0 || j < 0 || s.indexOf(a, i + 1) >= 0) throw new Error(`block not found once: ${a.slice(0, 60)}`);
  s = s.slice(0, i) + s.slice(j);
};
const LOOP_A = "    const tries = new Map<number, number>();\n";
const LOOP_B = "      sp = this.rawSpans(ext, caps);\n      if (!changed) break;\n    }\n";
const i0 = s.indexOf(LOOP_A);
const i1 = s.indexOf(LOOP_B, i0);
if (i0 < 0 || i1 < 0 || s.indexOf(LOOP_A, i0 + 1) >= 0) throw new Error("cut loop not found once");
const body = readFileSync(dir + `cap19_${MODE}.ts.txt`, "utf8").replace(/\r\n/g, "\n");
s = s.slice(0, i0) + body + s.slice(i1 + LOOP_B.length);
if (MODE === "cont") {
  const tan = readFileSync(dir + "cap19_tan.ts.txt", "utf8").replace(/\r\n/g, "\n");
  const C = "    // Crossing passes per chain, with the acute crossing angle.\n";
  rep(C, tan + C);
  rep(
    "      const ta = pointAt(this.polys[ia], normS(this.polys[ia], cx.a.s));\n      const tb = pointAt(this.polys[ib], normS(this.polys[ib], cx.b.s));\n",
    "      const ta = tanAt(this.polys[ia], normS(this.polys[ia], cx.a.s));\n      const tb = tanAt(this.polys[ib], normS(this.polys[ib], cx.b.s));\n",
  );
  cut("    // Which junction arms' spans contain (pi, s).\n", "    const clusterRoots = (sp:");
  cut("    // Stop an arm short of a pass:", "    // K922's part walk");
}
if (!SRC) s = `// K1000 probe (mk_cap19.mjs --mode ${MODE} --in ${IN.replace(dir, "")}).\n` + s;
writeFileSync(OUTP, s);
console.log(`wrote ${OUTP}`);
