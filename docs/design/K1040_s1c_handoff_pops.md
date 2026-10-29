# K1040 S1c: the hand-off to OWN, and what the pops are

Ledger K1040, stage S1c: S1b continued, before S2. One stage: Opus, 2 h
cap. Branch `k1040-field`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1040-field` (at
master, node_modules joined to the main checkout's). Work only there.
Brief written 2026-10-29 by the coordinating session.

## Why

S1b (merged at a98938c5) found that the holes are the look's eyes, not a
defect. It made six definition changes for the rate rule, which cut the
rate census from 132 sites to 23, and it reran the gate
(`docs/design/K1040_s1b_holes_fades.md`). Two things stand between
form B and S2:

- **One structure behind two failures (S1b F14, R1).** At an arm's end,
  a foot that is fading out of its group loses its burial along with it.
  So its band shows inside a full member's tube. This is the foot+f2
  class, 1540 of check #1's 2832 px. Past the cut, the piece switches to
  OWN in one step: R1, a jump of 0.75 ink in 1/40 px, which the cap pin
  tracks as `it.fails`. One site is traced; the class is not counted.
- **Nobody knows what the pops are.**
  - The full run counts 225 pops (4051 px), against S1's 123 (1764 px).
    In the same run the unexplained pixels fell by 37%.
  - S1b inferred, without testing, that most of the rise is F2's
    relabel: pixels that S1 excused under f1 now count.
  - Nobody has said which mechanisms the 225 pops come from, so nobody
    can say how far form B is from 0 pops.

S1c fixes F14 and R1 together. Then it answers the second point with a
table that assigns every pop pixel to a mechanism. At S1c's merge the
coordinator uses that table to decide whether S2 starts or the
definition needs another stage. Levi does not look at this stage.

## Calls that bind

- **Earlier calls.**
  - S1's calls and S1b's still bind. S1b's `## Calls that bind` are:
    watertight at every fade value, the rate rule, and each definition
    change written down as its own Finding.
  - The eyes stay as they are (S1b F1).
- **F14 and R1 get one definition change** if the count shows they share
  a mechanism:
  - A foot stays buried at full weight while a full member's tube holds
    it; its burial weight is not scaled by its own ramp.
  - The hand-off to OWN fades instead of switching.
  - If the count shows another mechanism for part of the class, that part
    gets its own fix, also within the rate rule.
- **Mechanisms, not pixels.** A pop's mechanism is the term or decision
  whose change moves the ink between its two frames. It is one of:
  - a change of winner (term X to term Y);
  - a fade weight (name which decision);
  - a burial weight;
  - a gate;
  - the tie mix;
  - motion beyond what label_pops' rule allows.
- **Count and fix by mechanism.**
  - Count pops and px per mechanism and per place: junction, crossing of
    60° or more, elsewhere.
  - A mechanism that is a hard switch in the definition is fixed in the
    definition, as R1 is.
  - A fade too narrow for the motion is widened, and the width is recorded
    as in S1b's rate rule.

## Order

Take `Get-Date` at the start and at each milestone, and write the times
into Findings. Append `## Findings` (F1, F2, ...) to this brief as you go.

1. **Read (about 10 min).**
   - S1b's F13, F14, Residuals and Handoff.
   - S1b's change to form_b.ts: `git diff 27cfb2e1 a98938c5 --
     src/render/field/form_b.ts`, read in slices.
   - The headers of pops.ts, b_trace_bur.ts and b_rate.ts.
2. **The pops accounting (about 15 min).**
   - Run S1b's test. Count S1b's pop px where two same-chain minima merge
     within σ: the pixels S1 excused under f1.
   - Report how many of the 225 pops and 4051 px it explains. Commit.
3. **F14 and R1 (about 40 min).**
   - Count F14's mechanism over every foot+f2 #1 site: check1deep's
     sites with A.ramp < 1 and the burier's winW near 1.
   - Crop the deepest sites on muse_hash and the g41 tw64 scenes.
   - Make the definition change. Flip the cap pin's `it.fails` to `it`.
   - Rerun the pins, #1 on all 12 scenes, and `b_rate.ts`. Commit.
4. **The mechanism table (about 35 min).**
   - Rerun the full pops on the new definition.
   - Write a probe that evaluates form B, with the term trace, at both
     frames of every pop pixel, and assigns each pixel its mechanism.
   - Put the table in Findings: rows are mechanisms, columns are places,
     and each cell gives pops, px and the worst site with a crop.
   - Fix any hard switch the table finds that a short definition change
     can fix, within the rule. List the rest. Commit.
5. **The gate (about 20 min).**
   - The pins.
   - `scenes.ts` on all 12 scenes.
   - The full pops run, if step 4 changed the definition after its rerun.
   - `q5holes.ts`: expect S1b's 44 eyes and 0 holes the oracle covers.
   - `q4.ts` on all 12 scenes (S1b ran it on three).
   - Report each against S1b's numbers (its F13). Commit.
6. **If time remains:** R2 (muse_hash chain 52's tie jump), then R3.

Then write `## Handoff`. Stop at the cap wherever the Order stands. The
mechanism table matters more than the rest of the gate. If time runs
short after step 4, run the pins on the final definition, and leave
scenes.ts and q4 to the Handoff.

