import { describe, expect, it } from "vitest";
import { cutKeyOf } from "../../src/ui/cut_buttons";

// K114: the scissors' keys, by the typed letter (any layout's X and U).
describe("cutKeyOf", () => {
  it("names the scissors' keys", () => {
    expect(cutKeyOf({ key: "x" })).toBe("arm");
    expect(cutKeyOf({ key: "X" })).toBe("arm");
    expect(cutKeyOf({ key: "Escape" })).toBe("disarm");
    expect(cutKeyOf({ key: "u" })).toBe("undo");
    expect(cutKeyOf({ key: "U" })).toBe("undo");
  });

  it("leaves every other key alone (the moves' keys included)", () => {
    for (const key of ["z", "Z", "w", "a", "s", "d", "ArrowUp", " ", "Enter", "Backspace"]) {
      expect(cutKeyOf({ key })).toBeNull();
    }
  });
});