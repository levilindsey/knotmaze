// K814: the collected home for cursive and the other pre-defined-shape
// injections. The nine knobs used to be scattered single fields in the
// flat param table (url_state.ts) with the shape definitions apart
// (shapes.ts masks, emblem_data.ts, the Hershey text code). This module
// holds the param group (a typed subset the panel, codec and daily rules
// consume from one place) and a registry indexing every pre-defined
// shape, so a new one is added in one spot: registry entry here, its
// definition in its home file, and (if it needs a new knob) an appended
// codec param. Definitions do NOT move: SHAPES/SHAPE_FNS stay in
// shapes.ts, EMBLEM_DEFS in emblem_data.ts, the glyphs in text_graph.ts.
//
// Pure core: no ui imports, so url_state, param_codec, daily_link and
// scene_graph can all consume it. No behavior lives here; defaults and
// codec indices are pinned against the existing tables by
// test/core/shape_injection.test.ts.

import { ANCHORS, SHAPES } from "./shapes";
import type { AnchorId, ShapeId } from "./shapes";
import { EMBLEM_IDS } from "./emblem_data";
import type { EmblemId } from "./emblem_data";

export const EMBLEM_CHOICES: readonly string[] = ["", ...EMBLEM_IDS];

// The group's fields, at UrlParams' flat types (emblem ids ride as
// strings there and in SceneParams; isEmblemId narrows at the scene).
export interface ShapeInjectionParams {
  text: string;
  cartouche: string;
  emblem: string;
  cartoucheShape: string;
  shape: ShapeId;
  startAnchor: AnchorId;
  exitAnchor: AnchorId;
  penReverse: boolean;
  dailyTitleThread: boolean;
}

export const SHAPE_INJECTION_KEYS = [
  "text",
  "cartouche",
  "emblem",
  "cartoucheShape",
  "shape",
  "startAnchor",
  "exitAnchor",
  "penReverse",
  "dailyTitleThread",
] as const satisfies readonly (keyof ShapeInjectionParams)[];

export const SHAPE_INJECTION_DEFAULTS: ShapeInjectionParams = {
  text: "",
  cartouche: "",
  emblem: "",
  cartoucheShape: "",
  shape: "rect",
  startAnchor: "nw",
  exitAnchor: "se",
  penReverse: false,
  dailyTitleThread: false,
};

// Pick the group out of anything carrying it (UrlParams, SceneParams).
export function shapeInjectionOf(p: ShapeInjectionParams): ShapeInjectionParams {
  return {
    text: p.text,
    cartouche: p.cartouche,
    emblem: p.emblem,
    cartoucheShape: p.cartoucheShape,
    shape: p.shape,
    startAnchor: p.startAnchor,
    exitAnchor: p.exitAnchor,
    penReverse: p.penReverse,
    dailyTitleThread: p.dailyTitleThread,
  };
}

export type ShapeInjectionDaily = "maze" | "exempt" | "design";

export interface ShapeInjectionParam {
  readonly key: keyof ShapeInjectionParams;
  readonly legacy: string; // key=value link name (url_state's reader).
  readonly codec: "string" | "enum" | "boolean";
  readonly options?: readonly string[]; // enum only.
  readonly label: string; // panel row label.
  readonly tip: string; // panel row help.
  readonly folder: "Design" | "Maze" | "Path & view";
  // maze: part of a daily's maze identity (MAZE_PARAM_KEYS); exempt: a
  // daily keeps it (DAILY_EXEMPT_KEYS); design: defines the design but
  // sits in neither daily list (text).
  readonly daily: ShapeInjectionDaily;
  readonly scene: boolean; // carried by SceneParams.
}

