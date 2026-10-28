# K940: K868, the label ink's rule fixes behind switches (agent brief)

Stage brief (coordinator, 2026-10-27). Parent: K868
(`docs/design/K868_field_border.md`). Previous stage: K924
(`docs/design/K924_label_artifacts.md`). Read its `## Results` and
`## Handoff` before anything else. K922's `## Results` explains the
switches the base uses.

## Why

S3 will put the label ink into the app and copies whatever rule the oracle
follows. K924 traced the label ink's artifacts to their rules and ranked
five rule changes. This stage builds the first three as candidates behind
switches, judges them by image as well as by counts, and makes the sheet
Levi judges them on.

- **Change 1, a fill yields to every foreign tube.** K924's
  `labFill: "yield"` flip removed every "covered: fill on top" row
  (missing 36 → 2, #16 13 → 0). But it draws the yielded tube's outline
  across the fill at d1-d4, 100-200 cells at each, and nobody has looked
  at those outlines yet.
- **Change 2, caps by their reason.** Not flipped yet. The `labCap: 0.4`
  flip merged every kind of cap and hid real crossing lines (+26 missing,
  +27 #16).
- **Change 3, a tie key constant over a surface.** The `labTie: "surface"`
  flip exists; its effect is small.

## The base

`INK=label DEPTH=overlap ENDSNAP=1`, as in K924. Where `EXTENT=part`
changes a result, report it as a second column.

## Order

1. **Look at yield's outlines.**
   - Crop base against yield at d1-d4 and at every site where yield adds
     ink. `tdiff.mjs` finds them over the 12 scenes; take the sites with
     the most added cells first.
   - For each outline, say whether it is right. Judge by K868 §3.3's
     story: the fill is the cluster's surface between its arms. The
     outline is right where the foreign tube lies over the cluster's arms
     there (by the crossing table or the overlap depth). It is wrong where
     the tube lies under them, because then the fill should cover it.
   - Trace one wrong outline with `at.ts`.
2. **Refine change 1 where the outlines are wrong.**
   - K924's candidate: a fill yields to a foreign tube unless the table
     has a crossing that puts the cluster's chain over that tube's chain.
     The order flip alone removed nothing, so say which chain of the
     cluster the test should use (the nearest, or the one whose arm the
     tube crosses).
   - Put it behind a new setting, off by default (for example
     `labFill: "yieldOrder"`). Repeat step 1's crops and the counts.
   - If neither form is right, say what the right test is and stop
     there.
3. **Change 3 on top of change 1.** Run `labTie: "surface"` with the form
   of change 1 that step 2 chose, and count.
4. **Change 2, limited to reach caps.**
   - A new setting, off by default (for example `labCapReach: <w>`). A
     chain past a reach cap stays similar to the cluster within w past
     its span. A crossing cut or the next root still separates.
   - Run it with changes 1 and 3, at w 0.4 and at one larger w. No other
     tuning.
   - Count M1's member/member rows (base: 24 extra, 16 free ends). Check
     #16 and the missing count: this flip must not hide crossing lines
     the way `labCap` did.
5. **Sheet J and S's crops.**
   - Sheet J: columns base, 1, 1+3 and 1+2+3 (1 is the form step 2
     chose). Rows: d1-d4 and the four sites that change most, at sheet
     I's scale (muse_hash at 6x). Save it as
     `.claude/probes/K940/J_label_fixes.png`.
   - S's crops: six sites from muse_hash's #6 and #7 lists where a table
     crossing sits inside a cluster. Show each in label ink (the line
     broken) and in an ink that draws the over line, if one exists
     (`surface` ink may). If none does, say what drawing it would take.
     Save them in `.claude/probes/K940/S/`. Levi decides S (K943) from
     them; S's implementation is not this stage.
6. **Checks.** muse_hash's checks for every candidate (`run.ps1` runs
   them), and `npm test` in the worktree.

If the 2 h cap comes first, build sheet J from the columns you have.

Not this stage:
- changes 4 and 5 (fills bounded by their corner arcs, a continuous fill
  z);
- F (#5's paper edge) and the 2 unattributed missing stretches;
- N and the extent walk;
- E and the free-end check's exit count (K934, Levi's call);
- S's implementation;
- S3, the phone and timing.

## Setup

- **Worktree.** `.claude/worktrees/k940-label-fixes`, branch
  `k940-label-fixes`, made from master by the coordinator. Master has
  K924's five flips. Its `node_modules` is a junction to the main
  checkout's. Work and commit there.
- **K924's probes** are untracked in the main checkout, in
  `.claude/probes/K924/` (`run.ps1`, `cls.ps1`, `tally.mjs`, `at.ts`,
  `tdiff.mjs`, `chk.ts` and the rest). The run commands are in K924's
  `## Handoff` and in each probe's header. They import the K924
  worktree's source by absolute path, so copy what you need into your
  worktree's `.claude/probes/K940/` and repoint the imports to your
  worktree. Do the same with K922's (`.claude/probes/K922/`: `lib.ts`,
  `i.ts`) if you need sheet I's crops.
