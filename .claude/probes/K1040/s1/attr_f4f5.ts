// K1040 S1e step 3: attribute S1d F5's #1 and free-end changes against F4,
// site by site. F5 made two changes (S1d F5): theta from the interpolated
// tangent (tanAt) and the Lcut loop's skip (a pass past L still cuts).
// Variants: f4 (both reverted), f5a (F4 + tanAt), f5b (F4 + the Lcut loop),
// f5 (frozen e8944f2f) and src (the working tree).
// #1 sites: the union of out/s1d/scenes_f4|f5/<scene>.json check1deep sites;
// per site and variant: ink (a site counts at ink >= 0.5, as scenes.ts's
// raster), the winning term and its corner's two arms (L, Lcut).
// Free ends: out/s1d/scenes_f4|f5 freeEnds lists keyed by chain, s (0.1)
// and side; for each one in only one list, the nearest corner's junction and
// the arms of that junction whose L differs between f4 and f5.
// Run: npx vite-node .claude/probes/K1040/s1/attr_f4f5.ts [scene...]
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB as FbSrc, TERM_NAMES } from "../../../../src/render/field/form_b";
import { FormB as FbF4 } from "./form_b_s1d_f4";
import { FormB as FbF5a } from "./form_b_s1d_f5a";
import { FormB as FbF5b } from "./form_b_s1d_f5b";
import { FormB as FbF5 } from "./form_b_s1d_f5";

const here = dirname(fileURLToPath(import.meta.url));
const scenesIn = process.argv.slice(2);
const sceneList = scenesIn.length ? scenesIn : ["muse_hash", "g41_user_tw64", "g41_def_tw42", "muse_default_tw", "user_tw42.lightpaper", "g41_user_tw42"];
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
type Site = { at: [number, number]; ij: [number, number]; F: number; ink: number; k: string; chain: number; s: number };
type Fe = { at: [number, number]; chain: number; s: number; side: number; near: string };
interface ArmL { j: number; pi: number; dir: number; sR: number; L: number; Lcut: number }
interface Cn { j: number; a: number; b: number; Vx: number; Vy: number }
interface Ev { ink: number; term: { kind: number; chain: number; s: number; corner: number } | null }
interface Fb { h: number; arms: ArmL[]; corners: Cn[]; passes: { s: number; theta: number }[][]; polys: { len: number; closed: boolean }[]; evalPoint(x: number, y: number): Ev }

