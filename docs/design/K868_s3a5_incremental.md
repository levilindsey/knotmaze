# K868 S3a5: the label's per-frame path (design stage brief)

Stage brief (coordinator, 2026-10-28). Parent: K868
(`docs/design/K868_field_border.md`). Previous stage: S3a4
(`docs/design/K868_s3a4_rebuild.md`). Before anything else, read its
`## Handoff`: the breakdown, the cache, and "why 1 ms is out of reach".
Ledger items: K971 (this stage) and K979 (S3a4's measurement leftovers).

## Why

S3a4 made a rebuild 4-5 times cheaper with exact fixes (merged). With
`lbi` on in fabric mode, a rebuild frame still costs about 0.44 s on this
desktop. The label's own timers read p50 441 ms in the in-thread settle,
and the app counter reads p95 510 ms. The target is 1 ms. The cost is the
FieldModel, which the label builds from scratch on every rebuild frame.
In Node, on def:

| part | ms |
|---|---|
| corner solve | ~120 |
| buildLabelPieces | ~73 |
| passReach | ~54 |
| partExtents | ~43 |
| buildBandStrips | ~26 |

The switch search, which S3a4 cached, is about 6 ms of a 440 ms rebuild.

A 400x gap does not close by tuning. It needs a different per-frame path.
This stage designs that path and proves its cost on prototypes before any
of it goes into `src/`. The coordinator reviews the design before the
implementation stages start.

## Coordinator's calls (technical)

- **Same frame, no lag.** The ink comes from the positions the frame
  draws (S3a3's call 3 stands). So the label is not built in a worker one
  build behind (S3a4's option b). Its ink would trail the threads in a
  drag, and the phone's CPU would still pay for every build.
- **Structure cached, geometry evaluated.** Split what the FieldModel
  computes into two kinds:
  - **Structure:** what exists and how it connects (corners, parts,
    pieces, strips, switch lines, which chain and side each belongs to,
    which pass is over) and where each sits along its chain in s. It is
    cached, and updated locally when the threads move far enough to
    change it.
  - **Geometry:** world positions, normals and widths, evaluated from the
    drawn positions at draw time. Where possible this happens on the GPU,
    from the chain samples the renderer already uploads, so the CPU sends
    s values, not vertices. The CPU keeps only the few numbers that need
    a solve (the corners), warm-started from the last frame.
- **Keys that hold under motion.** A key names things by stable ids
  (chains, crossings, junctions), never by an index that renumbering
  changes. S3a4's switch key changed on 39 of 51 settle rebuilds, because
  junction clusters are geometric and renumber as they merge and split.
  Clusters merging or splitting are local events that rebuild only the
  clusters involved.
- **Same answer.**
  - The incremental path equals a from-scratch build: the same
    structure, and positions within a tolerance you state, with why it
    cannot show (a fraction of a pixel at the closest zoom).
  - Check it over the 12 scenes, a drag sequence and a flow sequence.
  - The from-scratch build stays as the reference, and as the oracle's
    check.
- **The target stays:** the label's CPU part at p95 1 ms or less per
  frame on this desktop. That holds in fabric mode (the settle, a drag,
  flow at rest) and in knot mode. If the design cannot reach it, say by
  how much, with numbers, and what would reach it (for example more of
  the label on the GPU).

## Goal

A `## Design` section appended to this brief. It gives:
- **Per part** of today's build (the corner solve, passReach,
  partExtents, the pieces, the strips, the switch lines, the clusters,
  and anything else the profile names):
  - what it reads: topology, slowly changing geometry, or this frame's
    positions;
  - its cost now;
  - its incremental or GPU form;
  - its expected per-frame cost.
- **The structure:** its data layout and the events that invalidate each
  part of it.
- **The GPU side:** what moves to the shaders, and how they get from s to
  a position (which chain sample table, and whether its precision holds
  the tolerance).
- **The per-frame CPU total:** from prototypes, not estimates. Prototype
  at least the corner solve and the pieces in Node, on def and one fabric
  scene, over a recorded drag and flow sequence.
- **The implementation stages** after this one. Each is a brief-sized
  step with its own same-answer check and cost check.

## Order

1. **Map.** Read the FieldModel's parts through the shell, with S3a4's
   timers. Write the per-part dependency map into the design's draft as
   you go.
2. **Sequences.** Record a drag sequence and a flow sequence of drawn
   positions, on def and one fabric scene. Put them in
   `.claude/probes/S3a/seq13/`, with the script that records them.
3. **Prototypes.**
   - Prototype the incremental forms of the corner solve and the pieces
     in Node, plus any other part the map shows can't simply be
     evaluated from s.
   - Check each against the from-scratch build on every frame of the
     sequences.
   - Measure each per frame, under the perf lock.
4. **The GPU evaluation.** Work out what the label and band vertex
   shaders need per vertex (chain, s, side, offset). Check in Node that
   evaluating today's pieces and strips from s reproduces today's
   vertices within the tolerance.
5. **Write the design:** the rest of the parts, the expected total, the
   stages after this one, and the risks.

Not this stage:
- changes to `src/` (the implementation is the next stages);
- the band ink's shape residuals (K972, K973);
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
  - Commit the design's draft at every milestone, and never push.
  - Keep prototypes and results in this worktree's `.claude/probes/S3a/`
    (untracked), with a new file name per revision (`*13*`). Reusable
    harnesses go in tracked `scripts/`.
  - Write each finding into the design's draft when you have it, not at
    the end. It survives a compaction, and the transcript is a poor place
    to dig results back out of.
  - Dev server, only if a browser recording needs it: S3a3's command
    (K868's `env:` line), port 5381. Stop it at the end.
- **Timing.**
  - Every timing, in Node too, runs under the perf lock
    (`$env:TEMP\claude-perf.lock`, one line: owner, start time, what). If
    another owner holds it, wait inside one blocking command. A lock
    older than 30 min is stale. Delete it when you are done.
  - Another agent may be running Python fits on this machine until about
    05:30. Take each pair you compare back to back, and label numbers
    taken under load.
- **Code.**
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`). A Read attaches the render lore every
    time.
  - Prototypes import from `src/` read-only.
- **Not allowed:**
  - the phone;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile;
  - `LEDGER.md`.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-5 are done or 2 h after your start, whichever
    comes first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, write the design from what you have, and mark what is
    estimated rather than measured.
  - A compaction is not a stop. After one, re-read this brief, the
    design's draft and `git log`.
  - On stopping:
    1. commit;
    2. append a `## Handoff` to this brief (committed);
    3. report.
- **The final report** gives:
  - the design in short: per part, the cost now, the form, and the
    expected cost, measured or estimated (say which);
  - the prototypes: per-frame cost (p50, p95) and the same-answer
    results on each sequence;
  - whether 1 ms is reachable, and if not, by how much and what would
    reach it;
  - the implementation stages, in order;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K868's current handle fields (branch, last commit, evidence, next).

## Design

Written as the stage went (agent, 2026-10-28). Timings are Node on
this desktop, under the perf lock, but **under load**: the cursive
agent's Python fits ran through the whole stage. Each compared pair was
taken back to back.

### 1. Map: what each part reads and costs

Measured on frame 0 of the recorded drags (section 2), `seq13_map.ts`:
the label's own params, clean totals (median of 5), then a split with
each FieldModel method wrapped (inclusive, outermost call; the wrappers
add about 15%).

| | def | muse_hash |
|---|---|---|
| chains / points / junctions / crossings | 92 / 24432 / 185 / 353 | 86 / 23273 / 166 / 350 |
| corners / clusters | 386 / 120 | 342 / 89 |
| model, clean | 251 ms | 525 ms |
| pieces / switch / strips, clean | 74 / 12 / 32 ms | 53 / 8 / 32 ms |

Inside the model (wrapped, ms; calls):

| part | def | muse | calls def / muse |
|---|---|---|---|
| solveCorner, all calls | 158 | 217 | 466 / 643 |
| ... of which K883 re-fits (by calls) | ~27 | ~101 | 80 / 301 |
| buildSpans (incl. partExtents and the re-fits) | 119 | 260 | 1 |
| partExtents | 51 | 110 | 2 |
| passReach | 53 | 81 | 1412 / 1400 |
| buildPassTags | 8 | 4 | 1 |
| rawSpans, armExtents, opening | 4 | 5 | |
| makePoly for every chain | 1.1 | 1.3 | |
| the two SegGrids | 4.5 | 3.7 | |

Calls into the per-point helpers: the pieces call `depthAt` 368k times
and `clusterAt` 39k times on def; the strips call them 50k and 25k times;
buildSpans calls `windowNear` 34k (muse 118k) and `footNear` 19k (39k)
times.

What each part reads:

| part | reads | kind of output |
|---|---|---|
| polys (`makePoly`, END extensions) | this frame's points; the junction arms (an END's extension) | geometry |
| depth pins | the crossing table: which pass is over (topology), each crossing's s on both chains (moves every frame) | structure + s |
| `opening` (theta) | this frame's points near the junction | geometry (slow) |
| corner solve (V, q, feet, tangent points) | this frame's points inside each arm's window | geometry: the only solve |
| buildSpans: caps, partExtents, crossing cuts, K883 re-fit, g2Of, armExtents, geoExtents, rawSpans | the corners, this frame's points (part walks of `footNear`/`windowNear`), the crossing table | structure: s intervals per chain per junction |
| clusters | the junctions' spans (overlap on a chain) | structure, geometric: merges and splits |
| buildPassTags | the spans, the crossing table | structure |
| SegGrids | this frame's points | an index |
| passReach (rL, rR per pass pin) | the points near each crossing; quantized to h/8 | slow geometry (piecewise constant) |
| pieces: tubes | per poly segment: z-split by `depthAt`, cut at chainSpans, `clusterAt`, end kinds, rank | structure (s cuts, cluster, rank) + geometry (endpoints, z) |
| pieces: windows | `windowOf`: every segment of each arm window, z-split | geometry |
| pieces: fills, crossing rows | the corners (q, r, vq, uA, uB), the clusters' crossings | geometry (corners) + structure |
| switch lines | topology cached (S3a4); the crossings' s, the clusters, `inFill` | structure + geometry |
| strips | per segment normals, chainSpans cuts, `clusterAt`, `depthAt`; caps; corner arcs | geometry, cut by structure |
| scene (browser only: gather + buildFieldScene) | the renderer's samples, the crossing table | 19-23 ms in the browser (S3a4) |

### 2. Sequences

`.claude/probes/S3a/seq13_record.mjs` records one FieldScene per frame
(`__knotSceneExport`) on an in-thread page (`phw=0`, `lbi=0`), after the
knot sleeps. Files: `.claude/probes/S3a/seq13/<scene>_<mode>.jsonl.gz`,
41 frames each.

- **drag:** grab the thread nearest the centre and drag it along
  prof12's 60 px arc, 30 moves; after each move one frame runs, then the
  physics is frozen while the scene exports. Then 10 frames after the
  release.
- **flow:** 40 consecutive repaints with flow on (`fw=0.3&fv=0.5`; the
  fixture links carry `fw=0`, so a flow probe has to set it).

What moves (`seq13_stats.ts`, frame to frame):

| | def drag | muse drag | def flow | muse flow |
|---|---|---|---|---|
| points moved | 100% (min 98.9%) | 100% | 100% | 100% |
| max displacement, p50 / max | 0.033 / 0.67 | 0.058 / 1.08 | 0.030 / 0.050 | 0.032 / 0.064 |
| median displacement | 0.00025 | 0.00045 | 0.0058 | 0.0056 |
| frames whose sample count changes | 2 | 8 | 9 | 14 |
| topology changes | 0 | 0 | 0 | 0 |
| crossing s drift, p50 / max | 0.022 / 0.38 | 0.033 / 0.55 | 0.040 / 0.060 | 0.043 / 0.079 |

(world units; h = 0.26, 22.34 px per unit at the default zoom.)

So:
- **Every point moves on every frame**, in a drag and in flow. Skipping
  what did not move saves nothing; every corner needs a re-solve each
  frame, warm or on the GPU.
- **s drifts on every frame** (chord-length s shifts as the points
  move), so a cut cached as an s value is wrong one frame later. Keys
  and cuts are held in the renderer's sample space (chain id, sample
  index k, fraction t), and s is evaluated from it.
- **A chain's point count changes** on 5-35% of frames (1-4 chains at a
  time). The cause is not checked: it may be the renderer's sample count
  or the fused-tip tuck's. Either way it is a local event: that chain's
  sample keys are remapped (by arc fraction), not the whole structure.
