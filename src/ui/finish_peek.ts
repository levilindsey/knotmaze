// THE FINISH INDICATOR'S PEEK (K488; Levi, 2026-10-15). A tap on the
// finish's off-screen indicator zooms out to frame the exit, holds, and
// eases back to the view the player was at. It replaces the old framing
// tap (frameWorld with the head), whose scale the camera's clamps ate:
// at the start of a thread-reveal maze the fit camera frames only the
// seen thread, so the tween ended where it began and the exit stayed
// off screen (K465's finding). PURE plan, tested in
// test/ui/finish_peek.test.ts; main.ts wires it, and the camera's free
// tween (src/app/camera.ts) carries it out.

// The ease out to the exit, and back again (the head's return eases in
// the same 0.6 s); reduced motion jumps.
export const FINISH_PEEK_TWEEN_S = 0.6;
// How long the exit stays framed before the camera eases back.
export const FINISH_PEEK_HOLD_S = 2.5;

export interface FinishPeekInput {
  // The exit's world position.
  exit: { x: number; y: number };
  // The camera's current scale (px per world unit).
  scale: number;
  // The follow camera's framing scale for the head: the peek's zoom-out
  // target, so the exit gets the neighborhood the follow camera would
  // show around the head.
  followScale: number;
  // The Motion setting: reduced motion jumps instead of easing.
  reduced: boolean;
}

// What a tap on the finish's indicator does to the camera.
export interface FinishPeekPlan {
  // Ease the camera to put world (x, y) at the screen's center at scale s.
  x: number;
  y: number;
  s: number;
  // Seconds out, seconds held at the exit, seconds back.
  dur: number;
  hold: number;
  backDur: number;
}

export function finishPeekPlan(i: FinishPeekInput): FinishPeekPlan {
  const dur = i.reduced ? 0 : FINISH_PEEK_TWEEN_S;
  return {
    x: i.exit.x,
    y: i.exit.y,
    // Never zoom in for a peek: a player already further out (or in)
    // keeps their scale and just recenters on the exit.
    s: Math.min(i.scale, i.followScale),
    dur,
    hold: FINISH_PEEK_HOLD_S,
    backDur: dur,
  };
}
