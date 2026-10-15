// K90 stage 1a: the over-tight fold census (docs/design/K90.md).
//
// How many over-tight folds does the knot show, where, and what holds them?
// A sample is over-tight where the RENDERED centerline turns tighter than
// the ribbon's half-width: src/geometry/bend_radius.ts, the one definition
// that K8's renderer shares. The centerline is the renderer's own
// (ribbon_renderer.ts: sample counts fixed from the initial arc, the
// centripetal Catmull-Rom resampling, fused bridge tips tucked), without
// flow. Every window of samples below BEND_FLOOR_RATIO (1.15 half-widths,
// the physics floor's target) is classified:
//   class  "floor":  the PARTICLE polyline within 1.5 ctrl is itself under
//                    the floor's target (applyTurnRadiusFloor lost to a
//                    later pass);
//          "spline": the particles honor the floor and the spline still
//                    turns tighter (Layer-2 overshoot).
//   holder what sits within reach, in this priority: grab (within 1 world
//          of the grabbed particle), jhost / jtip (a fused junction member
//          within 1.5 ctrl: on the host thread, or at the fused bridge's own
//          tip), tip (an unfused open end within 1.5 ctrl), kink (a kink-loop
//          particle within 1 ctrl), crossing (a registered pass within 1.5
//          ctrl), collision (another centerline within 1.3 widths), free.
// States: the fresh settle (frames of 1/60 s until the app's sleep gate
// trips, cap 20 s); then, for heavy jobs, the K41/K63 gesture battery on
// the three smallest kink eyes plus a mid-knot pull, each released into
// its re-sleep (cap 15 s); then the quiescence test's drag sessions
// (radius 1.2, then 2.5), each followed by a re-sleep (cap 20 / 30 s).
// The heavy states run IN SEQUENCE on one knot (long use, not a fresh knot
// per state).
//
// Usage (vite-node; scripts/fold_census.ps1 runs it in parallel):
//   fold_census.ts <srcRoot> <jobs.json> <out.jsonl> [from] [to]
//   jobs.json = [{ id, set, query, heavy? }] (scripts/fold_census.mjs jobs)
// srcRoot is the checkout whose src/ is measured; the fold definition is
// always this checkout's.
import { appendFileSync, readFileSync } from "node:fs";
import {
  BEND_FLOOR_RATIO,
  OVER_TIGHT_RATIO,
  legTurnRadius,
  overTightWindows,
  turnRadii,
} from "../src/geometry/bend_radius.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const [, , srcRoot, jobsPath, outPath, fromArg, toArg] = process.argv;
const src = (p: string): string =>
  "file:///" + `${srcRoot}/src/${p}`.replace(/\\/g, "/");
const { generateLatticeKnotwork } = await import(src("core/lattice_grower.ts"));
const { buildMazePlan, DEFAULT_MAZE_PARAMS } = await import(src("core/maze_plan.ts"));
const { planAnchors } = await import(src("core/shapes.ts"));
const { applyMazePlan, applyMazeCuts } = await import(src("core/maze_apply.ts"));
const { ParticleSystem } = await import(src("physics/particle_system.ts"));
const { parseParams } = await import(src("ui/url_state.ts"));
const { sampleClosedSpline, sampleOpenSpline, splineBend } = await import(
  src("geometry/spline_generator.ts")
);
// The app's sleep gate (K63); older checkouts predate the module.
let gate: Any = null;
try {
  gate = await import(src("physics/sleep_gate.ts"));
} catch {
  gate = null;
}
const QUIET_WINDOW: number = gate ? gate.QUIET_WINDOW : 2.5;
const quiet = (ps: Any): boolean =>
  gate
    ? gate.physicsQuiet(ps)
    : ps.settleComplete &&
      ps.grabbedParticle < 0 &&
      ps.maxMove < 1.5e-2 &&
      ps.ridersPending === 0;

// ------------------------------------------------------------------ scene
// main.ts rebuild(): parse the link, grow the lattice, carve the maze.
function buildScene(q: string): { ps: Any; params: Any } {
  const params: Any = parseParams(q.startsWith("?") ? q : `?${q}`);
  const graph = generateLatticeKnotwork({
    gridSize: params.gridSize,
    weaveDensity: params.weaveDensity,
    turnBias: params.turnBias,
    randSeed: params.seed,
    shape: params.shape,
  });
  if (params.mazeFabric) {
    const plan = buildMazePlan(graph, {
      ...DEFAULT_MAZE_PARAMS,
      branchDensity: params.branchDensity,
      fourWayFraction: params.fourWayFraction,
      deadEndDensity: params.deadEnds ? params.deadEndDensity : 0,
      entranceClearance: params.entranceClearance,
      exitClearance: params.exitClearance,
      junctionSpacing: params.junctionSpacing,
      ...planAnchors(params.shape, params.gridSize, params.startAnchor, params.exitAnchor),
    });
    const hueGroup = applyMazePlan(graph, plan);
    applyMazeCuts(graph, plan, hueGroup);
  }
  return { ps: new ParticleSystem(graph), params };
}
const tuningOf = (params: Any): Any => ({
  temperature: 0,
  slack: params.slack,
  drag: params.drag,
  repulsion: params.repulsion,
  bend: params.bend,
  smooth: params.smooth,
  stiffness: params.stiffness,
  gridAlign: params.gridAlign,
  threadWidth: params.threadWidth,
});