## Where things are

- **S1b:** `docs/design/K1040_s1b_holes_fades.md`.

  | Section | Line |
  |---|---|
  | F13, the gate against S1 | 384 |
  | F14, one #1 site | 457 |
  | Residuals R1-R6 | 497 |
  | Handoff | 521 |

  The Handoff ends with the rerun commands.
- **S1:** `docs/design/K1040_s1_reference.md`. Its Findings start at line
  217, its Handoff at 679, and `### How to rerun` at 792.
- **The definition:** `docs/design/K1040_junction_field.md`, F2 (line 238)
  and F3 (line 350). S1's and S1b's definition-change Findings amend it,
  and `src/render/field/form_b.ts` is the current definition.
- **The code:** `src/render/field/form_b.ts` and
  `test/render/field/form_b.test.ts`.
- **The probes** are S1's and S1b's, in `.claude/probes/K1040/s1/`:
  b_crop, b_hole, b_sweep, b_rate, b_bisector, b_trace_bur and
  b_site.mjs.
  - b_site.mjs's junction lines missed an arm on g41_user_tw64. Check
    the scene's arm fields before trusting them.
  - PowerShell's `[IO.File]` resolves a relative path against the process
    directory, not `Set-Location`, so pass absolute paths.
- **Outputs:** write S1c's runs under `s1/out/s1c/`. S1's `out/` and S1b's
  `out/s1b/` are the baselines. Commit the summaries and the crops your
  Findings cite, and leave the rest untracked. Logs of `npm test` stay
  untracked.
- **The scenes and the recordings:** where S1's brief says (the probes
  already point at them). Both are read-only.

## Rules

- **Files you may change:**
  - `src/render/field/form_b.ts`;
  - `test/render/field/form_b.test.ts` and fixtures beside it;
  - the probes in `.claude/probes/K1040/s1/`, plus new ones there (add
    them with `git add -f`);
  - this brief's Findings and Handoff.

  Change no other file under `src/`, `test/` or `scripts/`. Nothing in
  the app imports form_b.ts, and nothing may start to.
- **Tests.** `npm test` (tsc included) passes at every commit you call
  done. master deploys on merge.
- **Builds and other checkouts.** Don't run `npm run build` in the main
  checkout, and write nothing in other worktrees.
- **Reading code and output.**
  - Read code through the shell: `Select-String` finds the lines, and
    `Get-Content <file> | Select-Object -Skip <n> -First <m>` reads them.
    Every Read of a `src/render/` file attaches about 20k tokens of
    rules, so use the Read tool only right before an Edit, and make
    mechanical edits as PowerShell string replacements.
  - Keep probe output in files, and print only short summaries into the
    conversation, about 30 lines per call at most. S1b compacted six
    times in its first hour.
- **Commits.** Commit WIP to `k1040-field` at every milestone, broken or
  not. Never push. Never skip hooks. Use no helpers (no subagents).
- **Timing.** Nothing here is timed. If you do time something, take the
  machine-wide perf lock first (`$env:TEMP\claude-perf.lock`, one line:
  owner K1040-S1c, start time, what), and delete it after.
- **Stop rule.** Stop when the Order is done or 2 h after your start
  (`Get-Date`), whichever comes first. A compaction is not a stop. After
  one, re-read this brief and `git log --oneline -5`, then go on. When you
  stop:
  1. Commit WIP.
  2. Append `## Handoff` to this brief: what is done, what is next, and
     how to rerun.
  3. Commit.
  4. Report.
- **The report.** Your final report ends with `Ledger items` (new
  follow-ups, residuals, decisions for Levi) and K1040's handle fields:
  owner, branch, last commit, evidence, next, brief, env.

## Findings

Times are local (PDT). Start 02:05:12, cap 04:05:12.

