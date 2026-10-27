// K868 S1a: the scene export's PURE part (docs/design/K868_s1a_scene_export.md,
// deliverable 1). buildFieldScene turns a plain-data snapshot of one frame
// (the renderer's drawn samples, the physics depth, the crossing table, the
// junction groups) into a version-1 FieldScene (./scene.ts). The page side
// (scene_export_hook.ts, window.__knotSceneExport) only gathers the
// snapshot; everything that decides a number is here, so a fixture can pin
// it (test/render/field/scene_export.test.ts).
//
// The rules, each mirroring the code it names:
// - CENTRELINES are renderer.chainSamples[c].positions as drawn this frame,
//   after the fused-tip tuck (ribbon/strip_pass.ts tuck: the samples within
//   trim = min(0.75h, total/4) of a fused end collapse onto the point at
//   trim, exact duplicates). Exact duplicates are dropped, so the export's
//   polyline starts at the tuck point; s is arc length along it.
// - A renderer ARC (sample k sits at k/count * total on a ring, at
//   k/(count - 1) * total on a run) maps to s through the drawn segment it
//   falls on (sampling.ts sampleAt's index math), so a crossing or an arm
//   lands on the drawn polyline exactly where master draws it.
// - A CTRL maps to an arc as the renderer maps it: arcAt on a ring,
//   paintArcAt on a run (sampling.ts). Crossings use the render ctrl
//   (displayF ?? ctrl).
// - Z is the physics zPos, linear in arc between control slots (the slot
//   arcs are the samples' controlArcLengths); a tucked sample takes the
//   depth at its tucked arc. The diagnostics recompute the physics tent
//   (particle_system.ts addDepthTent) and report how far zPos sits from it.
// - A JUNCTION's centre is joinery's (rebuildFillets): the mean over its
//   arms of the drawn point at the slot's arc. Arms sort by the angle from
//   the centre to the drawn point 0.8 ctrl out (joinery's probe), and each
//   corner is master's resolved style for that directed arm pair
//   (cornerWedgeRounded: no candidates = all round, else the K830 set,
//   builder pins first).

import type {
  FieldScene,
  SceneArm,
  SceneCamera,
  SceneChain,
  SceneCorner,
  SceneCrossing,
  SceneDeadEnd,
  SceneJunction,
  SceneLook,
  ScenePoi,
  SceneSource,
  Vec2,
} from "./scene";
import { SCENE_VERSION } from "./scene";
import { cornerWedgeKey } from "../ribbon/corner_share";

/** One chain as the renderer holds it this frame. */
export interface ExportChain {
  closed: boolean;
  /** chainSamples[c]: the samples as drawn (after the tuck). */
  count: number;
  positions: ArrayLike<number>;
  totalLength: number;
  controlArcLengths: ArrayLike<number>;
  /** ps.chains[c]: the particle at each control slot. */
  particles: ArrayLike<number>;
  /** chainTipFused[c]: [start tucked, end tucked]. */
  tucked: [boolean, boolean];
}

export interface ExportPass {
  chain: number;
  /** The physics binding (the tent reads it). */
  ctrl: number;
  /** The render-only true intersection (the renderer draws here). */
  displayF?: number;
}

export interface ExportCrossing {
  over: ExportPass;
  under: ExportPass;
}

export interface ExportArmRef {
  chain: number;
  slot: number;
  dir: 1 | -1;
}

export interface ExportJunction {
  particles: number[];
  arms: ExportArmRef[];
}

export interface ExportTip {
  chain: number;
  atEnd: boolean;
}

export interface SceneExportInput {
  name: string;
  source: SceneSource;
  camera: SceneCamera;
  look: SceneLook;
  chains: ExportChain[];
  /** Physics depth and positions, per particle. */
  zPos: ArrayLike<number>;
  physPositions: ArrayLike<number>;
  /** ps.crossings (registered). */
  crossings: ExportCrossing[];
  /** ps.emergentCrossings the renderer draws (joint pairs already removed). */
  emergent: ExportCrossing[];
  /** Drop an emergent crossing within 0.8 of an accepted one's drawn point
   * (default true). The page hook passes false: it repeats master's own
   * dedupe (physics binding points against diagData) and passes the rest. */
  dedupeEmergent?: boolean;
  /** renderer.junctionArms, by junction index. */
  junctions: ExportJunction[];
  /** The K830 corner state: every candidate wedge and the rounded keys. */
  corners: {
    candidates: ReadonlyArray<{ key: string; pin?: unknown }>;
    rounded: ReadonlySet<string>;
  };
  /** renderer.freeTips (dead ends with a cap). */
  freeTips: ExportTip[];
  /** Open-chain ends neither fused nor free: anchored (no cap drawn). */
  anchoredTips: ExportTip[];
}

