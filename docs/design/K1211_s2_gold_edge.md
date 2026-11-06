# K1211 S2: the walked gold ends in one round edge in every junction

Ledger: K1211 (one seamless light inside each junction). Stage agent: Claude Opus in its own
worktree, started by the coordinator session; cap 2 h; ports 5960-5969.

## Start

Your worktree starts from master. If it lacks this brief, `git fetch -q origin` and
`git merge --ff-only origin/master`. Then merge stage 1's branch:
`git merge --no-edit worktree-agent-a775d9bee91f23536` (last commit 0ea697e8; it merges
cleanly). That brings the light switch, looks A and B, their CPU twin, the probe tools in
`.claude/probes/K1211/` and S1's Handoff.

## Why

Levi, 2026-11-05: "the pictures I've been seeing of highlights over junctions are bad. There
are clear lines/edges of the highlight within the interior of the junction. These seem to be
artifacts of how the original threads are constructed before the threads were fused and/or the
rounding was applied. These junctions need to appear as though they are one whole fused
seamless unit."

On K1190's card Levi answered "All four" (notes, `## K1211 (2026-11-05, Levi on K1190's
card)`). This stage is spot 3, the gold path's edge: in
`.claude/probes/K1139/out/s4/sheets/t6_ji149_x4_n.png` it is round in the top row (before
K1139's change) and a straight line with a corner in the middle and bottom rows.

S1 (its Handoff in `docs/design/K1211_seamless_junction_light.md`) found where the line comes
from: the traveled partition, where the fan's arm domains meet. The walked gold
(`paintTraveled`, K127's routed arms) is lit on one side of it only, and the pulse band follows
the same partition. It also found straight zigzags at the T (loop ji 89) and the four (loop ji
12) in its colours-only shots, which keep the traveled gold; a teal strip breaking the gold at
x4 ji 125; and a small dark triangle at loop ji 12, both on master. Neither of its looks ships:
both push a gold nub about 1 fh into the off-route arm, and A lights the whole fork. This stage
removes A and keeps B for S3.

Calls that bind every change here:

- K1139 (Levi): the pulse "splits, it runs toward the player, and it goes straight through with
  no dim moment"; "no dark wedge between two lit siblings". Its option C (the whole junction
  lit) was rejected.
- K81 (2026-10-12): Levi rejected gold through the angular blend, "a discontinuous flat nub"
  (`.claude/probes/K81/levi_junction_nub.png`). Gold never reaches into an off-route arm.
- A spot is judged against the approved version (the sheets' top row, before K1139), never
  against the last step.

## Goal

In every junction kind, at rest and while a pulse lights it, the walked gold ends in one round
edge, as the top row shows: no straight edge, corner, zigzag or break inside a junction, and no
gold past today's edge into an off-route arm. Where a pulse lights the gold, the lit gold ends at
that same edge. The fix is in the default mode (switch 0, what players see), not behind the
switch.

## Read first

- S1's brief and Handoff (`docs/design/K1211_seamless_junction_light.md`, after the merge): the
  switch, the looks, the tools, the stands, the results and the open questions.
- `docs/ledger_notes.md`, the entries `## K1211 (2026-11-05, Levi on K1190's card)` and
  `## K1211 (2026-11-05, S1 reviewed)` (Select-String the heading, read to the next `## `).
- `docs/design/K1139_pulse_junctions.md` and its stage briefs (`K1139_s3a.md`,
  `K1139_s3b_fix.md`, `K1139_s4_cycles.md`, `K1139_s4b_ridge_fade.md`): what each stage changed
  in the routed gold and the pulse.
- `docs/design/K81.md` and the header of `src/render/junction_routes.ts`: the route bands, the
  arms a path joins and the band's corner.

## Tasks

In this order. If the cap comes first, the Handoff says what is left.

0. **Where the edge went straight.** Find the change that turned the round edge of the sheet's
   top row into the straight one: the commit, the code, and why it now draws the partition.
   Confirm it on a shot before building on it.
1. **Remove look A**: `jLightA`, its twin `lightA`, its tests and its switch value. B keeps the
   value 2, so S1's records stay valid; 1 falls back to 0. Report the K320 (`k320_slim`) delta.
