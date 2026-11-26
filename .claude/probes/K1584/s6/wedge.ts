// K1584 s6 mirror: at each tight turn's ball that sits in a crossing's gap, the border ink with no gap (GfEval), the
// stage 5 gap and the stage 6 wedge (gf_look.ts gapCutAt with ballScaleAt's scale), at device pixels. The cut model:
// the pixel's label chain c is cut by every chain that crosses OVER c within 1.5 of the ball's centre (cnt json), at
// its centreline distance d, sinT 1, no window or slot terms (a model for picking, not the GPU's picture).
//   npx tsx wedge.ts <capDir> <cnt.json> <tight.json> <out.json> [k,k,...]
// out: [{ k, dev, x0, y0, n, ink0[], ink5[], ink6[] }] on the device grid around the ball (n x n, 1 device px).
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = process.env.GF_SRC ?? resolve(import.meta.dirname, "../../../..");
const L = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_look.ts")).href);
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const [, , capDir, cntP, tP, op, kl] = process.argv;
const scene = dec(JSON.parse(readFileSync(join(capDir, "scene_gf.json"), "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const G = dec(JSON.parse(readFileSync(join(capDir, "gw_gf.json"), "utf8")));
const SJ = JSON.parse(readFileSync(join(capDir, "sites_gf.json"), "utf8")); const A = SJ.toDevA;
const aa = 0.5 / Math.abs(A[0]);
const T = withHome(buildTables(scene, { aa, kRetry: true }), true);
const ev = new GfEval(T); const fade = L.lookFade(G); ev.fadeLength = fade;
const CN = JSON.parse(readFileSync(cntP, "utf8")); const TJ = JSON.parse(readFileSync(tP, "utf8"));
const h = CN.h, margin = CN.margin, W = TJ.W;
const only = kl ? new Set(kl.split(",").map(Number)) : null;
const dist = (c: number, x: number, y: number): number => {
  let best = Infinity; const v0 = T.cV0[c]; const nv = T.cNV[c];
  for (let v = v0; v < v0 + nv - 1; v++) {
    const ax = T.vx[v], ay = T.vy[v], dx = T.vx[v + 1] - ax, dy = T.vy[v + 1] - ay, l2 = dx * dx + dy * dy;
    const u = l2 > 0 ? Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
    best = Math.min(best, Math.hypot(x - ax - dx * u, y - ay - dy * u));
  }
  return best;
};
// device -> world (A: dev = (a x + c y + e, b x + d y + f))
const det = A[0] * A[3] - A[1] * A[2];
const toW = (X: number, Y: number): [number, number] => { const u = X - A[4], v = Y - A[5]; return [(A[3] * u - A[2] * v) / det, (-A[1] * u + A[0] * v) / det]; };
const out: any[] = [];
for (const b of TJ.tight) {
  if (only && !only.has(b.k)) continue;
  const [qx, qy] = b.c;
  const overs = new Map<number, number[]>(); // under chain -> over chains
  for (const x of CN.crossings) {
    if (Math.hypot(x.wx - qx, x.wy - qy) > 1.5) continue;
    if (!overs.has(x.under)) overs.set(x.under, []);
    overs.get(x.under)!.push(x.over);
  }
  if (!overs.has(b.ca) && !overs.has(b.cb)) continue;
  const R = b.r + W; const near = [...new Set([...(overs.get(b.ca) ?? []), ...(overs.get(b.cb) ?? [])])].some((o) => dist(o, qx, qy) - h < margin + fade + R);
  if (!near) continue;
  const n = 40; const X0 = Math.round(b.dev[0]) - n / 2, Y0 = Math.round(b.dev[1]) - n / 2;
  const ink0: number[] = [], ink5: number[] = [], ink6: number[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const [x, y] = toW(X0 + i + 0.5, Y0 + j + 0.5);
    const o = ev.eval(x, y); const ink = o.ink; const c = o.chain; const s = o.s;
    let c5 = 0, c6 = 0;
    if (c >= 0 && ink > 0 && overs.has(c)) {
      const bs = L.ballScaleAt(T, W, c, s, x, y);
      for (const oc of overs.get(c)!) {
        if (oc === c) continue;
        const d = dist(oc, x, y);
        c5 = Math.max(c5, L.gapCutAt(d, h, margin, fade, 1, aa, 1, 1, 1));
        c6 = Math.max(c6, L.gapCutAt(d, h, margin, fade, 1, aa, 1, 1, bs));
      }
    }
    ink0.push(+ink.toFixed(3)); ink5.push(+(ink * (1 - c5)).toFixed(3)); ink6.push(+(ink * (1 - c6)).toFixed(3));
  }
  out.push({ k: b.k, j: b.j, ca: b.ca, cb: b.cb, dev: b.dev, x0: X0, y0: Y0, n, ink0, ink5, ink6 });
}
writeFileSync(op, JSON.stringify(out)); console.log("balls", out.length);
