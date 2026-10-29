# K1040 S1b: form B's holes and fades

Ledger K1040, stage S1b: S1 continued, before S2 (F7's plan; S1's
Handoff). One stage: Opus, 2 h cap. Branch `k1040-field`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1040-field` (at
master, node_modules joined to the main checkout's). Work only there.
Brief written 2026-10-29 by the coordinating session.

## Why

S1 built form B's float64 reference, `src/render/field/form_b.ts` (merged
at 1b7fa02c), and ran its gate. Every part failed except the free-end
count, which runs (S1's `## Handoff` in `docs/design/K1040_s1_reference.md`).
Two of the failures are defects in the definition itself. S2 to S4 build
on the definition, so these two are fixed first:

- **Holes (F12).** Some junction groups leave paper inside the junction
  and outline it: 0 to 6 holes per scene, each with the fold's fade bit
  (f1) set. Inferred, not traced: f1 withdraws the arm pieces near the V,
  and the corner fills cover only outside each corner circle.
- **Fades faster than a pixel (F11).** At a fade's cut, at the tie mix
  (F_TIE) and at some changes of winner, the ink changes inside a
  fraction of a pixel whatever the AA width. In motion that is a pop.
  Inferred: the same mechanism as F7's #1 failures at junction mouths and
  F9's junction pops.

After the fixes the gate runs again, and every failure that remains gets
a cause: a crop, and the term that changes there. S2 starts from that
answer. Levi does not look at this stage.

## Calls that bind

- S1's calls still bind (its `## Calls that bind`): F1's table, every pop
  counts, the label and band as a pure function of the frame, F7, and the
  design doc's `## Coordinator's calls`. So do S1's answers: F1, the cone
  key; F2, both ramps.
- **Watertight.** A fade never opens a hole: paper that a group's ink
  encloses, as `q5holes.ts` finds it. That holds at every fade value
  from 0 to 1, not only at the values the 12 scenes happen to have, so
  the pins sweep the fades. A fade may move an outline; it never opens
  paper inside one.
- **The rate rule** (the coordinator's call on F11's question). The
  definition bounds how fast a fade moves the ink. S2 does not
  supersample: supersampling smooths one frame, but the outline still
  jumps between frames.
  - In the image: across a fade, a change of winner or a gate, the
    distance a pixel reads changes by at most about one pixel per pixel
    of position (check |∇d| ≤ 2). A fade that moves the outline by Δ
    spreads over at least about Δ of image.
  - In motion: a fade moves the outline no further than label_pops'
    rule allows for the motion that drives it (`scripts/label_pops.ts`'s
    header states the rule; `pops.ts` applies it to form B).
  - A fade that breaks this is widened or reformulated in the
    definition. For example, a gated term gets a fade, and a hard cut
    becomes a ramp.
  - Where the rule needs a fade wider than an approved value (ovw =
    0.05h is Levi's look call), the default is the width the rule needs.
    The approved value stays one parameter setting away, and both are
    recorded for S4b, where Levi looks.
- **Definition changes are written down.** Each one gets its own Finding
  headed `Definition change:`, saying what F2 or F3 said, what it says
  now, and why. The coordinator carries them into the design doc.

## Order

Take `Get-Date` at the start and at each milestone, and write the times
into Findings. Append `## Findings` (F1, F2, ...) to this brief as you go.

1. **Read (about 10 min).**
   - S1's F3 (the fold), F7, F9, F11 and F12, and its Handoff, in
     `docs/design/K1040_s1_reference.md`.
   - form_b.ts's structure, through the shell.
   - The headers of the probes you will rerun.
   - Open the design doc's F2 and F3 only where a fix needs them.
2. **The holes (about 35 min).**
   - Trace F12's hole at muse_hash group 7, (26.675, 1.096), and fix the
     definition so the group covers it.
   - Pin it: a fixture that reproduced the hole, with f1 swept over
     0, 0.25, 0.5, 0.75 and 1.
   - Run the pins. Run `q5holes.ts`: 0 holes on the 12 scenes at dpr 1
     and on muse_hash at dpr 2. Then sweep every fade the same way at
     the former hole sites, and check for 0 holes there too.
   - Commit.
