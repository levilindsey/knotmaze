// K169: THE GOLD WEB'S FADE-IN. K127 fills a junction web with the arms'
// composed (gold) paint once the path has traveled every arm of it; before
// this, that happened in one frame (Levi, 2026-10-14: "Fade"). A web that
// becomes fully traveled now crossfades from its untraveled material to the
// composed paint over WEB_FADE_S seconds, and the junction caps (which a
// fully traveled web keeps) fade in with it.
//
// The pure half: a per-junction clock and an easing. The renderer keeps one
// WebFade, tells it the set of fully traveled junctions whenever the routes
// re-resolve (retarget), and each paint tick writes level(ji, now) into the
// junction record (J1.z: junction_field.ts blends its two bases by it) and
// scales the caps' paint by it. "now" is the renderer's paint clock, which
// probes pin (advanceClocks no-op, paintClock set): a pinned clock holds a
// fade at the level of its pinned time, so a probe shows any frame of it by
// setting the clock; `seconds` = 0 turns the fade off (K127's one frame).
//
// Fade IN only. A web that stops being fully traveled (a backtrack, a reset)
// is untraveled at once, as it was in K127, and a web that is already fully
// traveled when the first routes arrive (a saved attempt restored on load)
// is shown full without a fade: nothing became full.
//
// Reduced motion keeps the fade (K169): it moves nothing, it is a 0.25 s
// crossfade of colors, and ui/motion.ts gates movement (the background's
// drift, plucks, the camera ease), not fades; the pulses and the move
// animation are not gated either. The Motion setting is not read here.

// The fade's length, seconds ("about 0.25 s", Levi).
export const WEB_FADE_S = 0.25;

// The eased level of a fade `elapsed` seconds in: smoothstep of the linear
// progress, so the web neither jumps at the start nor stops dead at the
// end. 0 at elapsed <= 0, 1 at elapsed >= seconds (and always 1 when the
// fade is off, seconds <= 0).
export function webFadeLevel(elapsed: number, seconds: number = WEB_FADE_S): number {
  if (!(seconds > 0)) return 1;
  const x = elapsed / seconds;
  if (!(x > 0)) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
}

export class WebFade {
  // The fade's length; 0 = off (probes, same-state A/Bs against K127).
  seconds = WEB_FADE_S;
  // Fading junctions -> the clock reading when each became fully traveled.
  private born = new Map<number, number>();
  // The previous fully traveled set (null before the first retarget).
  private known: Set<number> | null = null;

  // The fully traveled junctions changed (or were declared again): start a
  // fade for each newly full one, drop the fades of the ones that no longer
  // are. The first call only learns the set (see the header).
  retarget(full: ReadonlySet<number>, now: number): void {
    const known = this.known;
    for (const ji of this.born.keys()) {
      if (!full.has(ji)) this.born.delete(ji);
    }
    if (known !== null && this.seconds > 0) {
      for (const ji of full) {
        if (!known.has(ji)) this.born.set(ji, now);
      }
    }
    this.known = new Set(full);
  }

  // The junction's level in [0, 1] at clock `now`: 1 unless it is fading.
  level(ji: number, now: number): number {
    const b = this.born.get(ji);
    return b === undefined ? 1 : webFadeLevel(now - b, this.seconds);
  }

  // Is the junction fading (it has not reached 1 yet)?
  has(ji: number): boolean {
    return this.born.has(ji);
  }

  // Any fade running: what main.ts's sceneAnimating() reports.
  get active(): boolean {
    return this.born.size > 0;
  }

  // The junctions fading now and their levels at `now`, then forget the ones
  // that reached 1 (their last level, 1, is in the list: the caller writes
  // it once, and level() answers 1 from then on).
  step(now: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (const [ji, b] of this.born) {
      const lv = webFadeLevel(now - b, this.seconds);
      out.push([ji, lv]);
      if (lv >= 1) this.born.delete(ji);
    }
    return out;
  }

  // Forget everything (a new scene).
  reset(): void {
    this.born.clear();
    this.known = null;
  }
}
