// K1240 S1: the builder's tests (run: node scripts/run_node.mjs
// .claude/probes/K1240/proto/outline.test.ts). Synthetic scenes only; the
// form B comparison lives in check_exact.ts (the checks may use src/render;
// the builder may not).
import { readFileSync } from "node:fs";
import { buildOutline, type SceneIn } from "./outline";

let fails = 0;
function ok(cond: boolean, msg: string): void {
  if (cond) console.log(`ok - ${msg}`);
  else { fails++; console.log(`FAIL - ${msg}`); }
}
function eq(a: number, b: number, tol: number, msg: string): void {
  ok(Math.abs(a - b) <= tol, `${msg} (got ${a}, want ${b} +/- ${tol})`);
}

const LOOK = { halfWidth: 0.5, band: 0.2, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 0.6, depthWindow: 1.4, paper: "#ffffff", ink: "#000000" };
const CAM = { worldToCss: [10, 0, 0, 10, 0, 0], pxPerUnit: 10, dpr: 1, viewport: [200, 200] as [number, number] };
function scene(part: Partial<SceneIn>): SceneIn {
  return { name: "synth", camera: CAM, look: LOOK, chains: [], crossings: [], junctions: [], deadEnds: [], ...part };
}
function loopArea(pts: number[]): number {
  let a = 0;
  const n = pts.length / 2;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    a += pts[2 * i] * pts[2 * j + 1] - pts[2 * j] * pts[2 * i + 1];
  }
  return a / 2;
}

