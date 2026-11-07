// K1239 Done 2: old cut/stub ends vs field ends, per family (geometry, world units).
// Usage: run_node ends.ts <family>
import { readFileSync } from "node:fs";
import { FormB } from "../../../src/render/field/form_b";
import { pointAt, normS } from "../../../src/render/field/geom";
import type { FieldScene } from "../../../src/render/field/scene";

const fam = process.argv[2] ?? "def";
const d = JSON.parse(readFileSync(`.claude/probes/K1239/out/diag_${fam}.json`, "utf8"));
const scene: FieldScene = d.scene;
scene.look.ctrlArc ??= 0.47;
const fb = new FormB(scene, { dpr: 1.5 });
const h = scene.look.halfWidth, W = scene.look.band, off = h - W / 2;
const cam = scene.camera;
const cx = (800 - cam.worldToCss[4]) / cam.pxPerUnit, cy = (450 - cam.worldToCss[5]) / cam.pxPerUnit;
const sZ = cam.pxPerUnit * 8;
const inView = (x: number, y: number) => Math.abs(x - cx) <= 800 / sZ + 0.3 && Math.abs(y - cy) <= 450 / sZ + 0.3;
const tolZoom = 1 / (sZ * 1.5), tolFull = 1 / (cam.pxPerUnit * 1.5);
type End = { x: number; y: number; chain: number; kind: string };
const oldEnds: End[] = [], fieldEnds: End[] = [];
const slots: { i: number; under: number; cutNeg: number; cutPos: number }[] = d.slots ?? [];
const polyOf = (id: number) => fb.polys[fb.polys.findIndex((p) => p.id === id)];
const bandPt = (chain: number, s: number, side: number): [number, number] => {
  const p = polyOf(chain);
  const at = pointAt(p, normS(p, s));
  return [at.x - at.ty * side * off, at.y + at.tx * side * off];
};
// crossing cut ends (old: slot cuts; field: FormB burial boundaries)
scene.crossings.forEach((x, xi) => {
  const psx = (d.psCrossings ?? [])[xi] as { over: { chain: number; ctrl: number }; under: { chain: number; ctrl: number } } | undefined;
  const slot = psx ? slots.find((s) => s.over === psx.over.chain && s.under === psx.under.chain && Math.abs((s as unknown as { overCtrl: number }).overCtrl - psx.over.ctrl) < 0.6) : undefined;
  if (!slot) return;
  const under = x.over === "a" ? x.b : x.a;
  if (slot.under !== under.chain) return;
  const p = polyOf(under.chain);
  for (const dir of [-1, 1] as const) {
    const cut = dir < 0 ? slot.cutNeg : slot.cutPos;
    for (const side of [-1, 1] as const) {
      const [ox, oy] = bandPt(under.chain, under.s + dir * cut, side);
      if (inView(ox, oy)) oldEnds.push({ x: ox, y: oy, chain: under.chain, kind: `x${xi}` });
      // field: scan ink outward from centre
      let endT = -1, wasBuried = false;
      for (let t = 0; t <= 1.0; t += 0.01) {
        const at = pointAt(p, normS(p, under.s + dir * t));
        const ink = fb.evalPoint(at.x - at.ty * side * off, at.y + at.tx * side * off).ink;
        if (ink <= 0.5) wasBuried = true;
        else if (wasBuried) { endT = t; break; }
      }
      if (endT >= 0) {
        const [fx, fy] = bandPt(under.chain, under.s + dir * endT, side);
        if (inView(fx, fy)) fieldEnds.push({ x: fx, y: fy, chain: under.chain, kind: `x${xi}` });
      }
    }
  }
});
// stub/cap ends: deadEnds (old always caps on-screen terminals; field caps only non-offscreen)
for (const de of scene.deadEnds) {
  const c = scene.chains[de.chain];
  const n = c.pts.length / 2;
  const atEnd = de.s > 0;
  const pt: [number, number] = atEnd ? [c.pts[(n - 1) * 2], c.pts[(n - 1) * 2 + 1]] : [c.pts[0], c.pts[1]];
  if (!inView(pt[0], pt[1])) continue;
  oldEnds.push({ x: pt[0], y: pt[1], chain: de.chain, kind: "stub" });
  if (!de.offscreen) fieldEnds.push({ x: pt[0], y: pt[1], chain: de.chain, kind: "stub" });
}
function count(tol: number) {
  let matched = 0;
  const unmatched: End[] = [];
  for (const oe of oldEnds) {
    let best = 1e9;
    for (const fe of fieldEnds) { if (fe.chain !== oe.chain) continue; best = Math.min(best, Math.hypot(fe.x - oe.x, fe.y - oe.y)); }
    if (best <= tol) matched++;
    else unmatched.push(oe);
  }
  return { matched, unmatched };
}
const z = count(tolZoom), f = count(tolFull);
console.log(`${fam}: old ends in view ${oldEnds.length}, field ends ${fieldEnds.length}`);
console.log(`  tol 1px@zoom (${tolZoom.toFixed(4)} world): matched ${z.matched}, unmatched ${z.unmatched.length}`);
console.log(`  tol 1px@full (${tolFull.toFixed(4)} world): matched ${f.matched}, unmatched ${f.unmatched.length}`);
const byKind = new Map<string, number>();
for (const u of z.unmatched) byKind.set(u.kind === "stub" ? "stub" : "crossing", (byKind.get(u.kind === "stub" ? "stub" : "crossing") ?? 0) + 1);
const nd = oldEnds.map((oe) => { let best = 1e9; for (const fe of fieldEnds) { if (fe.chain !== oe.chain) continue; best = Math.min(best, Math.hypot(fe.x - oe.x, fe.y - oe.y)); } return best; }).sort((a, b) => a - b);
console.log(`  nearest field-end distance (world): min ${nd[0]?.toFixed(3)} p25 ${nd[Math.floor(nd.length * 0.25)]?.toFixed(3)} median ${nd[Math.floor(nd.length / 2)]?.toFixed(3)} p75 ${nd[Math.floor(nd.length * 0.75)]?.toFixed(3)} max ${nd[nd.length - 1]?.toFixed(3)}`);
console.log(`  unmatched@zoom by kind: ${JSON.stringify([...byKind.entries()])}; sample: ${z.unmatched.slice(0, 8).map((u) => `${u.kind} chain${u.chain} (${u.x.toFixed(2)},${u.y.toFixed(2)})`).join(" | ")}`);
