// K1482: at a site's mirror cap-ink pixels (winKind 3), the surfaces form B layers there: id, key, coverage, chain.
//   node scripts/run_node.mjs .claude/probes/K1482/cap_surfaces.ts <tables.json> <sites.json> <site> [n=6]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , tp, sp, nm, ns] = process.argv;
const SRC = resolve(process.cwd());
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const raw = JSON.parse(readFileSync(tp, "utf8")); const T: any = {};
for (const [k, v] of Object.entries<any>(raw)) { if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; T[k] = C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); } else T[k] = v; }
const SJ = JSON.parse(readFileSync(sp, "utf8")); const [a, , , d, e, f] = SJ.toDevA; const E: any = new GfEval(T);
const s = SJ.sites.find((q: any) => q.site === nm); const cx = Math.round(s.x), cy = Math.round(s.y); let n = +(ns ?? 6);
for (let y = cy - 28; y < cy + 28 && n > 0; y += 2) for (let x = cx - 28; x < cx + 28 && n > 0; x += 2) {
  const P = E.eval((x + 0.5 - e) / a, (y + 0.5 - f) / d); if (!(P.ink >= 0.5 && P.winKind === 3)) continue; n--;
  const sf = []; for (let i = 0; i < E.ns; i++) { const j = E.sord[i]; sf.push(`S${E.sid[j]} key ${E.skey[j].toFixed(3)} cov ${E.scov[j]} ch ${E.scch[j]}`); }
  const pcs = []; for (let j = 0; j < E.np; j++) pcs.push(`c${E.pc[j]} surf ${E.psurf[j]} d ${(E.pd[j]).toFixed(3)} key ${E.pkey[j].toFixed(3)} end ${E.pend[j]}`);
  console.log(`(${x},${y}) ink ${P.ink.toFixed(2)} chain ${P.chain} winA ${P.winA} | ${sf.join(" ; ")}\n    pieces: ${pcs.join(" ; ")}`);
}
