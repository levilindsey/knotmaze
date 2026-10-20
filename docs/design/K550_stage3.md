# K550 stage 3 brief: one try at the MSAA edge gap, on K553's device-px mask

Ledger item K550. One Opus agent, two-hour cap.

## Where things stand (master)

- **K320's split** draws the crossing gaps from a mask that a pre-pass
  renders, so the paint compiles faster cold (2b: 29,414 chars /
  1,735 ms against the combined program's 46,361 / 3,217 ms, D3D11
  medians). It is dark by default (`f18dd07`): only the renderer's
  `setGapSplit` turns it on. Design `docs/design/K320_section_rgb.md`,
  brief `docs/design/K320_stage2.md`.
- **K553** (`60511ed`) sizes the mask in device pixels
  (`ensureGapMaskSize`, `fitGapTarget` and `gapMaskPixelSize` in
  `src/render/gap_prepass.ts`). Before that fix the mask lined up
  only at dsf 1, and every K320 and K550 number was taken at dsf 1.
  Its guard: `test/render/gap_split.test.ts`, and `splitAssert` in
  `.claude/probes/K553/k553_probe.mjs` (under the split, at least one
  pre-pass render and a gap ratio over 0.5). Read `docs/design/K553.md`
  Handoff first.
- **K550 sessions 1 and 2** (`.claude/probes/K320/k550_diagnosis.md`;
  read it whole):
  - the row fix (`- 2 -` to `- 1 -` in `gapKeepFromMask`, the CPU
    twin `gapMaskTexel`);
  - three keeps (owner, topmost under, deep), with the writer's chain
    and arc turn in mask B, wrap-aware matching at 0.01, and the
    under and deep passes discarding by chain plus turn.
  - All of it is in `k550_two_keep.patch`, uncommitted, despite the
    name.

  | link | A/B px | gt1 | max |
  |---|---:|---:|---:|
  | def | 5,603 | 3,412 | 185 |
  | fat | 6,789 | 4,120 | 186 |
  | user | 3,051 | 2,457 | 75 |
  | knot | 6,773 | 3,963 | 186 |

  Explore is unmeasured: its same-build control was 36,252 px, so it
  needs several captures per build (K428).
- **The wall is MSAA sample coverage.** The canvas runs a fragment
  wherever a triangle covers at least one sample, with varyings
  extrapolated to the pixel center. The single-sample mask records
  only fragments that cover the center, so edge fragments read no keep
  and paint at 1.0. With `antialias: false`, def falls to 2,020 px /
  gt1 343. That floor is 4-deep stacks, search spikes and the fp16 keep
  tail, and it still fails gt1 = 0.
