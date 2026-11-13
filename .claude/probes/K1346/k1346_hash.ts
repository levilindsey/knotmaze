import { loadScene, ALL } from "../K1314/k1314_census";
import * as O from "../../../src/render/outline/outline";
const out: string[] = [];
for (const nm of (process.argv[2] ? process.argv[2].split(",") : ALL)) {
  const sc = loadScene(nm); const t = O.frame(O.structure(sc), sc) as any;
  let h = 2166136261 >>> 0; const f64 = new Float64Array(1); const u32 = new Uint32Array(f64.buffer);
  const mix = (v: number): void => { f64[0] = v; for (const w of [u32[0], u32[1]]) { h ^= w; h = Math.imul(h, 16777619) >>> 0; } };
  for (const p of t.pieces) { mix(p.pts.length); for (const v of p.pts) mix(v); for (const v of p.cpts) mix(v); if (p.alpha) for (const v of p.alpha) mix(v); }
  out.push(`${nm} ${t.pieces.length} ${h.toString(16)}`);
}
console.log(out.join("\n"));