export interface EndOffset {
  junction: string;
  chain: number;
  /** Distance of the exported (tucked) terminal from the nearest through
   * centreline at its junction, world units. */
  tucked: number;
  /** Same for the end's physics particle (the untucked terminal). */
  particle: number;
}

export interface SceneExportDiag {
  chains: number;
  samplesDrawn: number;
  samplesKept: number;
  tuckDuplicates: number;
  /** Segment lengths of the exported polylines (zero-length excluded). */
  spacing: { min: number; median: number; max: number };
  zMethod: string;
  maxAbsZ: number;
  /** max |zPos - tent| over particles and over exported samples. */
  zVsTentParticles: number;
  zVsTentSamples: number;
  registered: number;
  emergent: number;
  emergentDuplicates: number;
  junctions: number;
  arms: number;
  /** Corner keys of the export's arm order that are not K830 candidates. */
  cornerKeysMissing: number;
  /** Arms whose 0.8-ctrl probe lies within 0.15 of the centre (joinery
   * drops those from its records). */
  shortArmProbes: number;
  /** Largest distance between joinery's centre and the particle mean. */
  centreVsParticleMean: number;
  endOffsets: EndOffset[];
  maxEndTucked: number;
  maxEndParticle: number;
  freeTips: number;
  anchoredTips: number;
  /** Anchored ends whose terminal lies inside the viewport. */
  anchoredOnScreen: number;
}

// The renderer's constants this mirrors.
const TUCK_SHARE = 0.75; // strip_pass.ts tuck: trim = 0.75 h ...
const TUCK_MAX_FRAC = 0.25; // ... capped at total / 4
const ARM_PROBE_CTRL = 0.8; // joinery rebuildFillets: the arm's probe
const ARM_MIN_LEN = 0.15; // joinery: an arm probe this close is dropped
const EMERGENT_DUP = 0.8; // crossing_gaps renderEmergent's dedup radius
const POI_RADIUS_H = 5; // a POI crop's half side, in half-widths

/** Master's key for the directed corner a -> b (ribbon/corner_share.ts). */
export const wedgeKey: (jn: number, a: ExportArmRef, b: ExportArmRef) => string =
  cornerWedgeKey;

interface ChainMap {
  ch: ExportChain;
  /** Exported point -> original sample index. */
  kept: number[];
  /** Original sample index -> exported point. */
  idx: Int32Array;
  /** Arc length s of each exported point. */
  s: number[];
  /** The exported polyline's length (closing segment included on a ring). */
  total: number;
  trim: number;
  tuckLo: number;
  tuckHi: number;
}

function px(ch: ExportChain, k: number): number {
  return ch.positions[k * 2];
}
function py(ch: ExportChain, k: number): number {
  return ch.positions[k * 2 + 1];
}

function mapChain(ch: ExportChain, h: number): ChainMap {
  const n = ch.count;
  const T = ch.totalLength;
  const trim = Math.min(h * TUCK_SHARE, T * TUCK_MAX_FRAC);
  const arcPer = T / (n - 1);
  const tuckLo =
    !ch.closed && ch.tucked[0] ? Math.min(n - 1, Math.ceil(trim / arcPer)) : 0;
  const tuckHi =
    !ch.closed && ch.tucked[1] ? Math.max(1, n - Math.ceil(trim / arcPer)) : n;
  const kept: number[] = [];
  const idx = new Int32Array(n);
  for (let k = 0; k < n; k++) {
    if (k > 0) {
      const l = kept[kept.length - 1];
      if (px(ch, k) === px(ch, l) && py(ch, k) === py(ch, l)) {
        idx[k] = kept.length - 1;
        continue;
      }
    }
    kept.push(k);
    idx[k] = kept.length - 1;
  }
  // A ring whose last kept point repeats its first: drop it (the closing
  // segment already joins them).
  if (ch.closed && kept.length > 1) {
    const l = kept[kept.length - 1];
    if (px(ch, l) === px(ch, 0) && py(ch, l) === py(ch, 0)) {
      kept.pop();
      for (let k = 0; k < n; k++) if (idx[k] === kept.length) idx[k] = 0;
    }
  }
  const s: number[] = [0];
  for (let i = 1; i < kept.length; i++) {
    const a = kept[i - 1];
    const b = kept[i];
    s.push(s[i - 1] + Math.hypot(px(ch, b) - px(ch, a), py(ch, b) - py(ch, a)));
  }
  let total = s[s.length - 1];
  if (ch.closed && kept.length > 1) {
    const l = kept[kept.length - 1];
    total += Math.hypot(px(ch, 0) - px(ch, l), py(ch, 0) - py(ch, l));
  }
  return { ch, kept, idx, s, total, trim, tuckLo, tuckHi };
}

