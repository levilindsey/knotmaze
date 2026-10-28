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
