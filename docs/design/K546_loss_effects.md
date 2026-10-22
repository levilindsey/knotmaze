# K546: loss effects — meet first, then make it hurt

Design doc. No build yet: Levi's look calls in "Questions" gate every
stage. Ledger item: K546 (2026-10-16), reproduced in the ledger as:

> a catch ends early today - animate the player and the minotaur/fire all
> the way to their meeting point first (contact t is computed in
> by-length mode; turn and realtime catches leave a visual gap), then a
> gratuitous contact effect at the meeting point plus a whole-screen
> loss effect akin to the win confetti. Levi's seeds: an explosion; a
> flare-up and burn-away; the player indicator ripped in half and
> falling over. Base to build on: K80 3b's catch feedback (dcdfaf4) and
> K270's fix; the fire side is K114. A design doc with options and a
> recommendation comes before any build.

Base it builds on: K80 turns stage 3b's catch feedback (dcdfaf4; read
`docs/design/K80_gameplay_additions.md` sections 2.7 (line 482), 2.8
(501) and 2.10 (547), and `docs/design/K80_turns_stage3.md` lines 84-90
for its 3a/3b split), K270's stale-frame fix
(`src/main.ts:1728-1771`), and the fire side, K114
(`docs/design/K114_burn.md`, `docs/design/K114_stage2.md`).
K525's look call is still Levi's (ledger): the fold-in for this item is
that at phone fit zoom the telegraph's roam 0.45 alpha is effectively
invisible and "the catch ring had mostly faded by the shot" — the
contact effect inherits the phone-legibility burden; the telegraph
alpha stays K525's own call (Questions Q8).

## The one rule

**The game state does not change.** A catch is still counted at the tap
(turn) or tick (real time) that makes it, every pin holds
(`TURN_GAMES`, `LENGTH_GAMES`, `K80_DIGESTS`, the byte_identity
golden, the K87 pin, the golden dailies), and no replay
(`replayChase`, `replay(taps)`) can observe a delay. Only the visible
sequence changes: the indicators finish travelling to the meeting
point, the contact effect plays there, and then today's ending
(respawn, or the Burnt banner, or a `minoRestart` level restart) lands.
The by-length turn catch already works exactly this way and is the
pattern to generalize: "the game state itself has already respawned,
exactly as a runs catch" (`src/game/minotaur_turns.ts:926-932`), with
the page deferring the visible catch (`pendingTurnCatch`,
`src/main.ts:361-363`) until the move animation reaches the contact
fraction.

## Today (checked on c391e19)

Where a catch is decided, and where the screen cuts the journey short:

| Catch | Decision | The gap today |
|---|---|---|
| Turn, by length (`minoByLength`) | continuous: `contactByLength` / `lengthContactFraction`, `src/game/minotaur_turns.ts:841-852`, `:784-839` | none — the solved case (below) |
| Turn, by runs | discrete: `contact(p, e, p2, from, path)`, `src/game/minotaur_turns.ts:857-867` | state respawns in `turn()` (`:1014-1030`); the page fires `turnCaught()` on the same tap (`src/main.ts:1842-1844`) |
| Real time | `contactDistance() <= catchDist` (1 unit), `src/game/minotaur.ts:464-471` | both spots teleport on the same tick (`respawn()`, `src/game/minotaur.ts:512-523`); up to 1 lattice unit apart, never shown together; no burst, no pluck, no vibrate at all (`src/main.ts:1649-1668`) |
| Fire, turn clock | `fireTrapped()` at the arrival, `src/game/fire.ts:107-110` via `src/game/fabric_controller.ts:359` | the Burnt banner already waits for the dot (`pendingLoss`, `src/main.ts:2344-2347`; shown at `src/app/frame_loop.ts:580-583`), but the flame fronts sit wherever `runBurnAt` leaves them mid-run — the fire never reaches the dot |
| Fire, real-time clock | standing loss: `fireTime(head) <= L`, `src/game/fabric_controller.ts:273-282` | the banner is near-instant (the dot is standing) and the nearest fronts are still a run's-end away in general |