- **Gotcha.** `checks_ab.ts` takes the head's ink from `HEAD_INK`, which
  `run.ps1` sets. Without it, the head runs `surface` ink.
- **Scenes.** The scenes are in the main checkout's
  `.claude/probes/K868/`, and the synthetics in `test/render/field/scenes`.
- **The model** is `src/render/field/oracle.ts`; read it by ranges. Its
  rules are in `docs/design/K868_field_border.md` §3.3-§3.7.
- **Images.** View them as small crops (1000 px or less, cut by script),
  never whole sheets.

## Rules

- **Stop rule.**
  - Run `Get-Date` at the start and at every milestone.
  - Stop when steps 1-6 are done or 2 h after the start, whichever comes
    first.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
- **Commits.** Commit work in progress to the branch at every milestone,
  broken or not. Never push. `npm test` passes in the worktree at the end.
- **Defaults.** They stay as they are: `ink: "group"`, today's depth and
  spans, and every switch off, old and new.
- **Not allowed.**
  - No phone and no timing.
  - Never run `npm run build` in the main checkout.
  - Never touch processes you did not start.
  - Never use Levi's Chrome profile.
  - Upload nothing; the coordinator uploads the sheet.
- **Shell.** Use PowerShell. Read code through the shell (`Select-String`,
  then `Get-Content | Select-Object`).
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Look.** Crop and look at your own images before you call an outline
  right or a fix done.
- **Write-up.** Append `## Results` (per step) and `## Handoff` to this
  brief, on the branch.
- **The final report** gives:
  - per candidate: extra, missing, free ends and #16; the cells d1-d4
    gain and lose; muse_hash's #5, #6, #7, #9.1 and #16;
  - each yield outline you judged, right or wrong, and why;
  - the form of change 1 you recommend, and change 2's result;
  - the paths of sheet J and S's crops;
  - the rule set you recommend for K868 and what it costs S3;
  - a `Ledger items` list (follow-ups, residuals, decisions for Levi);
  - K940's current handle fields.

## Results

Stage agent of claude session bf876705, 2026-10-27 18:46-20:46 (the 2 h
cap). Base: `INK=label DEPTH=overlap ENDSNAP=1`. `EXTENT=part` was not
run, so there is no second column. The probes are in
`.claude/probes/K940/` (untracked; K924's and K922's copied and repointed
to this worktree, plus the new ones named below).

