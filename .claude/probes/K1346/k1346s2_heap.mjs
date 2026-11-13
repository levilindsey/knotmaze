// K1346 s2: allocation by function from two V8 sampling heap profiles (node --heap-prof), master's single-variant
// process against the branch's (k1346s2_proc.ts which=M / which=B): which functions allocate more on the branch.
//   node --heap-prof --heap-prof-dir=<dirM> scripts/run_node.mjs .claude/probes/K1346/k1346s2_proc.ts <drag> which=M
//   node .claude/probes/K1346/k1346s2_heap.mjs <M.heapprofile> <B.heapprofile> [top=20]
import { readFileSync } from "node:fs";

const by = (f) => {
  const P = JSON.parse(readFileSync(f, "utf8")); const m = new Map(); let tot = 0;
  const walk = (n) => {
    const s = n.selfSize ?? 0;
    if (s) {
      const u = n.callFrame.url.replace(/^.*[\\/]/, "").replace("outline_m2.ts", "outline.ts").replace("outline_model_m2.ts", "outline_model.ts");
      const k = `${n.callFrame.functionName || "(anon)"} ${u}:${n.callFrame.lineNumber + 1}`.replace(/:\d+$/, "");
      m.set(k, (m.get(k) ?? 0) + s); tot += s;
    }
    for (const c of n.children ?? []) walk(c);
  };
  walk(P.head); return { m, tot };
};
const A = by(process.argv[2]); const B = by(process.argv[3]);
const top = +(process.argv.find((a) => a.startsWith("top="))?.slice(4) ?? 20);
console.log(`sampled live-at-sample MB: M ${(A.tot / 1e6).toFixed(1)}  B ${(B.tot / 1e6).toFixed(1)}`);
const keys = new Set([...A.m.keys(), ...B.m.keys()]);
const rows = [...keys].map((k) => [k, (A.m.get(k) ?? 0) / 1e6, (B.m.get(k) ?? 0) / 1e6]).sort((x, y) => Math.abs(y[2] - y[1]) - Math.abs(x[2] - x[1]));
for (const [k, a, b] of rows.slice(0, top)) console.log(`${k.slice(0, 44).padEnd(44)} ${a.toFixed(2).padStart(7)} ${b.toFixed(2).padStart(7)} ${(b - a >= 0 ? "+" : "") + (b - a).toFixed(2)}`);
