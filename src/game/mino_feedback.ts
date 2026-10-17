// K80 turns stage 3b (docs/design/K80_turns_stage3.md sections 2.7, 2.8,
// 2.10): the pure decisions behind the turn minotaur's feedback — the
// telegraph's per-run alphas, the catch burst's clock, and the sound cues.
// No render, no DOM, no audio: main.ts and the renderer read these, and
// test/game/mino_feedback.test.ts pins them. The chevrons of section 2.7
// wait for K324 stage 2; this stage ships the route-shaped line with the
// hunt/roam brightness split and the dimmer second run.

// Section 2.7: faint while it roams, bright while it hunts; at two runs
// the second run draws dimmer (half the first run's alpha).
export const TELEGRAPH_ALPHA_ROAM = 0.45;
export const TELEGRAPH_ALPHA_HUNT = 0.95;

// The alpha of each telegraphed run, in order: the first at the look's
// alpha, every later run at half of it.
export function telegraphAlphas(hunting: boolean, runs: number): number[] {
  const base = hunting ? TELEGRAPH_ALPHA_HUNT : TELEGRAPH_ALPHA_ROAM;
  const out: number[] = [];
  for (let i = 0; i < runs; i++) out.push(i === 0 ? base : base * 0.5);
  return out;
}

// K481 stage 3 (decision 7): the by-length telegraph's ticks. One tick
// sits where the minotaur would stop for each choice at the player's
// junction (the wait's edge is -1). Hovering or pressing a choice lights
// its tick and moves the destination ring there; with nothing hovered
// (and always on the phone, which has no hover) the route and its ticks
// show alone. For a multi-run tap (K480) the lit tick is its first run's.
// The alphas stay in K80 3b's language: an unlit tick at the route's
// base (roam 0.45 / hunt 0.95), a lit roam tick raised to the hunt
// brightness, the other ticks dimmed to half while one is lit.
export const TELEGRAPH_TICK_SCALE = 0.55; // of the destination ring's radius
export const TELEGRAPH_TICK_SCALE_LIT = 0.8;
export const TELEGRAPH_TICK_SCALE_COARSE = 0.8; // phone: no hover, fit zoom
export const TELEGRAPH_TICK_SCALE_COARSE_LIT = 1;

export interface TelegraphTickLook {
  alpha: number;
  scale: number; // of the destination ring's radius
  ring: boolean; // draw the full destination ring at this tick
}

// Which choice's tick a hover or press lights: the wait zone first
// (-1), then a hovered route's first run (K480), then the hovered run
// itself; null = nothing hovered. A hovered run that is no choice (a
// beyond run without its route) lights nothing here - its caller
// passes the route, whose first run is a choice.
export function resolveTelegraphHover(
  hoverEdge: number,
  hoverRoute: readonly number[] | null,
  waitHovered: boolean
): number | null {
  if (waitHovered) return -1;
  if (hoverRoute && hoverRoute.length > 0) return hoverRoute[0];
  return hoverEdge >= 0 ? hoverEdge : null;
}

export function telegraphTickLook(
  hunting: boolean,
  lit: boolean,
  anyLit: boolean,
  coarse: boolean
): TelegraphTickLook {
  const base = hunting ? TELEGRAPH_ALPHA_HUNT : TELEGRAPH_ALPHA_ROAM;
  if (lit) {
    return {
      alpha: hunting ? 1 : TELEGRAPH_ALPHA_HUNT,
      scale: coarse ? TELEGRAPH_TICK_SCALE_COARSE_LIT : TELEGRAPH_TICK_SCALE_LIT,
      ring: true,
    };
  }
  return {
    alpha: anyLit ? base * 0.5 : base,
    scale: coarse ? TELEGRAPH_TICK_SCALE_COARSE : TELEGRAPH_TICK_SCALE,
    ring: false,
  };
}

// Section 2.10, fog of war: its red glow bleeds faintly through the fog
// (the marker and the telegraph stay hidden; syncMinotaur's fog rule).
export const MINO_FOG_BLEED_ALPHA = 0.16;

// Section 2.8, the catch burst: a red ring bursts from the head dot over
// CATCH_BURST_S seconds (radius and alpha ease out); under reduced motion
// it is one static ring (CATCH_BURST_STATIC_ALPHA) that simply fades.
export const CATCH_BURST_S = 0.45;
export const CATCH_BURST_R0 = 1; // in head radii
export const CATCH_BURST_R1 = 3.2;
export const CATCH_BURST_STATIC_ALPHA = 0.8;

export interface CatchBurstFrame {
  radius: number; // head radii
  alpha: number;
  done: boolean;
}

// The burst's look `age` seconds after the catch (age < 0: not started).
export function catchBurstAt(age: number, reduced: boolean): CatchBurstFrame {
  if (age < 0) return { radius: CATCH_BURST_R0, alpha: 0, done: false };
  if (age >= CATCH_BURST_S) return { radius: CATCH_BURST_R1, alpha: 0, done: true };
  const t = age / CATCH_BURST_S;
  if (reduced) {
    return { radius: CATCH_BURST_R0 * 1.6, alpha: CATCH_BURST_STATIC_ALPHA * (1 - t), done: false };
  }
  const ease = 1 - (1 - t) * (1 - t);
  return {
    radius: CATCH_BURST_R0 + (CATCH_BURST_R1 - CATCH_BURST_R0) * ease,
    alpha: 0.9 * (1 - t),
    done: false,
  };
}

// Section 2.10's sound cues, decided per turn from the display mode
// before and after it and the run distance to the minotaur:
// - growl: it first sees you (wander/lair -> hunt);
// - heartbeat: a double pluck while it ends within two runs of you;
// - footstep: the quiet low pluck of each run it walks (strength falls
//   with distance; inaudible beyond FOOTSTEP_RUNS runs);
// - catch: the caught run's dull pluck, an octave down with a dissonant
//   neighbor (decided at the catch, not here — see catchNotes).
export type MinoCue = "growl" | "heartbeat" | "footstep" | null;

export const FOOTSTEP_RUNS = 6;

export function turnCue(
  wasHunting: boolean,
  hunting: boolean,
  distRuns: number,
  walkedRuns: number
): MinoCue {
  if (hunting && !wasHunting) return "growl";
  if (hunting && distRuns <= 2) return "heartbeat";
  if (walkedRuns > 0) return "footstep";
  return null;
}

// A footstep's strength by run distance: full next door, gone at
// FOOTSTEP_RUNS. (Its screen-x pan is footstepPan, K526.)
export function footstepStrength(distRuns: number): number {
  if (!Number.isFinite(distRuns) || distRuns >= FOOTSTEP_RUNS) return 0;
  if (distRuns <= 0) return 0.5;
  return 0.5 * (1 - distRuns / FOOTSTEP_RUNS);
}

// Section 2.10's other half (K526): a footstep's pan from the
// minotaur's screen x - hard left at the left edge, centered mid-screen,
// hard right at the right edge. Garbage (no position, no width) centers.
export function footstepPan(screenX: number, screenWidth: number): number {
  if (!Number.isFinite(screenX) || !Number.isFinite(screenWidth) || screenWidth <= 0) {
    return 0;
  }
  return Math.max(-1, Math.min(1, (screenX / screenWidth) * 2 - 1));
}

// The catch's two notes from the caught run's pitch: an octave down, and
// its semitone neighbor (section 2.8's dissonant dull pluck).
export function catchNotes(runFreq: number): [number, number] {
  const low = Math.max(30, runFreq / 2);
  return [low, low * Math.pow(2, 1 / 12)];
}