2. **The fix**, in mode 0. Prefer data built on the CPU (route records, arm strips, the traveled
   mask) to new shader text, and report the K320 delta of any shader text. Keep the CPU twin in
   step, and add unit tests that pin the edge's shape at a straight, a sharp, a T and a four.
   `npm test` green; re-freeze a pin only where the gold's edge is drawn, and name it. A pin
   moving anywhere else is a stop.
3. **Tools**, extending S1's in `.claude/probes/K1211/`:
   - A pure colours reference: the same shot with traveled cleared and the light off.
   - Check (a) calibrated on that reference, so it passes on the colours' own seams.
   - A nub check: gold pixels past master's gold edge in each off-route arm. The bar is 0.
   - A corner check on the gold's edge: trace its outline inside the junction and measure its
     sharpest turn. Set the bound on master's clean edges at cross ji 113 and x4 ji 102.
   - Checks (b) and (c) as S1 ran them. (c) is the locality check against master.
   - The x4 and loop clips re-centred (S1's open question).
   - What draws loop ji 12's small dark triangle on master, with a crop. Fix it here only if it
     is the gold's own edge.
   - One explore-mode shot: it draws, and the console has no error.
4. **Sheets**: columns master | branch (mode 0) | branch B (mode 2) | pure colours, at rest, for
   every kind: straight (cross ji 113), sharp (x4 ji 102, loop ji 13), T (loop ji 89, x4 ji
   125), four (loop ji 12) and x4 ji 149 beside K1190's top row; plus three pulse moments each at
   cross ji 33 and x4 ji 149. View every crop yourself at full size and give a verdict spot by
   spot: each kind, and K1190's spot 3 against the top row. Say what you see; pick nothing.
5. **Handoff**, appended below.

## Run I

Muse Run I (K1209, `docs/design/K1209_reapply_run_i.md`) may land on master during your stage.
It retires the fillet layer vote: every disc, wedge and strip on one bottom fan mesh, in
`joinery.ts`, `ribbon_renderer.ts`, `explore_gaps.ts` and `paint_state.ts`. At your end,
`git fetch -q origin` and rebase onto `origin/master` if it moved, keeping the one bottom fan
mesh where the two meet; then `npm test` again. If the rebase needs more than conflict lines,
don't do it: say what it would take.

## Out of scope

The webs' light (spot 4) and the pulse's soft front and wedges (spots 1 and 2): stage 3, after
Run I. Fire and collapse (K1210). Anything for Levi.

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); use the Read tool
  only right before an Edit, and to view crops.
- Never touch the main checkout (Muse runs there on master), another worktree or another probe
  folder. S1's worktree and its `out/` are read-only.
- Commit WIP on your branch at every milestone, broken or not; never push; never edit LEDGER.md.
- No helpers.
- Shots in real time (never `--virtual-time-budget`), under the perf lock through S1's
  `run_shots.ps1`; at most two browsers at a time; ports 5960-5969 only.
- Stop rule: stop when the tasks are done or 2 h after your start, whichever comes first
  (`Get-Date` at the start and at each milestone). Then commit WIP, append the Handoff and
  report. A compaction is not a stop: after one, re-read this brief and `git log`.

## Report

Plain words: what made the edge straight; the fix and its K320 delta; the checks' numbers per
stand; the sheets' paths and your verdict spot by spot; loop ji 12's triangle; the rebase; your
last commit's SHA. Then `Ledger items` and K1211's handle fields (owner, branch, last commit,
evidence, next).

## Handoff

(The stage agent appends here.)

### S2 stage agent, running notes (started 12:10:50 PT, cap 14:10:50)

Task 1 done in 30e07f21 (look A, its twin and `lightLevel` gone; JUNCTION_FRAG 43,758 -> 42,030;
master 40,495).

**Task 0: where the edge went straight. CONFIRMED on master's shots (13:05) for the split
junctions; the T and the four are a second mechanism, the crossing-gap mask.**

