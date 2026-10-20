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

## Handoff

Stage 3 agent, 2026-10-19. Probes, logs, shots and results:
`.claude/probes/K550/` in the worktree (untracked).

**The result: the try works on the image and fails on cost.**

- It cuts the MSAA edge class on def at dsf 1.5 by 91% of its pixels
  and 98% of its gt1 pixels, so the halving criterion passes.
- With it, a dirty frame costs +11.10 ms GPU at 3200x1800, against
  K320's budget of +0.3 ms.
- The split's own pre-pass at coverage 0, with no try at all, already
  costs +1.77 ms per dirty frame at 3200x1800, six times the budget. So
  no cheaper form of the try fits, and the "over budget" kill criterion
  is triggered.
- Recommendation: kill the try. For the split, kill (keep Stage 1,
  revert 2a and 2b), with waive as the alternative, for Levi to choose
  (Recommendation, below).

### Commits

- `92e1c0e` is the three-keep patch, rebased onto K553:
  - MASK_UNDER and MASK_DEEP are sized by `fitGapTarget` inside
    `ensureGapMaskSize`, which also calls `bindGapMask`;
  - `gap_split.test.ts` covers their sizing in device pixels.
- `15dbd39` and `206f3e7` are the try:
  - `src/render/gap_coverage.ts` holds the offsets, the uniform pack,
    the pass order and the GLSL;
  - it is wired through `gap_prepass.ts`, `ribbon_shader.ts`,
    `fabric_sdf.ts` and `ribbon_renderer.ts`;
  - coverage is 0 by default, so with the split on the pre-pass still
    draws one instance per mesh;
  - `renderer.setGapCoverage(n, interior)` turns it on for probes.
- `68b9977` adds `test/render/gap_coverage.test.ts`, 15 pure tests:
  the offsets and their y flip, the pack, the instance order, the NDC
  shift, the varying correction, and the program texts and their
  budgets.
- The split stays dark by default: `setGapSplit` is unchanged since
  `f18dd07`.
- Checks at `68b9977`, under the perf lock:
  - `npx tsc --noEmit`: clean;
  - `npm test`: 110 files passed and 1 skipped (1,558 tests passed,
    1 skipped);
  - `npm run build`: green.

### Step 2: the re-baseline (`92e1c0e`)

Same-state A/B, split against combined, 1400x900 viewport,
`k550_probe.mjs`:

- controls 0 px;
- `splitAssert` ok on every split capture;
- no lost context;
- rowCheck (0,0) at both dsf, so the row fix holds at dsf 1.5.

| link | dsf 1 A/B px | gt1 | max | dsf 1.5 A/B px | gt1 | max |
|---|---:|---:|---:|---:|---:|---:|
| def | 5,603 | 3,412 | 185 | 9,957 | 5,627 | 184 |
| fat | 6,789 | 4,120 | 186 | 12,498 | 7,152 | 186 |
| user | 3,051 | 2,457 | 75 | 4,346 | 3,506 | 136 |
| knot | 6,773 | 3,963 | 186 | 12,675 | 6,990 | 186 |

- def at dsf 1 reproduces session 2's 5,603 px exactly.
- Mask cuts (def / fat / user / knot):

  | dsf | def | fat | user | knot |
  |---|---:|---:|---:|---:|
  | 1 | 58,493 | 75,746 | 78,663 | 72,827 |
  | 1.5 | 134,703 | 174,692 | 174,209 | 167,637 |

- Explore (`xp=threads`, explore clock pinned, three captures per
  mode on one page):
  - every same-mode control is 0 px;
  - every split-against-combined pair reads 70 px (gt1 15, max 74) at
    dsf 1 and 155 px (gt1 22, max 81) at dsf 1.5;
  - with the clock pinned, the captures repeat exactly. K428's
    same-build control was 36,252 px.
- The `antialias: false` floor, from `builds/92e1c0e-noaa` (a build
  with only that change), at dsf 1.5:

  | link | A/B px | gt1 |
  |---|---:|---:|
  | def | 4,591 | 764 |
  | fat | 7,827 | 3,011 |
  | knot | 8,289 | 2,922 |
  | user | 704 | 0 |

  def at dsf 1 is 2,020 px (gt1 343), the brief's figure.

### Step 3: the try

**What it draws.**

- Each mesh is drawn again for each of the 4 MSAA sample offsets,
  shifted by minus the offset
  (`gl_Position.xy -= 2.0 * vGapDs / uGapSize`).
- These instances come before the mesh's center instance (instance
  count `nOff + 1`).
- **The center pass wins by draw order,** the brief's fallback. The
  depth or stencil test was not built: the keep targets have no depth
  or stencil attachment.
