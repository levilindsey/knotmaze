// G3-0 DATA PLANE (K8 stage 2; design: docs/design/G3G4_sdf_geometry.md
// sections 2.2 and 5.1). Pure packers for the four float tables the SDF
// ribbons will read: SAMP, RADII, G3 CHAIN and RANGES. No Pixi, no GL: the
// renderer owns the page-lifetime FloatRows (ribbon_renderer.ts) and calls
// these to fill their CPU mirrors. Nothing reads the tables on the GPU yet
// (G3-1 and G3-2 will).
//
// Every table is RGBA32F, ROW_W texels per row, linear texel index t ->
// (t & 1023, t >> 10). Sample bases are in SAMPLES, not texels:
// - SAMP: texel sampBase/2 + j = (x, y) of samples 2j and 2j+1, so the
//   floats of chain c are exactly its `chainSamples[c].positions`
//   (flowed, tucked; already float32) starting at float sampBase*2. Every
//   sampBase is EVEN, so a chain starts on a texel; an odd chain's last
//   texel carries (0, 0) in .zw.
// - RADII: texel radBase/4 + j = the radii of samples 4j..4j+3, each
//   fround(h * widthMul) (widthMul = the reveal mask x the rainbow swell x
//   the pluck base collapse, the multiplier the strip ribbon receives).
//   Every chain owns a region (radBase a multiple of 4, padded with 0) so a
//   pluck collapse can write it any time; it is filled only while the
//   chain's multiplier is not null (null = every sample at 1).
// - G3 CHAIN: texels 2c and 2c+1 = (sampBase, radBase or -1 for unit
//   width, capStart, capEnd), (winBase, nWin, rangeBase, nRange). What G2's
//   KSTATIC / KGEOM lack; a separate table so G3-0 changes no shader text.
// - RANGES: one texel per entry (slot, kLo, kHi, flags). Chain c's slot
//   windows are entries [winBase, winBase + nWin), sorted by kLo: exactly
//   the per-sample slot ids `assignGapIds` packs into idScratch (the
//   ribbon's aMaskId), as sample ranges. kLo/kHi already carry the one
//   sample of padding each side. flags bits 0-1 = the lane (the aMaskId
//   component), bit 2 = one half of a closed chain's window split at the
//   seam. The segment ranges (FOLD at G3-2, CLUSTER at G4-0) will start at
//   rangeBase = winBase + nWin; nRange is 0 for now.

// Cap kinds (G3 CHAIN texel 2c .z/.w). A closed ring has no ends.
export const CAP_NONE = 0;
// Free dead-end tips, and fused ends (the tucked end is a round disc of
// radius h at the tuck point, under today's cap cover disc).
export const CAP_ROUND = 1;
// Anchored tails keep Stage 7b's square cap.
export const CAP_FLAT = 2;

// RANGES flags.
export const RANGE_LANE_MASK = 3;
export const RANGE_SPLIT = 4;
// Floats per RANGES entry and per G3 CHAIN record.
export const RANGE_FLOATS = 4;
export const CHAIN_FLOATS = 8;

// The G3 tables' upload accounting: every byte and call the four G3
// FloatRows send (float_rows.ts counts each instance into the accumulators
// it was built with; ROW_UPLOAD_STATS still counts them too).
export interface UploadStats {
  bytes: number;
  calls: number;
}
export const SAMP_UPLOAD_STATS: UploadStats = { bytes: 0, calls: 0 };

// One scene's static layout: where each chain's samples and radii live.
export interface G3Layout {
  chains: number;
  count: Int32Array;
  closed: Uint8Array;
  // Sample indices: sampBase even, radBase a multiple of 4.
  sampBase: Int32Array;
  radBase: Int32Array;
  // Texels in use.
  sampTexels: number;
  radTexels: number;
}

export function g3Layout(
  counts: ArrayLike<number>,
  closed: ArrayLike<boolean>
): G3Layout {
  const n = counts.length;
  const L: G3Layout = {
    chains: n,
    count: new Int32Array(n),
    closed: new Uint8Array(n),
    sampBase: new Int32Array(n),
    radBase: new Int32Array(n),
    sampTexels: 0,
    radTexels: 0,
  };
  let s = 0;
  let r = 0;
  for (let c = 0; c < n; c++) {
    const count = counts[c];
    L.count[c] = count;
    L.closed[c] = closed[c] ? 1 : 0;
    L.sampBase[c] = s;
    L.radBase[c] = r;
    s += count + (count & 1);
    r += Math.ceil(count / 4) * 4;
  }
  L.sampTexels = s / 2;
  L.radTexels = r / 4;
  return L;
}

// SAMP: chain samples into the mirror at sampBase. Returns nothing; the
// chain's texels are [sampBase / 2, (sampBase + count + 1) / 2).
export function packSamp(
  data: Float32Array,
  sampBase: number,
  positions: Float32Array,
  count: number
): void {
  const n = count * 2;
  data.set(positions.length === n ? positions : positions.subarray(0, n), sampBase * 2);
  if (count & 1) {
    const o = (sampBase + count) * 2;
    data[o] = 0;
    data[o + 1] = 0;
  }
}

