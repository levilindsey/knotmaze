// K169 / K191: THE GOLD WEB'S FADE. K127 fills a junction web with the arms'
// composed (gold) paint once the path has traveled every arm of it; before
// K169 that happened in one frame (Levi, 2026-10-14: "Fade"). A web that
// becomes fully traveled now crossfades from its untraveled material to the
// composed paint over WEB_FADE_S seconds, and the junction caps (which a
// fully traveled web keeps) fade in with it. K191 (Levi, 2026-10-14: "fade
// out") runs the same fade the other way: a web that stops being fully
// traveled (a backtrack takes an arm out of the traveled passes) crossfades
// back to the untraveled material, caps and all, instead of going untraveled
// in one frame.
//
// The pure half: a per-junction ramp and an easing. The renderer keeps one
// WebFade, tells it the set of fully traveled junctions whenever the routes
// re-resolve (retarget), and each paint tick writes level(ji, now) into the
// junction record (J1.z: junction_field.ts blends its two bases by it) and
// scales the caps' paint by it. "now" is the renderer's paint clock, which
// probes pin (advanceClocks no-op, paintClock set): a pinned clock holds a
// fade at the level of its pinned time, so a probe shows any frame of it by
// setting the clock; `seconds` = 0 turns the fades off (K127's one frame).
//
// LEVELS (K191). A fade is a ramp from a start level to 1 (a web turning
// full) or 0 (a web leaving full) that eases with the same smoothstep and
// runs WEB_FADE_S: from 0 to 1 the levels are webFadeLevel(elapsed) and from
// 1 to 0 they are 1 - webFadeLevel(elapsed), so a web that stops being full
// reads 1, 0.530, 0 at 0, 0.12 and 0.25 s (a web that becomes full: 0, 0.470,
// 1). NO JUMPS: a web that turns around mid-fade (full again while fading
// out, not full while fading in) starts the opposite ramp from the level it
// shows at that moment, and takes the full WEB_FADE_S from there.
//
// What does not fade: a web that is already fully traveled when the first
// routes arrive (a saved attempt restored on load) is shown full, nothing
// became full; and a web that stops being full AND stops being routed (the
// path no longer touches the junction: a reset, a string-mode switch, the
// trail's end) has nothing to blend, the shader only blends a routed
// record's two bases, so it ends its fade at once. At those moments the
// web's arms lose their gold in the same frame, so the web has no gold of
// its own left to fade.
//
// Reduced motion keeps both fades (K169): they move nothing, they are a
// 0.25 s crossfade of colors, and ui/motion.ts gates movement (the
// background's drift, plucks, the camera ease), not fades; the pulses and
// the move animation are not gated either. The Motion setting is not read
// here.

// The fade's length, seconds ("about 0.25 s", Levi).
export const WEB_FADE_S = 0.25;

// The eased progress of a fade `elapsed` seconds in: smoothstep of the linear
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

// One running fade: from the level it showed when it started to `to` (1 =
// full, 0 = untraveled), begun at clock `t0`.
interface Fade {
  from: number;
  to: 0 | 1;
  t0: number;
}

export class WebFade {
  // The fade's length; 0 = off (probes, same-state A/Bs against K127).
  seconds = WEB_FADE_S;
  // Fading junctions -> their running fade (either direction).
  private fades = new Map<number, Fade>();
  // The fully traveled set as of the last retarget (null before the first:
  // nothing is known to be full, nothing may fade).
  private known: Set<number> | null = null;

  private levelOf(f: Fade, now: number): number {
    const p = webFadeLevel(now - f.t0, this.seconds);
    return p >= 1 ? f.to : f.from + (f.to - f.from) * p;
  }

  // The fully traveled junctions changed (or were declared again): start a
  // fade for each web that became full (in) or stopped being full (out),
  // turn a running fade around from its current level when its web changed
  // direction, and leave the others alone (a web declared again keeps its
  // clock). `routed` = the junctions that still hold a route, which is what
  // the shader needs to blend a record's two bases (null = all of them): a
  // web leaving full without one has nothing to show and its fade ends.
  // The first call only learns the set (see the header).
  retarget(
    full: ReadonlySet<number>,
    now: number,
    routed: { has(ji: number): boolean } | null = null
  ): void {
    const known = this.known;
    if (known !== null) {
      const ids = new Set<number>(this.fades.keys());
      for (const ji of known) ids.add(ji);
      for (const ji of full) ids.add(ji);
      for (const ji of ids) {
        const f = this.fades.get(ji);
        const to = full.has(ji) ? 1 : 0;
        const cur = f ? this.levelOf(f, now) : known.has(ji) ? 1 : 0;
        if (
          cur === to ||
          !(this.seconds > 0) ||
          (to === 0 && routed !== null && !routed.has(ji))
        ) {
          this.fades.delete(ji);
        } else if (!f || f.to !== to) {
          this.fades.set(ji, { from: cur, to, t0: now });
        }
      }
    }
    this.known = new Set(full);
  }

  // The junction's level in [0, 1] at clock `now`: its fade's level while it
  // fades, else 1 for a fully traveled web and 0 for any other.
  level(ji: number, now: number): number {
    const f = this.fades.get(ji);
    if (f) return this.levelOf(f, now);
    return this.known !== null && this.known.has(ji) ? 1 : 0;
  }

  // Is the junction fading (in or out; it has not reached its end yet)?
  has(ji: number): boolean {
    return this.fades.has(ji);
  }

  // Any fade running: what the frame loop's PAINT poll reads (K6-1).
  get active(): boolean {
    return this.fades.size > 0;
  }

  // The junctions fading now and their levels at `now`; changes nothing.
  levels(now: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (const [ji, f] of this.fades) out.push([ji, this.levelOf(f, now)]);
    return out;
  }

  // The junctions fading now and their levels at `now`, then forget the ones
  // that reached their end (their last level, 1 or 0, is in the list: the
  // caller writes it once, and level() answers it from then on).
  step(now: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (const [ji, f] of this.fades) {
      out.push([ji, this.levelOf(f, now)]);
      if (webFadeLevel(now - f.t0, this.seconds) >= 1) this.fades.delete(ji);
    }
    return out;
  }

  // Forget everything (a new scene).
  reset(): void {
    this.fades.clear();
    this.known = null;
  }
}
