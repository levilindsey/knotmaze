// K1482: the CPU mirror (GfEval, form B) around sites: per device pixel ink, cov, chain, winKind, winA, winB.
//   node mirror_tiles.ts <tables.json> <sites.json> <out.json> <site,site,...> [R=28]
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , tp, sp, op, names, Rs] = process.argv; const R = +(Rs ?? 28);
const SRC = resolve(import.meta.dirname, "../../..");
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const raw = JSON.parse(readFileSync(tp, "utf8")); const T: any = {};
for (const [k, v] of Object.entries<any>(raw)) {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; T[k] = C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); } else T[k] = v;
}
const SJ = JSON.parse(readFileSync(sp, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
(globalThis as any).__K1482 = +(process.argv[7] ?? process.env.K1482M ?? 0); const E = new GfEval(T); const out: any = {};
for (const nm of names.split(",")) {
  const s = SJ.sites.find((q: any) => q.site === nm); const cx = Math.round(s.x), cy = Math.round(s.y); const px: number[][] = [];
  for (let y = cy - R; y < cy + R; y++) for (let x = cx - R; x < cx + R; x++) {
    const P = E.eval((x + 0.5 - e) / a, (y + 0.5 - f) / d);
    px.push([+P.ink.toFixed(3), +P.cov.toFixed(3), P.chain, P.winKind, P.winA, P.winB]);
  }
  out[nm] = { cx, cy, R, px };
}
writeFileSync(op, JSON.stringify(out));
