# K905: K620's root paint off the shader when no root is drawn (agent brief)

Coordinator, 2026-10-27 11:20. One stage, opus, 2 h cap.

## Why

K893's phone round (`docs/design/K156.md`, "## Round 2026-10-27b
handoff", S2) found the week's largest fabric loss in K620's root paint.
`6fd77ab3` ("the root paint's GLSL (vertex root block, ROOT_FRAG_GLSL,
SECTION_FRAG wiring)") costs max-fabric +22.6 ms of render sync on the
Pixel 11 (ABBA), and `fa0c61de` ("the root paint is a section blend") a
further +6.1 ms (single run). Over the same commit interval dense rose
+20.5 ms and knot gs24 +9.7 ms, not measured at the pair. None of these
cells paints a root, so the cost is probably GLSL the section shader
always compiles and runs. That is K893's inference; nobody has checked it.

K620 (Done in `d54c09b`) paints a glyph's root as a blend of the stroke
section colours from R to the spur at J. If the inference holds, the fix
is a shader variant: a scene that draws no root gets programs without the
root code. That frees phone budget for K868's S3, which is gated on it
(ledger K892).

## Setup

- Worktree `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k905-root-gate`,
  branch `k905-root-gate`, made from master. Your shell starts in the MAIN
  checkout, which must stay clean: use absolute paths and
  `git -C <worktree>`. node_modules is a junction to the main checkout's.
- Read first: K156.md's round 2026-10-27b handoff (the cells, the links,
  the kit and how each pass ran), then K620's commits (`566e139a` data
  plumbing, `6fd77ab3`, `fa0c61de`, and the rest of K620 up to `d54c09b`).
- Code: `src/render/paint_glsl.ts`, `paint_math.ts` (its CPU mirror),
  `paint_model.ts`, `ribbon/ribbon_shader.ts`, and the gameplay and
  explore programs that include the section code. Tests:
  `test/render/k320_slim.test.ts`, `paint_*.test.ts`.
- Phone kit: `scripts/phone_pass.ps1` and round 2026-10-27b's scripts in
  `.claude/probes/rounds/2026-10-27b/` (`idle_wait.ps1`, `build_pool.ps1`,
  `run_pass.ps1`, `scan.mjs`, `pdiff.mjs`, `p_common.mjs`). Copy what you
  use into `.claude/probes/K905/` (untracked); leave the round's folder as
  it is.
