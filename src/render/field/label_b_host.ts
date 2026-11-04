// K1040 S3f (K1158): Pixi v8 as the label pass's host (label_b_pass.ts's
// header). The pass queries no GL state; after it draws, the host takes the
// context back. resetState() drops Pixi's caches (program, VAO, texture
// units, render target, blend/depth/cull flags, stencil), so its next draw
// rebinds what it uses. The render-target adaptor's viewport cache survives
// resetState(), and Pixi sets the viewport only when that cache differs, so
// the viewport Pixi believes is set goes back from the same cache first.

import type { WebGLRenderer } from "pixi.js";
import type { LabelBHost } from "./label_b_pass";

type ViewPort = { x: number; y: number; width: number; height: number };

export function pixiLabelHost(renderer: WebGLRenderer): LabelBHost {
  const gl = renderer.gl as WebGL2RenderingContext;
  const adaptor = (renderer.renderTarget as unknown as { adaptor: { _viewPortCache?: ViewPort } }).adaptor;
  return {
    restore(): void {
      const vp = adaptor._viewPortCache;
      if (vp) gl.viewport(vp.x, vp.y, vp.width, vp.height);
      renderer.resetState();
    },
  };
}
