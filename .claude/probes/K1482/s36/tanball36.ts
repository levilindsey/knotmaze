// K1482 s36: every fillet tangent point of a maze whose tangent-point term (eval.ts winKind 4) inks a BALL: the
// share of the W-radius disc round the point that the term itself inks in the CPU mirror. A tangent point on a
// straight stretch of outline has the paper on one side, so its term can ink half the disc at most (and the side
// bands usually win there); a share well above half means the point sits inside its own surface and the term inks
// a round blob 2 strokes across. Lists the points at share >= MIN (0.6), nearest site, corner row, and a histogram.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s36/tanball36.ts <scene.json> <sites.json> [out.json]
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, outP] = process.argv; const MIN = Number(process.env.MIN ?? 0.6);
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h;
const E: any = new GfEval(T); const Wpx = T.W * a; const r = Math.ceil(Wpx);
const hist = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; const out: any[] = []; let pts = 0;
for (let k = 0; k < T.kCx.length; k++) {
  if (T.kThru[k] || !(T.kR[k] > 0)) continue;
  for (let t = 0; t < 2; t++) {
    const tx = t ? T.kTbx[k] : T.kTax[k]; const ty = t ? T.kTby[k] : T.kTay[k];
    const px = Math.floor(tx * a + e), py = Math.floor(ty * d + f); let disc = 0, tan = 0, ink = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const wx = (px + dx + 0.5 - e) / a, wy = (py + dy + 0.5 - f) / d;
      if ((wx - tx) ** 2 + (wy - ty) ** 2 > T.W * T.W) continue; disc++;
      const o = E.eval(wx, wy); if (o.ink < 0.5) continue; ink++;
      if (o.winKind === 4 && o.winA === k && o.winB === t) tan++;
    }
    pts++; const share = tan / Math.max(1, disc); hist[Math.min(10, Math.floor(share * 10))]++;
    if (share < MIN) continue;
    let best = "", bd = 1e9; for (const s of SJ.sites) { const q = Math.hypot(s.x - px, s.y - py); if (q < bd) { bd = q; best = s.site; } }
    out.push({ k, t, x: px, y: py, share: +share.toFixed(2), inkShare: +(ink / disc).toFixed(2), site: best, off: Math.round(bd), j: T.kJ[k], ca: T.kCa[k], cb: T.kCb?.[k], R: +(T.kR[k] / h).toFixed(3), ext: T.kExt?.[k] ?? 0 });
  }
}
out.sort((p, q) => q.share - p.share);
for (const o of out) console.log(`k${o.k}.${o.t ? "b" : "a"} @${o.x},${o.y} share ${o.share} (ink ${o.inkShare}) near ${o.site} (${o.off} px) j${o.j} chains ${o.ca}/${o.cb} R ${o.R} h ext ${o.ext}`);
console.log(`tangent points ${pts}; share of the W disc inked by the point's own term, by tenth: ${hist.join(" ")}; >= ${MIN}: ${out.length}`);
if (outP) writeFileSync(outP, JSON.stringify(out, null, 1));
