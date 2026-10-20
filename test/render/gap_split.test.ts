// K320 stage 2a: the gap pre-pass data plane's pure parts (no GL): the
// mask texel encode/decode, the pinned Y flip, the dirty-rule truth table,
// the fallback registry selection, and the gap program texts (the search
// unedited, no paint chunk, budgets). The GPU parity proof (mask readback
// vs the in-shader gapKeep, 0 texels) is the browser probe's, not this
// file's. Brief: docs/design/K320_stage2.md sections 3.2, 5, 6 (2a), 9.
import { describe, expect, it } from "vitest";
import { Container, DOMAdapter, Mesh, MeshGeometry, Texture, type Adapter } from "pixi.js";
import {
  GAP_MASK_FLIP_Y,
  GAP_PREPASS_STATS,
  clearGapScene,
  detectGapSplit,
  ensureGapMaskSize,
  gapKeepFromMask,
  gapMaskChain,
  gapMaskDirty,
  gapMaskEncode,
  gapMaskPixelSize,
  gapMaskTexel,
  gapMaskTexture,
  gapSplitSupported,
  registerGapScene,
  renderGapMask,
  type GapDirtyInputs,
  type GapSceneSource,
} from "../../src/render/gap_prepass";
import { gapMaskUniforms, gapSplitActive, setGapSplitActive } from "../../src/render/fabric_sdf";
import { GAP_ONLY_FRAG, gapOnlyFragExplore } from "../../src/render/ribbon/ribbon_shader";
import { programRegistry, type WarmContext } from "../../src/render/program_registry";

describe("gap mask texel encode/decode", () => {
  it("round-trips keep and chain, including chain 0", () => {
    for (const chain of [0, 1, 2, 63, 511]) {
      const texel = gapMaskEncode(0.375, chain);
      expect(texel).toEqual([0.375, chain + 1, 0, 1]);
      expect(gapMaskChain(texel)).toBe(chain);
    }
    expect(gapMaskEncode(1, 0)).toEqual([1, 1, 0, 1]);
    expect(gapMaskEncode(0, 0)).toEqual([0, 1, 0, 1]);
  });

  it("an empty texel (the clear) has no owner", () => {
    expect(gapMaskChain([0, 0, 0, 0])).toBe(-1);
    expect(gapMaskChain(gapMaskEncode(0.5, 0))).toBe(0);
  });
});

describe("gap mask sampler (paint twin, brief 3.3)", () => {
  it("applies the stored keep only to its owner texel", () => {
    expect(gapKeepFromMask(gapMaskEncode(0.25, 3), 3)).toBe(0.25);
    expect(gapKeepFromMask(gapMaskEncode(0.25, 3), 2)).toBe(1.0);
    expect(gapKeepFromMask([0, 0, 0, 0], 0)).toBe(1.0);
    expect(gapKeepFromMask(gapMaskEncode(0, 0), 0)).toBe(0);
    expect(gapKeepFromMask(gapMaskEncode(1, 0), 0)).toBe(1);
  });
});

describe("gap mask Y orientation (pinned, brief 3.3)", () => {
  it("mirrors the row: Pixi flips render-target projections", () => {
    expect(GAP_MASK_FLIP_Y).toBe(true);
    expect(gapMaskTexel(3, 0, 100)).toEqual([3, 99]);
    expect(gapMaskTexel(3, 99, 100)).toEqual([3, 0]);
    expect(gapMaskTexel(7, 41, 42)).toEqual([7, 0]);
    expect(gapMaskTexel(0, 0, 1)).toEqual([0, 0]);
  });
});

describe("gap pre-pass dirty rule", () => {
  const base: GapDirtyInputs = {
    sampRev: 3,
    gapRev: 5,
    geomRev: 7,
    view: [2, 0, 0, 2, 10, 20],
    canvasW: 1600,
    canvasH: 900,
    canvasRes: 1.5,
    fabricGap: [1, 0, 0],
    explore: false,
    shapeRev: 5,
    fxTicking: false,
  };

  it("a first snapshot is dirty; an identical one is clean", () => {
    expect(gapMaskDirty(null, base)).toBe(true);
    expect(gapMaskDirty(base, { ...base })).toBe(false);
    expect(gapMaskDirty(base, { ...base, view: [...base.view], fabricGap: [...base.fabricGap] })).toBe(false);
    // A ticking FX clock is dirty every frame (strengths ramp on it).
    const ticking = { ...base, fxTicking: true };
    expect(gapMaskDirty(ticking, { ...ticking })).toBe(true);
  });

  it("every input alone makes it dirty", () => {
    const changes: Array<Partial<GapDirtyInputs>> = [
      { sampRev: 4 },
      { gapRev: 6 },
      { geomRev: 8 },
      { view: [2, 0, 0, 2, 11, 20] },
      { view: [3, 0, 0, 2, 10, 20] },
      { canvasW: 1601 },
      { canvasH: 901 },
      { canvasRes: 2 },
      { fabricGap: [0, 0, 0] },
      { fabricGap: [1, 1, 0] },
      { fabricGap: [1, 0, 1] },
      { explore: true },
      { shapeRev: 6 },
      { fxTicking: true },
    ];
    for (const change of changes) {
      expect(gapMaskDirty(base, { ...base, ...change })).toBe(true);
    }
  });
});