/** sampleAt's index math: the drawn segment an arc falls on. */
function segAt(m: ChainMap, arc: number): { i0: number; i1: number; frac: number } {
  const ch = m.ch;
  const T = ch.totalLength;
  const n = ch.count;
  if (ch.closed) {
    const wrapped = ((arc % T) + T) % T;
    const f = (wrapped / T) * n;
    const i0 = Math.floor(f) % n;
    return { i0, i1: (i0 + 1) % n, frac: f - Math.floor(f) };
  }
  const clamped = Math.max(0, Math.min(T, arc));
  const f = (clamped / T) * (n - 1);
  const i0 = Math.max(0, Math.min(n - 2, Math.floor(f)));
  return { i0, i1: i0 + 1, frac: f - i0 };
}

/** Drawn position at a renderer arc (sampleAt). */
function posAtArc(m: ChainMap, arc: number): Vec2 {
  const { i0, i1, frac } = segAt(m, arc);
  const ch = m.ch;
  return [
    px(ch, i0) + (px(ch, i1) - px(ch, i0)) * frac,
    py(ch, i0) + (py(ch, i1) - py(ch, i0)) * frac,
  ];
}

/** sampleAtSafe: a run's arc clamped short of its end. */
function posAtArcSafe(m: ChainMap, arc: number): Vec2 {
  const a = m.ch.closed
    ? arc
    : Math.min(Math.max(0, arc), m.ch.totalLength - 1e-4);
  return posAtArc(m, a);
}

/** A renderer arc as export arc length s. */
function arcToS(m: ChainMap, arc: number): number {
  const { i0, i1, frac } = segAt(m, arc);
  const ch = m.ch;
  const seg = Math.hypot(px(ch, i1) - px(ch, i0), py(ch, i1) - py(ch, i0));
  let s = m.s[m.idx[i0]] + frac * seg;
  if (ch.closed && m.total > 0) s = ((s % m.total) + m.total) % m.total;
  return Math.min(s, m.total);
}

/** arcAt (ring) / paintArcAt (run): a ctrl's renderer arc. */
function ctrlToArc(m: ChainMap, ctrl: number): number {
  const cal = m.ch.controlArcLengths;
  const T = m.ch.totalLength;
  const n = cal.length;
  if (m.ch.closed) {
    const i = Math.floor(ctrl);
    const t = ctrl - i;
    const i0 = ((i % n) + n) % n;
    const i1 = (i0 + 1) % n;
    const a0 = cal[i0];
    let a1 = cal[i1];
    if (a1 <= a0) a1 += T;
    return (a0 + (a1 - a0) * t) % T;
  }
  const i = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
  const t = ctrl - i;
  const a0 = cal[i];
  const a1 = i + 1 < n ? cal[i + 1] : T;
  return Math.min(T, a0 + (a1 - a0) * t);
}

/** A per-particle field, linear in arc between control slots. */
function fieldAtArc(m: ChainMap, arc: number, field: ArrayLike<number>): number {
  const cal = m.ch.controlArcLengths;
  const part = m.ch.particles;
  const L = part.length;
  const T = m.ch.totalLength;
  if (L === 1) return field[part[0]];
  let a = arc;
  if (m.ch.closed) {
    a = ((a % T) + T) % T;
    if (a < cal[0]) a += T;
  } else {
    a = Math.max(cal[0], Math.min(cal[L - 1], a));
  }
  // Last slot j with cal[j] <= a.
  let lo = 0;
  let hi = L - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cal[mid] <= a) lo = mid;
    else hi = mid - 1;
  }
  let j = lo;
  if (!m.ch.closed && j > L - 2) j = L - 2;
  const j1 = (j + 1) % L;
  const a0 = cal[j];
  const a1 = j + 1 < L ? cal[j + 1] : cal[0] + T;
  const t = a1 > a0 ? Math.max(0, Math.min(1, (a - a0) / (a1 - a0))) : 0;
  return field[part[j]] + (field[part[j1]] - field[part[j]]) * t;
}

