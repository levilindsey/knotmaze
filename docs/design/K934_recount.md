# K934: K868, a fixed checker, the settled rules as defaults, a clean re-count (agent brief)

Stage brief (coordinator, 2026-10-27). Parent: K868
(`docs/design/K868_field_border.md`). Previous stages: K922
(`docs/design/K922_junction_extent.md`: Step 5 and `## Handoff`) and K940
(`docs/design/K940_label_fixes.md`: `## Results` and `## Handoff`). Read
those before anything else.

## Why

S3 will put the label ink (K915) into the app, and it copies whatever rule
the oracle follows. K922 and K940 left that ink's switches undecided, and
Levi handed those technical calls to the coordinator (2026-10-27). The rule
rounds now gain little (K940's best: extra 34 to 31, missing 36 to 35, #16
13 to 11), so before any more rule work this stage:

1. fixes the free-end check, which counts two close legs or a filled corner
   as one exit and so reports a free end where the ink is continuous (52 of
   label ink's 83, K922 Step 5);
2. makes the settled calls the oracle's defaults and removes the switches
   that lost (K942);
3. picks the junction extent with the fixed check;
4. re-counts the 12 scenes from that base;
5. shows what remains at the size a player sees it, so the coordinator can
   choose between more rule work and the app port (S3).

## The calls (the coordinator's; do not reopen them)

- `depth: "overlap"` and `endSnap` become defaults, endSnap
  unconditionally (K922: a float-bug fix in `clusterAt`).
- Label ink: `labFill: "yieldOrder"` in K940's crossed form becomes the
  only form, with `labTie: "surface"`.
- Removed: `labFill` "arcs" and "yield", `labFillDepth`, `labCap`,
  `labCapReach`, and the `labYieldChain` switch (crossed is the only form).
- `ink: "group"` stays the default ink until S3. Where a new default
  changes group ink's output, keep the change and report it.

## Order

1. **The checker.** Fix the exit count in the free-end check (`indep.ts`;
   K922's copy is in `.claude/probes/K922/`): count exits as connected runs
   of ink cells on the ring, or as components of the ink in an annulus, not
   by angular gaps (K922 Step 5).
   - Unit cases: a straight end (one exit, a free end), a band (two), an L
     whose inside is filled (two), a V whose legs are under 0.5 rad apart
     (two), a T (three), a thick blob whose exits merge.
   - Against the old count on K940's crossed candidate: list the free ends
     the fix drops, crop ten of them and confirm the ink is continuous
     there. Look at every free end it adds.
   - Keep the old count behind a flag, and report both in step 4.
2. **The calls as defaults** in `src/render/field/oracle.ts`, with their
   `OracleParams` docs. Add unit tests for the crossed yield order (none
   exist; K940's `## Results` says where near and crossed differ) and for
   `labTie: "surface"`. `npm test` passes.
3. **The extent.** Three candidates on the new defaults:
   - `span` (today's rule);
   - `part`;
   - `part` stopped short of crossing cuts. K922's `## Handoff`: an arm
     carried into a crossing's overlap now ends at its cut (23 free ends);
     this walk stops before it enters that overlap.

   Judge by the fixed free-end check first, then extra plus missing, then
   #16. Crop d1 (`part` removes its island) and the five sites where the
   candidates differ most. Adopt the winner as the default, and remove the
   losing values.
4. **The re-count** on the 12 scenes under the adopted set: extra, missing,
   free ends (the new count and the old), and #16, per scene and in total,
   beside K940's base (`INK=label DEPTH=overlap ENDSNAP=1`) and group ink.
   Sort what remains by mechanism as far as the tools allow (`cls.ts` has
   two known caveats: ledger K954).
5. **Sheet K: what remains, at play size.** For each mechanism left, take
   its worst two or three sites. Show each crop at the scale the app would
   draw that scene on the phone: the scene fitted to the screen's width in
   device pixels, as the app's camera fits it (find the phone's width in
   earlier phone probes' notes, else use 1080). Put the same crop at 4x
   beside it, and group ink beside label ink. Look at every crop and say
   whether the defect shows at play size. Write
   `.claude/probes/K934/K_recount.png` and its crops.

Not this stage: K943 (the over line inside a junction, next, behind a
flag), K953 (M1), K952's traces and S3.

## Rules

- **Worktree.** `.claude/worktrees/k934-recount`, on branch
  `k934-recount`. The coordinator made it, and its `node_modules` is a
  junction to the main checkout's. Copy the probes you reuse from the main
  checkout's `.claude/probes/` (K940's set and its helpers, K922's
  `indep.ts`) into `.claude/probes/K934/` in the worktree, and point their
  imports at the worktree's `src/`. Keep everything there.
- **Stop rule.**
  - Run `Get-Date` at the start and at every milestone.
  - Stop when steps 1-5 are done or 2 h after the start, whichever comes
    first.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
- **Commits.** Commit work in progress to the branch at every milestone,
  broken or not. Never push. `npm test` passes in the worktree at the end.
- **Not allowed.**
  - No phone and no timing.
  - Never run `npm run build` in the main checkout.
  - Never touch processes you did not start.
  - Never use Levi's Chrome profile.
  - Upload nothing; the coordinator uploads the sheet.
- **Shell.** Use PowerShell. Read code through the shell (`Select-String`,
  then `Get-Content | Select-Object`).
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Look.** Crop and look at your own images before you call anything
  right or fixed.
- **Write-up.** Append `## Results` (per step) and `## Handoff` to this
  brief, on the branch.
- **The final report** gives:
  - the checker: what changed, the unit cases, and the dropped and added
    free ends you looked at;
  - the defaults changed and the switches removed, with the tests added;
  - the extent table and the winner;
  - the re-count table (step 4);
  - sheet K's path, and for each mechanism whether it shows at play size;
  - your recommendation: more rule work (which) or S3 now;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K934's current handle fields.

## Results

Probes, outputs and logs: `.claude/probes/K934/` in the worktree
(untracked). Counts are samples/stretches unless they say otherwise;
"fe" is free ends, the new count first and the old one in brackets.

### Step 1: the checker

- **What changed.** `indep.ts` (K922's copy) counts a side-band end's
  exits with `exits.ts`: flood the ink component in the disc R = 0.8h
  (grid W/2, 8-connected), cut it with rings every half cell from R in
  to 2.5 cells (each 1.5 cells thick), and count the connected runs of
  ring cells whose component reaches the outer ring; the count is the
  largest over the rings. One exit is a free end. The old angular count
  stays: `EXITS=angle` makes it the primary, and every JSON carries both
  (`freeEndsRuns`, `freeEndsAngle`; `freeEnds` is the primary).
- **Unit cases** (`exits_test.ts`, all pass): straight end 1 (also
  oblique, and a 2W-thick end), band 2 (also off its axis), L with its
  inside filled 2, L joined by an arc at the ring 2 (old: 1), V with
  centrelines 0.7 rad apart, an ink gap of 0.31 rad at the ring, 2 (old:
  1), V 1.2 rad 2, T 3 (also centred on the stem's end), a thick blob at
  a line's end 1, a thick blob whose two 2W legs merge at the ring 2
  (old: 1), an isolated dot 0, a stub forking into two short prongs 1.
  Limits, reported and not asserted: a V whose centrelines are 0.45 or
  0.35 rad apart reads 1 (its legs touch inside R; the old count reads
  1 too), an L joined by an arc 0.35W inside the ring reads 1, an L
  filled solid past R reads 1.
- **Against the old count** on K940's crossed candidate (the new
  defaults, label ink, the span extent of the time): new 31, old 83.
  The fix drops 52 and adds none, so there was no added free end to look
  at. Twelve dropped ones cropped (`dropped/A`..`L`, magenta = new,
  orange = old): continuous ink at A, B, D, E, H, J, L (bends, loops and
  merges), at C (a cusp's tip) and at K (the tip of a thin crescent
  sliver where two lines part); at F continuous, with a spur end
  nearby that is not on a side band (neither count sees it); G is a
  closed lens island (continuous; a separate stroke's two ends stay in
  the new count). **I is a real dangling end**: an overshoot tail about
  0.15 world past a spur, shorter than R, so the outer rings see two
  exits and the count reads 2. A residual of the runs count.

### Step 2: the calls as defaults

`src/render/field/oracle.ts` (24ba99b7): `depth: "overlap"` is the
default; endSnap is unconditional (the switch is gone); label ink's
yield order is the crossed form only, with `labTie: "surface"` the
default. Removed: `labFill` ("arcs", "yield" and the switch itself),
`labFillDepth`, `labCap`, `labCapReach`, `labYieldChain` and `endSnap`.
Tests (9a15ff75, `test/render/field/label_yield.test.ts`, 5 cases on
j_cross): the table decides the crossed order (2 over 0 yields, 0 over 2
wins, no crossing yields), a point nearer chain 1 (which never crosses
chain 2) still reads chain 0's crossing at cr 6, where K940's near form
differed, and at an equal-depth overlap `surface` keeps the cluster's
member where `chain` takes the higher chain id. Group ink stays the
default ink; its counts under the new defaults are in step 4 (old count
203 against master's 228).

### Step 3: the extent

12 scenes, new defaults, `NOGEO=1`:

| extent | ink | extra | missing | fe new (old) | #16 |
|---|---|---|---|---|---|
| span | label | 59/31 | 55/35 | 31 (83) | 20/11 |
| part | label | 69/41 | 95/49 | **25** (77) | 66/17 |
| partShort | label | = span on all 12 scenes (no stretch or free end differs) | | | |
| span | group | 51/28 | 92/46 | 140 (203) | 50/19 |
| part | group | 61/36 | 121/56 | 140 (203) | 85/23 |
| partShort | group | 51/28 | 91/45 | 141 (203) | 50/19 |

First, a bug: K922's part walk ran only inside the crossing cut's loop,
so it added cuts and never moved a final span end; it now runs again at
the final caps and corners (24ba99b7). partShort stops that walk before
it enters a crossing's overlap, and on label ink it never moved a span
that span did not already end.

**Winner: part** (31f5a171; `span` and `partShort` removed, the walk
runs on every k883 build). By the brief's order it wins the first
criterion, free ends 25 against 31 (13 only under span, 7 only under
part), and loses the other two: extra + missing 164/90 against 114/66,
#16 66/17 against 20/11. Almost all of the loss is one class, "(f)
under the fill of jN": an arm the walk carries on now ends inside its
junction's fill, where the census expects a line (missing 41/16, from 2/2
in K940's base) or the over line (#16 50/8, none in the base). That is
K943's over line inside a junction, the next stage, not new junction
debris. Crops (`ext3/span` against `ext3/part`, 360 px at 6x):
- d1, muse_hash (20.30, 1.40): part removes the sawtooth band and its
  island; one free end moves, and a thin crescent sliver remains.
- g2, g41_def_tw64 (22.60, 17.80): part removes the jagged web and its
  free end.
- r1, g41_ring_tw42 (21.05, 17.95): part removes the band line's free
  end; a small notch remains.
- u3, user_tw42.lightpaper (20.95, 4.75): part removes both overshoot
  tails and draws clean L corners; the spur ends stay under both.
- m4, muse_hash (3.10, 27.80): span draws a ladder of crossbars and a
  spike with a free end; part leaves a line that stops short (a free end
  at (3.07, 28.27), the worst one left) and a small closed island below
  it.
- g5, g41_def_tw64 (0.90, 14.40): part removes a dangling stub (two free
  ends); a lens wedge with one free end stays under both.

Group ink changes with part (kept and reported, per the calls): free
ends equal, extra +10, missing +29, #16 +35, the same class as label's.

### Step 4: the re-count

The adopted set: the new defaults with extent part; label ink beside
K940's base (`INK=label DEPTH=overlap ENDSNAP=1`, before this stage) and
group ink on the adopted set. Per scene: extra, missing, fe new (old),
#16.

| scene | adopted, label | K940 base | adopted, group |
|---|---|---|---|
| muse_hash | 40/23, 7/7, 12 (38), 7/4 | 48/24, 12/8, 13 (40), 11/6 | 37/20, 14/11, 62 (93), 12/6 |
| muse_default_tw | 0/0, 1/1, 1 (2), 0/0 | 0/0, 1/1, 1 (2), 0/0 | 0/0, 1/1, 5 (6), 0/0 |
| def | 0/0, 6/2, 1 (2), 0/0 | 0/0, 6/2, 1 (3), 0/0 | 0/0, 7/2, 6 (8), 0/0 |
| fat | 0 | 0 | 0 |
| ring | 0/0, 2/1, 0 (0), 0/0 | 0/0, 3/1, 0 (0), 0/0 | 0/0, 3/1, 1 (1), 0/0 |
| user_tw42.lightpaper | 0/0, 9/4, 0 (0), 11/2 | 0/0, 1/1, 1 (2), 0/0 | 0/0, 9/4, 2 (2), 11/2 |
| g41_def_tw42 | 0/0, 4/2, 0 (0), 5/1 | 0/0, 2/1, 1 (1), 0/0 | 0/0, 6/2, 1 (1), 8/1 |
| g41_def_tw64 | 5/4, 38/20, 8 (13), 18/7 | 4/3, 32/16, 7 (11), 13/7 | 3/3, 48/23, 44 (52), 27/10 |
| g41_ring_tw42 | 0/0, 9/2, 0 (0), 14/1 | 0/0, 0/0, 1 (1), 0/0 | 0/0, 9/2, 3 (3), 14/1 |
| g41_ring_tw64 | 0/0, 7/3, 0 (1), 0/0 | 0/0, 7/3, 0 (1), 0/0 | 0/0, 10/3, 3 (4), 2/1 |
| g41_user_tw42 | 0/0, 9/4, 0 (0), 11/2 | 0/0, 1/1, 1 (2), 0/0 | 0/0, 9/4, 2 (2), 11/2 |
| g41_user_tw64 | 24/14, 3/3, 3 (21), 0/0 | 14/7, 3/2, 4 (20), 0/0 | 21/13, 5/3, 11 (31), 0/0 |
| **total** | **69/41, 95/49, 25 (77), 66/17** | 66/34, 68/36, 30 (83), 24/13 | 61/36, 121/56, 140 (203), 85/23 |

By mechanism (`mech.mjs`, the census's own class and reason; cls.ts's
two caveats, ledger K954, apply to the extra classes):

| mechanism | adopted, label | K940 base | adopted, group |
|---|---|---|---|
| missing: the chain's group on top | 54/33 | 66/34 | 78/40 |
| extra: in a junction's core, own chain | 51/27 | 45/21 | 46/24 |
| #16: under a junction's fill (K943) | 50/8 | 0 | 52/8 |
| missing: under a junction's fill (K943) | 41/16 | 2/2 | 43/16 |
| free end, one exit | 24 | 29 | 138 |
| #16: the chain's group on top | 16/9 | 24/13 | 32/14 |
| extra: in a junction's union, own chain | 7/5 | 4/2 | 7/5 |
| extra: core or union, another chain, the hider's, or a merged core | 11/9 | 17/11 (one under a crossing) | 8/7 |
| #16: buried, no culprit found | 0 | 0 | 1/1 |
| free end, no exit (an island) | 1 | 1 | 2 |

Worst sites: missing, group on top: g41_def_tw64 (0.65, 14.08) n 6, def
(19.47, 22.47) and (19.81, 22.23) n 3. Extra in the core: muse_hash
(24.34, 22.53) j81, (17.13, 3.26) j149, (16.64, 18.51) j140, n 3 each.
Under the fill: g41_ring_tw42 j24/1 (21.13, 17.87) (#16 14, missing 7),
g41_def_tw64 j177/0 (22.32, 17.33), user_tw42.lightpaper j56/1
(20.82, 4.97). Free ends: muse_hash (3.07, 28.27), (4.78, 33.44). Island:
g41_user_tw64 (9.79, 12.93).

### Step 5: sheet K, what remains at play size

Sheet: `.claude/probes/K934/K_recount.png` (14 sites, 84 cells; for the
coordinator to upload). Crops: `sheetk/label/` and `sheetk/group/`
(`<site>_play.png`, `<site>_4x.png`). The sites' centres, magnified (the
play crop's middle 32 px at 12x, the 4x crop's middle 128 px at 3x):
`sheetk/centre_ac.png`, `centre_bf.png`, `centre_gh.png`. Scripts:
`sheetk.ps1` (the renders), `sheetk_rows.mjs` and `mksheet.mjs` (the
sheet), `sheetk_centre.mjs` (the centres), `playscale.ts` (the scale) and
`at_s.ts` (a census stretch's point from its chain and arc length: the
census prints #16 stretches without one).

Play size is the app's camera fit, `min((sw - 80) / w, (sh - 80) / h, 90)`
CSS px per world unit, on the Pixel 11's 411x753 CSS px viewport
(`probes-phone.md`). The phone's DSF is 2.625, but the app draws at
`min(devicePixelRatio, 2)` (`main.ts`), so 822 px across, and the browser
stretches that 1.31x onto the glass. That is 17.3-27.0 drawn px per world
unit, 0.72-0.81 of the scene camera (muse_hash 0.814, def 0.785,
g41_def_tw64 0.788, g41_ring_tw42 0.808, user_tw42.lightpaper 0.723,
g41_user_tw64 0.778). Each row: label ink, then group ink, each at play
size, the same pixels magnified 4x, and the crop rendered at 4x the play
scale. No marks drawn; the site is each crop's centre.

| site | mechanism | where | label ink, play size | group ink, play size |
|---|---|---|---|---|
| a1 | missing: the chain's group on top | g41_def_tw64 (0.65, 14.08), n 6 | a closed lens, about 8x4 px | an open hook |
| a2 | the same | def (19.47, 22.47), n 3 | the band's end capped (4 px) | the band's two lines left open |
| b1 | extra: in a junction's core, own chain | muse_hash (24.34, 22.53) j81, n 3 | the line ends about 3 px inside the junction | the same |
| b2 | the same | muse_hash (17.13, 3.26) j149, n 3 | a teardrop loop | the same |
| c1 | under a junction's fill (K943) | g41_ring_tw42 (21.13, 17.87) j24/1 | a corner with a 1 px notch | a 1 px break |
| c2 | the same | g41_def_tw64 (22.32, 17.33) j177/0 | continuous | a loose dash, about 4 px |
| c3 | the same | user_tw42.lightpaper (20.82, 4.97) j56/1 | a 1 px step | a small hook |
| d1 | free end, one exit | muse_hash (3.07, 28.27) | the line stops 2-3 px short of a small closed loop | the same, the loop notched |
| d2 | the same | muse_hash (4.78, 33.44) | a solid spur, about 4x8 px, off a line | the same, a little thinner |
| e1 | extra: in a junction's union, own chain | g41_user_tw64 (3.51, 11.96) j60, n 2 | a clean three-way joint | a 1 px notch |
| f1 | free end, no exit (an island) | g41_user_tw64 (9.79, 12.93) | a hairline sliver, 1 px wide and about 8 px long, dark on a dark ground | a speck, not visible |
| g1 | extra: in a junction's core, another chain | g41_user_tw64 (14.77, 12.26) j4, n 2 | a clean branch | the same |
| h1 | #16: the chain's group on top | muse_hash ch 70 s 10.72 = (9.69, 25.95), n 3 | the band's end closes into a point (a chevron) | two loose line ends |
| h2 | the same | g41_def_tw64 ch 61 s 14.00 = (26.14, 5.48), n 3 | the same | the same |

Does each mechanism show at play size?

| mechanism | label ink (adopted) | group ink (today's default) |
|---|---|---|
| free end, one exit | **yes**, at its worst sites (d1, d2: muse_hash, tight loops) | yes, the same sites |
| #16: the chain's group on top | as a shape, not a gap: the band ends in a point (h1, h2) | yes: two loose line ends |
| missing: the chain's group on top | no | yes, faintly: an open hook, a band end left open |
| under a junction's fill (K943) | no: a 1 px notch or step at most | barely: a 1 px break, a 4 px dash |
| extra: core or union, own chain or another | no | no |
| free end, no exit (an island) | barely: a 1 px hairline, dark on dark | no |

**Recommendation: S3 now, on label ink as adopted** (S3's other gate,
Levi's look at sheets B2 and F, is the coordinator's). At play size,
label ink shows two things: a few free ends at tight loops (d1, d2) and
the pointed band ends (h1, h2: a look, not a gap). Group ink, today's
default, shows the same free ends plus loose dashes and open band ends.
K943's class is the largest left by count (#16 50/8, missing 41/16) but
does not show at play size in label ink; it can stay next behind its flag
for the counts without holding S3, since it changes no default. One small
rule follow-up: the free ends at tight loops (d1's short line, d2's
spur), both in muse_hash.

## Handoff

- **State.** Steps 1-5 done, stopped at the end of step 5. Branch
  `k934-recount`, unpushed; the code's last commit is 31f5a171 and this
  write-up is the commit after it. `npm test` passed in the worktree at
  31f5a171 (179 files passed, 2 skipped; 2376 tests passed, 6 skipped;
  `.claude/probes/K934/npm_test_final.log`); only this brief changed
  since.
- **The code.** `src/render/field/oracle.ts`: the calls are the defaults,
  and K922's part walk is the only extent (it runs on every k883 build and
  reaches the final spans). Removed: `labFill`, `labFillDepth`, `labCap`,
  `labCapReach`, `labYieldChain`, `endSnap`, and the extent switch with
  its `span` and `partShort` values. New test:
  `test/render/field/label_yield.test.ts` (5 cases).
- **The probes**, all in `.claude/probes/K934/` (untracked):
  - the checker: `indep.ts` and `exits.ts` (`EXITS=angle` for the old
    count), `exits_test.ts` (the unit cases);
  - the census: `pwsh run.ps1 <label> [ENV=VAL ...]` runs the 12 scenes
    in 6 parts (`<label>_p1..6.log`, JSON in `indep/`,
    `indep/summary.<label>.md`, which keeps only the last part's
    totals). The adopted set is `partfix` in label ink and `gpart` in
    group ink (`final` re-ran part 3 on the committed code: the same
    counts); `base` is K940's base; `span`, `short`, `group` and
    `gshort` are step 3's other candidates; `part` predates the walk's
    fix. `table.mjs` gives the per-scene table, `tally.mjs` and
    `mech.mjs` sort by mechanism;
  - the crops: `dropped/` (step 1), `ext3/` (step 3), `sheetk/` and
    `K_recount.png` (step 5).
- **Open** (the coordinator's report lists them as ledger items): the
  runs count's limits (step 1); the free ends at tight loops (d1, d2);
  K943's class; group ink's counts moved with the new defaults and part
  (kept, per the calls); the census's #16 stretches carry no point.
- **Next.** The coordinator merges, then S3 (or K943 first, behind its
  flag) per the recommendation.