describe("gap split fallback selection (brief section 5)", () => {
  it("needs a half-float color buffer, either extension", () => {
    expect(gapSplitSupported(true, false)).toBe(true);
    expect(gapSplitSupported(false, true)).toBe(true);
    expect(gapSplitSupported(true, true)).toBe(true);
    expect(gapSplitSupported(false, false)).toBe(false);
  });

  const ctx = (gapSplit: boolean): WarmContext => ({
    fabric: true,
    explore: false,
    burn: false,
    fog: false,
    reduced: false,
    ripple: true,
    bgIds: ["vellum"],
    maxBatchTextures: 16,
    gapSplit,
  });
  const wave1 = (c: WarmContext): string[] =>
    programRegistry()
      .filter((e) => e.wave1(c))
      .map((e) => e.name);

  it("supported: the gap twins warm with their paint twins in wave 1", () => {
    const names = wave1(ctx(true));
    expect(names).toContain("section-rgb");
    expect(names).toContain("section-rgb-gap");
    const both = wave1({ ...ctx(true), explore: true });
    expect(both).toContain("section-rgb-explore");
    expect(both).toContain("section-rgb-gap-explore");
    const burn = wave1({ ...ctx(true), burn: true });
    expect(burn).toContain("section-rgb-gap");
    expect(burn).toContain("section-rgb-gap-explore");
  });

  it("unsupported: no gap program anywhere in wave 1, combined only", () => {
    const names = wave1(ctx(false));
    expect(names).toContain("section-rgb");
    expect(names.some((n) => n.includes("gap"))).toBe(false);
    const entries = programRegistry().map((e) => e.name);
    expect(new Set(entries).size).toBe(entries.length);
    // Neither wave warms a gap program where the target cannot exist.
    for (const e of programRegistry()) {
      if (e.name.includes("gap")) expect(e.exists?.(ctx(false)) ?? true).toBe(false);
      if (e.name.includes("gap")) expect(e.exists?.(ctx(true)) ?? true).toBe(true);
    }
  });
});

// K551: capability turned the split on, and it shipped live from
// 2026-10-18 drawing no crossing gaps on the desktop. It stays dark until
// K320 2c proves parity; only setGapSplit (the probe A/B) turns it on.
describe("K551: the split stays dark", () => {
  const capable = { getExtension: (n: string) => (n === "EXT_color_buffer_half_float" ? {} : null) };

  it("capability alone never turns it on", () => {
    expect(gapSplitActive()).toBe(false);
    expect(detectGapSplit(capable)).toBe(true);
    expect(gapSplitActive()).toBe(false);
  });
  // The warm-up's side: shader_warmup.test.ts ("K551").
});

