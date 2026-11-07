// K1239: offline analysis of diag_def.json (scene + renderer/ps dump).
import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(process.argv[2] ?? ".claude/probes/K1239/out/diag_def.json", "utf8"));
const S = d.scene;
console.log("look", S.look, "cam pxPerUnit", S.camera.pxPerUnit, "viewport", S.camera.viewport);
const closed = S.chains.filter((c) => c.closed).length;
console.log(`chains ${S.chains.length} closed ${closed} open ${S.chains.length - closed}`);
let bad = 0;
for (const c of S.chains) {
  const n = c.pts.length / 2;
  if (n < 2 || c.z.length !== n) { console.log("BAD chain", c.id, n, c.z.length); bad++; }
  let len = 0, dup = 0;
  for (let i = 1; i < n; i++) { const dd = Math.hypot(c.pts[i * 2] - c.pts[(i - 1) * 2], c.pts[i * 2 + 1] - c.pts[(i - 1) * 2 + 1]); len += dd; if (dd === 0) dup++; }
  if (c.closed && n > 1) len += Math.hypot(c.pts[0] - c.pts[(n - 1) * 2], c.pts[1] - c.pts[(n - 1) * 2 + 1]);
  c._len = len; c._n = n; c._dup = dup;
}
console.log("bad chains", bad);
console.log("shortest chains", [...S.chains].sort((a, b) => a._len - b._len).slice(0, 8).map((c) => `#${c.id} len=${c._len.toFixed(2)} n=${c._n} closed=${c.closed} dup=${c._dup}`));
const kinds = {};
for (const j of S.junctions) for (const a of j.arms) kinds[a.kind] = (kinds[a.kind] ?? 0) + 1;
console.log("junctions", S.junctions.length, "arm kinds", kinds);
const armChains = new Set(); for (const j of S.junctions) for (const a of j.arms) armChains.add(a.chain);
const deadChains = new Set(S.deadEnds.map((x) => x.chain));
console.log("chains with arms", armChains.size, "deadEnd chains", [...deadChains]);
// per-chain: ends classification
const endArm = new Set(); for (const j of S.junctions) for (const a of j.arms) if (a.kind === "end") endArm.add(`${a.chain}:${a.s === 0 ? "start" : "end"}`);
console.log("end arms", endArm.size);
// chains whose samples closed flag differs from scene
let mism = 0;
for (const s of d.samples) { const c = S.chains[s.i]; if (c && !!s.closed !== !!c.closed) { mism++; console.log("closed mismatch chain", s.i, s.closed, c.closed); } }
console.log("closed mismatches", mism);
// export pts vs drawn samples: max deviation of first/last point
let maxDev = 0, devChain = -1;
for (const s of d.samples) {
  const c = S.chains[s.i]; if (!c) continue;
  // samples positions not dumped; compare counts only
  if (Math.abs(c._n - s.count) > 3) console.log("count diff chain", s.i, "scene", c._n, "samples", s.count, "closed", c.closed);
}
// junction arm s sanity: END arm s must be 0 or total; through arm s within [0,total]
for (const j of S.junctions) for (const a of j.arms) {
  const c = S.chains[a.chain]; const tot = c._len;
  if (a.kind === "end" && !(Math.abs(a.s) < 1e-6 || Math.abs(a.s - tot) < 0.05)) console.log("END arm s odd", j.id, a);
  if (a.s < -1e-6 || a.s > tot + 0.05) console.log("arm s out of range", j.id, a, tot);
}
// arms per junction histogram
const hist = {}; for (const j of S.junctions) hist[j.arms.length] = (hist[j.arms.length] ?? 0) + 1;
console.log("arms/junction hist", hist);
// crossings: chains involved, s range
let xbad = 0; for (const x of S.crossings) { for (const p of [x.a, x.b]) { const c = S.chains[p.chain]; if (p.s < -1e-6 || p.s > c._len + 0.05) { xbad++; if (xbad < 5) console.log("cross s out", x, c._len); } } }
console.log("crossings", S.crossings.length, "out-of-range", xbad, "emergent", S.crossings.filter((x) => x.emergent).length);
// renderer junctionArms vs scene junctions count
console.log("renderer junctionArms", d.junctionArms.length, "freeTips", d.freeTips.length, "fusedJunctions", d.fusedJunctions.length);
// ps chains: open/closed, lengths; ends fused/free/anchored
let fusedEnds = 0, freeEnds = 0, anchEnds = 0;
const fusedSet = new Set(d.fusedJunctions.flat());
d.chains.forEach((c, i) => {
  const a = c.particles[0], b = c.particles[c.particles.length - 1];
  if (c.brk >= 0) { for (const p of [a, b]) { if (fusedSet.has(p)) fusedEnds++; else if (d.anchored[i][p === a ? 0 : 1]) anchEnds++; else freeEnds++; } }
});
console.log(`ps ends: fused ${fusedEnds} anchored ${anchEnds} free ${freeEnds}; scene deadEnds ${S.deadEnds.length} (offscreen ${S.deadEnds.filter((x) => x.offscreen).length}) endArms ${endArm.size}`);
