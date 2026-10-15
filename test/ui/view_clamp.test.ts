import { describe, expect, it } from "vitest";
import {
  PANEL_GAP,
  RANGE_EASE,
  clampFitView,
  easeIntoRange,
  noAllowance,
  panRange,
} from "../../src/ui/view_clamp";
import type { FitView, OpenPanel, PanBounds } from "../../src/ui/view_clamp";

// K198: the fit camera's pan range (the open panel's widening) and the ease
// back into it.
const MAX = 8;
const ZOOMS = [1, 1.2, 1.5, 2, 3, 4, 8];

// Screens as the probes measured them (fit-screen maze right edges include
// the thread's half width and the exit disc; panel = its left edge).
interface Geo {
  name: string;
  w: number;
  h: number;
  panel: OpenPanel;
}
const DESK: Geo = { name: "1000x800", w: 1000, h: 800, panel: { left: 734, mazeRight: 868 } };
const SMALL: Geo = { name: "800x700", w: 800, h: 700, panel: { left: 534, mazeRight: 770 } };
const PHONE: Geo = { name: "phone 411x753", w: 411, h: 753, panel: { left: 81, mazeRight: 380 } };
// The maze already clears the open panel (its right edge 1099 < 1134 - 10).
const WIDE: Geo = { name: "1400x900", w: 1400, h: 900, panel: { left: 1134, mazeRight: 1099 } };
const UNDER = [DESK, SMALL, PHONE];

const view = (zoom: number, panX: number, panY: number): FitView => ({ zoom, panX, panY });
const clamped = (
  g: Geo,
  v: FitView,
  open = true,
  allow: PanBounds | null = null
): FitView => {
  clampFitView(v, g.w, g.h, MAX, open ? g.panel : null, allow);
  return v;
};
// Where the maze's right edge lands on screen.
const rightEdge = (g: Geo, v: FitView): number => v.zoom * g.panel.mazeRight + v.panX;

