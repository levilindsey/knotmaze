// K6-1 (docs/design/K6_1.md; design: docs/design/K5_K6_split.md 4.3-4.5):
// the frame loop's FLAG LEDGER, in SHADOW. Each frame the loop records what
// asked for it - a push (an event between frames or during one) or a poll
// (state read at the end of the last frame) - and this module keeps the
// counts a render-on-demand loop (K6-2, K6-3 = K24) needs before it may skip
// anything. Nothing reads the flags to decide anything yet, except the
// background's pause (sceneActive, K6-1 question 6). Pure: no Pixi, no DOM.
//
// SEMANTICS. Frame N's NEED mask = the polls read at the end of frame N-1 |
// every push since (between the frames, or during frame N up to its end).
// The polls read at the end of frame N belong to frame N+1. A frame whose
// need has no VISUAL bit is EMPTY: today it draws anyway, and K24 would
// skip it. A RESTART is the first non-empty frame after an empty run: by
// PUSH when a visual bit was pushed, else by POLL - an animation that
// started with no event, which a stopped ticker (K6-3) would miss.
//
// main.ts creates the ledger FIRST (before the scene, the camera and the
// lifecycle) and hands it to every module that pushes (question 6).

// The bits (design 4.3, corrected in the brief). Poll = read at a frame's
// end; push = an event.
export const Flag = {
  LOAD: 1 << 0, // poll: loading / settling, the warm hold, the pre-settle, the warm-up gate
  PHYS: 1 << 1, // poll + push: the host needs frames (and steps: not paused, frozen, halted)
  GEOM: 1 << 2, // push: a geometry pass was asked for (invalidate, wake, rebuild, recolor...)
  FLOW: 1 << 3, // poll, ambient: flowStrength worn > 0
  REVEAL: 1 << 4, // poll: the appearance reveal runs
  FX: 1 << 5, // poll: appearance FX outlive the reveal, or their particles live
  PAINT: 1 << 6, // poll: clock-driven gameplay paint (event half)
  PAINT_AMBIENT: 1 << 7, // poll, ambient: the pulses, the fog's wobble
  GAME: 1 << 8, // poll: a chase, the turn minotaur, the fire's clock, a move, a key hold
  CAMERA: 1 << 9, // poll + push: the camera has not converged; gestures
  OVERLAY: 1 << 10, // poll: plucks, ripples, confetti
  BACKGROUND: 1 << 11, // poll, ambient: the background's drift is due
  AUDIO: 1 << 12, // poll, not visual: the auto sound's clock
  INPUT: 1 << 13, // push, not visual: any input event (recorded only)
} as const;
export type FlagName = keyof typeof Flag;

export const FLAG_COUNT = 14;
// Bit order: FLAG_NAMES[i] is the name of 1 << i.
export const FLAG_NAMES: readonly FlagName[] = [
  "LOAD",
  "PHYS",
  "GEOM",
  "FLOW",
  "REVEAL",
  "FX",
  "PAINT",
  "PAINT_AMBIENT",
  "GAME",
  "CAMERA",
  "OVERLAY",
  "BACKGROUND",
  "AUDIO",
  "INPUT",
];
export const ALL_FLAGS = (1 << FLAG_COUNT) - 1;
// Everything that changes pixels: all but AUDIO and INPUT.
export const VISUAL = ALL_FLAGS & ~(Flag.AUDIO | Flag.INPUT);
// The rest cadence's flags (K6-3 draws them at 30 fps): design 4.3.
export const AMBIENT = Flag.FLOW | Flag.PAINT_AMBIENT | Flag.BACKGROUND;
// What the background's pause policy calls "the scene is active" (design
// 4.5): every visual flag but the background's own.
export const SCENE_ACTIVE = VISUAL & ~Flag.BACKGROUND;

// The flag names set in a mask, in bit order.
export function flagNames(mask: number): FlagName[] {
  const out: FlagName[] = [];
  for (let i = 0; i < FLAG_COUNT; i++) if (mask & (1 << i)) out.push(FLAG_NAMES[i]);
  return out;
}

// The two-bit answers src/render and src/ui return (they import nothing
// from src/app): bit 0 = an event-driven change, bit 1 = an ambient one.
export const NEED_EVENT = 1;
export const NEED_AMBIENT = 2;