for (const name of sceneList) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const js4 = JSON.parse(readFileSync(join(here, "out/s1d/scenes_f4", `${name}.json`), "utf8"));
  const js5 = JSON.parse(readFileSync(join(here, "out/s1d/scenes_f5", `${name}.json`), "utf8"));
  const vars: [string, Fb][] = [
    ["f4", new FbF4(sc) as unknown as Fb],
    ["f5a", new FbF5a(sc) as unknown as Fb],
    ["f5b", new FbF5b(sc) as unknown as Fb],
    ["f5", new FbF5(sc) as unknown as Fb],
    ["src", new FbSrc(sc) as unknown as Fb],
  ];
  const fb4 = vars[0][1];
  const fb5 = vars[3][1];
  const armTxt = (fb: Fb, ai: number) => `arm ${ai} (pi ${fb.arms[ai].pi} dir ${fb.arms[ai].dir}) L ${f(fb.arms[ai].L)} Lcut ${f(fb.arms[ai].Lcut)}`;
  // Arms whose L or Lcut differ between f4 and f5 (same arm order: the arms do not depend on theta).
  const armDiff = (ai: number) => Math.abs(fb4.arms[ai].L - fb5.arms[ai].L) > 1e-9 || Math.abs(fb4.arms[ai].Lcut - fb5.arms[ai].Lcut) > 1e-9;
  // The pass that binds an arm's Lcut under a variant: d along the arm, theta, its cut c.
  const bind = (fb: Fb, ai: number) => {
    const a = fb.arms[ai];
    const p = fb.polys[a.pi];
    let best = { d: NaN, theta: NaN, c: Infinity };
    for (const x of fb.passes[a.pi]) {
      let d = (x.s - a.sR) * a.dir;
      if (p.closed) d = ((d % p.len) + p.len) % p.len;
      if (d < -1e-12) continue;
      const t = Math.tan(x.theta / 2);
      const c = t > 1e-12 ? d - fb.h / t - fb.h : -Infinity;
      if (c < best.c) best = { d, theta: x.theta, c };
    }
    return best;
  };
  const bindTxt = (ai: number) => {
    const b4 = bind(fb4, ai);
    const b5 = bind(fb5, ai);
    return `arm ${ai} (j ${fb5.arms[ai].j} pi ${fb5.arms[ai].pi} dir ${fb5.arms[ai].dir}): L f4 ${f(fb4.arms[ai].L)} f5a ${f(vars[1][1].arms[ai].L)} f5b ${f(vars[2][1].arms[ai].L)} f5 ${f(fb5.arms[ai].L)}; f5 binding pass d ${f(b5.d)} theta ${f(b5.theta, 4)} c ${f(b5.c)} (f4 skips d > L; f4 theta there ${f(b4.theta, 4)})`;
  };
  let nArmDiff = 0;
  for (let ai = 0; ai < Math.min(fb4.arms.length, fb5.arms.length); ai++) if (armDiff(ai)) nArmDiff++;
  console.log(`== ${name}: #1 f4 ${js4.check1deep.sites.length} -> f5 ${js5.check1deep.sites.length}; free ends ${js4.freeEnds.n} -> ${js5.freeEnds.n}; arms ${fb4.arms.length}/${fb5.arms.length}, L or Lcut differs on ${nArmDiff}`);
  // #1 sites.
  const key = (s: Site) => `${s.ij[0]},${s.ij[1]}`;
  const union = new Map<string, Site>();
  for (const s of js4.check1deep.sites as Site[]) union.set(key(s), s);
  for (const s of js5.check1deep.sites as Site[]) union.set(key(s), s);
  const in4 = new Set((js4.check1deep.sites as Site[]).map(key));
  const in5 = new Set((js5.check1deep.sites as Site[]).map(key));
  const changed = [...union.values()].filter((s) => in4.has(key(s)) !== in5.has(key(s)));
  console.log(`  #1 sites only in f4: ${[...union.values()].filter((s) => in4.has(key(s)) && !in5.has(key(s))).length}, only in f5: ${[...union.values()].filter((s) => !in4.has(key(s)) && in5.has(key(s))).length}`);
  const cornerSeen = new Set<string>();
  for (const s of changed) {
    const parts: string[] = [];
    for (const [tag, fb] of vars) {
      const r = fb.evalPoint(s.at[0], s.at[1]);
      const t = r.term;
      const cn = t && t.corner >= 0 ? fb.corners[t.corner] : null;
      const cnTxt = cn ? ` j${cn.j} arms ${cn.a}:L${f(fb.arms[cn.a].L)},${cn.b}:L${f(fb.arms[cn.b].L)}` : "";
      parts.push(`${tag} ${f(r.ink)}${r.ink >= 0.5 ? "*" : " "} ${t ? `${TERM_NAMES[t.kind]} c${t.chain}${cnTxt}` : "none"}`);
      if (cn && tag === "f5") for (const ai of [cn.a, cn.b]) if (armDiff(ai)) cornerSeen.add(`${ai}`);
    }
    console.log(`  site ${key(s)} (${f(s.at[0])}, ${f(s.at[1])}) F ${f(s.F, 2)} ${in5.has(key(s)) ? "new in f5" : "gone in f5"}: ${parts.join(" | ")}`);
  }
  for (const cs of cornerSeen) console.log(`    ${bindTxt(Number(cs))}`);
  // Free ends.
  const fkey = (e: Fe) => `${e.chain}:${(Math.round(e.s * 10) / 10).toFixed(1)}:${e.side}`;
  const k4 = new Map<string, Fe>((js4.freeEnds.list as Fe[]).map((e) => [fkey(e), e]));
  const k5 = new Map<string, Fe>((js5.freeEnds.list as Fe[]).map((e) => [fkey(e), e]));
  const feChanged: [string, Fe][] = [];
  for (const [k, e] of k4) if (!k5.has(k)) feChanged.push(["gone in f5", e]);
  for (const [k, e] of k5) if (!k4.has(k)) feChanged.push(["new in f5", e]);
  for (const [what, e] of feChanged) {
    let best = -1;
    let bd = Infinity;
    for (let ci = 0; ci < fb5.corners.length; ci++) {
      const c = fb5.corners[ci];
      const d = Math.hypot(c.Vx - e.at[0], c.Vy - e.at[1]);
      if (d < bd) {
        bd = d;
        best = ci;
      }
    }
    const j = best >= 0 ? fb5.corners[best].j : -1;
    const diffs: string[] = [];
    for (let ai = 0; ai < fb5.arms.length; ai++) if (fb5.arms[ai].j === j && Math.abs(fb4.arms[ai].L - fb5.arms[ai].L) > 1e-3) diffs.push(bindTxt(ai));
    console.log(`  free end ${what}: chain ${e.chain} s ${f(e.s)} side ${e.side} at (${f(e.at[0])}, ${f(e.at[1])}); nearest corner V ${f(bd)} away, junction ${j}; arms whose L moved > 1e-3: ${diffs.length}`);
    for (const d of diffs) console.log(`    ${d}`);
  }
}