// --------------------------------------------------------- ribbon model
// The renderer's per-chain sampling, fixed at construction (before the
// first step): SAMPLE_SPACING 0.09, MIN_SAMPLES 48, the arc summed
// cyclically even for open chains, and the fused-tip flags (fabric only).
interface Ribbon {
  count: number;
  closed: boolean;
  brk: number;
  tipA: boolean;
  tipB: boolean;
  controls: Float32Array;
  radii: Float64Array;
}
function ribbonModel(ps: Any, fabric: boolean): Ribbon[] {
  const P = ps.positions as Float32Array;
  let fused: Set<number> | null = null;
  if (fabric && ps.fusedJunctions.length > 0) {
    fused = new Set();
    for (const g of ps.fusedJunctions) for (const p of g) fused.add(p);
  }
  return ps.chains.map((chain: number[], i: number): Ribbon => {
    let arc = 0;
    for (let k = 0; k < chain.length; k++) {
      const a = chain[k];
      const b = chain[(k + 1) % chain.length];
      arc += Math.hypot(P[b * 2] - P[a * 2], P[b * 2 + 1] - P[a * 2 + 1]);
    }
    const count = Math.max(48, Math.round(arc / 0.09));
    const brk: number = ps.chainBreakAfter[i];
    const closed = brk < 0;
    return {
      count,
      closed,
      brk,
      tipA: !closed && !!fused && fused.has(chain[0]),
      tipB: !closed && !!fused && fused.has(chain[chain.length - 1]),
      controls: new Float32Array(chain.length * 2),
      radii: new Float64Array(count),
    };
  });
}

// ribbon_renderer.ts tuckFusedTips (positions only): fused bridge tips
// collapse onto the sample 3/4 of a half-width in from the tip.
function tuck(s: Any, atStart: boolean, atEnd: boolean, tw: number): void {
  const total: number = s.totalLength;
  const count: number = s.count;
  const pos = s.positions as Float32Array;
  const trim = Math.min((tw / 2) * 0.75, total * 0.25);
  const arcPer = total / (count - 1);
  const set = (arc: number, from: number, to: number): void => {
    const c = Math.max(0, Math.min(total, arc));
    const f = (c / total) * (count - 1);
    const i0 = Math.max(0, Math.min(count - 2, Math.floor(f)));
    const fr = f - i0;
    const x = pos[i0 * 2] + (pos[i0 * 2 + 2] - pos[i0 * 2]) * fr;
    const y = pos[i0 * 2 + 1] + (pos[i0 * 2 + 3] - pos[i0 * 2 + 1]) * fr;
    for (let k = from; k < to; k++) {
      pos[k * 2] = x;
      pos[k * 2 + 1] = y;
    }
  };
  if (atStart) set(trim, 0, Math.min(count - 1, Math.ceil(trim / arcPer)));
  if (atEnd) {
    const k0 = Math.max(1, count - Math.ceil(trim / arcPer));
    set(total - trim, k0, count);
  }
}

function sampleChain(ps: Any, i: number, rb: Ribbon, tw: number): Any {
  const P = ps.positions as Float32Array;
  const chain: number[] = ps.chains[i];
  const c = rb.controls;
  for (let k = 0; k < chain.length; k++) {
    c[k * 2] = P[chain[k] * 2];
    c[k * 2 + 1] = P[chain[k] * 2 + 1];
  }
  const s = rb.closed
    ? sampleClosedSpline(c, rb.count)
    : sampleOpenSpline(c, rb.count, rb.brk);
  if (!rb.closed && (rb.tipA || rb.tipB)) tuck(s, rb.tipA, rb.tipB, tw);
  return s;
}

// ------------------------------------------------ K90 1b: variants
// K90_VARIANTS (env, comma-separated) re-samples the SAME live state other
// ways in the rest and gesture-end summaries (`v` in each), so a variant's
// counts compare to the base on identical particles:
//   on:<ratio>:<maxShift>  the bend bound on (splineBend, spline_generator);
//   sub<N>                 the spline's fine polyline at N subdivisions per
//                          control segment instead of 12, the same count;
//   dense<N>x<M>           N subdivisions and M x the sample count: the
//                          curve's own curvature, nearly free of resampling.
interface Variant {
  name: string;
  kind: "on" | "sub";
  ratio: number;
  maxShift: number;
  sub: number;
  mult: number;
}
const VARIANTS: Variant[] = (process.env.K90_VARIANTS ?? "")
  .split(",")
  .map((t) => t.trim())
  .filter((t) => t.length > 0)
  .map((t): Variant => {
    const on = /^on:([\d.]+):([\d.]+)$/.exec(t);
    if (on) {
      return { name: t, kind: "on", ratio: +on[1], maxShift: +on[2], sub: 12, mult: 1 };
    }
    const sub = /^sub(\d+)$/.exec(t);
    if (sub) return { name: t, kind: "sub", ratio: 0, maxShift: 0, sub: +sub[1], mult: 1 };
    const dense = /^dense(\d+)x(\d+)$/.exec(t);
    if (dense) {
      return { name: t, kind: "sub", ratio: 0, maxShift: 0, sub: +dense[1], mult: +dense[2] };
    }
    throw new Error(`K90_VARIANTS: unknown variant ${t}`);
  });

