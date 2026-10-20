# K115 stage 8 brief: a smooth, crossings-only glyph system (research and design)

Ledger item K115. Levi, 2026-10-19, on the Daily #8 title thread:

> it looks like cursive doesn't use crossings and only uses junctions; I
> essentially want the opposite. We must design our cursive procedural
> definitions/rules such that they ALWAYS use crossings (except for the
> dead-end stub guys that are inevitable on some letters); ADDITIONALLY,
> it's important that the orientation of the crossing (which thread is
> over which) be such that, if drawn in actual cursive with a single
> stroke from start to end, every later piece of thread goes over the
> earlier piece. Add a checkbox parameter for reversing this though.
> ALSO, the cursive paths are discontinuous, full of sharp angles, and
> jittery. They must not be so. If we need to enumerate custom bespoke
> pathing, orientation, topography, and connection rules for every
> meaningfully-distinct character and ligature combination, so be it
> (but, obviously, we'd want to polish and verify everything before
> doing anything like a massive data generation).

He also picked stage 6's recommendation for the Greek final ς: it gets
its own final-sigma glyph.

**This stage is research and design only.** You change docs and probes,
never `src/` or `test/`. It produces:

- the design, `docs/design/K115_glyphs.md`;
- a baseline metrics harness;
- a stage 9 brief (the prototype);
- the calls for Levi.

**Pen order is K558's, which runs in parallel.** K558 gives the
builder's `SegIn` input a pen-time key and sets every text crossing's
over/under from it, with a reverse param (`docs/design/K558.md`). This
design must EMIT pen order in the form K558 consumes, not redo it.

The title thread itself becomes opt-in under K552 (default off). The
cursive still ships in titled dailies, cartouches and the `?txt=` scene.

## Where things stand (master 71ee949)

- **The builder**, `src/core/text_graph.ts` (`buildTextGraph` at :709):
  - **Glyph sources:** Hershey Script Simplex
    (`src/core/hershey_script.ts`), Greek (`hershey_greek.ts`) and
    accents (`accent_marks.ts`), in integer HU coordinates. The x-height
    is 9 HU (`X_HEIGHT_HU`, :31) and the join line is y = 4 (`JOIN_Y`).
  - **Routing:** `routeGlyph` and `findRoute` (:371, :443) route one
    path through each glyph's strokes.
  - **Clean-up:** `dropRetraces` (:270) drops retraced segments;
    `openCusps` (:225) opens cusp tips to `BLUNT_LU` 0.9.
  - **Joins:** `hermitePts` (:566) builds the connectors between glyphs.
    Capitals join through `CAPITAL_JOIN` (:606), with five
    `CAPITAL_OVERRIDES` (:646).
  - **Planarizing:** `buildPlanar` (:89) splits segments at their
    intersections. TURN chains get at most `MAX_EDGE_LU` 1.4 per edge
    (:33).
  - **Node typing** (:1205-1212): degree 1 is END, 2 is TURN, 4 with
    `cross` is CROSSING, 3 or more is JUNCTION. **Every meeting that is
    not a clean four-way pass becomes a JUNCTION:** this is Levi's
    complaint.
  - **Then** pairing (:1247-1277, the straightest continuation), tracing
    (:1279-1361) and `assignOverUnder` (:2263).
- **Scale.**
  - Titles build at x-height 3 LU and only shrink, to fit `2 * gridSize`
    (`attachTitle`, :1458-1503; `TITLE_GAP` 2).
  - Cartouche words build at their planned x-height (`MIN_XHEIGHT` 2.0,
    :1667).
  - The standalone scene takes its text from `?txt=`.
- **Levi's earlier calls still bind** (`docs/design/K115_cursive_text.md`):
  text is pinned (Decision 1); capitals join via connectors; links stay
  one token.
  - Stage 1b's "spurs travelable" conflicts with crossings-only (Calls).