export function sampTexelSpan(sampBase: number, count: number): [number, number] {
  return [sampBase >> 1, (sampBase + count + 1) >> 1];
}

// The rows [r0, r1) that texels [t0, t1) touch at `width` texels per row:
// what FloatRows.markDirty marks, so a chain straddling a row boundary
// uploads both rows (its "row partials").
export function rowSpan(t0: number, t1: number, width: number): [number, number] {
  return [Math.floor(t0 / width), Math.ceil(t1 / width)];
}

// Sample k of a chain from the SAMP mirror (the decoder; a shader's fetch:
// texel (sampBase + k) >> 1, component pair (sampBase + k) & 1).
export function readSamp(
  data: Float32Array,
  sampBase: number,
  k: number,
  out: Float32Array | number[]
): void {
  const g = sampBase + k;
  const o = (g >> 1) * 4 + (g & 1) * 2;
  out[0] = data[o];
  out[1] = data[o + 1];
}

// RADII: fround(h * mul[k]) per sample at radBase, the region's tail
// padded with 0.
export function packRadii(
  data: Float32Array,
  radBase: number,
  h: number,
  mul: ArrayLike<number>,
  count: number
): void {
  for (let k = 0; k < count; k++) data[radBase + k] = h * mul[k];
  const end = Math.ceil(count / 4) * 4;
  for (let k = count; k < end; k++) data[radBase + k] = 0;
}

export function radTexelSpan(radBase: number, count: number): [number, number] {
  return [radBase >> 2, (radBase + count + 3) >> 2];
}

// G3 CHAIN: chain c's two texels; returns whether any value changed (the
// caller marks only changed texels dirty).
export function writeChainTexels(
  data: Float32Array,
  c: number,
  sampBase: number,
  radBase: number,
  capStart: number,
  capEnd: number,
  winBase: number,
  nWin: number,
  rangeBase: number,
  nRange: number
): boolean {
  const o = c * CHAIN_FLOATS;
  let changed = false;
  const put = (i: number, v: number): void => {
    if (data[o + i] !== v) {
      data[o + i] = v;
      changed = true;
    }
  };
  put(0, sampBase);
  put(1, radBase);
  put(2, capStart);
  put(3, capEnd);
  put(4, winBase);
  put(5, nWin);
  put(6, rangeBase);
  put(7, nRange);
  return changed;
}

// The caps of one chain from its ends' kinds (ribbon_renderer's
// scene-build classification: fused, else anchored, else free).
export function chainCaps(
  closed: boolean,
  startFused: boolean,
  startAnchored: boolean,
  endFused: boolean,
  endAnchored: boolean
): [number, number] {
  if (closed) return [CAP_NONE, CAP_NONE];
  const cap = (fused: boolean, anchored: boolean): number =>
    fused || !anchored ? CAP_ROUND : CAP_FLAT;
  return [cap(startFused, startAnchored), cap(endFused, endAnchored)];
}

// SEGMENTS. Segment k joins samples k and k+1: a closed ring has `count`
// (the last joins count-1 -> 0), an open run count - 1 (never a
// last-to-first chord, invariant 6).
export function segmentCount(count: number, closed: boolean): number {
  return closed ? count : count - 1;
}

// The four samples segment k reads (k-1, k, k+1, k+2): a ring wraps, an
// open run gives -1 past either end (no neighbour cone there).
export function segmentSamples(
  k: number,
  count: number,
  closed: boolean,
  out: Int32Array | number[]
): void {
  if (closed) {
    out[0] = (k - 1 + count) % count;
    out[1] = k;
    out[2] = (k + 1) % count;
    out[3] = (k + 2) % count;
  } else {
    out[0] = k > 0 ? k - 1 : -1;
    out[1] = k;
    out[2] = k + 1;
    out[3] = k + 2 <= count - 1 ? k + 2 : -1;
  }
}

