// K856: the under-crossing clip band for overlay markers, shared by
// RibbonRenderer.underClipBand (which measures it at a crossing) and
// MarkerMesh.setClipBand (which cuts the marker's fragments by it).
// Only the part of the marker overlapping the over thread (+ its
// gap) is cut; the rest keeps rendering - the in-game form of the
// loader trefoil's K855 band.
//
// The band is a world-space strip: the line through (x, y) along the
// unit direction (dx, dy) (the OVER pass through the crossing), with
// half width `halfW` (over casing half + gap * sin(crossing angle)).
export interface ClipBand {
  x: number;
  y: number;
  dx: number;
  dy: number;
  halfW: number;
}

// The band in a marker's DISC frame (disc radius 1 at (x, y) with
// world radius `radius`), as the two shader vec4s MarkerMesh feeds
// its fragment: a = (centre, direction), b = (half width, half
// length, on, -). The half length covers every disc fragment
// (|p| <= ~1.1) so the shader's across test alone decides the cut -
// a fixed length would let fragments escape at shallow crossing
// angles, where the marker centre sits far along the over line from
// the crossing point.
export function clipBandUniforms(
  band: ClipBand,
  x: number,
  y: number,
  radius: number
): { a: [number, number, number, number]; b: [number, number, number, number] } {
  const r = Math.max(radius, 1e-6);
  const ax = (band.x - x) / r;
  const ay = (band.y - y) / r;
  return {
    a: [ax, ay, band.dx, band.dy],
    b: [band.halfW / r, Math.hypot(ax, ay) + 1.2, 1, 0],
  };
}

// The fragment test itself, mirrored from MARKER_FRAG for tests:
// is the disc-frame point (px, py) cut by these uniforms?
export function clipBandCuts(
  a: readonly number[],
  b: readonly number[],
  px: number,
  py: number
): boolean {
  if (b[2] <= 0.5) return false;
  const relX = px - a[0];
  const relY = py - a[1];
  const along = relX * a[2] + relY * a[3];
  const across = relX * -a[3] + relY * a[2];
  return Math.abs(across) < b[0] && Math.abs(along) < b[1];
}