- **Residuals to absorb (K555):**
  - the joins λγ λη λθ λψ τυ meet a glyph stroke
    (`docs/design/K115_stage6.md` 971-975);
  - 6a's five `CAPITAL_OVERRIDES` (800-809);
  - the digit-6 over/under conflict (`K115_stage3.md` 376-381);
  - same-slash crossings that rely on `overFirst` alone.

## The work, in order

1. **Attribute today's defects.**
   - **The set:** the Daily #8 title (`?daily=8` on master, titled until
     K552 lands) and a sample in the `?txt=` scene: "Daily #8",
     "little", "minimum", "quick brown fox", the digits 0-9, "#" and
     Greek "σοφός".
   - **For each defect class Levi named** (discontinuity, sharp angles,
     jitter), find the mechanism with evidence from three layers:
     - the graph: node types and degrees, point spacing, the turn angle
       at each emitted point;
     - the spline: centripetal Catmull-Rom through the emitted points
       (`src/geometry/spline_generator.ts`);
     - the real render: headed shots under the perf lock
       (`scripts/diag_screenshot.mjs`, or a puppeteer probe modeled on
       `.claude/probes/K551/gaps_check.mjs`).
   - **Hypotheses to confirm or reject, not findings:**
     - integer-HU facets make the spline wobble;
     - the 1.4 LU TURN chunking;
     - Hermite connector tangents that miss the glyph's own tangent;
     - blunt opened cusps;
     - junction fans where retraces were dropped;
     - shrink-to-fit scaling below what the ribbon width can draw.
2. **Take a junction census by construct.**
   - On the same set, count every JUNCTION and END by what made it:
     - a stroke ending on a stroke;
     - `dropRetraces`;
     - `openCusps`;
     - a spur;
     - a near-crossing that failed the four-way test;
     - a connector landing on a stroke.
   - Put the table in the design doc.
