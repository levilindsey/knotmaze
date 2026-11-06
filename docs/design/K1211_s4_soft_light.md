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

### S4 (2026-11-05, stage agent a222ff792a21132ec)

Started 15:18. It stops in task 3 at the stop rule: what's left needs a change to how K81's route
band is built. Tasks 4 and 5 did not run. Branch `worktree-agent-a222ff792a21132ec`:
- 55330f3: task 1.
- 47a5ec8: the S4 probe tools.
- f9d08de and c6831fa: task 3.
- Then this Handoff.

**Task 1, look B out (55330f3).** Switch 2 and everything only it used are gone.
- Shader: jLightEase, jLightSoft, jLightAllow, junctionBase's uJParams.z block and junctionField's
  lookB.
- Twin: S1's block, lookB, covL and the cover strips' lengthening. `want` is master's rule again.
- The switch: JUNCTION_LIGHT, setJunctionLight, the `__knotJunctionLight` hook, its constants and
  `junction_light.test.ts`.

uJParams .z and .w are 0 again. `npm test` is green with no pin moved. K320: JUNCTION_FRAG
42,888 -> 41,396 (-1,492). The explore variant is 51,081.

**Task 2, the reference numbers.** These are master's light on the desktop GPU, from S3's step3 in
`checks4.mjs`, in `.claude/probes/K1211/out4/ref/<stand>/step3_L0.json`.

The bar is the largest step over 3 device px along a plain arm's crest, away from every junction,
in 8-bit levels: cross 15 (p99.9 12), x4 8 (7), loop 15 (12).

Inside each lit junction, the largest step over its 8 moments. r is the distance from the joint
in fill half-widths, the angle is in degrees.

| spot | largest | x bar | r | angle |
|---|---|---|---|---|
| cross ji 33 | 36 | 2.4 | 1.18 | 65 |
| x4 ji 149 | 111 | 13.9 | 1.17 | 114 |
| x4 ji 125 | 111 | 13.9 | 2.51 | 174 |
| loop ji 89 (T) | 124 | 8.3 | 1.35 | -164 |
| loop ji 88 | 101 | 6.7 | 1.91 and 4.0 | 169 and -169 |
| loop ji 113 | 35 | 2.3 | 2.04 | -88 |
| loop ji 13 | 6 | 0.4 | 4.73 | -77 |
| loop ji 12 (four) | 0 | 0 | - | - |

Where each one sits:
- Near the joint, r 1.2 to 1.4: cross ji 33, x4 ji 149 and loop ji 89. Cross ji 33 and x4 ji 149
  are where a band's light ends in one pixel at its tube's edge: cross ji 33's crescent, and x4
  ji 149's edge down to the unlit crotch. Loop ji 89's place in its fan was not attributed.
- Out along an arm, r 1.9 to 4.7: x4 ji 125, loop ji 88, 113 and 13. Not attributed. S1's
  cover-strip line sits 2 fh out, but it was not checked against these.

