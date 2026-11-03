import { describe, expect, it } from "vitest";
import { blurOnPointerClick } from "../../src/ui/pointer_blur";

// K748: a pointer click blurs the button (no ring when the next key
// lands); a keyboard click (detail 0) keeps focus and ring.
type ClickFn = (event: { detail: number }) => void;

class FakeButton {
  private fns: ClickFn[] = [];
  blurs = 0;
  throws = false;

  addEventListener(type: string, fn: ClickFn): void {
    if (type === "click") this.fns.push(fn);
  }

  blur(): void {
    this.blurs++;
    if (this.throws) throw new Error("blur failed");
  }

  click(detail: number): void {
    for (const fn of [...this.fns]) fn({ detail });
  }
}

describe("blurOnPointerClick", () => {
  it("blurs on a pointer click (detail 1 or more)", () => {
    const el = new FakeButton();
    blurOnPointerClick(el as unknown as HTMLElement);
    el.click(1);
    expect(el.blurs).toBe(1);
    el.click(2);
    expect(el.blurs).toBe(2);
  });

  it("keeps focus on a keyboard click (detail 0)", () => {
    const el = new FakeButton();
    blurOnPointerClick(el as unknown as HTMLElement);
    el.click(0);
    expect(el.blurs).toBe(0);
  });

  it("does not let a throwing blur escape the listener", () => {
    const el = new FakeButton();
    el.throws = true;
    blurOnPointerClick(el as unknown as HTMLElement);
    expect(() => el.click(1)).not.toThrow();
    expect(el.blurs).toBe(1);
  });
});