// One frame's observations beside the masks (the report's observer).
export interface FrameObservation {
  // The world root moved this frame (the legacy root-move test: 0.01 px,
  // 1e-5 scale).
  rootMoved: boolean;
  // The legacy sceneAnimating() (K6-2 deletes it).
  legacy: boolean;
  // sceneActive as computed this frame.
  active: boolean;
  // The frame stepped the physics without PHYS in its need.
  stepUnflagged: boolean;
}

export interface PerFlag {
  frames: number; // frames the flag was in the need mask
  sole: number; // frames it was the ONLY visual flag
  pushes: number; // push() calls carrying it
}

export interface LoopReport {
  mode: "shadow";
  frames: number;
  now: FlagName[]; // the open frame's need so far (carried polls | pushes)
  last: FlagName[]; // the last closed frame's need
  flags: Record<FlagName, PerFlag>;
  empty: number; // frames with no visual flag
  emptyRuns: { count: number; longest: number; current: number };
  restarts: {
    push: number;
    poll: number;
    // restarts by poll whose window also saw an INPUT push (K6-3 restarts
    // the rAF on input, so these are not missed)
    pollWithInput: number;
    byPush: Partial<Record<FlagName, number>>;
    byPoll: Partial<Record<FlagName, number>>;
  };
  ambientOnly: number; // frames whose visual flags are all ambient
  observer: {
    rootMoved: number; // the root moved with CAMERA, LOAD and PHYS clear
    legacyOnly: number; // legacy sceneAnimating() true, sceneActive false
    flagsOnly: number; // sceneActive true, legacy false
    stepUnflagged: number; // physics stepped without PHYS in the need
  };
  recent: number[]; // the last RING frames' need masks, oldest first
  recentPush: number[]; // the same frames' push masks
  names: readonly FlagName[];
}

export const RING = 240;

export class LoopFlags {
  // Pushes since the last frame closed.
  private pushedBits = 0;
  // The polls read at the end of the last frame, carried into the open one
  // (plus deferred notes).
  private carriedBits = 0;
  // Notes for the NEXT frame (a change that lands after this frame's pass).
  private deferredBits = 0;
  private lastNeedBits = 0;

  private frameCount = 0;
  private readonly setFrames = new Uint32Array(FLAG_COUNT);
  private readonly soleFrames = new Uint32Array(FLAG_COUNT);
  private readonly pushCounts = new Uint32Array(FLAG_COUNT);
  private emptyFrames = 0;
  private runCount = 0;
  private runLongest = 0;
  private runCurrent = 0;
  private restartPush = 0;
  private restartPoll = 0;
  private restartPollInput = 0;
  private readonly restartByPush = new Uint32Array(FLAG_COUNT);
  private readonly restartByPoll = new Uint32Array(FLAG_COUNT);
  private ambientOnlyFrames = 0;
  private obsRoot = 0;
  private obsLegacyOnly = 0;
  private obsFlagsOnly = 0;
  private obsStep = 0;
  private readonly ring = new Uint32Array(RING);
  private ringN = 0;

  // A push: an event that asks for a frame. Counts toward the open frame.
  push(bits: number): void {
    bits &= ALL_FLAGS;
    this.pushedBits |= bits;
    for (let i = 0; i < FLAG_COUNT; i++) if (bits & (1 << i)) this.pushCounts[i]++;
  }

  // A note for the NEXT frame: a change made after this frame's geometry
  // pass (the worker's sleep trip applies its last snapshot there).
  defer(bits: number): void {
    this.deferredBits |= bits & ALL_FLAGS;
  }

  // Pushes since the last frame closed.
  get pushed(): number {
    return this.pushedBits;
  }
  // The polls carried into the open frame.
  get carried(): number {
    return this.carriedBits;
  }
  // The open frame's need so far.
  get need(): number {
    return this.carriedBits | this.pushedBits;
  }
  // The last closed frame's need.
  get lastNeed(): number {
    return this.lastNeedBits;
  }
  get frames(): number {
    return this.frameCount;
  }

