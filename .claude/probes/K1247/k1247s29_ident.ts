// K1247 s29: a bit-identity check wider than outline_port.test.ts's two pins. For each scene, OutlineModel
// with the app's look (fillRec 2, bandRec 1 + bandRecGpu 1, ctrlArc 0.47) runs k1247s29_mbench's motion
// cycle (`frames` frames), and the per-frame digests of the table (diagnostics included) and the band (the
// app's records path) are chained into one digest per scene; plus the same with the default look (the
// pins' path: bandGpu). Write a baseline, then compare a branch to it.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s29_ident.ts out=<file.json> [base=<file.json>] [frames=12] [scenes=def,fat,...]
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { OutlineModel } from "../../../src/render/outline/outline_model";
import type { SceneIn } from "../../../src/render/outline/outline";
import { digest } from "../../../test/render/outline_digest";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const out = arg("out", ""); const base = arg("base", ""); const frames = +arg("frames", "12");
const scenes = arg("scenes", "def,fat,muse_hash,g41_user_tw64,g41_def_tw64,ring,g41_ring_tw42").split(",");
const len = (p: number[], closed: boolean): number => {
  let L = 0; const n = p.length >> 1;
  for (let i = 0; i + 1 < n; i++) L += Math.hypot(p[2 * i + 2] - p[2 * i], p[2 * i + 3] - p[2 * i + 1]);
  if (closed && n > 1) L += Math.hypot(p[0] - p[2 * n - 2], p[1] - p[2 * n - 1]);
  return L;
};
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const dx = (x: number, y: number): number => A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
  const dy = (x: number, y: number): number => A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
  const ratio = new Map<number, number>();
  for (const c of sc.chains) {
    const L0 = len(c.pts, c.closed);
    for (let i = 0; i + 1 < c.pts.length; i += 2) { const x = c.pts[i]; const y = c.pts[i + 1]; c.pts[i] = x + dx(x, y); c.pts[i + 1] = y + dy(x, y); }
    ratio.set(c.id, L0 > 0 ? len(c.pts, c.closed) / L0 : 1);
  }
  const r = (chain: number): number => ratio.get(chain) ?? 1;
  for (const J of sc.junctions) {
    for (const a of J.arms) a.s *= r(a.chain);
    const c = (J as unknown as { c?: number[] }).c;
    if (c) { const x = c[0]; const y = c[1]; c[0] = x + dx(x, y); c[1] = y + dy(x, y); }
  }
  for (const x of sc.crossings) { x.a.s *= r(x.a.chain); x.b.s *= r(x.b.chain); }
  for (const d of (sc as unknown as { deadEnds?: { chain: number; s: number }[] }).deadEnds ?? []) d.s *= r(d.chain);
  return sc;
}
const res: Record<string, Record<string, string>> = {};
const prev = base && existsSync(base) ? (JSON.parse(readFileSync(base, "utf8")) as typeof res) : null;
let bad = 0;
for (const name of scenes) {
  const S = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (S.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  const h = S.look.halfWidth;
  const cyc: SceneIn[] = [];
  for (let k = 0; k < frames; k++) cyc.push(perturb(S, (Math.min(k, frames - k) / frames) * h));
  res[name] = {};
  for (const app of [true, false]) {
    const S0 = structuredClone(S);
    if (app) Object.assign(S0.look, { fillRec: 2, bandRec: 1, bandRecGpu: 1 });
    const hT = createHash("sha256"); const hB = createHash("sha256"); const hP = createHash("sha256");
    let m: OutlineModel;
    try { m = new OutlineModel(S0); } catch (e) { res[name][app ? "app" : "def"] = `structure threw ${String(e)}`; continue; }
    let err = "";
    for (let k = 0; k < frames; k++) {
      const sc = cyc[k];
      if (app) Object.assign(sc.look, { fillRec: 2, bandRec: 1, bandRecGpu: 1 });
      else for (const key of ["fillRec", "bandRec", "bandRecGpu"]) delete (sc.look as Record<string, unknown>)[key];
      try { m.update(sc); } catch (e) { err = `f${k} threw ${String(e).slice(0, 80)}`; break; }
      hT.update(digest(m.table)); hB.update(digest(m.band)); hP.update(digest({ pos: m.pd.pos, key: m.pd.key, w: m.pd.w, s: m.pd.s }));
    }
    const tag = app ? "app" : "def";
    res[name][tag] = err || `${hT.digest("hex").slice(0, 12)} ${hB.digest("hex").slice(0, 12)} ${hP.digest("hex").slice(0, 12)}`;
    const was = prev?.[name]?.[tag];
    const same = was === undefined ? "?" : was === res[name][tag] ? "same" : "DIFF";
    if (same === "DIFF") bad++;
    console.log(`${name.padEnd(16)} ${tag}: ${res[name][tag]}  ${same}${same === "DIFF" ? ` (was ${was})` : ""}`);
  }
}
if (out) writeFileSync(out, JSON.stringify(res, null, 1));
if (prev) console.log(bad ? `IDENT: ${bad} differ` : "IDENT: all same");
