// K1000 step 5: the excess small pops of tag B over tag A on one run.
// A pop is excess when A has no pop in its transition and 6 px cell (popdiff19's key),
// and small when its area is under --max px (50). Prints each with its census
// event (cause, key, info), then the counts by cause and key.
// node .claude/probes/S3a/small19.cjs <tagA> <tagB> <run> [--max 50]   (tags under cmpdir19)
const fs = require("fs");
const argv = process.argv.slice(2);
const [a, b, run] = argv;
const mi = argv.indexOf("--max");
const MAX = mi >= 0 ? Number(argv[mi + 1]) : 50;
const L = (t) => JSON.parse(fs.readFileSync(`.claude/probes/S3a/cmpdir19/${t}/${run}.json`, "utf8"));
const A = L(a), B = L(b);
const key = (T, p) => `${T.t}@${Math.round(p.cx / 6)},${Math.round(p.cy / 6)}`;
const inA = new Set();
for (const T of A.transitions) for (const p of T.pops) inA.add(key(T, p));
const rows = [];
for (const T of B.transitions)
  for (const p of T.pops) {
    if (p.area >= MAX || inA.has(key(T, p))) continue;
    const e = (T.events || [])[p.event] || {};
    rows.push({ t: T.t, x: Math.round(p.cx), y: Math.round(p.cy), area: p.area, gain: p.gain, loss: p.loss, cause: p.cause, ekey: e.key ?? "-", info: e.info ? JSON.stringify(e.info) : "" });
  }
console.log(`${b} over ${a} on ${run}: ${rows.length} excess pops under ${MAX} px, ${rows.reduce((s, r) => s + r.area, 0)} px`);
for (const r of rows) console.log(`t${r.t} (${r.x},${r.y}) ${r.area} px (+${r.gain} -${r.loss}) ${r.cause} ${r.ekey} ${r.info}`);
const by = {};
for (const r of rows) {
  const k = `${r.cause} ${r.ekey}`;
  by[k] = by[k] || [0, 0];
  by[k][0]++;
  by[k][1] += r.area;
}
console.log("by cause and key:");
for (const [k, [n, ar]] of Object.entries(by).sort((x, y) => y[1][0] - x[1][0])) console.log(`  ${k}: ${n} pops ${ar} px`);
