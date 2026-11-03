// K1040 S1f F3: attribute the #1 changes of S1f's default (the quadratic
// reach) against S1e's final (form_b_s1e_c1.ts, frozen), site by site.
// #1 sites: the union of out/s1e/scenes_final/<scene>.json and
// out/s1f/scenes_<TAG>/<scene>.json check1deep sites (scenes.ts lists at most
// 12 a scene). Per site that is in one list only, per build: ink (a site
// counts at ink >= 0.5), the winning term (kind, chain, corner's junction
// and its two arms with L), its D and weight, the top surface and its count,
// and the pieces at the point (chain, s, d, surf, g, cap ramp). Then, per
// junction seen, every arm of it whose L or Lcut moved, under both builds.
// Run: [$env:TAG = "q";] npx vite-node .claude/probes/K1040/s1/attr_s1f.ts [scene...]
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, TERM_NAMES } from "../../../../src/render/field/form_b";
import type { Piece } from "../../../../src/render/field/form_b";
import { FormB as FormBC1 } from "./form_b_s1e_c1";

const here = dirname(fileURLToPath(import.meta.url));
const tag = process.env.TAG ?? "q";
const scenesIn = process.argv.slice(2);
const ALL = ["def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "muse_hash", "muse_default_tw", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const sceneList = scenesIn.length ? scenesIn : ALL;
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
type Site = { at: [number, number]; ij: [number, number]; F: number; ink: number };

for (const name of sceneList) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const js1 = JSON.parse(readFileSync(join(here, "out/s1e/scenes_final", `${name}.json`), "utf8"));
  const js2 = JSON.parse(readFileSync(join(here, "out/s1f", `scenes_${tag}`, `${name}.json`), "utf8"));
  const fb1 = new FormBC1(sc) as unknown as FormB;
  const fb2 = new FormB(sc);
  const key = (s: Site) => `${s.ij[0]},${s.ij[1]}`;
  const in1 = new Set((js1.check1deep.sites as Site[]).map(key));
  const in2 = new Set((js2.check1deep.sites as Site[]).map(key));
  const union = new Map<string, Site>();
  for (const s of [...js1.check1deep.sites, ...js2.check1deep.sites] as Site[]) union.set(key(s), s);
  const changed = [...union.values()].filter((s) => in1.has(key(s)) !== in2.has(key(s)));
  console.log(`== ${name}: #1 sites c1 ${in1.size} -> ${tag} ${in2.size}; changed ${changed.length}`);
  const jSeen = new Set<number>();
  for (const s of changed) {
    console.log(`  site ${key(s)} (world ${f(s.at[0], 4)}, ${f(s.at[1], 4)}) F ${f(s.F, 2)} ${in2.has(key(s)) ? `new in ${tag}` : `gone in ${tag}`}`);
    for (const [bt, fb] of [["c1", fb1], [tag, fb2]] as const) {
      const r = fb.evalPoint(s.at[0], s.at[1]);
      const t = r.term;
      const cn = t && t.corner >= 0 ? fb.corners[t.corner] : null;
      if (cn) jSeen.add(cn.j);
      const cnTxt = cn ? ` j${cn.j} arms ${cn.a}:L${f(fb.arms[cn.a].L)},${cn.b}:L${f(fb.arms[cn.b].L)}` : "";
      console.log(`    ${bt}: ink ${f(r.ink)}${r.ink >= 0.5 ? "*" : " "} term ${t ? `${TERM_NAMES[t.kind]} c${t.chain}${cnTxt} D ${f(t.D, 4)} w ${f(t.w)} v ${f(t.v)}` : "none"}; top ${r.top} chain ${r.chain} nSurf ${r.nSurf} dz ${f(r.dz)} Dexp ${f(r.Dexp, 4)} fade ${f(r.fade)}`);
      const ps: Piece[] = [];
      const fadeBits = fb.pieces(s.at[0], s.at[1], ps);
      for (const p of ps) {
        const gJs = p.g >= 0 ? [...new Set(fb.arms.filter((a) => a.g === p.g).map((a) => a.j))] : [];
        const gTxt = p.g >= 0 ? ` (group ${p.g}: j${gJs.join(",j")})` : "";
        console.log(`      piece c${p.chain} s ${f(p.s)} d ${f(p.d, 4)} surf ${p.surf} key ${f(p.key, 4)} g ${p.g}${gTxt} ramp ${f(p.ramp)} selfW ${f(p.selfW)} z ${f(p.z)}`);
        // member()'s inputs: every arm of the piece's chain in its group, its
        // distance from the root to the piece (armDist) and its cap ramp
        // ss(Lcut, Lcut − λ, d) where member() reads it (on the arm, or
        // behind its root within λ of the cut: S1b F10's back-reach).
        if (p.g >= 0)
          for (const ai of fb.armsOf[p.chain]) {
            const a = fb.arms[ai];
            if (a.g !== p.g) continue;
            const d = fb.armDist(ai, p.s);
            const onIt = d >= -1e-12 && d <= a.L + 1e-12;
            const back = d < 1e-12 && d > a.Lcut - fb.lambda;
            const t = a.Lcut === Infinity ? 1 : Math.min(1, Math.max(0, (d - a.Lcut) / -fb.lambda));
            const ssv = a.Lcut === Infinity ? 1 : t * t * (3 - 2 * t);
            console.log(`        arm ${ai} (j${a.j} dir ${a.dir} ${a.kind}) L ${f(a.L)} Lcut ${f(a.Lcut)} d ${f(d, 4)}: ${onIt ? "on the arm" : back ? "behind its root, within λ of its cut" : "not read"}${onIt || back ? ` ramp ${f(ssv)}` : ""}`);
          }
      }
      if (fadeBits) console.log(`      pieces fade bits ${fadeBits}`);
    }
  }
  for (const j of jSeen) {
    const rows: string[] = [];
    for (let ai = 0; ai < fb2.arms.length; ai++) {
      const a1 = fb1.arms[ai];
      const a2 = fb2.arms[ai];
      if (a2.j !== j) continue;
      rows.push(`    arm ${ai} (c${a2.pi} dir ${a2.dir} ${a2.kind}): L ${f(a1.L)} -> ${f(a2.L)}, Lcut ${f(a1.Lcut)} -> ${f(a2.Lcut)}`);
    }
    console.log(`  junction ${j}'s arms:`);
    for (const r of rows) console.log(r);
  }
}