- Links (K539's frozen render-sync cell, `&am=instant&snd=none&fw=0&phy=0`):
  dense `b&gs=24&wd=0.6&brd=0.6`, max-fabric
  `b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5`, knot gs24 `b&gs=24&wd=1&mf=0`.

## Order

1. **The cause.** Where the root code enters each program (vertex and
   fragment), what it costs when no root is drawn (data fetches, varyings,
   branches on uniforms, register pressure), and which programs carry it.
   Write the finding down before building the gate.
2. **The gate.** A compile-time variant: without a root in the scene, the
   programs are built without the root code; with one, they are what master
   builds now. Decide where the switch is made (scene build, where the
   paint model knows whether any root is painted), make sure a variant
   switch never compiles mid-play, and say what a switch costs. The CPU
   mirror stays as it is unless a mirror test needs the variant.
3. **Same pixels, desktop.** Frames before and after on the three links
   and on a link that paints a root (find one through K620's tests or
   probes). Dense and knot gs24 must match exactly. Max-fabric's frozen
   frame differs run to run (base vs base up to 2587 px, ledger K908), so
   compare the branch's diff with a master-vs-master control. Run the full
   suite in the worktree (`npx vitest run`).
4. **Phone.** Measure only if `adb devices` lists the phone, the perf lock
   is free and `phone_pass.ps1 -Phase check` passes. Run K893's idle wait
   first, as round 2026-10-27b did. Then do ABBA, master against the
   branch, on all three links. If any of those conditions fails, stop at
   step 3 and say which one; K906's phone window measures it later.
5. **If the gate wins less than K893 measured**, find out where the rest
   goes (the data plumbing `566e139a`, the vertex block, a second program).
   Report it; don't widen the stage.

## Checks (report the numbers)

- Render sync per link, master and branch, the ABBA runs and the means.
- Pixel diffs per link, with the controls.
- Program count and compile time at scene load, master and branch, on
  the desktop.
- The full suite.

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop
  when steps 1-4 are done (5 if it applies) or 2 h after the start,
  whichever comes first. A compaction is not a stop: after one, re-read
  this brief and `git -C <worktree> log --oneline -10` before going on.
- Commit WIP to `k905-root-gate` at every milestone, broken or not. Never
  push or merge, and don't edit `LEDGER.md`. If the stage stops
  unfinished, append a `## Handoff` to this brief in the worktree and
  commit it.
- Never run `npm run build` in the main checkout; build in the worktree or
  with `build_pool.ps1` into its own directory.
- The perf lock: take `$env:TEMP\claude-perf.lock` (one line: owner, start
  time, what) before any phone or desktop timing, and delete it when done.
  If another owner holds it, wait inside ONE blocking command; a lock
  older than 30 min is stale.
- The phone: never wake or unlock it, never send it key events, and never
  touch its media. Run passes the way round 2026-10-27b did (the idle
  wait, `-Phase check`, the watchdog, the cleanup). Call
  `phone_pass.ps1 -Phase start` directly: a piped or captured caller
  hangs.
- Probe links carry `&snd=none`. Never touch processes you did not
  start, never use Levi's Chrome profile, and don't upload anything.
- Use PowerShell for local commands. Read code through the shell
  (`Select-String`, then `Get-Content <file> | Select-Object -Skip <n>
  -First <m>`); use the Read tool only right before an Edit. View images
  as crops of 1000 px or less, cut by script into `.claude/probes/K905/`.
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- The final report gives the cause found, what was built, the pixel and
  suite results, the phone numbers or why there are none, a
  `Ledger items` list (follow-ups, residuals, decisions for Levi), and
  K905's handle fields (branch, last commit, evidence, next).

## Step 1: the cause (agent, 2026-10-27 11:25)

Where the root code enters (K620, `6fd77ab3` then `fa0c61de`), all of it
in `paint_glsl.ts` pieces that every section program includes:

- **Vertex** (`PAINT_VERT_DECL`, `PAINT_VERT_MAIN`): four more outputs,
  `vKR0` (flat vec4), `vKRC` and `vKRO` (smooth vec3) and `vKRJ` (flat
  vec3), 13 components on top of the 35 the section vertex wrote before
  (gap 10, paint 16, vUV/vSection/vColor 9), so +37% varying storage per
  vertex. All four are written on every vertex, zeroed when no root. Then
  a block guarded by `kc1.w > 0.5` (per-chain KSTATIC data, not a uniform,
  so the compiler must keep it): when taken it fetches the root table
  (3 KGEOM + 2 KSTATIC + 1 KGEOM texels), builds a second `KChain` and
  inlines `kSectionAtArc` three times. K620 itself saw the block change
  `knotSection`'s codegen on no-root frames (3 px, maxDelta 1).
- **Fragment** (`PAINT_FRAG_DECL`, `ROOT_FRAG_GLSL`, `SECTION_FRAG`): the
  four inputs, `kRootSection` (3 KGEOM fetches when taken) and
  `if (vKR0.x > 0.5 && kpt.x < vKR0.z) base = kRootSection(kpt.x, pxW);`,
  a branch on a flat varying (not provably uniform), early in `main`.

What it costs when no root is drawn: no extra data fetch runs (`kc1` is
fetched for `vKC1` anyway, and neither branch is taken; the per-frame
`writeRootTables` loops over no entries). What remains is (a) the 13
varying components every vertex writes and, on a tile-based GPU like the
phone's, stores to the parameter buffer and the fragment stage reads and
interpolates (two smooth vec3s), (b) the never-taken vertex block's code
and registers (three inlined section evaluations), and (c) the fragment
branch and its inlined function. `fa0c61de` shrank the fragment side
(three inlined `kFxColor` calls out) yet measured +6.1 ms more (one run),
which points away from fragment code size and toward (a) and (b); the
phone pass of the gate is what tests it.

Programs that carry it: `section-rgb` and `section-rgb-explore`
(`ribbon_shader.ts`, every ribbon fill: knot, maze and gameplay strips
through `strip_pass.ts` and `explore_gaps.ts`), and `ribbon-sdf` /
`ribbon-sdf-explore` (`ribbon_sdf.ts`, only with `?rp=sdf`). Junction
fans, arm strips, pluck, gap and background programs carry none.

Roots exist only in glyph text: a strand gets `taper` only in
`glyph_graph.ts`, which runs only with the `#glyphs2` hash switch (and
not with its `notaper` flag) on a scene with text or a title. So no
default page can draw a root, and the three K539 cells never do.

## Step 2: the gate (agent, `97aa65ba`, pin fix `334e3048`)

- Every root piece of the paint GLSL sits under `#ifdef K_ROOT`: the four
  `vKR*` varyings (vertex out, fragment in), the vertex root block and its
  zeroing, `ROOT_FRAG_GLSL` and `SECTION_FRAG`'s root call, and the same in
  `ribbon_sdf.ts`. `withRoot(src)` (`paint_glsl.ts`) puts `#define K_ROOT`
  after `#version 300 es`. Without it a program holds none of K620's GLSL
  (a text scan of the branch finds no `vKR*` / `kRoot*` GLSL outside the
  gate); with it, it is master's program.
- Four variants: `section-rgb-root`, `section-rgb-explore-root`,
  `ribbon-sdf-root`, `ribbon-sdf-explore-root` (`program_registry.ts`;
  `PROGRAM_SITES` 2 -> 4 for `ribbon_shader.ts` and `ribbon_sdf.ts`).
- **Where the switch is:** `RibbonRenderer.rootPaint`, fixed at
  construction by the test PaintScene allocates root tables by (a chain
  whose taper has a body and >= 2 foot entries). The renderer hands its
  strip, explore and SDF passes the -root shaders only then. A renderer
  is built per scene, so the variant changes only at a scene build, never
  mid-play.
- **The warm-up** (`WarmContext`): `roots` = a `#glyphs2` page without
  `notaper` (a root is possible), `root` = its first scene has a word or a
  title. Without `roots` the -root programs are in neither wave, so every
  default page compiles exactly what it did, minus the root code. With
  `root` they join wave 1 beside the plain ones (whether a word's glyphs
  grow a root is known only after the build); with `roots` alone they go
  to wave 2, so a later scene's switch finds them linked.
- **What a switch costs:** one more full section program in wave 1 on a
  glyph page whose first scene has text (desktop: step 4b; phone: wave 1
  n 11, 112-133 ms, against master's n 10, 116-156 ms). Nothing on any
  other page.

## Step 3: same pixels, desktop (agent)

K539's frozen cell on the desktop (private Chrome, 411x753 @ 2.625,
`.claude/probes/K905/k905_cell.mjs`, runs `desk/desk1`, `desk/desk2`),
base = master `156c1eef`, head = `97aa65ba`, ABBA:

| Link | base vs head (both pairs) | base vs base | head vs head |
|---|---|---|---|
| dense | 0 / 0 px | 0 | 0 |
| knot gs24 | 0 / 0 px | 0 | 0 |
| root `7&txt=ai#glyphs2` (desk2; head draws -root) | 0 / 0 px | 0 | 0 |
| max-fabric | 2177 / 1789 px (maxD 317) | 2080 (maxD 159) | 1011 (maxD 112) |

Max-fabric froze in a different state on every desktop load (K908), so
its desktop diff only matches the control's size; the phone pass (step 4)
caught a matching state and read 0 px. K620's own link `7&txt=a#glyphs2`
paints no root any more (`rootscan.mjs`: no chain with a foot table);
`7&txt=ai` does (chain 2, a 17-entry table).

Suite (`npx vitest run` in the worktree): one failure first,
`sdf_gap_bind.test.ts`'s text pin of the gap-table rebind (one shared SDF
shader became one per variant; fixed in `334e3048`), then 178 files pass
(2 skipped), 2364 tests (6 skipped), exit 0.

