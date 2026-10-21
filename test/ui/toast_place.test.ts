import { describe, expect, it } from "vitest";
import {
  TOAST_GAP,
  TOAST_TOP_MARGIN,
  bottomAnchored,
  toastBottom,
  type Box,
} from "../../src/ui/toast_place";

// K698: the toast's place. The boxes are the controls' measured rects at the
// Pixel 11's 411x753 (move_pad.ts PAD_SIZE 132 at 16 px; the scissors' and the
// walker's 48 px buttons at left 16, bottom 24) and the desktop's 1400x900.
const box = (left: number, top: number, w: number, h: number): Box => ({
  left,
  top,
  right: left + w,
  bottom: top + h,
});
const PHONE_H = 753;
const pad = box(263, 605, 132, 132);
const walk = box(16, 681, 184, 48);
const cut = box(16, 681, 106, 48);
const FLOOR = 18;

describe("toastBottom", () => {
  it("stays at the floor with nothing under it", () => {
    expect(toastBottom({ left: 100, right: 300, height: 34 }, [], PHONE_H, FLOOR)).toBe(FLOOR);
  });

  it("sits above the highest control in its column", () => {
    // A wide toast (the cut refusal) spans the scissors and the pad.
    const wide = { left: 40, right: 371, height: 34 };
    expect(toastBottom(wide, [cut, pad], PHONE_H, FLOOR)).toBe(PHONE_H - pad.top + TOAST_GAP);
    // The walker's buttons alone (no pad in walker modes, K713).
    expect(toastBottom(wide, [walk], PHONE_H, FLOOR)).toBe(PHONE_H - walk.top + TOAST_GAP);
  });

  it("ignores a control beside its column", () => {
    // A short toast centred at 205 clears the scissors (right 122) and the
    // pad (left 263).
    const short = { left: 140, right: 250, height: 34 };
    expect(toastBottom(short, [cut, pad], PHONE_H, FLOOR)).toBe(FLOOR);
    // The desktop: a centred toast never meets the far-right pad.
    const desk = { left: 470, right: 930, height: 34 };
    expect(toastBottom(desk, [box(1252, 752, 132, 132), box(16, 828, 106, 48)], 900, FLOOR)).toBe(
      FLOOR
    );
  });

  it("counts a control within the side margin", () => {
    expect(toastBottom({ left: 130, right: 257, height: 34 }, [cut, pad], PHONE_H, FLOOR)).toBe(
      PHONE_H - pad.top + TOAST_GAP
    );
  });

  it("ignores controls anchored to the top and empty boxes", () => {
    const topBanner = box(470, 14, 460, 520); // the desktop's banner, tall
    const toast = { left: 470, right: 930, height: 34 };
    expect(toastBottom(toast, [topBanner, box(500, 860, 0, 0)], 900, FLOOR)).toBe(FLOOR);
    expect(bottomAnchored(topBanner, 900)).toBe(false);
    expect(bottomAnchored(pad, PHONE_H)).toBe(true);
  });

  it("never drops below the floor or runs off the top", () => {
    const toast = { left: 40, right: 371, height: 34 };
    // A phone banner almost the whole screen tall.
    const tall = box(20, 30, 371, 709);
    expect(toastBottom(toast, [tall], PHONE_H, FLOOR)).toBe(PHONE_H - 34 - TOAST_TOP_MARGIN);
    // The safe area's floor wins over a lower control.
    expect(toastBottom(toast, [box(16, 740, 100, 10)], PHONE_H, 40)).toBe(40);
  });
});
