# K688: healing cuts against monsters

Design only (2026-11-03, no code). Ledger: K688 (Next; Levi took
R.3.5, decision 6). This document decides what it can from the code
and lays the rest out for Levi, with a recommendation each, so a
later batch can build it in stages. It changes nothing in `src/`.

## Levi's words

From `docs/design/K80_gameplay_additions.md` R.3.5 ("Cutting threads
to avoid monsters") and round 2 decision 6:

> **Plays:** you carry scissors with a few charges. A cut run is
> closed to the minotaur too, so it must route around. **Trapdoor:**
> with the telegraph on (2.7), cut the run it has committed to while
> it is on it, and it falls (stunned, or back to its lair).

> **Healing or permanent (decision 6):** a healing cut closes again
> after a few moves (or the spider mends it), so you cannot strand
> yourself and the maze never degrades into a tree. Permanent cuts
> need 4.3's strand detector to refuse a cut that leaves you no
> route.

Levi took the healing form. The classic game's cut already shipped
without it (`docs/design/K114_cut.md`, "Not this stage" under
decision 6): permanent for the rest of the solve, classic only.
This document is about what changes when that same verb is allowed
with the minotaur or the fire, and heals.

## The recommendation in brief

1. **Heal after a few player moves** — accepted moves on the turn
   and beat clocks, and the same move count under real time — not
   after seconds, beats or fire steps (section 2). Start at **3
   moves**, tuned by the balance sim before it ships (section 8).
2. **Charges are how many cuts may be closed at once** in a monster
   or fire game, and a healed cut hands its charge back. The
   classic game's scissors stay uncharged (section 3).
3. **Trapdoor: stunned in place**, not back to the lair — one turn
   on the turn and beat clocks, a matching pause under real time
   (section 4). With the fire there is no trapdoor: a cut is a
   firebreak at most, and a burnt run cannot unburn (section 4.3).
4. Build it in the stages of section 7: controller heal first, then
   the turn clock, then real time, then the fire, then saved
   attempts, renderer and panel last in each stage's tail.

## 1. Today: the cut as it stands

Everything below names the file it was read in.

- **The verb** (`src/game/cut.ts`, whose header is the spec):
  `cuttable` allows any maze run but the start tail (`mazeStart ??
  start`), the exit tail and K115 title runs; a dead-end stub can
  be cut. `cutVerdict` returns `"refused"` when `cutStrands` —
  `runsToExit` with the cut runs and the candidate blocked — leaves
  no route over live runs from the head to the exit, so a game with
  cuts is never stranded. `carryChain` contracts a vertex that had
  three or more runs and has exactly two live ones now: a move
  arriving there carries on along its other live run. `FabricAction`
  is `{kind: "move", run}` (its first run) or `{kind: "cut", run}`
  (a `"reveal"` kind joined it in K138 s2). `CutMode` is
  `"off" | "on" | "lead" | "delay"` — the last two are the walker's
  modes on the same verb.
- **The controller** (`src/game/fabric_controller.ts`): it holds
  `cutMode`, `cuts` (a `Set<number>`), `actions` (one entry per
  player action) and `carry` (the rest of a contracted move).
  `cut(eid)` is `"invalid"` with the cut off, the solve over or a
  carry pending; only a `"cut"` verdict changes anything, adding
  the run to `cuts`, pushing the action and recomputing
  `distToExit` over the live runs (`distancesToExit`). A cut run is
  gone as a broken run is: `broken(eid)` is true for cut runs, so
  `choices()`, the pick and `planRoute` skip them.
  `replayActions(actions)` resets and replays each cut through
  `cut()` and each move through `tapEdge` plus its carry; Undo is
  that replay minus the last action, so a cut comes back whole.
  With the cut off, actions and taps are one to one.
- **Where the cut is off today**, in two places.
  `fabricRulesOf` (`src/ui/url_state.ts`) passes `cut` only for
  `gameMode === "classic"` and only when `clock !== "beat"` (K114
  call 7: the beat rider drops the cut and the walker), so never
  with a minotaur or the burn race. `FabricMazeController.setRules`
  then keeps it only while collapse, fragile runs and par are off,
  there is no fire and the spool is off (its `plain` test): one verb
  at a time, by construction. `.claude/rules/gameplay-mechanisms.md`
  ("The cut (K114)", "SCOPE") records the same: classic only, and
  `setRules` drops it while fragile, par or collapse is on.
- **The look** (`src/render/fabric_maze_renderer.ts`, `syncBroken`):
  a cut run is K137's gone thread — the whole run as one burnt span
  (`burnSpan(e, 0, e.length)`), gone whole at once, because a cut
  waits for the move to end so the dot is never on it. A fragile
  broken run draws the same spans, with the swept stretch gone
  while the breaking move is still travelling. The share title
  carries the count (`src/game/share_text.ts`: `" · ✂️ N"` once a
  run was cut, in the walker's modes `walkerTag` instead), and cuts
  count toward nothing else — not the stars, efficiency or par.
- **Saved attempts record taps, not actions**
  (`src/game/daily_attempt.ts`, `src/game/daily_store.ts`):
  `DailyAttempt` holds `taps` (every accepted tap's walk run),
  `path`, the `g/d/b` move log and the maze fingerprint; its header
  states the record's taps ARE the attempt because
  `FabricMazeController.replay(taps)` rebuilds the solve from them.
  A cut today is an action beside the taps (`actions`, above), so
  no saved attempt can hold one — which never bites today only
  because a cut game is never a daily. Section 2.3 is about what
  healing forces here.

## 2. The heal: a cut closes again after a few moves

R.3.5 leaves "a few moves" open, and the brief names four clocks
that could count them. They are not four names for one count: each
belongs to a different game shape, and only one of them keeps a
solve a pure function of its inputs on every shape.

### 2.1 The four clocks

- **The player's moves.** One heal step per accepted move — a tap
  that advances or backtracks (`taps` in
  `src/game/fabric_controller.ts`; a stroke under par, a turn under
  the turn minotaur). This is the clock fragile runs already keep:
  crossings are counted from the taps, so `replay(taps)` rebuilds
  the broken set exactly (`.claude/rules/gameplay-mechanisms.md`,
  "THE STATE IS A FUNCTION OF THE TAPS"). A heal counted the same
  way is decided at the tap that lands it, on every device, with
  no wall time in the record.
- **The beat rider's runs.** Under `clock=beat` the dot never
  stops: each run takes a whole number of beats
  (`src/game/beat_rider.ts`: `runBeats`, even timing one beat a run
  by default, length timing `beatsForRun(length, unit, cap)`), and
  the rider commits one move per junction arrival through the same
  move path as the turn clock. Counting heals in beats would make
  one cut heal faster on a long run's beats than on short ones
  under length timing, and would need the beat count — a second
  input beside the moves — in every replay. Counting the rider's
  committed moves instead gives the beat game the same rule as the
  turn game, because the rider's moves ARE moves: `advance` hands
  each departure to the commit callback, and the controller, the
  minotaur's turn and the fire's step run once per committed move.
- **Real time's seconds.** The real-time chase and fire run on
  fixed-step clocks (`src/game/minotaur.ts`: `CHASE_HZ` 120, at
  most 30 ticks an advance; `src/game/fire_clock.ts`: the same
  step, `L = ticks × FIRE_V_REF / CHASE_HZ`). A heal in seconds is
  a heal in ticks, and ticks are exact — but a saved attempt holds
  no ticks, and real-time play already accepts that its outcome
  "turns on seconds, animation and input timing that a tap list
  does not hold" (the K144 design's replay limit, restated for the
  fire in `.claude/rules/gameplay-fire.md`: replay leaves each tap
  the moment the last arrives, with no thinking time). A heal that
  lands while the player stands thinking is also a different game:
  the cut reopens under a player who did nothing, which is a timer,
  not a move budget.
- **The fire's steps.** The fire's clock `L` is walked distance on
  the turn clock and fixed-step time under real time
  (`src/game/fire.ts` header). Counting heals in `L` ties the
  scissors to the threat they are meant to hold back: the faster
  the fire, the faster your cuts reopen. It also gives a maze with
  no fire no clock at all. As a unit it is the weakest of the four.

**Recommendation: count heals in player moves, on every clock.**
One rule — "a cut closes again after N of your moves" — reads the
same on the turn clock, under the beat rider (whose moves are
committed moves) and under real time (where moves still happen and
can be counted without putting seconds in the attempt record). The
alternatives each buy a second clock for one shape and a replay
hazard for all of them. What N should be is a balance question,
not a clock question: see section 8. The starting value to measure
is **3 moves** — long enough that a cut in front of the minotaur
buys a junction or two of rerouting, short enough that a player
cannot wall off the exit corner for a whole hunt.

A cut made while a contracted move is still carrying can never
exist today (`cut()` is `"invalid"` with a carry pending), and a
heal must keep that shape: heals are judged after a move completes
(its whole carry), never mid-chain, because `carryChain` was
computed under the cuts as they stood at the move's first run. A
heal that landed mid-carry would leave the chain walking onto a
run the new cut set no longer contracts through.

### 2.2 Undo and replay, for a heal that has not landed yet

Today a cut is undone by replaying the actions minus the last
(`replayActions`), and the run comes back whole: there is no
partial state to restore. Healing adds one piece of per-cut state
— how many moves it has left — and that state must be a function
of the action list, or Undo stops being exact:

- Each cut action carries the move count at which it was made (or,
  equivalently, the heal is recomputed during replay: a cut heals
  when the replay's move count passes its count plus N). Replay
  then rebuilds open and closed cuts together, and Undo past a cut
  removes it; Undo that stops short of a heal that already landed
  in the undone tail never sees it. Both fall out of the same
  replay, exactly as broken runs fall out of `replay(taps)` today.
- A heal that has NOT landed yet when the player undoes is the
  delicate case: undoing a move moves the move count backwards.
  The rule must be stated now, not discovered in the build —
  **a heal is a function of the moves that stand, so undoing a
  move un-counts it, and a cut that was one move from healing is
  one move from healing again.** The alternative (heals, once
  landed, are permanent even under Undo) makes the cut set depend
  on the path taken through Undo, which no replay from the
  surviving actions can rebuild. The first rule keeps one
  invariant: the solve is its action list.
- The renderer needs no new state for this: `syncBroken` already
  re-derives its spans from `cutRuns()` every time it runs, so a
  healed run simply stops being listed and draws whole again. A
  heal needs a visible tell, though — a run that silently
  reappears behind the player reads as a bug. That is a renderer
  stage item (section 7), not a controller question: the natural
  shape is the reverse of the gone look, a brief fray or fade-in
  on the healing run, decided with the build's stills.

### 2.3 What a saved attempt must record

A saved attempt records taps only (section 1), and a daily today
never has cuts, so nothing is owed yet. The moment cuts play with
a clock that CAN be a daily — the turn minotaur is the candidate,
since a minotaur's maze is never a daily today for other reasons,
but the attempt machinery is shared — the record has to hold the
cuts or refuse the restore. The honest options:

- **Store the actions beside the taps.** `DailyAttempt` gains the
  cut actions (run ids, in order), and `restoreAttempt`
  (`src/game/daily_attempt.ts`) replays them interleaved with the
  taps through `replayActions` instead of `replay`. This is a
  store shape change, so it follows the store's own version rule
  (`DAILY_STORE_VERSION` in `src/game/daily_store.ts`: a newer
  schema is never overwritten by an older build). The fingerprint
  already refuses a restore onto a moved maze; the actions need
  the same refusal when a cut names a run the maze no longer has,
  which `replayActions`' failure (reset, `false`) already is.
- **Keep attempts tap-only and refuse cut games.** A solve with
  cuts simply saves no resumable attempt (finishes still record:
  a result holds figures and a move log, no walk). This is today's
  real-time answer in miniature — no undo there either — and it is
  defensible for a first build. Its cost: a refresh mid-solve
  loses a cut game the way a real-time game already loses its
  chase state, which the player has been trained to accept only
  in real time.

**Recommendation: tap-only first, actions in the attempt as its
own stage** (stage 5, section 7). Healing makes the first option
eventually necessary — a healed cut's remaining moves are exactly
the state a tap-only record cannot approximate — but no stage
before it needs a resumable cut game, and bundling a store version
bump into the controller stage would put the riskiest change in
the least testable place. Until that stage, a saved attempt in a
cut game is refused or never written, and the report of the stage
that lifts it says which.

## 3. The scissors' charges

R.3.5 gives the player "scissors with a few charges" and warns, in
its Against, that "with charges, players hoard them". The game
already has two stocks to copy the shape from, both on the turn
clock and both refilled by a level restart while `main.ts` keeps
the count:

- **Lures** (`src/game/lures.ts`): the `lures` param is a stock of
  1..`LURES_MAX` (5) for an attempt. The lure button arms the next
  tap, which plucks a run and uses one lure, heard or not. A lure
  is free in time: no turn passes.
- **Snares** (`src/game/snares.ts`): the `snares` param is a stock
  of 1..`SNARES_MAX` (3). The snare button arms the next tap, which
  lays a snare on a run touching the head's junction, also free in
  time; a sprung snare holds a monster for `SNARE_HOLD` turns
  (default 3, the `snareHold` param) and is then spent.

A cut differs from both in one way that decides the charge rule:
it is the only one of the three whose effect ends by itself. A
lure is spent when it sounds; a snare is spent when its hold runs
out. A healing cut's effect ends when it heals, so "a charge" can
mean two different budgets:

- **A stock of cuts for the whole solve** (the lures' and snares'
  shape, literally): each cut spends one, healed or not, and the
  scissors are empty when it is gone. This prices cutting as a
  resource to husband — the hoarding R.3.5 warns against, at its
  strongest, because a cut spent early is gone for the endgame
  hunt where it matters most.
- **A stock of cuts closed at once**: each cut spends one, and a
  heal (or an Undo of the cut) hands it back. The budget is how
  much of the maze may be closed at any moment, not how often you
  may close it. Hoarding buys nothing — an unspent charge blocks
  nothing — and the interesting choice is WHERE the few closed
  runs are, which is the choice R.3.5 is about.

**Recommendation: charges count cuts closed at once, and a healed
run hands its charge back.** It is the only reading under which
healing and charges reinforce each other instead of fighting: the
heal is what makes the scissors reusable, and the charge cap is
what stops a player from closing every mouth of a pocket at once.
Undo of a cut hands its charge back by the same rule (the cut no
longer stands). A refused cut spends nothing, as today — a refusal
changes nothing and logs nothing (`src/game/cut.ts`: the verdict
is computed before any state moves).

**The classic game's scissors survive beside it, uncharged.**
Today's `cut=on` has no stock at all, and its games have no monster
to route around: the puzzle there is the maze itself (contraction,
the refused strand), and a cap would only ration it. So the charge
is a property of the monster and fire games, not of the verb: the
same `cut()` verdict, with a charges check beside it that only
those games arm. In panel terms that is one stock row shown with
the minotaur and fire rows and hidden in the classic game — the
shape the panel already uses for the burn race's speed and delay,
which hide while the fire is off (`.claude/rules/gameplay-fire.md`,
PARAMS). The starting cap to measure is the snares' **3**: three
runs closed at once is a junction's worth of rerouting, and the
balance sim (section 8) moves it if 3 reads as generous or tight.

One interaction to state now: the walker's `lead` and `delay`
modes spend cuts as their whole verb (the player's only move is a
cut). Charges must not arm there — a walker game rationed to three
standing cuts is a different, much harder puzzle, and neither mode
plays with a monster today. They keep their uncharged scissors
exactly as the classic game does.

## 4. The trapdoor

The trapdoor is R.3.5's sharpest sentence: cut the run the
minotaur has committed to while it stands on it, and it falls.
What "falls" means is undecided, and the answer differs by clock,
because "the run it stands on" is a different object in each.

### 4.1 The turn clock: its committed move

The turn minotaur (`src/game/minotaur_turns.ts`) commits its next
move at the end of your previous one, from where you stood, and
the game shows it (the telegraph). Its state is a vertex (`v`,
mid-run a `Spot` whose `v` is the vertex ahead), and its graph is a
`TurnGraph` whose hop matrix the blocked set rebuilds
(`withBlocked`, section 5). To cut its committed run is to cut a
run of that committed path (or the run its spot is on, in the
by-length mode) after it has decided and before it walks.

- **Stunned in place:** it loses the turn it had committed — it
  stands where it is (at its vertex, or at the near end of the cut
  run, the way a snared monster's path is cut at the run's near
  end, `src/game/snares.ts`: `snareCut`) — and play continues. The
  telegraph re-commits from the stunned position, so the player
  sees what the stun bought. Precedent: a snare already holds a
  monster standing for `SNARE_HOLD` turns; a trapdoor stun is that
  hold, earned by timing instead of by laying a trap ahead.
- **Back to its lair:** the cut teleports it to the exit END, as a
  catch sends it back (`src/game/minotaur_turns.ts`: a catch puts
  you at the start and it in its lair, `lifeTurn` 0). This is the
  strongest outcome on the menu — stronger than a snare, stronger
  than the sword's banish in effect — and it spends the maze's
  geography: however deep it had hunted, it starts over. Used at
  the exit corner it un-guards the exit for free.

**Recommendation: stunned in place, for one of its turns.** It
keeps the trapdoor inside the vocabulary the game already teaches
(a monster standing still because something holds it there), it
cannot be farmed at the exit the way a lair reset can, and its
strength scales with the heal: the run reopens in N moves, so the
stun is a pause inside a closing window, not an exile. How long
beyond one turn — whether the healed run's remaining moves should
also be its stun — is Levi's question (Questions), with a
recommendation of one turn: the cut itself already blocks the
reroute for its whole closed life, so a longer stun double-counts
the same window.

Two turn-clock details the build must honour, both visible in the
code today: it never steps onto the start or the exit (the
sanctuary and the lair are END vertices, not runs, so neither can
be the cut run — the trapdoor can never strand it on a tail); and
a mid-run spot on a broken run today finishes the run it was on
(`spotEnds` in `src/game/minotaur_turns.ts`: on a blocked run only
the end ahead leads on). The trapdoor must decide whether it is
that case (it walks off the cut run, then stands) or the snare
case (it stops at the near end). Recommendation: the snare case —
it stops where the cut found it — because "it falls" should read
as stopped by the cut, not as finishing a run that is no longer
there. The build's probe decides it by stills, not by this text.

### 4.2 Real time: a spot on a run

The real-time chase (`src/game/minotaur.ts`) has no committed
move to cut: the minotaur is a `Spot` on a run, re-planning its
hunt every tick, and its pathing already skips blocked runs
(`ChaseGraph.blocked`, section 5) while contact still measures the
whole graph. Cutting the run under it mid-crossing has one honest
reading: it stops at the end it is heading to (the `awaits` case
the chase already handles for a run that broke under the player:
it waits at that vertex), is stunned there for the pause below,
and re-plans around the closed run. Anything sharper — stopping
it mid-run in mid-air — has no spot to stand on in the model.

**Recommendation: the same stun, counted in seconds there** —
it waits at the vertex it reaches for the roaming junction stop's
own scale (the `stopMin..stopMax` pause it already takes at
junctions, half while hunting), then plays on. No new duration
constant until the balance sim says the junction stop's scale is
wrong for a stun. Back to the lair is rejected here for the turn
clock's reason, and more strongly: in real time a lair reset is a
full escape from any hunt, bought with one timed tap.

Under the beat rider the trapdoor is the turn clock's: the rider
commits moves through the turn path, the minotaur's turn and
telegraph along with them, so "its committed run" exists there
unchanged. The only beat-specific question is whether a cut can be
MADE between beats at all — the rider never stops, so the scissors
tap must queue the way its move taps queue (`src/game/beat_rider.ts`:
a tap on an arm of the junction ahead queues, the last before the
junction wins). Recommendation: a scissors tap arms, and the cut
lands on the next junction arrival, judged under the cuts as they
stand then. A cut that must be instant has no place in a game
whose every other verb lands on a beat.

### 4.3 With the fire: no trapdoor, and no unburning

The fire is not a body on a run; it is a front along every run at
once (`src/game/fire.ts`: a run burns from both ends, `runBurnAt`;
`T(v) = h + d(v)/r` from the entrance). "Cut the run it stands on"
has no referent. The two things a cut could mean against the fire:

- **A firebreak.** Cutting an unburnt run removes it from the
  graph the fire spreads over — but only if the fire's distances
  are recomputed over the standing runs, as `refire`
  (`src/game/fire.ts`) already recomputes them when a fragile run
  breaks: every vertex the fire reached by the breaking clock
  keeps its time, the rest burn on over unbroken runs. A cut would
  ride that same machinery (section 5). Whether it HOLDS the burn
  back depends entirely on the maze: a cut on the fire's only
  route to a region delays it by the detour; a cut beside three
  loops delays it by nothing. It is a delay, never a wall, unless
  it disconnects the region outright — and a cut that disconnects
  the exit region disconnects the player's route too, which the
  refusal already forbids from the head's side.
- **Unburning.** None. A burnt run is gone (`runBurnAt`'s `"burnt"`
  state; the controller refuses its tap and `choices()` drops it),
  and a cut acts on a live run — `cutVerdict` is `"invalid"` for a
  run already cut, and a burnt run is not cuttable in any useful
  sense: cutting it would change nothing the fire has not already
  taken, and healing it would have to unburn it, which no state in
  the fire model can express (`refire` only ever keeps or grows a
  vertex's distance; a time never shrinks back past a clock that
  has passed).

**Recommendation: with the fire, a cut is a firebreak and nothing
more** — it delays the front by whatever detour the recomputed
distances give it, it never unburns, and a cut on a burning run
(whose unburnt stretch is still live thread) cuts that stretch and
no more. If the balance work (section 8) finds the delay too weak
to matter, the honest sequel is R.5.2's Firebreak as its own mode
(a spark, a spread, k cuts to save the exit), not a stronger cut
inside the burn race. The brief's question — whether a cut can
hold a burn back at all — answers itself from the model: only by
lengthening the fire's road, and only until it heals.

## 5. Who a healed cut blocks while it is closed

A closed cut is a gone run. The question is gone for WHOM, and the
code already answers it three times for broken runs — the K137-b
machinery a cut should join, not duplicate. Healing adds one
obligation to each: when the run heals, it must come back for
everyone in the same move.

- **The player.** Exactly as the classic cut refuses it today: a
  cut run is `broken(eid)` in `src/game/fabric_controller.ts`, so
  `choices()` leaves it out, a tap on it is a `"reject"`, the pick
  (`targetAt`, via `syncBroken`'s spans) skips it and `planRoute`
  refuses it as a target and routes around it
  (`.claude/rules/gameplay-mechanisms.md`, "THE GONE THREAD").
  Contraction is the player's too: a vertex left with two live
  runs stops being a decision for the player's move, whoever cut
  the third run. Nothing here changes under monsters; the heal
  simply returns the run to all of these at once.
- **The minotaur, on both clocks.** Broken runs already block it,
  and the blocked sets are built for exactly this reuse:
  - Real time: `ChaseGraph.blocked` (`src/game/minotaur.ts`), a
    `Uint8Array` set by `block(eid)` when a run breaks, read by
    the restricted distances (`from(src, true)` skips barred and
    blocked runs), by `roamEdgeFrom` and `huntEdgeFrom` (both skip
    `g.blocked[eid]`), and cleared caches on every block. Contact
    still measures the whole graph, so a cut run can still be
    crossed by a catch's geometry even though no path plans over
    it — the right shape for a cut too: it blocks routeing, not
    physics.
  - Turns: `TurnGraph.withBlocked(blocked)` (`src/game/minotaur_turns.ts`)
    builds a fresh hop matrix over the unbroken runs, with
    `UNREACH` across a cut; `TurnMinotaur` holds its own crossings
    count so the blocked set replays from the inputs alone, and
    `moves()` never steps onto a blocked run. A cut set is one
    more input to that rebuild: the graph is replaced, never
    mutated, when a run cuts — and, the new part, when one heals.
  Healing is why the cut cannot simply BE a broken run in these
  graphs: broken only accumulates (`block` returns false when
  already blocked; the turn graph's blocked set is rebuilt from
  crossings that never decrease). A heal needs the reverse edge —
  rebuild the graph (or the hop matrix) from the cut set as it
  stands after the move, cuts and heals alike. The cost is the
  rebuild the turn graph already pays per break, now also per
  heal; section 8 measures whether that matters at heal rates.
- **The fire.** The fire's view of a gone run is its distance
  table: `buildFire` computes `d(v)` from the entrance over every
  run, and `refire` recomputes the unreached rest over unbroken
  runs when one breaks, keeping every arrival time at or before
  the breaking clock (`.claude/rules/gameplay-fire.md`, "BROKEN
  RUNS STOP THE FIRE"). A closed cut must leave the fire the same
  way a break does — the run conducts nothing while closed — or
  the fire would burn through a run the player cannot walk, which
  no player can read. And a heal must give it back the same way:
  a second `refire`-shaped recompute at the heal's clock, after
  which the run conducts again from the vertices the fire has
  reached by then. The asymmetry to state plainly: the fire's
  clock never goes back, so a run that heals AHEAD of the front
  conducts from then on, and a run that heals BEHIND it is already
  burnt and stays burnt (section 4.3). A cut therefore buys fire
  time only while closed, and the amount is the detour, not the
  heal count directly.

One more who: **nobody else.** The sword, the sleepers and
followers, the lures and snares all read the same graphs (a lure
is heard over the hop matrix, "so a broken run's cut stops the
sound", `src/game/lures.ts`) — a cut that blocks the minotaur's
graphs blocks their hearing and holding consistently, with no
per-tool rule. If a later probe finds one of them walking a cut
run, that is a bug in the sharing, not a design choice to relist.

## 6. Lifting the classic-only rule

The cut is classic-only in two places (section 1), and each guard
there keeps a different peace. Lifting the rule means saying, for
each, what replaces it:

- **`fabricRulesOf`'s classic gate** (`src/ui/url_state.ts`):
  passing `cut` for the minotaur and burn-race game modes (and for
  `clock=beat`, which call 7 excluded with the walker) is the
  whole lift at this layer. What it exposes: the scissors UI is
  wired for the classic game's assumptions (armed tap anywhere,
  `pendingCut` landing when a move ends), and the beat rider's
  queue (section 4.2) plus real time's mid-move taps each need
  their landing rule stated — per-clock work, in the stages.
- **`setRules`' `plain` test** (`src/game/fabric_controller.ts`):
  cut only while fragile, par and collapse are off, there is no
  fire and the spool is off. Each exclusion is a real collision,
  and healing makes two of them sharper, not duller:
  - **Fragile runs.** Two kinds of gone run in one maze: a run can
    be crossed toward breaking while also being the run a player
    wants to cut, and `broken(eid)` already conflates them for
    choices and the pick. The state can coexist (crossings counted
    from taps, cuts from actions; a cut fragile run that heals
    returns with its crossings as they stood), but the READING
    cannot: the fray look (cracked = crossed once) on a run that
    is also about to heal gives one thread two countdowns. And the
    strand rule doubles: fragile strands you when no unbroken
    route remains, the cut refuses to strand you at all — with
    both on, a cut's refusal must read the unbroken-and-uncut
    graph, which `cutStrands` does only if its blocked set is the
    union. Recommendation: keep them exclusive in the first build.
    Nothing in R.3.5 asks for fragile cuts, and the union rule is
    a stage of its own if Levi ever wants it.
  - **Par.** Par counts runs and prices strokes (`src/game/par.ts`
    via the controller: `parFor`, strict's runs-left from the head
    over unbroken runs). A cut changes the fewest-runs landscape
    under the player, and a HEAL changes it back mid-solve: strict
    par judged against a maze that reopens is a loss that can
    un-happen, which the sticky `parLost` cannot express. Strokes
    par survives (it only reads at the finish), strict does not.
    Recommendation: cuts with par off, or strokes only — Levi's
    call (Questions), defaulting to off.
  - **Collapse.** Every maze run breaks after one crossing, END
    runs included; a cut is nearly meaningless (the maze deletes
    itself behind you) and contraction has nothing stable to read.
    Keep exclusive, permanently: this one is not a staging
    decision.
  - **The fire** is the exception that proves the lift: section 4.3
    gives the cut a fire meaning (a firebreak over `refire`'s
    machinery), so "no fire" is the one `plain` condition the
    design lifts on purpose, in its own stage, with the burnt-run
    rules stated there.
  - **The spool and the K138 rules** (ice, the color rule,
    turnstiles, hidden runs, one-way runs, locks) compose through
    the rule kit's searches, whose distances a cut set would have
    to enter as one more blocked set. Nothing in R.3.5 asks for
    them either. Keep exclusive until a stage owns the kit's
    composition; the walker modes' exclusion of hints is the
    precedent (a verb that walks for you does not also hint).
- **The stranding a heal makes possible.** Today's refusal
  (`cutStrands`: no cut that leaves no live route from the head to
  the exit) is what makes a cut game unstrandable, and healing
  tempts a relaxation — let a cut strand you briefly, since it
  reopens. Do not take it. A heal counted in moves deadlocks
  exactly there: stranded with no legal move, the player cannot
  make the moves the heal is counted in, and the cut never heals.
  (A heal counted in seconds would escape the deadlock and import
  the timer instead — section 2.1's trade, at its worst.) The
  refusal therefore stays at full strength in every game: **a cut
  must leave a live route from the head to the exit over the runs
  that stand, judged at the cut, with the heal giving no credit.**
  The mirror case — a maze the heal itself strands — cannot
  happen for the player (healing only adds a route), but it can
  for a contracted move in flight, which is why section 2.1 judges
  heals only between moves; and a heal under the MINOTAUR (its
  committed run reopening as it re-plans) is ordinary play, the
  window simply closing.

## 7. Build plan, in stages

Each stage is one later run: it lands on master by itself, leaves
the game playable, and names its files. No stage changes physics,
junctions, the cursive, or the thread ribbons' shader text.

1. **The controller's heal** (`src/game/cut.ts`,
   `src/game/fabric_controller.ts`, `test/game/cut.test.ts`):
   per-cut move counts, heals judged between moves, `replayActions`
   rebuilding them, Undo un-counting (section 2.2). Classic game
   only still; charges off. The existing cut tests pass unchanged
   with healing off (an off default keeps every pin).
2. **The turn clock** (`src/game/minotaur_turns.ts`, the fabric
   rules in `src/ui/url_state.ts`, the panel's minotaur rows):
   the classic gate lifts for the turn minotaur, the cut set feeds
   `TurnGraph.withBlocked` on cut and heal, the trapdoor stun
   (section 4.1), charges arm (section 3). Decided here, measured
   in section 8 before any default is proposed to Levi.
3. **Real time** (`src/game/minotaur.ts`, `main.ts`'s chase
   wiring): the cut set feeds `ChaseGraph.blocked` on cut and
   heal (a cache clear each, as a break does), the trapdoor as a
   junction-stop-scaled wait (section 4.2), the scissors tap
   landing under real time's queued-tap rule. The beat rider's
   queued cut (section 4.2) lands with whichever of stages 2–3
   first opens `clock=beat` to the cut.
4. **The fire** (`src/game/fire.ts`, `src/game/fabric_controller.ts`):
   a cut and a heal each refire the distances at their clock
   (section 5), the burning-run cut (section 4.3), no trapdoor.
   Turn clock first; real-time fire (`src/game/fire_clock.ts`
   feeds the same `L`) after, if stage 3's shape allows.
5. **Saved attempts** (`src/game/daily_attempt.ts`,
   `src/game/daily_store.ts`, their tests): the actions beside the
   taps, the store version following its own rule, restore through
   `replayActions` (section 2.3). Only now can a cut game resume.
6. **The look and the count** (`src/render/fabric_maze_renderer.ts`,
   `src/ui/tweakpane_panel.ts`, `src/game/share_text.ts`): the
   heal's visible tell (section 2.2), the charges row and the cuts
   count where monster games show their tools, the share tag
   reading healed cuts as cuts made (today's `" · ✂️ N"` counts
   `cutCount`; whether a healed cut still counts toward it is the
   stage's one-line call — recommendation: it counts, as a snapped
   run counts after Undo restores it: the share records what the
   player did, not what stands). Each earlier stage ships with the
   gone-thread look as it stands; this stage is polish, last
   because it decides nothing the others wait on.

## 8. What the build must measure before it tunes

The walker was balanced before it was tuned the same way: a
balance probe over scripted players (`.claude/probes/K114/walker/balance.ts`,
the Keep-it-in probe; `.claude/rules/gameplay-mechanisms.md`:
dailies 1–30, par and catch tables) set its numbers after the verb
existed. Healing cuts need the same round, over catches, before
any of this document's starting numbers (3 moves, 3 charges, one
turn) become defaults:

- **The sim:** the K80 harness shapes — scripted players (the
  route follower, the attentive explorer, the 80%-attention
  explorer, the fog player) over a daily-sized set of mazes, with
  a cutting player policy beside them (cut the minotaur's
  committed run when it hunts within a stated range; cut toward
  the exit corner when it guards) — at heal counts 2, 3, 4 and 6,
  charges 2, 3 and unlimited, stun one turn and two. Read: catches
  a game against the no-cut baseline of the same players, trapdoor
  uses a game, and how often a charge cap actually binds.
- **The fire variant:** closest-call margins (`fireClosest`) with
  and without firebreak cuts at the same heal counts — whether the
  delay of section 4.3 is a tool or a gesture.
- **The cost check:** the turn graph's rebuild per heal (section 5)
  at the sim's heal rate, so a heal-heavy game does not pay a hop
  matrix per move unnoticed. If it binds, the stage's answer is
  the chase's shape (a blocked array plus a cache clear), not a
  slower heal.

Numbers first, then defaults: any stage that ships a player-facing
default before this table exists ships it behind the cut's own
off-by-default switch, as the classic cut did.

## Questions for Levi

Only Levi can answer these. Each carries the document's
recommendation; none blocks the controller stage.

1. **The heal count.** A cut closes again after how many of your
   moves — 3 (recommended, to measure), fewer (a cut is a blink),
   or more (a cut is a wall you rebuild)? And is counting your
   moves right, or should standing and thinking let a cut heal
   too (the timer of section 2.1)?
2. **The charges.** At most 3 cuts closed at once in a monster or
   fire game, handed back as they heal (recommended) — or a stock
   for the whole hunt, spent for good? Should the classic game's
   scissors stay unlimited either way (recommended: yes)?
3. **The trapdoor.** Cutting the run the minotaur has committed to
   stuns it where it stands for one turn (recommended) — or sends
   it back to its lair at the exit? And if it stuns, one turn, or
   until the cut itself heals?
4. **Par beside cuts.** Cuts stay off while strict par is on
   (recommended), or may they play together with the loss judged
   against the maze as it stands at each move?
5. **The fire.** Is a firebreak that only delays the front worth
   the scissors in a burn race (recommended: build it, measure
   it), or should cutting the fire wait for Firebreak as its own
   mode?

## Handoff

- **Decided here (from the code, not open):** heals count player
  moves and are judged between moves, never mid-carry; a heal is
  a function of the moves that stand, so Undo un-counts it; a
  closed cut blocks the player, both minotaur graphs and the
  fire's distances through the K137-b blocked machinery, and a
  heal returns it to all of them in the same move; a burnt run
  cannot unburn and no cut holds the fire except by lengthening
  its road; the strand refusal stays at full strength with no
  credit for a coming heal; collapse never composes with cuts.
- **Levi's (Questions, with recommendations):** the heal count
  (3 moves), charges as cuts closed at once (3, handed back on
  heal; classic uncharged), the trapdoor as a one-turn stun in
  place over a lair reset, strict par's exclusion, and the fire's
  firebreak.
- **Stages:** controller heal, turn clock, real time, fire,
  saved attempts, look and count (section 7), each one run, each
  leaving the game playable, the balance sim of section 8 before
  any player-facing default. No `src/` file changed by this
  document; `npm test` proves it.