// spline_generator.ts's evalSegment, sampleClosedSpline and
// sampleOpenSpline (positions and arc tables only), with the subdivision
// count a parameter.
function evalSeg(c: ArrayLike<number>, i0: number, i1: number, i2: number, i3: number, u: number, out: number[]): void {
  const E = 1e-6;
  const p0x = c[i0], p0y = c[i0 + 1];
  const p1x = c[i1], p1y = c[i1 + 1];
  const p2x = c[i2], p2y = c[i2 + 1];
  const p3x = c[i3], p3y = c[i3 + 1];
  const t1 = Math.sqrt(Math.max(Math.hypot(p1x - p0x, p1y - p0y), E));
  const t2 = t1 + Math.sqrt(Math.max(Math.hypot(p2x - p1x, p2y - p1y), E));
  const t3 = t2 + Math.sqrt(Math.max(Math.hypot(p3x - p2x, p3y - p2y), E));
  const t = t1 + (t2 - t1) * u;
  const w01 = t / t1;
  const a1x = p0x + (p1x - p0x) * w01, a1y = p0y + (p1y - p0y) * w01;
  const w12 = (t - t1) / (t2 - t1);
  const a2x = p1x + (p2x - p1x) * w12, a2y = p1y + (p2y - p1y) * w12;
  const w23 = (t - t2) / (t3 - t2);
  const a3x = p2x + (p3x - p2x) * w23, a3y = p2y + (p3y - p2y) * w23;
  const w02 = t / t2;
  const b1x = a1x + (a2x - a1x) * w02, b1y = a1y + (a2y - a1y) * w02;
  const w13 = (t - t1) / (t3 - t1);
  const b2x = a2x + (a3x - a2x) * w13, b2y = a2y + (a3y - a2y) * w13;
  out[0] = b1x + (b2x - b1x) * w12;
  out[1] = b1y + (b2y - b1y) * w12;
}
function sampleSub(c: ArrayLike<number>, count: number, closed: boolean, brk: number, SUB: number): Any {
  const n = c.length / 2;
  const segCount = closed ? n : n - 1;
  const off = brk + 1;
  const slot = (r: number): number => (closed ? ((r % n) + n) % n : (((off + r) % n) + n) % n);
  const fineCount = closed ? n * SUB : segCount * SUB + 1;
  const fine = new Float64Array(fineCount * 2);
  const pt = [0, 0];
  for (let r = 0; r < segCount; r++) {
    const i0 = (closed ? slot(r - 1) : slot(Math.max(0, r - 1))) * 2;
    const i1 = slot(r) * 2;
    const i2 = slot(r + 1) * 2;
    const i3 = (closed ? slot(r + 2) : slot(Math.min(segCount, r + 2))) * 2;
    for (let s = 0; s < SUB; s++) {
      evalSeg(c, i0, i1, i2, i3, s / SUB, pt);
      fine[(r * SUB + s) * 2] = pt[0];
      fine[(r * SUB + s) * 2 + 1] = pt[1];
    }
  }
  if (!closed) {
    const last = slot(n - 1) * 2;
    fine[(fineCount - 1) * 2] = c[last];
    fine[(fineCount - 1) * 2 + 1] = c[last + 1];
  }
  const cum = new Float64Array(fineCount + 1);
  const legs = closed ? fineCount : fineCount - 1;
  for (let f = 0; f < legs; f++) {
    const g = (f + 1) % fineCount;
    cum[f + 1] = cum[f] + Math.hypot(fine[g * 2] - fine[f * 2], fine[g * 2 + 1] - fine[f * 2 + 1]);
  }
  const total = cum[legs];
  const controlArcLengths: number[] = new Array(n).fill(0);
  for (let r = 0; r < n; r++) {
    controlArcLengths[slot(r)] = closed ? cum[r * SUB] : cum[Math.min(fineCount - 1, r * SUB)];
  }
  const positions = new Float32Array(count * 2);
  let cursor = 0;
  for (let k = 0; k < count; k++) {
    const target = closed ? (k / count) * total : (k / (count - 1)) * total;
    while (cursor < legs - 1 && cum[cursor + 1] < target) cursor++;
    const segLen = cum[cursor + 1] - cum[cursor];
    const frac = segLen > 1e-6 ? (target - cum[cursor]) / segLen : 0;
    const a = cursor * 2;
    const b = ((cursor + 1) % fineCount) * 2;
    positions[k * 2] = fine[a] + (fine[b] - fine[a]) * frac;
    positions[k * 2 + 1] = fine[a + 1] + (fine[b + 1] - fine[a + 1]) * frac;
  }
  return { count, positions, totalLength: total, controlArcLengths, closed };
}
function sampleChainSub(ps: Any, i: number, rb: Ribbon, tw: number, sub: number, mult: number): Any {
  const P = ps.positions as Float32Array;
  const chain: number[] = ps.chains[i];
  const c = rb.controls;
  for (let k = 0; k < chain.length; k++) {
    c[k * 2] = P[chain[k] * 2];
    c[k * 2 + 1] = P[chain[k] * 2 + 1];
  }
  const s = sampleSub(c, rb.count * mult, rb.closed, rb.brk, sub);
  if (!rb.closed && (rb.tipA || rb.tipB)) tuck(s, rb.tipA, rb.tipB, tw);
  return s;
}

// A sample's arc -> fractional ctrl (slot units) through the spline's
// control arc table, in traversal order.
function arcToCtrl(s: Any, len: number, brk: number, arc: number): number {
  const cal: number[] = s.controlArcLengths;
  const total: number = s.totalLength;
  for (let t = 0; t < len; t++) {
    const slot = brk < 0 ? t : (brk + 1 + t) % len;
    if (brk >= 0 && t === len - 1) return slot;
    const a0 = cal[slot];
    const a1 = brk < 0 && t === len - 1 ? total : cal[(slot + 1) % len];
    if (arc <= a1 || t === len - 1) {
      const fr = a1 > a0 ? Math.max(0, Math.min(1, (arc - a0) / (a1 - a0))) : 0;
      return (slot + fr) % len;
    }
  }
  return 0;
}

const segDist = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number => {
  const ex = bx - ax;
  const ey = by - ay;
  const l2 = ex * ex + ey * ey;
  let t = l2 > 1e-12 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const dx = ax + ex * t - px;
  const dy = ay + ey * t - py;
  return Math.sqrt(dx * dx + dy * dy);
};

// ---------------------------------------------------------------- census
const FEATURE_CAP = 300;
// K90 1b: "web" = a window whose tightest sample lies within WEB_COVER
// half-widths of a fused junction's center, where the junction web draws
// over the ribbon (calibrated on page crops, docs/design/K90_bend_radius.md).
// The holder it would have had stays in `h0`.
const HOLDERS = ["grab", "web", "jhost", "jtip", "tip", "kink", "crossing", "collision", "free"];
const WEB_COVER = Number(process.env.K90_WEB_COVER ?? "1.5");
const WEB_STEPS = [0.92, 1.5, 2.5];

interface Scan {
  t: number;
  n1: number;
  n115: number;
  w1: number;
  w115: number;
  min: number;
  samples: number;
  wq: number[]; // windows by depth: min ratio < 0.5, < 0.75, < 1.0, < 1.15
  wins: Any[];
}

