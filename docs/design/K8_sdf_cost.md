# K8: what rp=sdf's crossing gaps cost, and making them cheap

Ledger: K8 (G3, SDF ribbons). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

0f4c8233 made `?rp=sdf` draw its crossing gaps (`docs/design/K8_sdf_gaps.md`, Handoff 1: c67a75ff the
turn, 42900cac the window scan, d70fdf0d one quad per pixel). The phone then measured its cost (K156,
round 2026-11-10 in `docs/design/K156.md`; `scripts/phone_pass/k539_g31.mjs`, ABBA, 60 frames,
render-sync median ms):

| link | default | rp=sdf |
|---|---|---|
| dense `?b&gs=24&wd=0.6&brd=0.6` | 109 | 280 |
| max fabric `?b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5` | 284 | 423 |
| knot gs 24 `?b&gs=24&wd=1&mf=0` | 31 | 163 |

Before the fix, rp=sdf without gaps cost about the same as the default. G3-3 (the SDF default flip) and
Levi's look at rp=sdf both wait on this.

## Goal

rp=sdf draws the same gaps at a cost no higher than the default path's on the three links. If that
can't be done, find the floor and its cause. The technique is yours. The default path doesn't move.

## Done

1. **Where the cost is.** Use `scripts/bench_frame.mjs` on the desktop, with and without rp=sdf, on
   the three links:
   - at a145be26 (before the fix), and at c67a75ff, 42900cac, d70fdf0d and master;
   - name the commit and the shader work (fragment or vertex, which loop) that adds the cost.
   If the desktop doesn't show the phone's ratio, say so, and find what the phone pays that the
   desktop doesn't.
