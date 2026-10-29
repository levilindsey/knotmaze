import { FormB, TERM_NAMES } from "../../../../src/render/field/form_b";
import type { FieldScene, SceneArm, SceneCrossing, SceneJunction, SceneLook } from "../../../../src/render/field/scene";
const H = 1, W = 0.38;
function line(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] { const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step)); const o: number[] = []; for (let i = 0; i <= n; i++) o.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n); return o; }
function ray(cx: number, cy: number, deg: number, r0: number, r1: number, step = 0.2) { const a = (deg * Math.PI) / 180; return line(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a), cx + r1 * Math.cos(a), cy + r1 * Math.sin(a), step); }
function scene(chains: number[][], junctions: SceneJunction[] = [], crossings: SceneCrossing[] = [], look: Partial<SceneLook> = {}): FieldScene {
  return { version: 1, name: "dbg", source: { kind: "synthetic", generator: "dbg", params: {} }, camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] }, look: { halfWidth: H, band: W, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000", ...look }, chains: chains.map((pts, id) => ({ id, closed: false, pts, z: new Array(pts.length / 2).fill(0) })), crossings, junctions, deadEnds: [] };
}
const J = (c: [number, number], arms: SceneArm[]): SceneJunction => ({ id: "j0", c, arms, corners: arms.map(() => ({ style: "round" as const, pinned: false })) });
function tee(deg: number, r0 = 0, extra: number[][] = [], crossings: SceneCrossing[] = []) {
  const arms: SceneArm[] = [{ chain: 0, s: 10, dir: 1, kind: "through" }, { chain: 1, s: 0, dir: 1, kind: "end" }, { chain: 0, s: 10, dir: -1, kind: "through" }];
  return scene([line(-10, 0, 10, 0), ray(0, 0, deg, r0, 10), ...extra], [J([0, 0], arms)], crossings);
}
const mode = process.argv[2];
if (mode === "d2") {
  const probes: [number, number][] = [[0, H - W / 2], [0.5, H - W / 2], [0.9, 0.9], [1.1, 1.1], [1.4, 1.4], [1.6, 1.25], [H - W / 2, 1.8]];
  let prev: any[] | null = null; const step = 0.002;
  for (let dc = 2.05; dc <= 4.5; dc += step) {
    const fb = new FormB(tee(90, 0.3, [line(-10, dc, 10, dc)], [{ a: { chain: 1, s: dc - 0.3 }, b: { chain: 2, s: 10 }, over: "b" }]));
    const ev = probes.map(([x, y]) => fb.evalPoint(x, y));
    if (prev) ev.forEach((e, i) => { const j = Math.abs(e.ink - prev![i].ink); if (j > 0.05) console.log(`dc ${dc.toFixed(4)} probe ${i} ${prev![i].ink.toFixed(3)} -> ${e.ink.toFixed(3)} term ${TERM_NAMES[prev![i].term?.kind ?? 0]} -> ${TERM_NAMES[e.term?.kind ?? 0]} top ${prev![i].top} -> ${e.top} fade ${e.fade} corners ${fb.corners.map((c) => `r${c.r.toFixed(3)} room${c.room.toFixed(3)}`).join(" ")} endL ${fb.arms[1].L.toFixed(3)}`); });
    prev = ev;
  }
}
if (mode === "y") {
  const pts = [...ray(0, 0, 210, 10, 0), ...ray(0, 0, 330, 0, 10).slice(2)];
  const arms: SceneArm[] = [{ chain: 0, s: 10, dir: -1, kind: "through" }, { chain: 0, s: 10, dir: 1, kind: "through" }, { chain: 1, s: 0, dir: 1, kind: "end" }];
  const fb = new FormB(scene([pts, ray(0, 0, 90, 0, 10)], [J([0, 0], arms)]));
  for (let x = -5.9863; x < 6; x += 0.07) for (let y = -5.9771; y < 6; y += 0.07) {
    const e = fb.evalPoint(x, y); if (!e.term || e.ink <= 0) continue;
    const r = fb.stripCheck(e.term, x, y);
    if (!r.ok) console.log(`(${x.toFixed(4)}, ${y.toFixed(4)}) ink ${e.ink.toFixed(4)} term ${TERM_NAMES[e.term.kind]} cls ${r.cls} D ${e.term.D.toFixed(4)} chain ${e.term.chain} k ${e.term.k} vtx ${e.term.vtx} corner ${e.term.corner}`);
  }
}
