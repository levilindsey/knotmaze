// K1482 s36: is a fillet's tangent point a point of the drawn outline? Per tangent point of a maze (corners that ink:
// R > 0, not a through pass), in the CPU mirror:
//   depth  the smallest ring round the point (radii 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2 W; 24 samples each) that holds a
//          sample the mirror does NOT cover (cov < 0.5), in W; 9 = covered out to 2 W. A point of the outline has
//          paper beside it, so its depth is the first ring (0.25).
//   share  the share of the W disc round the point that the point's own tangent term inks (tanball36.ts's number)
// Prints the points by depth class against share class, and every point with share >= MIN (0.1) or depth >= 1.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s36/tandepth36.ts <scene.json> <sites.json>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP] = process.argv; const MIN = Number(process.env.MIN ?? 0.1);
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h; const W = T.W;
const E: any = new GfEval(T); const Wpx = W * a; const r = Math.ceil(Wpx);
const RINGS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const dKey = (v: number) => (v <= 0.25 ? "depth 0.25" : v <= 0.5 ? "depth 0.5" : v <= 0.75 ? "depth 0.75" : v <= 1 ? "depth 1" : v < 9 ? "depth 1.25-2" : "depth >2");
const sKey = (v: number) => (v < 0.1 ? "share<0.1" : v < 0.5 ? "share 0.1-0.5" : "share>=0.5");
const tab: Record<string, Record<string, number>> = {}; const tab2: Record<string, Record<string, number>> = {}; const rows: string[] = []; let pts = 0;
for (let k = 0; k < T.kCx.length; k++) {
  if (T.kThru[k] || !(T.kR[k] > 0)) continue;
  for (let t = 0; t < 2; t++) {
    const tx = t ? T.kTbx[k] : T.kTax[k]; const ty = t ? T.kTby[k] : T.kTay[k]; pts++;
    let depth = 9;
    for (const q of RINGS) { let open = false; for (let i = 0; i < 24 && !open; i++) { const an = (i / 24) * 2 * Math.PI; if (E.eval(tx + q * W * Math.cos(an), ty + q * W * Math.sin(an)).cov < 0.5) open = true; } if (open) { depth = q; break; } }
    const px = Math.floor(tx * a + e), py = Math.floor(ty * d + f); let disc = 0, tan = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const wx = (px + dx + 0.5 - e) / a, wy = (py + dy + 0.5 - f) / d;
      if ((wx - tx) ** 2 + (wy - ty) ** 2 > W * W) continue; disc++;
      const o = E.eval(wx, wy); if (o.ink >= 0.5 && o.winKind === 4 && o.winA === k && o.winB === t) tan++;
    }
    const share = tan / Math.max(1, disc); const dk = dKey(depth), sk = sKey(share);
    (tab[dk] ??= {})[sk] = (tab[dk][sk] ?? 0) + 1;
    // own: the point's distance from the centre line of its corner's own two chains, on the corner's surface, in h
    // (the nearer of the two; the tangent term's burial skips these two chains, K1407 c1). oth: the same for every
    // other chain of that surface (those bury the term).
    E.eval(tx, ty); let own = 9, oth = 9;
    for (let m = 0; m < E.np; m++) { if (E.psurf[m] !== T.kG[k]) continue; const q = Math.sqrt(E.pieceD(m, tx, ty)) / h; if (E.pc[m] === T.kCa[k] || E.pc[m] === T.kCb[k]) { if (q < own) own = q; } else if (q < oth) oth = q; }
    const ok = own < 0.7 ? "own<0.7" : own < 0.95 ? "own 0.7-0.95" : "own>=0.95";
    (tab2[ok] ??= {})[sk] = (tab2[ok][sk] ?? 0) + 1;
    if (share >= MIN || depth >= 1 || own < 0.95) rows.push(`k${k}.${t ? "b" : "a"} @${px},${py} depth ${depth === 9 ? ">2" : depth} W share ${share.toFixed(2)} own ${own.toFixed(2)} h other ${oth === 9 ? "-" : oth.toFixed(2) + " h"} j${T.kJ[k]} chains ${T.kCa[k]}/${T.kCb?.[k]} R ${(T.kR[k] / h).toFixed(3)} h ext ${T.kExt?.[k] ?? 0}`);
  }
}
for (const ok of ["own<0.7", "own 0.7-0.95", "own>=0.95"]) console.log(`${ok}: ` + ["share<0.1", "share 0.1-0.5", "share>=0.5"].map((s) => `${s} ${tab2[ok]?.[s] ?? 0}`).join(", "));
console.log(rows.join("\n"));
console.log(`tangent points ${pts}`);
for (const dk of ["depth 0.25", "depth 0.5", "depth 0.75", "depth 1", "depth 1.25-2", "depth >2"]) console.log(`${dk}: ` + ["share<0.1", "share 0.1-0.5", "share>=0.5"].map((s) => `${s} ${tab[dk]?.[s] ?? 0}`).join(", "));