3. **The rate rule (about 35 min).**
   - At `q4worst.ts`'s sites and at F7's #1 mouth sites, find each fade,
     gate or change of winner whose ink breaks the rule. Fix each in the
     definition.
   - Measure the fill key's bisector jump (S1 Handoff, smaller
     residuals): count the pixels where it changes the top surface. If
     there are any, make the key continuous across the bisector.
   - Pin the rule: on the pin scenes, sweep each fade across its width
     and each pixel across a winner change, and check the bound. S1's
     fade sweeps tighten to it.
   - Commit.
4. **The gate again (about 20 min).**
   - The pins.
   - `scenes.ts` on all 12 scenes: checks 1-9 and 11, the max
     decomposition and the free ends.
   - `pops.ts`, the full run (`WINDOWS=0 WLEN=41`).
   - `q5holes.ts` and `q4.ts`.
   - Report each against S1's numbers. Commit.
5. **Attribute what remains (the rest of the time), in this order:**
   1. each remaining pop and #1 failure: a crop and the term that
      changes;
   2. checks #4-#7 and #9 on form B's ink (use form B's own #2, not
      runChecks' #2);
   3. the free ends by eye on user_tw42.lightpaper, g41_def_tw42 and
      muse_default_tw.

   Commit as you go.

Then `## Handoff`. Stop at the cap wherever step 5 stands.

## Where things are

- **S1:** `docs/design/K1040_s1_reference.md`. Its Findings start at
  line 217:

  | Finding | Line | Subject |
  |---|---|---|
  | F1 | 223 | the cone key |
  | F2 | 233 | both ramps |
  | F3 | 243 | the fold |
  | F4 | 253 | outlines |
  | F5 | 272 | ω |
  | F6 | 277 | strips on the pins |
  | F7 | 296 | the 12 scenes |
  | F8 | 403 | the max decomposition |
  | F9 | 436 | the recordings |
  | F10 | 479 | ties |
  | F11 | 523 | AA and the fades |
  | F12 | 604 | the holes |

  The Handoff is at line 679; its `### How to rerun` is at 792.
- **The definition:** `docs/design/K1040_junction_field.md`. F2 is at
  line 238 and F3, the fades, at 350.
- **The code:** `src/render/field/form_b.ts` (1,153 lines) and
  `test/render/field/form_b.test.ts` (373 lines).
- **The probes** are in `.claude/probes/K1040/s1/`:
  - scenes.ts runs the checks, the max decomposition and the free ends;
  - pops.ts, q4.ts, q4worst.ts, q5.ts, q5holes.ts, q5line.ts and
    q5zoom.ts.

  S1's outputs in `s1/out/` are tracked, and they are the baseline. Write
  S1b's runs under `s1/out/s1b/`; add an output-folder env to a probe
  where it has none. Commit the summaries and the crops your Findings
  cite, and leave the rest untracked.
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
- **Reading code.** Read code through the shell: `Select-String` finds
  the lines, and `Get-Content <file> | Select-Object -Skip <n> -First <m>`
  reads them.
  - Every Read of a `src/render/` file attaches about 20k tokens of
    rules. S1 compacted three times before its first commit.
  - So use the Read tool only right before an Edit, and make mechanical
    edits as PowerShell string replacements.
- **Commits.** Commit WIP to `k1040-field` at every milestone, broken or
  not. Never push. Never skip hooks. Use no helpers (no subagents).
- **Timing.** Nothing here is timed. If you do time something, take the
  machine-wide perf lock first (`$env:TEMP\claude-perf.lock`, one line:
  owner K1040-S1b, start time, what), and delete it after.
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

S1b agent. Start 2026-10-29 00:18:39 (cap 02:18:39); read done about
00:24; the hole trace and the oracle census 00:29; the sweep and the pins
00:41.

### F1 · The holes are the look's eyes, and f1 does not open them (00:29)

Observed:
- `q5holes.ts` now asks the oracle (FieldModel, K883's mapping at cr 3, as
  `scenes.ts`) about every hole pixel. Of the 44 holes at dpr 1 and the 6
  on muse_hash at dpr 2, the oracle leaves 86-100% of each hole's pixels as
  paper too: 0 holes the oracle covers. The counts are S1's (muse_hash 5,
  muse_default_tw 4, def 4, fat 0, ring 1, user_tw42.lightpaper 5,
  g41_def_tw42 4, g41_def_tw64 5, g41_ring_tw42 0, g41_ring_tw64 0,
  g41_user_tw42 5, g41_user_tw64 5; muse_hash at dpr 2: 6).
  `out/s1b/q5_before/holes.txt`.
