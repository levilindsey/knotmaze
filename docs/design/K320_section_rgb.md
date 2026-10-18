# K320: slim or split section-rgb (design + measurements)

Status: design and measurement only. No `src/` change in this stage.
Measured at HEAD `bd3933a` by `.claude/probes/K320/measure.ts` (run with
`node node_modules\vite-node\vite-node.mjs .claude\probes\K320\measure.ts`;
full output `.claude/probes/K320/results.md`, gitignored like every probe).
Background: `LEDGER.md` K320, `.claude/rules/render-shaders.md` (K307
warm-up lore), `.claude/probes/K8/G3-1/k540_results.md` (the G3-1 cold
regression this item is the fix for).

**Recommendation in one line:** bundle a small semantics-identical slim
now (expected 0.1-0.3 s off the cold gate), and prototype the gap split
compile-only before committing to it — the split is the only option
modelled to save ~1 s or more, and the model is a hypothesis until a
fresh-profile link times the two halves. Calls for Levi are at the end.

## 1. What ships today (measured)

Chars handed to `GlProgram.from` (Pixi prepends its `SHADER_NAME`
define, ~30 chars, before compiling; the traces in K540 captured the
preprocessed text and read ~70 chars higher on section-rgb, which is
that prefix). FXC compiles the fragment; the vertex is a separate,
cheaper compile. Wave is `program_registry.ts`'s warm-up wave.

| program | vert | frag | wave |
|---|---:|---:|---|
| section-rgb-explore | 14,389 | 64,764 | 1 iff explore/burn link |
| **section-rgb** | **14,389** | **48,737** | **1 (every intro)** |
| junction-field-explore | 575 | 39,159 | 1 iff fabric explore/burn |
| arm-strip-explore | 371 | 38,771 | 1 iff fabric explore/burn |
| arm-strip | 371 | 33,122 | 1 (fabric intro) |
| pluck-still-explore | 692 | 30,201 | 1 iff reduced explore/burn |
| junction-field | 575 | 29,599 | 1 (fabric intro) |
| pluck-still | 692 | 21,075 | 1 iff reduced |
| pluck-blur | 828 | 3,615 | 1 (not reduced) |
| bg-* (7 effects) | 466 | 2,315-2,803 | 1 iff started |
| knot-marker | 468 | 1,691 | 1 (fabric) |
| pluck-ripple | 540 | 1,428 | 1 iff ripples on |
| bg-fog / bg-blit | 599/466 | 806/405 | 1 iff fog/background |

Pixi-internal programs (`batch`, `particles`, `displacement-filter`)
are backend-dependent and each under 45 ms cold
(`render-shaders.md`); they are not levers here.

Reconciliation with lore: K307 stage 1 read section-rgb at 46,850
chars (2.8 s) before G3-1; K540's parent read 47,687 and G3-1
48,804 from trace captures. Today's 48,737 (+ the ~70-char Pixi
prefix) matches K540's post-G3-1 number; the growth since K307 is
G3-1's +1,117 (`3465090`, the only shader-text change to these files
since, with `1fc9458` explore-only). The daily's wave 1 gates on
section-rgb: it is the longest compile in every mode that draws
ribbons, which is every intro.

## 2. What section-rgb is made of

Master fragment (48,737):

| chunk | chars | share |
|---|---:|---:|
| GAP_FRAG (gap varyings + GAP_FRAG_LIB + wrappers) | 18,407 | 37.8% |
| PAINT_PAINT_GLSL (gameplay paint: spans/pulses/rim) | 11,302 | 23.2% |
| PAINT_DATA_GLSL (chain/arc/ctrl maps) | 5,936 | 12.2% |
| PAINT_FX_GLSL (reveal FX, burn, rainbow) | 5,836 | 12.0% |
| skeleton (header + `main`) | 3,299 | 6.8% |
| PAINT_CONST_GLSL | 1,844 | 3.8% |
| PAINT_GATE_GLSL | 1,149 | 2.4% |
| PAINT_FRAG_LIB + DECL + uniforms | 964 | 2.0% |

Inside GAP_FRAG_LIB (17,916): `gapKeepAt` is 10,338 (57.7%), then
`gapProtCover` 1,274, the probe/strength/interval group 1,404,
`gapNearestFull` 1,024, `gapNearestFast` 705, `gapSegFull` 864,
`gapSeg` 702, header comment + `sampAt` (FABRIC_GLSL, 194) 933.