**F1 · The pops accounting: f1's relabel is most of S1b's rise
(step 2, 02:05-02:25).** S1b's definition reproduces F13 exactly
(225 pops / 4051 px; #1 2832 px). `pops_mech.ts` re-evaluates both
frames of every pop pixel and marks it merged when two same-chain
candidates lie within σ there (the merge in `pieces()`; S1's f1).
1768 of the 4051 px (44%) are merged in either frame, but only 16 of
the 225 pops are wholly merged. With the merged px excused, 145 pops
of 4 px or more remain (1934 px), against S1's 123 (1764 px). So f1's
relabel accounts for 80 of the 102 extra pops and 2117 of the 2287
extra px, as S1b inferred. The flag says where a pixel sits, not what
switched there; step 4 assigns mechanisms by what changes between the
frames. Output: `out/s1c/pops_s1b/` (`pops.ts` with `DUMP=1` keeps
each pop's pixels), `out/s1c/pops_s1b/mech/mech.txt`.

**F2 · The cap mix: one definition change fixes F14 and R1 (step 3,
02:25-02:38).**
- **The count.** `b_f14.ts` traced every #1 deep pixel won by a side
  foot with F_CAP on S1b's dump of all 12 scenes: 1542 px. In 1047
  (68%, mean ink 0.741) the foot's own ramp is below 1 while a full
  member's tube holds it (U ≥ 0.99): S1b's burial weight
  B.ramp · B.selfW · A.ramp let the foot's own ramp unbury it (F14). In
  441 (29%, mean ink 0.704) the foot is full and its burier is the one
  in its ramp, the mirror case. 51 px are both, through the burier's
  ramp; 1 has no burier; 2 are F9's fill. So 1540 of 1542 share one
  mechanism, a burial scaled by a cap ramp. R1 (the cap pin: the END's
  piece switched to OWN at L, 0.75 in 1/40 px) is the same ramp's far
  end, where the piece's surface changed in one step.
- **The change** (`form_b.ts`, the header's Q2). A piece with g ≥ 0
  inside its arm's cap ramp (ramp < 1) is a unit. With the units' ramps
  sorted, one u in [0, 1) makes each unit whose ramp exceeds u a full
  member of its group (surf = g) and the rest OWN (surf = OWN + idx):
  n + 1 complete composites for n units, weighted by the gaps between
  the sorted ramps (w_k = r_k − r_(k−1), with r_(−1) = 0 and r_n = 1).
  The ink is their weighted sum; the labels come from the heaviest
  composite and the term from the largest w · ink; the fade bits are
  their union, plus F_CAP where their inks differ by more than 1e-9.
  Inside a composite a burial weighs B.selfW alone, so a foot stays
  buried at full weight while a full member's tube holds it. A unit
  entering (ramp → 1) or reaching L (ramp → 0) takes its composite's
  weight to 0, so both ends are continuous, whether OWN lies over the
  group or under it. Without units the evaluation is S1b's, bit for bit
  (now `evalLayers`). The `capBoth` param (S1b's A.ramp factor) is
  gone. Cost: one more composite per unit, inside caps only.
- **The pins.** The cap rate pin passes now (`it.fails` → `it`: 1.62
  per px against 3, F_CAP shown); 22 of 22 form B tests. `npm test`:
  188 files, 2532 tests (`logs/npm_test_f2.txt`).
- **#1 on all 12** (`scenes.ts`; `out/s1c/scenes_f2/gate_table.txt`):
  2832 → 861 px. By term: foot+f2 1540 → 0, foot 396 → 3, tB+f2
  32 → 0; the rest stay (tB 322 → 320, arc 255 → 251, tA 217 → 216,
  foot+f8 62 → 59). Per scene: muse_hash 1012 → 173, g41_user_tw64
  783 → 289, g41_def_tw64 348 → 89, g41_ring_tw64 189 → 0 (passes
  now), muse_default_tw 193 → 171, ring 101 → 40, user_tw42.lightpaper
  71 → 32, g41_user_tw42 70 → 31, def 65 → 36. Free ends 345 → 169. No
  other check changed its outcome on any scene. `b_f14.ts` on the new
  dump finds 2 foot px with F_CAP left (muse_hash, both with F_TIE too).
- **The rate** (`b_rate.ts`, 161 sites; `out/s1c/rate/rate_f2.txt`):
  sites with breaches 23 → 3. The 1105 foot jumps are gone (647 + 307
  + 75 foot+f2 | foot+f4, 74 foot | foot+f4, 2 more); the 3 sites left
  are muse_hash corner 209's sliver (R3, 84 arc jumps, as before).
- **Crops** (`out/s1c/crops/<scene>_<x>_<y>_<class>_{s1b,f2}.png`, the
  deepest site of each class on muse_hash and the three g41 tw64
  scenes; `b_crop.ts` with `FORMB=s1b` renders `form_b_s1b.ts`, S1b's
  form B with its imports re-rooted). The dark band where a buried arm
  showed through its group's interior is gone. What stays is a faint
  grey: the arm's outline fading in across its cap ramp, the hand-off
  itself (`g41_user_tw64_3.227_14.632_own_f2.png`,
  `muse_hash_15.461_21.814_own_f2.png`).
