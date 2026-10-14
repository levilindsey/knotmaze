// MARKER GLYPHS (K83; Levi, 2026-10-12: "placeholder icons for the start,
// finish, and current positions. These will be minimal, white strokes with
// clear background. Rendered within a black circle with a bit of margin
// roughly equal to the stroke width."). PURE geometry - no pixi, no DOM:
// marker_mesh.ts draws these per pixel, markerGlyphSvg() writes the same
// shapes as SVG (the contact sheets, and the off-screen exit pointer that
// should echo the finish icon).
//
// A glyph is designed in a 24 x 24 frame (y down, center (12, 12)) the way
// line-icon sets are drawn (Lucide proportions): stroked POLYLINES with
// round caps and joins, stroked CIRCLES, and filled DOTS (the smallest
// stroke mark). compileGlyph() maps it into the DISC FRAME (disc radius 1,
// center (0, 0), y down) and scales it about the center until its
// outermost ink sits exactly MARKER_MARGIN inside the rim; the stroke
// width is MARKER_STROKE there, the same for every glyph, so the set reads
// as one family and the stroke scales with the marker.
//
// These are PLACEHOLDERS - Levi will replace them. A new glyph is one more
// design below (the tests check its fit and that the shader can draw it).

// "minotaur": K80's real-time chaser (drawn only in that mode).
export type MarkerRole = "start" | "exit" | "head" | "minotaur";

// Stroke width and rim margin, in disc radii. The margin equals the stroke
// (the brief); the outer ink therefore reaches radius 1 - MARKER_MARGIN.
export const MARKER_STROKE = 0.15;
export const MARKER_MARGIN = MARKER_STROKE;

// Shader capacity (marker_mesh.ts declares the same arrays).
export const GLYPH_MAX_SEGMENTS = 64;
export const GLYPH_MAX_CIRCLES = 8;

// THE MARKER RADIUS (world units), one for all three markers: large enough
// for a glyph to read at the phone's default zoom (~9 CSS px per lattice
// unit at gs 18 - the old 0.95-width discs were 9 px across there), and
// scaled with the thread so a disc always clears its own ribbon. The
// fabric overlay draws with it; anything else that needs a marker's size
// (the off-screen indicators) reads it here rather than copying it.
export const MARKER_R_PER_WIDTH = 1.5;
export const MARKER_R_MIN = 0.55;
export function markerRadiusFor(threadWidth: number, scale = 1): number {
  return Math.max(MARKER_R_MIN, threadWidth * MARKER_R_PER_WIDTH) * scale;
}

interface GlyphDesign {
  id: string;
  role: MarkerRole;
  label: string;
  // Polylines as flat [x0, y0, x1, y1, ...] (a closed one repeats its
  // first point), circles and dots as [cx, cy, r] - all in the 24-frame.
  lines: number[][];
  rings?: number[][];
  dots?: number[][];
}

export interface MarkerGlyph {
  id: string;
  role: MarkerRole;
  label: string;
  // Disc frame. Polylines as flat point lists; rings and dots as
  // (cx, cy, r) triples.
  lines: Float32Array[];
  rings: Float32Array;
  dots: Float32Array;
  // Outermost ink, from the center (1 - MARKER_MARGIN by construction).
  extent: number;
}

// --- Design helpers (24-frame). ---------------------------------------

// A pen that samples curves into polylines.
class Pen {
  private cur: number[] = [];
  private readonly done: number[][] = [];

  M(x: number, y: number): Pen {
    this.flush();
    this.cur = [x, y];
    return this;
  }

  L(x: number, y: number): Pen {
    this.cur.push(x, y);
    return this;
  }

  // Cubic Bezier from the current point, n chords.
  C(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x: number,
    y: number,
    n = 8
  ): Pen {
    const x0 = this.cur[this.cur.length - 2];
    const y0 = this.cur[this.cur.length - 1];
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const u = 1 - t;
      const a = u * u * u;
      const b = 3 * u * u * t;
      const c = 3 * u * t * t;
      const d = t * t * t;
      this.cur.push(
        a * x0 + b * x1 + c * x2 + d * x,
        a * y0 + b * y1 + c * y2 + d * y
      );
    }
    return this;
  }

  // Circular arc about (cx, cy) from angle a0 to a1 (radians, y down: a
  // positive sweep turns clockwise on screen), continuing the current
  // polyline (its current point should be the arc's start).
  A(cx: number, cy: number, r: number, a0: number, a1: number): Pen {
    const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / (Math.PI / 16)));
    for (let i = 1; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      this.cur.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    return this;
  }

  Z(): Pen {
    if (this.cur.length >= 2) this.cur.push(this.cur[0], this.cur[1]);
    this.flush();
    return this;
  }

  lines(): number[][] {
    this.flush();
    return this.done;
  }

  private flush(): void {
    if (this.cur.length >= 4) this.done.push(this.cur);
    this.cur = [];
  }
}

