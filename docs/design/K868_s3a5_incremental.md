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

Draft, written as the stage goes (agent, 2026-10-28). Timings are Node on
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
- **A chain's sample count changes** on 5-35% of frames (the renderer
  resamples by arc length). That is a local event: that chain's sample
  keys are remapped (by arc fraction), not the whole structure.
- No crossing or junction appeared or vanished in these sequences.

