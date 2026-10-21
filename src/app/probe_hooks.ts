import type { Application, Container } from "pixi.js";
import type { KnotSynth } from "../audio/knot_synth";
import type { SnoreSfx } from "../audio/snore_sfx";
import { mazeTaps, walkFingerprint } from "../game/daily_attempt";
import { todayNumber } from "../game/daily_calendar";
import { dailyHistory } from "../game/daily_store";
import { CHASE_HZ } from "../game/minotaur";
import type { DailyStore, SolveRecord } from "../game/daily_store";
import type { SolveClock } from "../game/maze_stats";
import type { PhysicsTuning } from "../physics/particle_system";
import type { PhysicsHost } from "../physics/physics_host";
import { hashDump } from "../physics/probe_dump";
import type { BackgroundLayer } from "../render/background";
import type { ConfettiLayer } from "../render/confetti";
import { confettiPlanFor } from "../render/confetti_model";
import { EXPLORE_LOOKS } from "../render/explore_glsl";
import type { FabricMazeRenderer } from "../render/fabric_maze_renderer";
import type { PluckRipple } from "../render/pluck_model";
import type { PluckRipples } from "../render/pluck_ripple";
import { overriddenKeys } from "../ui/accessibility";
import type { A11yFlags, A11yKey, ContrastSetting } from "../ui/accessibility";
import { DAILY_EXEMPT_KEYS } from "../ui/daily_link";
import {
  DIAGONALS,
  chordEdges,
  chordMap,
  chordMatters,
  keyMap,
  pickChord,
  pickDeparture,
  pickHold,
} from "../ui/key_moves";
import type { Departure, HeldKeys, KeyDir, MoveWait } from "../ui/key_moves";
import type { LossBanner } from "../ui/maze_hud";
import type { ModeBadge } from "../ui/mode_badge";
import type { MotionSetting } from "../ui/motion";
import type { MovePad } from "../ui/move_pad";
import type { OffscreenIndicators } from "../ui/offscreen_indicators";
import { REVEAL_END_CROSSES, REVEAL_END_GLOWS, pathVizOf } from "../ui/url_state";
import type { UrlParams } from "../ui/url_state";
import { panRange } from "../ui/view_clamp";
import type { OpenPanel, PanBounds } from "../ui/view_clamp";
import { flagNames, VISUAL, Flag } from "./loop_flags";
import type { LoopFlags } from "./loop_flags";
import type { SceneRef } from "./scene_ref";
import type { ContextLossHandle } from "./context_loss";

// K114 walker: __knotFabric().walker. `state`: Lead's "plan" or "walk"
// (Delay: "turns"); `idx`: the next route state Lead walks; `par` and
// `parCuts`: Lead's par and a cut set that meets it (null and [] in Delay,
// or when no cut set reaches the exit); `cuts`: the cut runs; `route`: the
// runs Lead's route takes from the entrance, or Delay's way to the exit
// from the head as the cuts stand; `end`: where Lead's route ends (Delay:
// null); `walk`: the runs walked; `shortest`: the uncut maze's route in
// runs; `shown`: the Go, Reset and Undo buttons show.
export interface WalkerProbe {
  mode: "lead" | "delay";
  state: "plan" | "walk" | "turns";
  idx: number;
  par: number | null;
  parCuts: number[];
  cuts: number[];
  route: number[];
  end: "exit" | "loop" | "none" | null;
  walk: number;
  shortest: number;
  shown: boolean;
}

// K5 (docs/design/K5_K6_split.md 2.2, M1 step 5): everything the probe
// hooks reach in main(). The hooks read it at call time, never at install
// time: the scene is null until the first rebuild(), and main.ts builds
// this object once, where the hooks used to be.
export interface ProbeCtx {
  // The scene `let`s that rebuild() and the mode switches reassign.
  scene: SceneRef;
  // Assigned once (in main(), or main.ts's `app`); read at call time.
  a11y: A11yFlags;
  app: Application;
  background: BackgroundLayer;
  clock: SolveClock;
  confetti: ConfettiLayer;
  contrast: ContrastSetting;
  dailyStore: DailyStore;
  fitCur: { scale: number; x: number; y: number };
  frameCost: Float32Array<ArrayBuffer>;
  heldKeys: HeldKeys;
  host: PhysicsHost;
  indicators: OffscreenIndicators;
  // K6-1: the frame loop's flag ledger (main.ts creates it first), and the
  // stamp element the loop tracker's DOM watch leaves out.
  loopFlags: LoopFlags;
  stampEl: HTMLElement;
  lossBanner: LossBanner;
  modeBadge: ModeBadge;
  motion: MotionSetting;
  movePad: MovePad;
  moveWait: MoveWait;
  panAllow: PanBounds;
  params: UrlParams;
  revealCost: Float32Array<ArrayBuffer>;
  ripples: PluckRipples;
  root: Container;
  snore: SnoreSfx;
  songLog: { at: number; lead: number; note: string | null; clock: string }[];
  synth: KnotSynth;
  view: { zoom: number; panX: number; panY: number };
  // main()'s functions the hooks call.
  applyPhysicsMode: () => void;
  attemptLate: () => boolean;
  freqForCtrl: (chain: number, ctrl: number) => number;
  handRendererLook: () => void;
  keyDepartures: (v: string, reach?: number) => Departure[];
  keysLive: () => boolean;
  keyVertex: () => string | null;
  look: <K extends A11yKey>(key: K) => UrlParams[K];
  moveAlong: (eid: number) => boolean;
  nowSec: () => number;
  openPanel: () => OpenPanel | null;
  physicsInputsChanged: () => void;
  physicsTuning: () => PhysicsTuning;
  playDaily: (n: number, floating?: boolean) => void;
  pluckUnit: (
    chain: number,
    ctrl: number
  ) => { spanCtrl: [number, number] | null; reach: number };
  replaySettle: () => void;
  startRipple: (
    chain: number,
    at: { ctrl?: number; arc?: number },
    strength: number,
    delay?: number,
    look?: PluckRipple
  ) => void;
  syncBackground: () => void;
  syncExploration: (f: FabricMazeRenderer) => void;
  throwConfetti: () => void;
  tugAt: (
    chain: number,
    at: { ctrl?: number; arc?: number },
    side: number,
    amount: number
  ) => void;
  waitTurn: () => boolean;
  wake: () => void;
  writeParams: (p: UrlParams) => void;
  // main()'s `let`s the hooks read: getters, so a hook sees the current value.
  readonly attemptDaily: number | null;
  readonly attemptDay: number;
  readonly attemptRecord: SolveRecord | null;
  readonly attemptStartedAt: number;
  readonly camFollow: boolean;
  readonly camTouchedAt: number;
  readonly camTween: {
    t: number;
    dur: number;
    s0: number;
    x0: number;
    y0: number;
    s1: number;
    x1: number;
    y1: number;
    hold: number;
  } | null;
  readonly canvasInk: number;
  readonly dailyFloating: boolean;
  readonly dailyN: number | null;
  readonly finishWhy: string;
  readonly fitRight: number;
  readonly frameCostN: number;
  readonly frameCostTotal: number;
  readonly headWhy: string;
  readonly keyHold: boolean;
  readonly lastWin: { text: string; url: string } | null;
  readonly loaderShownAt: number;
  readonly panelT: number;
  readonly pendingLoss: boolean;
  readonly physState: "live" | "loading" | "settling" | "frozen";
  readonly revealMsTotal: number;
  readonly sceneWasAnimating: boolean;
  readonly loopHalted: boolean;
  // K6-3: the frame loop's stopped state and its continuous switch.
  readonly loopStopped: boolean;
  setLoopContinuous(on: boolean): void;
  // K456: the lost-context handling (src/app/context_loss.ts) and whether
  // the frame loop is suspended for it.
  contextLoss: ContextLossHandle;
  readonly loopSuspended: boolean;
  readonly turnWait: number;
  // K114: the scissors armed, a cut waiting for the move to end (-1: none),
  // and whether the scissors and Undo buttons show.
  readonly cutArmed: boolean;
  readonly pendingCut: number;
  // K137 stage 3a: the hearts left of the lives setting (null: lives off or
  // no minotaur), in __knotChase() and __knotTurnMino().
  readonly hearts: { left: number; of: number } | null;
  // K137 stage 3c: sprint's state (ready | armed | first | used; null:
  // sprint off or no minotaur), whether its button shows, and a press of it
  // (the button's and F's path; true when it acted).
  readonly sprint: string | null;
  readonly sprintShown: boolean;
  pressSprint(): boolean;
  // K137 stage 4: the lures and snares (their HUD rows, null: that tool
  // off), the armed tool, whether the buttons show, the snares laid and
  // the model's lure counts and the run the last armed tap picked (-1:
  // none), in __knotTurnMino(); and a press of a tool's button (the
  // button's and L / N's path; true when it acted).
  readonly tools: {
    lures: { left: number; of: number } | null;
    snares: { left: number; of: number } | null;
    armed: "lure" | "snare" | null;
    shown: boolean;
    laid: { edge: number; phase: string; holder: number | null; left: number }[];
    lured: number;
    heardBy: number;
    tapEdge: number;
  };
  pressTool(k: "lure" | "snare"): boolean;
  readonly cutShown: boolean;
  // K114 walker: the walker's view (null: no walker; WalkerProbe).
  readonly walker: WalkerProbe | null;
  // main()'s `let`s the hooks also write: get/set pairs (written by several
  // regions, so main.ts keeps them until their owners move).
  chaseRunning: boolean;
  hcLookChoice: number;
  tapsWait: boolean;
  // `renderDirty = true` (the frame loop's flag, written by several regions).
  invalidate(): void;
}