const pen = (): Pen => new Pen();

// A regular polygon's corners (closed), first corner at angle a0.
function polygon(
  cx: number,
  cy: number,
  r: number,
  n: number,
  a0: number,
  rInner = 0
): number[] {
  const pts: number[] = [];
  const m = rInner > 0 ? 2 * n : n;
  for (let i = 0; i <= m; i++) {
    const a = a0 + (i * 2 * Math.PI) / m;
    const rr = rInner > 0 && i % 2 === 1 ? rInner : r;
    pts.push(cx + rr * Math.cos(a), cy + rr * Math.sin(a));
  }
  return pts;
}

const UP = -Math.PI / 2;

// --- The designs. ------------------------------------------------------
// The first glyph of each role is that role's default (DEFAULT_GLYPHS).

const DESIGNS: GlyphDesign[] = [
  // START.
  {
    // An equilateral play triangle, centroid on the center (the optical
    // center of a triangle in a circle).
    id: "play",
    role: "start",
    label: "play triangle",
    lines: [polygon(12, 12, 9, 3, 0)],
  },
  {
    id: "chevron",
    role: "start",
    label: "chevron",
    lines: [pen().M(8.5, 5).L(15.5, 12).L(8.5, 19).lines()[0]],
  },
  {
    id: "arrow",
    role: "start",
    label: "arrow",
    lines: pen().M(5, 12).L(19, 12).M(13, 6).L(19, 12).L(13, 18).lines(),
  },
  {
    id: "chevrons",
    role: "start",
    label: "double chevron",
    lines: pen().M(6, 6).L(12, 12).L(6, 18).M(12, 6).L(18, 12).L(12, 18).lines(),
  },
  // FINISH.
  {
    // Pole and a waving flag (the off-screen exit pointer's flag, K73,
    // draws the same shape).
    id: "flag",
    role: "exit",
    label: "flag",
    lines: pen()
      .M(5, 21.5)
      .L(5, 2.5)
      .M(5, 3.5)
      .C(9, 1, 14, 6.5, 19, 3.5)
      .L(19, 13.5)
      .C(14, 16.5, 9, 11, 5, 13.5)
      .lines(),
  },
  {
    id: "pennant",
    role: "exit",
    label: "pennant",
    lines: pen().M(6, 21).L(6, 3).M(6, 3.5).L(18, 8.5).L(6, 13.5).lines(),
  },
  {
    id: "star",
    role: "exit",
    label: "star",
    lines: [polygon(12, 12.9, 10, 5, UP, 4.6)],
  },
  {
    id: "cross",
    role: "exit",
    label: "x marks the spot",
    lines: pen().M(6.5, 6.5).L(17.5, 17.5).M(17.5, 6.5).L(6.5, 17.5).lines(),
  },
  // CURRENT POSITION.
  {
    // "You are here": a ring and a dot.
    id: "here",
    role: "head",
    label: "ring and dot",
    lines: [],
    rings: [[12, 12, 8.5]],
    dots: [[12, 12, 3.2]],
  },
  {
    // A standing figure (Lucide person-standing).
    id: "figure",
    role: "head",
    label: "figure",
    lines: pen()
      .M(9, 20)
      .L(12, 14)
      .L(15, 20)
      .M(6, 8)
      .L(12, 10)
      .L(18, 8)
      .M(12, 10)
      .L(12, 14)
      .lines(),
    dots: [[12, 4.6, 2.2]],
  },
  {
    // Head and shoulders (Lucide user).
    id: "user",
    role: "head",
    label: "head and shoulders",
    lines: pen()
      .M(19, 21)
      .L(19, 19)
      .A(15, 19, 4, 0, UP)
      .L(9, 15)
      .A(9, 19, 4, UP, -Math.PI)
      .L(5, 21)
      .lines(),
    rings: [[12, 7, 4]],
  },
  {
    // A map pin with a ring (Lucide map-pin).
    id: "pin",
    role: "head",
    label: "map pin",
    lines: [
      pen()
        .M(20, 10)
        .C(20, 14.993, 14.461, 20.193, 12.601, 21.799)
        .L(12, 22)
        .L(11.399, 21.799)
        .C(9.539, 20.193, 4, 14.993, 4, 10)
        .A(12, 10, 8, -Math.PI, 0)
        .lines()[0],
    ],
    rings: [[12, 10, 3]],
  },
  {
    // A locate crosshair (Lucide locate-fixed) with a dot.
    id: "locate",
    role: "head",
    label: "crosshair",
    lines: pen()
      .M(2, 12)
      .L(5, 12)
      .M(19, 12)
      .L(22, 12)
      .M(12, 2)
      .L(12, 5)
      .M(12, 19)
      .L(12, 22)
      .lines(),
    rings: [[12, 12, 7]],
    dots: [[12, 12, 2.6]],
  },
  // THE MINOTAUR (K80, a placeholder like the rest).
  {
    // A bull's head: horns sweeping up from the brow, ears, a long face
    // with a rounded muzzle, two eyes.
    id: "bull",
    role: "minotaur",
    label: "bull's head",
    lines: pen()
      .M(8.5, 8)
      .C(5.5, 8, 4, 6.5, 4, 3.5)
      .M(15.5, 8)
      .C(18.5, 8, 20, 6.5, 20, 3.5)
      .M(8, 10)
      .L(4.5, 11.5)
      .M(16, 10)
      .L(19.5, 11.5)
      .M(8, 8)
      .L(16, 8)
      .L(16, 15.5)
      .C(16, 19, 14.2, 20.5, 12, 20.5)
      .C(9.8, 20.5, 8, 19, 8, 15.5)
      .L(8, 8)
      .lines(),
    dots: [
      [10.2, 12.5, 1.1],
      [13.8, 12.5, 1.1],
    ],
  },
];