// SLOT WINDOWS -> LANES (moved verbatim from RibbonRenderer.assignGapIds):
// `wins` holds quadruples (slot, center, winNeg, winPos) in arc units along
// the chain. Each window's samples, padded by one each side (every quad
// touching the window carries the id at both ends; the fragment's exact arc
// test does the real windowing), get the slot in ONE lane, the first free
// across the whole range. `ids` (count x lanes, sample-major) is filled
// with -1 first. A window with no free lane is dropped and counted (the
// return value). `accepted`, when given, receives (slot, k0, k1, lane) per
// kept window in window order, k0..k1 the padded range as iterated (a
// closed chain's may run past either end; indices wrap mod count).
export function assignWindowLanes(
  wins: ArrayLike<number> | null | undefined,
  count: number,
  closed: boolean,
  totalLength: number,
  lanes: number,
  ids: Float32Array,
  accepted: number[] | null
): number {
  ids.fill(-1);
  if (accepted) accepted.length = 0;
  let dropped = 0;
  if (!wins || !(totalLength > 0)) return 0;
  const per = (closed ? count : count - 1) / totalLength;
  for (let w = 0; w < wins.length; w += 4) {
    const slot = wins[w];
    // Samples are uniform in arc, so floor/ceil already cover every quad
    // the window touches; one sample of padding absorbs rounding.
    let k0 = Math.floor((wins[w + 1] - wins[w + 2]) * per) - 1;
    let k1 = Math.ceil((wins[w + 1] + wins[w + 3]) * per) + 1;
    if (!closed) {
      k0 = Math.max(0, k0);
      k1 = Math.min(count - 1, k1);
    } else if (k1 - k0 + 1 >= count) {
      k0 = 0;
      k1 = count - 1;
    }
    let comp = -1;
    for (let cc = 0; cc < lanes && comp < 0; cc++) {
      let free = true;
      for (let k = k0; k <= k1; k++) {
        const kk = closed ? ((k % count) + count) % count : k;
        if (ids[kk * lanes + cc] >= 0) {
          free = false;
          break;
        }
      }
      if (free) comp = cc;
    }
    if (comp < 0) {
      dropped++;
      continue;
    }
    for (let k = k0; k <= k1; k++) {
      const kk = closed ? ((k % count) + count) % count : k;
      ids[kk * lanes + comp] = slot;
    }
    if (accepted) accepted.push(slot, k0, k1, comp);
  }
  return dropped;
}

// The most RANGES entries `nAccepted` kept windows can need (each closed
// window may split in two at the seam).
export function maxRangeEntries(nAccepted: number): number {
  return nAccepted * 2;
}

// RANGES: one chain's kept windows (assignWindowLanes' `accepted`) as
// entries at entry index `base` of `out`: a closed chain's window that runs
// past the seam splits into [k0, count-1] and [0, rest] (RANGE_SPLIT), and
// the entries sort by kLo (stable: ties keep window order). An open
// chain's windows are already clamped. Returns the entry count.
export function packRanges(
  accepted: ArrayLike<number>,
  count: number,
  closed: boolean,
  out: Float32Array,
  base: number
): number {
  let n = 0;
  const put = (slot: number, lo: number, hi: number, flags: number): void => {
    // Stable insertion by kLo.
    let i = n;
    while (i > 0 && out[(base + i - 1) * RANGE_FLOATS + 1] > lo) {
      const s = (base + i - 1) * RANGE_FLOATS;
      const d = s + RANGE_FLOATS;
      out[d] = out[s];
      out[d + 1] = out[s + 1];
      out[d + 2] = out[s + 2];
      out[d + 3] = out[s + 3];
      i--;
    }
    const o = (base + i) * RANGE_FLOATS;
    out[o] = slot;
    out[o + 1] = lo;
    out[o + 2] = hi;
    out[o + 3] = flags;
    n++;
  };
  for (let a = 0; a + 3 < accepted.length; a += 4) {
    const slot = accepted[a];
    let k0 = accepted[a + 1];
    let k1 = accepted[a + 2];
    const lane = accepted[a + 3] & RANGE_LANE_MASK;
    if (closed) {
      // Shift a lap so k0 lands in [0, count); the window spans < count
      // samples (a full-lap window is already [0, count-1]).
      const lap = Math.floor(k0 / count) * count;
      k0 -= lap;
      k1 -= lap;
      if (k1 >= count) {
        put(slot, k0, count - 1, lane | RANGE_SPLIT);
        put(slot, 0, k1 - count, lane | RANGE_SPLIT);
        continue;
      }
    }
    put(slot, k0, k1, lane);
  }
  return n;
}

// The decoder: rebuild the per-sample slot ids (count x lanes, -1 = none)
// from a chain's RANGES entries - what a shader reads instead of aMaskId.
export function decodeRanges(
  data: Float32Array,
  base: number,
  n: number,
  count: number,
  lanes: number,
  ids: Float32Array
): void {
  ids.fill(-1);
  for (let e = 0; e < n; e++) {
    const o = (base + e) * RANGE_FLOATS;
    const slot = data[o];
    const lo = data[o + 1];
    const hi = data[o + 2];
    const lane = data[o + 3] & RANGE_LANE_MASK;
    for (let k = Math.max(0, lo); k <= Math.min(count - 1, hi); k++) {
      ids[k * lanes + lane] = slot;
    }
  }
}

// TYPED ARRAYS <-> BASE64 (captureScene's JSON payload).
export function typedToB64(a: ArrayBufferView): string {
  const u8 = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  let s = "";
  const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) {
    s += String.fromCharCode.apply(
      null,
      u8.subarray(i, Math.min(u8.length, i + CH)) as unknown as number[]
    );
  }
  return btoa(s);
}

export function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return u8;
}

export function b64ToF32(b64: string): Float32Array {
  const u8 = b64ToBytes(b64);
  return new Float32Array(u8.buffer, u8.byteOffset, u8.byteLength >> 2);
}

export function b64ToF64(b64: string): Float64Array {
  const u8 = b64ToBytes(b64);
  return new Float64Array(u8.buffer, u8.byteOffset, u8.byteLength >> 3);
}
