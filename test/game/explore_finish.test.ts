import { describe, it, expect } from "vitest";
import {
  EXPLORE_MARKER_VIS,
  finishHold,
  finishLifted,
  markerGapHeld,
} from "../../src/game/explore_finish";

// K465: whether the finish (the exit marker, its gap slot, its off-screen
// indicator) shows under the thread reveal. The three sites read these
// functions, so these cases are the rule.
describe("the finish under the thread reveal (K465)", () => {
  it("keeps K76 stage 2b's 0.98 test", () => {
    expect(EXPLORE_MARKER_VIS).toBe(0.98);
  });

  describe("finishLifted", () => {
    it("is the param, unless the exit's own point is burnt away", () => {
      expect(finishLifted(true, false)).toBe(true);
      expect(finishLifted(false, false)).toBe(false);
      // The burn's hold is not the reveal's: a burnt-away exit stays hidden.
      expect(finishLifted(true, true)).toBe(false);
      expect(finishLifted(false, true)).toBe(false);
    });
  });

  describe("finishHold", () => {
    it("ON: shows from the start over hidden thread", () => {
      for (const vis of [0, 0.2, 0.5, 0.979]) {
        expect(finishHold({ introMul: 1, exploreVis: vis, lifted: true })).toBe("");
      }
    });

    it("OFF: decision 6, held until the thread point is solid", () => {
      for (const vis of [0, 0.2, 0.5, 0.979]) {
        expect(finishHold({ introMul: 1, exploreVis: vis, lifted: false })).toBe(
          "exit unseen"
        );
      }
      // Solid at 0.98 and above: shown, and not sticky below it.
      expect(finishHold({ introMul: 1, exploreVis: 0.98, lifted: false })).toBe("");
      expect(finishHold({ introMul: 1, exploreVis: 1, lifted: false })).toBe("");
      expect(finishHold({ introMul: 1, exploreVis: 0.9799, lifted: false })).toBe(
        "exit unseen"
      );
    });

    it("the mode off (visibility 1) is master's answer either way", () => {
      expect(finishHold({ introMul: 1, exploreVis: 1, lifted: false })).toBe("");
      expect(finishHold({ introMul: 1, exploreVis: 1, lifted: true })).toBe("");
    });

    it("the intro reveal's own 0.98 rule still applies, lifted or not", () => {
      for (const lifted of [true, false]) {
        for (const vis of [0, 1]) {
          expect(finishHold({ introMul: 0, exploreVis: vis, lifted })).toBe(
            "exit unrevealed"
          );
          expect(finishHold({ introMul: 0.979, exploreVis: vis, lifted })).toBe(
            "exit unrevealed"
          );
          expect(finishHold({ introMul: 0.98, exploreVis: vis, lifted })).toBe(
            vis < 0.98 && !lifted ? "exit unseen" : ""
          );
        }
      }
    });

    it("checks the intro before the reveal, as the indicator always has", () => {
      expect(finishHold({ introMul: 0.5, exploreVis: 0, lifted: false })).toBe(
        "exit unrevealed"
      );
    });

    it("a burnt-away exit under the reveal stays hidden with the param on", () => {
      const lifted = finishLifted(true, true);
      expect(finishHold({ introMul: 1, exploreVis: 0, lifted })).toBe("exit unseen");
    });
  });

  describe("markerGapHeld (the marker disc's gap slot)", () => {
    it("ON: the exit's slot is not held at any visibility", () => {
      for (const vis of [0, 0.5, 0.979, 0.98, 1]) {
        expect(markerGapHeld(vis, true)).toBe(false);
      }
    });

    it("OFF (and the start's disc): held until the thread point is solid", () => {
      expect(markerGapHeld(0, false)).toBe(true);
      expect(markerGapHeld(0.979, false)).toBe(true);
      expect(markerGapHeld(0.98, false)).toBe(false);
      expect(markerGapHeld(1, false)).toBe(false);
    });

    it("the marker and its gap agree for every visibility", () => {
      for (const lifted of [true, false]) {
        for (let k = 0; k <= 100; k++) {
          const vis = k / 100;
          const hidden = finishHold({ introMul: 1, exploreVis: vis, lifted }) !== "";
          expect(markerGapHeld(vis, lifted)).toBe(hidden);
        }
      }
    });
  });
});