// --- Compilation into the disc frame. ---------------------------------

// The largest scale k (disc units per design unit, about the design
// center) that keeps every mark's outer edge inside 1 - MARKER_MARGIN:
// a stroked point at design distance D reaches k D + stroke/2; a dot's
// edge (design distance |c| + r) reaches k (|c| + r).
function fitScale(d: GlyphDesign): number {
  const reach = 1 - MARKER_MARGIN;
  const half = MARKER_STROKE / 2;
  let k = Infinity;
  const stroked = (dist: number): void => {
    if (dist > 1e-9) k = Math.min(k, (reach - half) / dist);
  };
  for (const l of d.lines) {
    for (let i = 0; i < l.length; i += 2) {
      stroked(Math.hypot(l[i] - 12, l[i + 1] - 12));
    }
  }
  for (const [cx, cy, r] of d.rings ?? []) {
    stroked(Math.hypot(cx - 12, cy - 12) + r);
  }
  for (const [cx, cy, r] of d.dots ?? []) {
    const dist = Math.hypot(cx - 12, cy - 12) + r;
    if (dist > 1e-9) k = Math.min(k, reach / dist);
  }
  return k;
}

export function compileGlyph(d: GlyphDesign): MarkerGlyph {
  const k = fitScale(d);
  const map = (v: number): number => (v - 12) * k;
  const lines = d.lines.map((l) => {
    const out = new Float32Array(l.length);
    for (let i = 0; i < l.length; i++) out[i] = map(l[i]);
    return out;
  });
  const triples = (list: number[][] | undefined): Float32Array => {
    const src = list ?? [];
    const out = new Float32Array(src.length * 3);
    src.forEach(([cx, cy, r], i) => {
      out[i * 3] = map(cx);
      out[i * 3 + 1] = map(cy);
      out[i * 3 + 2] = r * k;
    });
    return out;
  };
  const rings = triples(d.rings);
  const dots = triples(d.dots);
  const g: MarkerGlyph = {
    id: d.id,
    role: d.role,
    label: d.label,
    lines,
    rings,
    dots,
    extent: 0,
  };
  g.extent = glyphExtent(g);
  return g;
}

// Outermost ink of a compiled glyph (disc units from the center).
export function glyphExtent(g: MarkerGlyph): number {
  const half = MARKER_STROKE / 2;
  let e = 0;
  for (const l of g.lines) {
    for (let i = 0; i < l.length; i += 2) {
      e = Math.max(e, Math.hypot(l[i], l[i + 1]) + half);
    }
  }
  for (let i = 0; i < g.rings.length; i += 3) {
    e = Math.max(
      e,
      Math.hypot(g.rings[i], g.rings[i + 1]) + g.rings[i + 2] + half
    );
  }
  for (let i = 0; i < g.dots.length; i += 3) {
    e = Math.max(e, Math.hypot(g.dots[i], g.dots[i + 1]) + g.dots[i + 2]);
  }
  return e;
}

