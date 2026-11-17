# K1433: is rp=gf's outline built the right way? A one-day trial (Claude agent stage, probes only)

## Why

Levi, 2026-11-16: "Taking a step back: do we have the right overall design and approach? ... We've essentially
spent weeks going nowhere on this (though, it seems like our latest design might be better)." He approved this
trial ("go").

The bar is Levi's (`docs/design/K1407_c1_bar.md`, first section): at a junction or under-tail end, the over
thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver. Form B is not the bar.

The coordinator's reading, to test and not to assume:
- `eval.ts` step 4 assembles the outline from pieces: each member's side foot and each fillet's arc is a term, and
  burial rules hide the parts under a neighbour. Every gap between two rules shows as a notch, wedge or stub, and
  each fix is another rule (c3's vertex cap, c4's fillBur ratio). The mesh renderer failed the same way
  (`joinery.ts`).
- Steps 2, 3 and 5 decide membership and over/under per pixel by blending (ramps, the equal-depth tie). Spot 6,
  spot 16 and the smudges come from there (Handoffs c3 and c4).
- The census (`k1407c1_bar.ps1`) counts differences from form B, with 25 exceptions. Nothing tests the bar itself.

K1407 c5 is running on `eval.ts` and `gf_glsl.ts` in another worktree, and Muse works in the main checkout.
**You change no file under `src/` or `test/`.** Everything you write goes under `.claude/probes/K1433/` and this
brief. Import from `src/` freely; subclass or copy `GfEval` into the probe directory to change it.

## Part 1: a direct test of the bar (do this first; it judges part 2)

Build a probe that scores one rendered scene with no reference image. From the CPU evaluator's per-pixel output
(ink, cov, label, at 4 px per aa or finer), find:
- **breaks**: stretches of a covered surface's exposed edge where the outline's ink falls well below the ideal
  band's;
- **stray ink**: ink farther than the band's width plus aa from any exposed edge, inside a fill or on paper.

How you define "exposed edge" and the thresholds is yours. It is validated, not argued:
1. It flags each known open spot on master: spot 16, spot 6, the two smudges (`K1407_c5_bar.md` lists them).
2. It flags the def seam notches on d547dab6 and not on master (c4 fixed them), and the muse_hash eye on
   13365909 and not on d547dab6 (c3 fixed it).
3. On master it does not flag the 23 spots c2 fixed (`.claude/probes/K1407/out/c4/spots.txt` holds all 29).
4. Run it over the 12 census scenes on master. Report the count, and look at a sample of 20 finds at 4x: how many
   are real misses of the bar by eye. State that precision.

## Part 2: the outline as the contour of one field per surface

In a probe copy of the evaluator, keep steps 1, 2, 3 and 5 as they are and replace step 4:
- Per surface, compute ONE signed distance to the union of its members' tubes and its corner fills.
- Coverage is a step on that distance, and the outline's ink is the band at its edge. No per-piece outline terms,
  no burial, no vertex cap, no fillBur.
- The union's inside distance is not the min of the members' at concave corners. Choose how to handle it (a smooth
  union, the fillet shapes as members of the union, an exact concave-vertex term) and say what each choice does to
  the corner's shape. A corner shape is a look that Levi judges: show it, don't pick it by a metric.

Then compare master's evaluator and yours:
1. The 29 spots at 4x: master gf | union | rp=outline, plus today's fill where c4 captured it. Name each spot as
   better, the same or worse by eye.
2. Part 1's test on the 12 scenes: breaks and stray ink, both evaluators.
3. A cost proxy per pixel (terms evaluated, loop trips) on two scenes, both evaluators.
4. Which of master's rules the union makes unnecessary, by name, and which open spots it does not touch.

## Part 3: grouping and over/under at table time (written assessment only)

For spot 6, spot 16 and the two smudges, say what per-pixel decision causes each (the handoffs have the arms and
keys). Then say whether the knot's graph (junction, crossing and end nodes; `tables.ts` builds from it) could
decide that grouping and order when the tables are built, what would still need a per-pixel blend (sliding
crossings, the cap ramps), and what it would cost to try. No code.

## Done

1. Part 1's probe, its validation table (the four checks above), and its numbers on master.
2. Part 2's sheets, numbers and rule list.
3. Part 3's assessment.
4. A recommendation at the top of the handoff, in plain words: replace step 4 with the union, keep patching rules,
   or a mix; what Levi would have to judge by eye (with the picture paths); and the first two stages you would
   brief next.

