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

## Stage 2 handoff (2026-10-15 03:50)

By the stage 2 agent (af653fa7f942f2f1e of claude session d8031183),
who stopped at 03:50, before the 04:04 cap, with the stage done.
Branch `worktree-agent-af653fa7f942f2f1e`, worktree
`.claude/worktrees/agent-af653fa7f942f2f1e`, from master `fa7f9dc`,
unpushed. Probes and results: `.claude/probes/K8/stage2/`, copied to the
main checkout (`notes.md` is the timeline, the batch scripts the recipes).

**State.** G3-0 is built. The four tables are written, resident and read
back exactly; the capture hook and the frame bench exist. Nothing samples
the tables yet. `src/main.ts`, `src/physics/` and every GLSL string are
untouched. The phone pass ran in the stage's last minutes: K7 stage 5
held the phone lock from about 03:00 to about 03:41, and the perf lock
for much of that. It covers what the brief asked of the phone (the caps,
the frame bench and `update()`, master against the branch); readback,
the A/Bs and the round trips ran on the desktop only.

**Commits.**
- `57fc296`: the pure packers (`src/render/samp_table.ts`, whose header
  is the format spec) and 14 tests on fixtures dumped from a daily, dense,
  a fat design and G1's ring link (`test/render/fixtures/g3_windows_*`).
- `b29704a`: the writes in `update()`, residency (`G3DataSystem`),
  `g3Data`, the per-instance upload counter in `float_rows.ts`,
  `g3DataState()`, `g3TableRows()` and `g3Expected()`.
- `4bba4b4`: `captureScene()` / `restoreScene(s)`.
- `90b7f42`: `scripts/bench_frame.mjs` and the CLAUDE.md lines.
- `2567536`: the lore (render-ribbon.md's G3-0 DATA PLANE, the probes.md
  bullet, the lore index row).
- The next commit: the measured bullet, this handoff, `bench_frame.mjs`'s
  ABBA order and the phone pass's script and results.

**Numbers.** Desktop RX 6800 XT, D3D11, every one under the perf lock.
- Readback: max |Δ| 0 and no lost context on six links: b, fat, dense,
  knot, b with physics, and daily 4 mid-intro (14 of 15 frames had RADII
  on for all 92 chains). Default: 91 chains, 12554 SAMP texels, 357 range
  entries, rows [13, 7, 1, 1]. Dense: 186 chains, 25919 texels, 730
  entries, rows [26, 13, 1, 1].
- Cross-build A/B, master `fa7f9dc` against the branch, `phy=0`, clocks
  pinned: 0 px on six links (daily 4 as `?daily=4&snd=none&phy=0` with
  the flow pinned at runtime, its seed as an ordinary design, fat, dense,
  b, knot). The thread reveal differed by 22050 px until the fabric's
  explore clock was pinned as well, then by 2 px of Δ 1 inside one
  ribbon's gradient. Batch6 placed them: master against master and the
  branch against itself differ by the same 2 px ((719, 432) and (717,
  457)), and master against the branch at the same page position is 0 px
  on both pages. They come from the probe's page order (its first page
  against its second) in either build, not from the branch.
- Round trips on the branch (physics on: settle, freeze, capture; a
  second page, frozen, perturbed for the control shot, restored): 0 px on all six links (b, daily 4, dense, fat, knot, the thread reveal),
  against controls of 99k to 222k px (max Δ 168 to 255); the captures
  are 45 to 88 KB of JSON. Batch4 ran the same before the control was
  perturbed: its controls were 0 px as well (two loads of a link sleep in
  the same state), which proved nothing.
- Upload per awake update: +229,376 B at the default (13 SAMP rows and
  one small-table row, 2 calls) and +442,368 B dense; 0 asleep at
  `fw=0`. The brief expected about 0.19 and 0.35 MB. The SAMP data alone
  is 0.20 and 0.41 MB (12554 and 25919 texels of 16 B), and `FloatRows`
  uploads whole 16 KiB rows.
- `update()` ms per call, branch minus master: default +0.04 across
  builds and +0.08 with `g3Data` toggled in one page; dense +0.44 across
  builds (two rounds, +0.27 and +0.61, run-to-run noise about ±0.5) and
  −0.05 toggled: live pages at rest, the flow moving every sample, so
  all of SAMP uploads each update. The in-page loop (`g3_probe.mjs cpuloop`: one frozen page, every
  particle moved by 1e-4 before each call so that all of SAMP uploads,
  10 ABBA rounds of 5 calls; batch6) gives `g3Data` on minus off:
  default +0.16 ms (median +0.14) of 11.0, dense +0.28 (median +0.20) of
  21.5, and dense with nothing moving +0.13 (the compares alone, 0 B).
  The same loop on master, where the toggle does nothing, reads +0.03 and
  −0.15: about ±0.15 ms of noise per run. The default passes the
  desktop's +0.3 ms; dense sits at it.
