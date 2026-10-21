import { describe, expect, it } from "vitest";
import {
  DEFAULT_GLYPHS,
  GLYPH_MAX_CIRCLES,
  GLYPH_MAX_SEGMENTS,
  MARKER_GLYPHS,
  MARKER_DOT_MIN_TW,
  MARKER_MARGIN,
  MARKER_RING_TW,
  MARKER_SIZE_DEFAULT,
  MARKER_SIZE_MAX,
  MARKER_SIZE_MIN,
  MARKER_STROKE,
  glyphExtent,
  glyphSegmentCount,
  glyphsForRole,
  markerDotRadiusFor,
  markerGlyph,
  markerGlyphSvg,
  markerGlyphSvgFit,
  markerGlyphSvgMarks,
  markerRadiusFor,
  sanitizeMarkerSize,
} from "../../src/render/marker_glyphs";
import type { MarkerRole } from "../../src/render/marker_glyphs";

const ROLES: MarkerRole[] = ["start", "exit", "head"];

describe("marker glyphs (K83)", () => {
  it("the margin to the rim is one stroke width", () => {
    expect(MARKER_MARGIN).toBe(MARKER_STROKE);
  });

  it("every glyph's outermost ink sits exactly one margin inside the rim", () => {
    for (const g of MARKER_GLYPHS.values()) {
      expect(g.extent, g.id).toBeCloseTo(1 - MARKER_MARGIN, 6);
      expect(glyphExtent(g), g.id).toBeCloseTo(g.extent, 9);
    }
  });

  it("no mark comes closer to the rim than the margin", () => {
    // Every chord, circle and dot, sampled along its whole length.
    const reach = 1 - MARKER_MARGIN + 1e-6;
    const half = MARKER_STROKE / 2;
    for (const g of MARKER_GLYPHS.values()) {
      for (const l of g.lines) {
        for (let i = 0; i + 3 < l.length; i += 2) {
          for (let t = 0; t <= 1; t += 0.125) {
            const x = l[i] + (l[i + 2] - l[i]) * t;
            const y = l[i + 1] + (l[i + 3] - l[i + 1]) * t;
            expect(Math.hypot(x, y) + half, g.id).toBeLessThanOrEqual(reach);
          }
        }
      }
      for (let i = 0; i < g.rings.length; i += 3) {
        const c = Math.hypot(g.rings[i], g.rings[i + 1]);
        expect(c + g.rings[i + 2] + half, g.id).toBeLessThanOrEqual(reach);
        // A ring keeps an open middle (it is a stroke, not a disc).
        expect(g.rings[i + 2], g.id).toBeGreaterThan(half);
      }
      for (let i = 0; i < g.dots.length; i += 3) {
        const c = Math.hypot(g.dots[i], g.dots[i + 1]);
        expect(c + g.dots[i + 2], g.id).toBeLessThanOrEqual(reach);
      }
    }
  });

  it("the shader can draw every glyph", () => {
    for (const g of MARKER_GLYPHS.values()) {
      expect(glyphSegmentCount(g), g.id).toBeGreaterThanOrEqual(0);
      expect(glyphSegmentCount(g), g.id).toBeLessThanOrEqual(GLYPH_MAX_SEGMENTS);
      expect((g.rings.length + g.dots.length) / 3, g.id).toBeLessThanOrEqual(
        GLYPH_MAX_CIRCLES
      );
      expect(
        glyphSegmentCount(g) + g.rings.length + g.dots.length,
        `${g.id} draws something`
      ).toBeGreaterThan(0);
      for (const l of g.lines) {
        expect(l.length % 2, g.id).toBe(0);
        expect(l.length, g.id).toBeGreaterThanOrEqual(4);
        for (const v of l) expect(Number.isFinite(v), g.id).toBe(true);
      }
    }
  });

  it("the shipped set: play, flag, ring and dot, horns, spider, sword, tick", () => {
    expect(DEFAULT_GLYPHS).toEqual({
      start: "play",
      exit: "flag",
      head: "here",
      minotaur: "horns",
      spider: "spider",
      sword: "sword",
      tick: "tick",
    });
    for (const role of ROLES) {
      const ids = glyphsForRole(role);
      expect(ids[0]).toBe(DEFAULT_GLYPHS[role]);
      expect(ids.length, role).toBeGreaterThanOrEqual(3);
      for (const id of ids) expect(MARKER_GLYPHS.get(id)!.role).toBe(role);
    }
  });

  it("the play triangle is centered (its centroid on the disc center)", () => {
    const l = MARKER_GLYPHS.get("play")!.lines[0];
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < 6; i += 2) {
      cx += l[i] / 3;
      cy += l[i + 1] / 3;
    }
    expect(Math.abs(cx)).toBeLessThan(1e-6);
    expect(Math.abs(cy)).toBeLessThan(1e-6);
    // It points right.
    expect(l[0]).toBeCloseTo(1 - MARKER_MARGIN - MARKER_STROKE / 2, 6);
  });

  it("an unknown or foreign id falls back to the role's default", () => {
    expect(markerGlyph("nope", "start").id).toBe("play");
    expect(markerGlyph("flag", "head").id).toBe("here");
    expect(markerGlyph("pennant", "exit").id).toBe("pennant");
  });

  it("one marker size (K98): the disc's diameter in thread widths", () => {
    expect([MARKER_SIZE_MIN, MARKER_SIZE_DEFAULT, MARKER_SIZE_MAX]).toEqual([
      0.25, 2, 3,
    ]);
    // The default (K225: 2; 1.08 until then) is a disc two thread widths
    // across: radius 1 tw. K98's old default was the pre-K83 head dot,
    // radius 0.54 tw.
    expect(markerRadiusFor(1)).toBeCloseTo(1, 12);
    expect(markerRadiusFor(1, 1.08)).toBeCloseTo(0.54, 12);
    expect(markerRadiusFor(0.52)).toBeCloseTo(0.52, 12);
    expect(markerRadiusFor(0.52, 1.08)).toBeCloseTo(0.2808, 12);
    expect(markerRadiusFor(0.52, 0.25)).toBeCloseTo(0.065, 12);
    expect(markerRadiusFor(0.52, 3)).toBeCloseTo(0.78, 12);
    // Clamped to the slider's range; garbage reads as the default.
    expect(markerRadiusFor(1, 0.1)).toBeCloseTo(0.125, 12);
    expect(markerRadiusFor(1, 9)).toBeCloseTo(1.5, 12);
    expect(markerRadiusFor(1, Number.NaN)).toBeCloseTo(1, 12);
    expect(sanitizeMarkerSize(Number.POSITIVE_INFINITY)).toBe(MARKER_SIZE_DEFAULT);
    expect(sanitizeMarkerSize(-2)).toBe(MARKER_SIZE_MIN);
    expect(sanitizeMarkerSize(2)).toBe(2);
    // The probe hook's scale multiplies.
    expect(markerRadiusFor(0.64, 2, 1.25)).toBeCloseTo(0.8, 12);
    // No floor: the size is relative to the thread width alone.
    expect(markerRadiusFor(0.01, 3)).toBeCloseTo(0.015, 12);
  });

  it("the start and finish dots ring the disc at every size (K98)", () => {
    expect([MARKER_DOT_MIN_TW, MARKER_RING_TW]).toEqual([0.95, 0.41]);
    const tw = 0.52;
    // [size, dot radius, rim beyond the icon disc], both in thread widths.
    const cases: Array<[number, number, number]> = [
      [0.25, 0.95, 0.825],
      // K98's default (1.08): exactly the pre-K83 pair, a 0.95 tw colored
      // disc around the head's 0.54 tw dot.
      [1.08, 0.95, 0.41],
      // The default since K225: a 1.41 tw colored dot around the 1 tw disc.
      [MARKER_SIZE_DEFAULT, 1.41, 0.41],
      [3, 1.91, 0.41],
    ];
    for (const [size, dotTw, rimTw] of cases) {
      const R = markerDotRadiusFor(tw, size);
      const r = markerRadiusFor(tw, size);
      expect(R / tw, `size ${size}`).toBeCloseTo(dotTw, 9);
      expect((R - r) / tw, `size ${size}`).toBeCloseTo(rimTw, 9);
    }
    // Across the whole range the colored dot reaches past its own thread's
    // edge and shows at least the rim around the icon disc.
    for (let s = MARKER_SIZE_MIN; s <= MARKER_SIZE_MAX + 1e-9; s += 0.05) {
      const R = markerDotRadiusFor(tw, s);
      expect(R, `size ${s}`).toBeGreaterThan(tw / 2);
      expect(R - markerRadiusFor(tw, s), `size ${s}`).toBeGreaterThanOrEqual(
        MARKER_RING_TW * tw - 1e-12
      );
    }
    // The probe hook's scale multiplies the dot too.
    expect(markerDotRadiusFor(tw, 3, 1.25)).toBeCloseTo(1.91 * tw * 1.25, 9);
  });

  it("the minotaur (K80) wears Taurus horns (K98); the bull's head stays", () => {
    expect(glyphsForRole("minotaur")).toEqual(["horns", "bull"]);
    expect(markerGlyph("here", "minotaur").id).toBe("horns");
    expect(markerGlyph("bull", "minotaur").id).toBe("bull");
    // Two marks: the crescent of horns and the ring of the head.
    const g = MARKER_GLYPHS.get("horns")!;
    expect([g.lines.length, g.rings.length / 3, g.dots.length / 3]).toEqual([1, 1, 0]);
  });

  it("the spider (K98, for K114): a two-dot body and eight mirrored legs", () => {
    expect(glyphsForRole("spider")).toEqual(["spider"]);
    expect(markerGlyph("here", "spider").id).toBe("spider");
    const g = MARKER_GLYPHS.get("spider")!;
    expect([g.lines.length, g.rings.length / 3, g.dots.length / 3]).toEqual([8, 0, 2]);
    // Each left leg's mirror image about the vertical axis is the next leg.
    for (let i = 0; i < 8; i += 2) {
      const a = g.lines[i];
      const b = g.lines[i + 1];
      expect(b.length).toBe(a.length);
      for (let j = 0; j < a.length; j += 2) {
        expect(b[j]).toBeCloseTo(-a[j], 6);
        expect(b[j + 1]).toBeCloseTo(a[j + 1], 6);
      }
    }
  });

  it("the sword (K137 stage 3b): blade, guard, grip and a pommel dot, on the center line", () => {
    expect(glyphsForRole("sword")).toEqual(["sword"]);
    expect(markerGlyph("here", "sword").id).toBe("sword");
    const g = MARKER_GLYPHS.get("sword")!;
    expect([g.lines.length, g.rings.length / 3, g.dots.length / 3]).toEqual([3, 0, 1]);
    // Symmetric about the vertical axis: the blade's x values pair up.
    const xs = Array.from(g.lines[0]).filter((_, i) => i % 2 === 0);
    expect(xs[0]).toBeCloseTo(-xs[4], 6);
    expect(xs[2]).toBeCloseTo(0, 6);
    expect(g.dots[0]).toBeCloseTo(0, 6);
  });

  it("the chalk tick (K137 stage 2): one stroke of two legs", () => {
    expect(glyphsForRole("tick")).toEqual(["tick"]);
    expect(markerGlyph("here", "tick").id).toBe("tick");
    const g = MARKER_GLYPHS.get("tick")!;
    expect([g.lines.length, g.rings.length / 3, g.dots.length / 3]).toEqual([1, 0, 0]);
    expect(g.lines[0].length).toBe(6);
  });

  it("fits a glyph's outer ink to any radius (the off-screen indicator's box)", () => {
    for (const role of [...ROLES, "minotaur" as const, "spider" as const, "sword" as const, "tick" as const]) {
      const id = DEFAULT_GLYPHS[role];
      const svg = markerGlyphSvgFit(id, role, 10.75);
      const k = Number(svg.match(/^<g transform="scale\(([\d.]+)\)">/)![1]);
      expect(k * markerGlyph(id, role).extent).toBeCloseTo(10.75, 3);
      expect(svg).toContain(markerGlyphSvgMarks(id, role));
      expect(svg.endsWith("</g>")).toBe(true);
    }
  });

  it("writes SVG in the disc frame", () => {
    const svg = markerGlyphSvg("flag", "exit", 64);
    expect(svg).toMatch(/^<svg [^>]*viewBox="-1 -1 2 2"[^>]*width="64"/);
    expect(svg).toContain('<circle r="1" fill="#000"/>');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain(`stroke-width="${MARKER_STROKE}"`);
    // Two open polylines: the pole and the flag.
    expect(svg.match(/<path /g)?.length).toBe(2);
    expect(svg).not.toMatch(/NaN|undefined/);
    // A closed polyline closes with Z; dots are filled circles.
    expect(markerGlyphSvgMarks("play", "start")).toMatch(/Z"\/>/);
    const here = markerGlyphSvgMarks("here", "head");
    expect(here).toMatch(/<g fill="#fff" stroke="none"><circle /);
    expect(here.match(/<circle /g)?.length).toBe(2);
    // K148: a dot never inherits a stroke from the group it is drawn in
    // (the indicator's icon group sets one): the head's dot and the bull's
    // eyes were disc-sized white blobs without this.
    for (const [id, role] of [
      ["here", "head"],
      ["bull", "minotaur"],
      ["spider", "spider"],
    ] as const) {
      const marks = markerGlyphSvgMarks(id, role);
      const dotsGroup = marks.match(/<g fill="#fff"[^>]*>/)![0];
      expect(dotsGroup).toContain('stroke="none"');
    }
  });
});