The explore variant adds 16,027: EXPLORE_DECL_GLSL 11,829 (VIS
5,016 + end looks 6,813), EXPLORE_MAIN_GLSL 1,936, and the K268 gap
edits (FAR 1,381, CUT 739, SURE 124, KEEP 96, SHAPE 49). It gates
only explore/burn links; a plain daily never compiles it in wave 1.

Duplication across programs (verbatim unless noted): the gap search
ships in 6 programs (3 masters + 3 edited explore copies), the paint
libs (DATA/PAINT/FX) in 4, PAINT_SECTION in the 2 strips,
EXPLORE_VIS in 2. One GAP_FRAG_LIB edit therefore recompiles 6
programs for every player; one paint-lib edit recompiles 4.

## 3. Compile-cost model (desktop, ANGLE D3D11, RX 6800 XT)

Observed points, not a fit (`render-shaders.md`, K540):

- section-rgb 46,850 chars → 2.8 s (59.8 ms per K chars, average);
  arm-strip 32,668 → 1.7 s (52.0); junction-field 28,585 → 0.4 s
  (14.0); bg-vellum (~2.7k today) → 0.19 s; everything else <45 ms.
- K540's same-program A/B (the only controlled marginal): G3-1 added
  1,117 chars of gap-search text (`sampAt` refs 0→4) and the cold
  first-visible gate moved +0.39 s mean (+0.51 median, 7 of 8 pairs;
  longest D3DCompile 3.12-3.56 s → 3.59-3.65 s; wave-2 total
  +0.95 s). That is ~250-350 ms per K chars *for search-loop text*.
- Warm restart pays nothing (0.80 s shipped, K307 stage 3; K540's
  warm control +0.016 s, Vulkan control -0.004 s). The warm-up gate
  waits for the *longest* wave-1 compile, not the sum (2.9 s vs
  5.0 s blocking, K307 stage 2).

Read: chars alone predict little (junction-field carries the same
17.9k gap library at 29.6k total yet cost 0.4 s pre-G3-1). Cost
looks superlinear in the *combination* — paint + FX + gap search in
one fragment, with its register pressure — and search-loop text
costs 5-20x plainer text per char at the margin. Two consequences:
slimming plain paint text buys tens of ms; removing the search from
the gating program is the only lever with second-scale potential,
and its size is unproven until the halves are timed. The phone has
no FXC and no numbers here; K540's Vulkan control showed no gap,
so any phone claim waits for K156's next window.

## 4. Dead and duplicate text candidates (measured)

Truly uncalled in the master section fragment (name census in the
probe; FXC still parses and front-ends all of it):

- `gapPt` 179 (also uncalled in junction-field and pluck-still),
  `kArcScale` 82, `kComposePaintFlat` 178 (ribbons use the Across
  form; strips/fans use Flat), `knotFanAlpha` 184 plus its only
  callee `kFanAlpha` 157 (the joint gate is fan-only; ribbons and
  strips include PAINT_GATE for `kSmooth`). Total ~780 chars.

Uniform-gated but always compiled:

- Probe debug views in `main` (`uKBase.z` 1-4 and 5): 358 + 427
  = 785 chars. Probes read real state through them; see call 3.
- High-contrast prototypes (K111 stage 4): the `kHcLook` gate block
  583, `kComposePaintAcross` 928, plus `kHcCompose` — live only
  while `uKBase.y != 0` (no look picked yet, K265). Deleting the
  unpicked looks is Levi's call 1, not a slim detail.

Branch specialization inside `gapKeepAt` (both arms compile in
every consumer): the fan/ribbon window arms 1,381; the protect
block 925 (fans never run it, `!fan` guard); the far-branch
smooth-min 799 (junction fans take it with `full=false`, never
entered). A fan-only GAP lib for junction-field and a ribbon-only
one for section/still shed roughly 1-1.7k each.

Duplicated search bodies: `gapSeg`/`gapSegFull` (702/864 with
their headers) and `gapNearestFast`/`gapNearestFull` (705/1,024)
are near-copies differing by the exclusion test. One parameterized
form sheds ~0.7-1.0k but adds a per-segment branch on the hot
search — a runtime trade, decided by compile timing, not taste.

