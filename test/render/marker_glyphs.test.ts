import { describe, expect, it } from "vitest";
import {
  DEFAULT_GLYPHS,
  GLYPH_MAX_CIRCLES,
  GLYPH_MAX_SEGMENTS,
  MARKER_GLYPHS,
  MARKER_MARGIN,
  MARKER_R_MIN,
  MARKER_R_PER_WIDTH,
  MARKER_STROKE,
  glyphExtent,
  glyphSegmentCount,
  glyphsForRole,
  markerGlyph,
  markerGlyphSvg,
  markerGlyphSvgFit,
  markerGlyphSvgMarks,
  markerRadiusFor,
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

  it("the shipped set: play, flag, ring and dot", () => {
    expect(DEFAULT_GLYPHS).toEqual({
      start: "play",
      exit: "flag",
      head: "here",
      minotaur: "bull",
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

  it("one marker radius: 1.5 thread widths, floored, scalable", () => {
    expect(MARKER_R_PER_WIDTH).toBe(1.5);
    expect(markerRadiusFor(0.52)).toBeCloseTo(0.78, 12);
    expect(markerRadiusFor(0.2)).toBe(MARKER_R_MIN);
    expect(markerRadiusFor(0.64, 1.25)).toBeCloseTo(1.2, 12);
    // A disc always covers its own ribbon's width.
    for (const tw of [0.15, 0.3, 0.52, 0.8]) {
      expect(markerRadiusFor(tw)).toBeGreaterThan(tw / 2);
    }
  });

  it("the minotaur (K80) wears a bull's head", () => {
    expect(glyphsForRole("minotaur")).toEqual(["bull"]);
    expect(markerGlyph("here", "minotaur").id).toBe("bull");
  });

  it("fits a glyph's outer ink to any radius (the off-screen indicator's box)", () => {
    for (const role of [...ROLES, "minotaur" as const]) {
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
    expect(here).toMatch(/<g fill="#fff"><circle /);
    expect(here.match(/<circle /g)?.length).toBe(2);
  });
});
