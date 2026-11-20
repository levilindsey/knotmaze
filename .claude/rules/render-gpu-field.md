---
paths:
  - "src/render/gpu_field/**"
  - "test/render/gf_*"
---

# Render lore: the per-pixel field on the GPU (K1362, rp=gf)

rp=gf draws form B's junction look per pixel: main builds tables
(`tables.ts`) from the field scene export, `gf_pack.ts` packs them, and
`gf_pass.ts` draws `gf_glsl.ts`'s program. Off by default. The stage
briefs and handoffs are `docs/design/K1362_*.md`; their numbers are
not repeated here.

**The border look (`tlk=border`) under gf is gf's own** (Levi, 2026-11-17,
shown today's thin, dim, section-tinted strokes beside gf's thick
near-black strokes on both edges: "Keep gf as it is"; K1455,
`.claude/probes/K1458/live/sheet_border.png`). Do not move gf's border
strokes toward today's, and do not use today's border strokes as a bar.

## Tables

- `buildTables` is bit-identical to its pre-Muse output (digest
  `.claude/probes/K1362/k1362t1_digest.ts`). Hold that: a 1e-13 drift
  in an arc length (hypot to sqrt) moves corner floats by up to 0.1
  and once changed a frame's bin lists, because the corner track
  flips projection segments. A speedup must keep the corner solve's
  input bits, or change the solve under a new gate argument
  (`K1362_t1_muse_tables.md`, addendum 2).
- THE CORNER RETRY (K1482 s23; on with `gfh=1`, `gfk=0` turns it off): where a corner pair's first solve gets no
  rounding (r = 0 or none), a second try with a crossing's cut on its arms extended GF_KEXT h, drawn only under
  home membership (ink only: no D raise, no cover; `retryForm`). Two gates: radius >= GF_KRMIN h, sag r(1/sin(th/2) - 1) <= GF_KSAG h.
  Off, the tables carry no `kExt`/`*Alt` field (`gf_k1482_switch.test.ts`). K1524 (Levi, 2026-11-19: "take the
  rounding") made it the page's default. A Node build still defaults to off: set env GF_KRETRY=1 to match the page (K1536).
- GAP JOINT FLAGS (K1482 s24): s18's UNDER rule in `gapJointFlags` holds about 270 V-corner joint sites on link A
  (an arm's outline meets the joint's outline: j63, j15, j148, t57e). Gating it on dN >= reach removed t81s's tick
  but opened all of them (3902 px at 274 places, backed out in 9b98e47b0). dN, dM and an offset-fold proxy do not
  separate t81s from them. Diff a gap-flag change over all of link A's border look; the mirror has no gap cuts.

## The pass on the Pixel (stage 4, `K1362_s4_shader.md`)

- Cost follows the per-pixel arrays (MAXP pieces, MAXK keys), not
  the work done: the register footprint sets occupancy. A smaller
  program in front ("tier") handles most pixels; `GF_TIERS` default
  p3/k2 with ramps, then the full program.
- Stage 9 confirmed it on the Pixel: capping the tier's surfaces at 3
  (`s`) and keeping the label as a running best (`lab`) cut def,
  muse_hash and fat by 17-19%, while cutting work without shrinking
  arrays (`fast`) gained nothing.
- Stage 10: dropping a per-piece array pays on the Pixel (the ramp
  group and value folded into psurf, the key reusing ps: 33 slots to
  24, -8 to -11%); packing two arrays into one (lh, cs) or rebuilding
  values from the segment index (kq) is slower. `GF_TIERS` is
  t32rlgyc3. The layering is about 6.2 of def's 11.7 ms.
- Stage 11: per-surface and corner-key state folds (`v`, `a`, `d`, `e`)
  are within noise on the Pixel. What costs is the corner code (def
  3.1-3.8 ms: layers()'s use about 2.25, the scan's keep loop 1.6; fat
  0.8-1.2 though it has no corners, so that part is compile shape), the
  face loop (about 4.2 of the 6.2 ms of layering) and divergence (1.1 /
  1.7 / 0.4 ms on def / muse_hash / fat). Cutting layers()'s corner key
  loop alone is slower: measure every cut. A MAXK 1 tier routes 2.7% of
  def to full and costs 3.75 ms; MAXK 0 does not compile (compile the
  corner code out instead). Stage 8's burial exit (`bx`) is 8-97 px off
  full on 11 of 12 scenes on the Pixel: do not revive it. Run noise is
  about ±0.5 ms on def; the bench keys on the variant name, so repeat
  one as `aid@<tier>`.
- Stage 12: choosing the program per frame pays. `GF_TIERS`
  t32rlgyjfc3 draws a frame whose cells list no corners with the corner
  code compiled out (fat 7.95 -> 6.80 ms at 822); other frames draw
  t32rlgyc3. Routing corner-free CELLS to that program is exact but
  about 3 ms slower on def and muse_hash. The one-pass face loop (`fj`)
  is slower with corner code and gains only on fat without it. Alone,
  def's corner-free cells (55% of pixels) cost 5.72 ms, its corner cells
  8.17: both halves need less per-pixel work.
- Stage 13: a per-cell layering order is provable on only 81-99.9% of
  ink (def 94.5%, muse_hash 81.2%), and dropping the per-surface state
  saves only 0.2-0.4 ms on the Pixel: the cell order is closed, and the
  face loop's work is the cost. Stopping the face loop at the first
  opaque surface (`lz`) is exact but slower (dynamic array indexing).
  Skipping a face that cannot beat its surface's running maximum (`fs`,
  exact since every factor is in [0, 1]) pays in the corner program
  only: `GF_TIERS` t32rlgyjfFkc3, def 12.55 -> 12.01 ms at 822.