- **The varyings.** The four interpolated gap varyings (`vPos`,
  `vTurnA`, `vTurnB`, `vTan`) are renamed and corrected to the pixel
  center at the top of `main`: `v - dFdx(v) d.x - dFdy(v) d.y`.
  - None of them is `centroid`.
  - The flat varyings need nothing.
- **Variant I** adds the interior discard: an offset fragment inside
  the ribbon's interior band (gSide in (gSideW, 1 - gSideW)) is
  discarded, since the center pass covers it there. It is a late
  discard, not an early reject.
- **Order.** Each mesh's instances draw together, in the paint's mesh
  order, in all three keep passes.

**Sample positions, measured in the page** (`sample_pos.mjs`):

- the canvas framebuffer and a 4x renderbuffer resolved with
  `blitFramebuffer` agree, and SAMPLES is 4;
- the pattern is (-2,-6), (6,-2), (-6,2), (2,6) in 1/16 px, in the GL
  window frame: D3D11's standard 4x pattern;
- in the mask frame the offsets are (dx, -dy);
- the unflipped variant W confirms the frame by doing worse: def at
  dsf 1.5 reads 5,458 px (gt1 1,213).

**Result: the split with the try against combined** (V~C, same
state), px / gt1 / gt8 / max:

| link | dsf 1.5 | dsf 1 |
|---|---|---|
| def | 5,084 / 852 / 842 / 184 | 2,530 / 408 / 397 / 185 |
| fat | 8,668 / 3,383 / 3,381 / 186 | 4,225 / 1,581 / 1,580 / 186 |
| user | 772 / 14 / 1 / 9 | 553 / 13 / 3 / 18 |
| knot | 8,871 / 3,234 / 3,234 / 186 | 4,276 / 1,501 / 1,501 / 186 |
| explore | 133 / 0 / 0 / 1 | 55 / 0 / 0 / 1 |

Checks on these captures:

- V against a second V capture: 0 px;
- I matches V within one level;
- no lost context;
- mask readback: 0 bad;
- `splitAssert` ok.

**The edge class**, the A/B with antialiasing minus the
`antialias: false` floor, at dsf 1.5 (px / gt1):

| link | before the try | with the try | cut |
|---|---|---|---|
| def | 5,366 / 4,863 | 493 / 88 | 91% / 98% |
| fat | 4,671 / 4,141 | 841 / 372 | 82% / 91% |
| knot | 4,386 / 4,068 | 582 / 312 | 87% / 92% |
| user | 3,642 / 3,506 | 68 / 14 | 98% / 99.6% |

The halving criterion passes. It needed def at dsf 1.5 to drop from
5,366 px to 2,683 or less, that is, an A/B of 7,274 px or less.

### Step 4: attribution, def at dsf 1.5

`k550_attr.mjs` splits the gt1 pixels into 8-connected components and
measures each one's distance to the floor's gt1 map. It ran on the
try's captures (5,084 px), the floor's (4,591) and coverage 0's
(9,957). Output: `out/attr/def15_attr.json`.

| class | px | gt1 | how it was identified |
|---|---:|---:|---|
| one-level tail | 4,232 | 0 | the floor has 3,827 one-level px, so 405 are new with antialiasing; not attributed further. K433 tolerates one level. |
| 4-deep stacks | 813 | 813 | the three biggest components: 301 px at [1325,228], 298 at [1272,591], 214 at [1569,97]. The same three hold 758 gt1 px at the floor (287, 288, 183). |
| small components | 39 | 39 | 12 components under 20 px each, not attributed one by one (below) |

- **Where the gt1 px are.** 810 of the 852 lie within 2 px of a floor
  gt1 pixel, and 42 lie farther away.
  - The 42 hold everything the try leaves that the floor does not have:
    the small components away from the floor's sites (the 9 largest,
    36 px, all are) and the few pixels by which the stacks grew.
  - So edge-coverage leftovers and two triangles on one edge pixel come
    to 42 gt1 px at most, together. They were not separated.
- **The floor's search spikes:** 6 gt1 px in singles and pairs, 5 of
  them around [1569,97]. They fall inside the try's [1569,97] component,
  which has 214 px against the floor's 183 + 5.
- **The largest small component,** 12 px at [1620,545] (mean 54
  levels), is identical at coverage 0: same box, count and mean. The
  floor does not have it. It is an antialiasing-only site the try leaves
  alone, and it is not attributed (two triangles on one edge pixel is
  one candidate).
- **Before the try** (coverage 0):
  - 4,802 of the frame's 5,627 gt1 px lay away from the floor's sites;
  - its 3,062 components were mostly 1 to 4 px (2,969 components, 4,217
    px), along the ribbon edges on the sheets.
