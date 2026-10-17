import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EDGE_MARGIN,
  HEAD_INDICATOR_KEY,
  HYSTERESIS,
  INDICATOR_EDGE,
  INDICATOR_GAP,
  INDICATOR_SCALE_MAX,
  INDICATOR_SCALE_MIN,
  INDICATOR_SIZE,
  INDICATOR_SIZE_KEY,
  MINOTAUR_INDICATOR_KEY,
  blendPlacement,
  indicatorFrame,
  invalidateSafeAreaInsets,
  safeAreaInsets,
  indicatorPrefs,
  layoutIndicators,
  offscreen,
  parseIndicatorScale,
  placeIndicator,
} from "../../src/ui/offscreen_indicators";
import type { Placement, Rect } from "../../src/ui/offscreen_indicators";

// K73: the off-screen indicators' geometry.
const VW = 1000;
const VH = 600;
// Where an indicator's center may go: the viewport inset by 31 px.
const FRAME: Rect = { left: 31, top: 31, right: VW - 31, bottom: VH - 31 };
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) < eps;
const onFrame = (x: number, y: number): boolean =>
  (near(x, FRAME.left) || near(x, FRAME.right)) && y >= FRAME.top - 1e-6 && y <= FRAME.bottom + 1e-6
    ? true
    : (near(y, FRAME.top) || near(y, FRAME.bottom)) && x >= FRAME.left - 1e-6 && x <= FRAME.right + 1e-6;
const inside = (x: number, y: number, r: Rect): boolean =>
  x > r.left && x < r.right && y > r.top && y < r.bottom;

describe("off screen", () => {
  it("counts a marker on screen only with its disc inside the margin", () => {
    const r = 10;
    expect(offscreen({ x: 500, y: 300 }, r, VW, VH, false)).toBe(false);
    // Just inside / just outside the margin, each side.
    const m = r + EDGE_MARGIN;
    for (const [x, y] of [[m, 300], [VW - m, 300], [500, m], [500, VH - m]]) {
      expect([x, y, offscreen({ x, y }, r, VW, VH, false)]).toEqual([x, y, false]);
    }
    for (const [x, y] of [[m - 1, 300], [VW - m + 1, 300], [500, m - 1], [500, VH - m + 1], [-50, -50], [VW + 400, 300]]) {
      expect([x, y, offscreen({ x, y }, r, VW, VH, false)]).toEqual([x, y, true]);
    }
  });

  it("hides a shown indicator only once the marker is well inside (hysteresis)", () => {
    const r = 10;
    const x = r + EDGE_MARGIN + HYSTERESIS / 2; // In the band.
    expect(offscreen({ x, y: 300 }, r, VW, VH, false)).toBe(false);
    expect(offscreen({ x, y: 300 }, r, VW, VH, true)).toBe(true);
    const deep = r + EDGE_MARGIN + HYSTERESIS + 1;
    expect(offscreen({ x: deep, y: 300 }, r, VW, VH, true)).toBe(false);
  });
});

