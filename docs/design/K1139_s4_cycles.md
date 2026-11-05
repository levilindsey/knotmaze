# K1139 · S4: pulses on loops and cycles

Written by Claude (the coordinating session) on 2026-11-04 for one Claude
Opus agent and one stage: S4 of the plan,
`docs/design/K1139_pulse_junctions.md` section 5. The plan's checks
(section 4) and its harness (the appendix) apply wherever this brief does
not say otherwise.

## Why

Levi (2026-11-03): "we have to make pulses animate correctly across
junctions"; (2026-11-04) "perfecting all junction and cursive work is
always my main priority". S1 to S3b landed, and S3b's fix merged at
71eedb94 (its record: Stage 4's handoff in `docs/design/K1139_s3b_fix.md`).
Levi's answers to the plan's questions: the light splits at a fork (A);
behind you it runs toward you; through your own junction it goes straight
through, with no dim moment.

Today a pulse only knows trees. On a cycle the light can reach an arm
from both of its ends, and a self-loop leaves its junction and comes back
to it. Neither case is handled. A known gap: the cycle arms e79 (node_386)
and e134 (node_378) get no band, because the pulse tree declares bands
only to tree children.

## Goal

1. **`kPulseV`'s two-ended form with the ridge fade**, in
   `src/render/paint_math.ts` and its GLSL twin in
   `src/render/paint_glsl.ts`, as the plan designs it
   (`dG = min(dA + d, dB + W - d)`). Two fronts entering an arm from its
   two ends meet at a ridge that fades, with no seam and no jump. On a
   one-ended arm the result equals today's exactly.
2. **`src/render/pulse_path.ts`: T6 (cycles) and T7 (self-loops, one item
   per loop)**, tests first, in `test/render/pulse_path.test.ts`.
3. **Bands on cycle arms**, so the light crosses the fans of an arm that
   closes a cycle (e79 and e134 on the stands) like any other arm.
4. **`test/render/fixtures/pre_g23` re-frozen** for the changed `kPulseV`
   (`paint_gameplay.test.ts`). The commit names what moved.

Leave these alone: the fork front's rule and widths, ji 149's partition
and the notch (Levi's look calls, K1190), and `PULSE_OUT_LEAD` and
`CREST_RAMP` (S5, its own stage).

## Checks

- `npm test` is green at every commit.
- T6 and T7 are green.
- P1-P6 (plan section 4.2) pass on a stand with a cycle and a stand with
  a self-loop. Find both with `scan.mjs` and add them to the stands
  (section 4.4).
- **Locality.** Run a same-state A/B of the merge base against your branch
  on the existing stands and the two new ones. Expect 0 px changed outside
  the arms and fans a two-ended pulse touches. Report the counts per stand,
  and explain any pixel that moves elsewhere.
- **Cost.** The ribbon shader program changes. Measure the desktop frame
  cost at rest with pulses on, merge base against branch, in ABBA rounds
  (`scripts/bench_frame.mjs`, under `run_locked.ps1`). Also measure the
  shader compile time if K307's probe runs on the desktop. The Pixel half
  goes to the coordinator's phone batch: write its plan (stands, ports,
  commands) as `.claude/probes/K1139/out/s4cyc/pixel_batch_plan.md`, and
  do not touch the phone.
- **Sheets for Claude's look.** For each new stand:
  - a 2x crop of the cycle arm (or the loop) and its fans at four moments,
    with rows for the merge base and S4, in Stage 3's layout;
  - a kymograph along the cycle.

  The PNGs go in `.claude/probes/K1139/out/s4cyc/sheets/`. View them in
  crops before you report them.

## Outputs

- The code and tests, on your branch.
- The probes `.claude/probes/K1139/*_cyc.mjs` and their outputs in
  `.claude/probes/K1139/out/s4cyc/`, in your worktree. Commit tables and
  PNGs with `git add -f`; leave dumps untracked.
- The Handoff, appended to this brief.

## Order

1. Run `Get-Date`: it is the start time. Copy this brief to
   `docs/design/K1139_s4_cycles.md` in your worktree and commit it before
   anything else.
2. Read the plan's sections 2, 4 and 5. Then read Stage 4's handoff in
   `docs/design/K1139_s3b_fix.md` (Merge, Proposals, Sheets) and that
   file's section 7 (the worktree setup).
3. The stands: `scan.mjs` for a cycle and a self-loop, and their dumps.
4. T6 and T7 in `pulse_path.ts`, tests first.
5. `kPulseV`'s two-ended form (CPU and GLSL), the bands on cycle arms, and
   the re-freeze.
6. The checks, the sheets, the Pixel plan, the Handoff.

## Setup

- The repo is `C:\Users\lsl\Repositories\knotmaze`. Your branch and
  worktree are the ones Claude Code made for you.
- The worktree's node_modules junction, the server and the probe harness
  are in `docs/design/K1139_s3b_fix.md` section 7.
- Start the server from your worktree:
  `npx vite --config .claude/probes/K1139/vite.private-cache.config.ts --port <p> --strictPort --host 127.0.0.1`.
  `<p>` is a free port in 5620-5639; check it first with
  `Get-NetTCPConnection -LocalPort <p>`. Stop your servers when you
  finish.
- GPU probes run through `.claude/probes/K1139/run_locked.ps1 -Batch`. It
  holds the machine's perf lock; never time anything outside it.

## Rules

- Muse is committing on master in the main checkout (batch 18 run D
  touches the burn's paint). So never touch the main checkout's tracked
  files or master, and never run git there. The coordinator rebases your
  branch when it merges; don't rebase it yourself.
- Don't edit `LEDGER.md`.
- Commit on your branch at every milestone, broken or not. Never push.
- No subagents. No phone. Ports 5620-5639 only.
- Use PowerShell for commands. Read code through the shell
  (`Select-String`, ranges of `Get-Content`); use the Read tool only right
  before an Edit.
- No `--virtual-time-budget` screenshots (CLAUDE.md's verification rule).

**Stop rule.** Stop at the stage's end or 2 h from the start, whichever
comes first; run `Get-Date` at each milestone. To stop: commit WIP,
append the Handoff to this brief, commit, report. A compaction is not a
stop; after one, re-read this brief and `git log`. This stage is S4 only.

## Report

- What moved, with numbers: P1-P6 per stand, locality px, frame cost,
  compile time.
- The sheets' paths.
- A `Ledger items` list: follow-ups and residuals.
- K1139's handle fields: owner, branch, last commit, evidence, next,
  brief, env.

## Later work (not S4's)

- S5: `PULSE_OUT_LEAD` 0 and `CREST_RAMP`'s dip at your own junction
  (plan section 5), its own stage after S4.
- Levi's look calls on S3b's fix (K1190): the fork front's arc at ji 33,
  the straight edges left in the fan at ji 33, ji 149's gold edge and its
  curved front, the notch.
- The Pixel batch for S3b's fix and S4 (the coordinator runs it).
- S6: the route pulse (K1140).
