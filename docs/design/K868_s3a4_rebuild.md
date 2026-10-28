# K868 S3a4: the label rebuild's cost (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`). Previous stage: S3a3
(`docs/design/K868_s3a3_ink.md`). Before anything else, read its
`## Handoff`: the section on the in-thread host with the flag on, R7, R8,
R10 and How to rerun. Ledger items: K971 (this stage) and K974 (R10).

## Why

S3a3 put the band pass's ink behind `lbi` and merged flag-off
(`bbe112df`). With the flag on in fabric mode, a frame that rebuilds the
label costs about 2 s by the app's own counter (`__knotPerf()`):

- in-thread, p95 2161 ms against 1.5 ms with the flag off, so the knot
  never sleeps;
- on the worker host with flow on, p95 1788 ms.

The label rebuilds whenever the drawn positions change (a drag, flow,
the settle). That rule is right (S3a3's call 3), so a rebuild has to be
cheap enough to run on every frame. Until it is, every later stage
measures a flag nobody can use: the shape residuals (K972, K973), the
LOD (K923) and S3b's Pixel bench.

The suspect is inferred, not tested: the switch search
(`src/render/label/label_switch.ts`, `findSwitchLines`) runs uncached
on every rebuild over the fabric's 117-120 clusters. Knot mode has no
clusters, and it settles in-thread with the flag on.

## Coordinator's calls (technical)

- **Measure, then fix.** Split a rebuild frame's CPU cost into its parts
  before changing code: the switch search, the strip and piece builds,
  the uploads, and anything else the profile names. Keep the per-part
  timers as label counters that the probes read. They cost nothing
  unless read.
- **Cache by topology.** Whatever depends only on the topology is
  computed once per topology and cached: the crossing list (`xBy`),
  which crossings and clusters can switch, and where each switch sits
  along its chain in s. A rebuild re-evaluates only the geometry: each
  switch's world position and normal, from the drawn positions. If a
  flip's place moves along s as the threads move, re-check it locally
  near its cached place. The full search runs again only when the
  topology changes. Name the topology key, and what invalidates it.
- **Same answer.** The cached path's switch lines and ink equal the
  uncached search's:
  - on the 12 scenes;
  - in a drag sequence;
  - in a flow sequence.
  Each difference is a bug, or it is explained.
- **Flow keeps rebuilding.** With flow on at rest, the label still
  rebuilds on every flow frame (R8 is the rule working). It just has to
  be cheap.

## Goal

- **CPU cost.** A rebuild frame's CPU part (the label's own timers) has
  a p95 of 1 ms or less on this desktop, in fabric mode, during:
  - the in-thread settle;
  - a drag;
  - flow at rest.
  Check the worker host too. If a part cannot reach the target, report
  its cost and why. The phone is a few times slower, and S3b measures
  it there.
- **Sleep.** In-thread fabric with `lbi` sleeps about when flag off
  does. S3a3's settle11 read flag off as asleep by 40 s.
- **No change elsewhere.** Flag off stays pixel-identical to master,
  with the same physics hashes, and the suite stays green.
- **K320.** Its budgets cover the label and band programs (R10).

## Order

1. **Profile.** Under the perf lock, split the rebuild's cost into its
   parts:
   - in-thread fabric: the settle11 page, `phw=0&fw=0`, seed b;
   - worker-host fabric with flow on: `gp11/flow_watch`;
   - knot mode, for contrast.
   Write the breakdown into the handoff's draft as soon as you have it.
2. **The cache**, as the calls say. Then the same-answer check: a unit
   test on the scene fixtures, plus a probe over a drag and a flow
   sequence.
3. **Every other part over budget** that the profile shows: fix it at
   its source, under the same same-answer check.
4. **Measure again**, on step 1's pages:
   - settle11's sleep read, flag on against flag off;
   - S3a3's drag check (`drag11_locked.ps1`): the ink stays on the
     threads with no lag. Crop and look.
5. **R10.** Add K320 budgets for the label and band programs: today's
   numbers plus the headroom that K320's other entries have.
6. **Checks.**
   - The suite.
   - Flag off against master (`ab7_locked.ps1`).
   - The 12 scenes' ink against the oracle (`ink_cmp9.ts`). Its numbers
     match S3a3's `cmp10_all.log`, or each change is explained.

Not this stage:
- the band ink's shape residuals (K972, K973; S3a5);
- K923's LOD;
- sheet S3a;
- the label's bits for K943;
- S3b;
- K964, K966, K967.

## Rules

- **Branch and probes.**
  - Work on branch `k868-s3a`, in worktree `.claude/worktrees/k868-s3a`.
    The coordinator has fast-forwarded it to master with this brief. Its
    `node_modules` is a junction to the main checkout's.
  - Commit WIP at every milestone, broken or not, starting with your
    first edit to `src/`. Never push.
  - Keep probes and results in this worktree's `.claude/probes/S3a/`
    (untracked). Use a new file name per revision, because the dev
    server serves `.claude/` stale. Reusable harnesses go in tracked
    `scripts/`.
  - Write each finding into the handoff's draft when you have it, not at
    the end. It survives a compaction, and the transcript is a poor
    place to dig results back out of.
  - Dev server: S3a3's command (K868's `env:` line), port 5381. Stop it
    at the end.
- **Timing.**
  - Allowed only under the perf lock (`$env:TEMP\claude-perf.lock`, one
    line: owner, start time, what). If another owner holds it, wait
    inside one blocking command. A lock older than 30 min is stale.
    Delete it when you are done.
  - Another agent may be running Python fits on this machine. Take each
    before/after or on/off pair back to back, in the same window, and
    label numbers taken under load.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`). A Read attaches the render lore every
    time: S3a2 compacted 9 times in 78 minutes.
  - Main and `src/app/` write physics only through the host
    (`host_seam.test.ts`).
  - `npm test` passes at every milestone commit that touches `src/`.
- **Probes.**
  - Hook only the app's canvas for lost contexts. Pixi's
    `isWebGLSupported` test canvas loses its context on purpose.
  - Screenshots: `scripts/diag_screenshot.mjs` or S1a's driver. Never
    `--virtual-time-budget`. Probe links carry `&snd=none`.
- **Not allowed:**
  - the phone;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile;
  - `LEDGER.md`.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-6 are done or 2 h after your start, whichever
    comes first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, if steps remain, run step 6's checks on what you have.
  - A compaction is not a stop. After one, re-read this brief, your
    handoff's draft and `git log`.
  - On stopping:
    1. commit WIP;
    2. append a `## Handoff` to this brief (in the worktree, committed);
    3. report.
- **The final report** gives:
  - each step, done or not, with its commits;
  - the breakdown before and after, per page: each part's p50 and p95,
    and the app counter's p50, p95 and max, flag on against flag off;
  - the cache: its key, what invalidates it, what a rebuild still
    computes, and the same-answer results;
  - the sleep reads, and the drag check with the crops you looked at;
  - K320's new budgets;
  - whether the branch is ready to merge, in your view: flag off equals
    master, the suite is green, the ink is unchanged, and the cost is
    under the target;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K868's current handle fields (branch, last commit, evidence, next).