class Census {
  ps: Any;
  tw: number;
  rbs: Ribbon[];
  fusedSlots: number[][];
  ctr: number[] = [];
  constructor(ps: Any, fabric: boolean, tw: number) {
    this.ps = ps;
    this.tw = tw;
    this.rbs = ribbonModel(ps, fabric);
    const fused = new Set<number>();
    for (const g of ps.fusedJunctions) for (const p of g) fused.add(p);
    this.fusedSlots = ps.chains.map((ch: number[]) => {
      const out: number[] = [];
      ch.forEach((p, k) => {
        if (fused.has(p)) out.push(k);
      });
      return out;
    });
  }

  // The live centers of the fused junctions (the renderer's apex is the
  // mean of its arms' samples at the joint, which the spline interpolates:
  // the particles' mean).
  centers(): number[] {
    const P = this.ps.positions as Float32Array;
    const out: number[] = [];
    for (const g of this.ps.fusedJunctions as number[][]) {
      let x = 0;
      let y = 0;
      for (const p of g) {
        x += P[p * 2];
        y += P[p * 2 + 1];
      }
      out.push(x / g.length, y / g.length);
    }
    return out;
  }

  // A scan and its summary, plus every K90_VARIANTS variant re-sampled
  // from the same particles (`v`).
  rest(detail: number): Record<string, unknown> {
    const base = this.summary(this.scan(), detail);
    if (VARIANTS.length === 0) return base;
    const v: Record<string, unknown> = {};
    for (const vr of VARIANTS) {
      const sb = splineBend;
      const saved = sb ? { ...sb } : null;
      if (vr.kind === "on") {
        if (!sb) {
          v[vr.name] = null;
          continue;
        }
        sb.enabled = true;
        sb.ratio = vr.ratio;
        sb.maxShift = vr.maxShift;
        sb.halfWidth = this.tw / 2;
        sb.moved = 0;
        sb.shiftMax = 0;
        sb.runs = 0;
        sb.skipped = 0;
      }
      const sc = this.scan(vr);
      const sum = this.summary(sc, 0);
      delete sum.top;
      delete sum.fj;
      if (vr.kind === "on") {
        sum.bend = {
          moved: sb.moved,
          shiftMax: +(sb.shiftMax / (this.tw / 2)).toFixed(4),
          runs: sb.runs,
          skipped: sb.skipped,
        };
        Object.assign(sb, saved);
      }
      v[vr.name] = sum;
    }
    base.v = v;
    return base;
  }

  // Counts and raw windows for the current state.
  scan(vr: Variant | null = null): Scan {
    const ps = this.ps;
    const h = this.tw / 2;
    const out: Scan = {
      t: ps.simTime,
      n1: 0,
      n115: 0,
      w1: 0,
      w115: 0,
      min: Infinity,
      samples: 0,
      wq: [0, 0, 0, 0],
      wins: [],
    };
    ps.chains.forEach((_: number[], i: number) => {
      const rb = this.rbs[i];
      const s =
        vr && vr.kind === "sub"
          ? sampleChainSub(ps, i, rb, this.tw, vr.sub, vr.mult)
          : sampleChain(ps, i, rb, this.tw);
      const r = turnRadii(s.positions, s.count, rb.closed, rb.radii);
      out.samples += s.count;
      for (let k = 0; k < s.count; k++) {
        const q = r[k] / h;
        if (q < out.min) out.min = q;
        if (q < OVER_TIGHT_RATIO) out.n1++;
        if (q < BEND_FLOOR_RATIO) out.n115++;
      }
      out.w1 += overTightWindows(s.positions, s.count, rb.closed, h, OVER_TIGHT_RATIO, rb.radii).length;
      for (const w of overTightWindows(s.positions, s.count, rb.closed, h, BEND_FLOOR_RATIO, rb.radii)) {
        out.w115++;
        out.wq[w.minRatio < 0.5 ? 0 : w.minRatio < 0.75 ? 1 : w.minRatio < 1 ? 2 : 3]++;
        out.wins.push({ chain: i, w, s });
      }
    });
    return out;
  }