// K553: the paint indexes the mask by gl_FragCoord, in the canvas's device
// pixels, against uGapSize. The target was renderer.width x height at
// resolution 1 (CSS px), right at dsf 1 only: at dsf 1.5 the paint read the
// texel for 1.5x its own position, and the split drew almost no gaps on
// both enabling paths (.claude/probes/K553/). The target now takes the
// canvas's pixel size and resolution.
describe("K553: the mask is sized in the canvas's device pixels", () => {
  const uGapSize = (): number[] =>
    Array.from((gapMaskUniforms().uniforms as unknown as { uGapSize: Float32Array }).uGapSize);
  const sizeOf = (): number[] => {
    const s = gapMaskTexture().source;
    return [s.pixelWidth, s.pixelHeight, s.resolution];
  };

  it("rounds as Pixi sizes the canvas", () => {
    expect(gapMaskPixelSize(1600, 900, 1.5)).toEqual([2400, 1350]);
    expect(gapMaskPixelSize(1600, 900, 1)).toEqual([1600, 900]);
    expect(gapMaskPixelSize(411, 753, 2)).toEqual([822, 1506]);
    // An odd CSS size at 1.5: Pixi keeps the pixel size and renderer.width
    // reads pixelWidth / resolution (1001.33...), which maps back exactly.
    expect(gapMaskPixelSize(1001, 667, 1.5)).toEqual([1502, 1001]);
    expect(gapMaskPixelSize(1502 / 1.5, 1001 / 1.5, 1.5)).toEqual([1502, 1001]);
    expect(gapMaskPixelSize(0, 0, 0)).toEqual([1, 1]);
  });

  it("sizes the target and uGapSize to the canvas's pixels, the frame in CSS px", () => {
    expect(ensureGapMaskSize(1600, 900, 1.5)).toBe(true);
    const rt = gapMaskTexture();
    expect(sizeOf()).toEqual([2400, 1350, 1.5]);
    expect(uGapSize()).toEqual([2400, 1350]);
    // Pixi's render target viewport is frame x resolution and its projection
    // the frame: the camera's CSS-unit transform fills the whole target.
    expect([rt.frame.width, rt.frame.height]).toEqual([1600, 900]);
    expect(ensureGapMaskSize(1600, 900, 1.5)).toBe(false);
    // The same pixels at another resolution: the frame follows.
    expect(ensureGapMaskSize(1200, 675, 2)).toBe(true);
    expect(sizeOf()).toEqual([2400, 1350, 2]);
    expect([rt.frame.width, rt.frame.height]).toEqual([1200, 675]);
    // dsf 1, where every probe before K553 ran: as before.
    expect(ensureGapMaskSize(1600, 900, 1)).toBe(true);
    expect(sizeOf()).toEqual([1600, 900, 1]);
    expect([rt.frame.width, rt.frame.height]).toEqual([1600, 900]);
    expect(uGapSize()).toEqual([1600, 900]);
  });

  it("renderGapMask: the split arms the pass, at the renderer's resolution", () => {
    // Node has no document: pixi's GlProgram asks a test canvas for the
    // fragment precision (pluck_ripple.test.ts does the same).
    DOMAdapter.set({ ...DOMAdapter.get(), createCanvas: () => ({ getContext: () => null }) } as unknown as Adapter);
    const root = new Container();
    const base = new Container();
    root.addChild(base);
    const geometry = new MeshGeometry({
      positions: new Float32Array([0, 0, 1, 0, 0, 1]),
      uvs: new Float32Array(6),
      indices: new Uint32Array([0, 1, 2]),
    });
    const mesh = new Mesh({ geometry });
    base.addChild(mesh);
    const scene: GapSceneSource = {
      root,
      base,
      gapTex: Texture.WHITE,
      fills: [{ mesh }],
      explore: () => false,
      geomRev: () => 1,
      sampRev: () => 1,
      gapRev: () => 1,
      shapeRev: () => 1,
      fxTicking: () => false,
    };
    const targets: Array<{ target: unknown; px: number[] }> = [];
    const gl = {
      getExtension: (n: string) => (n === "EXT_color_buffer_half_float" ? {} : null),
      checkFramebufferStatus: () => 1,
      FRAMEBUFFER: 2,
      FRAMEBUFFER_COMPLETE: 1,
    };
    const renderer = {
      width: 1600,
      height: 900,
      resolution: 1.5,
      gl,
      renderTarget: { bind: () => {} },
      render: (o: { target: unknown }) => targets.push({ target: o.target, px: sizeOf() }),
    };
    registerGapScene(scene);
    try {
      setGapSplitActive(false);
      renderGapMask(renderer as never);
      expect(targets.length).toBe(0);
      setGapSplitActive(true);
      const before = GAP_PREPASS_STATS.renders;
      renderGapMask(renderer as never);
      expect(GAP_PREPASS_STATS.renders).toBe(before + 1);
      expect(targets[0].target).toBe(gapMaskTexture());
      expect(targets[0].px).toEqual([2400, 1350, 1.5]);
      expect(uGapSize()).toEqual([2400, 1350]);
      // Nothing changed: no pass.
      renderGapMask(renderer as never);
      expect(GAP_PREPASS_STATS.renders).toBe(before + 1);
      // A dpr change at the same CSS size (another monitor) resizes the
      // target, which drops its contents: the dirty rule must re-render.
      renderer.resolution = 2;
      renderGapMask(renderer as never);
      expect(GAP_PREPASS_STATS.renders).toBe(before + 2);
      expect(targets[1].px).toEqual([3200, 1800, 2]);
      expect(uGapSize()).toEqual([3200, 1800]);
    } finally {
      setGapSplitActive(false);
      clearGapScene(scene);
    }
  });
});

describe("K320 stage 2a: gap program texts", () => {
  it("carries the unedited search and no paint chunk", () => {
    expect(GAP_ONLY_FRAG).toContain("gapKeepAt(");
    expect(GAP_ONLY_FRAG).toContain("float(vChain) + 1.0");
    expect(GAP_ONLY_FRAG).not.toContain("kPaintAt");
    expect(GAP_ONLY_FRAG).not.toContain("kComposePaint");
    expect(GAP_ONLY_FRAG).not.toContain("kFxColor");
  });

  it("stays under the brief's gap budget (explore carries the look text)", () => {
    expect(GAP_ONLY_FRAG.length).toBeLessThanOrEqual(18_500);
    // Brief 3.1 estimated ~19.5k for the explore twin; the measured text
    // (master + EXPLORE_LOOK via exploreGapEdits, as the fans carry) is
    // larger. The pin is the measured text, not the estimate.
    expect(gapOnlyFragExplore().length).toBeLessThanOrEqual(27_500);
  });

  it("the explore twin takes the shaped-cut edits exactly once each", () => {
    const frag = gapOnlyFragExplore();
    expect(frag).toContain("exploreCutCover(");
    expect(frag).toContain("exShaped");
    expect(frag).not.toContain("kPaintAt");
    expect(frag.split("bool exShaped").length - 1).toBe(1);
  });
});