Not a lever: GLSL comments are 13,876 chars (28.5%) of the master
fragment and the whitespace-collapsed floor is 31,433. FXC lexes
both cheaply; stripping them is modelled at ~0 s and still costs
every player one cold recompile. Do it never alone — K389's rule
(comments live in TS, not shader text) applies when text is next
touched for a real reason.

## 5. Options

Expected saving = change in the cold wave-1 gate (desktop model of
section 3; warm loads always 0). Confidence reflects evidence, not
effort.

| # | option | gating text change | expected cold saving | confidence |
|---|---|---:|---:|---|
| O0 | do nothing | — | 0 | — |
| O1 | slim bundle: dead fns, per-consumer GATE/PAINT forms | section -1.0k | 0.02-0.08 s | medium |
| O2 | strip comments/whitespace | section -13.9k chars | ~0 s | high (reject) |
| O3 | fan/ribbon GAP specialization | section -0.7k, junction -1.7k | ~0-0.05 s (junction does not gate) | medium |
| O4 | delete unpicked HC looks (needs call 1) | section/strip -1.2-1.8k | 0.03-0.10 s | medium |
| O5 | mode defines (knot sheds gameplay paint) | knot only -11.3k | daily 0; knot links 0.3-0.6 s | low |
| O6 | split: paint-only section + gap-mask pass | section 48.7k → ~30.3k; new gap program ~18.9k | 0.9-1.7 s if superlinear | low until Stage 0 |
| O7 | merge Fast/Full search bodies | GAP lib -0.7-1.0k (x6 programs) | 0-0.2 s; hot-loop branch risk | low |

O1+O3+O4 bundled: roughly -2.5-3.5k on the gating fragment,
0.1-0.3 s expected. Honest assessment: worthwhile only bundled
into one deploy with other shader work; alone it does not close
K320's complaint (a ~3.3 s cold first visible, K307 stage 3).