describe("pan range", () => {
  it("panel closed: the frame covers the screen (the rule before K149)", () => {
    for (const g of [...UNDER, WIDE]) {
      for (const z of ZOOMS) {
        const r = panRange(g.w, g.h, z, null);
        expect(r.loX).toBeCloseTo(g.w * (1 - z), 9);
        expect(r.loY).toBeCloseTo(g.h * (1 - z), 9);
        expect(r.hiX).toBe(0);
        expect(r.hiY).toBe(0);
      }
      // Zoom 1 is a single point: home.
      expect(panRange(g.w, g.h, 1, null)).toEqual({ loX: 0, hiX: 0, loY: 0, hiY: 0 });
    }
  });

  it("panel open: the left limit brings the maze's right edge PANEL_GAP left of the panel", () => {
    for (const g of UNDER) {
      for (const z of ZOOMS) {
        const r = panRange(g.w, g.h, z, g.panel);
        // The looser of the two rules.
        expect(r.loX).toBeCloseTo(
          Math.min(g.w * (1 - z), g.panel.left - PANEL_GAP - z * g.panel.mazeRight),
          9
        );
        // So at the limit the maze is out from under the panel, every zoom.
        expect(rightEdge(g, view(z, r.loX, 0))).toBeLessThanOrEqual(
          g.panel.left - PANEL_GAP + 1e-9
        );
      }
      // At zoom 1 the panel rule is the limit: exactly the gap.
      const r1 = panRange(g.w, g.h, 1, g.panel);
      expect(rightEdge(g, view(1, r1.loX, 0))).toBeCloseTo(g.panel.left - PANEL_GAP, 9);
    }
    // The phone: right edge at x 81 - 10.
    const rp = panRange(PHONE.w, PHONE.h, 1, PHONE.panel);
    expect(rightEdge(PHONE, view(1, rp.loX, 0))).toBeCloseTo(71, 9);
  });

  it("never further right than before K149, and no vertical slack", () => {
    for (const g of [...UNDER, WIDE]) {
      for (const z of ZOOMS) {
        const r = panRange(g.w, g.h, z, g.panel);
        expect(r.hiX).toBe(0);
        expect(r.hiY).toBe(0);
        expect(r.loY).toBeCloseTo(g.h * (1 - z), 9);
      }
    }
  });

  it("a maze that already clears the open panel gets nothing extra, at any zoom", () => {
    expect(panRange(WIDE.w, WIDE.h, 1, WIDE.panel)).toEqual(panRange(WIDE.w, WIDE.h, 1, null));
    for (let z = 1; z <= MAX; z += 0.13) {
      expect(panRange(WIDE.w, WIDE.h, z, WIDE.panel)).toEqual(panRange(WIDE.w, WIDE.h, z, null));
    }
    // Any maze whose right edge is already the gap clear of the panel.
    for (const w of [800, 1000, 1400, 1920]) {
      const left = w - 266;
      for (const right of [left - PANEL_GAP, left - 50, w / 2]) {
        for (let z = 1; z <= MAX; z += 0.29) {
          const open = panRange(w, 900, z, { left, mazeRight: right });
          expect(open.loX).toBeCloseTo(panRange(w, 900, z, null).loX, 9);
        }
      }
    }
  });

  it("opening the panel only widens the range (it never moves the view)", () => {
    for (const g of [...UNDER, WIDE]) {
      for (let z = 1; z <= MAX; z += 0.17) {
        const open = panRange(g.w, g.h, z, g.panel);
        const shut = panRange(g.w, g.h, z, null);
        expect(open.loX).toBeLessThanOrEqual(shut.loX);
        expect(open.hiX).toBe(shut.hiX);
        expect(open.loY).toBe(shut.loY);
        expect(open.hiY).toBe(shut.hiY);
        // So every view the closed clamp leaves alone, the open one does too.
        for (const px of [shut.loX, shut.loX / 2, 0]) {
          const v = view(z, px, shut.loY / 3);
          expect(clamped(g, { ...v })).toEqual(v);
        }
      }
    }
  });

  it("an unknown maze edge widens nothing", () => {
    expect(panRange(1000, 800, 1, { left: 734, mazeRight: NaN })).toEqual(
      panRange(1000, 800, 1, null)
    );
    expect(panRange(1000, 800, 2, { left: 734, mazeRight: -Infinity })).toEqual(
      panRange(1000, 800, 2, null)
    );
  });
});

