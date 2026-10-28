// K307 stage 2: THE WARM-UP REGISTRY. Every pixi program the app can draw,
// built through the sites' own GlPrograms (GlProgram.from caches by source,
// so a factory here returns the very program a site draws with), and which
// of them the current mode's intro draws (wave 1, which gates the first
// visible frame) or not (wave 2, warmed after the intro). The warm-up
// (shader_warmup.ts) compiles exactly each program's `.vertex` and
// `.fragment`, which pixi preprocessed in the constructor, never captured
// text: the batcher's source depends on the backend's texture units.
//
// A NEW PROGRAM SITE (GlProgram.from, new GlProgram, Shader.from, a Filter,
// a ParticleContainer) goes here, with its file's count in PROGRAM_SITES.
// test/render/program_registry.test.ts scans src/ and fails until both
// agree. Brief: docs/design/K307_intro_freezes.md, "Stage 2: the warm-up".

import { DefaultBatcher, DisplacementFilter, GlProgram, ParticleShader, Sprite, Texture } from "pixi.js";
import { stripProgram } from "./arm_strip";
import { allBackgroundProgramIds, backgroundProgram, blitProgram, fogProgram } from "./background";
import { junctionProgram } from "./junction_field";
import { markerProgram } from "./marker_mesh";
import { pluckBlurProgram, pluckStillProgram } from "./pluck_overlay";
import { rippleProgram } from "./pluck_ripple";
import { sdfProgram } from "./ribbon/ribbon_sdf";
import { sectionProgram } from "./ribbon/ribbon_shader";

// Program sites per file under src/ (the test's scan, comments stripped):
// matches of GlProgram.from | new GlProgram( | Shader.from | new Filter |
// new <X>Filter( | new ParticleContainer.
export const PROGRAM_SITES: Readonly<Record<string, number>> = {
  "src/render/appear_fx.ts": 1, // a ParticleContainer: particles
  "src/render/arm_strip.ts": 2, // arm-strip, arm-strip-explore
  "src/render/background.ts": 3, // bg-<program id>, bg-blit, bg-fog
  "src/render/confetti.ts": 1, // a ParticleContainer: particles
  "src/render/fabric_maze_renderer.ts": 1, // the fog's DisplacementFilter
  "src/render/junction_field.ts": 2, // junction-field, junction-field-explore
  "src/render/marker_mesh.ts": 1, // knot-marker
  "src/render/pluck_overlay.ts": 3, // pluck-blur, pluck-still, pluck-still-explore
  "src/render/pluck_ripple.ts": 2, // pluck-ripple: its program and its Filter
  // section-rgb, section-rgb-explore, and their -root variants (K905)
  "src/render/ribbon/ribbon_shader.ts": 4,
  // ribbon-sdf, ribbon-sdf-explore (K8 G3-2, K825), and their -root variants (K905)
  "src/render/ribbon/ribbon_sdf.ts": 4,
};

// What the current page draws, as the warm-up needs to know it.
export interface WarmContext {
  // Maze mode (params.mazeFabric): markers, junctions, arm strips.
  fabric: boolean;
  // The thread reveal (fabric, exploration "threads"): the -explore variants.
  explore: boolean;
  // A burn race (fabric, fire on; K290): its first burnt stretch, at the
  // first move, switches every ribbon, strip and fan onto the -explore
  // programs, so a fire link warms both sets in wave 1 (wave 2 starts after
  // the reveal, and a move can come before it ends compiling).
  burn: boolean;
  // The fog of war (fabric, exploration "fog"): its displacement filter, and
  // the fog backdrop over an active background.
  fog: boolean;
  // Reduced motion: still plucks instead of the blur, no ripple.
  reduced: boolean;
  // The SDF thread pass (?rp=sdf; K8 G3-2): its program draws wave 1.
  sdf: boolean;
  // K905: the page can paint a K620 glyph root (#glyphs2 without notaper,
  // read once at load). Only then do the ribbons' -root variants exist: a
  // scene that paints a root draws them (RibbonRenderer.rootPaint), every
  // other scene the plain programs, which carry no root code.
  roots: boolean;
  // K905: and its first scene has glyph text or a title, so it likely
  // paints one: the -root variants join wave 1 beside the plain ones (a
  // word whose glyphs grow no tapered root draws the plain ones).
  root: boolean;
  // Pluck ripples on (pluckRipple not "off", and not reduced motion).
  ripple: boolean;
  // The background's first program ids (background.ts backgroundWarmIds);
  // empty while the layer is inactive.
  bgIds: readonly string[];
  // renderer.limits.maxBatchableTextures: the batcher's source depends on it.
  maxBatchTextures: number;
}