2. **The fix,** on your branch: bench_frame numbers before and after on all three links, both paths.
3. **The gaps are unchanged:**
   - 4x crops of the same spots as Handoff 1 (`.claude/probes/K8/sdf_gaps/` tools; full-resolution
     shots, not the phone's 464 px), default against rp=sdf. Every crossing is cut. Claude looks at
     them.
   - A same-state pair on knot gs 24 and dense (`ss/ss_ab.mjs`) against 0f4c8233's rp=sdf: no cluster
     over 2 px, or each one attributed.
   - `test/render/sdf_gap_bind.test.ts` still passes.
4. **No regressions:** gl.getError 0 and no context loss on the three links. The default path is
   unchanged (byte_identity and the paint pins green with no re-freeze). `npm test` and
   `npm run build` green.

The phone's numbers come from the next K156 round, not from you.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- **Builds:** `pwsh scripts/preview.ps1 -Ref <sha> -Root <dir> -BuildOnly` builds any commit into
  its own directory. Serve from ports 5700-5719.
- **Shots:** `node scripts/diag_screenshot.mjs <url> <out.png> [settleMs]`, with a settle of 20000 ms
  or more. Never use Chrome's `--virtual-time-budget`. A bare URL is today's daily, so always use the
  `?b&...` links above.
- **Your files:** the SDF path in `src/render/` (`fabric_sdf.ts`, `samp_table.ts`, `gap_mask.ts`,
  `ribbon/`, the paint GLSL) and its tests, plus probes in `.claude/probes/K8/`. Another agent works
  in `.claude/probes/K1240/proto/`. Don't touch it.
- **Commits:** WIP on your branch at each milestone. Use `git add -f` for probe tools, never for
  outputs. Never push, never edit `LEDGER.md`, and never touch the main checkout.
- **Perf lock:** every timing and every batch of headed-Chrome shots takes `$env:TEMP\claude-perf.lock`
  (one line: owner, start time, what).
  - Keep each hold under 10 minutes, and delete the lock between batches.
  - While someone else holds it, wait inside one blocking command.
  - A lock older than 30 min is stale.
- **Stopping:** stop when Done holds or 2 h after your start (`Get-Date` at the start and at each
  milestone). Then commit WIP, append a handoff to this brief, and report. A compaction is not a
  stop: re-read this brief and `git log`.

## Report

Short and plain:
- where the cost is (the commit and the shader work);
- the fix, and bench_frame before and after;
- the crops' paths and the same-state pair;
- the checks;
- what's left;
- your last SHA.

End with `Ledger items` and K8's handle fields (owner, branch, last commit, evidence, next).

## Handoff 1 (2026-11-10, K8's agent, claude session 09c7a672; 01:35 to 03:00)

Branch `worktree-agent-a6c9382c6e31ac415`. The fix is b82df5ca, the probe
tools and timings 07100fd5, and this handoff is in the commit after them.
Tools in `.claude/probes/K8/sdf_cost/` (outputs in its untracked `out/`):
`matrix.ps1`, `ab.ps1`, `pass_cost.mjs`, `verify.ps1`, `crops.ps1`. Every
desktop number is from the RX 6800 XT (D3D11), 1600x900 at dpr 2, taken under
the perf lock.

**Verdict.** On the desktop, rp=sdf now costs:
- less than the default on max fabric (frame 0.90x);
- about the same on dense (frame 1.09x, frozen render 1.16x);
- still 1.7x on knot gs 24 (frame), 1.8x as a frozen render.

The fix removed the SDF pass's overdraw. What remains is the gap search, 1.0-1.5
ms inside the SDF pass. The phone has not timed the fix, and its ratios (5.3x,
2.6x, 1.5x) are the ones that decide.

### Where the cost is (Done 1)

bench_frame frame p50 in ms, default / rp=sdf, on the three links with
`&am=instant&snd=none` (the flow is on, as in the phone's links). Run
01:38-01:52, before the 02:00-02:05 load window:

| commit | knot gs 24 | dense | max fabric |
|---|---|---|---|
| a145be26 (rp=sdf draws no gaps) | 7.2 / 11.4 | 20.5 / 20.4 | 39.0 / 36.6 |
| c67a75ff (gaps on: the turn, 16 windows) | 6.7 / 14.6 | 20.3 / 23.1 | 39.8 / 38.0 |
| 42900cac (every window) | 6.8 / 16.7 | 20.2 / 23.8 | 38.7 / 38.3 |
| d70fdf0d (one quad per pixel, bisector slabs) | 6.7 / 14.2 | 19.7 / 20.9 | 38.0 / 34.9 |
| master 6704319e (src = 0f4c8233) | 6.7 / 14.6 | 20.4 / 20.4 | 37.7 / 36.7 |

- The SDF pass's cost is FRAGMENT work. On knot gs 24, master's rp=sdf frame
  is almost all GPU finish (14.5 of 14.6 ms). The cost came in two steps:
  - the SDF pass itself, before any gap (a145be26: 11.4 against 7.2);
  - then the gap search, once K8's fixes turned it on (c67a75ff +3.2 ms, and
    42900cac's every-window walk +2.1).

  d70fdf0d won back about 2.5 ms.
- The work inside the pass, from `pass_cost.mjs`: a frozen page re-renders its
  own stage, with a 1-px readPixels after each render. The pass is full minus
  the pass hidden, and the gap search is full minus `maskEnabled = false`.
  - knot gs 24 at master: the SDF pass costs 2.5 ms (1.2 outside the gap
    search, 1.3 in it), against the default's 0.7.
  - dense: 3.6 (gap 2.0) against 1.8.
  - Outside the search the cost was overdraw. Every SDF segment drew its
    capsule's bounding box (2R by length + 2R), so each pixel ran the cones and
    the ownership about 6-7 times for the one quad that keeps it (CPU mirror:
    6.93 on a gentle curve, 6.31 folded).
  - The gap search (gapKeepAt) costs 1.0-2.0 ms in the SDF pass, where the
    default's mask reads -0.3 (knot) to 0.9 ms (dense).
- The desktop shows the phone's ratio only on knot gs 24, and only partly:
  2.2x (6.7 / 14.6) against the phone's 5.3x (31 / 163).
  - Dense and max fabric read about 1.0x on the desktop, against the phone's
    2.6x and 1.5x. There the desktop's frame is the CPU (update() under the
    flow, 20-40 ms), so the GPU pass hides behind it.
  - The phone's k539_g31 times a FROZEN full render plus readback, which is
    what pass_cost measures. On that measure the desktop reads 2.3x on knot
    gs 24 (3.2 / 1.4) and 1.4x on dense (6.7 / 4.9) at master.
  - Why the phone pays more (inferred, not measured): PowerVR is a tile-based
    deferred renderer. A fragment shader with `discard` (every SDF fragment
    outside its own quad) defeats its hidden-surface removal, so it runs the
    full fragment ALU per rasterized fragment. The phone's fragment ALU is far
    narrower than the 6800 XT's, so the overdraw and the search cost it 5x
    where they cost the desktop 2x.

### The fix (Done 2): bisector trapezoids, b82df5ca

The vertex stage now emits the slab its ownership keeps, not the capsule's box.
- Each end of a segment's quad sits on its joint's bisector line, at
  `side * R * t`. t comes from `sdfJointT`, which the vertex and the fragment
  share through `SDF_JOINT_GLSL`.
- Each end is pushed out by `max(uSdfPad, 2 px)` and clamped to the box.
- The whole box stays where the trapezoid can't hold:
  - at folds (`dl <= R |tB - tA|`);
  - at sharp joints (the joint cosine under `SDF_TRAP_COS` 0.8);
  - at a degenerate segment;
  - at an end with no neighbour.
- The fragment text is unchanged byte for byte. The vertex text changed, so the
  SDF program compiles cold once. rp=sdf is opt-in, so no default-path player
  pays that compile.
- The CPU mirror in `test/render/sdf_gap_bind.test.ts` proves the trapezoid
  keeps every owned pixel (lost 0, extra 0, MSAA partials 0) on a gentle curve,
  a folded wave and a sharp zigzag.
- Overdraw falls 6.93 -> 1.54 (gentle) and 6.31 -> 2.56 (folded).

bench_frame before and after: master 6704319e against the fix b82df5ca, ABBA,
2 rounds, frame p50 ms per round. Re-timed 02:27-02:37 on a quiet machine,
because the first A/B (01:56-02:07) overlapped another agent's unlocked load.
contextLost 0 and page errors 0 on all 24 pages.

| link | master default | master rp=sdf | fix default | fix rp=sdf | rp=sdf change |
|---|---|---|---|---|---|
| knot gs 24 | 6.8 / 6.5 | 14.3 / 14.5 | 6.4 / 6.5 | 11.2 / 11.1 | 14.4 -> 11.15 (-23%) |
| dense | 18.7 / 17.6 | 20.5 / 20.7 | 16.2 / 19.9 | 19.6 / 19.9 | 20.6 -> 19.75 (-4%) |
| max fabric | 38.0 / 39.9 | 35.7 / 36.0 | 39.8 / 38.0 | 34.9 / 34.8 | 35.85 -> 34.85 (-3%) |

- Draws per frame (default / sdf): knot 26 / 3, dense 186 / 9, max fabric
  674 / 9.
- The default path's code is the same in both builds, so its spread (dense
  16.2-19.9) is noise.