// Import guard: the builder imports nothing at all.
{
  const src = readFileSync(new URL("./outline.ts", import.meta.url), "utf8");
  ok(!/^\s*import[\s(]/m.test(src), "outline.ts has no import statements");
  ok(!src.includes("src/render"), "outline.ts never mentions src/render");
}

// 1. One straight open chain: one face, one region, two caps, tube area.
{
  const t = buildOutline(scene({
    chains: [{ id: 0, closed: false, pts: [0, 0, 10, 0] }],
    deadEnds: [{ chain: 0, s: 0 }, { chain: 0, s: 10 }],
  }));
  ok(t.faces.length === 1 && t.faces[0].ownerChain === 0, "straight chain: one face owned by chain 0");
  ok(t.regions.filter((r) => !r.hole).length === 1, "straight chain: one thread region");
  eq(Math.abs(loopArea(t.regions[0].pts)), 10 * 1 + Math.PI * 0.25, 0.15, "straight chain: region area = tube area");
  ok(t.pieces.some((p) => p.kind === "cap"), "straight chain: a cap piece exists");
  ok(t.pieces.every((p) => p.pts.length === p.cpts.length), "straight chain: pts/cpts same length");
}

// 2. A crossing: the lens belongs to the over chain; under borders stop.
{
  const t = buildOutline(scene({
    chains: [
      { id: 0, closed: false, pts: [0, 0, 10, 0] },
      { id: 1, closed: false, pts: [5, -5, 5, 5] },
    ],
    crossings: [{ a: { chain: 0, s: 5 }, b: { chain: 1, s: 5 }, over: "a" }],
    deadEnds: [{ chain: 0, s: 0 }, { chain: 0, s: 10 }, { chain: 1, s: 0 }, { chain: 1, s: 10 }],
  }));
  ok(t.cuts.length >= 2, `crossing: under cuts recorded (${t.cuts.length})`);
  ok(t.cuts.every((c) => c.chain === 1 && c.overChain === 0), "crossing: every cut is the under chain stopping");
  const lens = t.faces.filter((f) => Math.abs(f.sample[0] - 5) < 0.5 && Math.abs(f.sample[1]) < 0.5);
  ok(lens.length >= 1 && lens.every((f) => f.ownerChain === 0), `crossing: the overlap face is owned by the over chain (${lens.map((f) => f.ownerChain).join(",")})`);
  // Every under piece endpoint near the crossing lies on the over outline
  // (|y| = h on chain 0's borders, or |x-5| small on its own).
  let stopped = 0;
  for (const p of t.pieces) {
    if (p.chain !== 1) continue;
    for (let i = 0; i < p.pts.length; i += 2) {
      const x = p.pts[i]; const y = p.pts[i + 1];
      if (Math.hypot(x - 5, y) < 1.2 && Math.abs(Math.abs(y) - 0.5) < 1e-6) stopped++;
    }
  }
  ok(stopped >= 2, `crossing: under borders end on the over outline (${stopped} ends)`);
}

// 3. A T junction with round corners: arcs spliced, one outline.
{
  const t = buildOutline(scene({
    chains: [
      { id: 0, closed: false, pts: [0, 0, 10, 0] },
      { id: 1, closed: false, pts: [5, 0, 5, 5] },
    ],
    junctions: [{
      id: "j0", c: [5, 0],
      arms: [
        { chain: 0, s: 5, dir: -1, kind: "through" },
        { chain: 1, s: 0, dir: 1, kind: "end" },
        { chain: 0, s: 5, dir: 1, kind: "through" },
      ],
      corners: [{ style: "round", pinned: false }, { style: "round", pinned: false }, { style: "round", pinned: false }],
    }],
    deadEnds: [{ chain: 0, s: 0 }, { chain: 0, s: 10 }, { chain: 1, s: 5 }],
  }));
  const arcs = t.pieces.filter((p) => p.kind === "arc");
  ok(t.corners.filter((c) => c.ok).length === 2, `T: two corners solved (${t.corners.map((c) => `${c.ok}/${c.why ?? ""}`).join(" ")})`);
  ok(arcs.length === 2, `T: two arc pieces (${arcs.length})`);
  ok(arcs.every((p) => p.corner >= 0 && t.corners[p.corner].r > 0.1), "T: arcs carry their corner and radius");
  // No piece crosses the junction mouth: no border point of chain 0's
  // through inside the stem's tube near the root, on the stem side.
  let mouth = 0;
  for (const p of t.pieces) {
    if (p.kind !== "run") continue;
    for (let i = 0; i < p.pts.length; i += 2) {
      const x = p.pts[i]; const y = p.pts[i + 1];
      if (Math.abs(x - 5) < 0.49 && y > 0.05 && y < 1.5) mouth++;
    }
  }
  ok(mouth === 0, `T: no border across the mouth (${mouth})`);
}

// 4. Fill edges lie on the outline: every face-loop vertex is on a piece.
{
  const t = buildOutline(scene({
    chains: [
      { id: 0, closed: false, pts: [0, 0, 10, 0] },
      { id: 1, closed: false, pts: [5, -5, 5, 5] },
    ],
    crossings: [{ a: { chain: 0, s: 5 }, b: { chain: 1, s: 5 }, over: "a" }],
    deadEnds: [{ chain: 0, s: 0 }, { chain: 0, s: 10 }, { chain: 1, s: 0 }, { chain: 1, s: 10 }],
  }));
  // Distance from a point to the outline pieces (sampled segments).
  const segs: [number, number, number, number][] = [];
  for (const p of t.pieces) for (let i = 0; i + 3 < p.pts.length; i += 2) segs.push([p.pts[i], p.pts[i + 1], p.pts[i + 2], p.pts[i + 3]]);
  const dist = (x: number, y: number): number => {
    let best = Infinity;
    for (const [ax, ay, bx, by] of segs) {
      const ex = bx - ax; const ey = by - ay;
      const l2 = ex * ex + ey * ey;
      let u = l2 > 0 ? ((x - ax) * ex + (y - ay) * ey) / l2 : 0;
      u = Math.min(1, Math.max(0, u));
      best = Math.min(best, Math.hypot(ax + ex * u - x, ay + ey * u - y));
    }
    return best;
  };
  let worst = 0;
  for (const f of t.faces) {
    if (f.hole) continue;
    for (let i = 0; i < f.pts.length; i += 2) worst = Math.max(worst, dist(f.pts[i], f.pts[i + 1]));
  }
  ok(worst < 1e-9, `fill edges on outline: worst vertex distance ${worst}`);
}

console.log(fails === 0 ? "ALL PASS" : `${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
