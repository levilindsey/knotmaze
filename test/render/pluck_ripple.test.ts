// K279 stage 2: the ripple filter's attach rules and its load warm-up.
// No GL here: these check which containers carry the filter, not pixels.
import { describe, expect, it } from "vitest";
import { Container, DOMAdapter, type Adapter } from "pixi.js";
import { PluckRipples, RIPPLE_LIFE, RIPPLE_RADIUS, discOnScreen } from "../../src/render/pluck_ripple";

// Node has no document: pixi's GlProgram asks a test canvas for the
// fragment precision, and a canvas with no context answers "mediump".
DOMAdapter.set({
  ...DOMAdapter.get(),
  createCanvas: () => ({ getContext: () => null }),
} as unknown as Adapter);

const W = 800;
const H = 600;

function setup(scale = 20) {
  const stage = new Container();
  const root = new Container();
  stage.addChild(root);
  root.scale.set(scale);
  root.position.set(0, 0);
  const ripples = new PluckRipples(root, () => ({ width: W, height: H }));
  ripples.look = "glint";
  return { stage, root, ripples };
}

describe("discOnScreen", () => {
  it("is true for a disc inside or overlapping the screen", () => {
    expect(discOnScreen(400, 300, 10, W, H)).toBe(true);
    expect(discOnScreen(-50, 300, 60, W, H)).toBe(true);
    expect(discOnScreen(W + 50, H + 50, 80, W, H)).toBe(true);
  });
  it("is false for a disc wholly past any edge (one px of slack)", () => {
    expect(discOnScreen(-50, 300, 48, W, H)).toBe(false);
    expect(discOnScreen(-50, 300, 49, W, H)).toBe(true);
    expect(discOnScreen(W + 50, 300, 48, W, H)).toBe(false);
    expect(discOnScreen(400, -50, 48, W, H)).toBe(false);
    expect(discOnScreen(400, H + 50, 48, W, H)).toBe(false);
  });
});

describe("PluckRipples attach rules (K279 stage 2)", () => {
  it("attaches the filter while an on-screen ripple lives, and drops it after", () => {
    const { root, ripples } = setup();
    expect(ripples.add(20, 15, 1)).toBe(true);
    ripples.tick(1 / 60);
    expect(root.filters?.length).toBe(1);
    ripples.tick(RIPPLE_LIFE);
    expect(ripples.activeCount).toBe(0);
    expect(root.filters ?? []).toHaveLength(0);
  });

  it("leaves a ripple whose disc cannot reach the screen out, and draws it once it can", () => {
    const { root, ripples } = setup();
    // 20 px per world: the disc reaches (3.6 + 3 x 0.9) world = 126 px at
    // most; a center 200 px left of the screen never touches it.
    ripples.add(-10, 15, 1);
    for (let i = 0; i < 20; i++) {
      ripples.tick(1 / 60);
      expect(root.filters ?? []).toHaveLength(0);
    }
    expect(ripples.activeCount).toBe(1);
    // The camera brings it on-screen: drawn again.
    root.position.set(300, 0);
    ripples.tick(1 / 60);
    expect(root.filters?.length).toBe(1);
  });

  it("keeps an on-screen ripple when another is off-screen", () => {
    const { root, ripples } = setup();
    ripples.add(-10, 15, 1);
    ripples.add(20, 15, 1);
    ripples.tick(1 / 60);
    expect(root.filters?.length).toBe(1);
    // The off-screen case above relies on this reach: 3.6 + 3 x 0.9 world.
    expect(RIPPLE_RADIUS).toBe(3.6);
  });

  it("keeps the filter attached while a ripple off-screen at birth reaches the screen", () => {
    // Center 100 px left of the screen: the disc's reach grows from
    // 3 x 0.45 x 20 = 27 px at birth past 100 px within its life.
    const { root, ripples } = setup();
    ripples.add(-5, 15, 1);
    ripples.tick(1 / 60);
    expect(root.filters ?? []).toHaveLength(0);
    let attachedAt = -1;
    for (let i = 0; i < 60 && attachedAt < 0; i++) {
      ripples.tick(1 / 60);
      if ((root.filters ?? []).length > 0) attachedAt = i;
    }
    expect(attachedAt).toBeGreaterThan(0);
  });
});

describe("PluckRipples warm-up (K279 stage 2, K289 a)", () => {
  it("puts an empty, filtered, screen-sized box on the stage for 3 ticks", () => {
    const { stage, root, ripples } = setup();
    ripples.warm(stage);
    expect(stage.children.length).toBe(2);
    const box = stage.children[1];
    expect(box.children.length).toBe(0);
    expect(box.filters?.length).toBe(1);
    expect(box.filterArea).toMatchObject({ x: 0, y: 0, width: W, height: H });
    // Not the ripples' own filter (its uniforms hold no ripple, ever).
    expect(root.filters ?? []).toHaveLength(0);
    // A second call adds nothing.
    ripples.warm(stage);
    expect(stage.children.length).toBe(2);
    ripples.tick(1 / 60);
    ripples.tick(1 / 60);
    expect(stage.children.length).toBe(2);
    ripples.tick(1 / 60);
    expect(stage.children.length).toBe(1);
    expect(stage.children[0]).toBe(root);
  });

  it("does not touch a ripple that starts during the warm-up", () => {
    const { stage, root, ripples } = setup();
    ripples.warm(stage);
    ripples.add(20, 15, 1);
    ripples.tick(1 / 60);
    expect(root.filters?.length).toBe(1);
    expect(root.filters?.[0]).not.toBe(stage.children[2]?.filters?.[0]);
  });
});