  // What holds one window (see the header).
  features(e: Any): Record<string, Any> {
    const ps = this.ps;
    const tw = this.tw;
    const h = tw / 2;
    const P = ps.positions as Float32Array;
    const i: number = e.chain;
    const w = e.w;
    const s = e.s;
    const chain: number[] = ps.chains[i];
    const len = chain.length;
    const rb = this.rbs[i];
    const closed = rb.closed;
    const brk = rb.brk;
    const total: number = s.totalLength;
    const k: number = w.minIndex;
    const x = s.positions[k * 2];
    const y = s.positions[k * 2 + 1];
    const spacing = closed ? total / s.count : total / (s.count - 1);
    const f = arcToCtrl(s, len, brk, k * spacing);
    const trav = (g: number): number =>
      closed ? g : (((g - (brk + 1)) % len) + len) % len;
    const cd = (a: number, b: number): number => {
      if (closed) {
        const d = Math.abs(a - b) % len;
        return Math.min(d, len - d);
      }
      return Math.abs(trav(a) - trav(b));
    };
    const slotAt = (j: number): number => ((j % len) + len) % len;
    // The particle polyline's tightest turn within 1.5 ctrl (open tips have
    // one leg; the floor skips them too).
    let poly = Infinity;
    for (let j = Math.floor(f) - 2; j <= Math.ceil(f) + 2; j++) {
      const sj = slotAt(j);
      if (cd(f, sj) > 1.5) continue;
      if (!closed && (sj === (brk + 1) % len || sj === brk)) continue;
      const pa = chain[slotAt(sj - 1)];
      const pc = chain[sj];
      const pn = chain[slotAt(sj + 1)];
      const r = legTurnRadius(
        P[pc * 2] - P[pa * 2],
        P[pc * 2 + 1] - P[pa * 2 + 1],
        P[pn * 2] - P[pc * 2],
        P[pn * 2 + 1] - P[pc * 2 + 1]
      );
      if (r / h < poly) poly = r / h;
    }
    // A kink loop's particles within 1 ctrl.
    const kinkOf = ps.kinkLoopOf as Int32Array;
    let kink = -1;
    for (let j = Math.floor(f) - 1; j <= Math.ceil(f) + 1; j++) {
      const sj = slotAt(j);
      if (cd(f, sj) <= 1 && kinkOf && kinkOf[chain[sj]] >= 0) kink = kinkOf[chain[sj]];
    }
    // The nearest registered pass on this chain.
    let xd = Infinity;
    let xi = -1;
    let xSelf = false;
    let xLag = 0;
    let xInt = false;
    ps.crossings.forEach((c: Any, ci: number) => {
      for (const pass of [c.over, c.under]) {
        if (pass.chain !== i) continue;
        const d = cd(f, pass.ctrl);
        if (d < xd) {
          xd = d;
          xi = ci;
          xSelf = c.over.chain === c.under.chain;
          xLag = pass.clampLag ?? 0;
          xInt = !!pass.intersected;
        }
      }
    });
    // The nearest other centerline (another chain, or this one beyond 3
    // ctrl), particle segments, open seams skipped.
    let fd = Infinity;
    ps.chains.forEach((ch: number[], c2: number) => {
      const L = ch.length;
      const b2: number = ps.chainBreakAfter[c2];
      for (let m = 0; m < L; m++) {
        if (m === b2) continue;
        const m2 = (m + 1) % L;
        if (c2 === i && (cd(f, m) <= 3 || cd(f, m2) <= 3)) continue;
        const a = ch[m];
        const b = ch[m2];
        const ax = P[a * 2];
        const ay = P[a * 2 + 1];
        if (Math.abs(ax - x) > fd + 2 || Math.abs(ay - y) > fd + 2) continue;
        const d = segDist(x, y, ax, ay, P[b * 2], P[b * 2 + 1]);
        if (d < fd) fd = d;
      }
    });
    fd /= tw;
    // Fused junction members and open ends on this chain.
    let jd = Infinity;
    for (const sl of this.fusedSlots[i]) jd = Math.min(jd, cd(f, sl));
    let td = Infinity;
    let tipAnchored = false;
    if (!closed) {
      const u = trav(f);
      const atStart = u <= len - 1 - u;
      td = Math.min(u, len - 1 - u);
      tipAnchored = ps.isAnchored(chain[atStart ? (brk + 1) % len : brk]);
    }
    const gp: number = ps.grabbedParticle;
    const gd = gp >= 0 ? Math.hypot(x - P[gp * 2], y - P[gp * 2 + 1]) : Infinity;
    // The nearest fused junction center, in half-widths.
    let jw = Infinity;
    const ctr = this.ctr;
    for (let m = 0; m < ctr.length; m += 2) {
      const d = Math.hypot(x - ctr[m], y - ctr[m + 1]);
      if (d < jw) jw = d;
    }
    jw /= h;
    const holder0 =
      gd <= 1
        ? "grab"
        : jd <= 1.5
          ? td <= 1.5
            ? "jtip"
            : "jhost"
          : td <= 1.5
            ? "tip"
            : kink >= 0
              ? "kink"
              : xd <= 1.5
                ? "crossing"
                : fd < 1.3
                  ? "collision"
                  : "free";
    const holder = holder0 !== "grab" && jw <= WEB_COVER ? "web" : holder0;
    const r3 = (v: number): number | null => (Number.isFinite(v) ? +v.toFixed(3) : null);
    return {
      c: i,
      k,
      r: r3(w.minRatio),
      n: w.length,
      arc: r3(w.length * spacing),
      x: r3(x),
      y: r3(y),
      f: r3(f),
      poly: r3(poly),
      cls: poly >= BEND_FLOOR_RATIO ? "spline" : "floor",
      holder,
      h0: holder0,
      jw: r3(jw),
      kink,
      xd: r3(xd),
      xi,
      xSelf,
      xLag: r3(xLag),
      xInt,
      fd: r3(fd),
      jd: r3(jd),
      td: r3(td),
      tipAnchored,
      gd: r3(gd),
    };
  }

  // A scan with its windows attributed: class x holder tables for every
  // window below 1.15 and for those reaching below 1.0 (the worst
  // FEATURE_CAP windows), and the `detail` worst in full.
  summary(sc: Scan, detail: number): Record<string, unknown> {
    sc.wins.sort((a: Any, b: Any) => a.w.minRatio - b.w.minRatio);
    this.ctr = this.centers();
    const feats = sc.wins.slice(0, FEATURE_CAP).map((e: Any) => this.features(e));
    const table = (): Record<string, Record<string, number>> => ({
      floor: Object.fromEntries(HOLDERS.map((k) => [k, 0])),
      spline: Object.fromEntries(HOLDERS.map((k) => [k, 0])),
    });
    const agg115 = table();
    const agg1 = table();
    // Windows within each WEB_STEPS reach of a junction center (any
    // holder but grab), below 1.0 and below 1.15; and per featured window
    // [r, original holder, jw] to re-count at another reach.
    const web1 = WEB_STEPS.map(() => 0);
    const web115 = WEB_STEPS.map(() => 0);
    const fj: Array<[number | null, string, number | null]> = [];
    for (const d of feats) {
      agg115[d.cls][d.holder]++;
      const under1 = d.r !== null && d.r < OVER_TIGHT_RATIO;
      if (under1) agg1[d.cls][d.holder]++;
      WEB_STEPS.forEach((st, q) => {
        if (d.h0 !== "grab" && d.jw !== null && d.jw <= st) {
          web115[q]++;
          if (under1) web1[q]++;
        }
      });
      fj.push([d.r, d.h0, d.jw]);
    }
    return {
      web1,
      web115,
      fj,
      t: +sc.t.toFixed(3),
      n1: sc.n1,
      n115: sc.n115,
      w1: sc.w1,
      w115: sc.w115,
      wq: sc.wq,
      min: Number.isFinite(sc.min) ? +sc.min.toFixed(3) : null,
      samples: sc.samples,
      riders: this.ps.ridersPending,
      featured: feats.length,
      agg1,
      agg115,
      top: feats.slice(0, detail),
    };
  }
}