- **The 4-deep sites on the sheets.** Each is a dark triangular wedge at
  a kink eye's root, beside a junction web: the split hides ribbon that
  combined draws.
  - Sessions 1 and 2 attributed these sites to 4-deep stacks.
  - This stage did not re-count their layers.

### Step 5: contact sheets

The sheets are in `.claude/probes/K550/out/sheets/`, made from the def
captures at dsf 1.5.

- **Panels:** C | S | V | S~C | V~C.
- **A diff panel** is grey where the two are equal, red where they
  differ by more than one level, and yellow at exactly one.

The sheets:

- `def15_crossings.png` (crop 900,120, 200x180, zoom 3): S~C is red
  along every crossing gap's edges; V~C shows only yellow one-level
  dots.
- `def15_edges.png` (1560,1130, 140x120, zoom 3): ribbon edges.
- `def15_stack_a.png`, `def15_stack_b.png`, `def15_stack_c.png` (zoom
  4; 90x85 at 1290,200, at 1240,560 and at 1535,70): the zoomed kink
  eyes. Each shows its 4-deep wedge, which the try leaves alone.
- `def15na_stack_a.png`: the same wedge on the floor build.
- `def15_whole.png`: the whole frame (C | V | diff).

### Step 6: cost

**Method** (`k550_cost.mjs`, burst mode):

- 20 whole-stage `renderer.render(stage)` calls run back to back under
  one `TIME_ELAPSED` query, so each render costs elapsed / 20.
- A dirty variant re-renders the mask before every render.
- 4 rounds x 5 samples per variant, interleaved.
- Headed, RX 6800 XT, ANGLE D3D11, 4x MSAA, a fresh profile.
- `?s=b&am=instant&snd=none&fw=0&phw=0`, at rest.
- No lost contexts and no disjoint queries.

**Variants:**

- C: combined.
- Sd: the split at coverage 0, dirty.
- Vd: the try, dirty.
- Id: the try with the interior discard, dirty.
- Sc: the split, clean (the mask reused).

Medians per render, in ms:

| size | canvas, device px | C | Sd - C | Vd - C | Id - C | Sc - C |
|---|---|---:|---:|---:|---:|---:|
| 1600x900 dsf 1.5 | 2400x1350 (3.24 MP) | 1.14 | +1.20 | +8.72 | +6.14 | -0.31 |
| 411x753 dsf 2.625 | 822x1506 (1.24 MP) | 0.97 | +0.68 | +4.08 | +3.73 | -0.39 |
| 1600x900 dsf 2 | 3200x1800 (5.76 MP) | 1.18 | **+1.77** | **+11.10** | +7.64 | -0.33 |

- **Scaling.**
  - Scaled by device pixels, the brief's two sizes predict Sd - C at
    3200x1800 as +2.13 and +3.15 ms, and Vd - C as +15.5 and +19.0 ms.
  - The direct run at 3200x1800 reads lower: per-draw and vertex work
    does not grow with pixels.
  - The direct run is the authority.
- **The phone size.** `main.ts` caps the renderer's resolution at 2,
  so 411x753 at dsf 2.625 draws 822x1506, not 1079x1977.
  - These are the desktop GPU's numbers at that canvas.
  - The phone's own GPU belongs to K561's phone pass.
- **Against the budget.** K320_stage2.md section 8 allows +0.3 ms GPU
  at 3200x1800 over the COST baseline.
  - Sd is 6x over it and Vd 37x.
  - Sd is over at both of the brief's sizes even unscaled: +1.20 and
    +0.68 ms.
- **Dirty frames are the case that counts.** K553 notes that flow
  moves the threads in play, so the mask may re-render every frame. A
  clean frame saves 0.33 ms, since the split's paint is cheaper than
  combined.
- **2a's own reading was not found:** not in `K320_stage2.md`,
  `K320_section_rgb.md`, `ffd3864` or `f485641`. Whether 2a timed a
  dirty frame is unknown.
- **The parts,** at 3200x1800:
  - the three-keep pre-pass: Sd - Sc = 2.10 ms, about 0.7 ms per keep
    render;
  - the try's 12 extra instance passes: Vd - Sd = 9.33 ms, about
    0.78 ms each;
  - the interior discard saves 3.47 ms of that.

### Byte identity, chars and the cold compile

**Byte identity.** `dump_programs.ts` and `cmp_hashes.mjs` hashed every
registry program in both gap contexts, before and after. The combined
programs are byte-identical to master's:

- `section-rgb` fragment: `830df18158a43cb7` (46,377 chars);
- its explore variant: `809ac106aa54aa76` (62,448 chars).

**Chars:**

