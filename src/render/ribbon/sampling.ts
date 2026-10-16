// THE SAMPLING HELPERS (K5 R1): the renderer's pure arc and sample math,
// moved verbatim from ribbon_renderer.ts (9041939 lines below). Only
// `export` was added, the class indent dropped and `this.` dropped from
// their calls to each other. None reads a renderer field, so none takes the
// renderer (docs/design/K5_K6_split.md 2.3; render-ribbon.md, THE PARTS).
// RibbonRenderer keeps a private one-line forwarder of each: its own call
// sites and the probes (through __knotRenderer()) call those. The later
// parts call these directly.
//
//   PassNeighbors  902-905    a crossing pass's two neighbors on its chain
//   sampleAt       1747-1797  position and unit tangent at an arc
//   arcAt          1912-1923  a ctrl's arc, wrapping (rings)
//   renderCtrl     1925-1931  the ctrl a pass renders at (displayF)
//   neighborGaps   1933-1987  arc gaps to a pass's neighboring passes
//   paintArcAt     5790-5808  a ctrl's arc for paint (open chains clamp)
//   sampleAtSafe   6138-6154  sampleAt clamped short of an open chain's end
//   normArc        (facade)   wrap or clamp a world arc (K5 R5: joinery and
//                             the facade both call it, and it is pure)

import type { SplineSamples } from "../../geometry/spline_generator";
import type { CrossingPass } from "../../physics/particle_system";

export interface PassNeighbors {
  prev: { chain: number; ctrl: number };
  next: { chain: number; ctrl: number };
}

// Interpolate position and unit tangent at an arc position into `out`
// as [x, y, tx, ty]. Closed chains are rings: `count` segments, arcs wrap
// modulo total. Open chains are runs: `count - 1` segments, arcs CLAMP -
// the arc-wrap family's fourth bite lived here, in the ring math itself:
// applied to an open chain it maps any arc within one sample spacing of
// total onto a phantom last->first chord, so terminal queries (bridge
// arms, corner tails - arc0 == total) interpolated ~99.8% of the way to
// the chain's OTHER END. Every fused bridge junction fanned fillet
// slivers toward its twin junction; the corner junctions drew the
// start/finish shards.
export function sampleAt(
  samples: SplineSamples,
  arc: number,
  out: Float32Array,
  offset: number
): void {
  const total = samples.totalLength;
  let i0: number;
  let i1: number;
  let frac: number;
  if (samples.closed) {
    const wrapped = ((arc % total) + total) % total;
    const f = (wrapped / total) * samples.count;
    i0 = Math.floor(f) % samples.count;
    i1 = (i0 + 1) % samples.count;
    frac = f - Math.floor(f);
  } else {
    const clamped = Math.max(0, Math.min(total, arc));
    const f = (clamped / total) * (samples.count - 1);
    i0 = Math.max(0, Math.min(samples.count - 2, Math.floor(f)));
    i1 = i0 + 1;
    frac = f - i0;
  }

  out[offset] =
    samples.positions[i0 * 2] +
    (samples.positions[i1 * 2] - samples.positions[i0 * 2]) * frac;
  out[offset + 1] =
    samples.positions[i0 * 2 + 1] +
    (samples.positions[i1 * 2 + 1] - samples.positions[i0 * 2 + 1]) * frac;

  let tx =
    samples.tangents[i0 * 2] +
    (samples.tangents[i1 * 2] - samples.tangents[i0 * 2]) * frac;
  let ty =
    samples.tangents[i0 * 2 + 1] +
    (samples.tangents[i1 * 2 + 1] - samples.tangents[i0 * 2 + 1]) * frac;
  const len = Math.hypot(tx, ty) || 1;
  out[offset + 2] = tx / len;
  out[offset + 3] = ty / len;
}

// Arc position of a fractional control position, wrapping around the loop.
export function arcAt(samples: SplineSamples, ctrl: number): number {
  const n = samples.controlArcLengths.length;
  const i = Math.floor(ctrl);
  const t = ctrl - i;
  const i0 = ((i % n) + n) % n;
  const i1 = (i0 + 1) % n;
  const a0 = samples.controlArcLengths[i0];
  let a1 = samples.controlArcLengths[i1];
  if (a1 <= a0) a1 += samples.totalLength;
  return (a0 + (a1 - a0) * t) % samples.totalLength;
}