const worse = (a: Scan | null, b: Scan): boolean =>
  !a ||
  b.n1 > a.n1 ||
  (b.n1 === a.n1 && (b.n115 > a.n115 || (b.n115 === a.n115 && b.min < a.min)));
const compact = (sc: Scan): number[] => [
  +sc.t.toFixed(2),
  sc.n1,
  sc.n115,
  sc.w1,
  sc.w115,
  Number.isFinite(sc.min) ? +sc.min.toFixed(3) : -1,
];

// The worst state seen by a run of censuses, attributed when it is seen
// (attribution reads the live state: grab, passes, positions).
class Worst {
  scan: Scan | null = null;
  sum: Record<string, unknown> | null = null;
  constructor(private census: Census, private detail: number) {}
  see(): Scan {
    const sc = this.census.scan();
    if (worse(this.scan, sc)) {
      this.scan = sc;
      this.sum = this.census.summary(sc, this.detail);
    }
    return sc;
  }
}

// ------------------------------------------------------------ kink eyes
// The K41 kink census (.claude/probes/K41 harness): each kink's eye, as
// 2 x (largest circle inside the loop's centerline - half width), in
// thread widths, keyed by crossing index.
const inPoly = (poly: number[], x: number, y: number): boolean => {
  let inside = false;
  const n = poly.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i * 2];
    const yi = poly[i * 2 + 1];
    const xj = poly[j * 2];
    const yj = poly[j * 2 + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
function inscribed(poly: number[], dist: (x: number, y: number) => number): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < poly.length; i += 2) {
    minX = Math.min(minX, poly[i]);
    maxX = Math.max(maxX, poly[i]);
    minY = Math.min(minY, poly[i + 1]);
    maxY = Math.max(maxY, poly[i + 1]);
  }
  let best = 0;
  let bx = 0;
  let by = 0;
  const step = Math.max(0.01, Math.max(maxX - minX, maxY - minY) / 70);
  for (let x = minX; x <= maxX; x += step) {
    for (let y = minY; y <= maxY; y += step) {
      if (!inPoly(poly, x, y)) continue;
      const d = dist(x, y);
      if (d > best) {
        best = d;
        bx = x;
        by = y;
      }
    }
  }
  let s = step / 2;
  for (let it = 0; it < 10; it++) {
    let improved = false;
    for (const [ox, oy] of [[s, 0], [-s, 0], [0, s], [0, -s], [s, s], [-s, -s], [s, -s], [-s, s]]) {
      const x = bx + ox;
      const y = by + oy;
      if (!inPoly(poly, x, y)) continue;
      const d = dist(x, y);
      if (d > best) {
        best = d;
        bx = x;
        by = y;
        improved = true;
      }
    }
    if (!improved) s /= 2;
  }
  return best;
}
function crPoint(ps: Any, chainIdx: number, f: number, out: number[]): void {
  const chain: number[] = ps.chains[chainIdx];
  const len = chain.length;
  const brk: number = ps.chainBreakAfter[chainIdx];
  const P = ps.positions as Float32Array;
  const i = Math.floor(f);
  const u = f - i;
  const slot = (k: number): number => {
    let s = ((k % len) + len) % len;
    if (brk >= 0) {
      const off = brk + 1;
      const r = (((k - off) % len) + len) % len;
      const rr = Math.max(0, Math.min(len - 1, r));
      s = (rr + off) % len;
    }
    return chain[s];
  };
  const p0 = slot(i - 1);
  const p1 = slot(i);
  const p2 = slot(i + 1);
  const p3 = slot(i + 2);
  const E = 1e-6;
  const p0x = P[p0 * 2], p0y = P[p0 * 2 + 1];
  const p1x = P[p1 * 2], p1y = P[p1 * 2 + 1];
  const p2x = P[p2 * 2], p2y = P[p2 * 2 + 1];
  const p3x = P[p3 * 2], p3y = P[p3 * 2 + 1];
  const d01 = Math.max(Math.hypot(p1x - p0x, p1y - p0y), E);
  const d12 = Math.max(Math.hypot(p2x - p1x, p2y - p1y), E);
  const d23 = Math.max(Math.hypot(p3x - p2x, p3y - p2y), E);
  const t1 = Math.sqrt(d01);
  const t2 = t1 + Math.sqrt(d12);
  const t3 = t2 + Math.sqrt(d23);
  const t = t1 + (t2 - t1) * u;
  const w01 = t / t1;
  const a1x = p0x + (p1x - p0x) * w01, a1y = p0y + (p1y - p0y) * w01;
  const w12 = (t - t1) / (t2 - t1);
  const a2x = p1x + (p2x - p1x) * w12, a2y = p1y + (p2y - p1y) * w12;
  const w23 = (t - t2) / (t3 - t2);
  const a3x = p2x + (p3x - p2x) * w23, a3y = p2y + (p3y - p2y) * w23;
  const w02 = t / t2;
  const b1x = a1x + (a2x - a1x) * w02, b1y = a1y + (a2y - a1y) * w02;
  const w13 = (t - t1) / (t3 - t1);
  const b2x = a2x + (a3x - a2x) * w13, b2y = a2y + (a3y - a2y) * w13;
  out[0] = b1x + (b2x - b1x) * w12;
  out[1] = b1y + (b2y - b1y) * w12;
}
function kinkHoles(ps: Any, tw: number): Map<number, number> {
  const half = tw / 2;
  const out = new Map<number, number>();
  const pt = [0, 0];
  const P = ps.positions as Float32Array;
  ps.crossings.forEach((c: Any, ci: number) => {
    if (c.over.chain !== c.under.chain) return;
    const nb = ps.passNeighbors(c.over);
    const fwd = nb.next === c.under && nb.next !== c.over;
    const bwd = nb.prev === c.under && nb.prev !== c.over;
    if (!fwd && !bwd) return;
    const chainIdx = c.over.chain;
    const len = ps.chains[chainIdx].length;
    const cyc = (d: number): number => ((d % len) + len) % len;
    const sF = cyc(c.under.ctrl - c.over.ctrl);
    const sB = cyc(c.over.ctrl - c.under.ctrl);
    const useF = fwd && (!bwd || sF <= sB);
    const a: number = (useF ? c.over : c.under).ctrl;
    const span = useF ? sF : sB;
    const loop: number[] = [];
    const n = Math.max(16, Math.ceil(span / 0.08));
    for (let m = 0; m <= n; m++) {
      crPoint(ps, chainIdx, cyc(a + (span * m) / n), pt);
      loop.push(pt[0], pt[1]);
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < loop.length; i += 2) {
      minX = Math.min(minX, loop[i]);
      maxX = Math.max(maxX, loop[i]);
      minY = Math.min(minY, loop[i + 1]);
      maxY = Math.max(maxY, loop[i + 1]);
    }
    const near: number[] = [];
    const pad = 1.0;
    ps.chains.forEach((ch: number[], chIdx: number) => {
      const L = ch.length;
      const brk: number = ps.chainBreakAfter[chIdx];
      for (let k = 0; k < L; k++) {
        if (k === brk) continue;
        const p = ch[k];
        const x = P[p * 2];
        const y = P[p * 2 + 1];
        if (x < minX - pad - 1 || x > maxX + pad + 1 || y < minY - pad - 1 || y > maxY + pad + 1) continue;
        let px = 0;
        let py = 0;
        for (let s = 0; s <= 4; s++) {
          crPoint(ps, chIdx, k + s / 4, pt);
          if (s > 0) near.push(px, py, pt[0], pt[1]);
          px = pt[0];
          py = pt[1];
        }
      }
    });
    const allDist = (x: number, y: number): number => {
      let best = Infinity;
      for (let i = 0; i < near.length; i += 4) {
        const d = segDist(x, y, near[i], near[i + 1], near[i + 2], near[i + 3]);
        if (d < best) best = d;
      }
      return best;
    };
    const rAll = inscribed(loop, allDist);
    out.set(ci, (2 * (rAll - half)) / tw);
  });
  return out;
}
function holeSummary(holes: Map<number, number>): Record<string, number> | null {
  const hv = [...holes.values()].sort((x, y) => x - y);
  return hv.length
    ? {
        n: hv.length,
        min: +hv[0].toFixed(3),
        p50: +hv[Math.floor(hv.length / 2)].toFixed(3),
        below08: hv.filter((x) => x < 0.8).length,
      }
    : null;
}