// One program, as the warm-up compiles it.
export interface WarmSource {
  name: string;
  vertex: string;
  fragment: string;
}

export interface ProgramEntry {
  // Unique; the program's own name where it has one (pixi writes it into the
  // source as SHADER_NAME), "particles" for pixi's unnamed particle program.
  name: string;
  // The src/ files whose sites draw with it (PROGRAM_SITES keys).
  files: readonly string[];
  // Whether the current mode's intro draws it.
  wave1(ctx: WarmContext): boolean;
  // K905: whether the page can draw it at all (absent: always). An entry
  // this rejects is in neither wave.
  when?(ctx: WarmContext): boolean;
  // The program (built lazily, memoized by the factories).
  build(ctx: WarmContext): GlProgram;
}

// The batcher's program: pixi's own. Every DefaultBatcher shares one
// module-level DefaultShader (built by the first, with
// renderer.limits.maxBatchableTextures), so a throwaway batcher hands back
// the very program the batches draw with. A twin would not do: pixi's
// setProgramName numbers each new GlProgram of a name (`batch-fragment`,
// then `batch-fragment-2`), so a second DefaultShader's source differs and
// misses the cache. GlProgram.from programs are one instance per source.
const BATCH = new Map<number, GlProgram>();
function batchProgram(maxTextures: number): GlProgram {
  let p = BATCH.get(maxTextures);
  if (!p) {
    const batcher = new DefaultBatcher({ maxTextures });
    p = batcher.shader.glProgram;
    batcher.destroy();
    BATCH.set(maxTextures, p);
  }
  return p;
}
// Pixi's particle program (ParticleContainerPipe's ParticleShader): built by
// GlProgram.from, so this is the pipe's own instance.
let PARTICLES: GlProgram | null = null;
function particleProgram(): GlProgram {
  PARTICLES ??= new ParticleShader().glProgram;
  return PARTICLES;
}
// The fog's DisplacementFilter program ("displacement-filter", GlProgram.from).
let DISPLACEMENT: GlProgram | null = null;
function displacementProgram(): GlProgram {
  DISPLACEMENT ??= new DisplacementFilter({ sprite: new Sprite(Texture.WHITE) }).glProgram;
  return DISPLACEMENT;
}

const RIBBON = "src/render/ribbon/ribbon_shader.ts";
const SDF = "src/render/ribbon/ribbon_sdf.ts";
const STRIP = "src/render/arm_strip.ts";
const FIELD = "src/render/junction_field.ts";
const BG = "src/render/background.ts";
const MARKER = "src/render/marker_mesh.ts";
const PLUCK = "src/render/pluck_overlay.ts";
const RIPPLE = "src/render/pluck_ripple.ts";
const FX = "src/render/appear_fx.ts";
const CONFETTI = "src/render/confetti.ts";
const FABRIC = "src/render/fabric_maze_renderer.ts";

let ENTRIES: ProgramEntry[] | null = null;

