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

// "minotaur": K80's real-time chaser (drawn only in that mode). "spider":
// K114's spider (K98 landed the glyph and the role); K137 stage 3d's
// follower wears it while it walks (fabric_maze_renderer.ts syncExtras).
// "sword": K137 stage 3b's sword, at its spot until the player takes it.
// "key" and "lock": K138 stage 4's keys (at their junctions until taken)
// and locks (on the runs into the exit while a key is missing).
export type MarkerRole =
  | "start"
  | "exit"
  | "head"
  | "minotaur"
  | "spider"
  | "sword"
  | "tick"
  | "chevron"
  | "key"
  | "lock";

// Stroke width and rim margin, in disc radii. The margin equals the stroke
// (the brief); the outer ink therefore reaches radius 1 - MARKER_MARGIN.
export const MARKER_STROKE = 0.15;
export const MARKER_MARGIN = MARKER_STROKE;

// Shader capacity (marker_mesh.ts declares the same arrays).
export const GLYPH_MAX_SEGMENTS = 64;
export const GLYPH_MAX_CIRCLES = 8;

// THE MARKER SIZE (K98; Levi, 2026-10-13: a slider for the player's dot
// "diameter relative to the thread width", 0.25 to 3, and the start, the
// finish and the other in-game icons the player's size). `markerSize` (the
// mks param) is the black disc's DIAMETER in thread widths, for every
// marker. The default is the pre-K83 head dot (radius 0.54 tw); K83's discs
// were 3 tw across (max(0.55, 1.5 tw) in radius), so the default shrank.
// The radius is purely relative to the thread width, with no world or
// screen floor, so the slider means the same at every zoom. Anything that
// needs a marker's size (the off-screen indicators, the confetti) reads
// markerRadiusFor or the fabric renderer's markerRadius(), never a copy.
// K225 (Levi, 2026-10-20): the default is 2 (it was 1.08, the pre-K83 head
// dot), so the disc is twice a thread's width and its glyph reads.
export const MARKER_SIZE_DEFAULT = 2;
export const MARKER_SIZE_MIN = 0.25;
export const MARKER_SIZE_MAX = 3;

// A size from a link or a probe: garbage reads as the default, anything
// else clamps to [MARKER_SIZE_MIN, MARKER_SIZE_MAX].
export function sanitizeMarkerSize(size: number): number {
  if (!Number.isFinite(size)) return MARKER_SIZE_DEFAULT;
  return Math.min(MARKER_SIZE_MAX, Math.max(MARKER_SIZE_MIN, size));
}

// The black disc's radius (world units). `scale` is the K83 probe hook's
// extra multiplier (FabricMazeRenderer.setMarkerStyle).
export function markerRadiusFor(
  threadWidth: number,
  size = MARKER_SIZE_DEFAULT,
  scale = 1
): number {
  return (sanitizeMarkerSize(size) / 2) * threadWidth * scale;
}

