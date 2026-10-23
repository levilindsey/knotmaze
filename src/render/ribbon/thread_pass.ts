// K8 G3-2's seam (docs/design/K8_G3-2.md): the ThreadPass the façade
// picks at construction by `rp` — the strip (ribbon/strip_pass.ts,
// the only pass today) or the SDF quads (ribbon/ribbon_sdf.ts, G3-2's
// build). update() extrudes through this interface; the pluck host's
// collapse and the G3 chain write ride the same calls, so a pass swap
// touches nothing else. `build` returns the chain's fill mesh (the
// strip) or null (a pass that draws no per-chain mesh); the façade
// adds a returned mesh to its base layer.

import type { Mesh } from "pixi.js";
import type { SplineSamples } from "../../geometry/spline_generator";
import type { RibbonMesh } from "../ribbon_mesh";

export type ThreadPassMode = "strip" | "sdf";

export interface ThreadPass {
  // The per-chain fill meshes (empty for a meshless pass).
  readonly fills: readonly RibbonMesh[];
  build(chain: number, count: number, closed: boolean): RibbonMesh | null;
  // Extrude one chain from this frame's samples and update()'s
  // composed width; returns the multiplier the G3 chain write reads.
  extrude(chain: number, samples: SplineSamples, width: Float32Array | null): Float32Array | null;
  // The pluck light path: re-extrude one chain under an installed
  // collapse (an SDF pass writes RADII instead).
  collapse(chain: number): void;
  // Clamp a fused terminal's samples onto the tuck point.
  tuck(samples: SplineSamples, atStart: boolean, atEnd: boolean, chain: number): void;
  // A meshless pass's one scene mesh (the SDF quads), built once the
  // façade knows every chain; the strip never has one.
  rootMesh?(): Mesh | null;
  // K825: the thread reveal turned on or off (the strip swaps its fill
  // meshes' shaders itself; a meshless pass swaps its one mesh's).
  setExplore?(on: boolean): void;
}