**Task 3, the fix (c6831fa; f9d08de was a first cut).** The light inside the fan is one
continuous field, in mode 0. The shader (`junction_field.ts`'s junctionField) and the twin
(`joinery.ts`'s cpuJunctionField) are in step.
- **Each band's fall.** Every pulse band, a shared one too, lends the web its whitening (sG, the
  light it draws on its own tube) at its nearest foot. Past its reach (fill half-width plus half a
  pixel) that light falls off by a smoothstep over PULSE_GLOW_W (2.5) fill half-widths
  (`pulseGlowFall`).
- **The blend.** Where falls overlap, the field is their blend. Each band weighs its fall over the
  square of its distance past its tube, plus a quarter pixel squared (`pulseGlowWeight`), so at a
  tube's edge that band's own light rules.
- **Named arms only.** The field counts 1 on the footprint of an arm some band names and 0 on the
  others, carried across a wedge by junctionBase's blend weight t (`pulseRouteWeight`; the
  shader's band mask rm and jbT).
- **Never darker.** The light is the larger of master's and the field's.

f9d08de took the brighter of the bands' halos instead. A straight band's halo lit the
perpendicular child near the joint (a 0.7 step at that child's tube edge in the model), and two
lit children disagreed. The blend replaced it.

What it adds per fan fragment:
- No texture read, no loop pass (it rides the pulse loop that already runs per band) and no
  branch (the band mask's choice is a select).
- Per band: a smoothstep, a max, one division, three multiply-adds and an or of shifted bits.
- Once after the loop: one division, two shifts and ands, two int-to-float conversions and a max.
- State: one float array (sG, MAX_ROUTES 4), three scalars (gN, gD, rm) and the global jbT.

K320: JUNCTION_FRAG 41,396 -> 42,123 (+727). The explore variant is 51,081 -> 51,808. Both texts
compile cold once.

**The model's numbers** (`test/render/soft_light.test.ts`). The model runs the twin's terms on
web_light.test.ts's bands, with fh 12 px. Light is 0 to 1 of the way to the pulse colour. The
bar is 0.085 per px: the crest's own slope along a plain arm.

Largest step per px across the lit fork, master -> branch:

| stand | off the gold tube's edge | on it |
|---|---|---|
| x4 ji 149's shape | 0.777 -> 0.273 | 0.861 -> 0.688 |
| T fork | 0.500 -> 0.308 | 0.745 -> 0.408 |
| sharp fork | 0.098 -> 0.135 | 0.969 -> 0.320 |
| four, one child lit | 0.501 -> 0.308 | 0.501 -> 0.496 |
| four, two children lit | 0.501 -> 0.369 | 0.713 -> 0.496 |

- Every stand's largest step falls. None grows on the gold edge. Off it, only the sharp fork's
  grows (0.098 -> 0.135).
- **The bar is not met anywhere.** The largest step after is 1.6x to 8x the bar.
- Two lit children at the same distance from the joint agree within 0.05 wherever both points
  lie off the other bands' tubes.
- Where junctionBase gives an off-route arm its own material alone, its light is no higher than
  master's. Nearer the centre, junctionBase's min-width blend still mixes in a named neighbour
  (t strictly between 0 and 1), and the field follows it there. That leaves a ramp of up to 0.31
  of the pulse colour (T through 0.308, four with one child 0.302). It is a residual.

**Why it stops at the cause.** The brief says: "If the fix needs a change to how K81's route band
or the fan is built, stop at the cause." The field adds light under master's, and two steps stay
above it:
1. **K81's composite on the gold tube.** On that tube, K81's route-band composite paints the gold
   band's own crest at its own tau over everything beneath (`c = cg + gT*(c - c0)`). Off the
   tube, the whitening shows. The step at the tube's edge is the difference between the two, and
   the field can only narrow it from the off side.
2. **Two taus near the joint.** Two bands that share an arm read different taus at one point near
   the joint. A turning band takes its tau from the pivot ray, a straight band by projection (a T
   fork at (-14, 14) px: 1.4 against -14). Their crests sit at different places, so their lights
   differ there. Any blend between them crosses that difference in the pixels between their
   tubes.

What it would take:
- One tau for every band near the joint, for instance the arc distance from the joint along the
  arm nearest the point, the same for every band. The crest can be read at any tau
  (g = r1.x + tau).
- A composite that blends the gold band's crest into the field at the tube's edge, instead of
  painting over it.

Both change how K81's route band is built and drawn. They need the coordinator's call, and the
look is Levi's.

**Pins.** Only K320 moved (`k320_slim.test.ts`, budget 42,123: the field's text). No pixel pin
moved: `npm test` was green before the rebase (219 files, 2945 tests, 5 expected fails). The 5
expected fails are `soft_light.test.ts`'s bar, one per stand: an `it.fails` that turns red once
the bar holds.

**What is left.**
- Task 4 did not run: the step, K1139, nub, corner, edge, locality and (a)/(b) checks, and the
  explore shot.
- Task 5 did not run: the sheets.
- So the GPU's after-numbers and the look are unmeasured; only the model's numbers exist.
- The tools are committed in `.claude/probes/K1211/`: shoot4.mjs, run_shots4.ps1, checks4.mjs
  (with step3), crops4.mjs, hcat4.mjs, s4_ids.ts and smoke4.mjs. The references are in
  `out4/ref/`.
- Next: a call on the shared tau and the gold composite's edge (above). Then a stage that builds
  it and runs tasks 4 and 5.

**K1210: does the field serve fire and collapse fronts?** Not alone. Inferred, not built and not
measured:
- The field takes each band's light at its nearest foot and blends the bands by distance. It
  knows nothing of the pulse beyond sG.
- So a front could use it wherever the front's value is a function of arc along each band, as a
  fire's burnt edge and a collapse front are.
- They would meet the same two limits. Near the joint the bands' taus disagree, so a front would
  reach two bands that share an arm at different moments, and the blend would show a step where
  they meet. On the gold tube, K81's composite paints over it.
- So the shared tau above would serve all three fronts.
