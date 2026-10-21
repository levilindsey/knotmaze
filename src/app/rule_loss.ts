// K137: the rule losses beside main.ts's Burnt banner (fragile runs leave
// the player stranded, strict par runs out of strokes) and their sounds.
// main.ts keeps the frame loop's pendingLoss flag: a move that strands the
// player or spends the last useful stroke sets it (afterMove), and the
// frame loop shows the loss once the dot arrives (main.ts's showLoss ->
// show()). A snap's pluck waits for the arrival too: step() runs in the
// frame loop's keyStep slot, after the move's tick.
import { parText } from "../game/collapse";
import type { FabricMazeController } from "../game/fabric_controller";
import type { ShareInfo } from "../game/share_text";
import { ruleLossEntries } from "../ui/maze_hud";
import type { LossBanner, RuleFields } from "../ui/maze_hud";

// A snap: one sharp pluck at the run's own pitch, an octave up.
export const SNAP_OCTAVE = 2;
export const SNAP_STRENGTH = 0.85;
// A strand: a falling glissando of GLISS_NOTES plucks GLISS_STEP_S apart
// (five gaps, 0.6 s), each GLISS_SEMITONES below the last, fading.
export const GLISS_NOTES = 6;
export const GLISS_STEP_S = 0.12;
export const GLISS_SEMITONES = 2;
// A strand's glissando waits this long after a snap that sounds with it.
export const GLISS_AFTER_SNAP_S = 0.12;

export interface GlissNote {
  freq: number;
  strength: number;
  // Seconds after the glissando starts.
  at: number;
}

// The strand's notes from `f0` (the pitch where the player stands) down.
export function glissando(f0: number): GlissNote[] {
  const out: GlissNote[] = [];
  for (let i = 0; i < GLISS_NOTES; i++) {
    out.push({
      freq: f0 * Math.pow(2, (-GLISS_SEMITONES * i) / 12),
      strength: 0.55 - (0.3 * i) / (GLISS_NOTES - 1),
      at: i * GLISS_STEP_S,
    });
  }
  return out;
}

// The HUD's, the banners' and the share's K137 fields (null: rule off), and
// K139's collapse score (its snaps are the score, so no snapped row).
export function ruleFields(fc: FabricMazeController): RuleFields {
  const par = fc.collapseOn ? fc.collapsePar : null;
  return {
    snapped: fc.fragileOn && !fc.collapseOn ? fc.brokenRuns().length : null,
    parLeft: fc.parMode === "strict" ? { par: fc.par, left: fc.strokesLeft } : null,
    parStrokes: fc.parMode === "strokes" ? { par: fc.par, strokes: fc.strokes } : null,
    collapse: par ? { pct: fc.collapsePercent, par: parText(par) } : null,
    cuts: fc.cutOn ? fc.cutCount : null, // K114
    // K137 stage 2: the spool's gauge and the hints left (the finish's
    // spoolUsed and hintsUsed ride main.ts's WinInfo, not these).
    spool: fc.spoolOn ? { used: fc.spoolUsed, cap: fc.spoolCap } : null,
    hints: fc.hintsMax > 0 ? { left: fc.hintsLeft, of: fc.hintsMax } : null,
    // K138: the rules row, the turnstiles laid and the hidden runs found.
    rules: rulesValue(fc),
    turnstiles: fc.turnstileCount > 0 ? (fc.ruleLook?.turnstiles?.length ?? 0) : null,
    hidden:
      fc.hiddenCount > 0
        ? {
            found: fc.revealed.size,
            of: fc.ruleLook?.hidden?.length ?? 0,
            fewest: fc.fewestRuns,
            withAll: fc.fewestWithHidden,
          }
        : null,
    // K138 stage 3: the one-way runs laid (0: the share found no layout).
    oneWay: fc.oneWayShare > 0 ? (fc.ruleLook?.oneWay?.size ?? 0) : null,
  };
}

// K138 stage 1's row (built in stage 2): "ice 25% · cycle", "alternate",
// "ice 25% · no layout" (a rule that found no layout is off); null with
// neither ice nor the color rule on.
export function rulesValue(fc: FabricMazeController): string | null {
  const ice = fc.iceShare > 0;
  const color = fc.colorMode !== "off";
  if (!ice && !color) return null;
  const look = fc.ruleLook;
  const parts: string[] = [];
  if (ice) parts.push(`ice ${Math.round(fc.iceShare * 100)}%`);
  if (color) parts.push(fc.colorMode);
  if ((ice && !look?.icy) || (color && !look?.colors)) parts.push("no layout");
  return parts.join(" \u00B7 ");
}

// K138: the share title's rule tags (null: that rule off, or not laid).
export function ruleShareTags(
  fc: FabricMazeController
): Pick<ShareInfo, "ice" | "colorRule" | "turnstiles" | "hidden" | "oneWay"> {
  const look = fc.ruleLook;
  return {
    ice: fc.iceShare > 0 && look?.icy ? Math.round(fc.iceShare * 100) : null,
    colorRule: fc.colorMode !== "off" && look?.colors ? fc.colorMode : null,
    turnstiles: fc.turnstileCount > 0 && look?.turnstiles ? look.turnstiles.length : null,
    hidden:
      fc.hiddenCount > 0 && look?.hidden ? { found: fc.revealed.size, of: look.hidden.length } : null,
    oneWay: fc.oneWayShare > 0 && look?.oneWay ? look.oneWay.size : null, // K138 stage 3
  };
}

