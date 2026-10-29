# K992: corner rules continuous in the geometry (stage brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`). Before anything else, read S3a6's
(`docs/design/K868_s3a6_motion.md`) Coordinator's calls, F2-F6, F10 and
`## Handoff`, then K883's (`docs/design/K883_oracle_borders.md`). Ledger
items: K992 (this stage), K868, K993 (the census's blind spots).

In parallel, S3a7 (`docs/design/K868_s3a7_pieces.md`, branch `k868-s3a`)
moves the label's pieces to the GPU on master's corner rules. It does not
touch the corner rules, and this stage does not touch the pieces.

## Why

A corner of the border is a G1 rolling-ball fillet between two arms: its
vertex V, the contact q, the feet and the radius r, with K883's re-fit
where the ball would cross the cap. In motion, master's corners make
65-100% of the pop area on S3a6's pop census (`scripts/label_pops.ts`;
master pops 0.15-6.65 times a transition, F3). Both causes are in the
rules, not in the data:

- **First contact flips at grazes** (F6). Where two contacts nearly tie,
  the chosen one alternates between frames: j152/1's q alternates between
  two contacts 0.64 world apart.
- **K883's over(r) jumps and is not monotone** (F5). On def j13/0 it goes
  from -0.24 to +0.46 between r = 1.384 h and 1.51 h. On def j118/1
  master's walk stops at 0.878 h and the solve at 0.564 h.

S3a6 tried two stated rules. Calls 1-2 (a first-contact march and an
Illinois solve on over(r)) popped 5.2-9.8x master's area, and the first
exit (grow r from 0) 2.6-4.8x (F10). Neither is continuous: both still
choose among the roots of a discontinuous function.

## Coordinator's calls (technical)