describe("clamping a view", () => {
  it("panel closed: exactly the pre-K149 clamp, zoom 1 cannot pan", () => {
    for (const g of [DESK, PHONE]) {
      for (let z = 0.5; z <= 10; z += 0.41) {
        for (const px of [-1e5, -800, -3, 0, 3, 800, 1e5]) {
          const v = clamped(g, view(z, px, px), false);
          const zc = Math.min(MAX, Math.max(1, z));
          expect(v.zoom).toBe(zc);
          expect(v.panX).toBe(Math.min(0, Math.max(g.w * (1 - zc), px)));
          expect(v.panY).toBe(Math.min(0, Math.max(g.h * (1 - zc), px)));
        }
      }
      expect(clamped(g, view(1, -400, 300), false)).toEqual(view(1, 0, 0));
    }
  });

  it("panel open at zoom 1: left to the panel rule, never right, never vertical", () => {
    for (const g of UNDER) {
      const lim = g.panel.left - PANEL_GAP - g.panel.mazeRight;
      expect(lim).toBeLessThan(0);
      expect(clamped(g, view(1, -1e6, 0)).panX).toBeCloseTo(lim, 9);
      expect(clamped(g, view(1, lim / 2, 0)).panX).toBeCloseTo(lim / 2, 9);
      expect(clamped(g, view(1, 1e6, 0)).panX).toBe(0);
      expect(clamped(g, view(1, 0, -1e6)).panY).toBe(0);
      expect(clamped(g, view(1, 0, 1e6)).panY).toBe(0);
    }
    // The phone's maze lands at x 71 (panel at 81).
    expect(rightEdge(PHONE, clamped(PHONE, view(1, -1e6, 0)))).toBeCloseTo(71, 9);
    // A maze already clear of the panel: no pan at zoom 1.
    expect(clamped(WIDE, view(1, -1e6, 1e6))).toEqual(view(1, 0, 0));
  });

  it("clamps the zoom to [1, max], and the pan against the CLAMPED zoom", () => {
    expect(clamped(DESK, view(0.4, 0, 0)).zoom).toBe(1);
    expect(clamped(DESK, view(3, 0, 0)).zoom).toBe(3);
    const v = clamped(DESK, view(80, -1e6, 1e6));
    expect(v.zoom).toBe(MAX);
    expect(v.panX).toBeCloseTo(DESK.w * (1 - MAX), 9);
    expect(v.panY).toBe(0);
  });

  it("leaves a view inside the range alone, and is idempotent", () => {
    const inside = view(2.5, -300, -120);
    expect(clamped(DESK, { ...inside })).toEqual(inside);
    for (const open of [true, false]) {
      const once = { ...clamped(DESK, view(3, 4000, -9000), open) };
      expect(clamped(DESK, { ...once }, open)).toEqual(once);
    }
  });

  it("zooming back out about a point ends in range (zoom 1: home, panel closed)", () => {
    // placeWorldAt's arithmetic: the point under the cursor stays put, then
    // the clamp.
    const zoomAbout = (g: Geo, v: FitView, sx: number, sy: number, f: number, open: boolean) => {
      const z2 = Math.min(MAX, Math.max(1, v.zoom * f));
      v.panX = sx - ((sx - v.panX) * z2) / v.zoom;
      v.panY = sy - ((sy - v.panY) * z2) / v.zoom;
      v.zoom = z2;
      clampFitView(v, g.w, g.h, MAX, open ? g.panel : null);
    };
    for (const open of [false, true]) {
      const g = DESK;
      const v = clamped(g, view(3, -1e6, -1e6), open);
      for (let i = 0; i < 40; i++) {
        zoomAbout(g, v, 300, 500, 0.9, open);
        const r = panRange(g.w, g.h, v.zoom, open ? g.panel : null);
        expect(v.panX).toBeGreaterThanOrEqual(r.loX - 1e-9);
        expect(v.panX).toBeLessThanOrEqual(r.hiX);
        expect(v.panY).toBeGreaterThanOrEqual(r.loY - 1e-9);
        expect(v.panY).toBeLessThanOrEqual(r.hiY);
      }
      expect(v.zoom).toBe(1);
      if (!open) expect(v).toEqual(view(1, 0, 0));
      else expect(v.panX).toBeGreaterThanOrEqual(g.panel.left - PANEL_GAP - g.panel.mazeRight - 1e-9);
    }
  });
});