export function installProbeHooks(ctx: ProbeCtx): void {
  // The live design params (a copy). The address bar holds one compact
  // token (ui/param_codec.ts), so probes read settings here, not the URL.
  (window as unknown as Record<string, unknown>).__knotParams = () => ({
    ...ctx.params,
  });
  // K325 probes: the snore's load counts and its clock.
  (window as unknown as Record<string, unknown>).__knotSnore = () => ({
    ...ctx.snore.stats,
    sinceStartMs: ctx.snore.sinceStartMs(),
  });
  // K19/K20 probes: the daily on screen, the attempt, the clock and the
  // stored records (as the stats view reads them).
  (window as unknown as Record<string, unknown>).__knotDaily = () => ({
    daily: ctx.dailyN,
    floating: ctx.dailyFloating,
    today: todayNumber(),
    attemptDaily: ctx.attemptDaily,
    attemptDay: ctx.attemptDay,
    attemptStartedAt: ctx.attemptStartedAt,
    attemptRecord: ctx.attemptRecord,
    clock: { state: ctx.clock.state, ms: ctx.clock.elapsed(performance.now()) },
    junctions: ctx.scene.fabricController ? [...ctx.scene.fabricController.visitedJunctions] : [],
    deadEnds: ctx.scene.fabricController ? [...ctx.scene.fabricController.deadEndTips] : [],
    moves: ctx.scene.fabricController ? ctx.scene.fabricController.moveLog.join("") : "",
    taps: ctx.scene.fabricController ? [...ctx.scene.fabricController.taps] : [],
    path: ctx.scene.fabricController ? [...ctx.scene.fabricController.pathEdges] : [],
    head: ctx.scene.fabricController?.head ?? null,
    backtrack: ctx.scene.fabricController?.backtrackDist ?? 0,
    // K552: the title thread on screen, the solve's maze-form taps (what a
    // saved attempt holds) and the walk's maze-portion fingerprint.
    titled: ctx.scene.walkGraph?.mazeStart !== undefined,
    mazeStart: ctx.scene.walkGraph?.mazeStart ?? null,
    mazeTaps: ctx.scene.fabricController ? mazeTaps(ctx.scene.fabricController) : [],
    maze: ctx.scene.walkGraph ? walkFingerprint(ctx.scene.walkGraph) : null,
    // K47/K56: the saved attempt of the daily on screen, and the prefs.
    saved: ctx.dailyN !== null ? (ctx.dailyStore.attempt(ctx.dailyN) ?? null) : null,
    exempt: [...DAILY_EXEMPT_KEYS],
    prefs: ctx.dailyStore.prefs(),
    share: ctx.lastWin,
    storeStatus: ctx.dailyStore.status,
    store: ctx.dailyStore.data(),
    // K73/K151: the mode badge on screen ("free" | "daily" | "replay" |
    // "practice"), its label, and K146's practice test for this attempt.
    badge: ctx.modeBadge.kind,
    badgeText: ctx.modeBadge.el.hidden ? "" : ctx.modeBadge.el.innerText.trim(),
    late: ctx.attemptLate(),
    // K146: the stats view's History as it reads it.
    history: dailyHistory(ctx.dailyStore.data(), todayNumber()),
  });
  (window as unknown as Record<string, unknown>).__knotPlayDaily = (n: number) =>
    ctx.playDaily(n);
  // K73 probes: every off-screen indicator's last decision (status, the
  // target's screen point, its placement), why the finish's hides, and the
  // camera tween a tap runs.
  (window as unknown as Record<string, unknown>).__knotIndicators = () => ({
    indicators: ctx.indicators.state(),
    finishWhy: ctx.finishWhy,
    headWhy: ctx.headWhy,
    tween: ctx.camTween !== null,
    follow: ctx.camFollow,
    // Seconds since the last gesture: the follow spring is at full strength
    // from FOLLOW_DELAY + FOLLOW_RAMP (K148's return to the head sets it).
    followIdle: ctx.nowSec() - ctx.camTouchedAt,
  });
  // Diagnostic hooks for the automated crossing scanner.
  (window as unknown as Record<string, unknown>).__knotDiag = () =>
    ctx.scene.renderer ? Array.from(ctx.scene.renderer.getDiag().data) : [];
  (window as unknown as Record<string, unknown>).__knotView = () => ({
    x: ctx.root.position.x,
    y: ctx.root.position.y,
    s: ctx.root.scale.x,
    // The fit camera's own state (K149 probes; stale under the follow
    // camera): the zoom on top of the auto-fit and its screen-space pan.
    zoom: ctx.view.zoom,
    panX: ctx.view.panX,
    panY: ctx.view.panY,
    // K198 probes: the open panel (left edge, the maze's fit-screen right
    // edge), the pan range at this zoom and the ease's allowance.
    panel: ctx.openPanel(),
    mazeRight: ctx.fitCur.x + ctx.fitRight * ctx.fitCur.scale,
    range: panRange(ctx.app.screen.width, ctx.app.screen.height, ctx.view.zoom, ctx.openPanel()),
    allow: { ...ctx.panAllow },
    // K198 stage 2: the panel's tweened openness (0 shut, 1 open).
    panelT: ctx.panelT,
  });
  // K101: the music notes handed out lately (start time on their clock,
  // lead = how far ahead of the tick that scheduled them) and the clocks.
  (window as unknown as Record<string, unknown>).__knotSong = () => ({
    notes: ctx.songLog.slice(),
    audioTime: ctx.synth.audioTime(),
    wallTime: performance.now() / 1000,
  });
  (window as unknown as Record<string, unknown>).__knotInspect = (
    x: number,
    y: number
  ) => ctx.scene.renderer?.requestInspect(x, y);
  // Physics-side twin of __knotDiag: binding state per crossing (world
  // position, ctrls, separation), contact regime, emergent count.
  (window as unknown as Record<string, unknown>).__knotPhys = () => {
    const sys = ctx.scene.ps;
    if (!sys) return null;
    const scratch = new Float32Array(4);
    return {
      sticky: sys.contactsStatic,
      simTime: sys.simTime,
      emergent: sys.emergentCrossings.length,
      emergentList: sys.emergentCrossings.map((em) => {
        sys.bindingPoint(em.over, scratch, 0);
        return { x: scratch[0], y: scratch[1] };
      }),
      crossings: sys.crossings.map((c) => {
        sys.bindingPoint(c.over, scratch, 0);
        sys.bindingPoint(c.under, scratch, 2);
        return {
          x: (scratch[0] + scratch[2]) / 2,
          y: (scratch[1] + scratch[3]) / 2,
          over: `${c.over.chain}:${c.over.ctrl.toFixed(2)}`,
          under: `${c.under.chain}:${c.under.ctrl.toFixed(2)}`,
          sep: sys.crossingSeparation(c),
        };
      }),
      slide: sys.readSlideStats(),
    };
  };
  // Raw system access for probe scripting (phase probe, slide stats). With
  // phw=1 it is the worker's mirror: readable, and assigning its `step`
  // throws (use the bridge below).
  (window as unknown as Record<string, unknown>).__knotPS = () => ctx.scene.ps;
  // K7 STAGE 4, THE PROBE BRIDGE (design 8; .claude/rules/probes.md): the
  // same Promises on both physics hosts. __knotPhysFreeze(on) stops the
  // live clock (in-thread: the old `__knotPS().step = function(){}` patch
  // itself); __knotStepUntil(t) steps 1/60 s frames to sim time t, frozen
  // or not; __knotPhysDump() hashes (and with {arrays: true} returns)
  // positions, prev, zPos and the pass ctrls. Each requests a render, and
  // the state is in `__knotPS()` once the Promise resolves.
  (window as unknown as Record<string, unknown>).__knotPhysFreeze = (on = true) =>
    ctx.host.freeze(on).then((r) => {
      ctx.invalidate();
      return { ...r, kind: ctx.host.kind };
    });
  (window as unknown as Record<string, unknown>).__knotStepUntil = (simTime: number) =>
    ctx.host.stepUntil(simTime, ctx.physicsTuning()).then((t) => {
      ctx.invalidate();
      return t;
    });
  (window as unknown as Record<string, unknown>).__knotPhysDump = (
    o: { arrays?: boolean } = {}
  ) =>
    ctx.host.dump().then((d) => ({
      gen: d.gen,
      simTime: d.simTime,
      n: d.zPos.length,
      c: d.passes.length / 4,
      kind: ctx.host.kind,
      hashes: hashDump(d),
      ...(o.arrays
        ? {
            positions: Array.from(d.positions),
            prev: Array.from(d.prev),
            zPos: Array.from(d.zPos),
            passes: Array.from(d.passes),
          }
        : {}),
    }));
  // Appearance-reveal diagnostics: mode, clock, completion, frontier FX.
  (window as unknown as Record<string, unknown>).__knotReveal = () =>
    ctx.scene.reveal
      ? {
          mode: ctx.scene.reveal.mode,
          done: ctx.scene.reveal.done,
          clock: ctx.scene.reveal.clock,
          duration: ctx.scene.reveal.planDuration,
          fx: ctx.params.appearFx,
          fxAlive: ctx.scene.renderer?.appearFxAlive() ?? 0,
          // K7 stage 4: reveal.tick's ms in the last frame and since load.
          tickMs: ctx.revealCost[(ctx.frameCostN - 1 + ctx.revealCost.length) % ctx.revealCost.length],
          tickMsTotal: ctx.revealMsTotal,
        }
      : null;
  // Raw renderer access for probe scripting (patch visibility/tinting).
  (window as unknown as Record<string, unknown>).__knotRenderer = () =>
    ctx.scene.renderer;
  // K80 real-time chase diagnostics (null outside the real-time mode): the
  // chase's state, with the minotaur's SCREEN point while fabric draws it.
  // __knotChaseTap(edge) queues a run as a tap on it would (and starts the
  // chase); __knotChaseObj() is the live MinotaurChase. K324 stage 1: `hold`
  // is the junction stop it is standing out (ticks left, 0 = none; a long
  // stop is mode "pause"), `arrivals` its junction arrivals so far, `plan`
  // the route the telegraph will show (plan() at minoTelegraphRuns) and
  // `plan8` the longest reach.
  (window as unknown as Record<string, unknown>).__knotChase = () => {
    if (!ctx.scene.chase) return null;
    const ch = ctx.scene.chase;
    const out = new Float32Array(2);
    const shown = !!ctx.scene.fabric && ctx.scene.fabric.minotaurWorld(out);
    const at = (s: { edge: number; vertex: number }): string | null =>
      s.edge < 0 ? ch.g.ids[s.vertex] : null;
    return {
      running: ctx.chaseRunning,
      tick: ch.tick,
      seconds: ch.seconds,
      catches: ch.catches,
      restarts: ch.restarts,
      hearts: ctx.hearts, // K137 stage 3a
      // K137 stage 3c: sprint (main.ts's state; the chase's sprinted
      // departures left and the ticks it was armed at).
      sprint: ctx.sprint,
      sprintShown: ctx.sprintShown,
      sprintLeft: ch.sprintLeft,
      sprintActive: ch.sprintActive,
      sprints: [...ch.sprints],
      // K137 stage 3b: the sword (null: off or none laid) and its id.
      sword: ch.sword ? { ...ch.sword, at: ch.g.ids[ch.sword.spot] } : null,
      fleeing: ch.fleeing,
      slain: ch.slain,
      walked: ch.walked,
      moves: ctx.scene.fabricController ? ctx.scene.fabricController.moveLog.join("") : "",
      huntSeconds: ch.huntSeconds,
      finished: ch.finished,
      mode: ch.mode,
      hold: ch.hold,
      holdSeconds: ch.hold / CHASE_HZ,
      arrivals: ch.arrivals,
      // K324 stage 3: the model it plays and its decisions so far (the
      // guard's hunting steps and the stalker's every step draw one).
      model: ch.params.model,
      decisions: ch.decisions,
      plan: ch.plan(ctx.params.minoTelegraphRuns),
      plan8: ch.plan(8),
      player: { ...ch.player },
      playerAt: at(ch.player),
      mino: { ...ch.mino },
      minoAt: at(ch.mino),
      decisionVertex: ch.decisionVertex,
      playerMoving: ch.playerMoving,
      playerProgress: ch.playerProgress,
      // Infinity (the player is on a tail) serializes as null.
      huntDistance: ch.huntDistance(),
      contactDistance: ch.contactDistance(),
      params: { ...ch.params },
      inputs: ch.inputs.map((i) => ({ ...i })),
      minoShown: shown,
      minoUnderFog: ctx.scene.fabric?.minotaurUnderFog ?? false,
      minoRadius: ctx.scene.fabric?.minotaurRadius() ?? 0,
      minoScreen: shown
        ? {
            x: out[0] * ctx.root.scale.x + ctx.root.position.x,
            y: out[1] * ctx.root.scale.y + ctx.root.position.y,
          }
        : null,
    };
  };
  (window as unknown as Record<string, unknown>).__knotChaseTap = (
    edge: number
  ): "queued" | "reject" | null => {
    if (!ctx.scene.chase) return null;
    const r = ctx.scene.chase.tap(edge);
    if (r === "queued") ctx.chaseRunning = true;
    return r;
  };
  (window as unknown as Record<string, unknown>).__knotChaseObj = () => ctx.scene.chase;
  // K80 turns diagnostics (null without the turn minotaur): its state, the
  // committed move the telegraph shows, and the minotaur's SCREEN point while
  // fabric draws it. __knotTurnMove(edge) moves along run `edge` as a tap on
  // it would; __knotTurnWait() is a tap on your own junction (K80 turns 3a:
  // main.ts inputWait, so mid-turn it waits for the arrival);
  // __knotTurnMinoObj() is the live TurnMinotaur.
  (window as unknown as Record<string, unknown>).__knotTurnMino = () => {
    if (!ctx.scene.turnMino) return null;
    const tm = ctx.scene.turnMino;
    const out = new Float32Array(2);
    const shown = !!ctx.scene.fabric && ctx.scene.fabric.minotaurWorld(out);
    const ids = tm.g.ids;
    const tel = tm.telegraph();
    return {
      model: ctx.params.minotaur,
      config: { ...tm.cfg },
      catches: tm.catches,
      closeCalls: tm.closeCalls,
      seen: tm.seen,
      restarts: tm.restarts,
      hearts: ctx.hearts, // K137 stage 3a
      // K137 stage 3c: sprint (main.ts's state; the turns the minotaur
      // skipped, as input indices, and whether a skip waits for its pair).
      sprint: ctx.sprint,
      sprintShown: ctx.sprintShown,
      skips: [...tm.skips],
      sprintPending: tm.sprintPending,
      // K137 stage 3b: the sword (null: off or none laid) and its id.
      sword: tm.sword ? { ...tm.sword, at: ids[tm.sword.spot] } : null,
      fleeing: tm.fleeing,
      slain: tm.slain,
      // K137 stage 3d: the extra monsters (sleepers, the follower): kind,
      // phase (asleep / waiting / awake), where each stands (its spot, and
      // the vertex id while it is on one), and home's id; the sleepers
      // woken this attempt, and the extra whose catch was last (-1: none).
      monsters: tm.extras.map((x, i) => {
        const v = tm.extraViews[i];
        return {
          kind: x.kind,
          phase: v.phase,
          spot: { ...v.spot },
          at: v.spot.edge < 0 ? ids[v.spot.vertex] : null,
          home: ids[x.home],
          trail: x.trail.length,
        };
      }),
      woken: tm.woken,
      lastCatcher: tm.lastCatcher,
      tools: ctx.tools, // K137 stage 4: lures and snares
      moves: ctx.scene.fabricController ? ctx.scene.fabricController.moveLog.join("") : "",
      turns: tm.turns,
      lifeTurn: tm.lifeTurn,
      finished: tm.finished,
      mode: tm.mode,
      hunting: tm.hunting,
      player: ids[tm.player],
      head: ctx.scene.fabricController?.head ?? null,
      minoAt: ids[tm.state.v],
      state: { ...tm.state },
      // K481 stage 2: the by-length animation and catch moment.
      minoSpot: { ...tm.mino },
      lastTravel: tm.lastTravel,
      lastContact: tm.lastContact
        ? { t: tm.lastContact.t, mino: { ...tm.lastContact.mino }, player: { ...tm.lastContact.player } }
        : null,
      progress: tm.progress,
      lastPath: tm.lastPath.map(([e, b]) => [e, ids[b]]),
      telegraph: tel
        ? {
            from: ids[tel.from],
            steps: tel.steps.map(([e, b]) => [e, ids[b]]),
            dest: ids[tel.dest],
            // K481 stage 2: by-length stops (ticks) and route spots.
            fromSpot: tel.fromSpot ? { ...tel.fromSpot } : null,
            stops: tel.stops
              ? tel.stops.map((s) => ({ edge: s.edge, travel: s.travel, spot: { ...s.spot }, caught: s.caught ?? false }))
              : null,
          }
        : null,
      teleHover: ctx.scene.fabric?.telegraphHoverEdge ?? null,
      teleCoarse: ctx.scene.fabric?.telegraphCoarse ?? false,
      inputs: [...tm.inputs],
      waiting: ctx.turnWait,
      minoShown: shown,
      minoUnderFog: ctx.scene.fabric?.minotaurUnderFog ?? false,
      minoScreen: shown
        ? {
            x: out[0] * ctx.root.scale.x + ctx.root.position.x,
            y: out[1] * ctx.root.scale.y + ctx.root.position.y,
          }
        : null,
    };
  };
  (window as unknown as Record<string, unknown>).__knotTurnMove = (
    edge: number
  ): boolean => ctx.moveAlong(edge);
  (window as unknown as Record<string, unknown>).__knotTurnWait = (): boolean =>
    ctx.waitTurn();
  // K137 stage 3c: press sprint as its button or F would (either clock).
  (window as unknown as Record<string, unknown>).__knotSprint = (): boolean =>
    ctx.pressSprint();
  // K137 stage 4: press the lure or snare button as it or L / N would.
  (window as unknown as Record<string, unknown>).__knotTool = (k: "lure" | "snare"): boolean =>
    ctx.pressTool(k);
  (window as unknown as Record<string, unknown>).__knotTurnMinoObj = () =>
    ctx.scene.turnMino;
  // Fabric-maze diagnostics: solve state, metrics, and each current choice
  // with a tappable SCREEN point (via the live root transform) plus its
  // cost-to-exit, for scripted solve verification.
  (window as unknown as Record<string, unknown>).__knotFabric = () => {
    if (!ctx.scene.fabric || !ctx.scene.fabricController || !ctx.scene.walkGraph) return null;
    const c = ctx.scene.fabricController;
    const wg = ctx.scene.walkGraph;
    const fb = ctx.scene.fabric;
    const out = new Float32Array(2);
    const toScreen = (wx: number, wy: number): { x: number; y: number } => ({
      x: wx * ctx.root.scale.x + ctx.root.position.x,
      y: wy * ctx.root.scale.y + ctx.root.position.y,
    });
    const sys = ctx.scene.ps!;
    return {
      head: c.head,
      solved: c.solved,
      animating: fb.animating,
      pathLength: c.pathLength,
      optimal: wg.optimalLength,
      backtrack: c.backtrackDist,
      walked: c.walkedDist, // K155
      // K137: fragile runs and par. `broken` / `cracked`: run ids (empty
      // with fragile off); `stranded`: no unbroken way to the exit; `par`:
      // P, computed in every par mode (Infinity: no route); `strokesLeft`:
      // P minus the moves made; `parLost`: strict par lost.
      broken: c.brokenRuns(),
      cracked: c.crackedRuns(),
      stranded: c.stranded,
      parMode: c.parMode,
      par: c.par,
      strokesLeft: c.strokesLeft,
      parLost: c.parLost,
      // K139: the collapse game (null: collapse off). `units` / `total`:
      // collapsed and all maze-run units; `pct`: the score; `par`: its
      // search (units, tripped, steps; the first read runs it).
      collapse: c.collapseOn
        ? (() => {
            const p = c.collapsePar!;
            return {
              mode: c.collapse,
              units: c.collapsedUnits,
              total: c.collapseTotal,
              pct: c.collapsePercent,
              par: { units: p.units, total: p.total, tripped: p.tripped, steps: p.steps },
            };
          })()
        : null,
      // K114: the cut (null: cut off). `runs`: the cut runs; `actions`: the
      // action log's length (moves and cuts); `carry`: the runs a move has
      // still to carry on along; `pending`: a cut waiting for the move to end.
      cut: c.cutOn
        ? {
            mode: c.cutMode,
            runs: c.cutRuns(),
            count: c.cutCount,
            armed: ctx.cutArmed,
            pending: ctx.pendingCut,
            shown: ctx.cutShown,
            actions: c.actions.map((a) => `${a.kind}:${a.run}`),
            carry: [...c.carry],
          }
        : null,
      // K114 walker (null: no walker): WalkerProbe.
      walker: ctx.walker,
      // K137 stage 2: the aids. `spool`: the yarn's runs used and its
      // capacity (null: off); the hints (max 0: off) and the lit hint's run
      // (-1: none); `goodArm`: the next good arm (-1: none); `chalk`: the
      // ticked junctions; `compassRun`: the compass's arm (-1: none shown).
      aids: {
        spool: c.spoolOn ? { used: c.spoolUsed, cap: c.spoolCap, share: c.spoolShare } : null,
        hintsMax: c.hintsMax,
        hintsLeft: c.hintsLeft,
        hintsUsed: c.hintsUsed,
        hintRun: fb.hintRun,
        goodArm: c.goodArm(),
        chalk: [...c.chalk],
        compassRun: fb.compassRun,
      },
      // K138 stage 1: the ice and color rule (null: no rule on). `mode`:
      // the color rule's mode ("off" without one); `icy`: the icy runs;
      // `colors`: each run's color (-1: free); `state`: the color state (the
      // last color + 1, 0 at the start); `placed` / `bites` / `draws`: the
      // placement; `key`: the placement's key; `optimal`: the shortest legal
      // length; `carry`: a slide's runs still to play.
      rules: c.rulesOn
        ? {
            mode: c.ruleLook?.mode ?? "",
            icy: c.ruleLook?.icy ? [...c.ruleLook.icy].flatMap((v, i) => (v ? [i] : [])) : [],
            colors: c.ruleLook?.colors ? [...c.ruleLook.colors] : null,
            state: c.colorState,
            placed: c.ruleLook?.placed ?? false,
            bites: c.ruleLook?.bites ?? false,
            draws: c.ruleLook?.draws ?? 0,
            key: c.ruleKey,
            optimal: c.optimal,
            carry: c.carry.length,
            // K138 s2: the turnstiles ({vertex, arms, phase0} each, the
            // arms in vertex.edges order) and the clock (`phase`: strokes
            // mod 3); the hidden runs laid, those revealed, those still
            // hidden; the fewest strokes with every hidden run revealed.
            turnstiles: c.ruleLook?.turnstiles ?? null,
            phase: c.rulePhase,
            hidden: c.ruleLook?.hidden ?? null,
            revealed: [...c.revealed],
            unrevealed: c.hiddenRuns(),
            fewest: c.fewestRuns,
            fewestWithHidden: c.fewestWithHidden,
            // K138 s3: the one-way runs, [run, entry vertex] each.
            oneWay: c.ruleLook?.oneWay ? [...c.ruleLook.oneWay] : null,
            // Each run's note (the pitch a pluck at its middle plays; a
            // reveal matches it), only while hidden runs are laid.
            notes: c.ruleLook?.hidden
              ? c.walk.edges.map((e) => ctx.freqForCtrl(e.chain, (e.ctrlA + e.ctrlB) / 2))
              : null,
          }
        : null,
      // K114: the burn race (null: no fire). `smoldering`: the head's arms
      // whose tap the fire refuses; `banner`: the Burnt banner shows.
      fire: c.fire
        ? {
            speed: c.fire.speed,
            delay: c.fire.delay,
            lead: c.fireLeadHere,
            closest: c.fireClosest,
            lost: c.fireLost,
            pendingLoss: ctx.pendingLoss,
            banner: ctx.lossBanner.shown,
            smoldering: c.choices().filter((eid) => c.smoldering(eid)),
            // K114 stage 2: the clock (turn | realtime), its L (the
            // departure clock), the real-time clock itself, the running
            // move's departure and arrival, and whether the race runs.
            clock: c.fire.clock,
            L: c.fireL,
            now: c.fireNow,
            departL: c.fireDepartL,
            arriveL: c.fireArriveL,
            racing: c.fireRacing,
            // K408: the start marker's target (shown until the fire passes
            // the start) and its drawn fade level.
            startMarker: fb.startMarkerState,
            // K137-b: the broken runs the fire no longer burns along (it
            // burns on around them from the move that broke each).
            blocked: c.brokenRuns(),
          }
        : null,
      // K100: the solve's restarts, and the fog's explored stamps.
      restarts: c.restarts,
      fog: fb.fogProbe(),
      trailMode: c.trailMode,
      pathViz: pathVizOf(ctx.params),
      trailLength: ctx.params.trailLength,
      pathEdges: [...c.pathEdges],
      choices: c.choices().map((eid) => {
        const e = wg.edges[eid];
        const far = e.va === c.head ? e.vb : e.va;
        const f =
          e.va === c.head
            ? Math.min(e.ctrlA + 1.5, (e.ctrlA + e.ctrlB) / 2)
            : Math.max(e.ctrlB - 1.5, (e.ctrlA + e.ctrlB) / 2);
        const len = sys.chains[e.chain].length;
        sys.pointOnChain(e.chain, ((f % len) + len) % len, out, 0);
        return {
          edge: eid,
          far,
          // The far vertex is a dead-end tip (an END that is neither the
          // start nor the exit) - probes steer into dead ends with it.
          farDeadEnd:
            (wg.vertices.get(far)?.isEnd ?? false) &&
            far !== wg.start &&
            far !== wg.exit,
          // K114: the live distances (the walk graph's own while nothing is cut).
          cost: e.length + (c.distToExit.get(far) ?? Infinity),
          screen: toScreen(out[0], out[1]),
        };
      }),
      vertexScreen: (id: string) => {
        fb.vertexWorld(id, out, 0);
        return toScreen(out[0], out[1]);
      },
      // K114 probe helpers: a point `frac` of the way along any run (its
      // screen point and world point), and a screen point's world point.
      runPoint: (eid: number, frac = 0.5) => {
        const e = wg.edges[eid];
        if (!e) return null;
        const len = sys.chains[e.chain].length;
        const f = e.ctrlA + frac * (e.ctrlB - e.ctrlA);
        sys.pointOnChain(e.chain, ((f % len) + len) % len, out, 0);
        return { ...toScreen(out[0], out[1]), wx: out[0], wy: out[1] };
      },
      toWorld: (x: number, y: number) => ({
        x: (x - ctx.root.position.x) / ctx.root.scale.x,
        y: (y - ctx.root.position.y) / ctx.root.scale.y,
      }),
      // K137 stage 4: the run an armed tool's (or the scissors') tap at a
      // SCREEN point picks (the renderer's cutAt, nearest within maxD world;
      // -1: none). runPoint is the physics curve, so a run's middle can sit
      // on a crossing and pick the other run: probes check before a click.
      cutPick: (x: number, y: number, maxD = 2) =>
        fb.cutAt((x - ctx.root.position.x) / ctx.root.scale.x, (y - ctx.root.position.y) / ctx.root.scale.y, c, maxD),
      // Probe helper: the walk-edge ids of a fewest-runs route from the
      // head to the nearest dead-end tip not in `exclude` (BFS, never
      // through the exit), or null when there is none.
      routeToDeadEnd: (exclude: string[] = []): number[] | null => {
        const skip = new Set(exclude);
        const prev = new Map<string, [string, number]>();
        const seen = new Set([c.head]);
        const queue = [c.head];
        while (queue.length > 0) {
          const v = queue.shift()!;
          const tip =
            v !== c.head &&
            (wg.vertices.get(v)?.isEnd ?? false) &&
            v !== wg.start &&
            !skip.has(v);
          if (tip) {
            const route: number[] = [];
            for (let u = v; u !== c.head; ) {
              const [p, eid] = prev.get(u)!;
              route.unshift(eid);
              u = p;
            }
            return route;
          }
          for (const eid of wg.vertices.get(v)!.edges) {
            const e = wg.edges[eid];
            const u = e.va === v ? e.vb : e.va;
            if (seen.has(u) || u === wg.exit) continue;
            seen.add(u);
            prev.set(u, [v, eid]);
            queue.push(u);
          }
        }
        return null;
      },
      // Diagnostic: everything within `r` lattice units of a LATTICE point -
      // walk vertices (live position) and walk edges (nearest sample), with
      // chains and path membership. Attribution beats speculation.
      near: (x: number, y: number, r = 1.2) => {
        const verts: Array<Record<string, unknown>> = [];
        for (const [id, v] of wg.vertices) {
          fb.vertexWorld(id, out, 0);
          const d = Math.hypot(out[0] - x, out[1] - y);
          if (d <= r) {
            verts.push({
              id,
              d: +d.toFixed(3),
              isEnd: v.isEnd,
              chain: v.chain,
              ctrl: v.ctrl,
              edges: [...v.edges],
            });
          }
        }
        const edges: Array<Record<string, unknown>> = [];
        for (const e of wg.edges) {
          const len = sys.chains[e.chain].length;
          let bd = Infinity;
          for (let f = e.ctrlA; f <= e.ctrlB; f += 0.5) {
            sys.pointOnChain(e.chain, ((f % len) + len) % len, out, 0);
            const d = Math.hypot(out[0] - x, out[1] - y);
            if (d < bd) bd = d;
          }
          if (bd <= r) {
            edges.push({
              edge: e.id,
              d: +bd.toFixed(3),
              va: e.va,
              vb: e.vb,
              chain: e.chain,
              ctrlA: e.ctrlA,
              ctrlB: e.ctrlB,
              onPath: c.pathEdges.includes(e.id),
            });
          }
        }
        return { verts, edges };
      },
    };
  };
  // K120 probes: the key-move state at the junction the keys leave from
  // (its departures and what each key picks, for a press and a hold), and
  // census(reaches): every junction's departure directions at each reach.
  (window as unknown as Record<string, unknown>).__knotKeyMoves = () => {
    const v = ctx.keyVertex();
    const taps = ctx.scene.fabricController?.taps ?? [];
    const arrival = taps.length > 0 ? taps[taps.length - 1] : -1;
    const deps = v !== null && ctx.keysLive() ? ctx.keyDepartures(v) : [];
    const dirs: KeyDir[] = ["up", "down", "left", "right"];
    return {
      vertex: v,
      live: ctx.keysLive(),
      hold: ctx.keyHold,
      held: ctx.heldKeys.dirs,
      pad: ctx.movePad.isShown,
      arrival,
      scaleX: ctx.root.scale.x,
      scaleY: ctx.root.scale.y,
      departures: deps,
      press: Object.fromEntries(
        dirs.map((d) => [d, pickDeparture(deps, d, { hold: false })])
      ),
      holdPick: Object.fromEntries(
        dirs.map((d) => [d, pickHold(deps, [d], arrival)])
      ),
      // K333: what each chord picks; K333/K334: the move waiting, if any.
      chord: Object.fromEntries(
        DIAGONALS.map((g) => [g, pickChord(deps, g, { hold: false })])
      ),
      waiting: ctx.moveWait.waiting ? { ...ctx.moveWait.waiting } : null,
      tapsWait: ctx.tapsWait,
      setTapsWait: (on: boolean) => {
        ctx.tapsWait = on;
      },
      // K329: every junction's lone keys and chords. summary: junctions
      // where no lone key moves; runs no lone key picks; runs neither a
      // key nor a chord picks; key-junction pairs that wait the chord
      // window (chordMatters), and that a wider rule (any chord beside the
      // key picks another run) would delay.
      censusPress: () => {
        if (!ctx.scene.walkGraph || !ctx.scene.fabric || !ctx.scene.ps || !ctx.scene.renderer) return null;
        let junctions = 0;
        let deadJunctions = 0;
        let runs = 0;
        let keyless = 0;
        let unreachable = 0;
        let pairs = 0;
        let waits = 0;
        let wideWaits = 0;
        const dead: string[] = [];
        for (const [id, wv] of ctx.scene.walkGraph.vertices) {
          if (wv.isEnd || wv.edges.length < 2) continue;
          const jd = ctx.keyDepartures(id);
          if (jd.length < 2) continue;
          junctions++;
          const km = keyMap(jd);
          const cm = chordMap(jd);
          const byKey = new Set<number>();
          const byChord = new Set<number>();
          for (const d of dirs) if (km[d].edge >= 0) byKey.add(km[d].edge);
          for (const g of DIAGONALS) if (cm[g].edge >= 0) byChord.add(cm[g].edge);
          if (byKey.size === 0) {
            deadJunctions++;
            dead.push(id);
          }
          for (const dep of jd) {
            runs++;
            if (!byKey.has(dep.edge)) keyless++;
            if (!byKey.has(dep.edge) && !byChord.has(dep.edge)) unreachable++;
          }
          for (const d of dirs) {
            pairs++;
            if (chordMatters(jd, d)) waits++;
            const ce = chordEdges(jd, d);
            if (Object.values(ce).some((e) => e !== undefined && e >= 0 && e !== km[d].edge)) {
              wideWaits++;
            }
          }
        }
        return {
          summary: { junctions, deadJunctions, runs, keyless, unreachable, pairs, waits, wideWaits },
          dead,
        };
      },
      census: (reaches: number[]) => {
        if (!ctx.scene.walkGraph || !ctx.scene.fabric || !ctx.scene.ps || !ctx.scene.renderer) return null;
        const out: Array<Record<string, unknown>> = [];
        for (const [id, wv] of ctx.scene.walkGraph.vertices) {
          if (wv.isEnd) continue;
          out.push({
            id,
            edges: [...wv.edges],
            lengths: wv.edges.map((e) => ctx.scene.walkGraph!.edges[e].length),
            deps: reaches.map((r) => ctx.keyDepartures(id, r)),
          });
        }
        return { start: ctx.scene.walkGraph.start, exit: ctx.scene.walkGraph.exit, junctions: out };
      },
    };
  };
  // The fabric overlay itself (K83 probes: setMarkerStyle swaps the marker
  // glyphs and size, markerStyle reads them).
  (window as unknown as Record<string, unknown>).__knotFabricRenderer = () =>
    ctx.scene.fabric;
  // RENDER-ONLY PLUCK probes: fire a pluck on a chain at a ctrl (as a tap
  // there would, unless opts override), and read the live plucks + stats.
  (window as unknown as Record<string, unknown>).__knotPluck = (
    chain: number,
    ctrl: number,
    opts: {
      side?: number;
      gain?: number;
      beta?: number;
      delay?: number;
      // K279: a ripple at this strength (0 = none), and a tug (pluckTug's
      // units; 0 = none) - what a tap there would start.
      ripple?: number;
      tug?: number;
      // The ripple's look (default: pluckRipple's).
      rippleLook?: PluckRipple;
    } = {}
  ) => {
    if (!ctx.scene.renderer || !ctx.scene.ps) return false;
    const unit = ctx.pluckUnit(chain, ctrl);
    if (opts.ripple) {
      ctx.startRipple(chain, { ctrl }, opts.ripple, opts.delay ?? 0, opts.rippleLook);
    }
    if (opts.tug) ctx.tugAt(chain, { ctrl }, opts.side ?? 1, opts.tug);
    const plucked = ctx.scene.renderer.pluck({
      chain,
      ctrl,
      side: opts.side ?? 1,
      gain: opts.gain ?? 1,
      freq: ctx.freqForCtrl(chain, ctrl),
      reach: unit.reach,
      spanCtrl: unit.spanCtrl,
      beta: opts.beta,
      delay: opts.delay,
    });
    // K7 stage 4: with a tug, a Promise on both hosts that resolves once
    // the state main shows holds the tug (with the worker, the first
    // snapshot after it, shown exactly: host.sync()).
    return opts.tug ? ctx.host.sync().then(() => plucked) : plucked;
  };
  // K279: the live ripples.
  // `paused` holds the ripples' clock, `t` sets every live ripple's time.
  (window as unknown as Record<string, unknown>).__knotRipple = (
    o: { paused?: boolean; t?: number } = {}
  ) => {
    if (o.paused !== undefined) ctx.ripples.paused = o.paused;
    if (o.t !== undefined) ctx.ripples.setTime(o.t);
    return { count: ctx.ripples.activeCount, look: ctx.ripples.look };
  };
  (window as unknown as Record<string, unknown>).__knotPluckState = () =>
    ctx.scene.renderer
      ? {
          active: ctx.scene.renderer.plucks.state(),
          stats: { ...ctx.scene.renderer.plucks.stats },
          updates: ctx.scene.renderer.updateCount,
        }
      : null;
  // Frame-cost + physics-mode probe: main-thread ms per ticker callback
  // over the last `n` frames, renderer.update() and ps.step() call counts.
  (window as unknown as Record<string, unknown>).__knotPerf = (n = 120) => {
    const k = Math.min(n, ctx.frameCostN, ctx.frameCost.length);
    const xs: number[] = [];
    for (let i = 0; i < k; i++) {
      xs.push(ctx.frameCost[(ctx.frameCostN - 1 - i + ctx.frameCost.length * 4) % ctx.frameCost.length]);
    }
    xs.sort((a, b) => a - b);
    const mean = xs.reduce((s, v) => s + v, 0) / Math.max(1, xs.length);
    const rs: number[] = [];
    for (let i = 0; i < k; i++) {
      rs.push(ctx.revealCost[(ctx.frameCostN - 1 - i + ctx.revealCost.length * 4) % ctx.revealCost.length]);
    }
    rs.sort((a, b) => a - b);
    const st = ctx.host.stats();
    return {
      frames: k,
      mean,
      p50: xs[Math.floor(xs.length * 0.5)] ?? 0,
      p95: xs[Math.floor(xs.length * 0.95)] ?? 0,
      max: xs[xs.length - 1] ?? 0,
      updates: ctx.scene.renderer?.updateCount ?? 0,
      steps: st.steps,
      state: ctx.physState,
      asleep: ctx.host.asleep,
      loadMs: st.loadMs,
      loadStepMs: st.loadStepMs,
      loadSteps: st.loadSteps,
      loadFrames: st.loadFrames,
      totalFrames: ctx.frameCostN,
      totalCostMs: ctx.frameCostTotal,
      plucks: ctx.scene.renderer?.plucks.activeCount ?? 0,
      // K7 stage 4: live stepping since the build, on either host (ms and
      // substeps; difference them), the dropped backlog and the freeze.
      physMs: st.physMs,
      substeps: st.liveSubsteps,
      lagS: ctx.host.settleLagS,
      frozen: st.frozen,
      // reveal.tick's ms over the same frames, and since load.
      revealMean: rs.reduce((s, v) => s + v, 0) / Math.max(1, rs.length),
      revealP95: rs[Math.floor(rs.length * 0.95)] ?? 0,
      revealMax: rs[rs.length - 1] ?? 0,
      revealMsTotal: ctx.revealMsTotal,
      host: st.host,
    };
  };
  // K147 load-settle probe: the phase now (presettle | budget | off), the
  // armed budget's state, and the last pre-settle and budgeted settle.
  (window as unknown as Record<string, unknown>).__knotSettle = () => {
    const st = ctx.host.stats();
    return {
      phase: st.presettle ? "presettle" : st.budget ? "budget" : "off",
      budgetMs: st.budget?.budgetMs ?? null,
      costMs: st.budget?.costMs ?? null,
      lagS: ctx.host.settleLagS,
      loaderShown: st.presettle && ctx.loaderShownAt >= 0,
      presettle: st.settleInfo.presettle,
      budget: st.settleInfo.budget,
      // K7 stage 4: on either host.
      asleep: ctx.host.asleep,
      physMs: st.physMs,
      substeps: st.liveSubsteps,
      kind: ctx.host.kind,
    };
  };
  // The physics checkbox, as the panel drives it (probe scripting).
  (window as unknown as Record<string, unknown>).__knotSetPhysics = (
    on: boolean
  ) => {
    ctx.params.physics = on;
    ctx.writeParams(ctx.params);
    ctx.applyPhysicsMode();
    return ctx.physState;
  };
  // A Physics-folder slider, as the panel drives it (probe scripting).
  (window as unknown as Record<string, unknown>).__knotSetPhysicsParam = (
    key: "slack" | "drag" | "repulsion" | "bend" | "smooth" | "stiffness" | "gridAlign",
    value: number
  ) => {
    ctx.params[key] = value;
    ctx.writeParams(ctx.params);
    ctx.physicsInputsChanged();
    ctx.wake();
    return ctx.physState;
  };
  // SHADER BACKGROUND probes: state, the raw layer (pin its clock, force a
  // texture pass), and the panel's dropdown + slider.
  (window as unknown as Record<string, unknown>).__knotBackground = () => ({
    id: ctx.background.id,
    active: ctx.background.active,
    // The last texture pass's program (bg-<program> in GPU timings).
    program: ctx.background.programId,
    speed: ctx.params.backgroundSpeed,
    stats: { ...ctx.background.stats },
    time: ctx.background.clock.time,
    drifting: ctx.background.clock.isDrifting,
    needsFrame: ctx.background.needsFrame(),
  });
  (window as unknown as Record<string, unknown>).__knotBackgroundLayer = () =>
    ctx.background;
  // K140 probes: the confetti's state (pieces alive, bursts thrown, frames
  // stepped - frozen once idle - the plan a finish would throw, and the last
  // frame's sceneAnimating()), and a finish's burst on demand.
  (window as unknown as Record<string, unknown>).__knotConfetti = () => ({
    active: ctx.confetti.active,
    rain: ctx.confetti.sim.rain.alive,
    spray: ctx.confetti.sim.spray.alive,
    cannon: ctx.confetti.sim.cannon.alive, // K336
    streamers: ctx.confetti.sim.streamers.alive, // K336
    stats: { ...ctx.confetti.stats },
    plan: confettiPlanFor(
      ctx.params,
      ctx.motion.reduced,
      ctx.app.screen.width,
      ctx.app.screen.height
    ),
    sceneAnimating: ctx.sceneWasAnimating,
    rainVisible: ctx.confetti.rainContainer.visible,
    sprayVisible: ctx.confetti.sprayContainer.visible,
  });
  (window as unknown as Record<string, unknown>).__knotConfettiBurst = () => {
    ctx.throwConfetti();
    return ctx.confetti.active;
  };
  // K6-1 (docs/design/K6_1.md item 6): the frame loop's flag ledger in
  // shadow (src/app/loop_flags.ts, report()), whether the loop halted, and
  // the TRACKER that checks the flags against the pixels. `{reset: true}`
  // zeroes the ledger and the tracker; `{track: true}` reads the whole
  // framebuffer back after every render and counts UNDER frames (pixels
  // changed, no visual flag in the frame's need: K24 would have skipped a
  // frame that draws something new) and OVER frames (a visual flag, no
  // pixel changed); `{track: false}` stops it and returns its last report.
  let tracker: LoopTracker | null = null;
  let lastTrack: TrackReport | null = null;
  (window as unknown as Record<string, unknown>).__knotLoop = (
    o: { reset?: boolean; track?: boolean; continuous?: boolean } = {}
  ) => {
    if (typeof o.continuous === "boolean") ctx.setLoopContinuous(o.continuous);
    if (o.reset) {
      ctx.loopFlags.reset();
      tracker?.reset();
    }
    if (o.track === true && !tracker) tracker = startLoopTracker(ctx);
    if (o.track === false && tracker) {
      lastTrack = tracker.report();
      tracker.stop();
      tracker = null;
    }
    return {
      ...ctx.loopFlags.report(),
      halted: ctx.loopHalted,
      stopped: ctx.loopStopped,
      track: tracker ? tracker.report() : lastTrack,
    };
  };
  // K456: the lost-context state (losses, restores, whether the message
  // shows, the visible lost time) and whether the frame loop is suspended.
  (window as unknown as Record<string, unknown>).__knotContext = () => ({
    ...ctx.contextLoss.report(),
    suspended: ctx.loopSuspended,
  });
  (window as unknown as Record<string, unknown>).__knotSetBackground = (
    id: UrlParams["background"],
    intensity?: number,
    speed?: number
  ) => {
    ctx.params.background = id;
    if (intensity !== undefined) ctx.params.backgroundIntensity = intensity;
    if (speed !== undefined) ctx.params.backgroundSpeed = speed;
    ctx.syncBackground();
    ctx.writeParams(ctx.params);
    return ctx.background.id;
  };
  // Any background params at once (K79 stage B: shape + colors), e.g.
  // {backgroundScale: 2, backgroundColorMode: "custom"}; unknown keys are
  // ignored. Returns the program the next texture pass will use.
  (window as unknown as Record<string, unknown>).__knotSetBackgroundParams = (
    values: Partial<UrlParams>
  ) => {
    const p = ctx.params as unknown as Record<string, unknown>;
    for (const [k, v] of Object.entries(values)) {
      if (k.startsWith("background") && Object.hasOwn(p, k)) p[k] = v;
    }
    ctx.syncBackground();
    ctx.writeParams(ctx.params);
    ctx.background.renderTexture();
    return ctx.background.programId;
  };
  // THE MOTION SETTING probe: the choice, the OS's answer, the result and
  // the root attribute the stylesheets read.
  (window as unknown as Record<string, unknown>).__knotMotion = () => ({
    pref: ctx.motion.pref,
    system: ctx.motion.system,
    reduced: ctx.motion.reduced,
    attr: document.documentElement.dataset.motion ?? null,
  });
  // K111 probe: the two Accessibility switches, the OS answers, the root
  // attributes the stylesheets read, the keys overridden, and the values the
  // scene wears right now next to the stored ones.
  // K111 stage 4 probe: switch High contrast's highlight prototype (0 today's
  // pulses, 1 contrast, 2 outline, 3 chevrons; worn only while High
  // contrast is on). Returns the look the renderer now wears.
  (window as unknown as Record<string, unknown>).__knotHcLook = (n: number) => {
    ctx.hcLookChoice = n === 1 || n === 2 || n === 3 ? n : 0;
    ctx.handRendererLook();
    return ctx.scene.renderer?.hcLook ?? null;
  };
  (window as unknown as Record<string, unknown>).__knotA11y = () => ({
    reducedMotion: ctx.a11y.reducedMotion,
    highContrast: ctx.a11y.highContrast,
    motion: {
      pref: ctx.motion.pref,
      system: ctx.motion.system,
      attr: document.documentElement.dataset.motion ?? null,
    },
    contrast: {
      pref: ctx.contrast.pref,
      system: ctx.contrast.system,
      high: ctx.contrast.high,
      attr: document.documentElement.dataset.contrast ?? null,
    },
    overridden: overriddenKeys(ctx.a11y),
    stored: {
      flowStrength: ctx.params.flowStrength,
      flowSpeed: ctx.params.flowSpeed,
      background: ctx.params.background,
      backgroundColorMode: ctx.params.backgroundColorMode,
      backgroundBase: ctx.params.backgroundBase,
      palette: ctx.params.palette,
      pathColor: ctx.params.pathColor,
      fadeLength: ctx.params.fadeLength,
      gap: ctx.params.gap,
      markerSize: ctx.params.markerSize,
    },
    worn: {
      flowStrength: ctx.scene.renderer?.flowStrength ?? null,
      flowSpeed: ctx.scene.renderer?.flowSpeed ?? null,
      fadeLength: ctx.scene.renderer?.fadeLength ?? null,
      background: ctx.look("background"),
      backgroundColorMode: ctx.look("backgroundColorMode"),
      backgroundBase: ctx.look("backgroundBase"),
      palette: ctx.look("palette"),
      pathColor: ctx.look("pathColor"),
      gap: ctx.look("gap"),
      markerSize: ctx.look("markerSize"),
      fabricMarkerSize: ctx.scene.fabric?.markerSize ?? null,
      pageInk: ctx.canvasInk,
      canvasBackground: ctx.app.canvas.style.background,
    },
    asleep: ctx.host.asleep,
    animating: ctx.sceneWasAnimating,
  });
  // The "Replay settle" button (probe scripting).
  (window as unknown as Record<string, unknown>).__knotReplay = () => {
    ctx.replaySettle();
    return ctx.physState;
  };
  // K76 THREAD REVEAL, stage 2a's PROBE HOOK: on (exploration threads or
  // off), reach and fade (lattice units), look (an EXPLORE_LOOKS name or
  // index), visitAll (every vertex visited: the GPU cost bound). Returns
  // the fabric's explore state (null outside fabric).
  (window as unknown as Record<string, unknown>).__knotExplore = (
    o: {
      on?: boolean;
      reach?: number;
      fade?: number;
      look?: string | number;
      visitAll?: boolean;
      burnt?: string; // K290: the burnt thread's look, "gone" or "char"
      revealFinish?: boolean; // K465: the finish shows from the start
      endCross?: string; // K466: an end under a crossing (under, past, back)
      endGlow?: string; // K466: the ends' halo (soft, bright)
    } = {}
  ) => {
    if (!ctx.scene.fabric || !ctx.scene.fabricController) return null;
    if (o.burnt === "gone" || o.burnt === "char") ctx.params.burnt = o.burnt;
    if (typeof o.revealFinish === "boolean") ctx.params.revealFinish = o.revealFinish;
    const ec = REVEAL_END_CROSSES as readonly string[];
    if (o.endCross !== undefined && ec.includes(o.endCross)) {
      ctx.params.revealEndCross = o.endCross as UrlParams["revealEndCross"];
    }
    const eg = REVEAL_END_GLOWS as readonly string[];
    if (o.endGlow !== undefined && eg.includes(o.endGlow)) {
      ctx.params.revealEndGlow = o.endGlow as UrlParams["revealEndGlow"];
    }
    // Stage 2c: through the params (the frame loop syncs them every tick).
    // The numbers go in raw, past the panel's ranges (a reach of 1000 shows
    // every stub whole).
    if (o.on !== undefined) ctx.params.exploration = o.on ? "threads" : "off";
    if (o.reach !== undefined) ctx.params.revealDistance = o.reach;
    if (o.fade !== undefined) ctx.params.revealFade = o.fade;
    const looks = EXPLORE_LOOKS as readonly string[];
    const lk = typeof o.look === "number" ? looks[o.look] : o.look;
    if (lk !== undefined && looks.includes(lk)) {
      ctx.params.revealLook = lk as UrlParams["revealLook"];
    }
    ctx.syncExploration(ctx.scene.fabric);
    ctx.scene.fabric.update(ctx.scene.fabricController);
    if (o.visitAll) {
      ctx.scene.fabric.exploreVisitAll();
      ctx.scene.fabric.update(ctx.scene.fabricController);
    }
    ctx.invalidate();
    return ctx.scene.fabric.exploreState();
  };
  // World point at a fractional ctrl along a chain (probe scripting).
  (window as unknown as Record<string, unknown>).__knotPoint = (
    chain: number,
    f: number
  ) => {
    const sys = ctx.scene.ps;
    if (!sys) return null;
    const scratch = new Float32Array(2);
    sys.pointOnChain(chain, f, scratch, 0);
    return { x: scratch[0], y: scratch[1] };
  };
}

