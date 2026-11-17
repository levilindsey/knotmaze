import { buildModel, ALL } from "../K1314/k1314_census.ts";
import { gfTablesOf } from "../K1362/k1362s1_census.ts";
for (const nm of ["muse_hash", "def", "fat"]) {
  const m = buildModel(nm); const T = gfTablesOf(m) as any; const sc = m.scene as any;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const c of sc.chains) for (let i = 0; i < c.pts.length; i += 2) { x0 = Math.min(x0, c.pts[i]); x1 = Math.max(x1, c.pts[i]); y0 = Math.min(y0, c.pts[i + 1]); y1 = Math.max(y1, c.pts[i + 1]); }
  const rs = Array.from(T.kR.slice(0, T.nK) as Float64Array).filter((r) => r > 0).sort((a, b) => a - b);
  console.log(nm, "h", T.h, "W", T.W, "aa", T.aa, "zt", T.zt, "rc", T.rc, "sigma", T.sigma, "ppu", sc.camera.pxPerUnit, "box", x0.toFixed(1), y0.toFixed(1), x1.toFixed(1), y1.toFixed(1), "nK", T.nK, "kR med", rs[rs.length >> 1], "min", rs[0], "max", rs[rs.length - 1], "null", T.nK - rs.length);
}