- Stage 14: corner-cell pixels keep 0/1/2/3+ corners on 44/49/7/0.5%,
  so the corner code costs by its compile shape, not its trip count. A
  pruned corner list (`P`, 2.85 -> 1.21 walks per corner-cell pixel) is
  level on the Pixel, and so are T O G I M H and their stacks (all
  exact there, 12 scenes). Only the tangent faces' D factor in the skip
  (`kd`) pays, about 0.2 ms on def and muse_hash: `GF_TIERS`
  t32rlgyjfFkDc3, def 12.17 -> 11.97 ms at 822. The corner levers are
  spent (`K1362_s14_corner_loops.md`).
- Stage 15: depth classes (`zc` `zb` `zk` `zf`: a small P0 writes
  `gl_FragDepth` to route each pixel to P1 or full) cut the PVR offline
  compiler's temps from 99 to 41-76 (`k1362s15_pvr.ps1`) and are exact
  on the desktop, but on the Pixel they are 1.6-1.8 ms slower on def and
  muse_hash (fat 1.2 faster; p15b, 822). Fewer temps did not pay there;
  the depth write may cost the tiler more (inferred, not isolated). Do
  not rank Pixel forms by the compiler alone.
- In motion the pass is not the Pixel's limit (K1369 s1,
  `K1369_s1_motion_budget.md`). rp=gf moves the knot only at its build
  rate, 9-14 per second (one build in flight, a frame-locked round
  trip), against today's look's 17.6-23.7 fps; its higher frame rate
  redraws the same tables. Main keeps running the ribbon pipeline gf does
  not draw, and under gf shares the big core with the physics worker,
  which halves the drag's sim/wall. The GPU idles at 499-748 MHz.
- K1369 s2 (`K1369_s2_motion_rate.md`): under gf, main skips
  `renderer.update()` while builds are in flight, and the hidden fans
  are off. Two more cuts are exact (`k1369s2_lean.mjs`) but were
  probe-only at merge, because the pluck reads the full solve's
  `eraseExtentPos` / `overHalfPos`:
  - `lean`: the gap solve writes only `bindingPoint(over)`, the one
    output gf's gather reads;
  - the fill extrude is skipped.
  On the desktop drag, two builds in flight plus lean install 47 a
  second, against today's 35-37 fps; main falls from 930 to 525 ms/s.
  Sim/wall is .015 lower: the physics' cost per substep tracks main
  plus the gf worker's busy time (inferred). The slice pool takes only
  junction-free builds, so def (185 arms) builds whole on one worker.
