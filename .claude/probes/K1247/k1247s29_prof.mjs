// K1247 s29: self and inclusive ms per function from a V8 .cpuprofile, for the files whose url matches
// `files` (comma list of substrings; default the outline folder). Inclusive time counts a function once per
// sample even when it recurses. Divide by the bench's reps for per-frame ms (div=<reps>).
//   node .claude/probes/K1247/k1247s29_prof.mjs <file.cpuprofile> [top=30] [files=outline/] [div=1] [sort=self|incl] [filter=]
import { readFileSync } from "node:fs";
const [file, ...rest] = process.argv.slice(2);
const arg = (k, d) => rest.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const top = +arg("top", "30"); const files = arg("files", "outline/").split(","); const div = +arg("div", "1");
const sort = arg("sort", "self"); const filter = arg("filter", "");
const P = JSON.parse(readFileSync(file, "utf8"));
const byId = new Map(P.nodes.map((n) => [n.id, n]));
const parent = new Map();
for (const n of P.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
const dt = new Map();
for (let i = 0; i < P.samples.length; i++) dt.set(P.samples[i], (dt.get(P.samples[i]) ?? 0) + (P.timeDeltas[i] ?? 0));
const keyOf = (n) => {
  const u = n.callFrame.url; if (!files.some((f) => u.includes(f))) return null;
  return `${n.callFrame.functionName || "(anon)"} ${u.slice(u.lastIndexOf("/") + 1).replace(/\?.*$/, "")}:${n.callFrame.lineNumber + 1}`;
};
const self = new Map(); const incl = new Map();
for (const [id, us] of dt) {
  const n = byId.get(id); const k = keyOf(n);
  if (k) self.set(k, (self.get(k) ?? 0) + us / 1000);
  const seen = new Set();
  for (let c = id; c !== undefined; c = parent.get(c)) {
    const kk = keyOf(byId.get(c)); if (!kk || seen.has(kk)) continue;
    seen.add(kk); incl.set(kk, (incl.get(kk) ?? 0) + us / 1000);
  }
}
const keys = [...new Set([...self.keys(), ...incl.keys()])].filter((k) => !filter || k.includes(filter));
keys.sort((a, b) => (sort === "incl" ? (incl.get(b) ?? 0) - (incl.get(a) ?? 0) : (self.get(b) ?? 0) - (self.get(a) ?? 0)));
for (const k of keys.slice(0, top)) console.log(`${((self.get(k) ?? 0) / div).toFixed(3).padStart(9)} self ${((incl.get(k) ?? 0) / div).toFixed(3).padStart(9)} incl  ${k}`);