describe("placement", () => {
  it("sits where the ray from the center toward the target leaves the frame", () => {
    // Straight right, straight down, up-left past the corner.
    const right = placeIndicator(FRAME, { x: 2000, y: 300 }, []);
    expect([right.x, right.y]).toEqual([FRAME.right, 300]);
    expect(near(right.angle, 0)).toBe(true);
    const down = placeIndicator(FRAME, { x: 500, y: 5000 }, []);
    expect([down.x, down.y]).toEqual([500, FRAME.bottom]);
    expect(near(down.angle, Math.PI / 2)).toBe(true);
    // A diagonal through the frame's corner lands on the corner.
    const cx = (FRAME.left + FRAME.right) / 2;
    const cy = (FRAME.top + FRAME.bottom) / 2;
    const corner = placeIndicator(
      FRAME,
      { x: cx - (cx - FRAME.left) * 3, y: cy - (cy - FRAME.top) * 3 },
      []
    );
    expect(near(corner.x, FRAME.left) && near(corner.y, FRAME.top)).toBe(true);
    // Every direction lands on the frame and aims at the target.
    for (let a = 0; a < Math.PI * 2; a += 0.137) {
      const t = { x: cx + Math.cos(a) * 3000, y: cy + Math.sin(a) * 3000 };
      const p = placeIndicator(FRAME, t, []);
      expect([a, onFrame(p.x, p.y)]).toEqual([a, true]);
      expect(near(Math.atan2(t.y - p.y, t.x - p.x), p.angle)).toBe(true);
    }
  });

  it("works for a target just past the edge, inside the frame's reach", () => {
    // The marker straddles the right edge: the ray still exits the frame
    // on the right, and the chevron aims right.
    const p = placeIndicator(FRAME, { x: VW - 5, y: 120 }, []);
    expect(near(p.x, FRAME.right)).toBe(true);
    expect(Math.abs(p.angle)).toBeLessThan(Math.PI / 2);
  });

  it("slides along the edge out of a piece of chrome, to the nearer end", () => {
    // A HUD-like box at the top-left, grown by the indicator's size: it
    // blocks the top edge up to x = 230 and the left edge down to y = 164.
    const hud: Rect = { left: -21, top: -21, right: 230, bottom: 164 };
    // Target up-left: the ray hits the top edge at x = 154, inside the box;
    // its right end (x = 230) is nearer than its far end down the left.
    const p = placeIndicator(FRAME, { x: -400, y: -400 }, [hud]);
    expect(near(p.y, FRAME.top)).toBe(true);
    expect(near(p.x, 230)).toBe(true);
    expect(inside(p.x, p.y, hud)).toBe(false);
    // The chevron still aims at the target, from where it ended up.
    expect(near(p.angle, Math.atan2(-400 - p.y, -400 - p.x))).toBe(true);
    // A hit on the left edge (y = 92) inside the box slides down past it.
    const q = placeIndicator(FRAME, { x: -400, y: -100 }, [hud]);
    expect(near(q.x, FRAME.left)).toBe(true);
    expect(near(q.y, 164)).toBe(true);
    // Without the box, both stay where the ray left the frame.
    const p0 = placeIndicator(FRAME, { x: -400, y: -400 }, []);
    expect(inside(p0.x, p0.y, hud)).toBe(true);
  });

  it("treats a box over the top-left corner as one run across the seam", () => {
    // Blocks the top edge to x = 80 and the left edge to y = 90 - one run
    // across the loop's seam (the corner).
    const box: Rect = { left: 0, top: 0, right: 80, bottom: 90 };
    // A hit on the left edge at y = 50 slides down to the box's edge.
    const p = placeIndicator(FRAME, { x: -1000, y: -500 }, [box]);
    expect([near(p.x, FRAME.left), near(p.y, 90)]).toEqual([true, true]);
    // A box reaching far along the top but little down the left: a hit on
    // the top edge near the corner crosses the corner to the free side.
    const wide: Rect = { left: 0, top: 0, right: 300, bottom: 60 };
    const q = placeIndicator(FRAME, { x: -880, y: -507 }, [wide]);
    expect([near(q.x, FRAME.left), near(q.y, 60)]).toEqual([true, true]);
    expect(inside(q.x, q.y, wide)).toBe(false);
  });

  it("keeps clear of several boxes (badge + hamburger at the top-right)", () => {
    const badge: Rect = { left: 850, top: -20, right: 1000, bottom: 80 };
    const menu: Rect = { left: 950, top: -20, right: 1050, bottom: 90 };
    const p = placeIndicator(FRAME, { x: 1400, y: -300 }, [badge, menu]);
    expect(inside(p.x, p.y, badge) || inside(p.x, p.y, menu)).toBe(false);
    expect(onFrame(p.x, p.y)).toBe(true);
  });

  it("keeps the ideal point when every edge is blocked", () => {
    const all: Rect = { left: -100, top: -100, right: VW + 100, bottom: VH + 100 };
    const p = placeIndicator(FRAME, { x: 2000, y: 300 }, [all]);
    expect([p.x, p.y]).toEqual([FRAME.right, 300]);
  });
});

