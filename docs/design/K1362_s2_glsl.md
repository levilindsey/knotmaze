# K1362 stage 2: the per-pixel look in GLSL, in the app, timed

Ledgers: K1362 (this), K1240 (the redesign), K1314 (the census). One Claude Opus agent in its own worktree, on its
own branch from master. Cap 2 h. Read first: the stage 1 handoff at the end of `docs/design/K1362_s1_gpu_formb.md`,
and its "How the result is judged" section, which holds here too.

## Why

This is the main route to fast junctions now (Levi, 2026-11-12: "I'm very bullish on the GPU distance approach.
Don't give up on that easily"). Stage 1 built the CPU tables (`src/render/gpu_field/tables.ts`) and a per-pixel
evaluator written to port to GLSL (`eval.ts`, `GfEval`). Away from the corners it has not copied from form B yet,
its pixels match form B closely and are smoother than rp=outline's polygon edges
(`.claude/probes/K1362/out/s1/x8/cornerR.png`, `awayJunction.png`). The GPU pass is the half nobody has measured,
and the only part that could rule the route out (fill rate). This stage measures it.

Not in this stage: matching form B's corner set (stage 1's 76 missing corners and 45 stray arcs), K1319, K1315,
and the table build's speed (16.5 ms on def, mostly the corner solve). Later stages take them, so don't start them
here.

## Goal

`eval.ts` ported to a fragment shader, drawn in the app under a new `rp` value (name it in your report), with
today's look and rp=outline untouched. Ink and fill first; section colour through `paint_glsl.ts` if it fits the
time. Keep the per-pixel winning term (which side, arc, cap, tangent point or K1049 arc, and which piece) available
to the shader, never a blend: the outline's later uses (dashes, pencil, things travelling along it) build on it.
The table build may run on main for now; report its time there separately from the GPU pass.

## Done

1. **It renders** all 12 census scenes in the app (the list is in `.claude/probes/K1314/k1314_run.ps1`), at rest
   and through the s18 drags.
2. **GLSL equals the CPU mirror:** read the shader's pixels back on the 12 scenes and compare with `GfEval`'s at
   the same pixels. Report the max and p99 difference per channel and where the largest are. A difference over
   float32 noise is a port bug: fix it. Then run the census on the read-back pixels against stage 1's
   `census_h` counts.
3. **Speed,** desktop, under the perf lock, on the def, muse_hash and fat drags:
   - the GPU pass in ms: a timer query (`EXT_disjoint_timer_query_webgl2`) minus an empty one. If Chrome hides the
     extension, time `gl.finish()` around the pass and say so;
   - pixels shaded and candidates tested per pixel (mean, p95), against stage 1's floor (def 11.5 / 21);
   - the table build on main (ms) and main frameMs p50/p95, against master's rp=outline and today's look.
   Use `node scripts/diag_screenshot.mjs` or a headed real-time probe, never `--virtual-time-budget`. Never touch
   the phone: the Pixel is timed in the phone round (K156).
4. **From the GPU number, a Pixel estimate,** with its working: the desktop pass time and the two devices'
   fill-rate ratio, or the shader's per-pixel cost. Mark it as an estimate.
5. Today's look and rp=outline are byte-identical with the new `rp` value off, the golden snapshots don't move, and
   `npm test` is green.

A failing check is work to do, not a reason to stop. A pass that is over budget gets a breakdown (where the time
goes) and its floor, and the biases toward failure are named, as stage 1's judging rule says.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print a
  whole file. Keep each tool output under about 40 lines. Use the Read tool only right before an Edit, and to view
  images. Junction `node_modules` from the main checkout; never `npm ci` or `npm install`. Before deleting any
  directory, delete each junction inside it with `(Get-Item <path>).Delete()`.
- **Your files:** `src/render/gpu_field/` (new files, plus `tables.ts` and `eval.ts` when the readback finds a bug:
  keep the two in step), the minimal `rp` hook (stage 1 named `src/app/frame_loop.ts`; name yours), tests, and
  tools and outputs under `.claude/probes/K1362/` (`k1362s2_*`). No other agent is working in these files.