## How to work

- Start with `git merge --ff-only origin/master` in your worktree and `Get-Date`.
- Use PowerShell. Read code through the shell; the Read tool only just before an Edit.
- CPU only: no browser is needed. If you do render in one, use ports 5520-5539, never `--virtual-time-budget`,
  and never touch the phone.
- For a run of more than a few minutes on all cores, take `$env:TEMP\claude-perf.lock` (one line: owner, start,
  what), wait inside one blocking command if it is held, and delete it after.
- Commit WIP at every milestone, broken or not. Never push. Never edit LEDGER.md. Never use bare `git stash`.
- Helpers run on sonnet for mechanical work, with this stop rule.
- Report what you measured apart from what you infer.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1433` here, commit, and report. End the report with the recommendation, the sheet paths, the
numbers, a `Ledger items` list and K1433's handle fields.

### Handoff K1433

Stopped at 19:10 on 2026-11-16 (started 18:30:48). Nothing under `src/` or `test/` changed. Everything is in
`.claude/probes/K1433/` (scripts and small results force-added).

**Recommendation: a mix. Keep step 4 as it is, stop patching the membership and tie rules, and try deciding
grouping and over/under from the knot's graph when the tables are built (steps 2, 3 and 5).**

- Do not replace step 4 with a union field. A max (or smooth max) of member depths is exact outside the shape and
  wrong inside it wherever a member's nearest edge is buried in another member. Master's burial rules, arc terms
  and vertex cap are that missing inside distance, not accidents. Every union variant I built either draws stray
  ink (fillets as members), or changes the junction's shape and pools ink in the corner (tubes only, smooth union).
- The four open spots are not step 4's. They look the same in every union variant, and the test's tie-class counts
  over 12 scenes are the same with and without step 4 (829 vs 825 stray, 174 vs 171 breaks).
- What the 12-scene scan shows that the 29 spots do not: the smudge family is large. Master has about 2,000
  tie-class finds, and all 11 I looked at were real dark smudges in a fill. That is where the work is.

**For Levi to judge by eye** (all under `.claude/probes/K1433/out/`):
- `sheet_1.png` to `sheet_6.png`: the 29 spots in `spots.txt` order, 5 per sheet, columns master gf | fillets as
  members | tubes only (sharp corner) | smooth union (k = 0.4 h) | rp=outline. The question: is the deep V of
  columns 3 and 4 a corner he would want at all, in place of master's fillet? If not, the union idea is closed.
- `sample_1.png` to `sample_4.png`: 20 finds of the test on master (left) with the flagged pixels in blue and the
  exposed edges in red (right). Rows 4-5 of `sample_2`, and all of `sample_3` and `sample_4` rows 1-4: are these
  smudges the defect he means? They are the bulk of what the test finds.
- `sheet_notch_d547.png`: the def notches on d547dab6 | master | smooth, which the test cannot see (below).
- c4's today-fill captures were not added to these sheets; they are in `.claude/probes/K1407/out/c4/sheet_c4b_tie_today.png`.

**Part 1: the test** (`k1433_lib.ts`; `k1433_spots.ts` per spot, `k1433_scan.ts` per scene). It reads the
evaluator's own coverage, labels and ink, no reference. Two halves: a depth half (ink against the ideal band from
each surface's own depth, single-member zones only) and a raster half (exposed edges = coverage or surface label
changes; a break = no ink of 0.6 within aa of an edge; thin = ink under 0.5 within 0.8 (W - 2aa) on the inked side;
stray = ink over 0.25 farther than W + aa + 1.5 px from every edge). Each find carries a class: plain, ramp, tie, thru.

| validation (measured, 480 px crops, R 0.28) | result |
|---|---|
| 1. open spots on master (16, 6, both smudges) | all four flag (`spots_table.txt`) |
| 2a. the eye on 13365909, not on d547dab6 | pass (`dbreak:plain 7`, `rthin:plain 1295`; clean on d547dab6) |
| 2b. the def seam notches on d547dab6, not on master | FAIL: clean on both |
| 3. the 23 c2 spots, the eye and the notch spots on master | all 25 clean |
| 4. 12 scenes on master at 100 px/unit | 4,187 finds at 2,703 sites (`scan/summary.txt`) |

- 2b, why: c4 measured those notches as an ink dip of 0.10 to 0.22 over 31-35 px. The test's thresholds need ink
  to fall below 0.5-0.6, so shallow dips in a band pass. Lowering the bar to catch them was not tried; it would
  need the band's profile along the edge, not a threshold per pixel.
- Precision by eye on a seeded sample of 20 (`sample20.txt`): tie and ramp classes 11 of 11 real (smudges, a
  smeared band); plain class 0 of 9 (5 thin finds are the fill beside an ordinary crossing, 3 breaks show nothing
  at 4x and do not repeat at 480 px/unit, 1 stray unclear). So: use the tie and ramp classes (2,030 finds on
  master: stray 829 + 411 + 15, breaks 174 + 236 + 16, thin 329 + 20), and ignore plain at this resolution.
- Other limits: it cannot see a wrong fill, and a label flip at a membership ramp counts as an edge.

**Part 2: the union** (`eval_u.ts`, `GfEval.MODE`; steps 1, 2, 3, 5 untouched).

| variant | concave corner | seen at the 24 non-open spots |
|---|---|---|
| fill (fillets as members) | master's fillet | worse: a stray black triangle or sliver in the fill wherever the corner fill is in frame |
| tubes (no fillets) | sharp V, paper notch much deeper | different shape; ink mitred at the inside corner |
| smooth (smooth max, k 0.4 h) | rounded V, same deep notch | different shape; ink pooled at the inside corner; small glitches at spots 1 and 4 |
| ring (16 + 8 taps on circles W and W/2) | meant to be exact | not usable: taps leave the pixel's gathered pieces and draw wedges; dropped |

- The 29 spots by eye: none better in any variant. Spots 2-5 (16, 6, both smudges) keep their smudges in every
  variant; spot 6's black wedge is absent in tubes and smooth only because the coverage there changed.
- The test on 12 scenes: master 4,187 finds, tubes 5,353, smooth 5,524. The increase is `rstray:plain` (10 ->
  956 / 1,122), the corner pools; one checked in a picture (`dbg/muse_default_tw_22.42_2.92_dbgs.png`), the rest inferred.
- Cost proxy per covered pixel (muse_hash, def): step 4's extra piece-distance calls are 0.23 and 0.29 on master
  (2.6 and 2.5 segment tests) against 39 and 28 segment tests in the gather; the union has 0. Wall time per pixel
  was noise under parallel load (2.3-3.7 us either way). Step 4 is about a tenth of the segment work.
- Rules a union would remove: side-foot burial, corner-fill burial (`outsideArms`), the arc terms and their burial,
  `fillBur`, the tangent-point terms, the vertex cap. Only tubes and smooth remove them, at the price of the corner.
  Keeping master's fillet needs all of them back. Not touched by any union: spots 16, 6 and both smudges.

**Part 3: assessment (inference from the c3-c5 handoffs and `eval.ts`; no code run).**
- Spot 16: step 3 gives corner k50's fill no gathered member piece against arm c75, so the fill and the arm are two
  surfaces and step 5 tie-blends them. Spot 6: `member()`'s second loop ramps arm 54 to 0 through arm 55's cut, so
  chain c11 becomes its own surface and ties with group g36. Smudges: step 5 blends two surfaces whose keys differ
  by less than zt (c33 / c79, c67 / c8). All three are one decision made per pixel from whichever pieces happen to
  be gathered: "are these two the same surface, and if not which is on top".
- The graph knows both answers. Which arms belong to a junction and where each arm's cut lies are table facts
  already (`kG`, `kCa`, `kCb`, the cuts). A table of arc-length intervals per chain -> surface id would make
  membership a lookup that is the same for every pixel, and a fixed order per junction and per crossing would
  replace the tie blend between surfaces the graph can order.
- Still per pixel: which crossing a pixel belongs to as crossings slide (the order is per crossing, its place
  moves), the key's interpolation along arc length between pins, cap and reveal ramps, and anti-aliasing where
  two surfaces really meet.
- Cost to try: one day in a probe copy (replace `member()` with the interval lookup, order ties by the table,
  judge by tie-class counts and the 29 spots); then two to three days in `src/` with the GLSL mirror and the pins.

**Next two stages to brief**
1. Probe: membership from a table-built interval list and tie order from the graph, in a copy of `eval.ts`.
   Bar: the tie-class counts above fall on all 12 scenes, the 25 clean spots stay clean, spots 16 and 6 and both
   smudges go clean, sheets for Levi.
2. Tighten the test: a band-profile check along each exposed edge so the d547dab6 notches flag, and a crossing
   exemption so the plain class stops firing; then it can replace the reference-based census bars.
