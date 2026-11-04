import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FormB } from "../../../../src/render/field/form_b";
import { candidates, dS, segOfS, type Cand } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";
const [dir, tag] = process.argv.slice(2);
const scenes = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const r6 = (v: number | null) => (v == null ? null : Number(v.toFixed(5)));
for (const name of scenes) {
  const r = JSON.parse(readFileSync(join(dir, `verdict_${tag}_${name}.json`), "utf8"));
  const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  scene.look.ctrlArc ??= 0.47;
  const fb = new FormB(scene, { dpr: r.scale });
  for (const site of r.sites) {
    if (site.cls !== "DEFECT") continue;
    const bucket = String(site.why).replace(/^.*@/, "");
    if (["0.003", "0.01"].includes(bucket)) continue;
    const cs: Cand[] = [];
    candidates(fb.grid, site.x, site.y, fb.h + fb.W + 2 * fb.aa, cs);
    cs.sort((a, b) => a.d - b.d);
    const kept: Cand[] = [], dropped: Cand[] = [];
    for (const c of cs) { const p = fb.polys[c.chain]; if (kept.some((q) => q.chain === c.chain && Math.abs(dS(p, q.s, c.s)) <= fb.sigma)) dropped.push(c); else kept.push(c); }
    if (site.gpu.code !== -1) {
      const p = fb.polys[site.gpu.chain];
      const best = cs.filter((c) => c.chain === site.gpu.chain).sort((a, b) => Math.abs(dS(p, a.s, site.gpu.s)) - Math.abs(dS(p, b.s, site.gpu.s)))[0];
      if (best && dropped.includes(best)) continue; // merge
    }
    const rp = fb.polys[site.ref.chain];
    const sg = segOfS(rp, site.ref.s);
    const refC = cs.find((c) => c.chain === site.ref.chain && Math.abs(dS(rp, c.s, site.ref.s)) < 1e-6);
    // the turn at the ref's vertex, if its foot is on one
    let turn = "";
    const vtx = sg.t < 1e-9 ? sg.k : sg.t > 1 - 1e-9 ? (sg.k + 1) % rp.n : -1;
    if (vtx >= 0 && (rp.closed || (vtx > 0 && vtx < rp.n - 1))) {
      const a = (vtx - 1 + rp.n) % rp.n, b = (vtx + 1) % rp.n;
      const ux = rp.x[vtx] - rp.x[a], uy = rp.y[vtx] - rp.y[a], vx = rp.x[b] - rp.x[vtx], vy = rp.y[b] - rp.y[vtx];
      turn = ` turn ${r6(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy))} lens ${r6(Math.hypot(ux, uy))}/${r6(Math.hypot(vx, vy))}`;
    }
    console.log(`${name} ${site.why} (${site.i},${site.j}) ref ch${site.ref.chain} ${rp.closed ? "closed" : "open"} n${rp.n} s${r6(site.ref.s)} [s0 ${r6(rp.s0)} end ${r6(rp.s[rp.n - 1])} len ${r6(rp.len)}] seg ${sg.k} t ${r6(sg.t)} vtx ${vtx}${turn} d ${refC ? r6(refC.d) : "?"} key ${r6(site.ref.key)} | gpu ch${site.gpu.chain} s${r6(site.gpu.s)} key ${r6(site.gpu.key)} d ${r6(site.gpu.d)} | cands ${cs.map((c) => `ch${c.chain}:${r6(c.s)}:${r6(c.d)}${dropped.includes(c) ? "x" : ""}`).join(" ")}`);
  }
}