The solved case, to copy: turn by-length. `lengthContactFraction`
returns the earliest move fraction t at the catch distance
(`src/game/minotaur_turns.ts:784-839`), `lastContact` freezes both spots
there (`:1131-1139`), the route is kept readable for the animation
(`:1146-1149`), and `main.ts` holds `pendingTurnCatch` until the move
(or a wait's clock) reaches t, then calls `turnCaught(wait, true)`,
which lands the burst on the contact spot (`src/main.ts:1738-1777`).
Input during the wait rides the move's existing gates
(`src/main.ts:1846-1853`).

The existing feedback parts:

- The catch burst: `CATCH_BURST_S` 0.45 s, ring 1 → 3.2 head radii,
  ease-out, in pure form at `src/game/mino_feedback.ts:83-111`
  (`catchBurstAt`), drawn by
  `src/render/fabric_maze_renderer.ts:1707-1743` (`showCatchBurst` /
  `tickCatchFx`), its site read before the respawn moves anyone (the
  K270 fix, `src/main.ts:1725-1786`). Reduced motion: one static ring
  at 1.6 radii fading over the same 0.45 s
  (`src/game/mino_feedback.ts:102-104`). K525: by the contact-sheet
  shot the ring "had mostly faded."
- Sound and touch: the caught run's dull pluck, an octave down with a
  dissonant neighbour (`catchNotes`, `src/game/mino_feedback.ts:155-160`;
  played at `src/main.ts:1774-1782`), and `navigator.vibrate(60)` on
  turn catches only, suppressed under reduced motion
  (`src/main.ts:1780-1782`). The synth is pluck-only:
  `pluck(freq, strength, when?, auto, pan)` (`src/audio/knot_synth.ts:641`).
- Endings: a catch is a toast ("Caught! Back to the entrance.") and an
  instant respawn (`src/main.ts:1545-1549`), or a level restart under
  `minoRestart` (`src/main.ts:1752-1756`); a fire loss gets the Burnt
  banner (`LossBanner`, `src/ui/maze_hud.ts:517-562`; `showFireLoss`,
  `src/main.ts:1453-1464`). No catch has a banner today.
- The win effect to mirror: `src/render/confetti_model.ts` (pure:
  `confettiPlan`, the rain and spray pools, `ConfettiSim`) +
  `src/render/confetti.ts` (two `ParticleContainer`s, rain in screen
  space, spray in world space following the root), thrown with the win
  banner at `src/main.ts:1470-1501`. Randomness is `Math.random` —
  render-only, so no replay sees it (`src/render/confetti_model.ts:424-433`).
  The frame loop ticks it in every ticker branch
  (`src/app/frame_loop.ts:389-391`) and polls `confetti.active` for the
  OVERLAY flag (`src/app/frame_loop.ts:276`); a burst that never ends
  would keep the loop awake, so every piece's life is bounded
  (`src/render/confetti_model.ts:30-32`).
- The head indicator: the player's marker is one quad per marker drawn
  by an SDF glyph shader (`src/render/marker_mesh.ts:1-20`;
  `place(x, y, r)` at `src/render/fabric_maze_renderer.ts:3104-3105`).
  One quad can be tinted, faded or scaled; it cannot translate two
  halves apart. That is the whole cost of Levi's third seed (below).
- Fire fronts are already drawable points: `runBurnAt` returns each
  burning run's burnt stretches and `front[]` positions
  (`src/game/fire.ts:116-153`), drawn by
  `src/render/fabric_maze_renderer.ts:1760` (`drawFire`). A renderer can
  say exactly how far the nearest flame is from the head.

## Meeting-point design

One shared shape for all five catches. At the catch decision the code
records a rendezvous `{ t, player: Spot, other: Spot, meet: Spot }` in
the state object that already owns the catch, and the page runs the
same little state machine:

1. **Travel.** The move (or wait, or real-time tick) animation runs on
   to the meeting point. Input gates exactly as a move in flight does
   today (pointer taps ignored; keys, pad and gamepad held to arrival:
   the `pendingTurnCatch` precedent, `src/main.ts:1850-1853`).
2. **Contact.** At `meet`, both indicators stand together for a held
   beat (~0.15 s), the contact effect ignites (next section), the dull
   pluck plays and the phone buzzes — on every clock, not just turns.
3. **Ending.** After the beat, today's ending runs: the burst ring is
   already history, the toast or banner lands, and the player visibly
   reappears at the entrance (respawn) or the level restarts. Total
   added time is budgeted in "The catch beat."

Per mode:

### Turn, by runs (`minoByLength` off) — generalize the solved case

`TurnMinotaur.turn()` today respawns the state in the catch branch and
erases the evidence: `lastFrom` becomes the lair, `lastPath` is emptied
and `progress` is set to 1 (`src/game/minotaur_turns.ts:1020-1027`).
Change: before respawning, compute the rendezvous with the machinery
by-length already has. The player animates t × their run
(`playerSpotAt`, `src/game/minotaur_turns.ts:718-728`, currently
private) and the minotaur animates t × its travel along `lastPath`,
which the `mino` getter already interpolates by run length
(`:1317-1349`); both are piecewise-linear in t, so the earliest t with
thread distance 0 falls at a segment breakpoint or at a shared-run
crossing, solvable exactly as `lengthContactFraction` solves it
(`:784-839`). `contact()` stays the discrete authority — the new pure
function only locates when and where a catch it declared happens:

| `contact()` case (`:857-867`) | Meeting point |
|---|---|
| both end on the same vertex (`p2 === mEnd`) | that vertex; t = 1 unless the minotaur got there earlier and waited (its path passed the vertex mid-turn — then its arrival t) |
| head-on swap on one run (`f === e && a === p2 && b === p`) | the crossing point on that run, from the two linear motions |
| you arrive where it stands (path empty, or it ends where you land) | your destination vertex at t = 1; it is already there |
| a wait (`e < 0`) whose junction its path touches | your junction, at its path's arrival fraction; you never move |

Store it in a new `lastContact` for the runs path (same shape as
by-length's), keep `lastPath` readable until a new
`finishCatchAnim()` — by-length already has one
(`:1305-1309`). On the page, drop the `byLength` gate from
`deferLengthCatch` (`src/main.ts:1854-1859`) so a runs catch defers
the same way; `turnCaught(wait, true)` is already the shared landing
(it reads `lastContact`, stops the move at the dot with `stopMove`, and
lifts the fog only as far as the dot reached —
`src/main.ts:1736-1771`, `src/render/fabric_maze_renderer.ts:1319-1330`).
One difference from today: the toast, the HUD's caught row and the
sound move from the tap to the contact instant. The catch count itself
still increments in `turn()` (`src/game/minotaur_turns.ts:1015`), so a
probe reading state mid-animation already sees the catch — name that
in the stage's tests rather than changing it.

### Turn, by length — done; two small completions

The rendezvous exists (`src/game/minotaur_turns.ts:1123-1151`). What
it lacks is everything after the burst: the contact beat, sound and
vibrate parity is already there via `turnCaught`, so the completions
are only (a) the contact effect of the next section replacing the bare
ring, and (b) a wait catch at t near 0: `deferLengthCatch` refuses
`t <= 0.001` (`src/main.ts:1856`), so an immediate wait catch still
cuts. Give it the same beat with no travel (below).

### Real time — ghost rendezvous, no sim change

`MinotaurChase.step()` checks contact after moving both, then respawns
in the same tick (`src/game/minotaur.ts:459-477`, `:512-523`). Changing
the sim's clock to walk the last stretch would move `K80_DIGESTS`
(`test/game/minotaur.test.ts:436`) and break tick-exact replay
(`replayChase`, `src/game/minotaur.ts:814-834`). Instead, copy the
turn pattern: the `"caught"` event gains the pre-respawn spots —
`ChaseEvent` already carries payloads (`src/game/minotaur.ts:144-150`),
so `{ kind: "caught", player: Spot, mino: Spot }` is additive and the
digest (which hashes spots per tick, not events) never sees it. The
page then renders a **ghost rendezvous**: the game state has already
respawned, but for ~0.3 s the renderer keeps drawing the head marker
and the minotaur marker at the captured spots and slides both to the
meeting point — the point halfway along the thread between them when
they share a run, else the nearer shared vertex (both walk to it). The
head marker's position is the fabric renderer's to override mid-move
(it places the dot every frame, `src/render/fabric_maze_renderer.ts:3078-3105`);
the ghost needs one override point there plus `syncMinotaur` accepting
a ghost spot for the catch beat. Chase ticks already continue during
the ghost (the new chase stands at its spawns, markers hidden under
the ghost until the beat ends, or drawn at the entrance/lair dimmed —
a stage call to probe, recommended: hidden; the entrance reappear at
the ending lands cleaner). The player's queued runs in the chase are
unaffected because `respawn()` already cleared the queue
(`src/game/minotaur.ts:514`).

### Fire, turn clock — the flames walk the last stretch

The loss is declared when the player arrives at a junction with no
safe arm (`src/game/fabric_controller.ts:342-360`). The dot's arrival
and the banner are already sequenced (`pendingLoss` waits for
`animating` to clear, `src/app/frame_loop.ts:580-583`). Add the visual
rendezvous: from the arrival (or from mid-move — see the beat), every
burning run incident to the head has a front at a known lattice
distance from the head (from `runBurnAt`'s `front[]`, converted to
distance-to-head per arm). The renderer creeps those fronts to the
head over the burn-in beat, overriding `drawFire`'s per-run front
positions for the incident runs only while the beat runs; the fire
model's L does not move (turn clock: `walkedDist` is still), so nothing
replays differently. Where the front is already at the head (delay 0
setups), the beat is 0 s of travel and only the contact effect plays.
The meeting point is the head itself; player travel is the arrival
that already happens.

### Fire, real-time clock — same burn-in, standing

The standing loss fires the first frame `T(head) <= L`
(`src/game/fabric_controller.ts:273-282`): by construction the fire is
at the head's vertex at that instant, but the fronts on the incident
runs reach the head end exactly then, so the drawn gap is small —
except the player's own incoming run, whose far front may lag. Reuse
the same incident-front creep from the loss frame (0.3-0.45 s), with
`FireClock` stopped at the loss as today (`src/main.ts:1684-1709`;
`setFireNow` still marks `fireLost` at once). There is no mid-run fire
catch to design for: at `fireSpeed <= 0.95` nothing catches the dot
mid-run (K114 stage 2's proof, `docs/design/K114_stage2.md:180-193`).

## The catch beat (one timeline for every loss)

Today a win's banner and confetti land together
(`src/main.ts:1445`, `:1470-1501`). A loss gets a two-beat shape —
contact first, screen second — because the contact effect is the
information ("you were caught *here*") and the screen effect is the
feeling:

| Time | What happens |
|---|---|
| t = 0 | the rendezvous starts (or completes instantly at a t ≈ 0 wait catch) |
| contact | both indicators at `meet`; held 0.15 s; contact effect ignites; dull pluck low + its neighbour; `vibrate` (rec: `[50, 40, 80]`, turn catches' single 60 ms becomes this; rec: also fire) |
| +0.35 s | the whole-screen effect starts (below); the toast (minotaur) appears here at the earliest |
| +0.9-1.1 s | the ending: respawn visible at the entrance, or the Burnt banner (fire), or the level restart (`minoRestart`) |

Total lockout budget: travel (already the player's move; ≤ ~0.7 s on
the longest runs at `moveSpeed` 1, less at higher speeds) + ~1 s. A
catch is a punishment; making a player watch a full second every time
could read as friction on catch-heavy mazes (the real-time chase's
median is 1 catch a game, up to 2 at the 74th percentile —
`src/game/minotaur.ts:106-112`). Mitigation options in Questions Q2;
recommended default: no skip, beat as tabled, because the travel beat
replaces an animation the player was already watching.

Gating while the beat runs: treat it as a move in flight. `dotMoving()`
(`src/main.ts:2229-2230`) is what input, routes and the stop rules read;
one `pendingLossFx` (the shared machine's state) added to it — or, more
cheaply, the beat keeps a real move animation conceptually alive — is
the stage's implementation call, but the contract is: pointer taps do
not start a move, held keys fire on the ending as they do on an arrival
today, a queued route dies with the catch as it does now
(`src/main.ts:2201-2213`, `:1659`). A rebuild or a param change mid-beat
drops the beat with the scene (the `pendingTurnCatch` guard at
`src/main.ts:1977` is the pattern).

## Contact effect options (at the meeting point)

Judged on: reads at phone fit zoom (the K525 lesson — threads are
4-5 px wide there, `docs/design/K80_gameplay_additions.md:495-497`), how
much new render machinery it needs, and how it sits beside the existing
red language (telegraph `0xff2418`-family reds, the minotaur's glow).

| Option | What it is | Cost | Reads at fit zoom? |
|---|---|---|---|
| A. Ring, evolved | `catchBurstAt` grows: 0.6 s, a thicker first ring that holds ~0.2 s before easing out, a second inner ring expanding from the contact at +0.12 s, then shards (below) | pure-function change + the same `Graphics` draw (`src/render/fabric_maze_renderer.ts:1725-1743`) | better than today's (the hold fixes K525's "mostly faded"), still a ring around a 5 px dot |
| B. Explosion (Levi) | a radial burst of 40-70 spark/streak particles with gravity and drag, white-red-orange, plus a flash disc for the first 120 ms and a soft smoke puff after | one world-space particle pool — the machinery exists twice already (`ConfettiSim`'s spray, `src/render/confetti_model.ts:263-307`; `AppearFxSystem`'s K_SPARK/K_SMOKE kinds, `src/render/appear_fx.ts:69-73`, gravity `SPARK_GRAVITY` line 120) | yes — motion and mass, not a line; the loudest option |
| C. Flare-up and burn-away (Levi) | a radial flare sprite (the minotaur glow's texture pattern, `src/render/fabric_maze_renderer.ts:347-363`) swells and brightens ~0.15 s, then the head marker blackens and sheds rising embers for ~0.8 s while it fades | flare = one `Sprite`; burn-away needs a marker tint/alpha path (markers take `uDisc`/`uInk` uniforms, `src/render/marker_mesh.ts:64-65`) plus an ember emitter in B's pool | yes, and it names the fire loss natively; for a minotaur catch it reads "incinerated," which may be the wrong story told well |
| D. Ripped in half (Levi) | the head disc splits along a crack (rec: perpendicular to the minotaur's approach, or the run's direction), the two halves separate, tilt apart, fall and fade over ~0.6 s | the only option needing new marker machinery: `MarkerMesh` is one quad evaluating the whole disc SDF (`src/render/marker_mesh.ts:70-101`), so halves need either a `uHalf` clip uniform on two instances or a shader offset — two extra page-lifetime `MarkerMesh`es at fabric creation, their crack math pure in a small model beside `mino_feedback.ts` | the strongest silhouette change; unmissable at any zoom |

Recommendation: **B built on A's clock, ignited at the contact, in the
catcher's colour** — red-white for the minotaur, orange-white for the
fire — with A''s holding ring kept underneath as the anchor (the ring
is also the reduced-motion form). Rationale: it reuses the confetti
spray's proven pool/particle plumbing (new pure model `loss_fx_model`
below, seeded by `Math.random` like confetti), it is the only seed
whose legibility does not depend on line weight at 4-5 px threads, and
it leaves C's ember colours available inside the same burst for the
fire (the burst *is* a flare-up on the fire side). D is not rejected:
it is deferred to its own stage (Stage 4), gated on Levi's call after
seeing B on the contact sheet, because its cost is a marker-shader
change that no other option needs and its gag may be worth more than
B once seen. If Levi prefers D outright, Stages 1-2 (the rendezvous)
are unchanged either way — that is the point of splitting them.

Rejected inside B: a screen shake. The camera is eased and shared
(`src/app/camera.ts`); a shake fights the follow camera, the fit clamp
and reduced motion for a half-second gag. Also rejected: reusing the
win spray's exact paper pieces — confetti must keep meaning "you won."

## Whole-screen loss effect options (mirror the confetti)

Architecture, whichever look wins: mirror K140 exactly. A pure model
(`src/render/loss_fx_model.ts`: the plan, two pools, `step`, per-piece
look — unit-tested with no pixi, as `confetti_model.ts` is) and a view
(`src/render/loss_fx.ts`: `LossFxLayer` with a screen-space
`ParticleContainer`, its `active` polled beside confetti's at
`src/app/frame_loop.ts:276` and ticked beside `confetti.tick` at
`:391`). Called from the three endings in `main.ts` (`turnCaught`, the
chase's caught branch, `showFireLoss`) at the beat's +0.35 s mark. All
pieces bounded-lifetime so the OVERLAY poll clears (the confetti
contract, `src/render/confetti_model.ts:30-32`).

| Option | What it is | Fit |
|---|---|---|
| A. Ash fall | screen-space flakes, grey-to-black with a few red embers mixed, falling slower than the win rain, swaying more; release tapered like K335's rain fix (`rainDelay`, `src/render/confetti_model.ts:210-224`) so the top thins instead of ending in a line | the confetti's dark mirror — instantly read as "the loss version of that"; palette swaps to ember-orange for a fire loss |
| B. Ember storm | embers rise and curl sideways from the bottom (buoyant, `appear_fx.ts`'s smoke rise is the in-repo precedent) | fire-native; wrong story for a minotaur catch unless recoloured deep red, and rising reads as "burning" even then |
| C. Vignette close | a full-screen radial gradient (DOM overlay, CSS transition on the beat's clock) darkens the edges to ~65% and holds until the banner | no particles at all; the cheapest dread; pairs with anything; alone it may read as a lighting bug at a glance |
| D. Shockwave | one ring from the meeting point grown to screen scale (world space) plus a brief desaturate | duplicates A's ring at screen scale; desaturation has no shader home in the stack today (paint is per-thread GLSL) — cost without a home |

Recommendation: **A over C** — ash fall in screen space, in the
catcher's palette (ash grey + minotaur red; ash + ember orange for the
fire), with the vignette swell under it as a plain CSS overlay the
same clock drives (`#loss-vignette`, opacity keyed from `main.ts` on
the beat, zero pixi cost). Duration ~2.5-3.5 s of fall, pieces dead by
~4.5 s worst case. The Burnt banner (fire) or the respawn (minotaur)
lands at +0.9-1.1 s *under* the fall, exactly as the win banner sits
over its rain with the DOM above the canvas
(`src/render/confetti.ts:10-13`).

Deliberately not mirrored: the win spray at the exit (a world burst at
a point). The loss already has its world burst at the meeting point;
two point bursts would compete.

## Reduced motion

`motion.reduced` (`src/ui/motion.ts:105-110`) is the one source, read
live. Precedents: the catch burst collapses to a static ring
(`src/game/mino_feedback.ts:102-104`), the confetti drops its rain
entirely (a full-screen fall is the large-area motion WCAG 2.3.3 asks
to avoid) and keeps a small slow spray at half speed with no spin
(`src/render/confetti_model.ts:26-28`, `:143-174`). Follow both:

- Rendezvous travel: **kept**. It is the dot's ordinary move finishing,
  not an added flourish; cutting it would reintroduce the teleport this
  item exists to remove. (Its pace is the player's own move animation,
  which reduced motion already accepts everywhere else.)
- Contact effect: the static holding ring only — no sparks, no flare
  swell, no rip. Vibration stays off (today's rule,
  `src/main.ts:1780`).
- Screen effect: **no ash fall**. The small slow burst at the meeting
  point only (the confetti's `REDUCED_SPRAY_SHARE` shape: ~10% count,
  half speed), and the vignette becomes a static fade to a fixed
  25% edge darkening for the beat, released with the banner — no pulse.
- The 0.15 s hold and the +0.35/+0.9 beat marks stay: they are pacing,
  not motion.

## Sound

Keep `catchNotes`' dull pluck (an octave down + neighbour) and add,
under B, a low thump: two more plucks a further octave down at the
ignition (the synth voices are plucked strings; a "thump" is the
lowest pluck the maze offers, ~30 Hz floor at
`src/game/mino_feedback.ts:158`). Fire losses have **no sound today** —
give them the same pair, pitched from the head's run. No new audio
machinery. Volume follows the ordinary sound settings; nothing here is
daily-exempt-relevant (sound prefs already are).

## Params and codec

One candidate param, mirroring the win's: `lossAmount` (number,
[0, 3], default 1), scaling the screen fall and the contact burst
(0 = rendezvous and ring only). If Levi takes it:

- Appended to `CODEC_PARAMS` after the current last row (`text`,
  `src/ui/param_codec.ts:309-310`); `CODEC_VERSION` stays 8 (an append
  moves no link; `src/ui/param_codec.ts:312-316`). The pins that move:
  `test/ui/param_codec.test.ts`'s table, `test/ui/url_codec.test.ts`'s
  defaults — named in the commit.
- Daily-exempt, listed beside `confettiAmount` in `DAILY_EXEMPT_KEYS`
  (`src/ui/daily_link.ts:186-188`: "how a finish celebrates, not what
  was played" — a loss amount is the same kind). A daily's attempt
  fingerprint and result records do not change; no daily-store version
  bump (nothing about a result changes shape — contrast K114 stage 4's
  closest-call note, `docs/design/K114_burn.md:165-177`).
- Panel: a row beside "Confetti amount" (`src/ui/tweakpane_panel.ts:1322-1337`),
  live, no rebuild. Range clamp beside confetti's
  (`src/ui/param_codec.ts:413`).
- The Motion setting stays a viewer pref and stays the reduced-motion
  authority; `lossAmount` never overrides it (reduced zeroes the fall
  whatever the amount, as `confettiPlan` does).

If Levi prefers no param: the effects key off a code constant at
amount 1 and the codec does not move. Recommendation: take the param —
the win has one, players who find the fall much will look for the same
slider, and an appended row costs one pin update.

## Stages (one brief each; sizes are relative: M ≈ one two-hour stage)

- **Stage 1 — the turn rendezvous (M).** `minotaur_turns.ts`: the runs
  rendezvous (pure fraction/spot finder over `lastPath`, `lastContact`
  for runs, route kept to `finishCatchAnim`); `main.ts`: one
  `pendingCatch` for both turn modes (rename `pendingTurnCatch`),
  `turnCaught(atContact)` for runs catches, the t ≈ 0 wait beat. The
  burst stays today's ring this stage. Tests: the finder (head-on
  swap, wait touched, arriving where it stands, two-run overrun past
  the player's vertex, ending together), the page deferral by probe;
  `TURN_GAMES` / `LENGTH_GAMES` bit-identical. Shots: a runs catch
  mid-approach and at contact, 1400x900 + 411x753 (`diag_screenshot`
  rules — never `--virtual-time-budget`, CLAUDE.md).
- **Stage 2 — real-time ghost + fire burn-in + the shared beat (M).**
  `minotaur.ts`: the caught event's spots (digests untouched);
  `main.ts` + `fabric_maze_renderer.ts`: the ghost rendezvous, the
  beat's input gating, sound/vibrate parity; the fire's incident-front
  creep for both fire clocks (a pure front-distance helper in
  `fire.ts` or the renderer — its home is the stage's call, the tests
  are not). Tests: the event payload and its non-effect on
  `K80_DIGESTS`; the standing loss's beat; the turn-fire creep reaching
  the head exactly at ignition.
  Stage 2 Handoff (2026-10-21): DONE. `minotaur.ts`: the `"caught"`
  event carries the pre-respawn `player`/`mino` spots at both push sites
  (the catching extra's spot for an extra's catch); digests hash spots
  per tick, never events, so `K80_DIGESTS` is bit-identical (the suite
  proves it) and replays are untouched. `fabric_maze_renderer.ts`:
  `setCatchGhost(a, b, t)` — both markers slide to their meeting point,
  the head's ring fading as they close (`refreshGhost` in `drawMarkers`
  + `syncMinotaur`), and `fireBurnCreep` — during the burn-in,
  `syncFire` draws the head's incident fronts creeping along their runs
  (`pushFront` at the crept fraction), reaching the head exactly at
  ignition; the settled char draws when the beat ends. `main.ts`:
  `pendingGhost` defers the whole real-time ending (hearts/restart,
  respawn, toast) behind the 300 ms sweep — burst at the meeting point
  (`catchGhostMeet`) + `vibrate(60)` at contact, matching the turn
  clock's parity; input gated in `handleChaseTap`/`chaseAlong`; reduced
  motion ends the catch at once. Fire: `beginFireBeat` (both clocks —
  the turn site in `moveAlong`, the real-time site in `fireSet`) holds
  `pendingLoss` back while `fireBeatStep` (keyStep slot; `tickFire` is
  real-time only) creeps `fireBurnCreep`, then vibrates and releases
  the banner; `gameNeedsFrame` keeps the loop awake for both beats.
  Tests: the event-payload test (spots pre-respawn, player already back
  at the entrance) + the updated exact-shape catch expectation; the
  standing-loss beat and creep-at-ignition are page-proven
  (`.claude/probes/K546/s2_probe.mjs`: ghost 11–13 frames to t≈0.9,
  creep 12 frames to ≈0.96, banner after; shots in `s2/`). Full suite
  2240 green. Residual: the ghost draws the minotaur's marker only —
  extras keep standing at their spots during the rendezvous.
  Stage 3 Handoff (2026-10-21): DONE, as recommended (B on A's clock,
  A over C). `mino_feedback.ts`: the ring evolved — `CATCH_BURST_S`
  0.45→0.6 s, the first ring thicker (`widthMul` 1.9) and holding
  ~0.2 s at alpha 0.95 (`CATCH_HOLD_S`), a second inner ring from
  +0.12 s (`CATCH_INNER_AT`); reduced motion keeps the one static ring.
  New pure `render/loss_fx_model.ts` (`lossPlan`, `BurstPool`,
  `AshPool`, `flashAlpha`, the catchers' palettes; caps hard) and view
  `render/loss_fx.ts` (`LossFxLayer`: a world-space Graphics for the
  burst + 0.12 s flash following the root, a screen-space Graphics for
  the ash, scheduled +0.35 s; `active` polled beside confetti's and
  ticked beside `confetti.tick` in `frame_loop.ts`). Ignited from the
  three endings at their contact moments: `turnCaught`'s site, the
  ghost's meeting point, and `showFireLoss`'s head (first show only —
  a re-shown banner throws nothing). Sound: the low thump (two plucks
  a further octave down) joins the catch pair on the turn and
  real-time clocks, and the fire gains the pair + thump pitched from
  the head's run (its first sound). The vignette is `#loss-vignette`
  in `index.html` (z 5, under the HUD), opacity driven from main:
  0.65 at the contact, released at +1.6 s; reduced motion fades it to
  a static 0.25 and drops the fall (small slow burst only).
  `lossAmount` landed as recommended: codec 231 (`lam`), [0, 3],
  default 1, daily-exempt beside `confettiAmount`, panel row "Loss
  amount" beside Confetti amount, `param_tags` entry; pins moved:
  param_codec table, url_codec defaults + OVERRIDE_KEYS, daily exempt
  set. Tests: `test/render/loss_fx_model.test.ts` (plan at 0/reduced/
  caps, bounded pool lifetimes, look bounds, the fall's taper) + the
  ring's hold/inner tests. Contact sheet
  `.claude/probes/K546/s3_probe.mjs` (`s3/desk_burst.png`,
  `desk_fall.png`, `phone_burst.png`, `phone_fall.png`): the burst
  reads unmistakably at 411x753 fit zoom — the kill criterion's phone
  test passes at amount 1, so stage 4 stays optional behind Q1.
  Also fixed from stage 2: the ghost's meeting point is now read
  before `clearCatchGhost()` (it was always null, so the ring/burst
  at the meeting point never fired). Full suite 2249 passed (1 skipped).
  Residuals: the vignette's release is a fixed 1.6 s timer, not tied
  to the ash draining; smoke pieces wear the palette's last colour by
  construction (index `colorCount - 1`).
- **Stage 3 — contact burst + screen fall (M).** `mino_feedback.ts`:
  the evolved ring clock. New `render/loss_fx_model.ts` +
  `render/loss_fx.ts` (burst pool in world space at the meeting point;
  ash fall in screen space; the vignette overlay), wired at
  `src/app/frame_loop.ts:276` / `:391` beside confetti; `lossAmount`
  param, codec append, panel row, exempt list; reduced-motion plan.
  Tests: the plan (reduced, amount 0, caps), pool lifetimes,
  `pieceLook` bounds — the confetti tests' shape. Contact sheet,
  desktop + phone, for Levi's Q1/Q3 calls.
- **Stage 4 — ripped in half (M, optional, gated on Q1).**
  `marker_mesh.ts`: a half-clip uniform; `fabric_maze_renderer.ts`: two
  half markers with fall/tilt/fade on a pure clock (beside
  `mino_feedback.ts`); the crack angle from the approach direction. It
  replaces the head's part of Stage 3's burst for minotaur catches if
  Levi picks it; the burst stays for the fire.

Each stage: `npm test`, `npm run build`, `tsc --noEmit`; no pin moves
except Stage 3's codec pins (named) and any lore the stage adds
(`gameplay-minotaur.md` / `gameplay-fire.md` catch entries, the links
and panel lore if the param lands). Process follows the house pattern
of the sibling briefs (one stage per launch, commit WIP at milestones,
never push, ledger untouched by the stage — see
`docs/design/K481.md` "Setup"/"Process" for the shape).

## Kill criteria

- **Phone legibility:** if Stage 3's contact sheet at 411x753 fit zoom
  does not show the catch's place unmistakably (the K525 test — hunt
  0.95 reads, roam 0.45 does not), the burst grows (more mass, the
  flare from option C) or Stage 4 becomes the primary, before any
  tuning of counts.
- **Beat friction:** if catches feel taxed in play (Levi's hands, not
  a metric), shorten the holds before cutting the travel — the travel
  is the item; the holds are garnish.
- **Perf:** the fall at amount 3 on the phone profile must hold the
  frame budget the confetti holds (same pool sizes or fewer); if the
  OVERLAY keeps the loop awake past the banner on sleep-gated pages,
  the lifetimes are wrong, not the idea.
- **Determinism:** any movement in `TURN_GAMES`, `LENGTH_GAMES`,
  `K80_DIGESTS`, K87 or the golden dailies kills the stage's approach,
  not the pin.

## Questions for Levi (recommendations stated; stages wait on these)

1. **Contact effect:** the evolved ring with a spark burst in the
   catcher's colour (rec, Stage 3), the flare-up and burn-away, or
   ripped-in-half as the primary (Stage 4 promoted)? Ripped is the
   only one needing marker-shader work; the rendezvous stages are the
   same under any pick.
2. **The beat:** contact at the meeting point, screen effect at
   +0.35 s, ending at ~+1 s (rec) — or everything at once like the
   win's confetti+banner? And may a tap skip the post-contact beat
   once the catch has landed? (Rec: no skip; the beat is ~1 s.)
3. **Screen effect:** ash fall over a vignette swell, palette-swapped
   for the fire (rec), or the vignette alone, or embers?
4. **A `lossAmount` param** mirroring `confettiAmount`, daily-exempt
   (rec) — or no param, a fixed amount?
5. **Fire's ending:** the Burnt banner lands at the beat's end as
   tabled (rec), or does the fire keep today's instant banner after
   the burn-in alone?
6. **`minoRestart` catches:** the full beat, then the level restart
   (rec), or a shortened beat (the restart already re-reads as a
   punishment)?
7. **Sound:** the dull pluck plus a low thump at ignition, extended
   to fire losses which are silent today (rec) — or catches keep
   only today's pluck?
8. **K525 fold-in:** this design grows the catch ring (its "mostly
   faded" note) but leaves the telegraph's roam 0.45 alpha and the
   fog bleed 0.16 to your existing K525 call. Confirm the split, or
   pull the telegraph alpha into Stage 1's sheet for one combined look?
