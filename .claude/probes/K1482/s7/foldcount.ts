// K1482 s7 item 1's count: link A pixels whose ink is a piece side face (winKind 1) while that face's outline point q
// lies more than 2aa inside the same piece's own hairpin fold (segments turned > 120 degrees from p's nearest one) at a
// junction (p inside another piece of the surface). Unique device pixels over every site's window.
//   npx tsx foldcount.ts <tables.json> <sites.json> [R=48]   env GFX=<eval.ts> to count another eval (master's)
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = resolve(import.meta.dirname, "../../../..");
const { GfEval } = await import(pathToFileURL(process.env.GFX || join(SRC, "src/render/gpu_field/eval.ts")).href);
const [tp, sp, Rs] = process.argv.slice(2); const R = +(Rs ?? 48);
const raw = JSON.parse(readFileSync(tp, "utf8")); const T: any = {};
for (const [k, v] of Object.entries<any>(raw)) { if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; T[k] = C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); } else T[k] = v; }
T.homeOn = true; const E: any = new GfEval(T); const h = T.h; const aa = T.aa;
const SJ = JSON.parse(readFileSync(sp, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const seen = new Set<string>(); const hits: Record<string, number> = {}; let n = 0;
for (const s of SJ.sites) {
  const cx = Math.round(s.x), cy = Math.round(s.y);
  for (let py = cy - R; py < cy + R; py++) for (let px = cx - R; px < cx + R; px++) {
    const key = px + "," + py; if (seen.has(key)) continue; seen.add(key);
    const x = (px + 0.5 - e) / a, y = (py + 0.5 - f) / d; const P = E.eval(x, y);
    if (!(P.ink >= 0.5) || P.winKind !== 1) continue;
    let hit = false;
    for (let j = 0; j < E.np && !hit; j++) {
      if (E.pc[j] !== P.winA) continue; const X = E.pd[j]; if (!(X > h - T.W - aa && X < h + aa && X > 1e-12)) continue;
      if (!(E.phi[j] - E.plo[j] > 1)) continue;
      let inOther = false; for (let m = 0; m < E.np; m++) if (m !== j && E.psurf[m] === E.psurf[j] && E.pd[m] < h) inOther = true;
      if (!inOther) continue;
      const c = E.pc[j]; const v0 = T.cV0[c]; const nseg = T.cNV[c] - 1; const closed = T.cClosed[c] === 1;
      const qx = E.pfx[j] + (h * (x - E.pfx[j])) / X, qy = E.pfy[j] + (h * (y - E.pfy[j])) / X;
      const segs: number[][] = [];
      for (let kk = E.plo[j]; kk <= E.phi[j]; kk++) { let k = kk; if (closed) k = ((k % nseg) + nseg) % nseg; else if (k < 0 || k >= nseg) continue; const v = v0 + k; segs.push([T.vx[v], T.vy[v], T.vx[v + 1] - T.vx[v], T.vy[v + 1] - T.vy[v]]); }
      const dist = (sg: number[], X0: number, Y0: number) => { const l2 = sg[2] ** 2 + sg[3] ** 2; const u = l2 > 0 ? Math.min(1, Math.max(0, ((X0 - sg[0]) * sg[2] + (Y0 - sg[1]) * sg[3]) / l2)) : 0; return Math.hypot(X0 - sg[0] - sg[2] * u, Y0 - sg[1] - sg[3] * u); };
      let t = segs[0], dp = Infinity; for (const sg of segs) { const q = dist(sg, x, y); if (q < dp) { dp = q; t = sg; } }
      for (const sg of segs) {
        const cos = (sg[2] * t[2] + sg[3] * t[3]) / (Math.hypot(sg[2], sg[3]) * Math.hypot(t[2], t[3]));
        if (cos < -0.5 && dist(sg, qx, qy) < h - 2 * aa) { hit = true; break; }
      }
    }
    if (hit) { n++; hits[s.site] = (hits[s.site] ?? 0) + 1; }
  }
}
console.log("fold-fragment pixels", n, JSON.stringify(hits));