3. **Design the system** (`docs/design/K115_glyphs.md`).
   - **Representation.**
     - Each glyph's strokes are sequences of cubic Bézier segments with
       integer control points on a finer grid (pick the unit and
       justify it).
     - Every interior joint is G1 (tangent-continuous). No corners
       anywhere: a cusp becomes a small loop or a rounded turn whose
       radius the ribbon can draw.
     - Evaluate with exact ops only (+ − × ÷ and `Math.sqrt`; K108,
       `.claude/rules/generation.md`): de Casteljau or Horner at fixed
       parameters, and arc length by fixed sampling. The result is then
       deterministic in every engine.
   - **Joins.**
     - Each glyph declares an entry and an exit: a point plus a tangent
       class (baseline, x-height, the high exit of o, v and w, and so
       on).
     - A join is a G1 connector chosen by the (exit class, entry class)
       pair.
     - A ligature table holds the exceptions: the bespoke cases Levi
       allowed.
     - Capitals and Greek join the same way.
   - **Crossings only.**
     - Every self-intersection and every meeting of two strokes is a
       proper X, with both passes continuing smoothly through the node.
     - A retrace becomes a loop (an eye that meets the clearance below).
     - A T-meet becomes a crossing, with the stroke running on past to a
       free END, or else the strokes separate.
     - The only ENDs are a stroke's start and finish and the free ends
       of floating strokes. Enumerate every END per glyph.
   - **Floating strokes** (t-bars, i and j dots, accents, the strokes of
     `#`) are separate strands that touch the body only at crossings.
     Check in the code:
     - what `buildWalkGraph` does with an END-to-END strand that crosses
       the body (the emblem island, `scene_graph.ts:231-235`, has no
       ENDs);
     - what the title's forced walk becomes;
     - what the stats, the fog and the thread reveal do with it.

     A dot as a thread is a very short open strand, a tiny loop, or
     nothing (Call).
   - **Pen order.** Emit, for every piece, the pen-time key K558 defines
     (its brief, then its branch once committed): the body in writing
     order, then the lifted-pen strokes. Over/under then falls out of
     K558's assignment, with no parity solve and no conflicts.
   - **Constraints.** Verify each in the code and state its number:
     - the ribbon width at title scale;
     - the clearance two non-crossing passes need to render as two
       threads, not one merged one;
     - the minimum crossing angle the gap renderer draws cleanly
       (`.claude/rules/render-gaps.md`);
     - `MIN_PASS_SEPARATION` 1.6, `DEPTH_WINDOW` 1.4,
       `KINK_MIN_SEPARATION` 2.6 and the 2.0 corridor pitch (read the
       constants' comments in `src/physics/particle_system.ts`), and
       which of them bind a PINNED word (stage 3a measured standing
       width deficits that still sleep) and which bind only free
       threads;
     - the smallest radius of curvature the ribbon extrusion draws
       without folding (`src/geometry/bend_radius.ts`; lessons: clamp to
       the local turn radius);
     - x-height 3 LU and `MIN_XHEIGHT` 2.0.

     From them, derive the smallest x-height at which loops, eyes and
     crossings all fit. Then say what that means for the title's width
     at gs 6, 12 and 18: does "Daily #8" still fit `2 * gridSize`?
   - **Sampling for Layer 2.** The text's points feed the centripetal
     Catmull-Rom splines and the physics particles. Specify the sampling
     (spacing, and where samples must fall: crossing nodes, inflections)
     so that the spline through the samples reproduces the Bézier within
     a stated tolerance. No jitter, by construction.
4. **Build smoothness metrics and a baseline harness.**
   - **Where:** a vite-node script in `.claude/probes/K115/stage8/`
     (pattern: `.claude/probes/K114/burn/vite.node.config.mjs`). It
     builds a text graph.
   - **What it measures, per strand:**
     - the largest turn angle between consecutive emitted segments;
     - curvature continuity (the largest |Δκ| over arc length);
     - the minimum radius;
     - the variance of point spacing;
     - JUNCTION, END and CROSSING counts, and the crossing angles;
     - the minimum clearance between non-adjacent passes.
   - **Baseline:** run it on today's builder.
   - **Calibrate the thresholds against a perceptual reference.** The
     worst case that should still pass is a hand-made smooth curve at
     the same scale and sampling (a circle and a figure-eight), never a
     number from the air (lessons: a threshold without a perceptual
     reference is a rubber stamp).
5. **Make a paper prototype**, only after 1-4 and if time allows.
   - Author 3-5 glyphs (o, e, l, t, n) as Bézier data in a probe module,
     with their join pairs.
   - Render them to SVG at title scale with the ribbon width, casing and
     over/under gaps, so Levi sees the intended look before stage 9
     integrates anything.
   - This is not the app renderer: label it so.
6. **Draft the stage 9 brief** (`docs/design/K115_stage9.md`), in this
   brief's format (picked decisions, out of scope, tests, kill criteria,
   calls, Where and how, Stop rule).
   - **Scope:** the prototype in the app, behind a probe-only switch
     (never the default), covering the glyphs of "Daily #8" plus e, o,
     t, n, 6 and ς.
   - **Contact sheets:** headed, real renderer, perf lock; titled and in
     the `?txt=` scene, at gs 6, 12 and 18 and at 411 px.
   - **Gates:** the metrics harness green against the calibrated
     thresholds, and the junction census at zero junctions.
   - **Mass authoring waits on Levi:** the full set (Latin, digits,
     punctuation, Greek, accents, capitals) comes only after his look
     call on stage 9. Say so in the brief.

## The design must cover

- ς as its own glyph;
- the digit 6 (K555);
- `#`;
- the K555 joins (λγ λη λθ λψ τυ);
- the `CAPITAL_OVERRIDES` cases;
- accents, each as its own floating stroke (stacked marks too);
- K555's same-slash crossings: with pen keys, `overFirst` carries them,
  so confirm the design never relies on slash class.

