// K1362 s5: the tile route's classification on the CPU, against the CPU mirror (GfEval) pixel by pixel: every pixel of a
// tier tile must hold no more pieces / corners than the tier (and no ramp in a NORAMP tier), and every pixel outside the
// drawn tiles must be the empty output. Prints, per scene and tiles size, the class shares, the empty share, the
// classification ms, and the violations (must be 0).
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s5_route.ts <scenes dir> <w> <h> <stride> <tc,tc,...> <scene...>
import { readFileSync } from "node:fs";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";
import { buildTileRoute, type GfTileDiag } from "../../../src/render/gpu_field/gf_tiles";
import { GF_TILE_TIERS } from "../../../src/render/gpu_field/gf_pass";
import { GfEval } from "../../../src/render/gpu_field/eval";
import type { FieldScene } from "../../../src/render/field/scene";

const [dir, ws, hs, strideS, tcs, ...names] = process.argv.slice(2);
const w = +ws; const h = +hs; const stride = +strideS; const fit = 0.917;
for (const name of names) {
  const scene = JSON.parse(readFileSync(`${dir}/${name}.json`, "utf8")) as FieldScene;
  (scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  let T: GfTables = buildTables(scene, { aa: 0.01 });
  let s = 1; let cx = 0; let cy = 0;
  for (let k = 0; k < 2; k++) {
    const bw = T.gW * T.G; const bh = T.gH * T.G;
    s = fit * Math.min(w / bw, h / bh);
    cx = T.gx0 + bw / 2; cy = T.gy0 + bh / 2;
    T = buildTables(scene, { aa: 0.5 / s });
  }
  const e = w / 2 - s * cx; const f = h / 2 - s * cy;
  const map = [1 / s, -e / s, -1 / s, (h - f) / s];
  // per pixel: pieces, corners, ramp, empty output
  const ev = new GfEval(T) as unknown as GfEval & { np: number; nk: number; pg: Int32Array; pramp: Float64Array };
  const nxp = Math.ceil(w / stride); const nyp = Math.ceil(h / stride);
  const P = new Int8Array(nxp * nyp); const K = new Int8Array(nxp * nyp); const R = new Uint8Array(nxp * nyp); const E = new Uint8Array(nxp * nyp);
  const t0 = performance.now();
  for (let j = 0; j < nyp; j++) for (let i = 0; i < nxp; i++) {
    const x = map[0] * (i * stride + 0.5) + map[1]; const y = map[2] * (j * stride + 0.5) + map[3];
    const o = ev.eval(x, y);
    const id = j * nxp + i; P[id] = ev.np; K[id] = ev.nk;
    let r = 0; for (let m = 0; m < ev.np; m++) if (ev.pg[m] >= 0 && ev.pramp[m] > 0 && ev.pramp[m] < 1) r = 1;
    R[id] = r; E[id] = o.ink === 0 && o.cov === 0 ? 1 : 0;
  }
  let pMax = 0; for (let i = 0; i < P.length; i++) if (P[i] > pMax) pMax = P[i];
  // the ceiling: per pixel, the smallest class a perfect classifier could give (11, 22, 32r, full, empty)
  const ceil = [0, 0, 0, 0, 0];
  for (let id = 0; id < P.length; id++) { if (E[id] && P[id] === 0 && K[id] === 0) ceil[4]++; else if (P[id] <= 1 && K[id] <= 1 && !R[id]) ceil[0]++; else if (P[id] <= 2 && K[id] <= 2 && !R[id]) ceil[1]++; else if (P[id] <= 3 && K[id] <= 2) ceil[2]++; else ceil[3]++; }
  console.log(`${name} ${w}x${h} cells ${T.gW}x${T.G.toFixed(3)} px/cell ${(T.G * s).toFixed(1)} rc ${T.rc.toFixed(3)} sigma ${T.sigma.toFixed(3)} eval ${((performance.now() - t0) / 1000).toFixed(1)} s, max pieces ${pMax}`);
  console.log(`  per-pixel ceiling 11/22/32r/full/empty ${ceil.map((v) => (v / P.length).toFixed(3)).join("/")}`);
  for (const tok of tcs.split(",")) {
    // "<tc>f": the optimistic bound (gf_pass GF_TILE_FALLBACK); its p/k/ramp "violations" are the pixels a tier discards and the full program redraws
    const tc = parseInt(tok, 10); const opt = tok.endsWith("F") ? 2 : tok.endsWith("f") ? 1 : 0;
    const D: GfTileDiag = {}; const R0 = buildTileRoute(T, GF_TILE_TIERS, tc, undefined, D, opt);
    const why = [0, 0, 0, 0]; // full tiles: pieces unbounded, pieces > 3, corners > 2, both bounded (cannot happen)
    for (let i = 0; i < D.np!.length; i++) { if (D.np![i] >= 1 << 20) why[0]++; else if (D.np![i] > 3) why[1]++; else if (D.nk![i] > 2) why[2]++; }
    { const w2 = [0, 0, 0, 0]; for (let i = 0; i < D.np!.length; i++) { if (D.np![i] < 0 || D.np![i] >= 1 << 20) continue; const p = D.np![i]; const k = D.nk![i]; const r = D.ramp![i]; if (p <= 3 && k <= 2 && !(p <= 2 && k <= 2 && !r)) { if (r && p <= 2 && k <= 2) w2[0]++; else if (p === 3) w2[1]++; else w2[2]++; } } console.log(`  tc ${tok} 32r tiles by reason: ramp only ${w2[0]}, pieces 3 ${w2[1]}, other ${w2[2]}`); }
    console.log(`  tc ${tc} full tiles by reason: pieces unbounded ${why[0]}, pieces > 3 ${why[1]}, corners > 2 ${why[2]}`); const ms: number[] = [];
    for (let k = 0; k < 3; k++) ms.push(buildTileRoute(T, GF_TILE_TIERS, tc, undefined, undefined, opt).ms);
    const cls = new Uint8Array(nxp * nyp).fill(255);
    let px = 0;
    for (let c = 0; c < R0.count.length; c++) for (let t = R0.first[c]; t < R0.first[c] + R0.count[c]; t++) {
      const x0 = R0.rects[4 * t]; const y0 = R0.rects[4 * t + 1]; const x1 = R0.rects[4 * t + 2]; const y1 = R0.rects[4 * t + 3];
      // pixel ranges whose centers fall in the rect (map: x = a px + b, y = c py + d with c < 0)
      const i0 = Math.max(0, Math.ceil(((x0 - map[1]) / map[0] - 0.5) / stride)); const i1 = Math.min(nxp - 1, Math.floor(((x1 - map[1]) / map[0] - 0.5) / stride));
      const j0 = Math.max(0, Math.ceil(((y1 - map[3]) / map[2] - 0.5) / stride)); const j1 = Math.min(nyp - 1, Math.floor(((y0 - map[3]) / map[2] - 0.5) / stride));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { cls[j * nxp + i] = c; px++; }
    }
    let redraw = 0; const bad = [0, 0, 0, 0]; const shPx = new Array(R0.count.length + 1).fill(0);
    for (let id = 0; id < cls.length; id++) {
      const c = cls[id];
      if (c === 255) { shPx[R0.count.length]++; if (!E[id] || P[id] > 0) bad[3]++; continue; }
      shPx[c]++;
      if (c >= GF_TILE_TIERS.length) continue;
      const t = GF_TILE_TIERS[c];
      if (P[id] > t.p) bad[0]++; if (K[id] > t.k) bad[1]++; if (!t.ramps && R[id]) bad[2]++;
      if (P[id] > t.p || K[id] > t.k || (!t.ramps && R[id])) redraw++;
    }
    const sh = shPx.map((v) => (v / cls.length).toFixed(3)).join("/");
    console.log(`  tc ${tok}: redraw ${(redraw / cls.length).toFixed(4)} tiles ${R0.total} (empty ${R0.empty}) px share 11/22/32r/full/none ${sh}  cpu ${ms.map((v) => v.toFixed(0)).join(",")} ms  violations p/k/ramp/empty ${bad.join("/")}`);
  }
}
