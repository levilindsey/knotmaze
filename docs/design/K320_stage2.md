# K320 Stage 2: split the gap search out of section-rgb (brief)

Status: brief only. No `src/` change in this document's commit.
Base: HEAD `6c592e6` (Stage 1 slim done). Stage 0 verdict PASS
(`.claude/probes/K320/stage0_results.md`): splitting saves ~1.84 s of
cold gate, 3.7x the 0.5 s kill threshold in
[the Stage 0/1 design](K320_section_rgb.md). This brief is the
build-ready design for Stage 2 (that document's O6). Calls for Levi
are at the end; build as recommended unless a call says otherwise.

**Recommendation in one line:** draw the ribbons twice — a gap-only
pre-pass into a canvas-sized mask texture, then a paint-only section
pass that samples it — for master and explore alike; fans and the
still pluck keep their in-shader gap text. Expected cold-gate saving
~1.7 s on the desktop (section 2); the risks that can kill it are
pixel parity at gap edges and frame cost, both gated in section 8.

## 1. Where Stage 1 left the programs

Chars handed to `GlProgram.from`, at `6c592e6`
(`.claude/probes/K320/results.md`; Stage 0's control was the pre-slim
text at `bd3933a`):

| program | frag (pre-slim) | frag (today) | wave 1 |
|---|---:|---:|---|
| section-rgb | 48,737 | **46,310** | every non-explore intro |
| section-rgb-explore | 64,764 | 62,373 | explore/burn links |
| arm-strip | 33,122 | 31,049 | fabric intro |
| junction-field | 29,599 | 26,305 | fabric intro |
| pluck-still | 21,075 | 19,960 | reduced-motion intro |

Stage 0's measured halves (pre-slim text, fresh-profile D3D11,
median of 4): full 3.74 s, paint-only (30,651) 1.90 s, gap-only
(18,763) 0.51 s, junction-field control 0.61 s. The combination
costs ~1.33 s more than the halves summed — register pressure, not
text size (the design doc's section 3; same-size paint and
junction-field price 3x apart). Stage 1 removed only dead text, so
the superlinear excess is still in today's 46,310: the split is
still the only second-scale lever, and Stage 2's first measurement
(section 6, 2c) re-times today's slimmed full text as its control
rather than trusting the pre-slim 3.74 s.

Today's data flow, which the split must preserve exactly: each
chain is one `RibbonMesh` in `baseLayer` (`ribbon_renderer.ts`,
children added in `ps.chains` order, one draw per chain through the
shared section shader). The fragment
([ribbon_shader.ts](/src/render/ribbon/ribbon_shader.ts)) computes
`pxW` from `fwidth(vPos)` and `gTurn = gapTurn()` in uniform control
flow, runs the paint, then `gk = gapKeep(pxW, gTurn)` — the
SAMP-referenced search in [gap_mask.ts](/src/render/gap_mask.ts)
(`GAP_FRAG_LIB`: `gapKeepAt` over up to `GAP_SLOTS` slot rows of
`uGapData`, sampling the over centerlines through `sampAt` over
`uSamp`, both from [fabric_sdf.ts](/src/render/fabric_sdf.ts)) — and
discards at `gk <= 0.002`, else multiplies the premultiplied output
by `gk`. Search inputs: the varyings `vPos` / `vTurnA` / `vTurnB` /
`vTan` / flat `vMaskId`, the two data textures, and `uFabricGap`
(enabled / probe tint / brute-force) plus `uKFx` (the gated slots'
strength ramp). Search output: one float per fragment. Nothing else
crosses the paint/gap boundary today — that single float is what
the split has to move through a texture.

## 2. Expected saving

