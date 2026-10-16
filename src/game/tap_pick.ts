// K479: which run a tap (or a hover) takes among the current choices.
// Pure; the renderer's edgeAt measures the per-run distances and this
// decides, so a tap and the hover that previews it can never disagree.
//
// Levi (2026-10-15): "I sometimes accidentally click on the incoming/
// previous segment when I meant to click on the next/outgoing segment."
// Every run at the head is a choice, the ARRIVAL run (the one the player
// came in on, whose tap is a backtrack) among them, and the arms of a
// junction converge: near it the arrival run and the run meant were a
// toss-up. The arrival run now takes a tap only when it is clearly nearer.
//
// THE RULE. Each run in reach brings d, the distance from the tap to its
// nearest tappable point (world). Outgoing runs compete as before, the
// nearest wins, the first listed on a tie. The arrival run beats the
// nearest outgoing one only when
//     max(0, dArrival - halfWidth) * bias  <  max(0, dOutgoing - halfWidth)
// that is, by distance PAST THE DRAWN EDGE (halfWidth = half the thread
// width) rather than from the centerline. That is what keeps "a tap inside
// exactly one run's drawn ribbon takes that run": inside only the arrival
// ribbon its distance is 0 and the outgoing one's is not, so it wins at
// any bias; inside both ribbons (the arms overlap) both are 0 and the
// outgoing run wins the tie; in the margin around them the arrival run
// needs to be `bias` times nearer to its edge. halfWidth 0 is the plain
// centerline ratio (the census compares the two, K479.md).
//
// Alone in reach, the arrival run still takes the tap (a tap well along
// it is a backtrack). With no arrival run (before the first move, or back
// at the start) there is no bias: the nearest run wins, as it always did.

// How much nearer (to its drawn edge) the arrival run must be than the
// nearest outgoing run to take a tap. Tuned by the K479 census.
export const ARRIVAL_BIAS = 1.5;

// One run within the tap's reach and its distance (world) to the tap.
export interface RunReach {
  eid: number;
  d: number;
}

// The run a tap takes, or -1 when no run is in reach. `reach` lists the
// runs that have a tappable point within the pick radius, in choices()
// order (a run with none is absent: out of reach, or all its thread hidden,
// burnt or inside the head's neighborhood). `arrival` is the walk-edge id
// of the run the player arrived on, -1 for none. A self-loop run is one
// run: listed twice, its nearest distance counts.
export function pickRun(
  reach: readonly RunReach[],
  arrival: number,
  bias: number = ARRIVAL_BIAS,
  halfWidth = 0
): number {
  let out = -1;
  let dOut = Infinity;
  let dArr = Infinity;
  for (const r of reach) {
    if (r.eid === arrival) {
      if (r.d < dArr) dArr = r.d;
    } else if (r.d < dOut) {
      dOut = r.d;
      out = r.eid;
    }
  }
  // The arrival run out of reach (or none): the nearest outgoing run, or
  // nothing. Alone in reach: the arrival run.
  if (dArr === Infinity) return out;
  if (out < 0) return arrival;
  const a = Math.max(0, dArr - halfWidth);
  const o = Math.max(0, dOut - halfWidth);
  return a * bias < o ? arrival : out;
}

// MID-MOVE. The controller commits a move at once and the dot catches up,
// so while it travels the run it is on is the arrival run and a tap on it
// is a backtrack. Only the stretch the dot has already covered is that
// backtrack; the stretch still ahead of it is empty space for taps (an
// outgoing run in reach can win there). `from` is the departure ctrl of
// the in-flight move and `cur` the dot's ctrl (either order: a run is
// entered from its A or its B end); a sample at `ctrl` counts when it lies
// between them.
export function coveredByDot(from: number, cur: number, ctrl: number): boolean {
  const lo = Math.min(from, cur);
  const hi = Math.max(from, cur);
  return ctrl >= lo - 1e-9 && ctrl <= hi + 1e-9;
}