describe("easing back into range", () => {
  // Frames of easeIntoRange until the view is in range (or a cap).
  const ease = (g: Geo, v: FitView, open: boolean, allow: PanBounds, cap = 400): FitView[] => {
    const frames: FitView[] = [{ ...v }];
    for (let i = 0; i < cap; i++) {
      const still = easeIntoRange(v, g.w, g.h, open ? g.panel : null, allow);
      frames.push({ ...v });
      if (!still) break;
    }
    return frames;
  };

  it("closing the panel at the left limit eases in by RANGE_EASE a frame, never a snap", () => {
    for (const g of UNDER) {
      const lim = g.panel.left - PANEL_GAP - g.panel.mazeRight;
      const v = view(1, lim, 0);
      const allow = noAllowance();
      // In range while open: nothing moves, nothing allowed.
      expect(easeIntoRange(v, g.w, g.h, g.panel, allow)).toBe(false);
      expect(v.panX).toBe(lim);
      expect(allow).toEqual(noAllowance());
      // Close it.
      const frames = ease(g, v, false, allow);
      expect(frames[1].panX).toBeCloseTo(lim * (1 - RANGE_EASE), 9);
      for (let i = 1; i < frames.length; i++) {
        const before = frames[i - 1].panX;
        const step = frames[i].panX - before;
        // Inward only, no overshoot, at most RANGE_EASE of what was left
        // (the last step finishes the final half pixel).
        expect(step).toBeGreaterThanOrEqual(0);
        expect(frames[i].panX).toBeLessThanOrEqual(0);
        expect(step).toBeLessThanOrEqual(Math.max(RANGE_EASE * -before, 0.6) + 1e-9);
      }
      const last = frames[frames.length - 1];
      expect(last).toEqual(view(1, 0, 0));
      expect(allow).toEqual(noAllowance());
      // About 30-40 frames (half a second at 60 fps) from a few hundred px.
      expect(frames.length).toBeLessThan(60);
    }
  });

  it("rate 0 records the allowance without moving the view (a resize's first frame)", () => {
    const v = view(1, -144, 0);
    const allow = noAllowance();
    expect(easeIntoRange(v, DESK.w, DESK.h, null, allow, 0)).toBe(true);
    expect(v).toEqual(view(1, -144, 0));
    expect(allow.loX).toBeCloseTo(144, 9);
    // A clamp with that allowance keeps the view where it is.
    expect(clamped(DESK, { ...v }, false, allow)).toEqual(v);
  });

  it("a resize that shrinks the range holds, then eases both axes in", () => {
    // Zoom 2 at the bottom-right limit of 1000x800, then the window shrinks
    // to 800x700: the range's corner is (-800, -700).
    const v = view(2, -1000, -800);
    const allow = noAllowance();
    easeIntoRange(v, SMALL.w, SMALL.h, null, allow, 0);
    expect(v).toEqual(view(2, -1000, -800));
    const frames = ease(SMALL, v, false, allow);
    for (let i = 1; i < frames.length; i++) {
      const dx = frames[i].panX - frames[i - 1].panX;
      const dy = frames[i].panY - frames[i - 1].panY;
      expect(dx).toBeGreaterThanOrEqual(0);
      expect(dy).toBeGreaterThanOrEqual(0);
      expect(dx).toBeLessThanOrEqual(Math.max(RANGE_EASE * (-800 - frames[i - 1].panX), 0.6) + 1e-9);
      expect(dy).toBeLessThanOrEqual(Math.max(RANGE_EASE * (-700 - frames[i - 1].panY), 0.6) + 1e-9);
    }
    expect(frames[frames.length - 1]).toEqual(view(2, -800, -700));
  });

  it("a gesture mid-ease is clamped to where the ease has got to (outward held, inward free)", () => {
    const v = view(1, -144, 0);
    const allow = noAllowance();
    easeIntoRange(v, DESK.w, DESK.h, null, allow);
    const at = v.panX;
    expect(at).toBeCloseTo(-144 * (1 - RANGE_EASE), 9);
    // Dragging further out stops at the current spot: no snap, no escape.
    expect(clamped(DESK, view(1, -300, 0), false, allow).panX).toBeCloseTo(at, 9);
    // Inward moves freely, and the ease carries on from there.
    const g = clamped(DESK, view(1, -50, 0), false, allow);
    expect(g.panX).toBe(-50);
    easeIntoRange(g, DESK.w, DESK.h, null, allow);
    expect(g.panX).toBeCloseTo(-50 * (1 - RANGE_EASE), 9);
    // Vertically there was never an allowance.
    expect(clamped(DESK, view(1, -50, -30), false, allow).panY).toBe(0);
  });

  it("a view in range keeps no allowance and does not move", () => {
    const v = view(2, -300, -200);
    const allow: PanBounds = { loX: 5, hiX: 5, loY: 5, hiY: 5 };
    expect(easeIntoRange(v, DESK.w, DESK.h, DESK.panel, allow)).toBe(false);
    expect(v).toEqual(view(2, -300, -200));
    expect(allow).toEqual(noAllowance());
  });
});