- **Dead ends** (don't repeat them): a resolved MSAA mask smears the
  chain and turn identity; SSAA or jittered masks evaluate at the
  sample positions, where combined evaluates at the center; expanding
  the ribbon geometry in the pre-pass shifts the interpolated vPos
  across the fade band (def 30,970).
- **Levi (2026-10-19):** keep the split, and give the MSAA edge gap one
  try. Waive the gate only if that try fails.
- **The gate** is `docs/design/K320_stage2.md` section 7 (item 1: 0 px
  same-state A/B beyond K433's one-level tolerance; item 4: mask
  readback; item 6: contact sheets) and section 8 (2b's kill criterion
  includes MSAA gap-edge artifacts on the sheets).

## The question

Can a pre-pass whose coverage matches the canvas's MSAA put, at every
pixel the canvas shades, the keep that the combined program computes
there? And what is left of the A/B after it?

## Steps

1. **Rebase the patch.** Apply the LF copy,
   `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K553\k550_two_keep.lf.patch`.
   It applies to master except `gap_prepass.ts` hunk 4 (`ensureMaskSize`,
   which K553 replaced). Size MASK_UNDER and MASK_DEEP with
   `fitGapTarget(under | deep, pw, ph, res)` inside `ensureGapMaskSize`,
   and call `bindGapMask(rt, under, deep)` there (K553.md, "K550's
   patch"). Commit.
2. **Re-baseline,** split against combined, same state:
   - def, fat, user and knot at dsf 1 and at dsf 1.5;
   - explore, several captures per build, cross-build pairs against
     same-build pairs (K428);
   - a split-vs-split control first, and `splitAssert` on every split
     capture.
   - Report A/B px, gt1, max and the mask cut per capture. The row fix
     must hold at dsf 1.5 too: check that the (-1) row is right at both.
3. **The try,** below. Commit at each milestone.
4. **Attribute what is left** at dsf 1.5 into classes, with pixel
   counts: edge coverage, two triangles on one edge pixel, 4-deep
   stacks, search spikes, the fp16 keep tail, anything else. Measure
   the `antialias: false` floor on the same build, so the edge class
   is the difference between the antialiased and non-antialiased A/B.
5. **Contact sheets** at dsf 1.5: crossings, ribbon edges and a zoomed
   kink eye, split beside combined (section 7 item 6).
6. **Cost and compile:** see Measurements.
7. **Write the Handoff** with a recommendation: ship (the gate passes),
   waive (Levi judges the residual on the sheets), or kill (keep
   Stage 1, revert 2a and 2b).

## The try (picked)

**A coverage-matched pre-pass.** For each sample offset `d_k` of the
canvas's MSAA pattern, draw the mesh a second time, translated by
`-d_k` pixels. Then the translated triangle covers pixel center `p`
exactly when the original covers sample `p + d_k`.

- **Correct the varyings to the center.** In those passes, correct
  every interpolated varying back to the pixel center:
  `v_c = v - dFdx(v) * d_k.x - dFdy(v) * d_k.y`. This is exact for
  affine varyings, up to rounding, and flat varyings need nothing.
  - `gl_FragCoord` is already the center.
  - Mind the target's y flip, as with the row fix.
  - Check that no varying is `centroid`.
- **The center pass wins where it covers.** Where a mesh's own center
  pass covers a pixel, its value must stand. Give each mesh draw an id
  in depth or stencil: the center pass writes it, and the offset passes
  test not-equal, early, so they shade only the edge ring. If that is
  infeasible, draw the offset passes before the center pass, mesh by
  mesh (about five times the fragments), and measure it.
- **Draw order is semantics.** Keep each mesh's passes together, in the
  paint's mesh order, in all three keep passes (owner, under, deep).
- **Sample positions:** measure them in the page.
  - Render half-planes at known sub-pixel offsets into a 4x MSAA
    renderbuffer, resolve them with `blitFramebuffer`, and read back.
  - Read `gl.getParameter(gl.SAMPLES)` on the canvas framebuffer.
  - The D3D11 and Vulkan standard 4x pattern is (-2,-6), (6,-2),
    (-6,2), (2,6) in 1/16 px from the center; check its y direction
    against `gl_FragCoord`.
  - Name how shipping code would get the positions on a device it
    has not seen (measured at boot, or the standard pattern with a
    center-only fallback). Building that is K320 2c, not this stage.
- **Known risk:** two strip triangles can each cover samples of one
  edge pixel. The canvas shades both; the mask keeps one. Count that
  class.

Only this one approach. If it fails, name the paint-side alternative in
the Handoff (on a miss, the paint reads neighbor texels for its chain
and turn; that adds paint text) and stop.

## Measurements

All under the perf lock, Chrome headed with hardware GPU, fresh profiles.

- **A/Bs:**
  - use the same-state recipe: `&phw=0&fw=0`, physics frozen, and
    `probes.md`'s clock pins (K83, plus the explore clock under the
    thread reveal);
  - the K553 harness takes dsf and size (`k553_probe.mjs`,
    `run_batch.ps1`, `locked.ps1`), and K550's tools are
    `.claude/probes/K320/k550_ab.mjs`, `k550_stats.mjs`,
    `k550_layers.mjs` and `k550_map.mjs`.
- **Pre-pass cost:** GPU time per dirty render at 1600x900 dsf 1.5 and
  at 411x753 dsf 2.625. The budget is K320 2a's: +0.3 ms GPU at
  3200x1800 over the COST baseline (K320_stage2.md section 8). Say how
  you scaled.
- **The combined programs' text must stay byte-identical to master's.**
  Hash every combined variant's vertex and fragment text before and
  after. A deploy that changes shader text costs every player a cold
  compile (K320 design, section 7).
- **The split's paint:** char counts, and cold compile on fresh
  profiles, against 2b's 29,414 chars / 1,735 ms (K307's
  `trace_intro.mjs`).

## Deliverables

- **Commits on your branch:**
  1. the rebased patch;
  2. the try, as one or more commits.
  The split stays dark by default.
- **Tests:**
  - `gap_split.test.ts` covers the under and deep sizing in device
    pixels;
  - add a pure test for whatever the try adds that can be one (the
    offset math, the order of passes).
