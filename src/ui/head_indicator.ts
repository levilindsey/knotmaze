// THE PLAYER'S OFF-SCREEN INDICATOR (K148; Levi, 2026-10-13: "When panning
// away from the current position, we should also show an offscreen
// indicator for it."). The head - the player's position, drawn as K83's
// head marker - joins the finish and the minotaur as a K73 indicator
// client (offscreen_indicators.ts). PURE decisions live here, main.ts wires
// them: when the indicator may show, and what a tap on it does.

// Why the head's indicator hides, or "" when it may show (it still shows
// only while the head is off screen: the indicator module decides that).
// The head sits in any fabric maze, so unlike the finish's there is no
// "solved" or "unrevealed" condition: it shows during play and after a
// finish alike, and under fog of war (it is where you are). There is no
// viewer setting for it either (K148's call): the finish's can be turned
// off to take the direction to the exit away; your own position gives
// nothing away.
export type HeadWhy = "" | "no maze" | "loading";

export interface HeadScene {
  // The fabric maze mode (not the knot).
  mazeFabric: boolean;
  // The maze's renderer, controller and walk graph exist.
  built: boolean;
  // The world is on screen: not the hidden load settle.
  shown: boolean;
}

export function headIndicatorWhy(s: HeadScene): HeadWhy {
  if (!s.mazeFabric || !s.built) return "no maze";
  if (!s.shown) return "loading";
  return "";
}

// A tap's tween takes this long (the finish's tap eases its framing in the
// same 0.6 s); reduced motion jumps.
export const HEAD_RETURN_S = 0.6;

export interface HeadReturnInput {
  // The follow camera (cameraMode follow) rather than the fit camera.
  follow: boolean;
  // The head's world position.
  head: { x: number; y: number };
  // The camera's current scale (px per world unit).
  scale: number;
  // The follow camera's own framing scale for the head.
  followScale: number;
  // The intro is playing: the follow camera frames the whole knot, not the
  // head.
  intro: boolean;
  // The Motion setting: reduced motion jumps instead of easing.
  reduced: boolean;
  // How long the follow camera must sit idle to pull at full strength
  // (main.ts FOLLOW_DELAY + FOLLOW_RAMP).
  followSettle: number;
}

// What a tap on the head's indicator does to the camera.
export interface HeadReturn {
  // Ease the camera to put world (x, y) at the screen's center at scale s
  // over `dur` seconds; false = no tween (the follow spring does it all).
  tween: boolean;
  x: number;
  y: number;
  s: number;
  dur: number;
  // Seconds the follow spring stays off once the tween ends: negative =
  // it is back at full strength the moment the tween ends (the pan that
  // suspended the follow is over), as a double-click's reset does.
  hold: number;
  // Re-engage the follow spring at full strength now (no tween).
  resume: boolean;
}

export function headReturnPlan(i: HeadReturnInput): HeadReturn {
  const dur = i.reduced ? 0 : HEAD_RETURN_S;
  if (!i.follow) {
    // FIT camera: center the head at the zoom the player is at. The
    // view's clamp keeps the frame covering what it must (view_clamp.ts),
    // so a head at the maze's far edge comes as near the center as it can.
    return {
      tween: true,
      x: i.head.x,
      y: i.head.y,
      s: i.scale,
      dur,
      hold: 0,
      resume: false,
    };
  }
  if (i.intro) {
    // The follow camera's target is the whole knot until the intro ends:
    // just let the spring pull it back, at full strength at once.
    return {
      tween: false,
      x: i.head.x,
      y: i.head.y,
      s: i.scale,
      dur: 0,
      hold: 0,
      resume: true,
    };
  }
  // FOLLOW camera: ease onto the follow framing of the head (so the
  // spring has nothing left to do) and resume the follow when it lands.
  return {
    tween: true,
    x: i.head.x,
    y: i.head.y,
    s: i.followScale,
    dur,
    hold: -i.followSettle,
    resume: false,
  };
}
