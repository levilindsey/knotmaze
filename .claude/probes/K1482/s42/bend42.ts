// K1482 s42: a census of same-chain inside creases: places where a chain bends tighter than the outline's offset,
// so its inside outline (the h offset; also the h - W one) meets itself in a V instead of a curve, as at t4s.
// For each chain and side, a vertex's offset point at distance h that lies nearer than h to the chain within 4h of
// arc is "eaten"; a run of eaten vertices is one crease. Prints per crease: chain, side, s range, turn (deg) across
// it, whether the h - W offset is eaten too (both edges square), the device px of the crease (on the mid-band) and
// the mirror's ink and label there, and the nearest corner record's centre distance (px). Then the counts.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s42/bend42.ts <scene.json> <sites.json> [minTurn=20]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, mt] = process.argv; const minTurn = +(mt ?? 20);
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true);
const E: any = new GfEval(T);
const h = T.h, W = T.W;
const rows: string[] = []; let nAll = 0, nBoth = 0, nInk = 0, nInkBoth = 0;
for (let c = 0; c < T.nC; c++) {
  const v0 = T.cV0[c], nv = T.cNV[c], closed = !!T.cClosed[c];
  const X = (i: number) => T.vx[v0 + i], Y = (i: number) => T.vy[v0 + i], S = (i: number) => T.vs[v0 + i];
  const distWin = (px: number, py: number, s0: number): number => {
    let best = Infinity;
    for (let i = 0; i + 1 < nv; i++) {
      const sm = 0.5 * (S(i) + S(i + 1)); if (Math.abs(sm - s0) > 4 * h + 1e-9) continue;
      const ax = X(i), ay = Y(i), dx = X(i + 1) - ax, dy = Y(i + 1) - ay, l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
      const q = Math.hypot(px - ax - t * dx, py - ay - t * dy); if (q < best) best = q;
    }
    return best;
  };
  const tan = (i: number): [number, number] => { const i0 = Math.max(0, i - 1), i1 = Math.min(nv - 1, i + 1); const dx = X(i1) - X(i0), dy = Y(i1) - Y(i0), l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  for (const sg of [1, -1]) {
    const eaten = (i: number, dd: number): boolean => { const [tx, ty] = tan(i); const px = X(i) - sg * ty * dd, py = Y(i) + sg * tx * dd; return distWin(px, py, S(i)) < dd - 0.02 * h; };
    let i = 1;
    while (i < nv - 1) {
      if (!eaten(i, h)) { i++; continue; }
      let j = i; while (j + 1 < nv - 1 && eaten(j + 1, h)) j++;
      const ib = Math.max(0, i - 1), ia = Math.min(nv - 1, j + 1);
      const t0x = X(i) - X(ib), t0y = Y(i) - Y(ib), t1x = X(ia) - X(j), t1y = Y(ia) - Y(j);
      const turn = Math.abs(Math.atan2(t0x * t1y - t0y * t1x, t0x * t1x + t0y * t1y)) * 180 / Math.PI;
      const m = (i + j) >> 1; let both = false; for (let k = i; k <= j; k++) if (eaten(k, h - W)) both = true;
      // the crease on the mid-band: walk the bisector from the middle vertex until the window distance is h - W/2
      const [tx, ty] = tan(m); const nx = -sg * ty, ny = sg * tx; let px = X(m), py = Y(m);
      for (let t = 0; t <= 2 * h; t += 0.02 * h) { px = X(m) + nx * t; py = Y(m) + ny * t; if (distWin(px, py, S(m)) >= h - 0.5 * W) break; }
      const q = E.eval(px, py);
      let kd = Infinity; for (let k = 0; k < T.nK; k++) kd = Math.min(kd, Math.hypot(T.kCx[k] - px, T.kCy[k] - py) - T.kR[k]);
      if (turn >= minTurn) {
        nAll++; if (both) nBoth++; const inked = q.ink > 0.5 && q.chain === c; if (inked) { nInk++; if (both) nInkBoth++; }
        rows.push(`${inked ? "INK " : "    "}c${c} ${sg > 0 ? "L" : "R"} s ${S(i).toFixed(2)}..${S(j).toFixed(2)} turn ${turn.toFixed(0)} both ${both ? 1 : 0} at ${(a * px + e).toFixed(0)},${(d * py + f).toFixed(0)} ink ${q.ink.toFixed(2)} lab ${q.chain} kNear ${(kd * a).toFixed(0)}px`);
      }
      i = j + 1;
    }
  }
}
for (const r of rows) console.log(r);
console.log(`creases turn>=${minTurn}: ${nAll} (both edges ${nBoth}); drawn (ink>0.5, own label): ${nInk} (both edges ${nInkBoth})`);