// THE COLORED DOT (K98; Levi: "I still want colored dots at the start and
// end, and with the default diameter showing some of the colored dot around
// the icon dot"). The start and the finish sit on a dot of their thread's
// section color, larger than the icon disc. The call: the dot's radius is
// max(MARKER_DOT_MIN_TW, icon radius + MARKER_RING_TW) thread widths. It
// never drops below the pre-K83 start/finish disc (0.95 tw, nearly twice
// the thread's half-width, so the color always shows beyond the thread it
// ends), and once the icon disc outgrows it, a constant 0.41 tw rim shows
// around the disc. The two meet at size 1.08 (0.54 + 0.41 = 0.95), where
// the look is exactly the pre-K83 pair: a 0.95 tw colored disc and the
// head's 0.54 tw dot (K98's default; K225's default is 2, dot radius 1.41
// tw). Rim width: 0.825 tw at size 0.25, 0.41 tw from size 1.08 to 3 (dot
// radius 1.91 tw there). A rim proportional to the icon (R = 1.76 r) would
// sink under the thread's own width below size 0.57 and grow to 1.14 tw
// blobs at 3.
export const MARKER_DOT_MIN_TW = 0.95;
export const MARKER_RING_TW = 0.41;
export function markerDotRadiusFor(
  threadWidth: number,
  size = MARKER_SIZE_DEFAULT,
  scale = 1
): number {
  const r = markerRadiusFor(threadWidth, size, scale);
  const tw = threadWidth * scale;
  return Math.max(MARKER_DOT_MIN_TW * tw, r + MARKER_RING_TW * tw);
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
  {
    // K80 turns 3a: an hourglass, the WAIT cue - the head wears it while the
    // pointer is in the wait zone (main.ts setWaitCue), and the move pad's
    // wait button draws the same shape. Not a pick for the head's look.
    id: "hourglass",
    role: "head",
    label: "hourglass (wait)",
    lines: pen()
      .M(6, 3)
      .L(18, 3)
      .M(6, 21)
      .L(18, 21)
      .M(8, 3)
      .L(8, 7)
      .L(16, 17)
      .L(16, 21)
      .M(16, 3)
      .L(16, 7)
      .L(8, 17)
      .L(8, 21)
      .lines(),
  },
  // THE MINOTAUR (K80, a placeholder like the rest).
  {
    // K98 (Levi: "simple minotaur and spider icons"): the Taurus sign - a
    // ring for the head under a crescent of horns whose tips curl in, the
    // crescent's foot on the ring. Two marks, so it still reads at the
    // default size, where the whole disc is about 5 CSS px across on the
    // phone. Laid out so the horn tips and the ring's foot sit equally far
    // from the center (the fit is radial).
    id: "horns",
    role: "minotaur",
    label: "horns (Taurus)",
    lines: [
      pen()
        .M(12 + 6.5 * Math.cos(-0.35), 6.3 + 6.5 * Math.sin(-0.35))
        .A(12, 6.3, 6.5, -0.35, Math.PI + 0.35)
        .lines()[0],
    ],
    rings: [[12, 17.4, 4.6]],
  },
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
  // THE SPIDER (K98, ready for K114's spider; nothing draws it yet).
  {
    // A body of two dots (head and abdomen) and eight legs, four a side,
    // each bent once at the knee: the front pair reaches up, the back pair
    // down.
    id: "spider",
    role: "spider",
    label: "spider",
    lines: spiderLegs([
      [10.4, 9.6, 7, 6.5, 5.5, 2.5],
      [10.2, 11, 5.5, 9.5, 3, 6.5],
      [10.2, 12.4, 5.5, 13.5, 3, 17],
      [10.6, 13.6, 7, 17.5, 5.5, 21.5],
    ]),
    dots: [
      [12, 9.4, 2.1],
      [12, 14.6, 3.4],
    ],
  },
  // THE SWORD (K137 stage 3b): a placeholder like the rest.
  {
    // Point up: a blade tapering to its tip, a crossguard, the grip and a
    // pommel dot, on the frame's center line.
    id: "sword",
    role: "sword",
    label: "sword",
    lines: pen()
      .M(10.6, 14.6)
      .L(10.6, 5.2)
      .L(12, 2.6)
      .L(13.4, 5.2)
      .L(13.4, 14.6)
      .M(7.4, 14.8)
      .L(16.6, 14.8)
      .M(12, 15)
      .L(12, 19.4)
      .lines(),
    dots: [[12, 20.6, 1.4]],
  },
  {
    // K137 stage 2: a CHALK TICK, a junction the player marked (the chalk
    // button or C); a placeholder for Levi to replace.
    id: "tick",
    role: "tick",
    label: "chalk tick",
    lines: pen().M(5.2, 12.6).L(10, 17.4).L(18.8, 7.2).lines(),
  },
  {
    // K138 stage 3: a ONE-WAY CHEVRON, pointing +x (the renderer turns the
    // mesh along the run's way); a placeholder for Levi to replace.
    id: "oneway",
    role: "chevron",
    label: "one-way chevron",
    lines: pen().M(8.4, 5.4).L(15.6, 12).L(8.4, 18.6).lines(),
  },
  {
    // K138 stage 4: a KEY lying flat, its bow on the left and two teeth
    // under the shaft's far end; a placeholder for Levi to replace.
    id: "key",
    role: "key",
    label: "key",
    lines: pen().M(10.6, 12).L(19.4, 12).M(15.6, 12).L(15.6, 15.2).M(19.4, 12).L(19.4, 15.8).lines(),
    rings: [[7, 12, 3.6]],
  },
  {
    // K138 stage 4: a PADLOCK, a shackle over the body and a keyhole dot;
    // a placeholder for Levi to replace.
    id: "padlock",
    role: "lock",
    label: "padlock",
    lines: pen()
      .M(8.6, 11)
      .L(8.6, 8)
      .L(9.06, 6.3)
      .L(10.3, 5.06)
      .L(12, 4.6)
      .L(13.7, 5.06)
      .L(14.94, 6.3)
      .L(15.4, 8)
      .L(15.4, 11)
      .M(6.4, 11)
      .L(17.6, 11)
      .L(17.6, 19.6)
      .L(6.4, 19.6)
      .L(6.4, 11)
      .lines(),
    dots: [[12, 15.2, 1.5]],
  },
];

// Legs given for the left side (hip, knee, foot), mirrored to the right
// about the frame's center line.
function spiderLegs(left: number[][]): number[][] {
  const out: number[][] = [];
  for (const [hx, hy, kx, ky, fx, fy] of left) {
    out.push([hx, hy, kx, ky, fx, fy]);
    out.push([24 - hx, hy, 24 - kx, ky, 24 - fx, fy]);
  }
  return out;
}

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
  spider: DESIGNS.find((d) => d.role === "spider")!.id,
  sword: DESIGNS.find((d) => d.role === "sword")!.id,
  tick: DESIGNS.find((d) => d.role === "tick")!.id,
  chevron: DESIGNS.find((d) => d.role === "chevron")!.id,
  key: DESIGNS.find((d) => d.role === "key")!.id,
  lock: DESIGNS.find((d) => d.role === "lock")!.id,
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