- **Untracked inputs** (scenes, drags, the census's form B tiles) are in the main checkout's `.claude/probes/`. Copy
  what you need, and never write there.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for outputs. Never
  push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not start.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time, and delete it
  after. Run the census with `-Lock` and hold no lock of your own around it.
- **Stop** when Done holds or 2 h after your start, whichever comes first. Run `Get-Date` at the start and write the
  time into your first commit message; run it at each milestone. Before stopping for the cap, run `Get-Date` and check
  that 2 h have really passed (stage 1 stopped 30 minutes early). Leave the last 25 minutes for the checks. Then commit
  WIP, append a handoff to this brief with your start and stop times, and report. Neither a compaction nor context size
  is a stop.

## Report

Under 30 lines:
- what you built, where, and the `rp` value;
- the GLSL vs mirror difference, and the census on the read-back pixels;
- the speed table (GPU pass, candidates per pixel, table build, frameMs) by drag, with the load, and the Pixel
  estimate;
- your verdict, in stage 1's three forms, and what stage 3 needs;
- your last SHA.

End with `Ledger items` and the handle fields for K1362.

## Handoff (stage 2 agent, claude session 01SUPGULDxvE5gKXozfaFaFG; started 22:09:14, stopped 23:24:15, 2026-11-12)

**Built** (`rp=gf`; branch `worktree-agent-a80434341b018b024`):
- `src/render/gpu_field/gf_glsl.ts`: eval.ts line for line in GLSL ES 3.00 (highp, no discard; `gfFs(probe,
  tangentTerms)`). `gf_pack.ts`: GfTables in one RGBA32F texture, 2048 wide, read with texelFetch. `gf_pass.ts`:
  `GfPass`, a scissored full-screen triangle into RGBA8 (ink, cov), or MRT float for the probe (chain, s, winKind,
  nSeg, nK: the per-pixel winning term stays available); EXT_disjoint_timer_query_webgl2 around the pass plus an
  empty query. `gf_app.ts`: rp=gf in the app (tables from the live chains on each change, the pass, the composite of
  ink and fill; `window.__knotGf` stats and redraw). `eval.ts` gained `cov`. The only shared-code hook is the gfFlag
  branch in `src/app/frame_loop.ts`; with rp off its paths are the old ones. Test: `test/render/gf_pack.test.ts`;
  `paint_ring_lap.test.ts` lists the shader's five rounded quotients, each reviewed.
- Not built: section colour (paint_glsl.ts). The fill is the paper colour and the ink the outline colour.

**Done 1.** All 12 census scenes render under rp=gf at rest and through the s18 drags with no fallback
(`.claude/probes/K1362/out/s2/render/`). There are faint grey specks at some crossings (`def_rest_crop.png`). They
are not attributed yet. The GPU equals the mirror per pixel (Done 2), so they come from the rule, not the port.

**Done 2.** GLSL vs the mirror on float32-rounded tables, 347.6M read-back px at ppu 160 (`k1362s2_census.ps1 -Tag g`,
`out/s2/census_g*`, plus `census_smoke` for g41_ring_tw42):
- ink: p99 per scene ≤ 6.3e-5, max 9.8e-2. Pixels off by more than 1e-3 / 1e-2 / 1e-1: 442 / 28 / 0.
- cov: p99 ≤ 1e-5, max 1.0e-2.
- s: p999 ≤ 2.8e-4. The s maxima (8.7 to 846) are inferred to be closed chains' seam (s ≡ s + L). Not checked chain by chain.
- The winner chain differs at 1536 px, winKind at 4289, nSeg at 1366, nK at 0.

The two largest ink differences sit on jumps of the rule itself (`k1362s2_point.ts`). Within 1e-5 world units of
def's (22.4156, 29.7094), the mirror alone changes by 0.095. Within 1e-4 of muse_hash's (33.1844, 22.6406), it changes
by 0.099 (winKind 0 to 3). Float32 error flips which side a pixel lands on. No port bug was found. On the read-back
pixels, the census equals census_h per scene: 301 = 97 / 2 / 46 / 156 / 0.

**Done 3. Speed.** Desktop RX 6800 XT, ANGLE D3D11, headed real-time Chrome at 3200x1800. It ran under the perf lock;
machine load was not recorded. Tools: `k1362s2_bench.mjs` → `out/s2/bench.json`, then `k1362s2_benchsum.mjs`. Mid-drag p50/p95:

| | def | muse_hash | fat |
|---|---|---|---|
| GPU pass in the app (empty query 0) | 14.41/14.67 | 15.94/16.34 | 14.25/14.65 |
| GPU pass, GPU at full clock | 3.88 | 5.42 | not run |
| px shaded | 2.80M | 2.76M | 2.78M |
| candidates/px (live px only) | 18.7/40 (24.3/40) | 30.4/56 (36.3/56) | 18.4/40 (24.3/40) |
| stage 1 floor | 11.5/21 | 18.1/32 | 9.2/17 |
| table build on main | 23.9/29.7 (export 11.5, tables 12.0, pack 0.3, upload 0.1) | 15.4/16.7 (9.0, 6.1) | 23.2/24.8 (11.2, 11.6) |
| main frameMs: gf / look / outline | 16.1 / 15.7 / 6.6 | 17.6 / 19.2 / 13.0 | 15.8 / 15.6 / 6.6 |
| rAF interval ms: gf / look / outline | 59.2 / 33.8 / 28.7 | 55.1 / 40.7 / 38.0 | 58.3 / 33.9 / 29.4 |

The rAF interval is worse than today's look because the build runs on main every drag frame (243 builds in 243
frames on def).

