import type { Application, Container } from "pixi.js";
import { buildSceneGraph } from "../core/scene_graph";
import { GLYPHS2 } from "./glyph_switch";
import { buildSectionRuns, setGamutConfig } from "../core/section_colors";
import { buildWalkGraph } from "../core/walk_graph";
import type { WalkGraph } from "../core/walk_graph";
import type { ParticleSystem } from "../physics/particle_system";
import type { PhysicsHost } from "../physics/physics_host";
import { RibbonRenderer } from "../render/ribbon_renderer";
import { DebugRenderer } from "../render/debug_renderer";
import { FabricMazeRenderer } from "../render/fabric_maze_renderer";
import { FabricMazeController } from "../game/fabric_controller";
import type { Fire } from "../game/fire";
import type { FireClock } from "../game/fire_clock";
import type { MinotaurChase } from "../game/minotaur";
import type { TurnMinotaur } from "../game/minotaur_turns";
import type { RevealAnimator } from "../render/reveal";
import type { BackgroundLayer } from "../render/background";
import {
  backgroundColors,
  customBackgroundColors,
  parseHexColor,
} from "../render/background_model";
import type { ConfettiLayer } from "../render/confetti";
import type { PluckRipples } from "../render/pluck_ripple";
import type { A11yKey } from "../ui/accessibility";
import type { OffscreenIndicators } from "../ui/offscreen_indicators";
import type { PanelSettings } from "../ui/tweakpane_panel";
import type { UrlParams } from "../ui/url_state";
import type { createCamera } from "./camera";
import type { SceneRef } from "./scene_ref";

// K5 M4 (docs/design/K5_K6_split.md, 2.2): the scene, moved out of main()
// as it was: the scene `let`s behind the SceneRef (src/app/scene_ref.ts),
// the page ink, syncBackground, recolorScene and rebuild. main.ts calls
// createScene once, where it built the SceneRef. What rebuild calls that
// main.ts declares later comes in as closures on `deps`; the camera's view,
// the camera and the indicators as getters, and pendingWin and pendingLoss
// (which rebuild clears) as get/set pairs, so moved lines say
// `deps.<name>` for those. The returned Scene is the SceneRef with setters
// for the `let`s main.ts writes (chase and turnMino in restartChase, reveal
// through the lifecycle), the page ink the probe hooks read, and the three
// functions, which never change.
export const BACKGROUND = 0x151b28;

type Camera = ReturnType<typeof createCamera>;

// What the scene reads from main(): values, each assigned once; closures
// for the functions main.ts declares after createScene; accessors for the
// camera, the indicators and the two pending-banner flags.
export interface SceneDeps {
  // K115 stage 3a: the scene's title thread ("" unless a daily is up).
  dailyTitle: () => string;
  app: Application;
  root: Container;
  params: UrlParams;
  look: <K extends A11yKey>(key: K) => UrlParams[K];
  host: PhysicsHost;
  settings: PanelSettings;
  background: BackgroundLayer;
  confetti: ConfettiLayer;
  ripples: PluckRipples;
  fireOf: (w: WalkGraph) => Fire | null;
  fireClock: FireClock;
  syncExploration: (f: FabricMazeRenderer) => void;
  writeParams: (p: UrlParams) => void;
  rebuildAudioMap: () => void;
  syncDaily: () => void;
  saveAttempt: () => void;
  restartChase: () => void;
  resetAttempt: () => void;
  hideWin: () => void;
  restoreSavedAttempt: () => void;
  beginSettle: () => void;
  beginLoading: () => void;
  setCamFollow: (on: boolean) => void;
  fitToScreen: () => void;
  readonly view: Camera["view"];
  readonly camera: Camera;
  readonly indicators: OffscreenIndicators;
  pendingWin: boolean;
  pendingLoss: boolean;
}

// What createScene returns. Never destructure the `let`s' getters or cache
// a value read through them: a rebuild replaces it.
export interface Scene extends SceneRef {
  chase: MinotaurChase | null;
  turnMino: TurnMinotaur | null;
  reveal: RevealAnimator | null;
  readonly canvasInk: number;
  syncBackground: () => void;
  recolorScene: () => void;
  rebuild: () => void;
}

