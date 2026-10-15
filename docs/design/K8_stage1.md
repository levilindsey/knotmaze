# K8 stage 1: re-base G3 and G4's plan on today's master

K8 is G3 of `docs/design/G3G4_sdf_geometry.md`: SDF ribbons drawn from
one shared sample texture. K9 is G4, the SDF junction webs. Levi moved
both up on 2026-10-14 at about 23:46 ("I wouldn't mind bumping up to
sooner handle K5 and K6 and then K8 and K9"). Most of this week's render
work landed after the doc was written. Its plan has to be checked against
today's code before anything is built on it.

One opus agent, **docs only**: the design doc and this brief. It runs
beside three code agents, so it builds nothing. Stage 2 (G3-0) starts
from its handoff at the next free code slot. Ports 5880-5889 are yours
if you need a dev server.

## The stage

Update `docs/design/G3G4_sdf_geometry.md` in place. A dated note at the
top says what changed and against which commit.

1. **Sections 1-4, wherever today's code differs:** what runs per frame,
   the data model, the shaders, and what gets deleted. Read the code;
   don't trust the doc. What has landed since it was written:
   - **G2 paint:** `paint_glsl.ts`, `paint_math.ts` (the CPU mirror,
     which is the census reference), `paint_model.ts`, `paint_const.ts`
     and `float_rows.ts`. G3's ribbon pass must call the same paint
     library.
   - **The thread reveal (K76):** `explore_glsl.ts` and
     `explore_view.ts`, plus a chain landing in the paint shaders over
     the next day:
     - K76 2c (running now);
     - K268 stage 2 (shaped crossing gaps);
     - K290 (burnt threads);
     - K76 2d.

     Designs: `docs/design/K76.md`, `docs/design/K268.md`, and K290's
     ledger entry.
   - **Other render work:**
     - K81's route bands (`junction_routes.ts`, `junction_field.ts`);
     - K93's trail paint (`trail_paint.ts`);
     - K83's markers (`marker_mesh.ts`);
     - K99's fog (`fog_arc.ts`);
     - the pluck overlay (`pluck_overlay.ts`; K344 is fixing a cusp in
       it tonight);
     - K140's confetti;
     - K21's backgrounds.
   - **K7, the physics worker** (`docs/design/K7_worker.md`): the render
     side interpolates between snapshots, so G3's upload reads
     interpolated positions.
   - **K307:** the intro's freezes are cold shader compiles. Say what the
     warm-up must cover once G3's and G4's programs exist.
2. **Section 5, the staged plan:** re-cut G3-0 to G3-5 and G4-0 to G4-2
   for today's code. Give each stage:
   - its files;
   - what it keeps out of while K7's stages 3 and 4 own `main.ts`. G3-0
     may add at most a dev-only snapshot/restore hook there, outside the
     load path;
   - its tests and A/Bs;
   - its acceptance numbers.

   Decide and say:
   - whether G3-2 (the SDF ribbon pass) waits for the reveal chain's
     shader stages or ports them;
   - where K345 (the hover rim through the junction fillets) goes. The
     coordinator reads it as going into G4-1, since G4-2 deletes the fan
     shaders it would change. Confirm or correct that;
   - whether K328 (the hover glow's rim profile, planned with K111 stage
     5 and K265 on the shared paint library) needs anything from G3;
   - whether the decided defaults in K8's ledger entry still hold:
     - anchored tails keep flat caps;
     - phones stay at a 2x resolution cap;
     - over-tight folds keep today's pinch: shrink the per-sample radii
       to the local bend radius inside the CPU-flagged fold windows;
     - G1's GPU levers fold in: a loop-free protect test, a zoom-aware
       polyline tolerance, a per-point far-branch gate, and dropping the
       globals fetch.
3. **Section 6, risks and open questions:** refresh it.
   - The phone is a Pixel 11 on Android Chrome, reached through
     `scripts/phone.ps1`. Replace any iPhone references.
   - Give each question for Levi a recommendation.

Then write **stage 2's brief** as a "Stage 2 (G3-0)" section at the end
of this file. It covers:
- scope and files;
- tests;
- the pixel A/B: 0 px on at least four links (a daily, a fat-params
  design, thread reveal on, the dense preset);
- how to measure the upload cost under the perf lock;
- the stop rule below.

## Process

- Work on your branch. Commit at every milestone, and never push. Don't
  edit `LEDGER.md`.
- Measure nothing, so you don't need the perf lock. The render rules in
  `.claude/rules/` attach on their own as you read files.
- **Stop rule:**
  - Run `Get-Date` at the start and at each milestone.
  - Stop when the stage is done or at 2 h, whichever comes first.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
  - On stopping, commit, append a "Stage 1 handoff" here (state, what
    you changed, what's left, the stage 2 brief's status), commit, and
    report.
- Helpers, if any: sonnet, mechanical work only, under the same rule
  with a 1 h cap.
- **Final report:**
  - the commits;
  - the decisions above;
  - `Ledger items`: new follow-ups, residuals, and questions for Levi,
    each with a recommendation;
  - the handle fields: owner, branch + last commit, evidence, next,
    brief.

## Stage 1 handoff

2026-10-15 at about 01:06 PDT, from agent `agent-a35a43cee74c92b93` of
claude session d8031183. **Done**, inside the cap (it started at 00:13).
Docs only: nothing was built, served or measured.

**What changed.** `docs/design/G3G4_sdf_geometry.md` is re-based on
master d741412, one section per commit:
- a dated note at the top and "Decisions at a glance": 5bfdc6a;
- section 1, the per-frame pipeline: 5bfdc6a;
- section 2, the data model: 68bb211;
- section 3, the shaders: 87e1f57 and ae678fa;
- section 4, the deletions and invariants: 6e51a8d;
- sections 5 and 6, the staged plan and the risks: b0b82f4.

Corrections followed in cefd7b0 and c3ebfd8:
- the Pixel bench is a tracked probe script (`scripts/bench_frame.mjs`),
  not a renderer method;
- G3-0's A/B against master loads `phy=0` layouts;
- G3's upload share is counted on its own;
- K7 stage 3's interpolation is described.

The decisions this brief asked for are in the doc: the order of the
stages, K345 and K328 in section 5.10; the one-sided pinch in section
3.3; K8's other decided defaults (flat anchored caps, the 2x phone cap)
in section 6, where they hold; G1's levers in section 5.2 (G3-1).

**What's left of stage 1:** nothing. Three open points belong to later
stages, and the doc gives each one an owner:
- the Pixel's varyings and highp: G3-0's phone pass;
- proof that the capture covers everything `update()` reads: G3-0's
  round trip;
- K90 (keep or drop) before G3-2.

**Stage 2's brief:** ready, below (db4b698). It starts from current master. K7
stage 3 (63603bd..7f4c1bd) and K344 (93d0e4d) landed after d741412, so
the doc's line numbers for `main.ts`, `ribbon_renderer.ts` and
`pluck_overlay.ts` drift. This branch changes only the two design docs,
and master hasn't touched either since d741412.

## Stage 2 (G3-0)

Written by stage 1 on 2026-10-15. G3-0 is section 5.1 of
`docs/design/G3G4_sdf_geometry.md`: the data plane for the SDF ribbons,
with no visual change. `RibbonRenderer.update()` starts writing four
page-lifetime float tables that no shader reads yet: SAMP, RADII,
G3 CHAIN and RANGES, laid out as the doc's section 2.2 says. G3-1 and
G3-2 will read them. G3-0 also adds the two tools later stages measure
with: a same-state capture/restore hook and a frame bench for the phone.

One opus agent, code. Ports: as the coordinator assigns. Start from
current master, not d741412: K7 stage 3 (the worker host behind `phw`)
and K344 (`selfArc` in the pluck host) landed after the re-base, so the
doc's line numbers drift.

### Scope and files

- New `src/render/samp_table.ts`, pure packers with no Pixi and no GL:
  - SAMP: two samples per RGBA32F texel, each chain's base even;
  - RADII: four radii (h × widthMul) per texel, only for chains whose
    widthMul isn't 1;
  - G3 CHAIN: two texels per chain, with radBase −1 for unit width and
    nRange 0;
  - RANGES: per chain, the slot windows sorted by kLo. They must
    reproduce what `assignGapIds` packs per sample into `idScratch`
    today. Only the slot windows: the FOLD ranges arrive with G3-2 and
    the CLUSTER entries with G4-0.
- `src/render/ribbon_renderer.ts`:
  - the four tables as G2 `FloatRows` (page-lifetime, grown in place,
    dirty rows only), written in `update()`. Nothing writes while the
    knot sleeps;
  - `g3Data`, a renderer property (default on) that skips the writes,
    so one page can time the cost with the writes on and off in
    alternation, free of the phone's drift between two builds;
  - `captureScene()` / `restoreScene(s)` (section 5.0). List what
    `update()` reads besides the particle positions (the emergent list,
    the gate latches and `gateCache`, `flowTime`, the paint clocks, the
    reveal and explore state) and capture all of it. The physics part
    can reuse `src/physics/snapshot.ts` (read only) or copy the arrays
    the renderer reads from its `ps`. The capture is plain data a probe
    carries between pages as JSON, so encode typed arrays (base64, say);
  - `SAMP_UPLOAD_STATS`, the bytes and calls of G3's own tables.
    `FloatRows` counts every instance into `ROW_UPLOAD_STATS`, so split
    out G3's share (a per-instance counter in `float_rows.ts` is an
    additive change) or measure deltas against master. Report it from a
    renderer method of its own, the way `exploreGapState()` reports
    `GAP_UPLOAD_STATS` (ribbon_renderer.ts ~4778), rather than inside
    that K76 method.
