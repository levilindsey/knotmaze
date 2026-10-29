// K1040 S1b, step 5: what a K868 scene holds around one site on one chain:
// the chain's length and ends, its crossings and junction arms by arc length
// (with their world points and distance to the site), its dead ends, and the
// arc length nearest the site.
// Run: node .claude/probes/K1040/s1/b_site.mjs <scene> <chain> <x> <y>
import { readFileSync } from "node:fs";

const [name, chs, xs, ys] = process.argv.slice(2);
const s = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8"));
const id = Number(chs);
const X = Number(xs);
const Y = Number(ys);
const c = s.chains.find((q) => q.id === id);
const P = c.pts;
const cum = [0];
for (let k = 2; k < P.length; k += 2) cum.push(cum[cum.length - 1] + Math.hypot(P[k] - P[k - 2], P[k + 1] - P[k - 1]));
const at = (sv) => {
  let i = 1;
  while (i < cum.length - 1 && cum[i] < sv) i++;
  const t = (sv - cum[i - 1]) / Math.max(1e-12, cum[i] - cum[i - 1]);
  return [P[2 * i - 2] + t * (P[2 * i] - P[2 * i - 2]), P[2 * i - 1] + t * (P[2 * i + 1] - P[2 * i - 1])];
};
const f = (p) => `(${p[0].toFixed(3)}, ${p[1].toFixed(3)}) [${Math.hypot(p[0] - X, p[1] - Y).toFixed(3)} from the site]`;
console.log(`chain ${id}: closed ${c.closed}, length ${cum[cum.length - 1].toFixed(3)}, start ${f([P[0], P[1]])}, end ${f([P[P.length - 2], P[P.length - 1]])}`);
let best = [Infinity, 0];
for (let k = 0; k <= 2000; k++) {
  const sv = (cum[cum.length - 1] * k) / 2000;
  const p = at(sv);
  const d = Math.hypot(p[0] - X, p[1] - Y);
  if (d < best[0]) best = [d, sv];
}
console.log(`nearest to the site: s ${best[1].toFixed(3)}, ${best[0].toFixed(3)} away`);
for (const x of s.crossings)
  for (const side of ["a", "b"])
    if (x[side].chain === id) {
      const o = side === "a" ? "b" : "a";
      console.log(`crossing at s ${x[side].s.toFixed(3)} ${f(at(x[side].s))} with chain ${x[o].chain} s ${x[o].s.toFixed(3)}; ${x.over === side ? "this chain over" : "this chain under"}`);
    }
for (const j of s.junctions) for (const a of j.arms) if (a.chain === id) console.log(`junction ${j.id} at ${f(j.c)}: arm s ${a.s.toFixed(3)} dir ${a.dir} kind ${a.kind}`);
for (const d of s.deadEnds ?? []) {
  const t = JSON.stringify(d);
  if (d.chain === id || t.includes(`"chain":${id},`) || t.includes(`"chain":${id}}`)) console.log(`dead end ${t.slice(0, 200)}`);
}
if ((s.deadEnds ?? []).length) console.log(`(dead end schema: ${Object.keys(s.deadEnds[0]).join(", ")})`);
