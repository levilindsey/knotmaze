import type { WalkGraph } from "../core/walk_graph";
import type { ParticleSystem } from "../physics/particle_system";
import type { RibbonRenderer } from "../render/ribbon_renderer";
import type { DebugRenderer } from "../render/debug_renderer";
import type { FabricMazeRenderer } from "../render/fabric_maze_renderer";
import type { FabricMazeController } from "../game/fabric_controller";
import type { MinotaurChase } from "../game/minotaur";
import type { TurnMinotaur } from "../game/minotaur_turns";
import type { RevealAnimator } from "../render/reveal";

// K5 (docs/design/K5_K6_split.md, 2.2): the scene `let`s that main()'s
// rebuild() or a mode switch reassigns, read through getters. createScene (src/app/scene.ts) builds
// ONE SceneRef with the scene `let`s it owns; code moved out of main() says
// `scene.renderer` where it said `renderer`, and so reads the current value,
// as the closure did. Never destructure a SceneRef or cache one of its
// values: a cached renderer is the previous build's after a rebuild.
//
// ps is the physics host's view (K7): read-only outside the host, and
// test/physics/host_seam.test.ts scans src/app/ for writes through it.
export interface SceneRef {
  readonly ps: ParticleSystem | null;
  readonly renderer: RibbonRenderer | null;
  readonly debug: DebugRenderer | null;
  readonly walkGraph: WalkGraph | null;
  // The build's strand hue groups (maze plan; undefined in knot mode) and
  // strand count, kept for live recolors.
  readonly buildHueGroup: number[] | undefined;
  readonly buildStrandCount: number;
  readonly fabric: FabricMazeRenderer | null;
  // K80's real-time chase and the turn-aligned minotaur (restartChase).
  readonly chase: MinotaurChase | null;
  readonly turnMino: TurnMinotaur | null;
  readonly fabricController: FabricMazeController | null;
  // The running appearance animation (startAppearance, beginLoading,
  // beginSettle).
  readonly reveal: RevealAnimator | null;
}