1. **The criterion is continuity in the geometry.** V, q, the feet, r and
   whether the corner is live are continuous functions of the arms'
   points, except at discrete geometric events (an arm ends, a cluster
   splits or merges, two arms' order changes).
   - Where a rule chooses between candidates (two contacts, two roots),
     either the choice cannot flip without a finite change in the
     geometry, or the candidates blend continuously across the swap.
   - State each rule in one sentence, in the findings and in the code's
     comment.
2. **G1 rolling-ball fillets stay** (K881). A new re-fit must be
   continuous and monotone in the geometry, for example a closed form in
   the junction angle and the arc length to the cap. It is not a walk or
   a solve on over(r).
3. **A pure function of the frame** (S3a6 call 1): no carried root, and
   no hysteresis keyed on the last frame.
4. **Call 2 alone first:** master's root with only the Illinois re-fit
   solve from `39a295aa`. S3a6 never censused it.
5. **Candidates live in probe copies** (`oracle_*16.ts`, made as
   `oracle_nx14.ts` was) and run through the census's `--oracle`.
   - A rule lands in `src/render/field/oracle.ts` only after it passes the
     gate (call 6).
   - It lands with unit tests of its continuity: an arm swept through a
     graze, and a corner swept through the cap, with V, q and r moving by
     no more than the sweep's step allows.
   - Name the pins it moves in the commit message.
6. **The gate.** A rule lands only if all of these hold:
   - On every sequence, at zoom 1 and in the maximum zoom's windows, it
     has no more pops a transition and no more pop area than master,
     beyond the noise floor, and less pop area in total at each zoom.
   - The 12-scene raster census (`raster14.ts`, S3a6 F8) attributes every
     changed pixel.
   - `npm test` is green.
   - Its build cost is reported (S3a6 F7's method, `cost14.ts`). Cost
     blocks only if the build doubles.
7. **Changes in look** (say, a corner that was a V going round, or a
   different radius at rest) are Levi's call. Make crop pairs at rest and
   a frame strip in motion, and the coordinator takes them to Levi. They
   do not block the gate.

## Goal

A corner rule set that beats master's on the pop census at both zooms,
landed in `oracle.ts` with continuity tests. If none does, the findings
say what in the geometry stops it and what to try next.

## Order

1. **Setup, and the census windows.**
   - Start the dev server on port 5392 (K868's `env:` command with
     `--port 5392`). Every census run takes `--port 5392`.
   - Rerun master's census at zoom 1 and compare it with
     `pops14/before14/`. Any difference is the census's noise floor;
     report it.
   - **The maximum zoom** is follow mode's 277 px a world unit (S3a6 F1):
     12.4x def's fit and 13.0x muse's. Fit mode stops at 8x the fit. Check
     that frame 0's camera is the fit.
   - `--zoom` scales about the view's centre, which need not hold
     junctions. Add fixed windows to `scripts/label_pops.ts`: a committed
     list per sequence, at most three windows, centred on the junction
     clusters with the most corner pop area in `before14`. Every run uses
     the same list, and zoom 1's results stay unchanged.
   - Commit this alone, first, titled `K992: census windows`. S3a7
     cherry-picks it.
   - Run master there: `pops16/before16z/`.
2. **Call 2 alone** (`oracle_c16.ts`), censused at zoom 1.
3. **Master's discontinuities,** in Node (`fx14.ts`, `refit14.ts`,
   `dbg14_*.ts`). For each corner that jumps, list the cause (a contact
   flip, an over(r) jump, a re-fit that starts or stops, a status flip)
   and how far it jumps.
4. **Design the root and re-fit rules.** Prove each continuous on
   synthetic Node sweeps before running the census.
5. **The census,** at zoom 1, then in the windows. Iterate steps 4 and 5.
6. **If a rule beats master:** land it in `src/render/field/oracle.ts`
   with its tests. Then run the raster census, `npm test` and the cost.

## Rules

- **Branch and probes.**
  - Work on branch `k992-corners`, in worktree
    `.claude/worktrees/k992-corners`, made from master with this brief.
    Its `node_modules` is a junction to the main checkout's.
  - Commit at every milestone, broken or not, and never push.
  - The coordinator copied S3a6's probe kit into this worktree's
    `.claude/probes/S3a/` (untracked):
    - the recordings (`seq13/`), the 12 scenes (`scenes/`) and master's
      census (`pops14/before14/`);
    - the probe oracles (`oracle_m14.ts` is master's);
    - the harnesses (`fx14.ts`, `fx14_run.ps1`, `refit14.ts`,
      `raster14.ts`, `cost14.ts`, `cmp14_roots.ts`, `dbg14_*.ts`).
    `fx14_run.ps1` and `dbg14_pix.ts` are fixed to this worktree and
    port; `raster14.ts` takes the port as its third argument (`5392`).
    The other harnesses' default output paths still say `pops14`, so
    pass them a `pops16` path.
  - New files take `*16*` in their names. Census runs take `--out
    .claude/probes/S3a/pops16`.
  - The census and its page are tracked (`scripts/`). Name every change
    to them in its commit message.
  - Write each finding into a `## Findings` section of this brief as you
    get it, not at the end. It survives a compaction.
  - Stop the dev server at the end.
- **Timing and the census.**
  - Every timing, and every census run, goes under the perf lock
    (`$env:TEMP\claude-perf.lock`). Use `.claude\probes\S3a\locked16.ps1`
    (made from S3a6's `locked14.ps1`, with this stage's owner name). It
    waits inside one call while another owner holds the lock.
  - S3a7's agent runs the census on this machine too, and the cursive
    agent runs Python fits. Take each pair you compare back to back, and
    label the numbers taken under load.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`). A Read attaches the render lore every
    time.
  - Update the tests and pins that your changes move, and name each one in
    the commit message.
- **Not allowed:**
  - the phone;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile;
  - `LEDGER.md`;
  - the label's pieces, strips and passes (S3a7, S3a8).
- **Crop and look** at your own renders before you call a visual result
  done.
- **Levi** is named, never "he" or "his", even where older notes say so.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when step 6 is done, or when no rule beats master and the
    findings say why, or 2 h after your start, whichever comes first. Run
    `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, finish the step you are on and write down what is
    missing. What is left becomes the next stage.
  - A compaction is not a stop. After one, re-read this brief, its
    `## Findings` and `git log`.
  - On stopping:
    1. commit;
    2. append a `## Handoff` to this brief (committed);
    3. report.
- **The final report** gives:
  - the noise floor, the windows, and master's census in them;
  - call 2's census;
  - master's discontinuities by cause, with counts;
  - each rule tried, in one sentence, with its census at both zooms;
  - the rule that landed, if any, with its tests, the raster census and
    the cost;
  - the changes in look, with the crops' paths;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K992's current handle fields (branch, last commit, evidence, next).
