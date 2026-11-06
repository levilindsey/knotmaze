# K1211 S4: the pulse's light runs through a junction as one soft glow

Ledger: K1211 (one seamless light inside each junction). Stage agent: Claude Opus in its own
worktree, started by the coordinator session; cap 2 h; ports 5960-5969.

## Start

Your worktree starts from master, which holds S2's fix (a84225d3) and S3's (66752e75). If it lacks
this brief, `git fetch -q origin` and `git merge --ff-only origin/master`. For `node_modules`,
make a junction to the main checkout's: `New-Item -ItemType Junction -Path node_modules -Target
C:\Users\lsl\Repositories\knotmaze\node_modules`.

## Why

Levi, 2026-11-05: "the pictures I've been seeing of highlights over junctions are bad. There
are clear lines/edges of the highlight within the interior of the junction. These seem to be
artifacts of how the original threads are constructed before the threads were fused and/or the
rounding was applied. These junctions need to appear as though they are one whole fused
seamless unit."

On K1190's card Levi answered "All four" (notes, `## K1211 (2026-11-05, Levi on K1190's
card)`). S2 fixed spot 3 (the gold's round edge), S3 spot 4 (the web's bite) and the lit edge's
dark line. Spots 1 and 2 are this stage's. Both are in K1190's sheets
(`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1139\out\s4\sheets\`): four pulse moments
a row; the top row is the approved look, from before K1139's change, and in it the light is a
soft glow with no edge anywhere inside the junction.

- **Spot 1, the sharp curved fronts.** `t4_ji33_cross_n.png` (cross ji 33): the crescent in the
  middle row and the large arc across the fork in the bottom row. `t6_ji149_x4_n.png` (x4 ji
  149): the curve from the gold's corner down to the dark gap, in the two lower rows. S1: in the
  light's step map, webs on or off; "the band's cover in the fan draws them".
- **Spot 2, the straight-edged paler wedges.** At cross ji 33, the straight-sided lit wedge and
  its radial bars (middle row; S1: k 20); at x4 ji 149, the comb of radial rays under that
  curve. S1: "the light steps from one wedge of the fan to the next, webs on or off". Not
  isolated further. S1 also saw a straight-sided light-blue diamond in this fork in its
  colours-only shot, which kept `paintTraveled`; check S2's pure colours shot before counting
  it as the light's.

A lead from the code, not yet tested: a pulse band is drawn in the fan as a tube around K81's
curve between its two arms, and its cover ramps over one pixel at the tube's edge
(`pulseBandCover`, `src/render/junction_field.ts`; the band loop in `junctionField`, `cov =
clamp((reach - sqrt(best)) / pxW, 0.0, 1.0)`). Where the fused fan is wider than the tube, that
edge falls inside the junction.

What S1 tried (its Handoff in `docs/design/K1211_seamless_junction_light.md`): look A, one
fused light per junction, removed spots 1 and 2 but lit the whole junction and flooded the gold
(K1139's rejected C, and K81's nub) and added a line about 2 fh out; look B (switch 2: a soft
cover, let into the arms off the band) only softened them, left a notch and a wedge, and pushed
a soft gold nub into the off-route arm at rest. Neither shipped. Its untried lead: "A per route,
not per junction: a level taken from the routed arms only would keep the split and keep the
gold on its path."

The reference that already works: section colours meet seamlessly inside a junction (S1's "The
reference" section). One converged value per junction, each arm ramping to it over a fixed
distance near its joint, eased like junctionBlend, the arms then blended across the fan by
junctionBase's t. S1's view: the same contract applies to effects.

Calls that bind every change here:

- K1139 (Levi): the pulse "splits, it runs toward the player, and it goes straight through with
  no dim moment"; "no dark wedge between two lit siblings". Its option C (the whole junction
  lit) was rejected.
- K81: gold never reaches into an off-route arm ("a discontinuous flat nub").
- S2's round edge and S3's lit edge and web hold (`test/render/gold_edge.test.ts` and S3's
  pins).
- A spot is judged against the approved version (the sheets' top row), never against the last
  step.

## Goal

While a pulse crosses a junction, its light inside the junction reads as one soft glow, as in
the top row: no edge sharper than the pulse's own crest on a plain arm, no straight-edged wedge,
no radial bar or ray. It still splits toward the player and goes straight through with no dim
moment, with no dark wedge between two lit siblings and no light or gold in an off-route arm
past what master shows. Nothing changes at rest. Look B and its switch are gone. All in mode 0
(what players see).

## Read first

- S1's Handoff, whole: where each line comes from, the verdict, the cost, the open questions.
- S2's and S3's Handoffs (`docs/design/K1211_s2_gold_edge.md`, `K1211_s3_lit_edge_web.md`):
  their fixes, pins, checks and residuals.
- `docs/ledger_notes.md`, the K1211 entries (Select-String `^## K1211`; read each to the next
  `## `).
- The headers of `src/render/junction_field.ts`, `src/render/ribbon/joinery.ts`,
  `src/render/junction_routes.ts` and `src/render/pulse_path.ts`.

## Tasks

In this order. If the cap comes first, the Handoff says what is left.

1. **Look B out.** Delete switch 2 and everything only it uses, in the shader and in the CPU
   twin (`jLightSoft`, `jLightAllow`, `lookB`, `LIGHT_SOFT_FH`, and the strip lengthening if
   nothing else reads it). Keep the `__knotJunctionLight` hook only if task 3 uses it.
   `npm test` green with no pin moved (look B is off by default). Commit. Report the K320
   (`k320_slim`) delta against S3's 42,888.
