// K1000: pop-by-pop diff of two census tags on one run (by transition and 6 px cell).
// node .claude/probes/S3a/popdiff19.cjs <tagA> <tagB> <run>   (tags under cmpdir19)
const fs = require("fs");
const [a, b, run] = process.argv.slice(2);
const L = (t) => JSON.parse(fs.readFileSync(`.claude/probes/S3a/cmpdir19/${t}/${run}.json`, "utf8"));
const A = L(a), B = L(b);
const key = (T, p) => `${T.t}@${Math.round(p.cx / 6)},${Math.round(p.cy / 6)}`;
const per = (J) => { const m = new Map(); for (const T of J.transitions) for (const p of T.pops) m.set(key(T, p), { t: T.t, ...p }); return m; };
const ma = per(A), mb = per(B);
const rows = [];
for (const [k, p] of mb) { const q = ma.get(k); rows.push({ k, t: p.t, d: p.area - (q ? q.area : 0), area: p.area, was: q ? q.area : 0, cause: p.cause, wasCause: q ? q.cause : "-", x: Math.round(p.cx), y: Math.round(p.cy) }); }
for (const [k, q] of ma) if (!mb.has(k)) rows.push({ k, t: q.t, d: -q.area, area: 0, was: q.area, cause: "-", wasCause: q.cause, x: Math.round(q.cx), y: Math.round(q.cy) });
rows.sort((u, v) => v.d - u.d);
console.log("largest gains:"); for (const r of rows.slice(0, 14)) console.log(`t${r.t} (${r.x},${r.y}) ${r.was}->${r.area} ${r.wasCause}->${r.cause}`);
console.log("largest losses:"); for (const r of rows.slice(-8)) console.log(`t${r.t} (${r.x},${r.y}) ${r.was}->${r.area} ${r.wasCause}->${r.cause}`);
const byT = {}; for (const r of rows) byT[r.t] = (byT[r.t] ?? 0) + r.d; console.log("net by transition:", Object.entries(byT).filter(([, v]) => Math.abs(v) > 30).map(([t, v]) => `t${t}:${v}`).join(" "));

