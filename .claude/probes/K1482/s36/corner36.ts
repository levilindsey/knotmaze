// K1482 s36: the table rows of named corners (the fillets whose tangent-point terms ink a ball): radius, the arc's
// span (the angle Ta-C-Tb; the paper notch between the two arms opens by 180 - span), the tangent points' gap in
// strokes (W), the corner's chains, junction, group and flags; then the same three numbers over every corner of the
// maze that inks (R > 0, not a through pass), as counts per span and radius class.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s36/corner36.ts <scene.json> <sites.json> <k,k,...>
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, ks] = process.argv;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h; const W = T.W;
const row = (k: number) => {
  const ax = T.kTax[k] - T.kCx[k], ay = T.kTay[k] - T.kCy[k], bx = T.kTbx[k] - T.kCx[k], by = T.kTby[k] - T.kCy[k];
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  const span = la > 1e-9 && lb > 1e-9 ? (Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))) * 180) / Math.PI : NaN;
  return { k, R: T.kR[k] / h, span, gap: Math.hypot(T.kTax[k] - T.kTbx[k], T.kTay[k] - T.kTby[k]) / W, thru: T.kThru[k] ? 1 : 0, ext: T.kExt?.[k] ?? 0 };
};
for (const k of (ks ?? "").split(",").filter(Boolean).map(Number)) {
  const r = row(k);
  console.log(`k${k}: j${T.kJ[k]} g${T.kG[k]} chains ${T.kCa[k]}/${T.kCb?.[k]} R ${r.R.toFixed(3)} h (${(T.kR[k] * a).toFixed(2)} px) Rmax ${(T.kRmax[k] / h).toFixed(2)} h span ${r.span.toFixed(0)} deg, Ta-Tb ${r.gap.toFixed(2)} W, thru ${r.thru} ext ${r.ext}; centre px ${(T.kCx[k] * a + e).toFixed(0)},${(T.kCy[k] * d + f).toFixed(0)}`);
}
let n = 0; const cls: Record<string, number> = {};
for (let k = 0; k < T.kCx.length; k++) {
  const r = row(k); if (!(r.R > 0) || r.thru) continue; n++;
  const key = `${r.gap < 0.5 ? "gap<0.5W" : r.gap < 1 ? "gap<1W" : "gap>=1W"} ${r.R < 0.2 ? "R<0.2h" : "R>=0.2h"}`;
  cls[key] = (cls[key] ?? 0) + 1;
}
console.log(`corners that ink: ${n}; ` + Object.entries(cls).sort().map(([k, v]) => `${k}: ${v}`).join("; "));
