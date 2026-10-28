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

## Handoff (draft, S3a4 in progress)

Started 2026-10-28 03:12 (stop 05:12). Probes and results:
`.claude/probes/S3a/` (untracked): `prof12.mjs` + `prof12_locked.ps1`
(pages settle | flow | knot | drag | dragw, flag on and off back to back,
perf lock), `prof12_table.mjs` (the tables below), `prof12_node.ts` (the
parts in Node on the scene fixtures) + `prof12_cpu.mjs` (folds a
`--cpu-prof` profile by function). Results: `prof12/` (step 1).

### Step 1: the breakdown (before), desktop, under the perf lock

The label's own CPU timers (`__knotLabel.timers(n, which, raw)`, commit
`acdeea14`): per rendered frame, diff (the moved() test and the snapshot),
gather (gatherSceneInput), scene (buildFieldScene), model (new
FieldModel), pieces (buildLabelPieces), switch (findSwitchLines), strips
(buildBandStrips), upload (setPieces + setStrips), label and band (the two
passes' render), composite (after()), frame (all of it). ms, p50 / p95 /
max over the window's rebuild frames:

| page | rebuild frames | gather | scene | model | pieces | switch | strips | upload | label | band | frame |
|---|---|---|---|---|---|---|---|---|---|---|---|
| settle11, in-thread fabric, 60 s | 26 | 0.5 / 1.2 / 1.8 | 16 / 32 / 33 | 2089 / 2519 / 2561 | 55 / 92 / 102 | 19 / 26 / 27 | 17 / 29 / 37 | 0.8 / 2.5 / 2.6 | 0.1 / 0.2 / 83 | 0.0 / 0.1 / 59 | 2244 / 2649 / 2656 |
| flow_watch, worker host, 3 s at rest | 2 | 0.5 | 19 | 1606 | 79 | 18 | 40 | 1.8 | 0.1 | 0.0 | 1759 |
| knot mode (mf=0), in-thread, 60 s | 416 | 0.1 / 0.3 / 0.8 | 5.2 / 7.9 / 15 | 71 / 102 / 139 | 12 / 19 / 46 | 0.0 / 0.1 / 0.6 | 5.9 / 9.1 / 22 | 0.4 / 0.6 / 1.9 | 0.1 / 0.1 / 80 | 0.0 / 0.1 / 82 | 95 / 136 / 384 |

(The label and band maxima are each page's first frame: the programs'
compile.) The app counter (`__knotPerf`), flag on against flag off:

| page | flag | p50 / p95 / max ms | asleep at the end |
|---|---|---|---|
| settle11, 60 s from load | on | 2.0 / 2218 / 2699 (309 frames) | no |
| | off | 1.3 / 1.9 / 2.6 (1514 frames) | yes (by 40 s) |
| flow_watch, 3 s at rest | on | 1786 (2 frames; never slept in 60 s) | no |
| | off | 31 / 42 / 45 (52 frames; slept at 15 s) | yes |
| knot mode, 60 s from load | on | 118 / 164 / 421 (697 frames) | no |
| | off | 29 / 34 / 60 (863 frames) | yes |

**The suspect was wrong.** The switch search is 1% of a rebuild (19 ms
of 2244). The FieldModel's constructor is 93% (2089 ms), and in Node on
the def fixture (`prof12_node.ts`, median of 3: model 1695, pieces 112,
switch 33, strips 33 ms; muse_hash: model 2662) a CPU profile puts 78%
of the whole rebuild in one function: `footInWindow` (geom.ts), called by
the corner solver's Newton steps (`solveCorner` -> `solve` -> `newton`,
from the constructor's corner loop and again from `buildSpans`' K883
trims). It scans EVERY segment of the chain for each call, whatever the
window, so each Newton iterate costs a whole chain. The rest of the
model: `partExtents` -> `hits` -> `footNear` (K922's part walk, ~9%),
`passReach` (~4%), `SegGrid` candidates (~4%).
**The order this stage follows** (the call is "Measure, then fix", so the
measurement reorders the work): first `footInWindow`, made to visit only
the segments the window touches (bit-identical: same float tests, same
visit order, same ties), because it is the one part that dominates; then
the brief's step 2 cache (the switch lines by topology), which is small
here but the call stands; then the remaining parts over budget, largest
first. The FieldModel is rebuilt from scratch every frame, so 1 ms per
rebuild is out of reach without caching the model itself by topology
(corners, spans, clusters) or moving the build off the main thread; the
report gives each part's cost after the fixes.
### footInWindow, visited by window (`efc8ebdc`)

`footInWindow` now binary-searches the first segment the window can touch
(per shift on a closed chain) and stops at the first segment past it: the
same float tests on the same segments in the same order, so the same
answer to the bit. Checked by `fiw12_check.ts` (the old full scan copied
in, against the new one, on every poly of the 12 scenes: random windows,
short, long, across the seam, empty, inverted, on segment ends; random
points near and far): 0 mismatches. The pipeline's outputs hashed
(`pipe12_hash.ts`: pieces, switch lines, strips, FNV-1a over every
float's bits) equal the base on all 12 scenes (`pipe12/base.json`). Node,
def, median of 3: model 1695 -> 461 ms; muse_hash 2662 -> 1200.

What the model costs after it (def, Node, per rebuild): FieldModel 462 =
buildSpans 262 (partExtents 191 -> hits 181 -> footNear ~140 self), the
corner solver's footInWindow ~123, passReach ~94, SegGrid candidates
~89; then buildLabelPieces 73, the switch 27, the strips 26.

### Step 2: the switch search, cached by topology (`2cb21e4d`)

**The split.** `switchTopo(m, key)` lists, per (chain, cluster) pair that
can switch, the table crossings between the chain and a chain the
cluster spans, in table order, with which side is over. `switchLinesFrom
(T, m)` is everything that moves with the threads: each crossing's
current arc length (`normS`), the candidates (each window's two ends and
the midpoints of overlapping windows), the fill-order flip test, the
cluster at s (`clusterAt`), the point and normal there, and the reach
test against the cluster's corners. `findSwitchLines` is the two in a
row, so the cached and the uncached search are the same code.

**The key** (`switchKey`, an Int32Array): the chain count; the crossing
count; per table crossing its two chain indices (`idxOf`, -1 = not drawn)
and its over side (a, b, other); the cluster count; per cluster its
spanned-chain count and the sorted chain indices. It changes, and the
topology is rebuilt, when a crossing appears, goes, is reordered or
flips; when a chain comes or goes; when clusters merge, split, renumber
or span other chains. A rebuild with the same key reruns only
`switchLinesFrom`. `__knotLabel.stats` counts `switchHits` and
`switchMisses`.

**What it saves.** Little, as step 1 said: in Node on def the key costs
0.03 ms, the topology 1.8, the geometry 11.6 (uncached 13.2), so the
cache keeps 14% of the switch (`swkey12_diag.ts`). The geometry part is
mostly the reach test's `inFill` calls (37%), so the same commit adds an
exact prefilter: a corner whose box (its G2 polygon's box, or q +/-
(vq + h) for the wedge form, where `inFill` returns false outside both)
misses the bounding box of the cross-section's nine points is skipped; a
NaN point keeps every corner. `inFill` is pure and the test is an OR, so
skipping corners where it is false changes nothing. Geometry def 11.6 ->
7.4 ms, muse_hash 6.5 -> 3.8, g41_user_tw64 3.1 -> 1.5 (uncached def
13.2 -> 10.0). `clusterAt`'s closed-chain branch also drops its
per-span `[-len, 0, len]` array (same shifts in the same order).

**Same answer.** (1) `pipe12_hash.ts` on the 12 scenes: pieces, lines
and strips equal the base, cache and prefilter both
(`pipe12/swcache.json`, `pipe12/reach.json`). (2) A topology kept from
one geometry applied to moved geometry with the same key
(`swcache12_scenes.ts`: every sample and junction centre moved by a
smooth field, every crossing's s shifted, three amplitudes): 36 runs,
the key held in 24, 0 differences. (3) The unit test
`test/render/label/label_switch_cache.test.ts` on the 15 synthetic
scenes, as built and with every crossing flipped at sigma 1.2 h (flipped
j_cross gives a line at s = 17.2; none of the synthetic scenes switches
at the default sigma), three moves each; it also checks the key sees an
over flip and a dropped crossing, and that `sameSwitchLines` compares
every field to the bit. Suite at `2cb21e4d`: 2386 passed, 6 skipped.

**The key churns under small moves** on the big scenes: in def,
muse_hash, g41_def_tw64 and g41_user_tw64 a move of 0.005 h already
changes it, because junction clustering is geometric (clusters merge,
split and renumber; def: 63 clusters' spanned chains differ). So in the
browser the hit rate may be low while the knot moves; the stats say.

**In the browser** (`verify12_locked.ps1`, `prof12_verify/`, flag on,
in-thread, `verifySwitch` on: every rebuild also runs the uncached search
and compares the lines to the bit). Cumulative counts at each page's end
(checked < rebuilds: verify is switched on a few rebuilds in):

| page | rebuilds | hits | misses | checked | diffs |
|---|---|---|---|---|---|
| settle (30 s) | 51 | 12 | 39 | 48 | 0 |
| drag (rest, then a drag) | 135 | 70 | 65 | 132 | 0 |
| dragw (worker host) | 82 | 62 | 20 | 79 | 0 |
| flow (rest, then flow) | 67 | 30 | 37 | 64 | 0 |

0 differences in 323 checked rebuilds. The hit rate is 24% while the
knot settles and 46-76% after: the key churns as the step 2 note above
says, so the cache saves at most its 14% of a 1% part. Frame p95 with
verify on (the search runs twice): settle 776 ms, drag 693, dragw 708,
flow 517; the rebuild is still the FieldModel, below.

### Step 3: the part walk's tests, skipped where known false

`partExtents`' `hits(t)` (oracle.ts) is the OR of pure tests: per member
of the cluster, nine `footNear` searches (the cross-section's points, u
up to 0.999 h either side), then per corner fill nine `inFill`s. Two
exact skips: (1) one grid query of half-side 2h around the walker's
point a per step; a member none of whose window segments (the same clip
as footNear's, measured to the whole segment) lies within 2h of a is
skipped, since every point is within 0.999 h of a, so every foot is
farther than h and `d < h` fails; (2) a fill whose box (`fillBox`, the
same box the switch search uses, now one method on the model) misses
the nine points' box is skipped, since inFill is false outside it. A NaN
point skips nothing. The nine points are computed once (the same
expressions), and the closed chain's inside test drops its
`[-len, 0, len]` array (same shifts).

Same answer: `pipe12_hash.ts all` equals the base on the 12 scenes
(`pipe12/step3_walk.json`); suite 2387 passed, 6 skipped. Node, median
of 5 (`prof12/step3_base.log` -> `step3_walk.log`, under the lock):

| scene | model before | model after |
|---|---|---|
| def | 450 ms | 302 |
| muse_hash | 1210 | 579 |
| g41_user_tw64 | 691 | 260 |
| fat | 148 | 141 |
| ring | 62 | 48 |

def's profile (`prof12/cpu_s3walk`): partExtents 188 -> 43 ms a build.
What is left in def's 302: the corner solve (`solveCorner` -> `newton`
-> `footInWindow`, 125), `passReach` (91, most of it `candidates`, 85),
then the rest of buildSpans; buildLabelPieces 75.

### Step 3: passReach asks the grid for one chain

`passReach` (oracle.ts) walks nine points across a pass and, per point,
lists `candidates` within h, then keeps only those on the other pass's
chain `pb`. `candidates` (geom.ts) now takes that chain (`only`) and
drops the other chains' segments right after the grid query, before the
per-segment feet. Each chain's candidates come from its own segments
alone, so chain pb's list is the same, in the same order. Same answer:
`pipe12/step3_reach.json` equals the base on the 12 scenes; suite 2387
passed, 6 skipped (`pipe12/suite_step3reach.log`). Node, median of 5
(`prof12/step3_reach.log`, under the lock):

| scene | model, step3_walk | model after |
|---|---|---|
| def | 302 ms | 259 |
| muse_hash | 579 | 514 |
| g41_user_tw64 | 260 | 225 |
| fat | 141 | 134 |
| ring | 48 | 47.5 |

What is left in def's build (`prof12/cpu_s3reach`, per build): the
corner solve ~120 ms (`newton` -> `footInWindow`), passReach ~54
(`candidates` 45), partExtents ~43; then buildLabelPieces ~73
(`windowOf` 28), buildBandStrips ~26, the switch search ~13. def's
whole rebuild in Node is now about 380 ms (was about 2 s in the browser
at step 1): far over the 1 ms goal, which a from-scratch FieldModel per
frame cannot reach (see the ledger items).