const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

// The Out of strokes banner's sentence.
export function outOfStrokesLine(runsLeft: number, strokesLeft: number): string {
  if (!Number.isFinite(runsLeft)) return "No way to the exit is left.";
  return (
    `The exit is ${plural(runsLeft, "run", "runs")} away ` +
    `with ${plural(strokesLeft, "move", "moves")} left.`
  );
}

export interface RuleLossDeps {
  controller: () => FabricMazeController | null;
  banner: LossBanner;
  // The dot is still travelling (the renderer's move animation).
  animating: () => boolean;
  // The volume and sound settings allow a sound.
  soundOn: () => boolean;
  pluck: (freq: number, strength: number, when?: number) => void;
  // The audio clock (null until the context runs).
  audioTime: () => number | null;
  freqForRun: (eid: number) => number | null;
  freqAtHead: () => number | null;
  stopClock: () => void;
  timeMs: () => number;
  // Undo is safe: the controller's taps hold the whole state.
  canUndo: () => boolean;
  undo: () => void;
  restart: () => void;
  updateHud: () => void;
}

export interface RuleLoss {
  // After a move: queue its snap; true when the move lost the attempt.
  afterMove(fc: FabricMazeController): boolean;
  // Each frame (the keyStep slot): sound a queued snap once the dot is in.
  step(): void;
  // The frame loop's loss slot: the banner, the glissando, the clock.
  show(): void;
  // The attempt is over by a rule (stranded or out of strokes).
  over(): boolean;
  // A tap on the maze while over: re-show the banner (true) unless it is
  // pending or shown (false).
  tapWhileOver(pending: boolean): boolean;
  reset(): void;
}

export function createRuleLoss(deps: RuleLossDeps): RuleLoss {
  let pendingSnap = -1;
  let snapFc: FabricMazeController | null = null;
  let snapSounded = false;
  // The stranding the glissando last played for (controller + restarts:
  // an Undo's replay and a restart both move restarts).
  let glissFc: FabricMazeController | null = null;
  let glissRestarts = -1;

  const playGlissando = (): void => {
    const f0 = deps.freqAtHead() ?? 330;
    const notes = glissando(f0);
    let t0 = deps.audioTime();
    let first = 0;
    if (t0 === null) {
      // The context is not running: the first pluck wakes it.
      deps.pluck(notes[0].freq, notes[0].strength);
      first = 1;
      t0 = deps.audioTime();
      if (t0 === null) return;
      t0 -= notes[0].at;
    } else if (snapSounded) {
      t0 += GLISS_AFTER_SNAP_S;
    }
    for (let i = first; i < notes.length; i++) {
      deps.pluck(notes[i].freq, notes[i].strength, t0 + notes[i].at);
    }
  };

  const showRule = (fc: FabricMazeController): void => {
    const entries = ruleLossEntries({
      timeMs: deps.timeMs(),
      walked: fc.walkedDist,
      ...ruleFields(fc),
    });
    if (fc.stranded) {
      if (glissFc !== fc || glissRestarts !== fc.restarts) {
        glissFc = fc;
        glissRestarts = fc.restarts;
        if (deps.soundOn()) playGlissando();
      }
      // The clock runs on: Undo resumes the same attempt.
      const undo = deps.canUndo() && fc.taps.length > 0;
      const restart = { label: "Restart", onClick: deps.restart };
      deps.banner.showRule({
        title: "Stranded",
        sub: fc.collapseOn
          ? "Every way to the exit has collapsed behind you."
          : "Every way to the exit has broken behind you.",
        entries,
        primary: undo ? { label: "Undo", onClick: deps.undo } : restart,
        secondary: undo ? restart : undefined,
      });
    } else {
      deps.stopClock();
      deps.banner.showRule({
        title: "Out of strokes",
        sub: outOfStrokesLine(fc.runsLeft, fc.strokesLeft),
        entries,
        primary: { label: "Try again", onClick: deps.restart },
      });
    }
    snapSounded = false;
    deps.updateHud();
  };

  const show = (): void => {
    const fc = deps.controller();
    if (!fc || !(fc.stranded || fc.parLost)) return;
    showRule(fc);
  };

  return {
    afterMove(fc) {
      snapSounded = false;
      if (fc.justBroke >= 0) {
        pendingSnap = fc.justBroke;
        snapFc = fc;
      }
      return fc.stranded || fc.parLost;
    },
    step() {
      if (pendingSnap < 0 || deps.animating()) return;
      const eid = pendingSnap;
      pendingSnap = -1;
      if (snapFc !== deps.controller()) return; // A rebuild in between.
      if (!deps.soundOn()) return;
      const f = deps.freqForRun(eid);
      if (f === null) return;
      deps.pluck(f * SNAP_OCTAVE, SNAP_STRENGTH);
      snapSounded = true;
    },
    show,
    over() {
      const fc = deps.controller();
      return !!fc && (fc.stranded || fc.parLost);
    },
    tapWhileOver(pending) {
      if (pending || deps.banner.shown) return false;
      show();
      return true;
    },
    reset() {
      pendingSnap = -1;
      snapFc = null;
      snapSounded = false;
    },
  };
}