export const SHAPE_INJECTION_PARAMS: readonly ShapeInjectionParam[] = [
  {
    key: "text", legacy: "txt", codec: "string", label: "Text", folder: "Design",
    tip: "Cursive text design: type words to build them as pinned knotwork text instead of the lattice maze. Empty = the usual design. Regenerates the design.",
    daily: "design", scene: true,
  },
  {
    key: "cartouche", legacy: "car", codec: "string", label: "Cartouche", folder: "Design",
    tip: "In-maze cartouche: a word inside the maze, in a stamped hole with a thread frame; walking it counts like any maze run (4-5 letters fit at grid 18). Empty = no cartouche. Regenerates the design.",
    daily: "maze", scene: true,
  },
  {
    key: "emblem", legacy: "emb", codec: "enum", options: EMBLEM_CHOICES, label: "Emblem", folder: "Design",
    tip: "Standalone emblem: a predefined knot shape shown alone instead of the lattice maze. None = the usual design. Regenerates the design.",
    daily: "maze", scene: true,
  },
  {
    key: "cartoucheShape", legacy: "csh", codec: "enum", options: EMBLEM_CHOICES, label: "Cartouche shape", folder: "Design",
    tip: "Cartouche shape: a predefined knot emblem floating as a decorative island inside the cartouche hole (found visually, never walked or counted). Wins the hole over the Cartouche word. None = the word (or no cartouche). Regenerates the design.",
    daily: "maze", scene: true,
  },
  {
    key: "shape", legacy: "shp", codec: "enum", options: SHAPES, label: "Maze shape", folder: "Design",
    tip: "Lattice silhouette: the knotwork grows only inside this shape (ring keeps a real hole in the middle). Regenerates the design.",
    daily: "maze", scene: true,
  },
  {
    key: "startAnchor", legacy: "sa", codec: "enum", options: ANCHORS, label: "Entrance side", folder: "Maze",
    tip: "Which side of the shape hosts the maze ENTRANCE (compass point). Regenerates the maze.",
    daily: "maze", scene: true,
  },
  {
    key: "exitAnchor", legacy: "xa", codec: "enum", options: ANCHORS, label: "Exit side", folder: "Maze",
    tip: "Which side of the shape hosts the maze EXIT (compass point). Regenerates the maze.",
    daily: "maze", scene: true,
  },
  {
    key: "penReverse", legacy: "pnr", codec: "boolean", label: "Earlier stroke on top", folder: "Design",
    tip: "Cursive text crossings: each stroke passes over the strokes drawn before it, as a pen draws (a t's bar over its stem, an l's downstroke over its upstroke). Check to reverse it, so the earlier stroke lies on top. Applies to the Text, the daily's title and the Cartouche word. Regenerates the design.",
    daily: "exempt", scene: true,
  },
  {
    key: "dailyTitleThread", legacy: "dtt", codec: "boolean", label: "Title thread", folder: "Path & view",
    tip: "Write the daily's name as a thread at the entrance. The maze is the same either way, and your attempt is kept. Dailies only.",
    daily: "exempt", scene: false,
  },
];

// Every pre-defined shape the generator can inject, by role. The
// definition stays home (shapes.ts / emblem_data.ts / text_graph.ts);
// this index is the one place that lists them all.
export type ShapeRegistryEntry =
  | { readonly id: string; readonly kind: "mask"; readonly label: string; readonly shape: ShapeId }
  | { readonly id: string; readonly kind: "emblem-standalone" | "emblem-cartouche"; readonly label: string; readonly emblem: EmblemId }
  | { readonly id: string; readonly kind: "cursive" | "title"; readonly label: string; readonly glyphSource: "hershey" | "authored" };

const EMBLEM_LABELS: Record<EmblemId, string> = {
  star: "Star",
  trefoil: "Trefoil",
  triquetra: "Triquetra",
  solomon: "Solomon",
  wreath: "Wreath",
};

export const SHAPE_REGISTRY: readonly ShapeRegistryEntry[] = [
  ...SHAPES.map((shape): ShapeRegistryEntry => ({ id: `mask:${shape}`, kind: "mask", label: shape, shape })),
  ...EMBLEM_IDS.map((emblem): ShapeRegistryEntry => ({ id: `emblem:${emblem}`, kind: "emblem-standalone", label: EMBLEM_LABELS[emblem], emblem })),
  ...EMBLEM_IDS.map((emblem): ShapeRegistryEntry => ({ id: `cartouche:${emblem}`, kind: "emblem-cartouche", label: EMBLEM_LABELS[emblem], emblem })),
  { id: "cursive:text", kind: "cursive", label: "Text", glyphSource: "hershey" },
  { id: "cursive:cartouche", kind: "cursive", label: "Cartouche", glyphSource: "hershey" },
  { id: "title:daily", kind: "title", label: "Daily title", glyphSource: "hershey" },
];
