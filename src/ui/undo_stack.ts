// K92: the DESIGN UNDO STACK (pure; brief docs/design/K92.md). main.ts
// records every design the page writes where it writes the address bar
// (writeParams): each panel edit (a slider drag once, on release), a seed
// change, the Daily button, the "Free play" badge's tap. An entry is the
// whole state a link carries, the params plus the daily on screen, and
// undo / redo put one back as loading its link would. Maze moves, the
// camera and the viewer settings are not designs and never enter it. It
// lives in memory: a reload starts a new history, and the browser's Back
// still leaves the page (the address bar is replaced, never pushed).
import { encodeParams, impliedParams, type UrlParams } from "./url_state";

// How many designs undo can walk back; past it the oldest drops.
export const UNDO_CAP = 100;

export interface DesignState {
  readonly params: Readonly<UrlParams>;
  // The daily on screen, or null for an ordinary design.
  readonly daily: number | null;
  // Today's daily asked for as today's: the address bar stays bare.
  readonly floating: boolean;
}

// A snapshot: the params are copied (main.ts changes its own in place).
export function designState(
  params: Readonly<UrlParams>,
  daily: number | null,
  floating: boolean
): DesignState {
  return { params: { ...params }, daily, floating: daily !== null && floating };
}

// Two states are one design when their links are: the token (numbers at
// link precision, an appearance preset's implied values left out) and the
// daily on screen. On a daily the address bar names only the day, but the
// token still tells the playback preferences apart: they count as design
// changes (K92's call, since they are panel edits).
export function designKey(s: DesignState): string {
  const day = s.daily === null ? "-" : `${s.daily}${s.floating ? "f" : ""}`;
  return `${day}|${encodeParams(s.params as UrlParams)}`;
}

// A linear history: the states behind the current one (undo) and ahead of
// it (redo). `key` names a state's identity: committing a state with the
// current one's key records nothing.
export class UndoStack<S> {
  private readonly past: S[] = [];
  private readonly future: S[] = [];
  private readonly key: (s: S) => string;
  readonly cap: number;
  private cur: S;
  private curKey: string;

  constructor(initial: S, key: (s: S) => string, cap = UNDO_CAP) {
    this.key = key;
    this.cap = cap;
    this.cur = initial;
    this.curKey = key(initial);
  }