- New `scripts/bench_frame.mjs` (tracked): the `gl.finish()` frame bench
  of section 5.0, for the desktop and, over CDP, the Pixel.
- New `test/render/samp_table.test.ts`.
- `CLAUDE.md`: one line each for the new module and its test under
  Project Structure. Lore about the tables goes to the render topic file
  that attaches with `ribbon_renderer.ts` (`docs/lore_index.md` maps
  them), not to CLAUDE.md.

**Stays out of:**
- `src/main.ts`, which K7's stages 3-4 own. Everything hangs off
  `__knotRenderer()` (main.ts ~4829). Stage 1's brief allows at most one
  dev-only hook there, outside the load path; G3-0 shouldn't need it;
- `src/physics/*`;
- every GLSL string. No program changes, so K307's registry and warm-up
  are untouched;
- `pluck_overlay.ts` (K279 stage 2), `paint_*.ts` and `explore_glsl.ts`
  (the reveal chain), `gap_mask.ts` (G3-1), and the fans (G4).

### Tests

- Packing: even chain bases, two samples per texel, four radii per
  texel, the unit flag (radBase −1), row partials.
- Neighbours: closed chains wrap and open chains clamp. An open chain
  never gets a last-to-first chord (invariant 6).
- RANGES reproduce `idScratch`'s per-sample ids exactly, on fixtures
  dumped from real scenes: a daily, dense, a fat design, and G1's ring
  link (`ring` in `.claude/probes/g1/urls.mjs`). Check them in as G2 did
  its `test/render/fixtures/`.