- K1369 s3 (`K1369_s3_lean_default.md`): lean is gf's default (the
  `RibbonRenderer.lean` flag), and a live pluck runs the full solve.
  On the Pixel, depth 2 installs 51-54 builds a second in the intros,
  against today's 18-33 fps, with sim/wall intact. In the drag it
  installs 40-44, but sim/wall falls to .49-.51, against today's
  .67-.71 and depth 1's .74-.81: the physics worker waits 239-335 ms a
  second for a core. So `DEPTH` stays 1. Lean leaves `underWindows`
  empty (K1387) and the footprint widths stale (K1388).
- K1369 s4 (`K1369_s4_snapshot_channel.md`): depth follows the gesture
  (2 at rest, 1 while a thread is grabbed). The opt-in snapshot channel
  (`__knotGfOpts.chan`) sends the physics' state straight to the gf
  worker, which samples, gathers and builds. Its output matches main's
  path exactly. Pixel results:
  - intro-d: 45 builds a second, against today's 33 fps;
  - the drag: 25-28, against today's 17.
  Sim/wall follows the physics worker's share of cpu6: a busy gf worker
  lands there 15-50% of the time. One build takes 16-19 ms at full
  mid-core clocks and 23-28 ms when they drop, so 60 a second needs a
  build under about 12 ms, or a split across workers (K1386).
- K1383 s1 (`K1383_s1_gf_reveal.md`): the appearance reveal under gf.
  `gf_reveal.ts` packs today's masks (`RevealFx.widthMulFor`) into a
  per-chain knot table (knots only where the mask changes: exact under
  the linear interpolation both use), and `revealForm` derives a reveal
  variant of each program (`d /= rvm`; a corner shows only when both
  arms are full), compiled on the first revealing frame. Outside the
  reveal the pass draws the original programs, and the tables digest is
  untouched. The channel stays closed until the reveal ends. On the
  Pixel it costs +0.4 ms of main per frame (the table build). Depth 1
  outside the reveal cut intro-i to 19.5 builds a second (sim/wall
  .87-.91) against depth 2's 50-54 (.81; today's look 17.8 fps at .84),
  so the depth rule stays by gesture alone.
- A tier is exact by construction: on overflow it sets a flag,
  breaks and discards, and the next program draws that pixel.
- Routing is by stencil (EQUAL 0, INCR). The LAST program uses KEEP,
  so the Pixel tests the stencil before shading. A routed program in
  the middle writes its route through a discard, so the Pixel tests
  late and shades every remaining pixel: a whole extra pass. Hence
  one tier in front of full, not more.
- Only an EQUAL 0 stencil test rejects early on the Pixel: a program
  behind EQUAL class+1 shades everywhere (stage 5; cause not
  isolated).
- Routing is spent (stage 5, `K1362_s5_tiles.md`): t32r's tier
  already takes 99.7% (def) / 100% (muse_hash) of inked pixels, and
  every exact tile route (quads per class, stencil masks) was
  slower; tile quads alone cost about 4 ms, and the route's CPU
  20-70 ms on the Pixel's main. Cuts now have to shrink the
  per-pixel program itself.
- Keys per bin (stage 6, `gf_keys.ts`): each chain's u range is split
  into bins holding pin search bounds and candidate arms, widened by
  half a bin each side so a bin picked one off by float error is still
  exact. Every program reads them; `#ifdef OLDKEYS` keeps the old full
  ranges for A/Bs. keyBin's two rounded quotients are in K299's
  registry (`paint_ring_lap.test.ts`).
- Desktop gains do not predict the Pixel (stage 6): the register form,
  constant trip counts and packed per-piece state (`gf_reg.ts`, bench
  forms only) were all slower on the Pixel; the pack was faster on the
  desktop, and its ivec4 group is what costs on the Pixel.
- Ramps stay inside the tier: a tier without ramps (t32, ramping
  pixels routed to full) was +5 to +9 ms against t32r on the Pixel, so
  any layering-once fold has to be exact inside the tier.