// Ctrl a pass RENDERS at: the true intersection when the physics has
// one (displayF), else the binding. During a tug the ordering clamps
// can pin the binding away from where the threads actually cross;
// drawing there mangles the crossing.
export function renderCtrl(pass: CrossingPass): number {
  return pass.displayF ?? pass.ctrl;
}

// Arc gap to the neighboring crossing passes, wrapping around the loop.
export function neighborGaps(
  samples: SplineSamples,
  pass: CrossingPass,
  neighbors: PassNeighbors
): [number, number] {
  const total = samples.totalLength;
  // OPEN chains: physics unlinks the open seam by SELF-linking (the first
  // pass's prev and the last pass's next point at the pass itself), so
  // a self-linked side has no neighbor - its room is the run to that
  // chain end. The ring rule below only knew `next === pass` (a
  // single-pass ring): first passes read a ZERO prev gap (their
  // chain-start-side cut sat at the march's 0.15 floor) and last passes
  // ignored their real prev neighbor.
  if (!samples.closed) {
    const selfPrev = neighbors.prev === pass;
    const selfNext = neighbors.next === pass;
    if (selfPrev || selfNext) {
      const c = paintArcAt(samples, renderCtrl(pass), false);
      const gapPrev = selfPrev
        ? c
        : Math.max(
            0,
            c -
              paintArcAt(samples, renderCtrl(neighbors.prev), false)
          );
      const gapNext = selfNext
        ? total - c
        : Math.max(
            0,
            paintArcAt(samples, renderCtrl(neighbors.next), false) -
              c
          );
      return [gapPrev, gapNext];
    }
  }
  if (
    neighbors.next === pass ||
    neighbors.next.ctrl === pass.ctrl
  ) {
    return [total / 2, total / 2];
  }
  const center = arcAt(samples, renderCtrl(pass));
  const gapNext =
    (((arcAt(samples, renderCtrl(neighbors.next)) - center) %
      total) +
      total) %
    total;
  const gapPrev =
    (((center - arcAt(samples, renderCtrl(neighbors.prev))) %
      total) +
      total) %
    total;
  return [gapPrev, gapNext];
}

// Arc of a ctrl for PAINT purposes. arcAt's closing modulo is correct
// for closed chains but wraps an OPEN chain's terminal arc (== total) to
// ZERO - a traveled bridge's span [0, lastCtrl] collapsed to a point and
// the bridge stayed base-colored (the "connective bits don't highlight"
// report). Open chains clamp instead of wrapping.
export function paintArcAt(
  samples: SplineSamples,
  ctrl: number,
  closed: boolean
): number {
  if (closed) return arcAt(samples, ctrl);
  const n = samples.controlArcLengths.length;
  const i = Math.max(0, Math.min(n - 1, Math.floor(ctrl)));
  const t = ctrl - i;
  const a0 = samples.controlArcLengths[i];
  const a1 =
    i + 1 < n ? samples.controlArcLengths[i + 1] : samples.totalLength;
  return Math.min(samples.totalLength, a0 + (a1 - a0) * t);
}

// Positional sampling for junction joinery: before the sampleAt
// open-chain fix this clamp was the only guard against the arc-wrap
// family's third bite (flank samples at corner-cut terminals flew to
// the chain START). sampleAt now clamps open chains itself; this stays
// as a cheap belt-and-suspenders for joinery callers.
export function sampleAtSafe(
  samples: SplineSamples,
  arc: number,
  closed: boolean,
  out: Float32Array,
  offset: number
): void {
  const a = closed
    ? arc
    : Math.min(Math.max(0, arc), samples.totalLength - 1e-4);
  sampleAt(samples, a, out, offset);
}

// Wrap (closed) or clamp (open) a world arc into a chain's [0, total].
export function normArc(a: number, total: number, closed: boolean): number {
  if (total <= 0) return 0;
  if (closed) return ((a % total) + total) % total;
  return Math.max(0, Math.min(total, a));
}
