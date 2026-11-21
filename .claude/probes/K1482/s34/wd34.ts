// K1482 s34: where the s34 rule changes the CPU copy's border ink, over a whole frame at stride 1. Every pixel is
// evaluated with GfEval.S34 = <mode>; where the rule took ink (E.s34n rose), again with S34 "0", and the ink compared
// (|d| > 0.02). Places = 8-connected clusters of changed px (merge radius 6 px), with box, px lost/gained and the
// nearest site (link A only).
//   npx tsx wd34.ts A <scene.json> <sites.json> [mode ""|w]      (link A's device frame, sites' box +- 60 px)
//   npx tsx wd34.ts K <k868 scene name> - [mode]                  (the scene's 2-aa frame)
// env GF_KRETRY=1. Output: one line per place, then the totals.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; } return v; };
const [, , kind, sp, sitesP, modeS] = process.argv; const mode = modeS ?? "";
let T: any; let a: number, d: number, e: number, f: number; let sites: { site: string; x: number; y: number }[] = [];
let x0: number, y0: number, x1: number, y1: number;
if (kind === "A") {
  const scene = dec(JSON.parse(readFileSync(sp, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
  T = withHome(buildTables(scene, { aa: 0.011738963274354473, kRetry: true }), true);
  const SJ = JSON.parse(readFileSync(sitesP, "utf8")); [a, , , d, e, f] = SJ.toDevA; sites = SJ.sites;
  x0 = 1e9; x1 = -1e9; y0 = 1e9; y1 = -1e9; for (const s of sites) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); }
  x0 = Math.max(0, Math.floor(x0 - 60)); y0 = Math.max(0, Math.floor(y0 - 60)); x1 = Math.ceil(x1 + 60); y1 = Math.ceil(y1 + 60);
} else {
  const { modelOf } = await import(pathToFileURL(join(SRC, ".claude/probes/K1433/k1433_lib.ts")).href);
  const sc = modelOf(sp).scene; const aa = 0.5 / (sc.camera.pxPerUnit * 2);
  T = withHome(buildTables(sc, { aa, kRetry: true }), true);
  a = d = 1 / (2 * aa); let wx0 = Infinity, wy0 = Infinity, wx1 = -Infinity, wy1 = -Infinity;
  for (let i = 0; i < T.vx.length; i++) { const x = T.vx[i], y = T.vy[i]; if (!(x === x) || !(y === y)) continue; wx0 = Math.min(wx0, x); wy0 = Math.min(wy0, y); wx1 = Math.max(wx1, x); wy1 = Math.max(wy1, y); }
  e = -(wx0 - 2 * T.h) * a; f = -(wy0 - 2 * T.h) * d; x0 = 0; y0 = 0; x1 = Math.ceil((wx1 - wx0 + 4 * T.h) * a); y1 = Math.ceil((wy1 - wy0 + 4 * T.h) * d);
}
const E: any = new GfEval(T); const t0 = Date.now(); let armed = 0;
const ch: { x: number; y: number; dv: number; w: string }[] = [];
for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
  const fx = (x + 0.5 - e) / a; const fy = (y + 0.5 - f) / d;
  GfEval.S34 = mode; const n0 = E.s34n; const i1 = E.eval(fx, fy).ink; if (E.s34n === n0) continue;
  const w = `c${E.s34w[0]}s${(+E.s34w[1]).toFixed(2)}/c${E.s34w[2]}s${(+E.s34w[3]).toFixed(2)} g${E.s34w[4]} pg${E.s34w[5]} surf${E.s34w[6]} kj${(+E.s34w[7]).toFixed(2)} km${(+E.s34w[8]).toFixed(2)} rm${(+E.s34w[9]).toFixed(2)} pdm${(+E.s34w[10]).toFixed(2)} X${(+E.s34w[11]).toFixed(2)}`;
  armed++; GfEval.S34 = "0"; const i0 = E.eval(fx, fy).ink;
  if (Math.abs(i1 - i0) > 0.02) ch.push({ x, y, dv: i1 - i0, w });
}
// cluster
const R = 6; const id = new Int32Array(ch.length).fill(-1); let np = 0;
for (let i = 0; i < ch.length; i++) { if (id[i] >= 0) continue; id[i] = np; const st = [i];
  while (st.length) { const k = st.pop()!; for (let m = 0; m < ch.length; m++) if (id[m] < 0 && Math.abs(ch[m].x - ch[k].x) <= R && Math.abs(ch[m].y - ch[k].y) <= R) { id[m] = np; st.push(m); } }
  np++; }
const P = Array.from({ length: np }, () => ({ n: 0, lost: 0, gain: 0, bx0: 1e9, by0: 1e9, bx1: -1e9, by1: -1e9, w: "" }));
for (let i = 0; i < ch.length; i++) { const p = P[id[i]]; p.n++; if (!p.w) p.w = ch[i].w; if (ch[i].dv < 0) p.lost++; else p.gain++; p.bx0 = Math.min(p.bx0, ch[i].x); p.by0 = Math.min(p.by0, ch[i].y); p.bx1 = Math.max(p.bx1, ch[i].x); p.by1 = Math.max(p.by1, ch[i].y); }
P.sort((p, q) => q.n - p.n);
for (const p of P) {
  const cx = (p.bx0 + p.bx1) / 2, cy = (p.by0 + p.by1) / 2; let near = "", nd = Infinity;
  for (const s of sites) { const dd = Math.hypot(s.x - cx, s.y - cy); if (dd < nd) { nd = dd; near = s.site; } }
  console.log(`place ${p.bx0}-${p.bx1} x ${p.by0}-${p.by1}: ${p.n} px (${p.lost} lost, ${p.gain} gained)${near ? ` near ${near} (${nd.toFixed(0)} px)` : ""} centre ${cx.toFixed(0)},${cy.toFixed(0)} ink/partner ${p.w}`);
  if (process.env.DUMP) { // the pieces at this place's most-changed pixel
    let bi = -1, bv = 0; for (let i = 0; i < ch.length; i++) if (P[id[i]] === p && Math.abs(ch[i].dv) > bv) { bv = Math.abs(ch[i].dv); bi = i; }
    const fx = (ch[bi].x + 0.5 - e) / a; const fy = (ch[bi].y + 0.5 - f) / d; GfEval.S34 = mode; E.eval(fx, fy);
    const L: string[] = []; for (let k = 0; k < E.np; k++) L.push(`c${E.pc[k]}s${E.ps[k].toFixed(2)} g${E.pg[k]} hb${E.phb[k]} su${E.psurf[k]} k${E.pkey[k].toFixed(2)} r${E.pramp[k].toFixed(2)} d${(E.pd[k] / T.h).toFixed(2)}`);
    console.log(`  px ${ch[bi].x},${ch[bi].y} dv ${ch[bi].dv.toFixed(2)}: ${L.join(" | ")}`);
  }
}
console.log(`${kind} ${sp} mode "${mode}": frame ${x0},${y0}-${x1},${y1}; ${armed} px armed, ${ch.length} px changed, ${np} places, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