// K6-1's loop tracker (__knotLoop({track: true})). Probe-only: it costs a
// whole-framebuffer readPixels (a GPU sync) and a compare every frame.
interface TrackEntry {
  frame: number;
  t: number; // ms since the tracker started (or was reset)
  px: number; // pixels that differ from the last frame
  need: string[]; // the frame's need (no visual flag, by definition)
  dom: string; // the first DOM change made during the frame, if any
}
interface TrackReport {
  frames: number; // frames compared
  changed: number; // frames whose pixels differ from the last one
  empty: number; // frames whose need has no visual flag
  over: { frames: number; byFlag: Record<string, number> };
  // UNDER: pixels changed, no visual flag and no INPUT push (a miss).
  under: { frames: number; list: TrackEntry[] };
  // The same with an INPUT push in the need: K6-3 restarts the loop on
  // input, so these are covered, but they name a missing push.
  underInput: { frames: number; list: TrackEntry[] };
  // DOM changes made during a frame (the overlays write in the tick), and
  // those of them in an empty frame; between frames: event handlers,
  // timers (they do not need the loop).
  dom: {
    inFrame: number;
    inFrameEmpty: number;
    between: number;
    list: { frame: number; t: number; what: string }[];
  };
  lost: number; // webglcontextlost events seen
  size: [number, number];
  readMs: number; // mean readback + compare cost a frame
}
interface LoopTracker {
  report(): TrackReport;
  reset(): void;
  stop(): void;
}

