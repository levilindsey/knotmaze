# K1172: walker modes, a brainstorm (2026-11-03)

Levi, 2026-11-03, in four messages (typos fixed):
- "Now I'm wondering if we could make some sort of compelling game mode
  where the current location is moved by a computer-player agent. The
  human player would then do something to prepare the maze or assign
  instructions or somehow indirectly influence the computer player's
  decisions in order to get them to the finish. Please help me
  brainstorm possible mechanics and modes around this idea."
- "Ooh, another possible game mode would be to prevent computer players
  from getting to the finish. The human player would then do some set of
  actions to impede computer player progress. There could also
  potentially be multiple computer players to obstruct/slow."
- "Also, I wonder if we could add a gameplay mode with some
  Lemmings-like concepts, where there is a collection of entities, and
  the player can place instructions around the maze, or queue
  instructions, or give specific units commands."
- "And/or something like the RoboRally board game, where the player
  queues up simple right/left/forward commands, and the unit then
  follows them"

## What exists

- Levi's round-2 note, 2026-10-13 (`K80_gameplay_additions.md` R.3.9,
  "The auto-solver inversion"): "The maze is being auto solved, and you
  are trying to stop it or show it or guide it". R.4.3 is the shared
  walker: a policy plus a clock that taps its own controller (a
  replanning shortest route, a strand follower, a fogged explorer, a
  song follower).
- Built in free play (K114, `docs/design/K114_walker.md`,
  `src/game/walker.ts`), on the Cut row (`cut`: off, on, lead, delay):
  - Lead the walker: it goes on along its strand through each junction,
    keeps right where its strand ends and turns back at an END. You cut
    runs, then Go locks the cuts. Par: the fewest cuts (3 stars at par,
    2 at par+1).
  - Delay it: it walks its shortest route while you cut, one cut or pass
    a turn. A cut may never disconnect it; the score is its walk's
    length.
  - Six calls wait on Levi (K706).
- Stop it ("Keep it in"): only the K707 balance probe
  (`.claude/probes/K114/walker/balance.md`); see Stop them below.

## Guide it: shape the maze, then Go

Deterministic, so daily-friendly, each with a computable par.
- Signposts: point one arm at a junction. The walker obeys every sign it
  meets and its habit elsewhere. Par: the fewest signs (Lead's search
  over (run, direction) states, a sign costing 1).
- Rethread: the knot's own signpost. Re-pair a junction's arms so its
  strand goes on another way, and the threads visibly re-route.
- Pick the walker: the only lever is which habit you send (keep right,
  keep left, on along the strand, toward the exit as the crow flies,
  least visited first).
- Two walkers, two habits: one set of cuts or signs brings both home.
- Fragile walker: its runs snap behind it, so one wrong turn strands it.

## Program it (Levi's board-game idea)

The walker runs a queue of commands, one spent at each junction it
reaches. Two command sets:
- Relative, as in the board game: F (on along its strand, the knot's own
  straight), L and R (the next arm to the left or right of F), U (back
  the way it came).
- Screen directions: the d-pad's up, down, left and right, each taking
  the run that press takes for the player (the K120 picker; K1170 makes
  the hints show it). This reuses the solve's own controls.

Ways to play it:
- One program, then Go. Score: the program's length. A repeat block
  ("repeat R F") makes it a programming puzzle, where a short loop solves
  a long maze. Par: the shortest program, by brute force (4^8 = 65,536
  programs of up to 8 commands, each a short simulation).
- Dealt rounds: each round the seed deals a hand (say 9 cards from F, F2,
  L, R, U), you fill 5 registers, and it runs them. A daily deals
  everyone the same cards. Score: rounds to the exit. Par: a search over
  the walker's (run, direction) state after each round (9P5 = 15,120
  orders a round; the states are few).
- Hazards that move between registers (the minotaur, the fire, cracking
  runs), so a register that was safe when you planned it may not be.

## A flock (Levi's Lemmings-like idea)

A stream of walkers leaves the start, one every few beats, each with a
habit. Score: how many reach the exit, against par (the most that can).
Levi's three kinds of instruction:
- Placed on the maze, for every walker that passes: a sign; a switch
  that flips after each walker; a counter that sends every third one the
  other way; a Rethread.
- Queued: each walker takes the next card of one queue as it leaves
  (walker 1 card 1, and so on), or each junction holds its own queue.
- Commands to one unit: tap a walker to give it a job. Blocker: it
  stands on its run and turns the others back. Bridge: it lies across a
  snapped or cut run so the others cross. Cutter: it cuts the run behind
  it. Scout: it lights its route through the fog.