O6, the split, in the only form found correct under ribbon
overlap: a mask pass draws the ribbon meshes in the same order
with a gap-only fragment (~18.9k: GAP_FRAG plus a thin skeleton,
no paint libs) writing `(gapKeep, drawIndex)` unconditionally to
an RG float target; the paint-only section fragment (~30.3k)
samples the mask at its screen position and discards/multiplies
only where the stored index is its own — a later ribbon covering
the pixel has overwritten the mask, and its own fragment will be
overdrawn anyway. The naive screen-mask (multiply the finished
image) is wrong: it would darken the over thread too. Fans and
the still pluck keep their in-shader gap text in O6 phase 1.
Costs: one extra ribbon-geometry pass per frame (the gap search
runs once there instead of inside the paint pass — comparable
ALU, plus target bandwidth), an RG target at canvas size, MSAA
care at gap edges (the mask is point-sampled; the current edge
ramp comes from `fwidth` in the same fragment), and a new wave-1
program. Predicted gate after: max(paint ~30k, gap ~19k,
arm-strip's incumbent 33k) — arm-strip becomes co-gate, so the
split's ceiling is set by the strip program too.

## 6. Recommendation and staged plan

**Stage 0 — compile-only prototype (no `src/` change).** Assemble
the O6 candidate texts and the O7 merged-search text in
`.claude/probes/K320/` (the probe already rebuilds every shipped
text), link each on fresh desktop profiles with the
`trace_intro.mjs` method (K540: 8 interleaved pairs, `phw=0`,
D3D11; never `--virtual-time-budget`), and record per-program
D3DCompile times for: today's section-rgb, paint-only, gap-only,
arm-strip (the post-split co-gate), and O7's section variant.
Deliverable: the gate arithmetic with measured halves.

**Stage 1 — the slim bundle (one commit, one deploy).** O1 + O3,
plus O4 if call 1 lands, plus O7 only if Stage 0 shows it compiles
faster. Semantics-identical: dead text out, per-consumer library
forms, no `paint_math.ts` behaviour change. Verify: full suite,
SwiftShader compile of all 8 ribbon/strip/fan/still texts (the
K76 stage 2d `dump_variants.ts` + `compile_glsl.mjs` pattern),
0 px same-state A/B on the G1 link set, and a K540-method
trace_intro A/B (expect small; the point is no regression).

**Stage 2 — the split (only through the Stage 0 gate).** Mask
pass + paint-only section as sketched in O6, registered in
`program_registry.ts` wave 1, fans/still unchanged. Verify:
brute-vs-pruned 0 px, the gap census, 0 px screenshot A/B at the
K536 link set, frame-cost check against gap_mask's COST baseline
(3200x1800 draw-phase), then the phone half in K156's next window
(cold gate + fps) before calling it done.

## 7. Re-pin and recompile cost (every option pays it)

- Players: Chrome's program cache is keyed by source
  (`render-shaders.md`). Any text change to a program = one cold
  compile of that program for every player on the next deploy.
  A GAP_FRAG_LIB touch recompiles 6 programs; a paint-lib touch
  4. Bundle all text changes into one deploy; never ship O2 alone.
- Tests that pin program text today (all green at `bd3933a`,
  35 tests in the four files below, run for this doc):
  `test/render/background_shaders.test.ts` holds the only sha256
  pins (7 background programs + QUAD_VERT/BLIT_FRAG/FOG_VERT/
  FOG_FRAG) — untouched unless background text moves.
  section-rgb has *no* hash pin; its guards are structural:
  `test/render/paint_explore.test.ts` slices SECTION_FRAG out of
  `src/render/ribbon/ribbon_shader.ts` and asserts every explore
  anchor occurs exactly once, in order (any edit must keep the
  `explore_glsl.ts` ANCHOR_* strings intact, or `withExplore`
  throws); `test/render/paint_ring_lap.test.ts` pins every
  floor/mod-of-a-division site by file and exact call (a new
  rounded quotient fails until listed with its reason);
  `test/render/program_registry.test.ts` pins PROGRAM_SITES
  counts and the wave-1 name lists (O6's new program site fails
  until registered — by design, per K307). The parity suites
  (`paint_*.test.ts`, `explore_*.test.ts`, `gap_mask.test.ts`,
  `samp_table.test.ts`) hold the GLSL to its `paint_math.ts`
  mirror: pure dead-text removal passes unchanged, any semantic
  slim must mirror or be proven FXC-only. Physics goldens (K87,
  byte-identity) are unaffected — no physics text changes.
- Probes: the K290/K397 `dump_variants.ts` copies slice
  SECTION_FRAG the same way; they keep working while the
  declaration marker `const SECTION_FRAG = /* glsl */ \`` stays.

## 8. Kill criteria

- Stage 0: paint-only + gap-only halves gate (max, with
  arm-strip) less than 0.5 s below today's section-rgb median
  → kill O6; close K320 after Stage 1 with the measured slim.
- Stage 1: any pixel diff on the A/B set, any parity failure
  that is not a listing update, or a trace_intro regression
  over 0.05 s → revert the bundle (it is one commit).
- Stage 2: frame cost up more than 0.3 ms GPU at 3200x1800, any
  census/brute mismatch, MSAA gap-edge artifacts on the contact
  sheets, or no cold-gate improvement on the Pixel in K156's
  window → kill the split, keep Stage 1.
- Any stage: if a deploy is already changing shader text for
  another item, fold the bundle in rather than paying a second
  all-player recompile.

## Calls for Levi

1. **High contrast's look (K265, already owed):** pick one of
   contrast / outline / chevrons / today's pulses. The unpicked
   prototypes (~1.5k of PAINT_PAINT) leave the shipped text
   (O4); until then they stay and compile every cold load.
2. **Split appetite:** is a cold-only gain (first-ever visit and
   the first visit after each shader-changing deploy; warm
   restart stays 0.80 s) worth a mask render target and a second
   ribbon pass? Recommendation: fund Stage 0's measurement
   (probe-only), decide on its numbers — no renderer commitment
   now.
3. **Debug views in shipped text:** the 785 chars of `uKBase.z`
   probe views are how probes read paint/gap state. Keep them
   (recommended; under ~0.05 s) or move probes to a separate
   debug program that only probe pages warm?
4. **Phone bar for Stage 2:** what cold first-visible on the
   Pixel 11 justifies shipping the split if the desktop saves
   ~1 s? No phone shader-compile numbers exist yet (K540's
   Vulkan control showed no gap); K156's next window would
   take them before any ship decision.

