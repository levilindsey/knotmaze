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
// K525: the roam alpha on a coarse pointer (the phone, at fit zoom, where
// K524's sheet lost 0.45). Hunt is the same on every pointer.
export const TELEGRAPH_ALPHA_ROAM_COARSE = 0.7;
// Every run after the first draws at this share of the first's alpha (the
// line's) or strength (K525's rims: render/telegraph_route.ts).
export const TELEGRAPH_LATER_SHARE = 0.5;

// The alpha of each telegraphed run, in order: the first at the look's
// alpha, every later run at half of it.
export function telegraphAlphas(hunting: boolean, runs: number, coarse = false): number[] {
  const base = hunting ? TELEGRAPH_ALPHA_HUNT : coarse ? TELEGRAPH_ALPHA_ROAM_COARSE : TELEGRAPH_ALPHA_ROAM;
  const out: number[] = [];
  for (let i = 0; i < runs; i++) out.push(i === 0 ? base : base * TELEGRAPH_LATER_SHARE);
  return out;
}

// K525: the telegraph rims' strength (uKTele.w: how far the rim mixes
// toward the telegraph's red at full alpha), by the same hunt/roam split as
// the line's alpha, and like it stronger roaming on a coarse pointer. The
// rims are thinner than the line, so they need more. First values; the
// sheets tune them (docs/design/K525_telegraph.md, Handoff).
export const TELEGRAPH_RIM_ROAM = 0.6;
export const TELEGRAPH_RIM_ROAM_COARSE = 0.8;
export const TELEGRAPH_RIM_HUNT = 1;

export function telegraphRimStrength(hunting: boolean, coarse = false): number {
  return hunting ? TELEGRAPH_RIM_HUNT : coarse ? TELEGRAPH_RIM_ROAM_COARSE : TELEGRAPH_RIM_ROAM;
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
// K546 stage 3 (option A evolved): 0.6 s; the first ring is thicker and
// HOLDS for CATCH_HOLD_S before easing out (K525's "mostly faded" fix),
// and a second inner ring expands from the contact at +CATCH_INNER_AT.
export const CATCH_BURST_S = 0.6;
export const CATCH_BURST_R0 = 1; // in head radii
export const CATCH_BURST_R1 = 3.2;
export const CATCH_BURST_STATIC_ALPHA = 0.8;
export const CATCH_HOLD_S = 0.2;
export const CATCH_INNER_AT = 0.12;

export interface CatchBurstFrame {
  radius: number; // head radii
  alpha: number;
  done: boolean;
  // K546 stage 3: the stroke's width multiplier (the holding ring is
  // thicker) and the second inner ring (null before +CATCH_INNER_AT and
  // under reduced motion, whose form stays the one static ring).
  widthMul: number;
  inner: { radius: number; alpha: number } | null;
}

// The burst's look `age` seconds after the catch (age < 0: not started).
export function catchBurstAt(age: number, reduced: boolean): CatchBurstFrame {
  if (age < 0) return { radius: CATCH_BURST_R0, alpha: 0, done: false, widthMul: 1, inner: null };
  if (age >= CATCH_BURST_S) {
    return { radius: CATCH_BURST_R1, alpha: 0, done: true, widthMul: 1, inner: null };
  }
  const t = age / CATCH_BURST_S;
  if (reduced) {
    return {
      radius: CATCH_BURST_R0 * 1.6,
      alpha: CATCH_BURST_STATIC_ALPHA * (1 - t),
      done: false,
      widthMul: 1,
      inner: null,
    };
  }
  let radius: number;
  let alpha: number;
  let widthMul: number;
  if (age < CATCH_HOLD_S) {
    // The hold: a thick ring swells a little and stays readable.
    const h = age / CATCH_HOLD_S;
    radius = CATCH_BURST_R0 + 0.35 * (1 - (1 - h) * (1 - h));
    alpha = 0.95;
    widthMul = 1.9;
  } else {
    const u = (age - CATCH_HOLD_S) / (CATCH_BURST_S - CATCH_HOLD_S);
    const ease = 1 - (1 - u) * (1 - u);
    radius = CATCH_BURST_R0 + 0.35 + (CATCH_BURST_R1 - CATCH_BURST_R0 - 0.35) * ease;
    alpha = 0.95 * (1 - u);
    widthMul = 1.9 - 0.9 * u;
  }
  let inner: { radius: number; alpha: number } | null = null;
  if (age >= CATCH_INNER_AT) {
    const v = (age - CATCH_INNER_AT) / (CATCH_BURST_S - CATCH_INNER_AT);
    const ease = 1 - (1 - v) * (1 - v);
    inner = {
      radius: CATCH_BURST_R0 * 0.5 + (CATCH_BURST_R1 * 0.85 - CATCH_BURST_R0 * 0.5) * ease,
      alpha: 0.75 * (1 - v),
    };
  }
  return { radius, alpha, done: false, widthMul, inner };
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