// K41 gesture geometry (.claude/probes/K41/b/gestures.mjs): the kink's
// crossing point, loop apex, the tail point 0.7 world past the crossing
// along the END pass, and the tail's unit direction.
function kinkGeo(ps: Any, ci: number): Record<string, number> {
  const c = ps.crossings[ci];
  const len = ps.chains[c.over.chain].length;
  const cyc = (d: number): number => ((d % len) + len) % len;
  const nb = ps.passNeighbors(c.over);
  const fwd = nb.next === c.under;
  const S = fwd ? c.over : c.under;
  const E = fwd ? c.under : c.over;
  const span = cyc(E.ctrl - S.ctrl);
  const pt = new Float32Array(4);
  ps.bindingPoint(S, pt, 0);
  const cx = pt[0];
  const cy = pt[1];
  let best = 0;
  let ax = cx;
  let ay = cy;
  for (let f = S.ctrl; f <= S.ctrl + span; f += 0.25) {
    ps.pointOnChain(S.chain, cyc(f), pt, 0);
    const d = Math.hypot(pt[0] - cx, pt[1] - cy);
    if (d > best) {
      best = d;
      ax = pt[0];
      ay = pt[1];
    }
  }
  let arc = 0;
  ps.pointOnChain(E.chain, E.ctrl, pt, 0);
  let px = pt[0];
  let py = pt[1];
  let f = E.ctrl;
  while (arc < 0.7 && f < E.ctrl + 6) {
    f += 0.1;
    ps.pointOnChain(E.chain, cyc(f), pt, 0);
    arc += Math.hypot(pt[0] - px, pt[1] - py);
    px = pt[0];
    py = pt[1];
  }
  const tl = Math.hypot(px - cx, py - cy) || 1;
  return { cx, cy, ax, ay, tailX: px, tailY: py, tdx: (px - cx) / tl, tdy: (py - cy) / tl };
}

// ------------------------------------------------------------------ jobs
interface Job {
  id: string;
  set: string;
  query: string;
  heavy?: boolean;
}
const jobs: Job[] = JSON.parse(readFileSync(jobsPath, "utf-8"));
const from = Number(fromArg ?? 0);
const to = Math.min(jobs.length, Number(toArg ?? jobs.length));
const FRAME = 1 / 60;
const CENSUS_FRAMES = 15; // a census every 0.25 sim-s
const CHECKPOINTS = new Map([[30, "0.5"], [60, "1"], [120, "2"], [180, "3"], [300, "5"], [480, "8"]]);