// Segment count the shader draws for a glyph (one per polyline chord).
export function glyphSegmentCount(g: MarkerGlyph): number {
  let n = 0;
  for (const l of g.lines) n += Math.max(0, l.length / 2 - 1);
  return n;
}

export const MARKER_GLYPHS: ReadonlyMap<string, MarkerGlyph> = new Map(
  DESIGNS.map((d) => [d.id, compileGlyph(d)])
);

// The shipped set: each role's first design.
export const DEFAULT_GLYPHS: Readonly<Record<MarkerRole, string>> = {
  start: DESIGNS.find((d) => d.role === "start")!.id,
  exit: DESIGNS.find((d) => d.role === "exit")!.id,
  head: DESIGNS.find((d) => d.role === "head")!.id,
  minotaur: DESIGNS.find((d) => d.role === "minotaur")!.id,
};

// Every glyph id of a role, the default first.
export function glyphsForRole(role: MarkerRole): string[] {
  return DESIGNS.filter((d) => d.role === role).map((d) => d.id);
}

// The glyph to draw for an id, falling back to the role's default.
export function markerGlyph(id: string, role: MarkerRole): MarkerGlyph {
  const g = MARKER_GLYPHS.get(id);
  return g && g.role === role ? g : MARKER_GLYPHS.get(DEFAULT_GLYPHS[role])!;
}

// --- SVG. --------------------------------------------------------------

const f = (v: number): string => {
  const s = v.toFixed(4);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
};

// The glyph's marks as SVG elements in the DISC frame (viewBox -1 -1 2 2,
// disc radius 1): white round-capped strokes, white dots. No disc. The dots
// say stroke="none": the off-screen indicators (K73, K148) draw the marks
// inside a group that sets its own stroke, which a bare filled dot would
// inherit (at the default width 1 in this frame: a blob the size of the
// disc - the head's dot, the bull's eyes).
export function markerGlyphSvgMarks(
  id: string,
  role: MarkerRole,
  color = "#fff"
): string {
  const g = markerGlyph(id, role);
  const paths = g.lines.map((l) => {
    let d = `M${f(l[0])} ${f(l[1])}`;
    const n = l.length / 2;
    const closed =
      n > 2 &&
      Math.abs(l[0] - l[l.length - 2]) < 1e-6 &&
      Math.abs(l[1] - l[l.length - 1]) < 1e-6;
    for (let i = 1; i < (closed ? n - 1 : n); i++) {
      d += `L${f(l[i * 2])} ${f(l[i * 2 + 1])}`;
    }
    return `<path d="${d}${closed ? "Z" : ""}"/>`;
  });
  const rings: string[] = [];
  for (let i = 0; i < g.rings.length; i += 3) {
    rings.push(
      `<circle cx="${f(g.rings[i])}" cy="${f(g.rings[i + 1])}" r="${f(g.rings[i + 2])}"/>`
    );
  }
  const dots: string[] = [];
  for (let i = 0; i < g.dots.length; i += 3) {
    dots.push(
      `<circle cx="${f(g.dots[i])}" cy="${f(g.dots[i + 1])}" r="${f(g.dots[i + 2])}"/>`
    );
  }
  return (
    `<g fill="none" stroke="${color}" stroke-width="${f(MARKER_STROKE)}" ` +
    `stroke-linecap="round" stroke-linejoin="round">${paths.join("")}${rings.join("")}</g>` +
    (dots.length ? `<g fill="${color}" stroke="none">${dots.join("")}</g>` : "")
  );
}

// The glyph's marks for any SVG frame centered on a disc, scaled so the
// outermost ink reaches radius `inkR` (strokes scale along) - e.g. the
// off-screen indicator's glyph box, whose margin rule is already applied.
export function markerGlyphSvgFit(
  id: string,
  role: MarkerRole,
  inkR: number,
  color = "#fff"
): string {
  const k = inkR / markerGlyph(id, role).extent;
  return `<g transform="scale(${f(k)})">${markerGlyphSvgMarks(id, role, color)}</g>`;
}

// A whole marker as a standalone SVG: the black disc and the glyph.
export function markerGlyphSvg(
  id: string,
  role: MarkerRole,
  sizePx = 48
): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 2 2" ` +
    `width="${sizePx}" height="${sizePx}">` +
    `<circle r="1" fill="#000"/>${markerGlyphSvgMarks(id, role)}</svg>`
  );
}
