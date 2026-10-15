import { buildSceneGraph } from "../../src/core/scene_graph";
import type { SceneParams } from "../../src/core/scene_graph";
import type { TangleGraph } from "../../src/core/types";
import type { PhysicsTuning } from "../../src/physics/particle_system";
import { parseParams } from "../../src/ui/url_state";

// K7's tests run on FABRIC (maze) designs (knot mode is going, K326): the
// params main builds a scene from (a link, read against today's defaults)
// and the tuning main passes the physics, at temperature 0. A small grid
// keeps them fast: `?7&gs=8` is 563 particles and 71 crossings.
export function fabricScene(query: string): { params: SceneParams; tuning: PhysicsTuning } {
  const p = parseParams(query);
  if (!p.mazeFabric) throw new Error(`${query} is not a fabric design`);
  return {
    params: p,
    tuning: {
      temperature: 0,
      slack: p.slack,
      drag: p.drag,
      repulsion: p.repulsion,
      bend: p.bend,
      smooth: p.smooth,
      stiffness: p.stiffness,
      gridAlign: p.gridAlign,
      threadWidth: p.threadWidth,
    },
  };
}

// A fresh graph for each system (as main and the worker each build their own).
export function fabricGraph(params: SceneParams): TangleGraph {
  return buildSceneGraph(params).graph;
}

// The bits of a float array, for exact comparisons (NaN-safe).
export function bits(a: Float32Array): Uint32Array {
  return new Uint32Array(a.buffer, a.byteOffset, a.length);
}