  get current(): S {
    return this.cur;
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  // How many steps each way.
  get depth(): { undo: number; redo: number } {
    return { undo: this.past.length, redo: this.future.length };
  }

  // Is `s` the state the stack stands on?
  isCurrent(s: S): boolean {
    return this.key(s) === this.curKey;
  }

  // A new state: the current one goes behind it and the redo side clears.
  // False (nothing recorded) when `next` is the current state.
  commit(next: S): boolean {
    const k = this.key(next);
    if (k === this.curKey) return false;
    this.past.push(this.cur);
    if (this.past.length > this.cap) this.past.shift();
    this.future.length = 0;
    this.cur = next;
    this.curKey = k;
    return true;
  }

  // Step back: the state to show, or null at the bottom.
  undo(): S | null {
    const prev = this.past.pop();
    if (prev === undefined) return null;
    this.future.push(this.cur);
    this.cur = prev;
    this.curKey = this.key(prev);
    return prev;
  }

  // Step forward again: the state to show, or null at the top.
  redo(): S | null {
    const next = this.future.pop();
    if (next === undefined) return null;
    this.past.push(this.cur);
    this.cur = next;
    this.curKey = this.key(next);
    return next;
  }
}

// The buttons' enabled flags for the design on screen (`live`). Undo also
// acts when the live design is not recorded yet (undo records it first,
// then steps back); redo only while it is the recorded one, since a new
// change clears the redo side.
export function undoFlags<S>(
  stack: UndoStack<S>,
  live: S
): { undo: boolean; redo: boolean } {
  const recorded = stack.isCurrent(live);
  return { undo: stack.canUndo || !recorded, redo: stack.canRedo && recorded };
}

// The panel callbacks (main.ts) that apply a param LIVE, each with the
// params whose rows run it. An undo or redo that changes only these runs
// each touched group's effect once, as the panel's own edit did, so the
// solve on screen goes on (a hue or a volume must not restart it). Any
// other param, a new seed included, rebuilds. A param missing here only
// costs a rebuild; one listed under the wrong effect would leave a stale
// scene, so list a param only with the effect its own row runs.
export const LIVE_EFFECTS = {
  onPhysicsToggle: ["physics"],
  onSlackChange: [
    "moveSpeed", "pulseSpacing", "fadeLength", "cuspRadius", "flowStrength",
    "flowSpeed", "appearSpeed", "appearFx", "settleBudget", "loadSettle",
    "pluckSize", "pluckGhost", "pluckReach", "pluckWhole", "pluckCrossings",
    "pluckGlow", "pluckRipple", "rippleStrength", "rippleAuto", "pluckSheen",
    "pluckTug", "tugAuto", "autoPluckGain", "pickMargin", "pickChoiceRatio",
    "tugLimit", "snapBack", "pluckStyle", "simSpeed", "slack",
    "drag", "repulsion", "bend", "stiffness", "smooth", "gridAlign",
  ],
  onStyleChange: ["threadWidth", "gap"],
  onTrailChange: [
    "pathViz", "cameraMode", "trailLength", "tension", "exploration",
    "fowRadius", "fowIntro", "pulseReach", "hoverGlow",
    "hoverGlowWidth", "hoverGlowLength", "hoverGlowFade",
    "revealDistance", "revealFade", "revealLook", "burnt", "revealFinish",
    "revealEndCross", "revealEndGlow",
  ],
  // K137 stage 2: the compass row's effect (main.ts reads it every frame).
  onAidsChange: ["compass", "showShortestPath"], // K839
  onRecolor: [
    "colorScheme", "junctionBlend", "hueShift", "gamutArc", "palette",
    "pathColor",
  ],
  onBackgroundChange: [
    "background", "backgroundIntensity", "backgroundSpeed", "backgroundScale",
    "backgroundDetail", "backgroundFibers", "backgroundGrain",
    "backgroundAngle", "backgroundColorMode", "backgroundBase",
    "backgroundAccent1", "backgroundAccent2", "backgroundAccent3",
  ],
  onChaseChange: [
    "playerPace", "minoWanderPace", "minoHuntPace", "minoPaceJitter",
    "minoPauseChance", "minoPauseMin", "minoPauseMax", "minoDetect",
    "minoLose", "minoCatch", "minoDeadEnds", "minoRoam", "minoWake",
    "minoFog", "minoPull", "minoRefog", "minoRestart", "minoLair",
    // K324: the junction stops, turn-back, roam window, telegraph reach.
    "minoStopMin", "minoStopMax", "minoHuntStop", "minoTurnBack",
    "minoTipReach", "minoRoamNear", "minoTelegraphRuns",
    // K324 stage 3: the real-time guard's and stalker's knobs.
    "minoGuardRoam", "minoGuardDetect", "minoGuardLose",
    "minoGuardAccuracyRt", "minoStalkerAccuracyRt",
    // K137 stage 3a: lives (main.ts refills the hearts when it changes).
    "lives",
  ],
  // K80 turns: the turn-aligned minotaur's tuning.
  onTurnMinoChange: [
    "minoSpeed", "minoTelegraph", "minoTelegraphLook", "minoSight", "minoRoamRuns",
    "minoTerritory", "minoAccuracy", "minoPause", "minoSleep",
    "minoGiveUp", "minoRoamMin", "minoTurnPull", "minoGuardSight",
    "minoGuardAccuracy", "minoStalkerAccuracy",
  ],
  onConfettiChange: [
    "confettiAmount", "confettiShine", "foilShare", "confettiCannons",
    "cannonAmount", "streamerShare",
  ],
  onAudioChange: [
    "soundMode", "pitchSpace", "octaves", "rootNote", "tonicEmphasis",
    "soundSpeed",
  ],
  onVolumeChange: [
    "volume", "reverb", "brightness", "sustain", "shimmer", "pickPosition",
  ],
  // Last: the solve starts over in the new clock mode (or with the turn
  // minotaur switched or swapped, K80 turns, or K114's fire changed: a
  // new speed or delay moves every vertex's burn time; K440's real-time
  // pair likewise; or K137's fragile runs or par changed).
  onClockChange: [
    "gameMode", "clock", "minotaur", "fireSpeed", "fireDelay", "fireClock",
    "fireSpeedRt", "fireDelayRt", "fragile", "parMode", "parSlack",
    "collapse", // K139
    "cut", // K114
    // K137 stage 3b: the sword (a new chase lays it down, or none).
    "sword", "swordMoves",
    "sprint", // K137 stage 3c: a restart gives sprint back.
    // K137 stage 3d: the extra monsters (a new chase lays them anew).
    "sleepers", "sleepKind",
    // K137 stage 4: the lures and snares (a restart refills both).
    "lures", "snares",
    // K795: the snare's hold, the lure's range (a new chase reads them) and
    // the hidden runs' reveal distance (the hidden runs' restart).
    "snareHold", "lureRange", "hiddenReveal",
    // K807: the follower's, sword's, sleepers', turnstiles' and one-way's
    // tunables (a restart lays them anew, as their parent rows do).
    "followDelayMin", "followDelayMax", "followShortcut", "swordRingMin",
    "swordRingMax", "sleeperRingMin", "sleeperRingMax", "nearHops", "routeWeight",
    // K137 stage 2: the spool and the hints (a restart refills both).
    "spool", "spoolSlack", "hints",
    // K138 stage 1: ice and the color rule (a restart places them anew).
    "ice", "colorRule",
    // K114's beat rider: a new tempo, beat length or cap restarts the ride,
    // and so do K795's run timing and beats per run.
    "beatTempo", "beatLength", "beatCap", "beatTiming", "beatPerRun",
    // K138 stage 2: turnstiles and hidden runs (a restart places them anew).
    "turnstiles", "hiddenRuns",
    // K138 stage 3: one-way runs (a restart places them anew).
    "oneWay",
    // K138 stage 4: keys and the lock (a restart places them anew).
    "keys", "lockMode",
    // K137 s5: muddy runs (a restart lays them anew).
    "mud",
  ],
} as const satisfies Record<string, readonly string[]>;

export type LiveEffect = keyof typeof LIVE_EFFECTS;

const EFFECT_OF = new Map<string, LiveEffect>();
for (const [effect, keys] of Object.entries(LIVE_EFFECTS)) {
  for (const k of keys) EFFECT_OF.set(k, effect as LiveEffect);
}

// At link precision: slider steps leave float noise behind.
function sameValue(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return Math.round(a * 1e6) === Math.round(b * 1e6);
  }
  return a === b;
}