## Out of scope

- any `src/` or `test/` change (stage 9 makes them);
- K552's flag;
- K558's pen order (consume it);
- physics-live text;
- Cyrillic (K554);
- `RUN_FLAG.TEXT` (K557).

## Calls for Levi

Write them into the design doc, each with a recommendation. Expect at
least these:

- **Dots:** a thread stub, a tiny loop, or omitted?
- **Lifted-pen strokes are not walkable.** They touch the body only at
  crossings, which the walk passes straight through. This replaces stage
  1b's "spurs travelable".
- **The hand:** looped (Palmer-like ascender and descender loops: more
  crossings, more legible as thread) or unlooped?
- **The x-height floor,** if it must grow (the title-width trade).
- **Hershey's fate:** replaced whole by the new set, or kept as the
  fallback for glyphs not yet authored?

## Kill criteria

- **The constraints leave no x-height** at which a looped hand fits the
  title band at gs 6: report the smallest gs that works and the
  alternatives (a two-line title, no title below some gs, K552's flag
  off there).
- **Floating strokes break the walk graph** or the forced title walk in
  a way no local fix solves: report it and propose a way out (e.g. omit
  floating strokes on titles).

## Where and how

- **Your branch starts from origin/master** (the harness made your
  worktree).
  - Run `git log -1 --oneline` first. If this brief is missing from
    `docs/design/`, run `git merge --ff-only origin/master`.
  - Work only in your worktree, with absolute paths. Never edit the main
    checkout (`C:\Users\lsl\Repositories\knotmaze`).
- **Shell:** PowerShell.
- **`node_modules`:** a junction to the main checkout's (`New-Item
  -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`.
- **Servers:** ports 6010-6019, each vite server with a private cacheDir
  (`.claude/rules/probes.md`; K80's wrapper loads the config through
  `loadConfigFromFile`). Leave port 5173 alone: it is Levi's.
- **Chrome:** headed, never `--virtual-time-budget`.
  - Every instance gets its own `--user-data-dir` in your probes folder
    and the off-screen window flags. Delete the profiles when done
    (K161).
  - Never touch Levi's own Chrome profile.
- **Files:** probes, the harness, SVGs and notes go in your worktree's
  `.claude/probes/K115/stage8/` (untracked; the coordinator copies them
  at the merge). Never the session scratchpad. The design doc and the
  stage 9 brief are committed under `docs/design/`.
- **Load:** hold the perf lock (`$env:TEMP\claude-perf.lock`,
  `probes.md`) for headed shots and anything pixel-exact. Wait for it
  inside ONE blocking command, never by checking again on later turns.
  No app code changes here, so the merge runs the suite, not you.
- **Git:** commit WIP to your branch at every milestone, broken or not;
  never push. Do not edit `LEDGER.md`. End every commit message with:

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01TnQvxftruF6gxzRe3bigQ6
  ```
- **Helpers,** if any: `model: sonnet`, this stop rule, a one-hour cap.

## Stop rule

- Run `Get-Date` at the start and at each milestone.
- Stop when items 1-4 and 6 are done (5 if time allows), or at the
  two-hour cap, whichever comes first.
- Neither a compaction nor context size is a stop. After a compaction,
  re-read this brief and `git log --oneline -10`, then go on.
- At the stop:
  1. Commit WIP.
  2. Append a `## Handoff` section to this file: what is done, what is
     not, the baseline numbers, the evidence paths.
  3. Commit it, and report.

Your final report covers:
- the defect attributions with their evidence;
- the census table;
- the design's key numbers (the x-height floor, the clearances, the
  crossing angle);
- the calls for Levi.

It ends with a `Ledger items` list (new follow-ups, residuals, decisions
for Levi) and the K115 handle fields (branch, last commit, evidence,
next).

## Handoff