- The two-pass split (stage 7, `gf_split.ts`, bench forms only) is
  exact on the Pixel but gains only 1-2 ms there (12-37% on the
  desktop), and pass 1 alone (the scan) is 8-11 ms at 822. t32r is
  linear in canvas pixels with a large intercept (def about 8 ms +
  6.6 per Mpx): half of def's time does not scale with the canvas
  (K1376).
- mediump changes nothing on the Pixel.
- ANGLE (D3D on the desktop): execution continues past `discard`
  (write `discard; return;`), and a `&& !flag` loop condition was
  mistranslated (use `break`). So was a float `i < nk && cD > 0.0`
  (stage 14, 2-29 px off on 6 of 12 scenes): keep the loop bound alone
  and test the rest in a `break`.
- The GPU governor: a short pass at one per frame runs near 460 MHz
  against 1286 max; at the app's pacing the clock sits at 825-1100.
  Time passes back to back (sync4) and at frame pacing (frame1), and
  read the clock beside every number (`k1362s3_gpuclk.mjs`).

## Screening the GPU's picture (K1436 s2, 2026-11-17) and the cold load (K1468)

`.claude/probes/K1436/k1436_screen.mjs` captures a frozen K868 state in the fill and border looks at DSF 3,
and `k1436_screen_scan.ts` runs scan v2's band profile and strays on the screen's ink (labels and depth come
from the mirror's tables at the same pixel). `k1436_bar.ps1 -Ref <c>` is the A/B, untested end to end. Speck
tests need an 8-neighbour median (a 7x7 one reads every fade ramp as specks). Close the panel with
localStorage `knotmaze.panelOpen=0`, or it covers the knot.

COLD LOADS KILL THE GPU PROCESS (K1468, open): on a Chrome profile without the build's gf shaders cached, the
first draw of each multi-target gf program hangs the GPU main thread for 50-70 s and Chrome's watchdog kills
the GPU process; the context is lost, gf recompiles and it loops. So warm the profile once per build before
any capture (`--disable-gpu-watchdog` lets a cold load finish), count `webglcontextlost` on the app's canvas,
and when a load stalls look in `<profile>/Crashpad/reports` before blaming the build under test.
`.claude/probes/K1468/gfts.mjs` and `gputhreads.ps1` are the time series.

K1436 s3 (2026-11-17), THE SCREEN SCAN ON MASTER:
- What the scan reads. `k1436_screen.mjs` captures a K868 frozen state at DSF 3, in fill and border looks,
  under rp=gf. It also captures today's renderer (job.today) for the same state, so a crop sheet shows
  today | gf at one device pixel. `k1436_screen_scan.ts` finds cut / speck / rstray / vdip and labels each
  by class and site.
- h0 and h1 agree. On master, gfh=1 and gfh=0 give the same screen finds in every scene captured both
  ways. The mirror's 10x larger h0 count (dstray:tie, rstray:tie) does not reach the screen.
- Precision is 75% (40 sampled, cc1ee890). It drops to 0% on vdip:plain. Read a find on its today | gf
  tile before acting on it. The false classes are:
  - 4-5 px cuts at crossings;
  - cuts where gf's taper differs from today's ragged end (gf's border look is meant to differ);
  - V junction ends read as rstray:tie.
- The scan masks the markers and the head's glow from `meta.markers`, which is
  `__knotFabricRenderer().markers`, by world position and scale.
- Loads hang under load. Cold gf loads took 85-270 s, and some hung past 15 min with a lost context
  (g41_def_tw64). Cap each load (JOBMS) and retry. Close only the hung page: closing every page kills the
  parallel loads. Builds before fc520c2d also need `--disable-gpu-watchdog`.
- The frozen state is NOT always one state per build. In the bar's control, ring froze on 50dd4ffd in one
  load and on 0a0ee15e in the next.
- g41_user_tw42 froze on user_tw42.lightpaper's state, so its finds duplicate lightpaper's.
- The capture keeps a hash mismatch unless STRICT=1. A bar comparison needs STRICT=1, plus equal hashes
  across the pair.
- The bar's control PASSED once, on def and ring. The known-FAIL pair has not been run.