  // Close the open frame. `polls` = the polls read now, at its end: they
  // belong to the next frame. Returns the closed frame's need.
  endFrame(polls: number, obs: FrameObservation): number {
    const pushed = this.pushedBits;
    const carried = this.carriedBits;
    const need = carried | pushed;
    this.frameCount++;
    for (let i = 0; i < FLAG_COUNT; i++) if (need & (1 << i)) this.setFrames[i]++;
    const vis = need & VISUAL;
    if (vis !== 0 && (vis & (vis - 1)) === 0) this.soleFrames[31 - Math.clz32(vis)]++;
    if (vis === 0) {
      this.emptyFrames++;
      if (this.runCurrent === 0) this.runCount++;
      this.runCurrent++;
      if (this.runCurrent > this.runLongest) this.runLongest = this.runCurrent;
    } else {
      if (this.runCurrent > 0) {
        const pushVis = pushed & VISUAL;
        if (pushVis !== 0) {
          this.restartPush++;
          for (let i = 0; i < FLAG_COUNT; i++) if (pushVis & (1 << i)) this.restartByPush[i]++;
        } else {
          this.restartPoll++;
          if (pushed & Flag.INPUT) this.restartPollInput++;
          const pollVis = carried & VISUAL;
          for (let i = 0; i < FLAG_COUNT; i++) if (pollVis & (1 << i)) this.restartByPoll[i]++;
        }
        this.runCurrent = 0;
      }
      if ((vis & ~AMBIENT) === 0) this.ambientOnlyFrames++;
    }
    if (obs.rootMoved && (need & (Flag.CAMERA | Flag.LOAD | Flag.PHYS)) === 0) this.obsRoot++;
    if (obs.legacy && !obs.active) this.obsLegacyOnly++;
    if (!obs.legacy && obs.active) this.obsFlagsOnly++;
    if (obs.stepUnflagged) this.obsStep++;
    this.ring[this.ringN++ % RING] = (need & 0xffff) | ((pushed & 0xffff) << 16);
    this.lastNeedBits = need;
    this.carriedBits = (polls & ALL_FLAGS) | this.deferredBits;
    this.deferredBits = 0;
    this.pushedBits = 0;
    return need;
  }

  // Zero the counters (the open frame's pushes and carried polls stay).
  reset(): void {
    this.frameCount = 0;
    this.setFrames.fill(0);
    this.soleFrames.fill(0);
    this.pushCounts.fill(0);
    this.emptyFrames = 0;
    this.runCount = 0;
    this.runLongest = 0;
    this.runCurrent = 0;
    this.restartPush = 0;
    this.restartPoll = 0;
    this.restartPollInput = 0;
    this.restartByPush.fill(0);
    this.restartByPoll.fill(0);
    this.ambientOnlyFrames = 0;
    this.obsRoot = 0;
    this.obsLegacyOnly = 0;
    this.obsFlagsOnly = 0;
    this.obsStep = 0;
    this.ring.fill(0);
    this.ringN = 0;
  }

  report(): LoopReport {
    const flags = {} as Record<FlagName, PerFlag>;
    const byPush: Partial<Record<FlagName, number>> = {};
    const byPoll: Partial<Record<FlagName, number>> = {};
    for (let i = 0; i < FLAG_COUNT; i++) {
      const n = FLAG_NAMES[i];
      flags[n] = {
        frames: this.setFrames[i],
        sole: this.soleFrames[i],
        pushes: this.pushCounts[i],
      };
      if (this.restartByPush[i]) byPush[n] = this.restartByPush[i];
      if (this.restartByPoll[i]) byPoll[n] = this.restartByPoll[i];
    }
    const k = Math.min(this.ringN, RING);
    const recent: number[] = [];
    const recentPush: number[] = [];
    for (let j = this.ringN - k; j < this.ringN; j++) {
      const v = this.ring[j % RING];
      recent.push(v & 0xffff);
      recentPush.push(v >>> 16);
    }
    return {
      mode: "shadow",
      frames: this.frameCount,
      now: flagNames(this.need),
      last: flagNames(this.lastNeedBits),
      flags,
      empty: this.emptyFrames,
      emptyRuns: { count: this.runCount, longest: this.runLongest, current: this.runCurrent },
      restarts: {
        push: this.restartPush,
        poll: this.restartPoll,
        pollWithInput: this.restartPollInput,
        byPush,
        byPoll,
      },
      ambientOnly: this.ambientOnlyFrames,
      observer: {
        rootMoved: this.obsRoot,
        legacyOnly: this.obsLegacyOnly,
        flagsOnly: this.obsFlagsOnly,
        stepUnflagged: this.obsStep,
      },
      recent,
      recentPush,
      names: FLAG_NAMES,
    };
  }
}

export function createLoopFlags(): LoopFlags {
  return new LoopFlags();
}