// Every entry, in a fixed order. The background's come from its program ids.
export function programRegistry(): readonly ProgramEntry[] {
  if (ENTRIES) return ENTRIES;
  const e: ProgramEntry[] = [
    {
      // Shaderless meshes, Graphics, Text and Sprites.
      name: "batch",
      files: [],
      wave1: () => true,
      build: (c) => batchProgram(c.maxBatchTextures),
    },
    {
      name: "section-rgb",
      files: [RIBBON],
      wave1: (c) => !c.explore,
      build: () => sectionProgram(false),
    },
    {
      // K8 G3-2: the SDF ribbons (only an rp=sdf page draws them).
      name: "ribbon-sdf",
      files: [SDF],
      wave1: (c) => c.sdf,
      build: () => sdfProgram(),
    },
    {
      // K825: the SDF ribbons under the thread reveal (an rp=sdf page
      // that explores warms it in wave 1 like the strip's variant).
      name: "ribbon-sdf-explore",
      files: [SDF],
      wave1: (c) => c.sdf && (c.explore || c.burn),
      build: () => sdfProgram(true),
    },
    {
      name: "section-rgb-explore",
      files: [RIBBON],
      wave1: (c) => c.explore || c.burn,
      build: () => sectionProgram(true),
    },
    // K905: the K620 root variants (paint_glsl withRoot), drawn only by a
    // scene that paints a glyph root; a page that cannot build one never
    // compiles them.
    {
      name: "section-rgb-root",
      files: [RIBBON],
      when: (c) => c.roots,
      wave1: (c) => c.root && !c.explore,
      build: () => sectionProgram(false, true),
    },
    {
      name: "section-rgb-explore-root",
      files: [RIBBON],
      when: (c) => c.roots,
      wave1: (c) => c.root && (c.explore || c.burn),
      build: () => sectionProgram(true, true),
    },
    {
      name: "ribbon-sdf-root",
      files: [SDF],
      when: (c) => c.roots,
      wave1: (c) => c.root && c.sdf,
      build: () => sdfProgram(false, true),
    },
    {
      name: "ribbon-sdf-explore-root",
      files: [SDF],
      when: (c) => c.roots,
      wave1: (c) => c.root && c.sdf && (c.explore || c.burn),
      build: () => sdfProgram(true, true),
    },
    {
      name: "arm-strip",
      files: [STRIP],
      wave1: (c) => c.fabric && !c.explore,
      build: () => stripProgram(false),
    },
    {
      name: "arm-strip-explore",
      files: [STRIP],
      wave1: (c) => c.fabric && (c.explore || c.burn),
      build: () => stripProgram(true),
    },
    {
      name: "junction-field",
      files: [FIELD],
      wave1: (c) => c.fabric && !c.explore,
      build: () => junctionProgram(false),
    },
    {
      name: "junction-field-explore",
      files: [FIELD],
      wave1: (c) => c.fabric && (c.explore || c.burn),
      build: () => junctionProgram(true),
    },
    {
      name: "knot-marker",
      files: [MARKER],
      wave1: (c) => c.fabric,
      build: () => markerProgram(),
    },
    {
      name: "pluck-blur",
      files: [PLUCK],
      wave1: (c) => !c.reduced,
      build: () => pluckBlurProgram(),
    },
    {
      name: "pluck-still",
      files: [PLUCK],
      wave1: (c) => c.reduced && !c.explore,
      build: () => pluckStillProgram(false),
    },
    {
      name: "pluck-still-explore",
      files: [PLUCK],
      wave1: (c) => c.reduced && (c.explore || c.burn),
      build: () => pluckStillProgram(true),
    },
    {
      name: "pluck-ripple",
      files: [RIPPLE],
      wave1: (c) => c.ripple,
      build: () => rippleProgram(),
    },
    {
      // The appearance's reveal-front particles (cheap: always in wave 1,
      // whatever the appearance) and the finish confetti.
      name: "particles",
      files: [FX, CONFETTI],
      wave1: () => true,
      build: () => particleProgram(),
    },
    {
      name: "displacement-filter",
      files: [FABRIC],
      wave1: (c) => c.fog,
      build: () => displacementProgram(),
    },
    {
      name: "bg-blit",
      files: [BG],
      wave1: (c) => c.bgIds.length > 0,
      build: () => blitProgram(),
    },
    {
      name: "bg-fog",
      files: [BG],
      wave1: (c) => c.fog && c.bgIds.length > 0,
      build: () => fogProgram(),
    },
  ];
  for (const id of allBackgroundProgramIds()) {
    e.push({
      name: `bg-${id}`,
      files: [BG],
      wave1: (c) => c.bgIds.includes(id),
      build: () => backgroundProgram(id),
    });
  }
  ENTRIES = e;
  return e;
}

function source(entry: ProgramEntry, ctx: WarmContext): WarmSource {
  const p = entry.build(ctx);
  // Typed optional; a constructed GlProgram always has both.
  return { name: entry.name, vertex: p.vertex ?? "", fragment: p.fragment ?? "" };
}

// Longest fragment first: the compile cost grows with the source (FXC), so
// the walk's first pending program is the last to finish.
function longestFirst(a: WarmSource, b: WarmSource): number {
  return b.fragment.length + b.vertex.length - (a.fragment.length + a.vertex.length);
}

// Which wave links an entry, or 0 for neither (K905: `when` rejects it).
// Pure: the tests read the waves through it without building a program.
export function entryWave(e: ProgramEntry, ctx: WarmContext): 0 | 1 | 2 {
  if (!(e.when?.(ctx) ?? true)) return 0;
  return e.wave1(ctx) ? 1 : 2;
}

// What the current mode's intro draws: the gating wave.
export function wave1Sources(ctx: WarmContext): WarmSource[] {
  return programRegistry()
    .filter((e) => entryWave(e, ctx) === 1)
    .map((e) => source(e, ctx))
    .sort(longestFirst);
}

// Everything else the app can draw, after the intro. `ctx` is the page's
// context at the start (the batcher's count; every other variant is listed).
export function wave2Sources(ctx: WarmContext): WarmSource[] {
  return programRegistry()
    .filter((e) => entryWave(e, ctx) === 2)
    .map((e) => source(e, ctx))
    .sort(longestFirst);
}