## Step 4: phone (agent, 12:03-12:09)

All conditions held: `adb devices` listed the Pixel 11, the perf lock was
free, K893's idle wait passed and `phone_pass.ps1 -Phase check` passed.
Pass `p1` (`.claude/probes/K905/run_k905.ps1`, the round's `run_pass.ps1`
with K905 paths): K539 frozen render-sync cell, renderLoop(60) medians,
ABBA, base = master `156c1eef`, head = `97aa65ba`, 411x753 @ 2.625. No
page or GL errors, no context loss, the watchdog `ok` throughout, the
cleanup exit 0. Thermal: skin 27.6 -> 36.8 C, soc 31.7 -> 43.0 C.

| Link | base runs | head runs | means base / head | head - base |
|---|---|---|---|---|
| dense | 83.3, 82.3 | 64.1, 63.8 | 82.8 / 63.95 | **-18.85 ms** |
| max-fabric | 130.2, 129.6 | 104.3, 104.2 | 129.9 / 104.25 | **-25.65 ms** |
| knot gs24 | 40.8, 42.1 | 29.3, 29.1 | 41.45 / 29.2 | **-12.25 ms** |
| root (head draws -root) | 4.3, 4.0 | 4.2, 4.6 | 4.15 / 4.4 | +0.25 (noise) |

