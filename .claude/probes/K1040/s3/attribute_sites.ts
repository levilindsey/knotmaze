// K1040 S3c: attribute the census's sampled DEFECT sites (out/verdict_<tag>_*.json,
// up to 80 sites a scene) to the merge scan, by replaying Form B's candidates.
//   node scripts/run_node.mjs .claude/probes/K1040/s3/attribute_sites.ts <out dir> [tag ...]
// For each DEFECT site: the GPU's (chain, s) is matched to the nearest candidate
// on its chain. "merge" = that candidate is one pieces() drops (a nearer
// candidate of the same chain within sigma in s): the tent pass keeps every
// candidate and takes the max key, the reference keeps only the nearer one.
// "kept" = the GPU's candidate is one the reference keeps too, "none" = the
// reference has no candidate on that chain, "hole" = the GPU drew nothing.
// The ref's top is flagged "end" when its s sits on its chain's first or last
// vertex (an open end, an extended start included).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FormB } from "../../../../src/render/field/form_b";
import { candidates, dS, type Cand } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";

const [dir, ...tagsIn] = process.argv.slice(2);
const tags = tagsIn.length ? tagsIn : ["tent", "tentlr2"];
const scenes = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const fbs = new Map<string, FormB>();
for (const tag of tags) {
  const tally: Record<string, number> = {};
  const add = (k: string) => (tally[k] = (tally[k] ?? 0) + 1);
  let sites = 0;
  let defects = 0;
  for (const name of scenes) {
    const r = JSON.parse(readFileSync(join(dir, `verdict_${tag}_${name}.json`), "utf8"));
    defects += r.counts.DEFECT ?? 0;
    let fb = fbs.get(name);
    if (!fb) {
      const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
      scene.look.ctrlArc ??= 0.47;
      fb = new FormB(scene, { dpr: r.scale });
      fbs.set(name, fb);
    }
    for (const site of r.sites) {
      if (site.cls !== "DEFECT") continue;
      sites++;
      const kind = String(site.why).replace(/\[.*\]/, "").replace(/@.*$/, "");
      const bucket = String(site.why).replace(/^.*@/, "");
      const cs: Cand[] = [];
      candidates(fb.grid, site.x, site.y, fb.h + fb.W + 2 * fb.aa, cs);
      cs.sort((a, b) => a.d - b.d);
      const kept: Cand[] = [];
      const dropped: Cand[] = [];
      for (const c of cs) {
        const p = fb.polys[c.chain];
        if (kept.some((q) => q.chain === c.chain && Math.abs(dS(p, q.s, c.s)) <= fb.sigma)) dropped.push(c);
        else kept.push(c);
      }
      let att: string;
      if (site.gpu.code === -1) att = "hole";
      else {
        const p = fb.polys[site.gpu.chain];
        let best: Cand | null = null;
        let bestDs = Infinity;
        for (const c of cs)
          if (c.chain === site.gpu.chain) {
            const ds = Math.abs(dS(p, c.s, site.gpu.s));
            if (ds < bestDs) { bestDs = ds; best = c; }
          }
        att = !best ? "none" : dropped.includes(best) ? "merge" : "kept";
        if (best && bestDs > 0.02) att += "?"; // the GPU's s is far from every foot
      }
      let end = "";
      if (site.ref.top !== -1 && site.ref.chain >= 0) {
        const p = fb.polys[site.ref.chain];
        if (!p.closed && (Math.abs(site.ref.s - p.s0) < 1e-6 || Math.abs(site.ref.s - p.s[p.n - 1]) < 1e-6)) end = " refEnd";
      }
      add(`${kind} -> ${att}${end}`);
      add(`ALL -> ${att}`);
      add(`bucket ${bucket} -> ${att}`);
    }
  }
  console.log(`## ${tag}: ${sites} sampled DEFECT sites of ${defects}`);
  for (const [k, v] of Object.entries(tally).sort((a, b) => a[0].localeCompare(b[0]))) console.log(`${k}: ${v}`);
}