- The desktop's rp=sdf/default frame ratio, master -> fix:
  - knot gs 24: 2.17x -> 1.73x;
  - dense: 1.13x -> 1.09x;
  - max fabric: 0.92x -> 0.90x.

  Dense and max fabric are CPU-bound frames on the desktop, so the fix's GPU
  win shows there only in pass_cost.

pass_cost (frozen, ms; full / the pass / the gap search; pc2_*.json, run
02:15-02:20):

| | knot gs 24 | dense |
|---|---|---|
| default (both builds) | 1.4 / 0.7 / -0.3 | 4.9 / 1.8 / 0.9 |
| rp=sdf master | 3.2 / 2.5 / 1.3 | 6.7 / 3.6 / 2.0 |
| rp=sdf fix | 2.5 / 1.7 / 1.0 | 5.7 / 2.6 / 1.5 |

- The fix cuts the SDF pass by 32% (knot) and 28% (dense).
- Outside the gap search (nogap minus hidden) it is close to the default's:
  knot 0.7 against 1.0 ms, dense 1.1 against 0.9.
- What is left is the gap search.

### The gaps are unchanged (Done 3)

**Crops.** Each crop is 4x, in three panels: fix default | fix rp=sdf |
master rp=sdf. They are in `.claude/probes/K8/sdf_cost/out/crops/`
(untracked), and `crops.ps1` remakes them from verify.ps1's shots. I viewed
each one. Every crossing is cut in all three panels, and the two rp=sdf panels
match.

| crop | spot | px differing from default: fix sdf / master sdf |
|---|---|---|
| knot24_center.png | 640,400 | 996 / 995 (same state) |
| knot24_border.png | 292,40 | 1052 / 1046 (same state) |
| dense_center.png | 640,400 | 841 / 843 (same state) |
| maxfab_weave.png | 780,960 | 2332 / 2927 (not same state) |
| maxfab_crumple.png | 700,150 | 1405 / 2746 (not same state) |

- Max fabric never sleeps, so its shots are diag_screenshot captures at a 20 s
  settle (2400x1350, dsf 1.5). They are not same state, and the counts there
  are motion. The structure matches in all three panels.