- SAMP decodes to `chainSamples` bit for bit after float32 rounding.
- `npm test` green; `test/physics/byte_identity.test.ts` untouched.

### Pixel A/B: 0 px on at least four links

The recipe is section 5.0, and `.claude/rules/probes.md` attaches when
you read a probe. The pattern to copy is `k83_ab.mjs`. The probes live
in the main checkout's `.claude/probes/`, which is untracked and so
absent from your worktree: run them by absolute path, e.g.
`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K83\k83_ab.mjs`.
Serve master and your branch with
`pwsh scripts/preview.ps1 -Port <p> -Ref <commit>` and check each page's
stamp SHA.

Master has no capture hook, so the cross-build A/B loads with `phy=0`
(a deterministic layout), pins the clocks
(`r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0`) and
parks the pointer. Every link but the daily ends in
`&am=instant&fw=0&phy=0&snd=none`.
1. A daily: `?daily=<n>&snd=none&phy=0`, captured after its intro.
   `fw` and `am` aren't daily-exempt, so either would make it an
   ordinary design. Zero or pin the flow at runtime instead: check
   whether `__knotParams()` returns the live params, or whether pinning
   `advanceClocks` also holds `flowTime`. If neither holds, use the
   fallback `?<the day's seed>&am=instant&fw=0&phy=0&snd=none` (the same
   maze as an ordinary design) and label it.
