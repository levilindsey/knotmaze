// K868: the field renderer's scene format, version 1
// (docs/design/K868_field_border.md §4). A scene is everything the border
// look needs to draw one frame, in world units: each chain's centreline as
// the renderer samples it, with tent depth per sample; the crossing table;
// the junctions and their arms; the dead ends; the camera and the look.
// S1a exports real scenes from the app (window.__knotSceneExport), S1b
// builds synthetic ones, and the CPU oracle and the GPU prototype read the
// same JSON. Nothing in the app imports this until integration.
//
// Arc length s is measured along the polyline through a chain's samples,
// from its first sample; a closed chain includes the closing segment and
// s wraps at its total length. Either stage may append OPTIONAL fields
// (with a comment saying who fills them); changing a required field bumps
// SCENE_VERSION.

export const SCENE_VERSION = 1;

export type Vec2 = [number, number];

export interface FieldScene {
  version: typeof SCENE_VERSION;
  name: string;
  source: SceneSource;
  camera: SceneCamera;
  look: SceneLook;
  chains: SceneChain[];
  crossings: SceneCrossing[];
  junctions: SceneJunction[];
  deadEnds: SceneDeadEnd[];
  /** Named crops for contact sheets: junctions, tips, crossings. */
  pois?: ScenePoi[];
  highlights?: SceneHighlight[];
}

export type SceneSource =
  | {
      kind: "app";
      /** The full link the scene was exported from. */
      url: string;
      /** Build identity: package version and git short SHA. */
      build: string;
      /** Sim time __knotStepUntil ran to before the freeze. */
      simTime: number;
      /** __knotPhysDump hash at export: equal hashes, equal geometry. */
      physHash: string;
    }
  | {
      kind: "synthetic";
      /** The generator's name in test/render/field/scenes/. */
      generator: string;
      params: Record<string, number | string | boolean>;
    };

export interface SceneCamera {
  /** World to CSS pixels: x' = a·x + c·y + e, y' = b·x + d·y + f. */
  worldToCss: [a: number, b: number, c: number, d: number, e: number, f: number];
  /** CSS pixels per world unit (the transform's scale). */
  pxPerUnit: number;
  /** Device pixels per CSS pixel of the matching screenshot. */
  dpr: number;
  /** Viewport [width, height] in CSS pixels. */
  viewport: Vec2;
}

export interface SceneLook {
  /** Thread half-width h: centreline to outline. */
  halfWidth: number;
  /** Ink band width W, measured inward from the outline. */
  band: number;
  /** `crs`: the share of junction corners drawn round (K830). */
  cornerRoundShare: number;
  /** `cr`: master's corner-radius knob, 0 to 6 (K868 §3.8 maps it to r). */
  cuspRadius: number;
  /** Tent amplitude and window (physics constants; the window is in ctrl
   * units). Informational: z is carried per sample. */
  depthAmp: number;
  depthWindow: number;
  /** Paper (background) and ink colours, CSS hex. */
  paper: string;
  ink: string;
}

export interface SceneChain {
  id: number;
  closed: boolean;
  /** Centreline samples as the renderer draws them: [x0, y0, x1, y1, ...]. */
  pts: number[];
  /** Tent depth at each sample (pts.length / 2 entries). */
  z: number[];
}

export interface ScenePass {
  chain: number;
  /** Arc length of the crossing point along the chain. */
  s: number;
}

/** A true crossing (over/under). Merged crossings are junctions instead. */
export interface SceneCrossing {
  a: ScenePass;
  b: ScenePass;
  over: "a" | "b";
  /** S1a: true for an emergent crossing (physics found the threads
   * crossing where the diagram has none; master gives it a gap slot, as
   * renderEmergent does). Absent on registered crossings. */
  emergent?: boolean;
}

export interface SceneArm {
  chain: number;
  /** Arc length where the arm meets the junction. */
  s: number;
  /** Direction the arm leaves the junction: +1 toward larger s. */
  dir: 1 | -1;
  /** A through chain gives two arms (dir +1 and −1 at one s); an END gives one. */
  kind: "through" | "end";
}

export interface SceneCorner {
  /** Master's resolved style for this corner: builder pins, then crs. */
  style: "round" | "sharp";
  /** True when a builder pin decided it (fusedJunctionPins). */
  pinned: boolean;
}

export interface SceneJunction {
  /** Stable name, e.g. "j123" (the renderer's junction index). */
  id: string;
  /** Centre. */
  c: Vec2;
  /** Arms sorted by outgoing angle, atan2(dy, dx) ascending. */
  arms: SceneArm[];
  /** Corner i lies between arms i and (i + 1) % arms.length. */
  corners?: SceneCorner[];
}

export interface SceneDeadEnd {
  chain: number;
  /** Arc length of the terminal: 0 or the chain's length. */
  s: number;
  /** True when the end is anchored off-screen: no cap is drawn. */
  offscreen?: boolean;
}

export interface ScenePoi {
  name: string;
  /** Crop centre. */
  at: Vec2;
  /** Half the crop's side. */
  radius: number;
}

export interface SceneHighlight {
  chain: number;
  s0: number;
  s1: number;
  /** CSS hex. */
  color: string;
}