for (let ji = from; ji < to; ji++) {
  const job = jobs[ji];
  const wall0 = Date.now();
  const { ps, params } = buildScene(job.query);
  const tw: number = params.threadWidth;
  const tuning = tuningOf(params);
  const census = new Census(ps, !!params.mazeFabric, tw);
  const row: Record<string, unknown> = {
    id: job.id,
    set: job.set,
    query: job.query,
    tw,
    fabric: !!params.mazeFabric,
    particles: ps.particleCount,
    chains: ps.chains.length,
    crossings: ps.crossings.length,
    variants: VARIANTS.map((v) => v.name),
    webCover: WEB_COVER,
  };

  // Steps 1/60 frames until the sleep gate trips (or `cap` sim-s), calling
  // `each` after every census frame. Returns the sim-s it took to sleep.
  const settle = (cap: number, each: (frame: number) => void): number | null => {
    const t0: number = ps.simTime;
    let still = 0;
    let frame = 0;
    while (ps.simTime < t0 + cap - 1e-9) {
      const before: number = ps.simTime;
      ps.step(FRAME, tuning);
      frame++;
      const q = quiet(ps);
      still = q ? still + (ps.simTime - before) : 0;
      if (frame % CENSUS_FRAMES === 0) each(frame);
      if (still >= QUIET_WINDOW - 1e-9) return +(ps.simTime - t0).toFixed(3);
    }
    return null;
  };

  // 1. The fresh settle.
  {
    const series: number[][] = [];
    const cps: Record<string, unknown> = {};
    const worst = new Worst(census, 40);
    const sleepT = settle(20, (frame) => {
      const sc = worst.see();
      series.push(compact(sc));
      const cp = CHECKPOINTS.get(frame);
      if (cp) cps[cp] = census.summary(sc, 10);
    });
    const holes = kinkHoles(ps, tw);
    row.fresh = {
      sleepT,
      series,
      cps,
      worst: worst.sum,
      rest: census.rest(40),
      holes: holeSummary(holes),
    };
    row.samples = census.scan().samples;
    if (!job.heavy) {
      row.wallS = (Date.now() - wall0) / 1000;
      appendFileSync(outPath, JSON.stringify(row) + "\n");
      console.log(`${job.id} done in ${row.wallS}s`);
      continue;
    }

    // 2. The gesture battery.
    const targets = [...holes].sort((a, b) => a[1] - b[1]).slice(0, 3).map((e) => e[0]);
    const gestures: Record<string, unknown>[] = [];
    const gesture = (label: string, x0: number, y0: number, dx: number, dy: number, moveS: number, holdS: number): void => {
      const p = ps.grab(x0, y0, 0.7);
      if (p < 0) {
        gestures.push({ label, grabbed: false });
        return;
      }
      const held = new Worst(census, 10);
      let frame = 0;
      const tick = (): void => {
        ps.step(FRAME, tuning);
        if (++frame % CENSUS_FRAMES === 0) held.see();
      };
      const moves = Math.max(1, Math.round(moveS / 0.1));
      for (let i = 1; i <= moves; i++) {
        ps.dragTo(x0 + (dx * i) / moves, y0 + (dy * i) / moves);
        for (let s = 0; s < 6; s++) tick();
      }
      const holdFrames = Math.round(holdS / FRAME);
      for (let s = 0; s < holdFrames; s++) tick();
      const end = census.rest(10);
      ps.release();
      const free = new Worst(census, 10);
      const resleep = settle(15, () => free.see());
      gestures.push({
        label,
        grabbed: true,
        held: held.sum,
        end,
        free: free.sum,
        rest: census.rest(10),
        resleep,
      });
    };
    row.targets = targets;
    for (const ci of targets) {
      let g = kinkGeo(ps, ci);
      let ox = g.ax - g.cx;
      let oy = g.ay - g.cy;
      let ol = Math.hypot(ox, oy) || 1;
      gesture(`X${ci}_hold`, g.ax, g.ay, (ox / ol) * 0.15, (oy / ol) * 0.15, 0.3, 6);
      g = kinkGeo(ps, ci);
      ox = g.ax - g.cx;
      oy = g.ay - g.cy;
      ol = Math.hypot(ox, oy) || 1;
      gesture(`X${ci}_pull`, g.ax, g.ay, (ox / ol) * 0.5, (oy / ol) * 0.5, 0.8, 3);
      g = kinkGeo(ps, ci);
      gesture(`X${ci}_cinch`, g.tailX, g.tailY, g.tdx * 1.2, g.tdy * 1.2, 1.0, 1);
    }
    {
      let cx = 0;
      let cy = 0;
      const n: number = ps.particleCount;
      for (let i = 0; i < n; i++) {
        cx += ps.positions[i * 2];
        cy += ps.positions[i * 2 + 1];
      }
      const p = ps.nearest(cx / n, cy / n, 50);
      gesture("mid_pull", ps.positions[p * 2], ps.positions[p * 2 + 1], 1.0, 0.6, 0.6, 2);
    }
    row.gestures = gestures;
    row.afterGestures = {
      rest: census.rest(40),
      holes: holeSummary(kinkHoles(ps, tw)),
    };

    // 3. The quiescence test's drag sessions (test/quiescence.regression
    // .test.ts dragSession): three grabs dragged in two fast loops at
    // 1/32 s frames, released, 16 free frames each; then a re-sleep.
    const violent: Record<string, unknown>[] = [];
    for (const [radius, cap] of [[1.2, 20], [2.5, 30]]) {
      const held = new Worst(census, 10);
      let frames = 0;
      const tick = (): void => {
        ps.step(1 / 32, tuning);
        if (++frames % 8 === 0) held.see();
      };
      for (const p0 of [40, 400, 800]) {
        const p = Math.min(p0, ps.particleCount - 1);
        const px: number = ps.positions[p * 2];
        const py: number = ps.positions[p * 2 + 1];
        if (ps.grab(px, py, 1.5) < 0) continue;
        for (let i = 0; i < 60; i++) {
          const ang = (i / 60) * Math.PI * 4;
          ps.dragTo(px + Math.cos(ang) * radius, py + Math.sin(ang) * radius * 0.8);
          tick();
        }
        ps.release();
        for (let i = 0; i < 16; i++) tick();
      }
      const free = new Worst(census, 10);
      const sleepT = settle(cap, () => free.see());
      violent.push({
        radius,
        held: held.sum,
        free: free.sum,
        sleepT,
        rest: census.rest(40),
        holes: holeSummary(kinkHoles(ps, tw)),
      });
    }
    row.violent = violent;
  }
  row.wallS = (Date.now() - wall0) / 1000;
  appendFileSync(outPath, JSON.stringify(row) + "\n");
  console.log(`${job.id} done in ${row.wallS}s`);
}