The knot-native hook is fragile runs, every crossing counting, whoever
makes it (the start and exit tails exempt, as title runs are). Under
snap a run carries one walker before it breaks, under crack two. So the
flock has to split, and the most walkers that can get home is the number
of run-disjoint routes from start to exit (Menger's theorem: a max flow,
capacity 2 under crack). That gives every seed an exact par, and the
puzzle is to reach it with few instructions. Real time with a pause (the
genre's feel), or one step a beat for the daily.

## Stop them (Levi's: impede them, several walkers)

This is R.3.9's "stop it". The K707 probe played it on dailies 1-30:
each turn you cut one run outside a no-cut zone of r runs around the
exit, then the walker replans its shortest route and takes k runs; you
win when the exit is out of its reach.
- At k = 1 the cutter wins at least 28 of 30 at every r from 0 to 7.
- At k = 2 it nears even only with a wide zone: the cutter wins 26 of 30
  at r = 4, 18 at r = 5, 14 at r = 6, 12 at r = 7.
- So the two knobs probed are speed and the zone. Several walkers
  (Levi's) is a third: each walker is another front, and the cutter's
  fence must close before the first one crosses it. To probe: 2, 3 and 4
  walkers from separate starts at k = 1, the same table.

Impediments besides cuts:
- Snags: a snagged run takes two turns to cross.
- Lures: walkers that hear a pluck walk toward it for a while (the
  pluck's waves travel the threads).
- Fire: it burns along the threads; walkers avoid burning runs, and one
  caught in it is out.
- Loops: Rethread a junction so a strand follower circles a closed loop
  forever, trapped without a cut.
- The minotaur as yours: steer it to catch them before the exit (K80's
  chase, roles reversed).

Scoring: survive a number of turns; seal them all in with the fewest
cuts; or Delay it's score (the length walked), summed over the walkers.

### A tower defense (Levi, later the same day)

"Hmm, I also wonder if some sort of tower defense style game could be
fun with these mazes. Or some twist on that kind of game"

Stop them in real time: waves of walkers leave the start, each on its
shortest route to the exit (K707's walker); you place defenses beside
the threads, and each walker that gets through costs a life. Four
twists that only a knot gives:
1. Crossings are double sites. A defense on a crossing covers both
   threads, and a route that crosses itself passes that spot twice. The
   skill is reading the knot.
2. The threads move, the defenses don't. Drag the walkers' run into a
   defense's range, or bend it around one: you shape the path by moving
   it, not by walling it off. A tug moves a run but does not lengthen
   it, so what changes is which stretch of the route lies in range.
   Risks: the knot relaxes back when you let go (a pin, as in Bend,
   holds it), and drags compete with the taps that place defenses.
3. Plucks as the attack. A pluck sends a wave along its thread that
   stuns or pushes back the walkers it passes; in music mode, plucks on
   the beat hit harder. A proposal: today's maze-mode pluck is drawn
   only (`src/render/pluck_overlay.ts`), so the walkers would need a
   wave they can read.
4. Snap as the puzzle version. Under snap a run breaks once any walker
   crosses it, so at most max-flow walkers can ever get out, and that
   number is also the fewest cuts that seal the exit (A flock, Menger).
   Every seed gets an exact par, which suits the daily.

The coordinator's pick: twist 2, the one you play by moving the knot.

## Steer it live

Real time, its next run telegraphed (R 2.7).
- Switchman: flip junction switches while it walks; only your timing
  costs.
- Piper: pluck a thread and it turns toward the sound (R.4.3's song
  follower).
- Lantern: fog of war. It plans only over lit runs, and you light a few.
- Shepherd: you are the minotaur, it flees, and you herd it into the
  exit.
- Escort: the minotaur hunts the walker; your lures and cuts keep it
  alive (R.3.9's overlap 4.20).

## Only a knot can do these

- Bend: it takes the straightest arm at each junction, read from the live
  geometry. You tug threads and pin a few to change the angles. The
  riskiest: the knot relaxes back, and drags compete with taps.
- Tilt: it is a bead that rolls down the most downhill arm. Rotate the
  knot, or tilt the phone.

## For every mode

Show the walker's next run, and a ghost of its whole route that updates
as you edit.

## Recommendation (the coordinator's)

1. Decide K706's six calls and K707's knob: they finish Lead, Delay and
   Stop it, which already cover the guide and stop ideas. For K707, a
   Muse probe of 2-4 walkers would compare Levi's knob with speed 2 and
   a zone of 5.
2. Then prototype the fragile flock. It joins three things Levi asked
   for (many walkers, placed instructions, unit jobs) with the fragile
   runs already built, and max flow gives every seed an exact par.
3. Then Program it with screen directions, which reuses the solve's
   controls; dealt rounds make it a daily.
