// K580 s5: THE STADIUM CAP COVER's geometry (pure; joinery.ts draws it,
// ribbon_renderer.ts records its input). New file, no moved code.
// joinery.ts draws it in two places: in the cap cover, wearing the junction
// field, and in the cap cover's host-axis fallback, wearing the host's
// material, where the cap cover finds no record (at xh 2 every arm's probe
// 0.8 ctrl out falls within 0.15 of J, so the junction's record keeps
// under the two arms the cap cover's search needs).
//
// A fused spur tip is TUCKED (ribbon_renderer.ts tuckFusedTips): the spur
// is drawn from T, trim = min(0.75h, total / 4) up its own stroke from the
// junction J, and the cap cover's 1.06h disc sits at T. The body's round
// piece at J and that disc, radius h and 0.75h apart, leave a concave WAIST
// on the outline (K580 s4: 0.017-0.030 LU against the untucked stroke).
// Maze bridges need the tuck; a glyph's spur (style.glyph) also gets this
// cover: its own untucked strip from J to T, a band at +-side of the
// untucked centerline (side = TIP_DISC_SIDE half-widths, 0.995h), closed
// by a semicircle of radius side around J and flat at T, where today's
// disc overlaps it (abutting MSAA edges seam). Every point lies within
// side of the untucked stroke, so the band stays inside the untucked
// ideal and, around J, inside the body through J.
//
// THE STROKE (`TipStroke`): [n, then n x (x, y, tx, ty)], J first and T
// last, unit tangents pointing J -> T. ribbon_renderer.ts writes one per
// glyph tip end (`glyphTipStroke`, tipStrokeWrite) before the tuck
// collapses the samples it copies.

/** Segments in the semicircle around J (7 interior points). */
export const STADIUM_CAP_SEGS = 8;

/** Floats per stroke point: x, y, tx, ty. */
export const TIP_STROKE_STRIDE = 4;

/**
 * Writes one stroke point (`i`, from J) and returns the buffer, grown when
 * it is too short (the caller keeps the returned one). Sets the count to
 * i + 1.
 */
export function tipStrokeWrite(
  buf: Float32Array | null,
  i: number,
  x: number,
  y: number,
  tx: number,
  ty: number
): Float32Array {
  const need = 1 + (i + 1) * TIP_STROKE_STRIDE;
  let out = buf;
  if (!out || out.length < need) {
    const grown = new Float32Array(Math.max(need, out ? out.length * 2 : 1 + 6 * TIP_STROKE_STRIDE));
    if (out) grown.set(out);
    out = grown;
  }
  const tl = Math.sqrt(tx * tx + ty * ty) || 1;
  const o = 1 + i * TIP_STROKE_STRIDE;
  out[o] = x;
  out[o + 1] = y;
  out[o + 2] = tx / tl;
  out[o + 3] = ty / tl;
  out[0] = i + 1;
  return out;
}

/**
 * The stadium's fan: apex (the J-T midpoint) into `apex[0..1]`, and the
 * closed rim (its first point repeated at the end): T's left corner, the
 * left offsets back to J, the semicircle around J's far side, the right
 * offsets out to T's right corner. Null for a stroke under two points.
 */
export function stadiumRim(
  stroke: Float32Array,
  side: number,
  apex: number[]
): number[] | null {
  const n = stroke[0] | 0;
  if (n < 2) return null;
  const S = TIP_STROKE_STRIDE;
  const rim: number[] = [];
  // Left side (normal = tangent rotated +90 deg), from T back to J.
  for (let i = n - 1; i >= 0; i--) {
    const o = 1 + i * S;
    rim.push(stroke[o] - stroke[o + 3] * side, stroke[o + 1] + stroke[o + 2] * side);
  }
  // The semicircle around J: from the left normal through -tangent (behind
  // J, away from T) to the right normal.
  const jx = stroke[1];
  const jy = stroke[2];
  const nx = -stroke[4];
  const ny = stroke[3];
  const bx = -stroke[3];
  const by = -stroke[4];
  for (let k = 1; k < STADIUM_CAP_SEGS; k++) {
    const a = (Math.PI * k) / STADIUM_CAP_SEGS;
    const c = Math.cos(a);
    const s = Math.sin(a);
    rim.push(jx + (nx * c + bx * s) * side, jy + (ny * c + by * s) * side);
  }
  // Right side, from J out to T.
  for (let i = 0; i < n; i++) {
    const o = 1 + i * S;
    rim.push(stroke[o] + stroke[o + 3] * side, stroke[o + 1] - stroke[o + 2] * side);
  }
  rim.push(rim[0], rim[1]);
  const t = 1 + (n - 1) * S;
  apex[0] = (jx + stroke[t]) / 2;
  apex[1] = (jy + stroke[t + 1]) / 2;
  return rim;
}