- Handoff 1's weave spot (400,560) lies outside the fabric at that size. The
  weave crop moved to (780,960).
- One small light blob inside a dark eye of the weave crop appears in all three
  panels, the default included, so it predates the fix.

**Same-state pairs** (`verify.ps1`). Setup: ss_ab at 1400x900 dsf 1,
`phw=0&fw=0`, physics frozen, k83's clocks pinned.
- The state hashes are equal on every page and across builds: knot24 f9dceb21,
  dense f4268b15.
- The controls (A vs A2) read 0 px in all four runs.
- "Visible" means a channel delta over 24. A thick cluster is an 8-connected
  cluster with a 3x3 core.

| pair | differing px | max delta | visible px | clusters | thick |
|---|---|---|---|---|---|
| xs_knot24 (fix sdf vs master sdf) | 27,645 | 46 | 74 | 74, all 1 px | 0 |
| xs_dense (fix sdf vs master sdf) | 25,659 | 46 | 76 | 76, all 1 px | 0 |
| fix_knot24 (default vs sdf, one build) | 90,747 | 72 | 8,747 | 6,446 | 0 |
| fix_dense (default vs sdf, one build) | 109,064 | 104 | 10,840 | 7,857 | 0 |

- Against master's rp=sdf, no cluster is over 1 px.
- The sub-threshold differences (max delta 46) are inferred, not tested, to
  come from varyings interpolated across differently shaped triangles: the
  same pixels, from a trapezoid instead of a box.
- The default-vs-sdf rows are the two paths' existing difference (the crops
  read the same count against master's rp=sdf).
- `test/render/sdf_gap_bind.test.ts` passes 8/8.

### Checks (Done 4)

- **GL.** verify.ps1's gl checks on the three links, default and rp=sdf:
  gl.getError 0, contextLost false, no webglcontextlost event, no page error.
  ab2's 24 bench pages: contextLost 0, errors 0.
- **The default path is unchanged.**
  - Against 6704319e, the branch changes only
    `src/render/ribbon/ribbon_sdf.ts` and `test/render/sdf_gap_bind.test.ts`
    (`git diff --stat`).
  - byte_identity and the paint pins pass with no fixture touched (no
    re-freeze). byte_identity plus sdf_gap_bind run alone: 12/12.
- **Suite and build** (02:50, under the perf lock). `npm test`: typecheck,
  then 220 files and 2893 tests passed (2 files and 9 tests skipped by their
  gates). `npm run build`: green.

### Tried and dropped

- The gap keep before the paint: an early `discard` on gk, in a throwaway
  commit object 3589aaea that is not on the branch.
  - It read knot gs 24 full 2.5 and gap 1.0, and dense 5.6 and 1.4: the same
    as the fix.
  - So the paint on hidden pixels costs nothing measurable, and the search
    itself is the cost.

### What's left

- **The floor and its cause, on the desktop.**
  - A frozen full render with rp=sdf costs 1.8x the default's on knot gs 24
    (2.5 against 1.4 ms) and 1.16x on dense (5.7 against 4.9).
  - Nearly all of the excess is the gap search: 1.0-1.5 ms in the SDF pass.
    The default's mask toggle reads -0.3 to 0.9 ms there.
  - The search's cost fell with the rasterized area (1.3 -> 1.0 knot, 2.0 ->
    1.5 dense) while the owned pixels stayed the same. That suggests part of
    it is paid per SIMD group that holds any kept lane, not per kept pixel.
    This is inferred.
  - Why the SDF's search costs more than the default's mask over the same
    owned pixels is not measured. Candidates: more slot ids per quad than the
    default's 4 lanes per vertex; the 2 px pad and the kept boxes at folds;
    the vertex's RANGES walk.
- **The next levers.** Neither is built.
  - (a) Tighten the trapezoid further: drop the 2 px pad where MSAA allows, or
    split a fold's box.
  - (b) Move the gap test's slot reject into the vertex. A segment whose
    capsule misses every slot's texel-0 circle passes no ids, so fragments far
    from any crossing never enter the search.
- **The phone decides.** K156's next round times rp=sdf on b82df5ca against
  master on the three links.
  - If the phone's ratio fell with the overdraw (5.3x on knot gs 24), the
    overdraw was its cost.
  - If not, the search is its cost, and (b) is next.
- The bench links run with the flow on, which makes the desktop's frame the
  CPU on dense and max fabric. A `fw=0` bench would show the GPU pass alone.
  Not run.