The in-app 14.4 ms reflects the GPU's clock state, not the pass (`k1362s2_pacing.mjs`, `out/s2/pacing.json`):
- One pass per frame after gl.finish() reads 13.2 (def) and 16.8 (muse_hash).
- The same pass, with two untimed passes ahead of it in each frame and a finish between, reads 3.9 and 5.4.
- Inferred, not confirmed by reading clocks: the GPU idles at a low clock because the main-thread build paces the frame.

Breakdown at full clock, def / muse_hash (`k1362s2_breakdown.mjs`, `out/s2/breakdown.json`):
- raster: 0.09 / 0.09
- cell and chunk walk: 0.27 / 0.40
- segment distance tests: 1.37 / 2.09
- piece bookkeeping, layers and composite: the rest, about 1.6 / 3.4. The scan-only variant is noisy (p50 2.26 / 1.97).
- tangent-point terms: 0.08 / 0.09

**Done 4. Pixel: an estimate, not measured.**
- Cost per pixel at full desktop clock: def 3.88 ms / 2.80M px = 1.39 ns; muse_hash 1.96 ns.
- The Pixel canvas is 822x1506. A square knot fit to its width covers about 0.68M px. Candidates per pixel are a
  world-space count, so they stay about the same.
- Desktop equivalent: 0.94 / 1.33 ms.
- Ratio of about 12x, from FP32 peak: RX 6800 XT about 20.7 TFLOPS, against PowerVR CXTP-48-1536 at 1536 FLOPS per
  clock and an assumed 1.1 GHz, about 1.7 TFLOPS. K1040 s3b measured 11-12x on the label pass over the same scenes.
- Estimate: def about 11 ms and muse_hash about 16 ms per frame, against the Pixel's 16.7 ms frame.
- Biases: that label pass used discards, which cost PowerVR extra; and the clock state of the desktop label timings is unknown.

**Done 5.** Same-state A/B (`k1362s2_ab.mjs`, phy=0 with K83 pins; def look, def outline, fat look): master vs master
0 px, master vs branch 0 px, bytes equal. Golden snapshots unmoved. `npm test` green on the handoff commit, test edit included (232 files / 2944 tests, 18 skipped).

**Verdict: reaches the look and the gate after these fixes.** No (a) and no (c) came out of this stage.
- The look is stage 1's mirror. The census on GPU pixels equals census_h, so stage 1's fixes stand as listed, all (b).
  Make them in tables.ts / eval.ts and mirror each one in gf_glsl.ts. `k1362s2_census.ps1` re-checks GPU against
  mirror (17 min).
- (b) Table build, 15-24 ms on main against the 3 ms CPU gate. The export (9-11.5 ms) gathers the app's chain samples
  into a scene object that the tables walk again; reading the sample buffers directly is stage 1's "vtx → about 0".
  The tables (6-12 ms) take stage 1's corner and bin fixes: corners down to 1-2 ms, bins to 0.5. Alternatively, run
  the build in the physics worker, which owns the samples, and send the texture in the snapshot (0 ms on main).
  Expected: under 3 ms, and the drag interval at the look's or better.
- (b) GPU pass: 3.9 / 5.4 ms at full clock is already under the 6 ms desktop gate (muse_hash narrowly).
  - Tighter cells or chunk boxes would bring candidates down to the floor (18.7 → 11.5 on def, 30.4 → 18.1 on
    muse_hash). The distance tests would fall to about 0.85 / 1.25 ms.
  - The layers part (1.6 / 3.4 ms) could shrink if layers() ran once per pixel outside ramps (the cfg loop runs it
    up to 3 times), plus fewer pieces. That effect is not measured.
  - Re-time in the app once the build is fixed, since the clock state follows the main thread.
- Shortcuts that bias toward failure:
  - The scissor covers the knot's box: 2.8M px, of which 2.15M have a candidate.
  - The full table texture is re-packed and re-uploaded every changed frame (0.4 ms).
  - Float32 everywhere (no measured cost).

**Stage 3 needs:**
- section colour in the pass (paint_glsl.ts);
- the build fix, then an in-app re-time;
- candidate reduction;
- the specks attributed in the mirror;
- the Pixel timed in the phone round. The phone has no timer query, so use K1040 s3b's sync timing.

**Tools.** All in `.claude/probes/K1362/` and committed with `git add -f`. Outputs go to `out/s2/` and are not committed.
- `k1362s2_census.ts/.ps1`: takes the perf lock. Never edit src/ while it runs: Vite reloads its pages.
- `k1362s2_links.ts`
- `k1362s2_vite.config.ts`: the dev server with a private dep cache, on port 5371.
- `k1362s2_bench.mjs/.ps1` and `k1362s2_benchsum.mjs`
- `k1362s2_ab.mjs`
- `k1362s2_breakdown.mjs`
- `k1362s2_pacing.mjs`
- `k1362s2_point.ts`

The census reads K1314's census module and the form B cache from the main checkout, read only.