2. **The reference numbers.** On the light alone (each shot minus the same moment with no pulse,
   as S1's step map), measure: the largest step over 3 device px along a plain arm's crest, away
   from every junction (the bar); and the same inside each lit junction at K1190's moments
   (cross ji 33, x4 ji 149), with where it sits. Say which spot each largest step belongs to.
3. **The fix**, in mode 0, with the CPU twin in step. The pulse's light inside the fan becomes
   one continuous field: at each routed arm's joint it equals the light the arm's ribbon draws
   there, across the fan it changes no faster than the bar, and the crest still advances into
   every lit child at once. The means are yours. The leads above, plus: if a ramp outruns a
   cover strip, the arm jumps where the strip ends (S1's line 2 fh out: `coverCap` takes the
   least of the gap near the arm minus a pad, the arm's domain and `footCap`, which is fh plus
   the casing gap with the wedges off). Pin it with a unit test on the twin: across a lit fork,
   no step above the bar per pixel; the light equal on two lit children at the same distance
   from the joint; an off-route arm's light no higher than master's. Re-freeze a pin only where
   a pulse lights a fan, and name it; a pin moving at rest or away from a junction is a stop.
   If a choice of look comes up that the calls above don't settle (how far the glow may spread
   across the fan toward an off-route arm, for instance), build at most two variants, the
   second behind the switch (`uJParams.z` 1), and leave the choice to the coordinator. If the
   fix needs a change to how K81's route band or the fan is built, stop at the cause and say
   what it would take.
4. **Checks**, with S3's tools copied to new names for this stage (`.claude/probes/K1211/`:
   `shoot3.mjs`, `run_shots3.ps1`, `checks3.mjs`, `crops3.mjs`, `hcat.mjs`, `s3_ids.ts`, and S2's
   `smoke2.mjs`; never edit the originals). They only reject; report the numbers:
   - The step check: inside each lit junction, at every moment and stand, the light's largest
     step over 3 device px is no more than 1.25x the bar (task 2), and where it sits.
   - K1139: the two lit children of a fork within 5% of each other at the same distance from the
     joint; at no moment does the light's peak inside the junction fall below 0.9x the peak on
     its lit arms; no wedge between two lit siblings darker than 0.9x the arms beside it.
   - S2's nub and corner checks at rest, S3's edge check, (c) the locality against master, and
     (a) and (b) as S3 ran them. S2 raised (b)'s largest jump between moments at x4 ji 125 (27.1
     to 39.5), x4 ji 149 (20.2 to 33.7) and loop ji 88 (27.9 to 43.2; S3's numbers, against
     c0a72eb8): report yours beside them, and say which spot each sits in.
   - One explore-mode shot: it draws, and the console has no error.
5. **Sheets**: columns master | branch (| the variant) | pure colours, and K1190's top row beside
   cross ji 33 and x4 ji 149 at K1190's four moments, at 1x and 3x. The same moments, master |
   branch, at a T (loop ji 89), a four (loop ji 12) and loop ji 113. At rest, one row per kind
   (cross ji 113, x4 ji 102, loop ji 13, loop ji 89, x4 ji 125, loop ji 12, loop ji 88), to show
   nothing moved. View every crop yourself at full size and say, per spot, what you see against
   the top row; pick nothing.
6. **Handoff**, appended below, with a paragraph on what carries over to fire and collapse
   (K1210): does the same field serve their fronts?

## Muse in the main checkout

Muse runs in the main checkout on master during your stage and may push. At your end,
`git fetch -q origin` and rebase onto `origin/master`; then run `npm test` again. If the rebase
needs more than conflict lines, don't do it: say what it would take.

## Out of scope

The crossing-gap mask's zigzags (K1218), loop ji 12's dark triangle and x4 ji 149's teal notch
(K1219), the text forks' disc and steps (K1220), fire and collapse (K1210), the walked gold at
rest (S2's), anything for Levi.

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); use the Read tool
  only right before an Edit, and to view crops.
- Never touch the main checkout (Muse runs there on master), another worktree or another probe
  folder. Read-only references: K1190's sheets (above), and S3's shots in its kept worktree
  (`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a48fddd224c96d898\.claude\probes\K1211\out3\`).
  Write your own output to `.claude/probes/K1211/out4/`.
- Commit WIP on your branch at every milestone, broken or not; never push; never edit LEDGER.md.
- No helpers.
- Shots in real time (never `--virtual-time-budget`), under the perf lock through your copy of
  the shot runner (owner `K1211-S4`); wait for the lock inside one blocking command; at most two
  browsers at a time; ports 5960-5969 only. A dev server's build stamp is the SHA it started
  from: check the served code, as `smoke2.mjs` does.
- Stop rule: stop when the tasks are done or 2 h after your start, whichever comes first
  (`Get-Date` at the start and at each milestone). Then commit WIP, append the Handoff and
  report. A compaction is not a stop: after one, re-read this brief and `git log`.

## Report

In plain words, report:
- look B's removal and the K320 delta;
- the bar, and the largest step per spot before and after;
- the fix (and the variant, if any), and what it adds per fan fragment (texture reads, loop
  passes, branches): Run M (K1214) found the fan's fragment shader is the frame's growing cost
  in play, about 0.7 ms a frame on the desktop, so name the change; no timing needed here;
- the checks' numbers per stand;
- the sheets' paths, and what you see for each spot against the top row;
- the rebase;
- your last commit's SHA.

Then give `Ledger items` and K1211's handle fields (owner, branch, last commit, evidence, next).

## Handoff

(The stage agent appends here.)