export interface RestorePlan {
  // The params that differ.
  changed: string[];
  // Build the scene anew (and resume a daily's saved attempt).
  rebuild: boolean;
  // Without a rebuild: the live effects to run, in LIVE_EFFECTS order.
  effects: LiveEffect[];
}

// How to put design `to` on screen over `from`. `entersDaily`: the restore
// opens a daily that is not on screen, which always rebuilds, so the daily
// comes back with its saved attempt as its link would bring it. An
// appearance preset's implied values (random rolls them anew) are not
// compared while both sides share the preset.
export function restorePlan(
  from: Readonly<UrlParams>,
  to: Readonly<UrlParams>,
  entersDaily: boolean
): RestorePlan {
  const implied =
    from.appearMode === to.appearMode
      ? impliedParams(to as UrlParams)
      : new Set<string>();
  const a = from as unknown as Record<string, unknown>;
  const b = to as unknown as Record<string, unknown>;
  const changed: string[] = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (implied.has(k)) continue;
    if (!sameValue(a[k], b[k])) changed.push(k);
  }
  const rebuild = entersDaily || changed.some((k) => !EFFECT_OF.has(k));
  const touched = new Set(changed.map((k) => EFFECT_OF.get(k)));
  const effects = rebuild
    ? []
    : (Object.keys(LIVE_EFFECTS) as LiveEffect[]).filter((e) => touched.has(e));
  return { changed, rebuild, effects };
}