- Frame bench (`bench_frame.mjs`, 1600x900 at dpr 2, A B A B): first draw
  to after `gl.finish`, p50 0.5 ms at the default (master 0.5 and 0.5, the
  branch 0.5 and 0.6) and 1.3 to 1.4 ms dense on both builds, 99 and 194
  draws a frame, every page asleep with the flow live, no lost context.
  The branch's means sit higher in all four pairs, and not by drift (A2
  read below B1): 0.46 and 0.49 against 0.56 and 0.58 ms at the default,
  1.05 and 1.06 against 1.09 and 1.22 dense. Inferred, not attributed:
  the SAMP upload's GPU copy (every flow frame) lands in the timed window.
  Caps: MAX_VARYING_VECTORS 30, MAX_TEXTURE_SIZE 16384 (ANGLE D3D11). Its
  `update()` ms per call grew page by page in run order (default 11.79,
  11.93, 12.47, 12.78; dense 23.06, 23.29, 24.36, 25.35; A1 B1 A2 B2), so
  its cross-build deltas (+0.22, +0.61) are that drift and the in-page
  loop above is the number. `bench_frame.mjs` now reverses the order
  every other round (A B, then B A), which cancels a linear drift.
- Phone (`phone6.ps1`: Pixel 11 over Tailscale, PowerVR C-Series
  CXTP-48-1536 through ANGLE on Vulkan, Chrome 154, 411x753 at dpr 2.625;
  `bench_frame.mjs --cdp --rounds 2` in the new order, A B then B A;
  every page asleep with the flow live, no lost context). Caps:
  MAX_VARYING_VECTORS 30 (120 components), MAX_TEXTURE_SIZE 8192 (the
  desktop's is 16384), highp float in both stages (23 bits), mediump 10
  bits, 32 texture units, 1024 fragment uniform vectors, no timer query,
  float colour buffers yes, float LINEAR no. Default: frame p50 0.7 ms on
  both builds (means 0.62 and 0.69 master, 0.63 and 0.68 the branch);
  `update()` 14.74 and 14.77 ms master against 15.10 and 15.07 the
  branch, +0.33 ms, inside the Pixel's +1 ms. Dense: no page slept within
  the bench's 30 s rest wait (the settle ran about 32 s behind, physics
  awake, frames about 73 ms apart), so these are mid-settle and noisier:
  frame p50 2.5 ms on both builds (means 2.65 and 2.72 master, 2.63 and
  2.71 the branch); `update()` 33.95 and 34.98 ms master against 35.06
  and 35.03 the branch, +0.58 ms on the means (the two pairs +1.12 and
  +0.05): inside +1 ms, without a clear margin.
- `npm test` at `4bba4b4`: 79 files and 1090 tests passed, one of each
  skipped; `test/physics/byte_identity.test.ts` among them.

**Open after stage 2.**
- To rerun the phone pass: `pwsh .claude/probes/K8/stage2/phone6.ps1`
  (both locks, both builds served from `$env:TEMP\k8g30-previews`, which
  `batch6.ps1` builds; it skips dense past `-DenseBy`).
- The phone's dense numbers are mid-settle. Recommendation: before G3-1,
  rerun dense on the phone with a longer `--rest-ms` (90000), so its
  `update()` cost is taken at rest; the +0.58 ms mean is inside +1 ms
  but the two pairs disagree by a millisecond.
- Dense `update()` sits at the desktop's +0.3 ms. Recommendation: accept
  for G3-0. If G3-1 needs the headroom, measure a compare-free copy
  (`Float32Array.set` per chain, its whole span dirty): an awake update
  moves every sample anyway, so the per-float compare buys nothing then.

**Residuals.**
- `restoreScene` leaves `ps.emergentCrossings` a getter over the
  captured rows until the page reloads (probe-only, documented).
- Capture and restore ran on the in-thread host only. With `phw=1`,
  `__knotPS()` is main's mirror; untested.
- k83's PIN recipe, and the older same-state probes built on it, do not
  pin the fabric's explore clock, so a thread-reveal A/B through them
  differs by thousands of pixels. probes.md's K8 bullet has the pin.
- Uploads are whole `FloatRows` rows: 0.23 and 0.44 MB per awake update,
  against the brief's 0.19 and 0.35 MB. Most of the gap is the data itself
  (0.20 and 0.41 MB of SAMP); a sub-rectangle upload would save at most
  part of one 16 KiB row. Recommendation: accept.
- The thread reveal's 2 px between a probe's two pages (above) are probe
  noise; master against master shows them too. No action.
- `bench_frame.mjs` timed its pages A B A B, so drift favoured the earlier
  build. Fixed in the handoff's commit (rounds alternate A B, B A); the
  phone bench ran with it, the desktop bench was not rerun.