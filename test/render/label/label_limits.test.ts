// K868 S3a2: the packed label holds 255 chains and 255 clusters (8 bits
// each, 0 = paper). Past that the app turns the label ink off, with one
// console warning per page (docs/design/K868_s3a2_label.md, step 3).
import { describe, expect, it, vi } from "vitest";
import type { SceneExportCtx } from "../../../src/render/field/scene_export_hook";
import { createLabelApp, resetLabelWarning } from "../../../src/render/label/label_app";
import { LABEL_MAX_CHAINS, LABEL_MAX_CLUSTERS, labelLimits } from "../../../src/render/label/label_pieces";

function mockCtx(chains: number): {
  ctx: SceneExportCtx;
  renderer: { threadLook: number; labelInk: boolean; updateCount: number };
  params: { labelInk: boolean };
} {
  const renderer = { threadLook: 1, labelInk: true, updateCount: 1 };
  const params = { labelInk: true };
  const ctx = {
    scene: {
      renderer,
      ps: { chains: Array.from({ length: chains }, () => [0, 1]), positions: new Float32Array(4) },
    },
    app: {
      renderer: { resetState: () => {} },
      canvas: { width: 10, height: 10 },
      screen: { width: 10, height: 10 },
    },
    root: { scale: { x: 1, y: 1 }, position: { x: 0, y: 0 } },
    params,
    host: { asleep: true },
    physicsTuning: () => ({ threadWidth: 1 }),
  };
  return { ctx: ctx as unknown as SceneExportCtx, renderer, params };
}

describe("K868 S3a2 the packed label's limits", () => {
  it("255 chains and 255 clusters fit; 256 of either does not", () => {
    expect(LABEL_MAX_CHAINS).toBe(255);
    expect(LABEL_MAX_CLUSTERS).toBe(255);
    expect(labelLimits(255, 255)).toBeNull();
    expect(labelLimits(256, 0)).toBe("256 chains (the packed label holds 255)");
    expect(labelLimits(0, 256)).toBe("256 clusters (the packed label holds 255)");
  });

  it("past the limits the app turns the flag off, with one warning per page", () => {
    resetLabelWarning();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const a = mockCtx(300);
      let asked = 0;
      const app = createLabelApp(a.ctx, () => asked++);
      app.frame();
      expect(a.params.labelInk).toBe(false);
      expect(a.renderer.labelInk).toBe(false);
      expect(asked).toBe(1);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toBe(
        "K868 label pass: 300 chains (the packed label holds 255); label ink off, the border look draws its own ink"
      );
      // Off: later frames do nothing.
      app.frame();
      expect(asked).toBe(1);
      expect(warn).toHaveBeenCalledTimes(1);
      app.dispose();

      // The flag back on makes a new app (frame_loop does): it falls back
      // again, silently.
      const b = mockCtx(300);
      createLabelApp(b.ctx, () => {}).frame();
      expect(b.params.labelInk).toBe(false);
      expect(warn).toHaveBeenCalledTimes(1);

      // At the limit nothing falls back before the build (255 chains pass
      // the pre-check; this mock has no renderer samples, so the build
      // itself fails and falls back with its own message).
      resetLabelWarning();
      const c = mockCtx(255);
      createLabelApp(c.ctx, () => {}).frame();
      expect(warn).toHaveBeenCalledTimes(2);
      expect(String(warn.mock.calls[1][0])).not.toMatch(/the packed label holds/);
    } finally {
      warn.mockRestore();
      resetLabelWarning();
    }
  });
});
