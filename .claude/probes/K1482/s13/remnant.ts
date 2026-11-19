// K1482 s13: the gap windows' ends against the under chain's fused joints. Rebuilds GfGapTable from a cap DUMPGW dump
// (gw_gf.json) and lists, per window side, the arc from the window's end to the under chain's next fused joint on that
// side (dj = raw joint arc, room = dj - jointClear), with device positions for overlays.
//   node scripts/run_node.mjs .claude/probes/K1482/s13/remnant.ts <gw_gf.json> <sites.json> <out.json> [sites=j49,...] [R=70]
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , gp, sp, op, siteList = "j49,j55,j87,j36,t79s,j22,j29,t65s,t80s,t81s,t70s,j88", Rs = "70"] = process.argv;
const SRC = resolve(import.meta.dirname, "../../../..");
const L = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_look.ts")).href);
const PM = await import(pathToFileURL(join(SRC, "src/render/paint_math.ts")).href);
const dec = (v: any): any => {
  if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; return C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); }
  if (v && typeof v === "object" && v.__m) return new Map(v.__m.map(([k, x]: any) => [k, dec(x)]));
  if (Array.isArray(v)) return v.map(dec);
  if (v && typeof v === "object") { const o: any = {}; for (const [k, x] of Object.entries(v)) o[k] = dec(x); return o; }
  return v === "Inf" ? Infinity : v === "-Inf" ? -Infinity : v === "NaN" ? NaN : v;
};
const G = dec(JSON.parse(readFileSync(gp, "utf8")));
const fillHalf = G.style.threadWidth / 2;
const src = {
  kd: G.kd, kcv: G.kcv, chainSamples: G.chainSamples, crossings: G.crossings, fillHalf,
  margin: L.lookGap(G), fade: L.lookFade(G), joints: G.junctionArcCtrls,
  jointClear: L.gfJointClear(fillHalf, G.FILLET_REACH_PER_HALF, G.cuspRadius, L.lookGap(G)),
};
const tab = new L.GfGapTable(); tab.wins = []; tab.values(src);
const D = G.kd, Gm = D.geom;
const geo = (ch: number) => { const c = G.kcv[ch]; return { closed: c.closed, total: Gm[c.geom * 4], arcPer: Gm[c.geom * 4 + 1] }; };
const S = JSON.parse(readFileSync(sp, "utf8")); const A = S.toDevA;
const toD = (x: number, y: number) => [A[0] * x + A[2] * y + A[4], A[1] * x + A[3] * y + A[5]];
const pxPerWorld = Math.hypot(A[0], A[1]);
const ptAt = (ch: number, a: number) => {
  const sm = G.chainSamples[ch]; const g = geo(ch);
  if (g.closed) a = ((a % g.total) + g.total) % g.total;
  const fi = Math.max(0, Math.min(sm.count - 1, a / g.arcPer)); const i0 = Math.floor(fi), i1 = Math.min(i0 + 1, sm.count - 1), u = fi - i0; const P = sm.positions;
  return toD(P[2 * i0] * (1 - u) + P[2 * i1] * u, P[2 * i0 + 1] * (1 - u) + P[2 * i1 + 1] * u);
};
const jointArcs = (ch: number): number[] => ((G.junctionArcCtrls as Map<number, { ctrl: number }[]>)?.get(ch) ?? []).map((j) => PM.kArcOfCtrl(D, G.kcv[ch], j.ctrl));
const sides: any[] = [];
for (let k = 0; k < tab.wins.length; k += 5) {
  const i = tab.wins[k], x = G.crossings[i];
  const u = x.underChain, g = geo(u);
  const uC = PM.kArcOfCtrl(D, G.kcv[u], x.underCtrl);
  for (const dir of [-1, 1]) {
    const w = dir > 0 ? tab.wins[k + 2] : tab.wins[k + 1];
    let dj = Infinity;
    for (const ja of jointArcs(u)) {
      let d = (ja - uC) * dir;
      if (g.closed) { d = ((d % g.total) + g.total) % g.total; }
      if (d > 0 && d < dj) dj = d;
    }
    const room = dj - src.jointClear;
    sides.push({ x: i, over: x.overChain, under: u, uC: +uC.toFixed(3), dir, w: +w.toFixed(3), dj: +dj.toFixed(3), room: +room.toFixed(3), rem: +(room - w).toFixed(3),
      pC: ptAt(u, uC), pW: ptAt(u, uC + dir * w), pJ: Number.isFinite(dj) ? ptAt(u, uC + dir * dj) : null, pR: Number.isFinite(dj) ? ptAt(u, uC + dir * room) : null });
  }
}
const sites = Object.fromEntries(S.sites.map((s: any) => [s.site, s]));
const R = +Rs;
const out: any = { h: fillHalf, margin: src.margin, fade: src.fade, jointClear: src.jointClear, pxPerWorld, sides, boxes: {} };
console.log(`h ${fillHalf} margin ${src.margin.toFixed(3)} fade ${src.fade.toFixed(3)} jointClear ${src.jointClear.toFixed(3)} px/world ${pxPerWorld.toFixed(2)} windows ${tab.wins.length / 5}`);
for (const nm of siteList.split(",")) {
  const s = sites[nm]; const cx = s.x, cy = s.y; const inB = (p: number[]) => Math.abs(p[0] - cx) < R && Math.abs(p[1] - cy) < R;
  const lines: any[] = [];
  for (let ch = 0; ch < G.chainSamples.length; ch++) { const sm = G.chainSamples[ch]; if (!sm) continue; let cur: number[][] = []; for (let k = 0; k < sm.count; k++) { const p = toD(sm.positions[2 * k], sm.positions[2 * k + 1]); if (inB(p)) cur.push([p[0], p[1], k * geo(ch).arcPer]); else if (cur.length) { lines.push({ ch, pts: cur }); cur = []; } } if (cur.length) lines.push({ ch, pts: cur }); }
  const near = sides.filter((sd) => inB(sd.pC) || inB(sd.pW));
  const js: any[] = [];
  for (const [ch, l] of G.junctionArcCtrls as Map<number, { ctrl: number }[]>) for (const jc of l) { const p = ptAt(ch, PM.kArcOfCtrl(D, G.kcv[ch], jc.ctrl)); if (inB(p)) js.push({ ch, p }); }
  out.boxes[nm] = { c: [cx, cy], lines, sides: near, js };
  console.log(`== ${nm} (${cx.toFixed(0)},${cy.toFixed(0)})`);
  for (const sd of near.filter((q) => q.rem < 2.5)) console.log(`  x${sd.x} over ${sd.over} under ${sd.under} dir ${sd.dir > 0 ? "+" : "-"} w ${sd.w} dj ${sd.dj} room ${sd.room} rem ${sd.rem} (${(sd.rem * pxPerWorld).toFixed(0)} px) end at (${sd.pW[0].toFixed(0)},${sd.pW[1].toFixed(0)})`);
}
writeFileSync(op, JSON.stringify(out));