const TRACK_LIST_MAX = 60;

function describeNode(n: Node): string {
  const el = (n.nodeType === 1 ? n : n.parentElement) as HTMLElement | null;
  if (!el) return n.nodeName;
  const id = el.id ? `#${el.id}` : "";
  const cls =
    typeof el.className === "string" && el.className
      ? `.${el.className.trim().split(/\s+/).join(".")}`
      : "";
  return `${el.tagName.toLowerCase()}${id}${cls}`;
}

function startLoopTracker(ctx: ProbeCtx): LoopTracker {
  const gl = (ctx.app.renderer as unknown as { gl?: WebGL2RenderingContext })
    .gl;
  const flags = ctx.loopFlags;
  let w = 0;
  let h = 0;
  let cur: Uint8Array | null = null;
  let prev: Uint8Array | null = null;
  let primed = false;
  let t0 = performance.now();
  let readMsSum = 0;
  let st = fresh();
  function fresh() {
    return {
      frames: 0,
      changed: 0,
      empty: 0,
      overFrames: 0,
      overBy: {} as Record<string, number>,
      under: [] as TrackEntry[],
      underFrames: 0,
      underInput: [] as TrackEntry[],
      underInputFrames: 0,
      domInFrame: 0,
      domInFrameEmpty: 0,
      domBetween: 0,
      domList: [] as { frame: number; t: number; what: string }[],
      lost: 0,
    };
  }
  const stampEl = ctx.stampEl;
  const relevant = (recs: MutationRecord[]): string => {
    for (const r of recs) {
      if (stampEl.contains(r.target)) continue;
      return describeNode(r.target);
    }
    return "";
  };
  // Mutations delivered by the observer's callback were made between
  // frames (the tick takes its own with takeRecords below).
  const obs = new MutationObserver((recs) => {
    if (relevant(recs)) st.domBetween++;
  });
  obs.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  const onLost = (): void => {
    st.lost++;
  };
  ctx.app.canvas.addEventListener("webglcontextlost", onLost);
  // After pixi's render (LOW, -25): UTILITY (-50).
  const fn = (): void => {
    if (!gl) return;
    const a = performance.now();
    const what = relevant(obs.takeRecords());
    const bw = gl.drawingBufferWidth;
    const bh = gl.drawingBufferHeight;
    if (bw !== w || bh !== h || !cur || !prev) {
      w = bw;
      h = bh;
      cur = new Uint8Array(w * h * 4);
      prev = new Uint8Array(w * h * 4);
      primed = false;
    }
    // Read the default framebuffer (the frame just presented to the
    // compositor), restoring whatever pixi left bound.
    const saved = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING) as
      | WebGLFramebuffer
      | null;
    if (saved) gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, cur);
    if (saved) gl.bindFramebuffer(gl.READ_FRAMEBUFFER, saved);
    const need = flags.lastNeed;
    if (primed) {
      const c32 = new Uint32Array(cur.buffer);
      const p32 = new Uint32Array(prev.buffer);
      let px = 0;
      for (let i = 0; i < c32.length; i++) if (c32[i] !== p32[i]) px++;
      st.frames++;
      const visual = (need & VISUAL) !== 0;
      if (!visual) st.empty++;
      if (px > 0) st.changed++;
      if (px > 0 && !visual) {
        const e: TrackEntry = {
          frame: flags.frames,
          t: Math.round(a - t0),
          px,
          need: flagNames(need),
          dom: what,
        };
        if (need & Flag.INPUT) {
          st.underInputFrames++;
          if (st.underInput.length < TRACK_LIST_MAX) st.underInput.push(e);
        } else {
          st.underFrames++;
          if (st.under.length < TRACK_LIST_MAX) st.under.push(e);
        }
      } else if (px === 0 && visual) {
        st.overFrames++;
        for (const n of flagNames(need & VISUAL)) {
          st.overBy[n] = (st.overBy[n] ?? 0) + 1;
        }
      }
      if (what) {
        st.domInFrame++;
        if (!visual) {
          st.domInFrameEmpty++;
          if (st.domList.length < TRACK_LIST_MAX) {
            st.domList.push({ frame: flags.frames, t: Math.round(a - t0), what });
          }
        }
      }
    }
    primed = true;
    const swap = prev;
    prev = cur;
    cur = swap;
    readMsSum += performance.now() - a;
  };
  ctx.app.ticker.add(fn, undefined, -50);
  return {
    report: (): TrackReport => ({
      frames: st.frames,
      changed: st.changed,
      empty: st.empty,
      over: { frames: st.overFrames, byFlag: { ...st.overBy } },
      under: { frames: st.underFrames, list: st.under.slice() },
      underInput: { frames: st.underInputFrames, list: st.underInput.slice() },
      dom: {
        inFrame: st.domInFrame,
        inFrameEmpty: st.domInFrameEmpty,
        between: st.domBetween,
        list: st.domList.slice(),
      },
      lost: st.lost,
      size: [w, h],
      readMs: st.frames > 0 ? readMsSum / st.frames : 0,
    }),
    reset: (): void => {
      st = fresh();
      t0 = performance.now();
      readMsSum = 0;
    },
    stop: (): void => {
      ctx.app.ticker.remove(fn);
      obs.disconnect();
      ctx.app.canvas.removeEventListener("webglcontextlost", onLost);
    },
  };
}