2026-10-19, 19:59 to about 21:30. Agent `ac64a844a1d15b9d7` of claude
session 91b19e11, on branch `worktree-agent-ac64a844a1d15b9d7`. Take the
last commit from `git rev-parse HEAD`, because the hook re-dates.

### Done

| Item | Where |
|---|---|
| 1. Attribution | glyphs doc section 1 |
| 2. Census | glyphs doc section 2 |
| 3. Design | `docs/design/K115_glyphs.md`, sections 3-12 (the calls are section 11) |
| 4. Harness | `.claude/probes/K115/stage8/metrics.ts` |
| 6. Stage 9 brief | `docs/design/K115_stage9.md` |

### Not done

- **The paper or SVG prototype (item 5).**
- **Headed pixel shots.** Every stage 8 number is geometric: the
  harness rebuilds the graph, the chain controls and the renderer's
  centripetal Catmull-Rom sampling in Node. No pixel was measured.
- **Ripple attribution per site.** Ripple is pooled per scene; only the
  over-tight sites are attributed.
- **The Hausdorff metric.** Stage 9 adds it.
- **The new hand's width is an estimate** (7 to 8.5 xh, from planned
  advances). The first kill criterion's verdict at gs 6 rests on it.
  Stage 9 measures the authored width.

### Baseline numbers

"Daily #8" at xh 3 (`baseline.txt`):

| Measure | Value |
|---|---|
| Samples over-tight (< 1.0 h) | 99 of 3196 (3.1%) |
| Samples under the 1.15 h floor | 114 |
| Over-tight sites | glyph vertex 38 (min 0.13 h), cusp corner 6 (0.26 h), junction 5 (0.04 h), connector 1 (0.11 h) |
| Pooled ripple | p50 0.14, p95 2.95, max 34.5 |
| Edge lengths | 0.037-1.39 LU (median 0.745, CV 0.48) |
| Clearance | min 0.066 LU against 0.60 |
| Crossing sin | 0.88, 0.66, 0.35, 0.86 |
| Topology | 16 JUNCTIONs (K 11, J 4, L 1); 17 ENDs (8 spurs, D 7, A 2); 4 CROSSINGs |

Shrunk to fit:

| gs | xh | Samples over-tight | Clearance |
|---|---|---|---|
| 18 | 2.59 | 3.4% | 0.047 LU |
| 12 | 1.73 | 6.3% | 0.058 LU |
| 6 | 0.86 | 13.9% | 0.039 LU |

Elsewhere:
- **"minimum":** 7.0% of samples over-tight, with 58 sites at glyph
  vertices.
- **Calibration:** a perfect circle of R 1 at today's 0.75 LU node
  spacing renders with ripple 3.45 and min R 0.95 h through chord-midpoint
  controls. With on-curve controls at the same spacing it renders with
  ripple 0.06.

### Evidence

`.claude/probes/K115/stage8/`, untracked; copy it at the merge. It holds:

| File | What it is |
|---|---|
| `metrics.ts` | the harness |
| `make_traced.mjs` | generates `traced_text_graph.ts`, a copy of `text_graph.ts` with read-only trace hooks |
| `vite.node.config.mjs` | the vite-node config, with a private cacheDir |
| `baseline.txt`, `baseline.json` | the outputs |
| `notes.md` | code facts and the helper's report on non-walk strands |

To re-run it from the worktree root:
1. `node .claude/probes/K115/stage8/make_traced.mjs`. Do this after any
   `text_graph.ts` change; each anchor must match once.
2. `node node_modules/vite-node/vite-node.mjs --config
   .claude/probes/K115/stage8/vite.node.config.mjs
   .claude/probes/K115/stage8/metrics.ts`, which writes `baseline.txt`
   and `baseline.json`.

### Next

1. Levi answers the calls in glyphs doc section 11.
2. K558 and K552 merge.
3. Stage 9 runs per `docs/design/K115_stage9.md`.