- muse_hash g7, (26.675, 1.096), traced with `b_hole.ts`: group 7 is j7 +
  j8, 1.72 apart, and chains 3 and 37 leave an eye between them. Corners 5
  and 7 (one at each junction) both reach r = r_max = 0.125, the eye's
  inscribed circle (r0 0.958 and 1.187), so both balls sit at the eye's
  middle. The fills cover the eye outside the ball; the ball is paper,
  ringed by the arc term's ink. The oracle, whose corner r is bounded by
  its caps and not by the eye, leaves a lens about 0.67 x 0.12 world;
  form B leaves a dot about 0.16 across. So form B covers more of the eye
  than the oracle. Crop (form B | oracle | form B's top surface):
  `out/s1b/crops/muse_hash_26.675_1.096.png`.
- def g116, (30.555, 17.488): corners 371 and 373 have ω = 0 (ov 0.036 and
  0.059 against ovw 0.013), so the eye is bounded by the feet and the V
  terms, a sharp-cornered eye; the oracle's is the same eye with round
  corners. `out/s1b/crops/def_30.555_17.488.png`. The holes the oracle
  shares at 86-98% rather than 100% are such ω = 0 corners: form B's sharp
  V leaves a little more paper than the oracle's round corner.
- F12's inference is falsified: no hole has an arm piece near V withdrawn.
  f1 was set at every hole because `pieces()` set F_FOLD on every
  same-chain merge (twin minima within σ, for example chain 3 at s 34.906
  and 34.866 on the eye's concave side), not only where a fold weight is
  partial.
- What can open paper at all: no fold value changes coverage (the nearer
  piece of a fold pair covers wherever the farther one does, d_near ≤
  d_far < h); the cap ramp and the tie mix do not touch coverage; ω
  changes it only at exactly 0 (the cover test is fillW > 0).

Decision (S1b): no definition change for the eyes. Covering them would
depart from the oracle, which is the look's reference. The brief's
"0 holes" is read as 0 holes the oracle covers, which held before S1b and
holds after. Which eye the look wants (form B's dot, the oracle's lens,
or covered) is Levi's call at S4b; a Ledger item.

### F2 · f1 no longer marks merges (labelling, not a definition change)

`pieces()` no longer sets F_FOLD on a merge: a minimum dropped within σ of
a kept one would enter at the fold weight ss(σ, 2σ, σ) = 0, so a merge is
no fade. F_FOLD now means a partial fold weight (σ < Δs < 2σ) or a burial
by a folding piece. No ink changes. It changes which pixels carry f1, so
S1's per-class fade counts (F11's fade bits, `pops.ts`'s classes) compare
with S1b's only in total, not class by class.

### F3 · Watertight at every fade value (00:41)

- `FormBParams.force` (probes and pins only) holds the fold weight, ω, the
  cap ramp or the tie mix's t at one value wherever it applies.
- `b_sweep.ts` at the 50 former hole sites (window ±0.8 world at the
  census's dpr; enclosed paper components with the oracle's share of each):
  natural 44 components, 5263 px. fold, cap and tie held at 0, 0.25, 0.5,
  0.75 and 1: identical. ω = 0: 40 components, 7480 px (eyes grow into
  their corners; four open into a neighbouring paper region or the
  window's border). ω = 0.25 to 1: 44 components, 4783 px (corners whose
  ω is 0 by nature get their fills). 0 components the oracle covers, at
  every value. `out/s1b/sweep/sweep.txt`.
- Pin, `form B: watertight at every fade value (S1b)` in
  `test/render/field/form_b.test.ts`: an eye that reproduces g7 (two
  junctions 3h apart joined by arcs at ±1.4h; corners 0 and 5 reach r =
  r_max = 0.217 at the eye's middle, as at g7), a T, an acute pair and a
  hairpin, each with every fade held at 0, 0.25, 0.5, 0.75 and 1. The eye
  stays one 20 px component at its middle, where the oracle leaves paper
  too; the others enclose none.