describe("a frame's layout (every registered target)", () => {
  const SAFE: Rect = { left: 0, top: 0, right: 0, bottom: 0 };
  const half = INDICATOR_SIZE / 2;

  it("places only the targets off screen, on the safe frame", () => {
    const out = layoutIndicators(
      [
        { id: "finish", at: { x: 1600, y: 300 }, radius: 8, shown: false },
        { id: "minotaur", at: { x: 400, y: 300 }, radius: 8, shown: false },
      ],
      VW,
      VH,
      SAFE,
      []
    );
    expect([...out.keys()]).toEqual(["finish"]);
    const p = out.get("finish")!;
    expect(p.x).toBe(VW - INDICATOR_EDGE - half);
  });

  it("insets the frame by the safe area", () => {
    const out = layoutIndicators(
      [{ id: "finish", at: { x: 500, y: -900 }, radius: 8, shown: false }],
      VW,
      VH,
      { left: 0, top: 44, right: 0, bottom: 0 },
      []
    );
    expect(out.get("finish")!.y).toBeCloseTo(44 + INDICATOR_EDGE + half, 9);
  });

  it("keeps two targets in one direction from overlapping", () => {
    const out = layoutIndicators(
      [
        { id: "finish", at: { x: 2000, y: 300 }, radius: 8, shown: false },
        { id: "minotaur", at: { x: 2000, y: 310 }, radius: 8, shown: false },
      ],
      VW,
      VH,
      SAFE,
      []
    );
    const a = out.get("finish")!;
    const b = out.get("minotaur")!;
    // The first takes the ideal point; the second slides clear of it by
    // a disc and a gap.
    expect(a.y).toBeCloseTo(300, 6);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(INDICATOR_SIZE + INDICATOR_GAP - 1e-6);
    // ...and still aims at its own target.
    expect(near(b.angle, Math.atan2(310 - b.y, 2000 - b.x))).toBe(true);
  });

  it("keeps a shown indicator through the hysteresis band", () => {
    const r = 8;
    const x = VW - (r + EDGE_MARGIN + HYSTERESIS / 2);
    const c = { id: "finish", at: { x, y: 300 }, radius: r };
    expect(layoutIndicators([{ ...c, shown: false }], VW, VH, SAFE, []).size).toBe(0);
    expect(layoutIndicators([{ ...c, shown: true }], VW, VH, SAFE, []).size).toBe(1);
  });
});

// K198 stage 2: the size setting, the panel's slide and the stored prefs.
describe("the size setting", () => {
  const SAFE: Rect = { left: 0, top: 0, right: 0, bottom: 0 };

  it("the default size keeps today's frame", () => {
    expect(indicatorFrame(VW, VH, SAFE)).toEqual(FRAME);
    expect(indicatorFrame(VW, VH, SAFE, INDICATOR_SIZE)).toEqual(FRAME);
  });

  it("a bigger disc sits further in, the same distance from the edge", () => {
    for (const k of [INDICATOR_SCALE_MIN, 1, 1.5, INDICATOR_SCALE_MAX]) {
      const size = INDICATOR_SIZE * k;
      const out = layoutIndicators(
        [{ id: "finish", at: { x: 1600, y: 300 }, radius: 8, shown: false }],
        VW, VH, SAFE, [], size
      );
      expect(out.get("finish")!.x).toBeCloseTo(VW - INDICATOR_EDGE - size / 2, 9);
    }
  });

  it("two indicators keep a disc and a gap apart at any size", () => {
    for (const k of [INDICATOR_SCALE_MIN, 1, INDICATOR_SCALE_MAX]) {
      const size = INDICATOR_SIZE * k;
      const out = layoutIndicators(
        [
          { id: "finish", at: { x: 2000, y: 300 }, radius: 8, shown: false },
          { id: "minotaur", at: { x: 2000, y: 310 }, radius: 8, shown: false },
        ],
        VW, VH, SAFE, [], size
      );
      const a = out.get("finish")!;
      const b = out.get("minotaur")!;
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(size + INDICATOR_GAP - 1e-6);
    }
  });
});