/** The renderer arc each drawn sample stands for (its tucked arc if tucked). */
function sampleArc(m: ChainMap, k: number): number {
  const ch = m.ch;
  const T = ch.totalLength;
  if (k < m.tuckLo) return m.trim;
  if (k >= m.tuckHi) return T - m.trim;
  return ch.closed ? (k / ch.count) * T : (k / (ch.count - 1)) * T;
}

/** The physics tent (particle_system.ts addDepthTent + the clamp). */
export function depthTent(
  chains: ReadonlyArray<{ closed: boolean; particles: ArrayLike<number> }>,
  crossings: ReadonlyArray<ExportCrossing>,
  particleCount: number,
  amp: number,
  win: number
): Float64Array {
  const tent = new Float64Array(particleCount);
  const add = (pass: ExportPass, a: number): void => {
    const ch = chains[pass.chain];
    const part = ch.particles;
    const len = part.length;
    const c = pass.ctrl;
    if (ch.closed) {
      for (let k = Math.ceil(c - win); k <= Math.floor(c + win); k++) {
        const w = 1 - Math.abs(k - c) / win;
        tent[part[((k % len) + len) % len]] += a * w;
      }
      return;
    }
    // Open: chainBreakAfter = len - 1, so the seam offset is len and the
    // seam-relative ctrl is the ctrl itself.
    const rc = ((c % len) + len) % len;
    const rLo = Math.max(0, Math.ceil(rc - win));
    const rHi = Math.min(len - 1, Math.floor(rc + win));
    for (let r = rLo; r <= rHi; r++) {
      const w = 1 - Math.abs(r - rc) / win;
      tent[part[r % len]] += a * w;
    }
  };
  for (const x of crossings) {
    add(x.over, amp);
    add(x.under, -amp);
  }
  for (let i = 0; i < particleCount; i++) {
    tent[i] = Math.max(-amp, Math.min(amp, tent[i]));
  }
  return tent;
}

function distToPolyline(
  x: number,
  y: number,
  pts: number[],
  closed: boolean
): number {
  const n = pts.length / 2;
  if (n === 0) return Infinity;
  if (n === 1) return Math.hypot(x - pts[0], y - pts[1]);
  let best = Infinity;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const j = (i + 1) % n;
    const ax = pts[i * 2];
    const ay = pts[i * 2 + 1];
    const dx = pts[j * 2] - ax;
    const dy = pts[j * 2 + 1] - ay;
    const l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
    if (d < best) best = d;
  }
  return best;
}

function renderCtrl(p: ExportPass): number {
  return p.displayF ?? p.ctrl;
}

