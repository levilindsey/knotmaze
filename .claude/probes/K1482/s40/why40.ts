// K1482 s40: WHY a place changes under stage 37's rule, in the CPU mirror. Per centre (device px), every px within
// R whose border ink differs between GfEval.S37 = "0" (K1407 c1's burial) and AFTER (default "": the rule) is
// listed by the term that won BEFORE (kind 2 = a fillet arc of corner k, 4 = tangent point k.a / k.b) and the
// term that wins after; per corner face that lost ink, the face's corner (junction, arms, R / h) and the tubes
// that bury it after and did not before: the burying piece's chain, whether it is the corner's own arm A or B,
// and the face point's distance from that chain's centre line, in h.
//   $env:GF_KRETRY='1'; node scripts/run_node.mjs .claude/probes/K1482/s40/why40.ts <scene.json> <sites.json> <x:y,...> [R=24]
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { buildTables, withHome } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/tables.ts")).href);
const { CTRL_ARC } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_build.ts")).href);
const { GfEval } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const dec = (v: any): any => { if (v === "Inf") return Infinity; if (v === "-Inf") return -Infinity; if (v === "NaN") return NaN; if (Array.isArray(v)) return v.map(dec); if (v && typeof v === "object") { if (v.__t) return (globalThis as any)[v.__t].from(v.v.map(dec)); const o: any = {}; for (const k of Object.keys(v)) o[k] = dec(v[k]); return o; } return v; };
const [, , sceneP, sitesP, list, Rs] = process.argv; const R = +(Rs ?? 24);
const AFTER = process.env.AFTER ?? "";
const scene = dec(JSON.parse(readFileSync(sceneP, "utf8"))); scene.look.ctrlArc ??= CTRL_ARC;
const SJ = JSON.parse(readFileSync(sitesP, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const T: any = withHome(buildTables(scene, { aa: 0.5 / a, kRetry: true }), true); const h = T.h; const aa = T.aa;
const E: any = new GfEval(T);
const ss = (e0: number, e1: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const KN: Record<number, string> = { 0: "none", 1: "side", 2: "arc", 3: "end", 4: "tan", 5: "thru", 6: "vtx" };
const name = (wk: number, wa: number, wb: number): string => wk === 2 ? `arc k${wa}` : wk === 4 ? `tan k${wa}.${wb ? "b" : "a"}` : wk === 1 || wk === 3 ? `${KN[wk]} c${wa}${wb > 0 ? "+" : "-"}` : wk === 6 ? `vtx ${wa}/${wb}` : KN[wk] ?? String(wk);
const sites: any[] = SJ.sites ?? [];
const near = (x: number, y: number): string => { let sn = "", sd = Infinity; for (const s of sites) { const dd = Math.hypot(s.x - x, s.y - y); if (dd < sd) { sd = dd; sn = s.site; } } return `${sn} (${sd.toFixed(0)} px)`; };
for (const it of (list ?? "").split(",").filter(Boolean)) {
  const [cx, cy] = it.split(":").map(Number);
  const faces = new Map<string, { n: number; lost: number; gained: number; after: Map<string, number>; px: [number, number, number][] }>();
  for (let Y = cy - R; Y <= cy + R; Y++) for (let X = cx - R; X <= cx + R; X++) {
    const fx = (X + 0.5 - e) / a, fy = (Y + 0.5 - f) / d;
    GfEval.S37 = "0"; const q0 = E.eval(fx, fy); const i0 = q0.ink; const n0 = name(q0.winKind, q0.winA, q0.winB);
    GfEval.S37 = AFTER; const q1 = E.eval(fx, fy); const i1 = q1.ink; const n1 = name(q1.winKind, q1.winA, q1.winB);
    const dv = i1 - i0; if (Math.abs(dv) <= 0.02) continue;
    const g = faces.get(n0) ?? faces.set(n0, { n: 0, lost: 0, gained: 0, after: new Map(), px: [] }).get(n0)!;
    g.n++; if (dv < 0) g.lost++; else g.gained++; g.after.set(n1, (g.after.get(n1) ?? 0) + 1); g.px.push([X, Y, dv]);
  }
  GfEval.S37 = AFTER;
  console.log(`== @${cx},${cy} near ${near(cx, cy)}`);
  for (const [n0, g] of faces) {
    const xs = g.px.map((p) => p[0]), ys = g.px.map((p) => p[1]);
    console.log(`  before ${n0}: ${g.n} px (lost ${g.lost}, gained ${g.gained}), box ${Math.min(...xs)}..${Math.max(...xs)} x ${Math.min(...ys)}..${Math.max(...ys)}; after: ${[...g.after].map(([k, v]) => `${k} ${v}`).join(", ")}`);
    const m = /^(arc|tan) k(\d+)(?:\.(a|b))?$/.exec(n0); if (!m) continue;
    const k = +m[2]; const S = T.kG[k]; const cA = T.kCa[k], cB = T.kCb[k];
    const fx = (g.px[0][0] + 0.5 - e) / a, fy = (g.px[0][1] + 0.5 - f) / d; E.eval(fx, fy);
    const pts: [string, number, number][] = [];
    if (m[1] === "tan") { const t = m[3] === "b"; pts.push([`T${m[3]}`, t ? T.kTbx[k] : T.kTax[k], t ? T.kTby[k] : T.kTay[k]]); }
    else { // the arc point of each lost px's direction: list for the px of the largest loss
      const p = g.px.reduce((u, v) => (v[2] < u[2] ? v : u)); const px = (p[0] + 0.5 - e) / a, py = (p[1] + 0.5 - f) / d;
      const rho = Math.hypot(px - T.kCx[k], py - T.kCy[k]); pts.push([`q(px ${p[0]},${p[1]})`, T.kCx[k] + (T.kR[k] * (px - T.kCx[k])) / rho, T.kCy[k] + (T.kR[k] * (py - T.kCy[k])) / rho]);
    }
    console.log(`    corner k${k}: j${T.kJ[k]} surface ${S} arms A c${cA} / B c${cB}, R ${(T.kR[k] / h).toFixed(3)} h, centre ${(T.kCx[k] * a + e).toFixed(1)},${(T.kCy[k] * d + f).toFixed(1)}; Ta ${(T.kTax[k] * a + e).toFixed(1)},${(T.kTay[k] * d + f).toFixed(1)}, Tb ${(T.kTbx[k] * a + e).toFixed(1)},${(T.kTby[k] * d + f).toFixed(1)}, sector rays a ${T.kEax[k].toFixed(3)},${T.kEay[k].toFixed(3)} b ${T.kEbx[k].toFixed(3)},${T.kEby[k].toFixed(3)}`);
    for (const [pn, qx, qy] of pts) {
      const rows: string[] = [];
      for (let mm = 0; mm < E.np; mm++) {
        if (E.psurf[mm] !== S) continue; const dd = Math.sqrt(E.pieceD(mm, qx, qy)); const wb2 = 1 - ss(h - 2 * aa, h, dd);
        const c = E.pc[mm]; const own = c === cA ? "A" : c === cB ? "B" : "-";
        if (dd < 1.3 * h) rows.push(`c${c}${own !== "-" ? `(${own})` : ""} s${E.ps[mm].toFixed(2)} d ${(dd / h).toFixed(3)} h bur ${wb2.toFixed(2)}`);
      }
      console.log(`    ${pn} at ${(qx * a + e).toFixed(1)},${(qy * d + f).toFixed(1)}: tubes of surface ${S} within 1.3 h: ${rows.join("; ") || "none"}`);
    }
  }
}