2. A fat design: `?b&tw=.64`.
3. The thread reveal on: `?b`, then `__knotExplore({ on: true })` after
   load. Master has no link key for it until K76 2c lands.
4. Dense: `?b&gs=24&wd=0.6&brd=0.6`.
5. Also the default fabric `?b` and knot mode `?7k&mf=0`.

Then:
- physics on, on your build: settle, freeze the in-thread host
  (`__knotPS().step = function () {}`; don't pass `phw=1`), capture,
  load the same link in a second page, freeze it, restore. 0 px on the
  same links without `phy=0`. If K7 stage 5 has made the worker the
  default by then, add `&phw=0`, or freeze the worker with
  `__knotPhysFreeze(true)` (K7 stage 4);
- GL readback of the four tables against the packers: copy
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\probe_texreadback.mjs`
  into your probes folder and extend the copy. Max |Δ| 0, including a
  frame mid-intro on a daily, so that RADII rows exist;
- record `webglcontextlost` and fail on it.

### Upload and CPU cost, under the perf lock

Take `$env:TEMP\claude-perf.lock` before any pixel-exact or timed probe.
It is one line: owner, start time, what. If someone else holds it, wait
inside ONE blocking command (a loop with a timeout in a single shell
call). A lock older than 30 min is stale. Delete it when done.

- **Upload:** read `SAMP_UPLOAD_STATS` (and `ROW_UPLOAD_STATS`,
  `GAP_UPLOAD_STATS`) over a fixed number of awake updates at the
  default fabric and dense, against master. Expect G3's tables to add
  about 0.19 MB per awake update at the default and about 0.35 MB dense,
  and 0 B asleep at `fw=0`.
- **CPU:** time `update()` the way
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\g1\probe_perf.mjs`
  wraps it, at the default fabric and dense: master against your build,
  and `g3Data` off against on in one page.

**Acceptance:**
- `update()` at most +0.3 ms on the desktop and at most +1 ms on the
  Pixel;
- the uploads as above;
- 0 px on every A/B, and readback max |Δ| 0.

### Phone pass, if the phone is reachable

Use `pwsh scripts/phone.ps1 [-Wireless] [-Ports <p>,<q>] [-Url <link>]`
and `C:\Users\lsl\Repositories\knotmaze\.claude\probes\phone_probe.mjs`.
Record:
- the caps: `MAX_VARYING_VECTORS`; `getShaderPrecisionFormat` for highp
  and mediump floats in both stages; `MAX_TEXTURE_SIZE`; the renderer
  string (`WEBGL_debug_renderer_info`);
- the frame bench for master and your build at the default fabric and
  dense, alternating builds (A B A B);
- `update()` on the phone, master against your build.

If the phone isn't reachable, say so in the handoff. It becomes a
residual, not a blocker.

### Order of work

Commit WIP on your branch at every milestone, broken or not. Never push,
and don't edit `LEDGER.md`.
1. The packers and their tests.
2. The `update()` writes, the readback and the upload counter.
3. The cross-build A/B, and the CPU and upload numbers.
4. Capture/restore and its round trip.
5. The frame bench and the phone pass.

Keep probes and results in the main checkout's untracked
`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K8\stage2\`, which
outlives your worktree, and anything reusable in tracked `scripts/`.

### Stop rule

- Run `Get-Date` at the start and at each milestone.
- Stop when the stage is done or at 2 h, whichever comes first.
- Helpers, if any: sonnet, mechanical work only (screenshots, scans),
  under the same rule with a 1 h cap.
- A compaction is not a stop. After one, re-read this section,
  `git log -5` and your notes before going on.
- On stopping:
  1. commit;
  2. append a "Stage 2 handoff" here (state, the numbers, what's left)
     and commit;
  3. report:
     - the commits;
     - the measurements;
     - `Ledger items`: follow-ups, residuals and questions for Levi,
       each with a recommendation;
     - the handle fields: owner, branch + last commit, evidence, next,
       brief.