describe("the panel's slide (blendPlacement)", () => {
  const target = { x: 2000, y: -400 };
  const aim = (x: number, y: number): number => Math.atan2(target.y - y, target.x - x);
  // Without the panel: on the right edge; with it: on the top edge, near
  // the top-right corner (the shorter way is round that corner).
  const a: Placement = { x: FRAME.right, y: 200, angle: aim(FRAME.right, 200) };
  const b: Placement = { x: 700, y: FRAME.top, angle: aim(700, FRAME.top) };

  it("is the place without the panel at 0 and with it at 1", () => {
    expect(blendPlacement(FRAME, a, b, 0, target)).toEqual(a);
    expect(blendPlacement(FRAME, a, b, 1, target)).toEqual(b);
  });

  it("slides along the frame, the shorter way, at an even pace", () => {
    const pts = [0.1, 0.25, 0.5, 0.75, 0.9].map((t) => blendPlacement(FRAME, a, b, t, target));
    for (const p of pts) {
      expect(onFrame(p.x, p.y)).toBe(true);
      // Round the top-right corner, never via the bottom.
      expect(p.x).toBeGreaterThanOrEqual(700 - 1e-6);
      expect(p.y).toBeLessThanOrEqual(200 + 1e-6);
      expect(near(p.angle, aim(p.x, p.y))).toBe(true);
    }
    // Arc length from a: (200 - 31) down the right edge, (969 - 700)
    // along the top; t of the way.
    const total = 200 - FRAME.top + FRAME.right - 700;
    const at = (t: number): number => {
      const p = blendPlacement(FRAME, a, b, t, target);
      return near(p.x, FRAME.right) ? 200 - p.y : 200 - FRAME.top + (FRAME.right - p.x);
    };
    for (const t of [0.1, 0.5, 0.9]) expect(at(t)).toBeCloseTo(total * t, 6);
  });

  it("takes the shorter way across the top-left seam too", () => {
    const l: Placement = { x: FRAME.left, y: 100, angle: 0 };
    const r: Placement = { x: 100, y: FRAME.top, angle: 0 };
    for (const t of [0.2, 0.5, 0.8]) {
      const p = blendPlacement(FRAME, l, r, t, target);
      expect(onFrame(p.x, p.y)).toBe(true);
      expect(p.x).toBeLessThanOrEqual(100 + 1e-6);
      expect(p.y).toBeLessThanOrEqual(100 + 1e-6);
    }
  });
});

describe("the stored indicator settings", () => {
  it("defaults: both switches on, the size 1", () => {
    expect(indicatorPrefs(() => null)).toEqual({ head: true, minotaur: true, scale: 1 });
  });

  it("reads each key on its own", () => {
    const store: Record<string, string> = {
      [HEAD_INDICATOR_KEY]: "0",
      [MINOTAUR_INDICATOR_KEY]: "1",
      [INDICATOR_SIZE_KEY]: "1.5",
    };
    expect(indicatorPrefs((k) => store[k] ?? null)).toEqual({ head: false, minotaur: true, scale: 1.5 });
    expect(indicatorPrefs((k) => (k === MINOTAUR_INDICATOR_KEY ? "0" : null))).toEqual({
      head: true,
      minotaur: false,
      scale: 1,
    });
  });

  it("a stored size is clamped to the slider and kept to 2 decimals", () => {
    expect(parseIndicatorScale(null)).toBe(1);
    expect(parseIndicatorScale("")).toBe(1);
    expect(parseIndicatorScale("big")).toBe(1);
    expect(parseIndicatorScale("Infinity")).toBe(1);
    expect(parseIndicatorScale("0.1")).toBe(INDICATOR_SCALE_MIN);
    expect(parseIndicatorScale("9")).toBe(INDICATOR_SCALE_MAX);
    expect(parseIndicatorScale("1.234")).toBe(1.23);
    expect(parseIndicatorScale("0.6")).toBe(0.6);
  });
});

// K373: the safe-area probe forces layout, so its result is cached
// until invalidated (a resize), not re-read on every call.
describe("safeAreaInsets (K373)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads the probe once until invalidated", () => {
    let reads = 0;
    vi.stubGlobal("document", {
      createElement: () => ({ style: { cssText: "" } }),
      body: { appendChild: () => {} },
    });
    vi.stubGlobal("getComputedStyle", () => {
      reads++;
      return {
        paddingTop: "1px",
        paddingRight: "2px",
        paddingBottom: "3px",
        paddingLeft: "4px",
      };
    });
    invalidateSafeAreaInsets();
    expect(safeAreaInsets()).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    expect(safeAreaInsets()).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    expect(reads).toBe(1);
    invalidateSafeAreaInsets();
    safeAreaInsets();
    expect(reads).toBe(2);
  });
});