- Shots: `.claude/probes/K1211/out2/s2m/<stand>/` (master a371d164 on 5961, shoot2.mjs), crops
  `out2/t0/confirmA.png` (rows x4 ji 149, cross ji 113, x4 ji 125; columns live, no bands,
  pure colours), `confirmB.png` (loop ji 89, loop ji 12, x4 ji 102) and `attrib12_89.png`
  (loop ji 12 then 89; columns no bands, no light, webs hidden, gap mask off).
- x4 ji 149 and x4 ji 125: live has the straight edge with a corner (149) and the break (125);
  with no pulse bands declared the gold ends in one round edge at both. The bands' cut, below,
  is the cause there. Cross ji 113 and x4 ji 102 are the same with or without bands.
- Loop ji 89 (T) and loop ji 12 (four): the zigzags are the SAME with no bands and with no light
  at all, and with the webs hidden; with the crossing-gap mask off (`maskEnabled = false`) they
  are gone and the gold is one round band. So the gap mask draws them: the fan is hidden inside
  a crossing over thread's silhouette there, and what shows through is that ribbon's own paint,
  split gold/untraveled straight across the ribbon at the joint (inferred from the crops; the
  slot is not identified). Not the bands, and not the traveled partition.
- Loop ji 12's small dark triangle: in the pure colours shot too (traveled cleared, light off),
  bigger with the webs hidden, gone with the mask off. A crossing gap, not the gold's own edge:
  not fixed here (Task 3's rule).

- The commit: K1139 S3b, df30a7f3 (2026-11-04, "the fan shader"), drew the pulse bands through
  the junction fans and gave a fan pixel to its NEAREST band. K1139 S2's bec420f7 turned that
  into today's rule: a drawing band's weight is its cover times its yield to the shared bands,
  `1 - smoothstep(0, 3 px, d_draw - d_shared)`, so 1 on a tie.
- The code: `junctionField` in `src/render/junction_field.ts`, the pulse draw loop
  (`float yr = 1.0 - smoothstep(0.0, 3.0 * pxW, sDist[r] - dShared); float cw = sCov[r] * yr;`
  then `pm = armPaint(..., true, true)`, the UNTRAVELED rows, and `c = mix(c, pm, cw)`), twin
  `cpuJunctionField` in `src/render/ribbon/joinery.ts` (the `PULSE_COV[r] * (1 - pulseSmooth(...
  PULSE_DIST[r] - dShared))` lines).
- Why it draws the partition: at a junction the pulse splits at, the drawing band (Q, C) and
  the gold pair (Q, P) share arm Q. The drawing band paints arm C's and arm Q's untraveled
  colours wherever it is no farther than the shared band, after the gold loop has drawn the
  gold's round cover. So the gold survives only on the shared band's side of the bisector
  between the two bands: a straight edge, with a corner where the bisector meets the gold's
  round edge. On arm Q's own centreline the two distances tie, the yield is 1, and Q's
  untraveled colour is painted over the gold: the teal strip at x4 ji 125 (inferred, to check
  on the shot). The bands are declared at rest too (the fabric's `computePulseBands().feed`,
  re-declared every awake frame), so the cut shows without a pulse.
- S1's "the traveled partition, not the bands" does not hold. `paintTraveled`
  (`paint_state.ts` resolveRoutes) feeds only K127's covered set (`fullJn`, the record's J1.z):
  a junction only partly traveled draws its base from the untraveled rows with no per-arm
  split. And S1's colours-only and no-band shots were never declared: the fabric re-declares
  the paint every awake frame (`fabric_maze_renderer.ts` update(): `setPaint(..., 
  this.computePulseBands().feed)`), which is why S1's c shots equalled its g shots.
- The confirming shot: `.claude/probes/K1211/shoot2.mjs` wraps the instance's `setPaint` so the
  probe's own declarations stick, and shoots the live declaration (L0) against the same state
  with no pulse bands (nb) on master a371d164 (preview on 5961). Expected if this is right: nb
  shows the round edge at cross ji 113 and x4 ji 149, no teal strip at x4 ji 125, no zigzags at
  loop ji 89 and 12. Result: as expected at 149, 113 and 125; not at 89 and 12 (the gap mask,
  above).

Tools: `run_shots2.ps1` is S2's copy of S1's `run_shots.ps1` (owner `K1211-S2`, the same lock
rule) that runs `shoot2.mjs` jobs.