- No crossing or junction appeared or vanished in these sequences.

### 3. The corner solve

**Where today's corner time goes** (`seq13_cornercost.ts`: frames 0-2,
3 reps, medians; under the lock, under load, one run):

| ms | def | muse |
|---|---|---|
| a whole FieldModel | 338 | 660 |
| solveCorner inside it, all calls | 189 (466 calls) | 270 (640 calls) |
| ... the first solve per corner, at the rule radius | 95 | 163 |
| ... K883's re-fit solves | 83 (40 corners re-fit) | 107 (164 corners) |
| every corner re-solved on the built model at its rule radius | 66 | 195 |
| every corner re-solved at its final radius | 16 | 39 |

Most of the corner time goes to radii that the re-fit then gives up. Those
are the rule-radius solves of corners whose tangent points run past their
caps, and the re-fit's own iterations (up to 7 solves per corner). At the
final radius, all the corners together cost 16-39 ms.

**The warm prototype** (`seq13_corner.ts`). Each corner is keyed by its
junction's id and its index around the junction. On each frame:
- Newton starts from the last frame's V and q and their feet.
- It projects feet only within ±2h of the last feet, on this frame's
  points, at the corner's final radius.
- It falls back to today's cold solve when any of these holds:
  - the corner is new, or was not ok last frame (noV);
  - its chain's point count changed (the prototype keys feet by s, the
    design by sample index);
  - Newton fails;
  - a foot lands on the ±2h window's edge, or on an arm window's end
    (today's solve can return such a root, so the cold solve decides it).

On every frame, V, q and the four feet are checked against today's
from-scratch build, to 1e-4 world.

Same answer (no timing):

| | def drag | def flow | muse drag | muse flow |
|---|---|---|---|---|
| corner solves (41 frames) | 15826 | 15826 | 14022 | 14022 |
| warm differs past 1e-4 | 3 | 55 | 13 | 17 |
| ... corners involved | 1 | 5 | 1 | 4 |
| ... first differing frame is a reference jump | 0 | 2 | 1 | 3 |
| largest difference (world; window-end roots excluded) | 0.83 | 1.66 | 0.94 | 1.55 |
| reference jumps (V or q moves > 0.1 in a frame) | 17 | 42 | 126 | 216 |
| cold re-run vs reference | 0 | 0 | 0 | 0 |
| fallbacks per frame, p50 / p95 / max | 1 / 5 / 5 | 3 / 8 / 8 | 9 / 19 / 22 | 13 / 26 / 36 |

- **Where the warm solve differs, it differs by a whole root, never by
  precision:** 0.8-1.7 world, which is 18-37 px at zoom 1. The warm solve
  continues the root it had. Today's solve picks a root afresh on each
  frame, from fixed Newton starts and with window clipping, so its pick
  can change between frames.
- **Today's solve jumps on its own.** In flow, no point moves more than
  0.064 world in a frame. Yet corners moved more than 0.1 in a frame 42
  times on def and 216 times on muse. My inference, not checked frame by
  frame: these are root switches, or amplification at small opening
  angles. In a drag, the counts also include real fast motion near the
  grab.
- **So the from-scratch answer cannot be matched by construction** while
  the reference picks its root by its start guesses. There are two ways
  out:
  - change the reference's rule so the geometry alone names the root: no
    window-end roots, and a stated pick among the window's roots that the
    warm solve can check;
  - or make the continued root the answer, and check against the
    reference only on the first frame and after events.

  This is a call for the coordinator (section 11).

Timing (under the lock, under load). Each row comes from one run, frame by
frame, as the median of 3 reps per frame:

| ms per frame, p50 / p95 | def drag | def flow | muse drag | muse flow |
|---|---|---|---|---|
| cold, every corner at its final radius | 15.5 / 30.5 | 16.0 / 28.2 | 37.4 / 56.6 | 36.9 / 74.2 |
| warm, with cold fallbacks | 6.2 / 11.9 | 7.8 / 16.6 | 13.9 / 26.0 | 18.4 / 42.7 |
| warm solves alone (no fallback) | 1.81 / 3.19 | 1.81 / 3.40 | 1.82 / 3.52 | 1.86 / 3.62 |
| opening (theta), p50 | 0.20 | 0.17 | 0.19 | 0.17 |

- **About 4.5 Newton iterations per corner per frame** (1460-1870 per
  frame). The cost is in the feet: each foot scans every segment of its
  ±2h window.
- **The fallbacks are the expensive solves.** At p50, 1-13 fallbacks per
  frame cost 4-17 ms: about 1.3 ms each on muse flow, where an average
  corner costs 0.1 ms. They are the corners whose cold solve fails (noV,
  edge roots), or whose root the warm window misses.
- **±1h is no better.** A ±1h window (NW=1) gave warm solves alone of
  1.50-2.18 ms p50 and 2.33-2.53 ms p95. It was run 9 minutes later, so it
  is not a clean pair. It also gave more fallbacks on muse (298 and 406
  solve/edge, against 293 and 387) and 27 diffs on def drag, against 3.
  The window stays at ±2h.
- **The prototype solves only at the final radius.** Matching today's
  re-fit means replaying its iterations: the rule-radius solve and each
  re-fit step, each warm-started from the same step last frame. That is
  466 solves on def and 640 on muse, instead of 386 and 342. Estimated by
  scaling the measured cost per solve: about 2.2 and 3.5 ms at p50, and 4
  and 7 ms at p95.

### 3b. passReach, warm

`seq13_reach.ts` (results in `seq13/reach.txt`). Each pin side's walk is
re-checked only at its boundary, using last frame's result: the model's
own passReach, started at the last hit step L, tests L, L+1, ... until a
miss. It assumes that steps 0 to L-1 still hit. It falls back to the full
walk when step L misses now, or when last frame's result was 0. Each frame
warms from the reference's last result, and is checked against this
frame's from-scratch result.

| | def drag | def flow | muse drag | muse flow |
|---|---|---|---|---|
| pin sides per frame | 1412 | 1412 | 1400 | 1400 |
| unchanged / walked further / fell back (sum of 40) | 55924 / 269 / 287 | 53221 / 1643 / 1616 | 54887 / 490 / 463 | 52068 / 1980 / 1792 |
| walked from the pin (last result 0, sum) | 0 | 0 | 160 | 160 |
| differs from the reference (pin sides, sum) | 0 | 3 | 9 | 31 |
| ... largest difference, in h/8 steps | 0 | 5 | 23 | 10 |
| full walks, ms per frame p50 / p95 | 48.8 / 51.6 | 50.7 / 57.0 | 80.4 / 96.1 | 146.9 / 150.0 |
| warm, ms per frame p50 / p95 | 24.1 / 27.1 | 25.8 / 29.5 | 36.1 / 38.5 | 68.5 / 70.6 |

These timings were taken under the lock and under load. Each frame's pair
ran back to back, as 3 reps with the median kept.

- **The boundary check halves the cost, and no more.** Most reaches are a
  few steps long, so the warm check (two steps) saves little against the
  full walk (L + 2 steps). The cost is the step itself: 9 cross-section
  points, each a SegGrid query, about 1 µs a query.
- **The skipped steps do break.** Up to 31 pin sides over 40 frames
  differed from the reference (0 on def drag, 3, 9 and 31 on the others),
  by up to 23 steps (2.9h). A gap opened inside an
  overlap, which the boundary check cannot see. The same answer needs
  every step re-tested, which is the full walk.
- **A CPU form near 1 ms would need a different step test**: the
  cross-section's distance to the other pass's segments near a warm foot,
  a few segment tests a step instead of 9 grid queries. Estimated at 1-3 ms
  for 1400 pin sides, which is still over the target alone. It is not the
  same answer by itself: today's test takes every local minimum of the
  distance to the other pass (`candidates`) within the window, and a
  search near the warm foot can miss a second one (a kink's loop, a
  hairpin), so it needs a guard. On the GPU, each pin side is one
  invocation.
- partExtents is the same kind of walk (h/8 steps, 9 points, up to 12h)
  and was not prototyped. It is estimated to behave the same way.

### 4. The pieces, and the GPU evaluation

`seq13_pieces.ts` runs on every frame of the four sequences, against
today's `buildLabelPieces`.

**Three forms of the tube list**, compared by how many chains' lists
change from one frame to the next. The keys are the chain id, segment k,
the cluster's junction ids and the end kinds.

| chains changing per frame, p50 / p95 / max | def drag | def flow | muse drag | muse flow |
|---|---|---|---|---|
| chains / tubes (p50) | 92 / 38533 | 92 / 38527 | 86 / 35271 | 86 / 35198 |
| today's (z splits + cluster cuts) | 34 / 51 / 51 | 68 / 70 / 70 | 49 / 68 / 69 | 70 / 71 / 72 |
| cluster cuts only | 4 / 13 / 14 | 28 / 38 / 38 | 10 / 30 / 32 | 31 / 40 / 41 |
| one instance per segment | 0 / 1 / 1 | 0 / 1 / 1 | 0 / 2 / 2 | 0 / 2 / 4 |

Today's list is rebuilt on most chains every frame: its z splits follow
the depth, and its cuts follow the spans. Only the per-segment form holds
still, since its list changes only with a chain's point count.

So the pieces take that form: one instance per chain segment (chain row,
k). Everything that moves is evaluated per vertex and per fragment, from
tables:
- **vertex shader:** places the segment's tube from SAMP's two points;
- **fragment shader:**
  - its s: the segment's s[k] plus t times its length;
  - its cluster: from the span table (lo, hi, cluster per chain, sorted);
  - its depth: from the pin table (`plateauDepth`'s pins: s, z, rL, rR);
- **rank:** the cluster's (a per-cluster table) or the chain's.

**Positions from s, in float32** (step 4). Each of today's tube endpoints
was evaluated as a vertex shader would: SAMP's float32 points, a float32 s
table and the tube's float32 s, with `Math.fround` after every operation.
Against today's float32 vertex:
- **The error is at most 1.53e-5 world** on all four sequences. That is one
  float32 ulp at the largest s (192 world on def, `seq13_len.ts`), so it
  comes from rounding the s table.
- It holds the 1e-4 tolerance for chains up to 1024 world. The ulp is
  6.1e-5 below 1024 and 1.2e-4 above it.
- The scene's points differ from float32 by at most 1.9e-6, so they are
  not exactly SAMP's values. The difference is within the tolerance.
- The tolerance, 1e-4 world, is 0.002 px at zoom 1 and about 0.02 px at
  8x. The 8x is assumed; the zoom's real maximum was not checked.

**Depth per fragment against today's z.** Today's tube carries a linear z
between its ends. It is split until the midpoint is within 1e-4 of the z
range, or the piece is 1/64 of a segment. Against that:
- The exact depth at s (`depthAt`) differs from today's linear z by up to
  9.4e-4 of the z range (def drag) and 5.1e-3 (def flow). It differs by
  more than 1e-4 of the range on 4.5% of tube-frames.
- The per-fragment depth is the exact one, so the reference changes to it
  (stage S3a6).
- The depth test's order can then differ from today's wherever two
  pieces' depths are within 0.5% of the range of each other. Whether that
  shows on screen is not checked.

**Cost.** The per-frame CPU part of this form is three tables: the s
table (a prefix sum of segment lengths over 24k points), the span table
and the pin table.
- **p50 0.15-0.21 ms; p95 0.17-0.20 ms on three sequences and 3.5 ms on
  def drag.** I infer the spike comes from the prototype allocating its
  arrays every frame; the design preallocates them.
- In the same run, today's `buildLabelPieces` took 69-92 ms at p50 and
  73-110 ms at p95.

**The strips from s** (`seq13_strips.ts`, results in `seq13/strips.txt`;
every frame of the four sequences, no timing). Each of today's tube-edge
strips (`buildBandStrips`; about 50k a frame) was evaluated from (chain,
k, s, side) as a vertex shader would, in float32, from the chain's float32
points: segment k's two points, and its neighbours for the vertex
normals. The rule is today's: a vertex at a segment end takes the vertex
normal (the two segments' normals averaged, then normalized), and a
vertex at a cut (a span bound inside the segment) takes the segment's own
normal. Against today's strip vertices:
- **(T) Today's rule from s: at most 1.1e-5 to 1.5e-5 world** on the four
  sequences, the same one ulp of s as the pieces. It holds the tolerance.
  The vertex must know whether it is at a segment end or a cut, so the
  instance carries that, with the cut's s.
- **(L) One quad per segment with no cuts** (the cut's vertex on the
  straight edge between the segment's two end offsets) differs from
  today's by up to 0.033-0.034 world on def (0.73-0.77 px at zoom 1) and
  0.082-0.099 world on muse (1.8-2.2 px). At 4.6-19% of the cut vertices it
  differs by more than 0.01. That is a rule difference, not precision:
  today's outline has a kink at every cut, because the cut's vertex sits
  on the segment's true offset line, while an uncut segment's edge runs
  between the two vertex-normal offsets.

So the strips either keep their cuts or change the rule:
- **Keep the cuts:** one instance per (segment, piece, side), carrying
  the piece's s bounds. A chain's instances change when its span list or
  a span bound crosses a segment. That is 0-17 chains a frame (section 5),
  and the CPU rewrites only those chains' instances.
- **Change the rule (S3a6):** an uncut segment's edge everywhere. That is a
  visible change of up to 2 px at the cluster boundaries. It belongs with
  K972/K973's shape residuals, so it is the coordinator's call.

**Not prototyped:** the windows and the fills. Their vertices come from
the corner table (V, q, r and the feet), so their precision is the
corner's, in float32.

### 5. How often the structure changes

`seq13_events.ts` counts the discrete changes a cached structure has to
catch, per frame transition. Stable keys, no timing.

| per frame, p50 / p95 / max (sum over 40) | def drag | def flow | muse drag | muse flow |
|---|---|---|---|---|
| cluster keys added or gone | 0 / 3 / 3 (6) | 3 / 6 / 9 (78) | 0 / 6 / 9 (33) | 3 / 9 / 12 (116) |
| corners changing ok / noV | 0 / 0 / 0 (0) | 0 / 2 / 2 (20) | 0 / 1 / 2 (8) | 0 / 2 / 3 (20) |
| corners entering or leaving the re-fit | 0 / 0 / 0 (0) | 1 / 3 / 4 (40) | 0 / 4 / 5 (32) | 4 / 7 / 8 (138) |
| chains whose span list changes (cluster keys) | 0 / 4 / 4 (8) | 3 / 10 / 10 (99) | 0 / 8 / 11 (43) | 4 / 12 / 17 (175) |
| depth pins whose passReach step changes (of ~1400) | 9 / 63 / 67 (523) | 81 / 116 / 121 (3142) | 16 / 93 / 127 (894) | 89 / 125 / 146 (3639) |
| frames with any change (of 40) | 34 | 40 | 40 | 40 |

- **The structure is not slowly changing.** With flow on, about one
  cluster merges or splits every frame (a merge removes two keys and adds
  one), and 80-90 pins change their reach step. The structure is quantized
  geometry sitting near its thresholds, so it flips under any motion. The
  structure today's label draws flips the same way.
- **So a cached structure pays off only if it is checked cheaply on every
  frame** and rebuilt locally where it changed. Each event must cost
  microseconds, not milliseconds.

### 6. Per part

Costs now are frame 0, def / muse, from sections 1 and 3. "Measured" means
a prototype under the lock; everything else is estimated.

| part | cost now | form | expected CPU per frame |
|---|---|---|---|
| scene gather (browser) | 19-23 ms (S3a4) | none: the label reads SAMP and `chainSamples` | 0 (estimated) |
| polys (`makePoly`) | 1.1 / 1.3 ms | the s table (prefix sum), in place; a small table of an open chain's END extension points | inside the tables' 0.15-0.21 ms (measured) |
| depth pins | in the model | the pin table, rewritten each frame from the crossings' s | inside the tables (measured) |
| opening (theta) | 0.17-0.21 ms | as today, per corner, each frame | 0.17-0.21 ms p50 (measured) |
| corner solve | 189 / 270 ms, mostly rule-radius and re-fit solves | warm Newton per corner on the CPU, or on the GPU (section 9) | final radius only: 1.8 ms p50, 3.2-3.6 ms p95 (measured). Re-fit replayed: 2.2-3.5 / 4-7 ms (estimated). Plus fallbacks: +4-17 / +9-39 ms (measured) |
| K883 re-fit | 83 / 107 ms of the above | replayed warm, or a closed rule (S3a6) | in the corner row |
| partExtents | 51 / 110 ms | on the GPU, one invocation per arm; on the CPU, every step re-tested with a cheaper step test (section 3b) | not prototyped; as passReach (estimated) |
| passReach | 53 / 81 ms (1400 pins) | on the GPU, one invocation per pin side; on the CPU, as above | warm boundary check: 24-69 ms p50, 27-71 ms p95, and not the same answer (measured, section 3b). A cheaper step test: 1-3 ms (estimated) |
| spans: caps, armExtents, rawSpans, geoExtents | 4-5 ms, plus the rows above | rebuilt per frame from the corner and extent tables | 0.3-1 ms (estimated) |
| clusters | inside buildSpans | the union of overlapping spans, per frame (~800 spans: a sort and a sweep) | < 0.1 ms (estimated) |
| buildPassTags | 8 / 4 ms | per frame, only for the clusters that changed | 0.1-0.5 ms (estimated) |
| SegGrids | 4.5 / 3.7 ms | warm feet do not use them, but the cold fallbacks and the CPU walks (partExtents, passReach) query them: re-bin only the segments that left their cell, or walk locally from the last hit | 0.5-2 ms with CPU walks (estimated); 0 with the walks on the GPU |
| pieces (tubes) | 74 / 53 ms | one instance per segment, evaluated on the GPU | inside the tables (measured) |
| windows, fills, crossing rows | inside the pieces | per-corner records from the corner table | < 0.1 ms (estimated) |
| switch lines | 12 / 8 ms (about 6 ms with S3a4's cache) | the topology cached as S3a4 does, re-keyed by cluster key; positions from s on the GPU | 0.2-1 ms (estimated) |
| strips (band) | 32 / 32 ms | one instance per (segment, piece, side), evaluated from s on the GPU (measured: 1.5e-5 world); the CPU rewrites the instances of the chains whose spans changed | 0.05-0.2 ms (estimated; 0 beyond the tables if the rule drops the cuts) |

### 7. The structure: layout and events

**Keys:**
- chains: chain id;
- corners: (junction id, index around the junction);
- arms: (junction id, arm index);
- pins: (chain id, crossing id);
- clusters: the sorted ids of their junctions.

None of these keys changes when the structure is rebuilt.

**Tables.** CPU tables are structure-of-arrays and preallocated:
- **chains:** id → SAMP row (`sampBase`), point count n, closed, the END
  extension points of an open chain, the s table's base;
- **corners:** key →
  - the arms (chain rows, dirs), style, rule radius;
  - the re-fit steps and the final radius;
  - the status (ok, noV);
  - the warm state: V, q, and the four feet as (k, t);
- **arms:** key → cap, extent (in h/8 steps), whether it walks, and the
  per-step margins (CPU form only);
- **pins:** key → s on its chain, z, rL, rR (h/8 steps), margins (CPU form
  only);
- **spans (rebuilt each frame):** per chain, sorted (lo, hi, cluster
  index);
- **clusters:** key → member junctions, spans and corners, and the rank;
- **instances (GPU):** per chain segment (chain row, k). Static, rebuilt
  per chain when its point count changes.

**Events:**

| event | detected by | rebuilds |
|---|---|---|
| a chain's point count changes | n differs from last frame | that chain's instances; its feet's (k, t), remapped by arc fraction |
| a junction or crossing appears or goes | the scene's ids | that junction's corners and arms; that chain's pins |
| a corner's root vanishes, or its status changes | the warm solve fails | that corner, cold |
| a corner enters or leaves the re-fit, or its step count changes | the replayed re-fit | that corner's re-fit steps |
| an extent or a reach changes step | the walk (GPU, or margins) | that arm's span; that pin's rL, rR |
| clusters merge or split | the per-frame union differs from the last | those clusters' members, pass tags, ranks, fills and switch topology |

Section 5 says how often each fires: in flow, every frame.

### 8. The GPU side

**What moves to the shaders:**
- **The tubes, the strips and the arm windows:** one instance per chain
  segment (per side for the strips), placed from SAMP's two points, plus
  the neighbours for the strips' normals.
- **Per fragment:** s, then the cluster from the span table, then the
  depth from the pin table (`plateauDepth`: a binary search over the
  chain's pins, then two pins' trapezoid).
- **The fills, crossing rows and switch lines:** per-corner and per-line
  records (V, q, r, feet) from a corner table.
- **Optionally (section 9):** the corner Newton and the walks.

**From s to a position:**
- the chain's SAMP row: RGBA32F, two samples per texel, `texelFetch`;
- a new float32 s table in SAMP's layout (one float per sample, four per
  texel; or an R32F table), written each frame by the CPU's prefix sum;
- the END extensions, as a small per-chain table.

A fragment's s is s[k] + t·segLen[k] in float32. The measured error is
1.5e-5 world, under 1e-4 for chains up to 1024 world.

### 9. The per-frame CPU total, and 1 ms

| part | ms p50 | ms p95 | |
|---|---|---|---|
| tables (s, spans, pins) | 0.15-0.21 | 0.17-0.20 | measured |
| opening | 0.17-0.21 | - | measured |
| corners, warm, at the final radius | 1.81-1.86 | 3.19-3.62 | measured |
| ... re-fit replayed | +0.4-1.7 | +0.8-3.4 | estimated |
| ... cold fallbacks, as prototyped | +4-17 | +9-39 | measured |
| passReach, warm boundary check (today's step test) | 24-69 | 27-71 | measured, not the same answer |
| walks: partExtents + passReach with a cheaper step test | 2-6 | - | estimated |
| SegGrid upkeep, for the CPU walks and the fallbacks | 0.5-2 | - | estimated |
| spans, clusters, pass tags, switch | 0.5-2 | - | estimated |

**1 ms is not reachable with the structure on the CPU.**
- The warm corner solves alone, with no fallback at all, take 1.8 ms at
  p50 and 3.2-3.6 ms at p95 (measured). That is over the target by 1.8x at
  p50 and 3.6x at p95, before the re-fit, the fallbacks and the walks.
- A realistic incremental CPU path adds up to about 6-14 ms at p50
  without the cold fallbacks (the table's rows, the walks with a cheaper
  step test; estimated). With the fallbacks as prototyped it is about
  10-30 ms. Against today's from-scratch model (251-338 ms on def and
  525-660 ms on muse in Node, sections 1 and 3) that is a cut of one to two orders of
  magnitude, and still 6-30x the target.
- The walks are the part that decides it. With today's step test, the
  warm passReach walks measured 24-69 ms at p50 (section 3b) and are not
  the same answer. With partExtents costed as passReach (estimated; they
  cost about the same from scratch, section 1), that puts the CPU path at
  about 50-150 ms. The 2-6 ms
  row needs a step test that is cheaper per step and still sees a gap
  open inside an overlap; it is not prototyped.
- One lever was not prototyped: a local foot search, which walks from the
  last foot's segment instead of scanning the ±2h window. It would cut the
  corner time 3-6x (estimated), to about 0.4-0.6 ms at p50. The walks
  would still be over the target.

**What would reach it: everything per frame on the GPU.** That means:
- the tubes, strips, windows and fills, from the tables;
- the corner Newton: one invocation per corner and re-fit step, writing a
  corner texture that the fills read;
- the walks: one invocation per arm and per pin side, writing extent and
  reach textures.

The CPU then keeps the tables (0.2 ms) and turns the spans into clusters
and pass tags (0.2-0.5 ms, estimated). For that it needs the walks'
extents in the same frame, so the expected CPU cost is about 0.5-0.8 ms
plus a readback (estimated). That readback is either of:
- **a synchronous readback** of a few KB each frame: a GPU sync whose wait
  is not measured here, and on the phone the main risk;
- **the structure one frame late** on the frames where it changes. Section
  5 shows that is every frame in flow, so clusters and reach steps would
  trail by one frame.

### 10. Implementation stages

1. **S3a6, the reference's rules** (the oracle; no new path):
   - the corner's root: no window-end roots, and the root named by a stated
     rule over the window's roots, chosen from this stage's diffs;
   - K883's re-fit as a solve (the radius where the tangent point meets the
     cap, to 1e-6 h), not an iteration path;
   - depth per fragment (no z split).

   Same-answer check:
   - a raster census of the 12 scenes against master, with every changed
     pixel attributed to a changed root, a re-fit or a depth-order flip;
   - the four sequences' reference jumps, counted before and after.

   Cost check: the from-scratch build on the 12 scenes, before and after.
2. **S3a7, the pieces on the GPU:** one instance per segment, from SAMP
   and the s table; the cluster and depth per fragment. The FieldModel is
   still built from scratch.
   - Same-answer check: every vertex against `buildLabelPieces` (1e-4) in
     Node, on the 12 scenes and the four sequences; and a raster census
     against S3a6's build.
   - Cost check: `buildLabelPieces`' 53-92 ms leave the frame, and the
     tables stay at or under 0.25 ms p95.
3. **S3a8, the strips, windows, fills and switch lines** on the same
   tables. The same checks; `buildBandStrips`' 32 ms and the switch's
   ~6 ms leave the frame. The strips keep today's cuts (one instance per
   segment, piece and side, rewritten for the chains whose spans
   changed) unless the coordinator drops the kink at a cut (section 4).
4. **The decision: S3a9 or S3a10.**
   - **S3a9, the incremental FieldModel on the CPU:** section 7's tables,
     warm corners with S3a6's re-fit, the walks with margins, and the
     events.
     - Same-answer check: on every frame of the four sequences and the 12
       scenes, the structure is identical to a from-scratch build and the
       positions are within 1e-4.
     - Cost check: per frame p50/p95 under the lock; expected 6-14 ms at
       p50 without cold fallbacks and 10-30 ms with them, if a cheaper
       walk step test exists, and 50-150 ms with today's (section 9).
   - **S3a10, the corners and walks on the GPU,** with a readback for the
     clusters, if the coordinator accepts the readback or the one-frame
     structure.
     - Same-answer check: positions within 1e-4, and one walk step where
       the reference's margin is below float32's error.
     - Cost check: CPU p95 1 ms or less on the desktop, and the readback's
       wait measured on the phone.

### 11. Risks and open calls

1. **The reference's root choice** (section 3). Matching the from-scratch
   answer needs S3a6's rule, and that rule changes what the label shows at
   the corners that jump today. The alternative, making the continued root
   the answer, makes the label depend on its history.
2. **Depth per fragment** (section 4). The order flips where two depths
   are within 0.5% of the range. Not checked on screen.
3. **The structure flips every frame in flow** (section 5). Clusters
   flicker and reach steps flip on 6-9% of pins. Today's label shows these
   flips too, but whether they show on screen is not checked.
4. **Float32 on the GPU against a float64 reference.** Positions hold
   (1.5e-5). But any quantized decision made on the GPU (a walk's step, a
   root pick) differs from the reference near its threshold.
5. **A same-frame readback's cost** is not measured, on the desktop or the
   phone.
6. **Knot mode was not recorded.** The label runs there too: the frame
   loop's gate is the thread look and the label ink, not the mode. Knot
   mode has no junctions, so no corners, clusters or extents, and its CPU
   part is the tables plus passReach. passReach took 49-147 ms a frame
   from scratch on the fabric sequences (section 3b, under load). With a
   cheaper step test (1-3 ms, estimated) and the SegGrid upkeep, knot
   mode is still over 1 ms, so it needs the walks on the GPU as well
   (estimated, not measured).
7. **All timings were taken under load** (the cursive agent's Python
   fits, until about 07:00). Pairs were taken back to back within each
   run.
8. **The prototype keys feet by s.** The design keys them by (k, t), and
   the remap on a count change is not prototyped.
9. **The 8x maximum zoom is assumed.**
10. **The settle was not recorded.** The sequences are a drag and a flow
    on settled scenes. The settle moves more, so it has more events, more
    cold corner fallbacks and more walks that fall back.
11. **passReach's warm boundary check is not the same answer** (section
    3b). A gap opens inside an overlap between two frames, so up to 31
    walks per sequence end at another step (up to 23 steps). A warm walk that
    is the same answer re-tests every step.
12. **The strips' cut rule** (section 4): keep the cuts, or drop the kink
    at a cut (up to 2.2 px at zoom 1). The coordinator's call.
13. **Not prototyped:**
    - partExtents warm;
    - the K883 re-fit replayed;
    - the local foot search;
    - a cheaper walk step test;
    - the GPU forms of the windows, fills and switch lines;
    - the readback.

