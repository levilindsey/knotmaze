// K1482 s41: one device px through the mirror: its pieces (chain, s, X / h, surface, key, group, end) and, per piece
// side, q (the outline point), the same-surface burial of q by each other piece m (dm / h), the corners near p, the
// surfaces (key, coverage, ink, winner) and the result.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s41/px41.ts <scene.json> <sites.json> <x:y>[,x:y...]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, xys] = process.argv;
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h;
const E: any = new GfEval(T); GfEval.S41 = process.env.MODE ?? "";
const P = (wx: number, wy: number): string => `${(wx * a + e).toFixed(1)},${(wy * d + f).toFixed(1)}`;
for (const xy of xys.split(",")) {
  const [X, Y] = xy.split(":").map(Number); const x = (X + 0.5 - e) / a, y = (Y + 0.5 - f) / d;
  const q = E.eval(x, y);
  console.log(`== ${X},${Y}: ink ${q.ink.toFixed(3)} win ${q.winKind}/${q.winA}/${q.winB}`);
  for (let j = 0; j < E.np; j++) {
    const Xj = E.pd[j]; let s = `  p${j} c${E.pc[j]} s ${E.ps[j].toFixed(3)} X ${(Xj / h).toFixed(3)} h surf ${E.psurf[j]} key ${E.pkey[j].toFixed(4)} g ${E.pg[j]} ramp ${E.pramp?.[j]?.toFixed?.(2)} end ${E.pend[j]} foot ${P(E.pfx[j], E.pfy[j])}`;
    if (Xj < h + T.aa && Xj > 1e-12) {
      const qx = E.pfx[j] + (h * (x - E.pfx[j])) / Xj, qy = E.pfy[j] + (h * (y - E.pfy[j])) / Xj; s += ` q ${P(qx, qy)}`;
      const bs: string[] = [];
      for (let m = 0; m < E.np; m++) { if (m === j) continue; const dm = Math.sqrt(E.pieceD(m, qx, qy)); if (dm < 1.2 * h) bs.push(`p${m}${E.psurf[m] === E.psurf[j] ? "" : "x"}:${(dm / h).toFixed(3)}`); }
      if (bs.length) s += ` bur ${bs.join(" ")}`;
    }
    console.log(s);
  }
  for (let i = 0; i < E.nk; i++) { const k = E.kk[i]; console.log(`  k${k} in ${E.kIn[i]} sec ${E.kSec[i]} rho ${(E.krho[i] / h).toFixed(3)} R ${(T.kR[k] / h).toFixed(3)} G ${T.kG[k]} ext ${T.kExt?.[k]}`); }
  for (let i = 0; i < E.ns; i++) console.log(`  S${E.sid[i]} key ${E.skey[i].toFixed(4)} a ${E.sa[i].toFixed(3)} v ${E.sv[i].toFixed(3)} win ${E.swk[i]}/${E.swa[i]}/${E.swb[i]}`);
}
