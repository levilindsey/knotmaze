// pdiff.mjs: the params a link parsed to on two builds, from the round's passes (every run records the page's parsed
// __knotParams()). Offline: reads <round-dir>/<pass>/scan/results.json and <pass>/g31/results.json, touches no phone. An empty
// paramDiff means the two builds make the same maze on that link, so a render-sync step between them is the renderer's; a key that
// differs means the maze moved (a default changed in url_state.ts or param_codec.ts).
// Call: node scripts/phone_pass/pdiff.mjs <round-dir> <link> <shaA> <shaB>
//   <round-dir>  the round folder (round.mjs); <link> dense|maxfab|knot24; shaA and shaB a sha prefix (8 characters as the passes
//   record them) or a list index of the round's commit list; both builds must have run on that link in some pass of the round.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { loadRound, paramDiff } from "./round.mjs";

const [dirArg, link, a0, b0] = process.argv.slice(2);
if (!dirArg || !link || !a0 || !b0) { console.log("usage: node pdiff.mjs <round-dir> <link> <shaA|index> <shaB|index>"); process.exit(2); }
const R = loadRound(dirArg);
const sha8 = (v) => (/^\d{1,3}$/.test(v) ? R.short(Number(v)) : String(v).slice(0, 8));
const a = sha8(a0), b = sha8(b0);
const byKey = new Map();
for (const d of readdirSync(R.dir, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  for (const f of [`${R.dir}/${d.name}/scan/results.json`, `${R.dir}/${d.name}/g31/results.json`]) {
    if (!existsSync(f)) continue;
    let j;
    try { j = JSON.parse(readFileSync(f, "utf8")); } catch { continue; }
    for (const r of j.runs || []) {
      if (!r.params || !r.sha) continue;
      const k = r.link + "|" + String(r.sha).slice(0, 8);
      if (!byKey.has(k)) byKey.set(k, { params: r.params, from: d.name });
    }
  }
}
const A = byKey.get(link + "|" + a);
const B = byKey.get(link + "|" + b);
if (!A || !B) { console.log("missing", !A ? a : "", !B ? b : "", "known:", [...byKey.keys()].filter((k) => k.startsWith(link + "|")).join(" ")); process.exit(1); }
const pd = paramDiff(A.params, B.params);
const diff = [...pd.ch, ...pd.add.map((k) => `${k}: one side only`)];
console.log(link, a, "(" + A.from + ")", "vs", b, "(" + B.from + ")", "paramDiff", diff.length ? "" : "[] (the same maze)");
for (const k of pd.ch) console.log("  " + k);
for (const k of pd.add) console.log("  " + k + " (one side only)");