**The new settings** (`src/render/field/oracle.ts`, all off by default;
their env names are in the probes' `lib.ts`):
- `labFill: "yieldOrder"` (`LABFILL=yieldOrder`): where a fill of cluster
  J meets a foreign tube (the nearest foot is not J's, within h), the fill
  covers the tube only if the table puts J's chain over the tube's chain.
  Otherwise it yields, as `labFill: "yield"` does.
- `labYieldChain: "near" | "crossed"` (`LABYIELD`, default "near"): which
  chain of J the test uses. "near": the nearest foot's chain, by its
  crossing with the tube's chain within σ. "crossed": `fillOrder`, the
  nearest table crossing within σ between the tube's chain and any chain
  of J.
- `labCapReach: <w>` (`LABCAPREACH`): change 2 for reach caps. A free tube
  (`C:ch`) just past a span of J that a reach ended (not a cap, not the
  chain's end) is J's surface for up to min(w, cap - e) past the span. The
  pad of a crossing whose other pass is in J cuts it short.

**Counts** (12 scenes, `tally.mjs` over `cls/<scene>.<label>.json`; the
`fy*_p*.log` runs):

| candidate | label | extra | missing | free ends | #16 |
|---|---|---|---|---|---|
| base | base | 34 | 36 | 83 | 13 |
| K924's yield | fyield | 31 | 2 | 81 | 0 |
| 1, near | fyon | 33 | 30 | 90 | 11 |
| 1, crossed | fyoc | 31 | 35 | 85 | 11 |
| 1+3 | fyct | 31 | 35 | 83 | 11 |
| 1+2+3, w 0.4 | fyctr04 | 31 | 47 | 77 | 19 |
| 1+2+3, w 1.0 | fyctr10 | 30 | 54 | 79 | 25 |

**d1-d4**: ink cells each candidate gains and loses against the base, in
the 516 px windows of `view/d<n>_<label>.png` (the base inks 532, 531,
609 and 375 cells there):

| candidate | d1 | d2 | d3 | d4 |
|---|---|---|---|---|
| yield | +127 -161 | +211 -121 | +123 -203 | +153 -59 |
| 1, near | +5 -15 | 0 | +48 -142 | +105 -34 |
| 1, crossed | +58 -137 | +15 -17 | +49 -144 | +5 -13 |
| 1+3 | as 1, crossed | as 1 | as 1 | as 1 |
| 1+2+3, w 0.4 | +57 -170 | +15 -17 | +49 -144 | +5 -13 |
| 1+2+3, w 1.0 | +52 -174 | +15 -17 | +49 -144 | +5 -13 |

### Step 1: yield's outlines

Crops: `view/d1-d4_<label>.png`; muse_hash's sites with the most added
cells, `view/m5-m8_<label>.png` (m5 (14.99, 12.90), m6 (3.50, 22.53), m7
(17.96, 21.80), m8 (16.68, 11.91)); def's, `view/s1-s6_<label>.png`; the
pairs in `view/g_*.png` and `view/q_*.png`. Sites by added cells:
`ydiff/<scene>.ENDSNAP=1.fyield.json` (`ydiff.ts`).

**Most of yield's outlines are wrong.** `yjudge.mjs` (new) judges each
yielded stretch by the nearest table crossing between the tube's chain
and a chain of the fill's cluster (within 3h): over: right; under:
wrong. Over the 12 scenes, 2698 yielded cells are right and 11936 wrong
(82%). Another 1177 cells have no crossing within 3h, and all of them lie
under the fill by the overlap depth, so they are wrong too. muse_hash
alone: 1193 right, 4350 wrong, 83 under by depth.

Judged by crop and table:
- **d1 (20.30, 1.40), right.** ch2's outline across F4: x6 puts ch2 over
  (z 0.928 against the fill's -0.928). Part of the rest of d1's change is
  the cluster's own chains past their spans, which is change 2's domain.
- **d2 (20.03, 22.16), wrong.** F31 yields to ch38 (x158 puts ch38
  under) and F26 to ch85 (x157 under). Traced with `at.ts`
  (`trace_y2_fyield.log`): F26's foot is ch38@7.67 (z +0.807), and it
  meets J31's member ch85@9.50 (z -0.550). They are not similar (the
  switch dz is 1.357), so yield draws ch85's outline across F26, although
  x157 puts ch38, a chain of F26's cluster, over ch85. The fill should
  cover it.
- **d3 (26.71, 6.70): ch58 wrong, ch3 right.** x253 puts ch58 under; x35
  puts ch3 over.
- **d4 (31.05, 4.50), wrong.** The tube's own self-crossing x252 lies
  under its cluster pass. `ydiff.ts` lists a self-crossing by its first
  pass only, so it named x251 (over, 2.6h out) instead, and `yjudge.mjs`
  carries the same caveat.
- **m5, wrong**: F60 yields to ch53 (x201 under) and ch54 (x234 under).
  **m6, wrong**: F16 to ch9 (x72 under). **m7 and m8, wrong** (m8: ch54
  past J57's span).
- def's s3 and the sites (9.48, 28.31), (4.09, 12.68) and (5.97, 18.69)
  are wrong; (9.77, 25.91) is right.
- Many of the "foreign" tubes are the cluster's own chains past their
  spans (d1, def s3, m8). A rule by the table cannot help there; change 2
  aims at them.

### Step 2: change 1 refined

Both forms are built. **"crossed" is the right one.**
- **"near" is wrong.** It spikes where the nearest foot switches chains
  (d4 +105, m5, m6): the chain that decides flips across the Voronoi
  line, and the outline flips with it. Free ends rise 83 to 90.
- **"crossed"** keeps the right outlines and drops the wrong ones. d1 is
  cleaner than the base (+58 -137), d3 is clean (+49 -144), and d2, d4
  and m5-m7 equal the base. m8 has a slightly longer sliver: ch54 past
  J57's span, where the nearest crossing switches to x233. `yjudge.mjs`
  on base against crossed (muse_hash): 557 yielded cells right, 4 wrong
  (not traced). Missing falls only 36 to 35, so crossed keeps nearly all
  of the "covered: fill on top" rows. Inferred, not checked row by row:
  those are tubes that the table puts under the cluster, which the fill
  covers rightly, so the census's "missing" is the census's expectation,
  not an ink error (see Handoff).
- `ydiff.ts` base against crossed (muse_hash): 857 cells change over 28
  sites, +424 -604. The biggest: (20.65, 1.35) +56 -139, (26.49, 6.91)
  +49 -145, (16.38, 11.92) +38 -33, (8.38, 16.90) +36 -20, (29.92, 14.22)
  +25 -12.

### Step 3: change 3 on top of change 1

`labTie: "surface"` with crossed changes only free ends, 85 to 83 (M1
member/member 16 to 14). d1-d4 are identical to 1's. On sheet J it
changes only c2, where it closes a free end with a short cap. Neutral to
slightly positive.

### Step 4: change 2, reach caps only

**It fails the brief's test.**
- It hides crossing lines as `labCap` did, only fewer: against 1+3,
  missing +12 and #16 +8 at w 0.4, and +19 and +14 at w 1.0 (labCap:
  +26, +27). The added rows are tubes over J's fill, or over their own
  member pass, whose outlines it now hides. Examples:
  - muse_hash (20.53, 1.61): `C:ch2@1.94` (z 0.928) against `F4:ch68@7.33`
    (z -0.928). It hides d1's ch2 outline (x6 over) again.
  - g41_def_tw42 (34.70, 14.25): `C:ch61@48.39` (z 0.487) against
    `M36:ch61@44.87` (z -0.481), across crossing 256.
- **It does not fix M1.**
  - M1 member/member extra: 24 at the base and every candidate, 23 at
    w 1.0.
  - M1 free ends: base 16, 1 16, 1+3 14, w 0.4 16 (13 by member, 3 by
    chain), w 1.0 13.
  - M1's rows are a member against a tube past its span, UNDER it, in a
    junction core: `M16:ch81` (z 0) against `C:ch45@23.62` (z -0.644) in
    j104's core (hider ch45@23.53, cl 16); `M48:ch34` (z 0.928) against
    `C:ch75@47.66` (z -0.928) in j81's core. Those spans are not ended by
    a reach, so labCapReach never applies.
- Free ends ending at a fill|member cap: base 12, yield 9, 1 near 9,
  1 crossed 15, 1+3 15, w 0.4 6, w 1.0 4. It removes those, at the price
  of the crossing lines.
- `cls.ts` does not model labCapReach and labels its rows "sim across
  the outline: one chain within sigma". The rows are right; the
  mechanism label is not.

### Step 5: sheet J and S's crops

**Sheet J**: `.claude/probes/K940/J_label_fixes.png` (`j.ts`; crops in
`jcrops/<row>_<column>.png`, `jc.ps1` renders a column). Columns: base,
1 (crossed), 1+3, 1+2+3 (w 0.4). Rows: d1-d4, then c1-c4, the four
muse_hash sites that change most against the base apart from d1 and d3
(`ydiff/muse_hash.base.fyoc.json` and `.base.fyctr04.json`): c1 (16.38,
11.92), c2 (14.26, 0.87: 1+2+3's biggest gain against the base, +56 -8,
which the sheet shows is change 3's), c3 (8.38, 16.90) and c4 (29.92,
14.22). muse_hash at 6x, 86 CSS px a tile; magenta dots are each column's
free ends (`indep/muse_hash.<label>.json`), counted in each tile's
caption.

Read by crop (`view/J/`: `sheet_a/b/c.png` cut from the sheet at a third,
`sheet_d1.png` at full scale, and each pair of neighbouring columns
diffed by `pxdiff.ts` into `x_<row>_<A>_<B>.png`):
- **d1**: 1 replaces the base's sawtooth under the arch with a clean
  corner (ch2's outline, x6 over). The zigzag beside it still starts in a
  free end, about 0.35 world from the corner. 2 free ends in every
  column. 1+3 equals 1; 1+2+3 trims 768 px off that stub, and the free
  end stays.
- **d2**: 1 moves edge pixels only (501 off, 328 on). 0 free ends.
- **d3**: 1 removes the base's sawtooth where two outlines meet (3405 px
  off, 1149 on), and the outline runs clean. 0 free ends.
- **d4**: 1 moves edge pixels (299 off, 123 on); the base's notch at
  the self-crossing stays. 0 free ends.
- **c1, c3, c4**: 1 re-angles a cap across a band's end (c1 two caps,
  1265 off and 1136 on; c3 435/865; c4 259/588). c1 and c3 have 1 free
  end and c4 none, in every column.
- **c2**: the base and 1 are identical. **1+3 closes the base's free end
  with a short cap across the band** (1319 px on, 174 off), and 1+2+3
  equals 1+3. Free ends 1, 1, 0, 0. The cap is not judged against the
  table.
- 1+3 equals 1 at every site but c2, and 1+2+3 equals 1+3 at every site
  but d1's stub (0 px at the other seven). The sheet shows change 1 at
  d1, d3 and the caps, change 3 at c2, and change 2 only at d1's stub.

The command, from the worktree with `INK=label DEPTH=overlap ENDSNAP=1`
set, once `jc.ps1` has rendered each column's crops:
`npx vite-node .claude\probes\K940\j.ts sheet "base=base=Base"
"1=fyoc=1 crossed" "13=fyct=1+3" "123=fyctr04=1+2+3 w0.4" -- "d1=d1"
"d2=d2" "d3=d3" "d4=d4" "c1=c1 (16.38, 11.92)" "c2=c2 (14.26, 0.87)"
"c3=c3 (8.38, 16.90)" "c4=c4 (29.92, 14.22)"`.

**S's crops**: `.claude/probes/K940/S/`. Six sites from muse_hash's #6
and #7 lists where a table crossing lies inside a cluster: its two passes
are members of one cluster, so the label ink sees one surface there and
the over pass's band line is broken within ±2h. Per site:
`S<i>_label.png` (label ink, the base), `S<i>_surface.png` (surface ink),
`S<i>_diff.png` (grey: both inks; red: label only; blue: surface only),
`S<i>_colour.png` (the visible surface by chain and depth, label
outline) and `S<i>_row.png` (the four side by side at half scale, 994 px).
Each crop is 4.04 world (516 px), centred on the point.

| site | point | the over pass | the member it borders | table crossing |
|---|---|---|---|---|
| S1 | (24.06, 2.13) | `M6:ch3` z 0.109 | `M6:ch37` z 0 | x9 (ch3 over ch2) |
| S2 | (25.93, 5.44) | `M0:ch68` z 0.843 | `M0:ch67` z 0 | x11 (ch68 over ch2) |
| S3 | (28.14, 9.24) | `M75:ch58` z 0.645 | `M75:ch77` z 0 | x23 |
| S4 | (8.53, 25.21) | `M11:ch5` z 0.828 | `M11:ch70` z 0 | x41 |
| S5 | (1.42, 11.26) | `M18:ch6` z 0.650 | `M18:ch33` z -0.396 | |
| S6 | (19.10, 1.45) | `M4:ch68` z 0.787 | `M4:ch68` z -0.702 | ch68's self-crossing |

**No ink draws the over line.** Surface ink draws none at any site, and
neither does today's group ink (`S<i>_group.png`, the app's defaults;
`S<i>_diff_group.png`). Label against surface differs by edge pixels
only (label-only/surface-only px: S1 76/337, S3 77/287, S5 325/368), plus
label ink's own artifacts beside the sites: S2 4405/253 (the jagged d3
line at the lower right), S4 1679/356 (a stub at the lower right that
surface ink caps), S6 4431/361 (d1's jagged line at the right). Group
and surface crops are byte-identical at S1, S3 and S5.

What drawing it would take (K943's question): inside a crossing's pad,
two members of one cluster must stop being the same surface. simLab
would treat the crossing's over pass and its under pass as different
surfaces within the pad (by the table, or where z_over - z_under exceeds
the switch dz), so the ink draws the over pass's outline across the
under member there. The line then needs a rule at its two ends (join the
cluster's outline, or taper out at the pad's end); without one each end
is a free end (#6). The table lookup is the one change 1 already needs.

### Step 6: checks

muse_hash, `checks_ab.ts` (head only, `HEAD_ONLY=1`), the base env plus
each candidate's flips; logs `checks_<label>.log`:

| candidate | #5 | #6 | #7 | #9.1 | #16 |
|---|---|---|---|---|---|
| base | 15 of 10819 (longest 8.519 px) | max 16.601 px; 93 of 1264 | 119 of 700 (+26 third-chain) | 5.2816 px | 23049 of 23060; 6 missing |
| yield | as base | as base; 94 of 1266 | 115 of 700 (+5) | as base | **pass**: 23060; 0 missing |
| 1, near | as base | as base; 95 of 1266 | 119 of 700 (+26) | as base | 23049; 6 missing |
| 1, crossed | as base | as base; 93 of 1264 | 120 of 700 (+26) | as base | 23049; 6 missing |
| 1+3 | as base | as base; 93 of 1264 | 120 of 700 (+26) | as base | 23049; 6 missing |
| 1+2+3, w 0.4 | as base | as base; 93 of 1264 | 120 of 700 (+26) | as base | 23046; 7 missing |
| 1+2+3, w 1.0 | as base | as base; 93 of 1264 | 120 of 700 (+26) | as base | 23046; 7 missing |

- #5 and #9.1 do not move: no change here touches walks or widths.
- Crossed breaks one more over band line than the base (#7 120 against
  119; not traced). Yield's 115 (+5) comes from drawing every outline,
  wrong ones included.
- **#16: crossed keeps the base's 6 missing stretches, and yield inks
  them.** Yield changes only the fill-against-foreign-tube branch, so
  these are cells where crossed's `fillOrder` found a chain of J over the
  tube and the fill covered, while #16 counts the tube as over there.
  Inferred, not traced: two crossings within σ, the tube over one chain
  of J and under another (or one chain twice), and the nearest decides.
  This is the one place where yield beats crossed by the checks (see
  Handoff). Change 2 adds a seventh at both widths.

`npm test` in the worktree: 178 files passed, 2 skipped; 2371 tests
passed, 6 skipped (19:52-19:55, `npm_test.log`). It ran on 665b7c59's
code; only this brief changed after it.

### Recommendation for K868

- **Adopt change 1 as "crossed"** (`labFill: "yieldOrder"`,
  `labYieldChain: "crossed"`): a fill covers a foreign tube only where
  the table puts one of its cluster's chains over the tube's chain within
  σ, and yields everywhere else. K924's plain yield draws mostly wrong
  outlines (82% of its cells).
- **Adopt change 3** (`labTie: "surface"`). It is cheap and slightly
  positive.
- **Do not adopt change 2 as built.** M1 needs a rule about a tube under
  a member in a junction core, not about reach caps.
- **Cost to S3.** The label ink needs each chain's table crossings
  (s, the other chain, over or under), sorted by s and kept current as
  the threads move, plus each cluster's chain set. The fill-against-
  foreign-tube branch then scans the tube chain's crossings within σ: a
  few entries, and only in the lab cells where that branch fires.
  `fillOrder` already does this in the oracle.

## Handoff

Stopped at 20:18 with steps 1-6 done, inside the 2 h cap. Nothing of
this stage still runs.

**What a merge carries**: `src/render/field/oracle.ts` only (665b7c59):
`labFill: "yieldOrder"`, `labYieldChain` and `labCapReach`, with their
`OracleParams` docs. Every switch is off by default and nothing reads
them unless set; no default changed. No unit test covers them yet.

**Open, in order of use to K868:**
1. Levi's call: adopt crossed and change 3 (the Recommendation), and
   S (K943). If crossed is adopted, make it the only form:
   `labYieldChain` defaults to "near", the wrong form, only because the
   brief keeps every default.
2. #16's 6 missing stretches under crossed, which yield inks (Step 6):
   not traced. `checks_ab.ts` prints no positions; it needs a flag that
   lists them, then `at.ts` traces.
3. The 35 missing rows under crossed: inferred to be tubes the table
   puts under the cluster (the census's expectation, not an ink error),
   not checked row by row (`cls/<scene>.fyoc.json`, `node tally.mjs base
   fyoc`).
4. The 4 wrong cells of base against crossed (`yjudge.mjs`) and
   crossed's one extra #7 break: not traced.
5. m8's sliver: ch54 past J57's span, where the nearest crossing switches
   to x233.
6. M1 member/member (24 rows in every candidate): a tube past its span,
   under a member, in a junction core. It needs a junction-core rule, not
   labCapReach.
7. `EXTENT=part`: not run.
8. Probe caveats: `ydiff.ts` lists a self-crossing by its first pass
   only (`yjudge.mjs` inherits it; d4's x252); `cls.ts` does not model
   labCapReach and gives its rows the wrong mechanism label.

**Evidence**: `.claude/probes/K940/` in this worktree, untracked. Copy it
to the main checkout's `.claude/probes/K940/` before the worktree is
removed, and delete the worktree's `node_modules` junction first
(`(Get-Item node_modules).Delete()`). Sheet J and its crops (`jcrops/`),
`S/`, `view/` and `crops/` (steps 1-2), `ydiff/`, `cls/` and `indep/`
(per-scene JSON), and the logs (`<label>_p<i>.log`, `cls_<label>_p<i>.log`,
`checks_<label>.log`, `trace_*.log`, `npm_test.log`).

**Rerun**, from the worktree. The base env is `INK=label DEPTH=overlap
ENDSNAP=1`. Each candidate's flips: yield `LABFILL=yield`; 1 near
`LABFILL=yieldOrder`; 1 crossed adds `LABYIELD=crossed`; 1+3 adds
`LABTIE=surface`; 1+2+3 adds `LABCAPREACH=0.4` (or `1.0`).
- Counts: `pwsh .claude/probes/K940/run.ps1 <label> <base env> <flips>`
  (free ends, #16 and the checks), `pwsh .claude/probes/K940/cls.ps1
  <label> <base env> <flips>`, then `node tally.mjs base <label>` in the
  probes folder.
- Yields: `npx vite-node <pd>/ydiff.ts <A> <B> <scene,...>` (each side
  `<label>:K=V;...`), then `node yjudge.mjs <A> <B>` in the probes folder.
- Traces and crops: `at.ts` (env CFG; `trace:` and `crop:` ops),
  `visl.ps1`, `tr.ps1` with `tdiff.mjs`.
- Sheet J: `pwsh .claude/probes/K940/jc.ps1 <column> "<id>:<x>:<y> ..."
  <flips>` per column, then `j.ts sheet` (Step 5's command).
- S: `at.ts` crops per ink, `pxdiff.ts <out> <A> <B>`, `pair.ts`.