export function buildFieldScene(input: SceneExportInput): {
  scene: FieldScene;
  diag: SceneExportDiag;
} {
  const h = input.look.halfWidth;
  const maps = input.chains.map((ch) => mapChain(ch, h));

  // Chains: kept points, depth at each one's arc.
  const chains: SceneChain[] = [];
  const segLens: number[] = [];
  let drawn = 0;
  let keptN = 0;
  let maxAbsZ = 0;
  for (let c = 0; c < maps.length; c++) {
    const m = maps[c];
    const pts: number[] = [];
    const z: number[] = [];
    for (const k of m.kept) {
      pts.push(px(m.ch, k), py(m.ch, k));
      const zk = fieldAtArc(m, sampleArc(m, k), input.zPos);
      z.push(zk);
      maxAbsZ = Math.max(maxAbsZ, Math.abs(zk));
    }
    for (let i = 1; i < m.s.length; i++) {
      const d = m.s[i] - m.s[i - 1];
      if (d > 0) segLens.push(d);
    }
    drawn += m.ch.count;
    keptN += m.kept.length;
    chains.push({ id: c, closed: m.ch.closed, pts, z });
  }
  segLens.sort((a, b) => a - b);

  // Depth against the tent.
  const tent = depthTent(
    input.chains,
    input.crossings,
    input.zPos.length,
    input.look.depthAmp,
    input.look.depthWindow
  );
  let zVsTentParticles = 0;
  for (let i = 0; i < input.zPos.length; i++) {
    zVsTentParticles = Math.max(zVsTentParticles, Math.abs(input.zPos[i] - tent[i]));
  }
  let zVsTentSamples = 0;
  for (let c = 0; c < maps.length; c++) {
    const m = maps[c];
    m.kept.forEach((k, i) => {
      const t = fieldAtArc(m, sampleArc(m, k), tent);
      zVsTentSamples = Math.max(zVsTentSamples, Math.abs(chains[c].z[i] - t));
    });
  }

  // Crossings: registered, then the emergent ones the renderer slots.
  const crossings: SceneCrossing[] = [];
  const centres: Vec2[] = [];
  const passS = (p: ExportPass): number => {
    const m = maps[p.chain];
    return arcToS(m, ctrlToArc(m, renderCtrl(p)));
  };
  const passPt = (p: ExportPass): Vec2 => {
    const m = maps[p.chain];
    return posAtArc(m, ctrlToArc(m, renderCtrl(p)));
  };
  for (const x of input.crossings) {
    crossings.push({
      a: { chain: x.over.chain, s: passS(x.over) },
      b: { chain: x.under.chain, s: passS(x.under) },
      over: "a",
    });
    centres.push(passPt(x.over));
  }
  let emergentN = 0;
  let emergentDup = 0;
  for (const x of input.emergent) {
    const p = passPt(x.over);
    if (
      input.dedupeEmergent !== false &&
      centres.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < EMERGENT_DUP)) {
      emergentDup++;
      continue;
    }
    centres.push(p);
    crossings.push({
      a: { chain: x.over.chain, s: passS(x.over) },
      b: { chain: x.under.chain, s: passS(x.under) },
      over: "a",
      emergent: true,
    });
    emergentN++;
  }

  // Junctions.
  const candidates = new Map<string, { key: string; pin?: unknown }>();
  for (const cand of input.corners.candidates) candidates.set(cand.key, cand);
  const junctions: SceneJunction[] = [];
  const pois: ScenePoi[] = [];
  const endOffsets: EndOffset[] = [];
  let armsN = 0;
  let cornerKeysMissing = 0;
  let shortArmProbes = 0;
  let centreVsParticleMean = 0;
  input.junctions.forEach((jn, ji) => {
    let jx = 0;
    let jy = 0;
    for (const a of jn.arms) {
      const m = maps[a.chain];
      const p = posAtArcSafe(m, ctrlToArc(m, a.slot));
      jx += p[0];
      jy += p[1];
    }
    jx /= jn.arms.length;
    jy /= jn.arms.length;
    let mx = 0;
    let my = 0;
    for (const p of jn.particles) {
      mx += input.physPositions[p * 2];
      my += input.physPositions[p * 2 + 1];
    }
    mx /= jn.particles.length;
    my /= jn.particles.length;
    centreVsParticleMean = Math.max(centreVsParticleMean, Math.hypot(jx - mx, jy - my));

    const arms = jn.arms.map((a) => {
      const m = maps[a.chain];
      const L = m.ch.particles.length;
      const end =
        !m.ch.closed &&
        ((a.slot === 0 && a.dir === 1) || (a.slot === L - 1 && a.dir === -1));
      const s = end ? (a.dir === 1 ? 0 : m.total) : arcToS(m, ctrlToArc(m, a.slot));
      const q = posAtArcSafe(m, ctrlToArc(m, a.slot + a.dir * ARM_PROBE_CTRL));
      const dx = q[0] - jx;
      const dy = q[1] - jy;
      const arm: SceneArm = { chain: a.chain, s, dir: a.dir, kind: end ? "end" : "through" };
      return { ref: a, arm, ang: Math.atan2(dy, dx), len: Math.hypot(dx, dy) };
    });
    arms.sort((p, q) => p.ang - q.ang);
    const corners: SceneCorner[] = arms.map((x, i): SceneCorner => {
      const y = arms[(i + 1) % arms.length];
      const key = wedgeKey(ji, x.ref, y.ref);
      const cand = candidates.get(key);
      if (!cand && candidates.size > 0) cornerKeysMissing++;
      const round = candidates.size === 0 || input.corners.rounded.has(key);
      return { style: round ? "round" : "sharp", pinned: cand?.pin !== undefined };
    });
    armsN += arms.length;
    shortArmProbes += arms.filter((x) => x.len < ARM_MIN_LEN).length;
    const id = `j${ji}`;
    junctions.push({ id, c: [jx, jy], arms: arms.map((x) => x.arm), corners });
    pois.push({ name: id, at: [jx, jy], radius: POI_RADIUS_H * h });

    // END terminals against the through centrelines at this junction.
    const throughChains = [
      ...new Set(arms.filter((x) => x.arm.kind === "through").map((x) => x.arm.chain)),
    ];
    if (throughChains.length === 0) return;
    for (const x of arms) {
      if (x.arm.kind !== "end") continue;
      const ch = chains[x.arm.chain];
      const k = x.arm.s === 0 ? 0 : ch.pts.length / 2 - 1;
      const tx = ch.pts[k * 2];
      const ty = ch.pts[k * 2 + 1];
      const part = maps[x.arm.chain].ch.particles[x.ref.slot];
      const qx = input.physPositions[part * 2];
      const qy = input.physPositions[part * 2 + 1];
      let dT = Infinity;
      let dP = Infinity;
      for (const t of throughChains) {
        if (t === x.arm.chain) continue;
        dT = Math.min(dT, distToPolyline(tx, ty, chains[t].pts, chains[t].closed));
        dP = Math.min(dP, distToPolyline(qx, qy, chains[t].pts, chains[t].closed));
      }
      if (Number.isFinite(dT)) {
        endOffsets.push({ junction: id, chain: x.arm.chain, tucked: dT, particle: dP });
      }
    }
  });

  // Dead ends.
  const cam = input.camera.worldToCss;
  const onScreen = (p: Vec2): boolean => {
    const sx = cam[0] * p[0] + cam[2] * p[1] + cam[4];
    const sy = cam[1] * p[0] + cam[3] * p[1] + cam[5];
    return sx >= 0 && sy >= 0 && sx <= input.camera.viewport[0] && sy <= input.camera.viewport[1];
  };
  const tipPt = (t: ExportTip): Vec2 => {
    const ch = chains[t.chain];
    const k = t.atEnd ? ch.pts.length / 2 - 1 : 0;
    return [ch.pts[k * 2], ch.pts[k * 2 + 1]];
  };
  const deadEnds: SceneDeadEnd[] = [];
  input.freeTips.forEach((t, i) => {
    deadEnds.push({ chain: t.chain, s: t.atEnd ? maps[t.chain].total : 0 });
    pois.push({ name: `t${i}`, at: tipPt(t), radius: POI_RADIUS_H * h });
  });
  let anchoredOnScreen = 0;
  for (const t of input.anchoredTips) {
    deadEnds.push({ chain: t.chain, s: t.atEnd ? maps[t.chain].total : 0, offscreen: true });
    if (onScreen(tipPt(t))) anchoredOnScreen++;
  }

  const scene: FieldScene = {
    version: SCENE_VERSION,
    name: input.name,
    source: input.source,
    camera: input.camera,
    look: input.look,
    chains,
    crossings,
    junctions,
    deadEnds,
    pois,
  };
  const diag: SceneExportDiag = {
    chains: chains.length,
    samplesDrawn: drawn,
    samplesKept: keptN,
    tuckDuplicates: drawn - keptN,
    spacing: {
      min: segLens.length ? segLens[0] : 0,
      median: segLens.length ? segLens[segLens.length >> 1] : 0,
      max: segLens.length ? segLens[segLens.length - 1] : 0,
    },
    zMethod:
      "physics zPos, linear in renderer arc between control slots (tucked samples at their tucked arc)",
    maxAbsZ,
    zVsTentParticles,
    zVsTentSamples,
    registered: input.crossings.length,
    emergent: emergentN,
    emergentDuplicates: emergentDup,
    junctions: junctions.length,
    arms: armsN,
    cornerKeysMissing,
    shortArmProbes,
    centreVsParticleMean,
    endOffsets,
    maxEndTucked: endOffsets.reduce((a, e) => Math.max(a, e.tucked), 0),
    maxEndParticle: endOffsets.reduce((a, e) => Math.max(a, e.particle), 0),
    freeTips: input.freeTips.length,
    anchoredTips: input.anchoredTips.length,
    anchoredOnScreen,
  };
  return { scene, diag };
}