| program | master | `92e1c0e` | the try (`68b9977`) |
|---|---:|---:|---:|
| split paint fragment | 29,433 | 30,293 | 30,293 |
| split paint explore fragment | 39,552 | 40,412 | 40,412 |
| gap fragment | 17,730 | 18,449 | 19,127 |
| gap explore fragment | 26,900 | 27,619 | 28,297 |
| gap vertex | 14,297 | 14,297 | 14,732 |
| combined fragment | 46,377 | 46,377 | 46,377 |

**Cold compile.**

- **Method:** `k550_cold.mjs`, K320 2b's method: one program per fresh
  profile, headed, ANGLE D3D11, compile and link timed to a blocking
  `LINK_STATUS` read.
- **Cache:** cold, a new profile per program.
- **Readings:** medians of 3.

| program | chars | ms | 2b (chars / ms) |
|---|---:|---:|---|
| split paint, branch | 30,293 | 1,793 | 29,414 / 1,735 |
| split paint, master (same session) | 29,433 | 1,770 | |
| split paint explore, branch | 40,412 | 2,420 | 39,533 / 2,393 |
| gap, the try | 19,127 | 516 | 17,705 / 479 |
| gap, master | 17,730 | 481 | |
| combined | 46,377 | 3,228 | 46,361 / 3,217 |

- The three-keep patch adds 23 ms to the paint's cold compile, against
  master in the same session. The paint still compiles in 56% of
  combined's time.
- The gap program, with the three keeps and the try, compiles 35 ms
  slower than master's (516 against 481 ms). The try's own share (678
  of the 1,397 added chars) was not timed apart. The try leaves the
  paint's text unchanged.

### Recommendation

1. **Kill the try.** It fixes the image, but costs +9.33 ms per dirty
   frame at 3200x1800, on top of the split's own pre-pass.
   - **Cheaper forms,** none of them tried:
     - a stencil or depth early reject, so the offset passes shade only
       the edge ring (the keep targets would need the attachment);
     - 2 offsets instead of 4;
     - offsets on the owner keep only;
     - a pass over the ribbon's edge band only.
   - None of them can bring a dirty frame under +0.3 ms, because the
     pre-pass at coverage 0 is already at +1.77 ms.
   - **If the try is ever revived,** shipping code gets the sample
     positions at boot:
     - draw half-planes into a tiny 4x renderbuffer, resolve it with
       `blitFramebuffer` and read back (`sample_pos.mjs`'s method), or
       take the standard pattern when SAMPLES is 4;
     - fall back to coverage 0 when the read is ambiguous (K320 2c).
2. **For the split: kill. Keep Stage 1, and revert 2a and 2b.**
   - **Cost.** Without the try, its dirty-frame pre-pass fails K320's
     own cost criterion six times over.
     - That cost is paid on every frame the threads move, on every
       device.
     - The cold compile it saves (the paint's 1,793 ms against
       combined's 3,228) is paid once per deploy on each device.
   - **Image.** The gate fails too:
     - at coverage 0 the MSAA edge class stays (`def15_crossings.png`,
       S~C);
     - the 4-deep wedges are visible at kink-eye roots
       (`def15_stack_*.png`).
   - Levi's "keep the split" (2026-10-19) came before this cost
     reading.
   - **Waive is the alternative:** keep the split, judge the coverage-0
     residual on the sheets, and accept +1.77 ms GPU per dirty frame at
     3200x1800 (+0.68 ms at the phone-size canvas, on the desktop GPU).
3. **What merges.**
   - **On kill:** none of this branch's code, only this Handoff.
   - **On waive:** `92e1c0e` (the three keeps), without the try's
     commits. At coverage 0 the try is dead weight in the gap programs:
     +678 chars, and an untimed share of the gap program's +35 ms cold
     compile.

### The floor's remaining classes, and what fixing each would take

- **4-deep stacks.** 758 gt1 px at the floor on def at dsf 1.5: the
  visible wedges. Either of:
  - a fourth keep target, about +0.7 ms per dirty frame at 3200x1800
    by the per-keep cost above;
  - a fallback in the paint to the in-shader search where the layer
    count exceeds three (more paint text).
- **Search spikes.** 6 gt1 px. The mask's search and the combined
  search would need bit-identical inputs: the same sample data and the
  same precision path.
- **The fp16 keep tail.** 3,827 one-level px. K433 tolerates it;
  `rgba32float` keep targets would remove it, at twice the bandwidth.
- **Two triangles on one edge pixel.** With the try, at most 42 gt1 px,
  counted together with the other edge leftovers. A fix needs
  per-sample keeps, and the paint cannot read them: WebGL2 has no
  multisample texture fetch (no `sampler2DMS` in GLSL ES 3.00).
- **The edge class itself, without the try.** 4,802 gt1 px on def at
  dsf 1.5. The paint-side alternative, untried: on a miss, the paint
  reads neighbouring mask texels for its own chain and turn. That adds
  paint text and texture reads.
