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

## Handoff (2026-11-04 20:30, agent a023a39925efe4816)

Stopped at the 2 h cap. Goals 1, 2 and 4 are done; goal 3 is done with
one defect open (S4b, below). Branch `worktree-agent-a023a39925efe4816`:
4a3a5ab6 (brief), b48c45f7 (WIP), 3dbd0be0 (code and tests, green),
8d35eefc (probes, locality A/B, P1-P6 table), b306333f (kPulseV2 calls
kPulseCrestK once; sheets, bench, compile times), then this Handoff.
`npm test` green at 3dbd0be0 and b306333f (2870 passed, 9 skipped).

### What landed

- kPulseV2 (`paint_glsl.ts`, mirror `paint_math.ts`): gA = dA + d,
  gB = dB + W - d, the nearer end's crest, times min(1, |gA - gB| 0.5 /
  PULSE_RIDGE_FADE 0.5) (`paint_const.ts`). Both trains meet in phase at
  the ridge (gA = gB) and fade over +-0.5 world. One-ended items run
  today's kPulseV; the pins did not move, so pre_g23 needs no re-freeze.
- T6 (cycles) and T7 (self-loops) in `pulse_path.ts`, tests first.
- Bands (`junction_field.ts`): tree-child bands keep their slots; a band
  is appended for every non-tree arm or self-loop at its near junction
  (not the head), a self-loop lit at both ends gets a second, and a
  two-ended non-loop gets one at its far end.
- Shader text +555 characters in each PAINT_PAINT_GLSL program (K320's
  measure: section 58,995, budget 59,050; explore 75,410; strip 34,250;
  +561 at 3dbd0be0); junction field and still pluck unchanged.

### Locality (same-state A/B, base 25ce2321 vs 3dbd0be0; `ab_cyc.mjs`)

0 px outside the touched arms and fans on every stand (A/B PASS). Changed
px (max) at t0 / t1: control 0/0; fork, cross, four 0/0 (key format
only); src 1126 (57) / 1255 (109), bands at mnode_49; x4 913 (106) /
571 (58), bands at node_378 and node_386; cyc 845 (31) / 1125 (118),
e210 two-ended and its band at node_218; loop 1617 (111) / 2254 (111),
e102 one TWO item (base declared it twice), no band; preloop 2431 (110)
/ 2202 (111), e102 two-ended, bands at mnode_19 and node_635.
b306333f against 3dbd0be0: 0 px on cyc, loop, preloop and x4, both
moments (`out/s4cyc/ab_one/`).

### P1-P6 (CPU, `table_cyc.mjs` -> `out/s4cyc/table_cyc.txt`)

- P1/P2 at the joints (cyc end B, preloop ends A and B; loop's ends
  are the head): |dv| <= 0.0006, step <= 0.0005.
  Ridge |dv| 0 on every stand. Largest per-sample change 0.0316 (cyc;
  one-ended 0.0213), loop 0.0299, preloop 0.0232.
- P3 1.600 and P4 0.719-0.722 on both sides; preloop's 0.623 is the
  reach window narrowing a crest at dG 7.04 (one-ended FWHM equal at
  every time: `p6dbg_cyc.txt`).
- P5 (the dark stretch): cyc 0.135, loop 2.065, preloop 2.445. The 0.1
  bar is a joint bar; one-ended trains already have 1.07 between crests,
  and two trains meeting at a ridge lose their crests in pairs there by
  design. A look item, not a defect.
- P6a passes on cyc (4 edges), loop (6), preloop (10), x4 (14). P6b's
  surplus maxima are all dim tails (<= 0.384) within 0.6 world of the
  ridge, of crests already past it or under the reach fade
  (`p6dbg_cyc.txt`).

### Open defect, S4b: the bands lack the ridge fade

Observed (`out/s4cyc/sheets/cyc_e210_kymo.png`, `kymo_rows_cyc.txt`): on
cyc e210 both builds have an edge about 0.57 world from node_218, the
fan's reach into e210. S4 shows a step there: the band draws the B-side
crest near full (luma 209-235) and the ribbon one sample on draws it
faded (178-181; unlit 173-175). Cause (code): a band's crest is the arm
field at dG = distJ + tau (PULSE_CREST_GLSL), one-ended. e210's ridge is
(dA + W - dB) / 2 = 0.68 world from node_218, so its fade zone overlaps
the band; there the ribbon's ridge factor is about 0.22 and the band's 1.
The CPU table checks only the junction point, so P1 missed it.
Fix sketch: pack gR = (dA + dB + W) / 2 into a free band slot (R2.w or
R3.w, 0 = no ridge), multiply the child-side crest (dG > distJ) by
min(1, 2 |dG - gR|) in the band loop (the parent arm is a tree arm,
always one-ended), add the CPU twin and a test, re-run `ab_cyc.mjs` and
`sheets_cyc.mjs`. Adds text to the junction-field program (40,097).
Inferred, not observed: when xR < 0.5 a two-ended arm's own ridge factor
is under 1 at its joint, a P1 step against the one-ended parent.

### Cost

- Frame at rest, pulses on (`out/s4cyc/bench_rest.json`, ABBA x4, 5 s,
  k111, desktop RX 6800 XT): frameP50 base 7.15 ms, 3dbd0be0 7.10: PASS.
  Covers the start head's one-ended pulses only.
- Cold compile, section-rgb (K307 `k307/trace_intro.mjs`, link to
  COMPLETION_STATUS, fresh profile; `k307/runs/*/summary.json`): base
  6.55, 6.75, 6.71, 6.52 s; 3dbd0be0 7.06, 7.52 s (+0.66, first visible
  +0.63: FXC inlined both kPulseCrestK calls); b306333f 6.84, 6.54 s,
  inside base's spread.
- Pixel: `out/s4cyc/pixel_batch_plan.md`, not run; build from b306333f
  or later.

### Sheets (viewed in crops)

`.claude/probes/K1139/out/s4cyc/sheets/`: `cyc_e210_moments.png`,
`cyc_e210_kymo.png`, `loop_e102_moments.png`, `loop_e102_kymo.png`
(base row above, S4 below, four moments; same state per moment). Loop:
base draws two crossing one-ended trains with hard steps; S4 draws trains
from both ends meeting at the ridge in smooth chevrons. Cyc: the head's
train now runs through node_218's fan, with the S4b step at its edge.

### Probe gotcha

On a Vite dev server, a `?t=` reload makes `dump_cyc.mjs`'s dumpPulses
import a second, empty module instance (every arm reads world 0);
`table_cyc.mjs` falls back to the pre-S4 `d/` dumps. Dump from a
`vite preview` build.

### Next

S4b (above), then the merge, the Pixel batch and Claude's look, then S5.