Master reproduces K893's g1 base (82.3 / 127.4 / 41.0). Pixels: 0 px on
every pair of dense, knot and root. Max-fabric: base vs head 0 px on the
first pair; the second pair read 1093 px, exactly base vs base (base run
4 froze differently from base run 1), head vs head 0. Head's `rootPaint`
was false on the three links and true on the root link. Wave 1 on the
phone (no KHR_parallel_shader_compile, wave 2 skipped): dense n 10 in
280-338 ms, max-fabric n 10 in 759-815, knot n 7 in 138-169 on both
builds; the root link n 10 (master) and n 11 (branch, + `section-rgb-root`).

## Step 4b: programs and cold compiles at scene load, desktop (agent, 12:14-12:19)

`.claude/probes/K905/compile_batch.ps1` under the perf lock: K307's
`trace_intro.mjs` (copied, plus the warm-up's waves and `rootPaint`),
headed Chrome, ANGLE d3d11, 1600x900 @ 1.5, a FRESH profile per load (a
cold GPU program cache), a 14 s window, ABBA per link on the cell links.
`node cc_sum.mjs` prints it. Wave 1 gates the first frame and is almost
all `section-rgb`'s cold FXC compile; wave 2 starts after the first sleep
and was still open at 14 s where it started at all.

| Link | wave 1 n | first frame (s), base | first frame (s), branch | programs at 14 s |
|---|---|---|---|---|
| dense | 10 / 10 | 7.42, 9.58 | 6.93, 6.99 | 13 / 13 |
| max-fabric | 10 / 10 | 9.19, 6.08 | 8.68, 7.26 | 13 / 13 |
| knot gs24 | 7 / 7 | 6.32, 6.38 | 6.07, 6.17 | 38 / 38 |
| root `7&txt=ai#glyphs2` | 10 / 11 | 7.57, 6.98 | 7.67, 11.82 | 42 / 46 |

On the three links the branch links the same programs and its first
frame is no later (cold `section-rgb` 5.7-9.1 s either build, the run
spread 3 s). The root page links four more (`section-rgb-root` in wave 1,
the other three in wave 2) and draws only `section-rgb-root`: the plain
`section-rgb` it also links in wave 1 drew nothing in either run. The two
cold compiles run side by side, so that page's first frame came 0.1 s and
4.8 s after master's (two runs): the switch's cost, desktop only (the
phone's wave 1 took the same time with 11).

## Step 5: does the gate win what K893 measured? (agent)

Yes, within the noise. On max-fabric the gate wins 25.65 ms, more than
the ABBA-confirmed +22.6 at `6fd77ab3` and about 3 ms short of 22.6 plus
`fa0c61de`'s +6.1, which was one run (K893's two e2 head runs of one
build differed by 2.8 ms; `fa0c61de` also made the fragment smaller).
Dense wins 18.85 against the 59..88 interval's +20.5 and knot 12.25
against +9.7, and those intervals hold every commit in them, not only
K620. The places the brief names hold nothing more: the data plumbing
`566e139a` measured 85.0 against 85.9 before it, and without `K_ROOT` a
program holds no vertex block, varying or fragment root code (the text
scan in step 2), so no second program or leftover block carries any. The
gate removes the varyings, the vertex block and the fragment branch
together, so this pass does not split the win between them.
