// K1040 S1e F4: attribute a candidate's #1 change against candidate 1, site
// by site. c1 = FormB({ curvedReach: false }) (the straight reach, S1d's);
// the candidate is env CAND (default c2): c2 = the curved reach everywhere
// ({ curvedReach: true, curvedFrom: 0 }), c3 = the curved reach past 4 h
// ({ curvedReach: true }).
// #1 sites: the union of out/s1e/scenes_c1|<CAND>/<scene>.json check1deep
// sites (scenes.ts lists at most DEEPMAX = 12 a scene); per site and variant:
// ink (a site counts at ink >= 0.5), the winning term, its corner's junction
// and two arms (L). Then, per corner seen, each arm whose L moved: L0-free
// facts (its chain, dir, L under both) and the pass that binds its c1 Lcut.
// Run: [$env:CAND = "c3";] npx vite-node .claude/probes/K1040/s1/attr_c2.ts [scene...]
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, TERM_NAMES } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const cand = process.env.CAND ?? "c2";
const candParams = cand === "c3" ? { curvedReach: true } : { curvedReach: true, curvedFrom: 0 };
const scenesIn = process.argv.slice(2);
const sceneList = scenesIn.length ? scenesIn : ["muse_hash", "g41_user_tw64"];
const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
type Site = { at: [number, number]; ij: [number, number]; F: number; ink: number };

for (const name of sceneList) {
  const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
  sc.look.ctrlArc ??= 0.47;
  const js1 = JSON.parse(readFileSync(join(here, "out/s1e/scenes_c1", `${name}.json`), "utf8"));
  const js2 = JSON.parse(readFileSync(join(here, "out/s1e", `scenes_${cand}`, `${name}.json`), "utf8"));
  const fb1 = new FormB(sc, { curvedReach: false });
  const fb2 = new FormB(sc, candParams);
  let nMoved = 0;
  for (let ai = 0; ai < fb2.arms.length; ai++) if (Math.abs(fb1.arms[ai].L - fb2.arms[ai].L) > 1e-3) nMoved++;
  console.log(`== ${name}: #1 c1 ${js1.check1deep.sites.length} sites -> ${cand} ${js2.check1deep.sites.length}; arms ${fb2.arms.length}, L moved > 1e-3 on ${nMoved}`);
  const key = (s: Site) => `${s.ij[0]},${s.ij[1]}`;
  const in1 = new Set((js1.check1deep.sites as Site[]).map(key));
  const in2 = new Set((js2.check1deep.sites as Site[]).map(key));
  const union = new Map<string, Site>();
  for (const s of [...js1.check1deep.sites, ...js2.check1deep.sites] as Site[]) union.set(key(s), s);
  const armsSeen = new Set<number>();
  for (const s of union.values()) {
    if (in1.has(key(s)) === in2.has(key(s))) continue;
    const parts: string[] = [];
    for (const [tag, fb] of [["c1", fb1], [cand, fb2]] as const) {
      const r = fb.evalPoint(s.at[0], s.at[1]);
      const t = r.term;
      const cn = t && t.corner >= 0 ? fb.corners[t.corner] : null;
      const cnTxt = cn ? ` j${cn.j} arms ${cn.a}:L${f(fb.arms[cn.a].L)},${cn.b}:L${f(fb.arms[cn.b].L)}` : "";
      parts.push(`${tag} ${f(r.ink)}${r.ink >= 0.5 ? "*" : " "} ${t ? `${TERM_NAMES[t.kind]} c${t.chain}${cnTxt}` : "none"}`);
      if (cn) for (const ai of [cn.a, cn.b]) if (Math.abs(fb1.arms[ai].L - fb2.arms[ai].L) > 1e-3) armsSeen.add(ai);
    }
    console.log(`  site ${key(s)} F ${f(s.F, 2)} ${in2.has(key(s)) ? `new in ${cand}` : `gone in ${cand}`}: ${parts.join(" | ")}`);
  }
  for (const ai of armsSeen) {
    const a1 = fb1.arms[ai];
    const pa = fb1.polys[a1.pi];
    let best = { d: NaN, theta: NaN, c: Infinity };
    for (const x of fb1.passes[a1.pi]) {
      let d = (x.s - a1.sR) * a1.dir;
      if (pa.closed) d = ((d % pa.len) + pa.len) % pa.len;
      if (d < -1e-12) continue;
      const tn = Math.tan(x.theta / 2);
      const c = tn > 1e-12 ? d - fb1.h / tn - fb1.h : -Infinity;
      if (c < best.c) best = { d, theta: x.theta, c };
    }
    console.log(`    arm ${ai} (j ${a1.j} pi ${a1.pi} dir ${a1.dir}): L c1 ${f(a1.L)} -> ${cand} ${f(fb2.arms[ai].L)}; c1 binding pass d ${f(best.d)} θ ${f(best.theta, 4)} c ${f(best.c)}`);
  }
}