export function createScene(deps: SceneDeps): Scene {
  const {
    app,
    root,
    params,
    look,
    host,
    settings,
    background,
    confetti,
    ripples,
    fireOf,
    fireClock,
    syncExploration,
    writeParams,
    rebuildAudioMap,
    syncDaily,
    saveAttempt,
    restartChase,
    resetAttempt,
    hideWin,
    restoreSavedAttempt,
    beginSettle,
    beginLoading,
    setCamFollow,
    fitToScreen,
  } = deps;

  let ps: ParticleSystem | null = null;
  let renderer: RibbonRenderer | null = null;
  let debug: DebugRenderer | null = null;
  let walkGraph: WalkGraph | null = null;
  // The build's strand hue groups (maze plan; undefined in knot mode) +
  // strand count, kept for live recolors (the Look color controls).
  let buildHueGroup: number[] | undefined;
  let buildStrandCount = 0;
  let fabric: FabricMazeRenderer | null = null;
  let chase: MinotaurChase | null = null;
  let turnMino: TurnMinotaur | null = null;
  let fabricController: FabricMazeController | null = null;
  // Stage 22: the running appearance animation (null = instant / done
  // long ago). Rebuilds and "Replay settle" restart it.
  let reveal: RevealAnimator | null = null;

  // The page color: the shared ink, or a custom background's base color
  // (K79), which then shows behind none and under the flat fog too.
  function pageInk(): number {
    return look("backgroundColorMode") === "custom"
      ? parseHexColor(look("backgroundBase"), BACKGROUND)
      : BACKGROUND;
  }
  let canvasInk = BACKGROUND;

  // The background follows the design: effect + intensity + animation
  // speed + shape, the page ink and the design's gamut accents (or the
  // custom colors), the seed - and the fog of war (when on) draws as the
  // background instead of a flat color.
  function syncBackground(): void {
    const effHue = (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
    setGamutConfig(params.gamutArc, look("palette"));
    const ink = pageInk();
    if (ink !== canvasInk) {
      canvasInk = ink;
      app.canvas.style.background = `#${ink.toString(16).padStart(6, "0")}`;
    }
    // Shape first: an effect that turns on below lays out at its scale.
    background.setShape({
      scale: params.backgroundScale,
      detail: params.backgroundDetail,
      fibers: params.backgroundFibers,
      grain: params.backgroundGrain,
      angle: params.backgroundAngle,
    });
    background.configure(
      look("background"),
      params.backgroundIntensity,
      params.backgroundSpeed
    );
    background.setDesign(
      look("backgroundColorMode") === "custom"
        ? customBackgroundColors(
            look("backgroundBase"),
            params.backgroundAccent1,
            params.backgroundAccent2,
            params.backgroundAccent3,
            BACKGROUND
          )
        : backgroundColors(BACKGROUND, effHue),
      params.seed
    );
    fabric?.setFogColor(ink);
    fabric?.setFogBackdrop(background.texture);
  }

  // Recolor the live scene in place (the look color rows, and K111's high
  // contrast, which swaps the palette and the route color): no rebuild, no
  // wake. The background follows through syncBackground().
  function recolorScene(): void {
    if (!renderer || !ps) return;
    const effHue = (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
    setGamutConfig(params.gamutArc, look("palette"));
    renderer.recolor(
      effHue,
      parseInt(look("pathColor").slice(1), 16),
      params.colorScheme === "strands"
        ? buildHueGroup
        : new Array<number>(buildStrandCount).fill(0),
      buildSectionRuns(
        params.colorScheme,
        walkGraph,
        ps.chains.map((c, i) => ({ len: c.length, closed: ps!.chainBreakAfter[i] < 0 })),
        buildHueGroup,
        params.seed,
        effHue
      ),
      params.colorScheme,
      params.seed,
      params.junctionBlend
    );
    if (fabric && fabricController) fabric.update(fabricController);
  }

  function rebuild(): void {
    // K47/K56: a change that leaves the daily parks its attempt first; one
    // that keeps it (a rebuild of the daily itself) saves the attempt now,
    // to restore it into the new scene below.
    syncDaily();
    saveAttempt();
    // K140: the old maze's finish is gone, and so is its confetti.
    confetti.clear();
    // K279: and its ripples.
    ripples.clear();
    renderer?.destroy();
    debug?.container.destroy({ children: true });
    fabric?.destroy();
    root.removeChildren();

    // The lattice, and in fabric mode the maze plan's graph surgery
    // (core/scene_graph.ts; K7 stage 1 moved it there unchanged).
    const sceneParams = { ...params, title: deps.dailyTitle(), glyphs2: GLYPHS2 };
    const { graph, hueGroup, walk: builtWalk } = buildSceneGraph(sceneParams);

    // K7: the host owns the system; `ps` is main's read-only view of it.
    ps = host.build(graph, sceneParams);
    buildHueGroup = hueGroup;
    buildStrandCount = graph.strands.length;

    // Color space for this build: seed hue rotated by hueShift; arc width
    // and palette preset configure gamutRgb for every consumer (schemes
    // AND the renderer's per-sample noise path).
    const effHue = (((params.seed % 360) + params.hueShift) % 360 + 360) % 360;
    setGamutConfig(params.gamutArc, look("palette"));

    // The walk graph feeds both the section coloring and (in fabric mode)
    // the gameplay, so it builds before the renderer.
    // K115 stage 2: a text scene plays like a fabric scene (its word is
    // the maze: walk graph, controller, markers at mentr_a/mexit_a via
    // walk start/exit). It keeps the knot-mode data fabric surgery would
    // need: no maze plan (scene_graph skips it), hueGroup undefined, so
    // section colors take their per-chain fallback (section_colors).
    walkGraph = params.mazeFabric ? (builtWalk ?? buildWalkGraph(graph)) : null;

    renderer = new RibbonRenderer(ps, {
      threadWidth: params.threadWidth,
      casingWidth: params.threadWidth + look("gap") * 2,
      baseHue: effHue,
      pathColor: parseInt(look("pathColor").slice(1), 16),
      // Knot-mode tints only (palette mode colors via the section field):
      // per-strand hues for the strands scheme, mono otherwise.
      hueGroup:
        params.colorScheme === "strands"
          ? hueGroup
          : graph.strands.map(() => 0),
      // Fabric gameplay recolors the actual threads via palette textures.
      paletteMode: params.mazeFabric,
      flowSeed: params.seed,
    });
    renderer.setSectionRuns(
      buildSectionRuns(
        params.colorScheme,
        walkGraph,
        ps.chains.map((c, i) => ({ len: c.length, closed: ps!.chainBreakAfter[i] < 0 })),
        hueGroup,
        params.seed,
        effHue // The gamut anchor; matches style.baseHue.
      ),
      params.colorScheme,
      params.seed,
      params.junctionBlend
    );

    // Branching gameplay over the fabric: branch-point-only solve state +
    // the thread-true paint overlay (the walk graph was built above).
    if (params.mazeFabric && walkGraph) {
      fabricController = new FabricMazeController(
        walkGraph,
        params.pathViz === "trail",
        fireOf(walkGraph) // K114: null with the fire off.
      );
      fabric = new FabricMazeRenderer(
        ps,
        walkGraph,
        params.threadWidth,
        renderer
      );
      fabric.telegraphCoarse =
        window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 700;
      fabric.trailMode = params.pathViz === "trail";
      fabric.pathViz = params.pathViz;
      fabric.tension = params.tension;
      fabric.trailLength = params.trailLength;
      syncExploration(fabric);
      fabric.markerSize = look("markerSize");
      fabric.fogColor = pageInk();
      fabric.update(fabricController);
    } else {
      fabricController = null;
      fabric = null;
    }
    syncBackground();
    deps.pendingWin = false;
    deps.pendingLoss = false;
    fireClock.reset();
    restartChase();
    resetAttempt();
    hideWin();
    rebuildAudioMap();

    // Appearance animation: settle hidden first, then attach the reveal
    // (K147: beginSettle's pre-settle, finishPresettle; physics off: the
    // whole layout, finishLoading) - or, instant, show and settle at once.
    if (params.physics) {
      beginSettle();
    } else {
      beginLoading();
    }
    // K47: a daily opens where its saved attempt left off.
    restoreSavedAttempt();

    debug = new DebugRenderer();
    debug.render(graph);
    // The debug renderer draws at cellSize px per lattice unit; the root
    // container already maps lattice units to screen, so counter-scale.
    debug.container.scale.set(1 / debug.cellSize);
    debug.container.visible = settings.showDebug;

    // Order: head glow UNDER the weave, ribbons, the fabric gameplay
    // overlay, debug.
    if (fabric) root.addChild(fabric.underContainer);
    root.addChild(renderer.root);
    if (fabric) root.addChild(fabric.overContainer);
    root.addChild(debug.container);
    // A new scene starts at the home view (user zoom/pan reset); a
    // follow camera takes over from this framing on the next frame.
    setCamFollow(false);
    deps.view.zoom = 1;
    deps.view.panX = 0;
    deps.view.panY = 0;
    deps.camera.viewHoming = false;
    deps.camera.camTween = null;
    // The off-screen indicators decide again on the new scene's first
    // frame.
    deps.indicators.hideAll();
    fitToScreen();
    writeParams(params);

    console.log(
      `KnotMaze: seed ${params.seed}, ${graph.nodes.size} nodes, ` +
        `${graph.edges.size} edges, ${graph.strands.length} strands.`
    );
  }

  return {
    get ps() {
      return ps;
    },
    get renderer() {
      return renderer;
    },
    get debug() {
      return debug;
    },
    get walkGraph() {
      return walkGraph;
    },
    get buildHueGroup() {
      return buildHueGroup;
    },
    get buildStrandCount() {
      return buildStrandCount;
    },
    get fabric() {
      return fabric;
    },
    get chase() {
      return chase;
    },
    set chase(v) {
      chase = v;
    },
    get turnMino() {
      return turnMino;
    },
    set turnMino(v) {
      turnMino = v;
    },
    get fabricController() {
      return fabricController;
    },
    get reveal() {
      return reveal;
    },
    set reveal(v) {
      reveal = v;
    },
    get canvasInk() {
      return canvasInk;
    },
    syncBackground,
    recolorScene,
    rebuild,
  };
}