- **A `## Handoff` section in this file:**
  - the re-baseline at dsf 1 and 1.5, and explore;
  - the try's numbers, and the attribution by class;
  - the sheets' paths;
  - cost at both sizes against the budget;
  - the byte-identity check, the char counts and the cold compile;
  - the recommendation, with the floor's remaining classes and what
    fixing each would take.

## Out of scope

- turning the split on (K320 2c);
- K561's pre-flip checks: `targetComplete`, the per-frame re-render,
  the cold first pass, a phone pass, a context loss;
- fixing the floor's other classes (4-deep, spikes, fp16): measure and
  name them only;
- a second approach;
- the cursive and the title (K115, K552), which other agents change in
  other files.

## Tests

- `npm test`, `npx tsc --noEmit` and `npm run build`, green;
- the A/Bs above, with `splitAssert` holding on every split capture;
- the split dark by default, unchanged from `f18dd07`.

## Kill criteria

- **The rebase does not reproduce** def at dsf 1 within 5% of 5,603 px:
  stop and report what differs.
- **The try does not at least halve the edge class** on def at dsf 1.5:
  stop. Keep the rebased patch, and recommend the waiver with the
  sheets.
- **The pre-pass is over budget** at either size, with no cheaper form of
  the try: report it, and recommend waive or kill.
- **The combined text changes and you cannot avoid it:** stop.

## Where and how

- **Your branch starts from origin/master** (the harness made your
  worktree).
  - Run `git log -1 --oneline` first. If this brief is missing from
    `docs/design/`, run `git merge --ff-only origin/master`.
  - Work only in your worktree, with absolute paths. Never edit the main
    checkout (`C:\Users\lsl\Repositories\knotmaze`).
- **The probes are untracked** and live only in the main checkout:
  `.claude/probes/K320/` (K550's tools and `k550_diagnosis.md`) and
  `.claude/probes/K553/` (the harness, `png.mjs` from `.claude/probes/g1/`).
  Copy what you need into your worktree's `.claude/probes/K550/`. Never
  move, edit or delete the originals, the CRLF patch above all.
- **Shell:** PowerShell.
- **`node_modules`:** a junction to the main checkout's (`New-Item
  -ItemType Junction node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Before removing
  anything that contains it, run `(Get-Item node_modules).Delete()`.
- **Servers:** ports 6050-6059, each vite or preview server with its
  own build directory or a private cacheDir (`.claude/rules/probes.md`).
  Leave port 5173 alone: it is Levi's.
- **Chrome:** headed, with hardware GPU (`--use-angle=d3d11`, as in
  `k553_probe.mjs`), never `--virtual-time-budget`.
  - Every instance gets its own `--user-data-dir` in your probes folder
    and the off-screen window flags. Delete the profiles when done
    (K161).
  - Never touch Levi's own Chrome profile.
  - Program-cache state matters for cold paths: say which you measured.
  - Record `webglcontextlost` and fail on it.
- **Files:** probes, logs, shots and notes go in your worktree's
  `.claude/probes/K550/` (untracked; the coordinator copies them at the
  merge). Never the session scratchpad.
- **Load:** hold the perf lock (`$env:TEMP\claude-perf.lock`,
  `probes.md`) for builds, the test suite, headed shots and every
  pixel-exact capture. Wait for it inside ONE blocking command, never by
  checking again on later turns. Another agent (K552's merge) shares
  it, so release it between captures.
- **Git:** commit WIP to your branch at every milestone, broken or not;
  never push. Do not edit `LEDGER.md`. End every commit message with:

  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01TnQvxftruF6gxzRe3bigQ6
  ```
- **Helpers,** if any: `model: sonnet`, this stop rule, a one-hour cap.

## Stop rule

- Run `Get-Date` at the start and at each milestone.
- Stop when this stage is done and verified, or at the two-hour cap,
  whichever comes first.
- Neither a compaction nor context size is a stop. After a compaction,
  re-read this brief and `git log --oneline -10`, then go on.
- At the stop:
  1. Commit WIP.
  2. Append the `## Handoff` section (Deliverables).
  3. Commit it, and report.

Your final report covers the re-baseline, the try's result, the
attribution, the cost and the recommendation. It ends with a
`Ledger items` list (new follow-ups, residuals, decisions for Levi) and
the K550 handle fields (branch, last commit, evidence, next).