Split gate = max(paint-only, gap-only, arm-strip) instead of the
combined section-rgb. On Stage 0's halves that is 1.90 s against
3.74 s: **~1.84 s saved cold** (every round passed alone; range
1.49–2.09 s). Re-based on today's slimmed text the halves shrink to
roughly paint ~29.3k / gap ~17.7k (section 3.1), so read the saving
as **~1.6–1.8 s expected, to be confirmed by 2c's in-app gate
measurement** — the isolated-compile caveat (parallel wave-1
contention moved K540's numbers ±0.4 s) is why 2c re-measures
rather than inheriting Stage 0's arithmetic. Warm loads stay 0:
the warm-up gate waits for the longest wave-1 compile, not the sum
([render-shaders.md](/../.claude/rules/render-shaders.md)), and both
halves are shorter than today's combined program. The phone has no
FXC and no shader-compile numbers yet (Stage 0 caveat); the phone
bar is call 4.

## 3. The split design

### 3.1 The two programs per variant

Master and explore each become two programs sharing today's vertex
shader and geometry:

| program | fragment | est. chars | replaces |
|---|---|---:|---|
| `section-rgb-gap` | `GAP_FRAG` + thin skeleton (3.2) | ~17.7k | — (new) |
| `section-rgb-paint` | `SECTION_FRAG` with `GAP_FRAG` → mask sample (3.3) | ~29.3k | `section-rgb` |
| `section-rgb-gap-explore` | explore-edited `GAP_FRAG` + skeleton | ~19.5k | — (new) |
| `section-rgb-paint-explore` | `withExplore` over the paint fragment | ~46k | `section-rgb-explore` |

Estimates are today's text minus/plus the swapped chunk
(`GAP_FRAG` is 17,292 of today's 46,310; the explore delta is
unchanged). The gap skeleton carries only what `gapKeepAt` reads
from the paint side — `uKFx` and `CROSSING_FADE_IN` for
`gapStrength` — exactly Stage 0's `halves/gap.frag` shape, which
linked clean; the paint half's stub is Stage 0's `GAP_STUB` shape
grown into the real sample (3.3). No GLSL search text is edited:
both halves include the same `GAP_FRAG_LIB` / paint chunks as
today, so `paint_math.ts` parity and the `gap_mask` CPU mirror are
untouched.

### 3.2 Gap pre-pass: target, resolution, rate

**Target.** One page-lifetime `RenderTexture` (the PALETTE_CACHE
rule: grown in place, never destroyed), `rgba16float`, NEAREST, no
mipmaps, `antialias: false`:

- `R` = `gapKeep` (0–1). Half float resolves ~0.0005 near 1 — two
  orders below the 0.002 discard threshold and the one-level census
  tolerance (K433).
- `G` = draw index + 1 as an exact integer (half float is exact to
  2048; chain counts are far below). 0 = no ribbon covers the pixel.
- `B`, `A` unused (written 0 / 1). RGBA, not RG: `rgba16float` is
  the renderable half-float format Pixi/WebGL2 expose everywhere
  the float path exists; an RG target buys nothing and risks a
  framebuffer-completeness miss.

**Resolution.** 1:1 device pixels with the canvas
(`renderer.width` × `renderer.height`), recreated by resize when
either changes. No downscale: the casing edge is a one-pixel
`fwidth` ramp, and a half-res mask shifts it by up to a texel —
exactly the artifact class the census counts.

**Draw.** A Pixi system in `arm_strip.ts`'s pattern
(`ArmStripSystem`, prerender, priority −99 — after the strips'
−100, before any render that draws ribbons): hide the root's
non-base children (fillet layers, plucks), swap every fill mesh's
shader to the mode's gap shader, `renderer.render({container:
root, target})` with clear `(0,0,0,0)`, swap back, unhide. Rendering
the root (not `baseLayer` alone) keeps the camera transform the
base layer draws with; shader swap (not twin meshes) keeps one
geometry, one order, one transform — `baseLayer` child order *is*
the draw order the `G` channel encodes. The gap fragment is
Stage 0's skeleton with a real output:

```glsl
out vec4 finalColor; // R gapKeep, G drawIndex+1
void main(void) {
  highp vec2 gfw = fwidth(vPos);
  highp float pxW = max(max(gfw.x, gfw.y), 1e-5);
  highp float gk = gapKeep(pxW, gapTurn());
  finalColor = vec4(gk, float(vChain) + 1.0, 0.0, 1.0);
}
```

`vChain` is a new flat varying from the vertex stage,
`int(aKey.x + 0.5)` — `aKey` (chain, sample) already rides every
ribbon vertex for the paint (`PAINT_VERT_DECL`), so the shared
vertex shader and shared shader instances survive; no per-mesh
uniforms. Blending off, depth off, writes unconditional: the last
ribbon over a pixel owns the texel, which is the only fragment
whose gap can be visible there (3.3). MSAA: none on the target.
The gap edge already carries its analytic one-pixel ramp
(`pxW` smoothstep + fade in `gapKeepAt`); the residual risk is the
ribbon silhouette's MSAA edge sampling one mask texel per pixel —
bounded to edge pixels, judged by the contact sheets (6, 2b), and
a named kill criterion (8).

**Rate.** Not per frame unconditionally, and not GEOM-only — the
search reads live geometry (`uSamp` follows the particles through
every settle, drag and flow frame) and a live clock (gated slots
ramp on `uKFx.z`). The pass runs in prerender iff the mask is
dirty, mirroring `arm_strip.ts`'s `dirty()`: any of — the SAMP
source's revision, a dirty gap-table row (`GapRowSource.any`, the
`GAP_UPLOAD_STATS` path), the renderer's geometry revision
(bumped where `RibbonRenderer.update()` rewrites samples), the
view transform or canvas size, `uFabricGap` (enabled / probe /
brute), the explore mode or its shape rows, or the FX clock still
ticking (`uKFx.w > 0` and unsettled — gap strengths move with it).
Asleep with a static view, none move and the pass costs nothing;
the texture persists across frames and scene rebuilds (rebound by
the `bindGap` binding list, 3.3).

### 3.3 Paint pass: sampling the mask

`GAP_FRAG` in the paint fragment becomes varyings plus:

```glsl
uniform highp sampler2D uGapMask;
uniform vec2 uGapSize; // target texels, for the Y flip (below)
highp float gapKeepFromMask(int self) {
  ivec2 tc = ivec2(gl_FragCoord.xy);
  // Y orientation decided by the 2a spike, pinned by its test
  // pattern — do not guess: Pixi flips render-target projections.
  vec4 m = texelFetch(uGapMask, tc, 0);
  if (int(m.g + 0.5) - 1 != self) return 1.0;
  return m.r;
}
```

`self` is `kc.ch` — the chain `kFragChain()` already computes —
which is the same `ps.chains` order the gap pass encoded. Where a
later ribbon owns the texel, this fragment returns 1 (uncut): its
paint is overdrawn by that owner's paint fragment anyway, whose
own sample does match and applies the stored keep. Where this
fragment is the owner, the stored keep replaces `gapKeep(...)`
at today's two use sites (the `gk <= 0.002` discards, the
premultiplied multiply, and debug view 5's cut); the probe tint
(`gk < 1.0 && gapProbe()`) reads the sampled `gk` and the
`uFabricGap.y` uniform directly — `gapProbe()` itself leaves with
the library. Debug views 1–4 never read `gk` and are untouched.
`gl_FragCoord` is device pixels on both passes only if the target
is 1:1 (3.2) — the second reason downscale is out.

Binding: `sectionShader()` / `sectionShaderExplore()` gain
`uGapMask: gapMaskSource()` beside `uGapData` / `uSamp`;
`bindGap(tex)` re-points it with the rest of its list whenever the
target is recreated. Gap shaders bind `uGapData`, `uSamp`,
`fabricUniforms` and `knotUniforms` exactly as today's section
shaders do.

### 3.4 Explore variants

Split both. The explore gap text is the master's plus
`explore_glsl.ts`'s edits (FAR / CUT / SHAPE / SURE / KEEP — the
vis-weighted protect and far-branch, the shaped cut reading
`GAP_PROF_BASE`), produced by the same `exploreGapEdits` /
`withExplore` anchor machinery over the gap skeleton, so the
anchors `paint_explore.test.ts` pins keep occurring exactly once.
The explore gap pass runs whenever the mode is on (its shapes and
strengths are reveal state — the dirty rule in 3.2 includes them);
mode off runs master's pair, byte-identical in behavior to today.
A burn link warms both pairs in wave 1 (4), as it warms both sets
today.

### 3.5 What does not split

Fans (`junction-field`, ±explore) and the still pluck
(`pluck-still`, ±explore) keep `GAP_FRAG_LIB` / `GAP_FRAG_LIB_FAN`
in-shader. Junction-field carries the same 17k search yet compiles
in 0.61 s — the cost is the paint+gap *combination*, and neither
program gates an intro the section doesn't gate harder (junction
0.61 s vs paint ~1.9 s). Splitting them adds four programs, a fan
mask pass over different geometry (fan fragments have no chain —
`G` would need a second encoding), and no gate win. Revisit only
if a later stage makes the fans gate (call 5). The arm strips
never carried the search. One search edit still recompiles every
consumer — the split does not change that, and bundling rule
(K389 / the design doc's section 7) still applies.

## 4. Warm-up registry changes

In [program_registry.ts](/src/render/program_registry.ts):
`PROGRAM_SITES` for `ribbon/ribbon_shader.ts` goes 2 → 4, and the
two section entries become four, longest-first ordering unchanged
(the warm-up sorts by text length itself):

| entry | wave 1 |
|---|---|
| `section-rgb-paint` | `!explore` (and burn: also true) |
| `section-rgb-gap` | same as its paint twin |
| `section-rgb-paint-explore` | `explore \|\| burn` |
| `section-rgb-gap-explore` | `explore \|\| burn` |

So a plain daily warms paint+gap (max ~1.9 s, not the sum — the
gate is the longest link, K307), an explore/burn link warms both
pairs, and nothing ribbon-shaped is left to link at first draw.
`sectionProgram(explore)` becomes `sectionPaintProgram(explore)` +
`sectionGapProgram(explore)` in `ribbon_shader.ts` (same
`GlProgram.from` caching; never a second `new GlProgram` of a name
— the `batch-fragment-2` trap). The registry test's wave-1 name
lists gain the two (or four) names per case; that test failing
until updated is by design (K307).

## 5. Fallback if the target cannot exist

Detect once, before the warm-up builds its context (the registry
needs the answer): `EXT_color_buffer_float` /
`EXT_color_buffer_half_float` on the app's context, plus a
one-time framebuffer-completeness check on the actual target at
first allocation (drivers lie by extension). `WarmContext` gains
`gapSplit: boolean`:

- **Supported (expected everywhere WebGL2 runs — desktop ANGLE,
  Pixel PowerVR):** the four entries above are the registry.
- **Unsupported:** the registry instead lists today's combined
  `section-rgb` / `section-rgb-explore` (kept as
  `SECTION_FRAG` / `withExplore(SECTION_FRAG)` behind the flag),
  wave 1 exactly as today, and ribbons draw the in-shader path.
  No cold regression, no second geometry pass; the page pays
  today's 46,310-char compile, once per shader-changing deploy,
  as it does now.

Both paths are never warmed together (that would put the combined
program back on the gate). The combined text stays in the tree
only as this fallback — if a full phone round (K156) shows the
half-float target complete on every target device, a later stage
may delete it and re-count `PROGRAM_SITES` to the four split
entries alone (call 5's sibling; not in Stage 2's scope).

## 6. Staged sub-steps

Each sub-step merges alone, suite green, desktop-verified; the
phone proof rides K156's next window, as Stage 1's did.

**2a — data plane (no visual change).** The mask texture, the gap
programs, the prerender system and the dirty rule; ribbons still
draw exactly as today (paint keeps its in-shader `gapKeep`). The
pass renders anyway so its output can be proven before anything
consumes it. Deliverables: a probe dump (mask texture readback
beside the same frame's in-shader `gk`, via debug view 5's path)
showing **0 differing texels** over the G1 link set, including the
Y-orientation test pattern (a known asymmetric scene — the flip
in 3.3 is measured here, then pinned), and a frame-cost reading
against `gap_mask`'s COST baseline (3200×1800 draw phase). Kill
gate: parity or the +0.3 ms budget (8) — cheapest place to stop.

**2b — program split.** Paint fragments sample the mask (3.3);
explore pair splits with it (3.4); fallback flag wired (5) but the
combined programs still registered nowhere on a supported context.
Proof plan (7) runs in full here. This is the only sub-step that
changes a shipped fragment's behavior, so it lands alone in its
deploy (the all-player recompile is paid once).

**2c — registry and warm-up.** The four entries and wave-1 lists
(4), `k320_slim.test.ts` budgets re-pinned to the halves, and the
in-app cold-gate measurement: `trace_intro.mjs` fresh-profile
pairs (split build vs the 2b parent), 8 interleaved pairs,
`phw=0`, D3D11 —expect the gate at paint's time, saving within
0.4 s of section 2's estimate. Then K156's next phone window takes
the cold gate + fps + the target-completeness check on the Pixel
before Stage 2 is called done (call 4).

## 7. Determinism and pixel-parity proof plan

Same oracles as G3-1's verification (K536), no new machinery where
an old one reads the same state:

1. **0 px same-state A/B** on the K536 / G1 link set (the design
   doc's section 6 set): split vs parent build, physics frozen,
  `&phw=0&fw=0`, several captures per build (thread-reveal A/Bs
   don't repeat to the frame — K428 — so explore links take the
   multi-capture form). Any diff beyond the one-level AA tolerance
   K433 already allows is a failure, attributed per pixel before
   proceeding.
2. **Brute vs pruned 0 px**: `uFabricGap.z` brute force in the
   gap program against its pruned self — the search text is
   unedited, so this must hold exactly as it does today; it
   proves the move didn't disturb the search.
3. **Gap census** (the implementation-independent casing census,
   `probes-census.md`) on the standard URLs: overcut / naked
   counts at or better than the G1 baselines in
   [render-gaps.md](/../.claude/rules/render-gaps.md).
4. **Mask readback parity** (from 2a, kept as a probe):
   per-texel `gk` from the target vs the in-shader value on the
   fallback path, same frozen state — 0 texels apart.
5. **SwiftShader compile** of all split texts (the K76 2d
   `dump_variants.ts` + `compile_glsl.mjs` pattern), so a text
   that only ANGLE accepts never ships.
6. **Contact sheets** at crossings, ribbon edges and a zoomed
   kink eye (MSAA edge risk, 3.2), eyeballed beside the parent's.

## 8. Kill criteria

- **2a:** mask readback differs from in-shader `gk` on any texel
  of the proof set, or the pass costs > 0.3 ms GPU at 3200×1800
  over the COST baseline → kill the split; close K320 on Stage 1.
- **2b:** any 0 px A/B diff not attributable to the K433 one-level
  tolerance, any census regression, or MSAA gap-edge artifacts on
  the contact sheets → revert 2b (one commit); 2a's data plane
  goes with it.
- **2c:** in-app cold-gate saving < 0.5 s against the slimmed
  control (Stage 0's threshold, re-based), or no cold improvement
  on the Pixel in K156's window → kill: keep Stage 1, restore the
  combined programs as the only path, ledger the numbers.
- **Any sub-step:** a deploy already changing shader text for
  another item folds 2b in rather than paying a second all-player
  recompile (the design doc's section 7 rule).

## 9. Tests

- `test/render/program_registry.test.ts`: wave-1 lists per 4;
  `PROGRAM_SITES` 2 → 4 for `ribbon_shader.ts` (2a adds the sites —
  the scan failing until registered is the intended tripwire).
- `test/render/k320_slim.test.ts`: budgets re-pinned — paint
  ≤ ~30k, gap ≤ ~18.5k (explore pair likewise), and the split
  invariants: no `gapKeepAt` in either paint text, no paint chunk
  (`kPaintAt`, `PAINT_PAINT_*`) in either gap text, `uGapMask`
  sampled exactly once per paint text.
- `test/render/paint_explore.test.ts`: explore anchors still
  exactly once, in order, in both explore halves.
- New `test/render/gap_split.test.ts` (pure parts only, no GL):
  mask encode/decode round-trip (keep + index, incl. index 0 /
  empty), the dirty-rule truth table over its inputs, and the
  fallback registry selection (`gapSplit` false → combined
  entries, true → split entries, never both).
- Unchanged and must stay green: `gap_mask.test.ts`,
  `samp_table.test.ts`, the `paint_*` parity suites (no
  `paint_math.ts` change), physics goldens (no physics text).

## Calls for Levi

1. **Ship the split at all (the standing call 2)?** Built as
   recommended here: fund 2a–2c on Stage 0's PASS. The gain is
   cold-only (first visit, and first visit after each
   shader-changing deploy; warm restart stays 0.80 s); the cost
   is the mask target, a second ribbon-geometry pass per dirty
   frame, and this brief's proof burden.
2. **High contrast's look (K265, still owed from the Stage 0/1
   doc):** unrelated to the split but sharing its deploy logic —
   if a look is picked before 2b lands, 2b's deploy is the one to
   fold the prototype removal (O4) into. Rec: pick before 2b if
   convenient; don't hold the split for it.
3. **Debug views:** views 1–4 are untouched; view 5 and the probe
   tint read the sampled `gk` after the split (3.3) — same
   pixels, no separate debug program. Rec: keep as designed
   (the Stage 0 doc's call 3, answered by construction).
4. **Phone bar:** what cold first-visible on the Pixel justifies
   shipping if the desktop saves ~1.7 s? Rec: ship if the Pixel's
   cold gate does not regress and fps holds in K156's window —
   the desktop saving alone clears the bar, the phone only has
   to not lose.
5. **Fans later?** Rec: no — fans and the still pluck keep the
   library (3.5) unless a future measurement makes them gate;
   and keep the combined-program fallback until one full phone
   round proves the half-float target everywhere (5).
