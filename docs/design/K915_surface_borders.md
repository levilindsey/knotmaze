# K915: K868 borders from the visible surface (agent brief)

Coordinator, 2026-10-27 13:35. One stage, opus, 2 h cap. Follows K909
(`K909_geo_groups.md`, its `## Handoff`), merged to master.

## Why

Levi wants the junction borders right for the long term, and a redesign
is welcome: "I really don't mind taking a step back and redesigning our
overall approach whenever that will get us to the most ideally correct
long-term state."

Two stages on the oracle's groups moved the free border ends on the 12
real scenes from 281 to 228 (K900) and then to 227 (K909). K909 replaced
the junction group with the geometric one (the arm tubes' connected
overlap that holds the node, cut at the caps). The free ends did not
move, so group membership is not what makes them. After K909, by class:
span fill 71, group on top 50, junction core 48, union 24, neither 20,
inked by another 9, under the fill 4, under chain 1. Extra ink is 71
stretches, and #16 fails on 3 scenes; 30 of its 31 stretches are "group
on top".

The coordinator's reading, which this stage tests:
- §3.2 inks p when p lies within W of its top group's own outline. The
  oracle builds that outline from pieces: spans, span fill, core, caps,
  σ joins, refusals, the crossing cut and the pass margin. Where two
  pieces disagree, a band stops with nothing across its end.
- Even an exact outline leaves free ends. The top group can change
  inside an overlap instead of at an outline: at a depth switch, in a
  cyclic triple like k42's, or at a hook. There the band of the group
  that goes under stops, and nothing is drawn along the switch.
- Line drawing in NPR avoids both. It finds the surface on top at each
  pixel (a z-buffer), then inks the front side of every place where the
  visible surface changes. Those places are the boundaries of a
  partition of the picture, so a border can end only on another border
  or at the picture's edge. Groups, spans, fill and core then reduce to
  one question: when are two neighbouring visible samples the same
  surface?

Two forms to try (find a better one if there is one):
- (A) Labels. A visible sample carries (chain, s), plus the junction
  whose arm interval (node to cap) holds s, if any. Two samples are the
  same surface iff they lie on one chain within τ of arc length, or in
  the same junction. Use today's groups for the junctions (k883, and geo
  as the A/B), so the comparison isolates the ink rule. The relation is
  not transitive at a cap where the arm still overlaps another member
  (the hook). Say what gets drawn there.
- (B) Depth. Borders go where the visible z jumps by more than τ_z, plus
  the silhouettes. A junction fuses because its arms share z at the node
  (junction pins in `depth.ts`'s blend). Arms that part in depth while
  they overlap (the hook) get a border that fades in with |Δz|.

S3 (§8) is WebGL2 on a Pixel. K892 measured per-pixel texture searches
at +25-48 ms on the phone (K8 G3-1). A visible-surface form takes two
passes:
1. Rasterize the threads with the depth test into a label target, so the
   GPU's z-buffer picks the top.
2. Look for a label change within W, and measure the exact distance from
   the members involved, for antialiasing.

Whether that costs less than the field shader's searches is part of the
question.

## Binding (Levi)

- The look (§1): paper, a border along either side of each thread, and
  no gaps. Over, under and joins must read from the borders alone. On
  sheet B: "planned is way better. BUT planned is missing some borders".
- G1 corners, `cr` 0-6 with 3 the default (sheet F approved); the END
  tuck (§3.6); closed dead-end caps.
- The free-end image check is the judge (K910).
- The hook's look is open (sheet G: now, carry, cap). Add this model's
  candidates to that question, but don't settle it.

## Setup

- Worktree
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k915-border-model`,
  branch `k915-border-model`, made from master. Your shell starts in the
  MAIN checkout, which must stay clean: use absolute paths and
  `git -C <worktree>`. node_modules is a junction to the main checkout's.
- Read first: K909's `## Handoff`, then `K868_field_border.md` §3 and §8,
  and K900's handoff items 6-7.
- Code is in `src/render/field/`: `oracle.ts`, `geo_group.ts`,
  `checks.ts`, `depth.ts`, `geom.ts`, `g2.ts` and `scene.ts`.
- Tests are in `test/render/field/`: `k883.test.ts`,
  `oracle.manual.test.ts` for sheets, and `scenes/gen.ts` for the
  synthetic scenes.
- K909's probes are in the main checkout under `.claude/probes/K909/`;
  `indep.ts` there is the free-end image check. Copy what you use into
  `.claude/probes/K915/` and point the copies at your worktree. The real
  scenes are in `.claude/probes/K868/scenes/`, and sheets go in
  `.claude/probes/K868/sheets/`.

## Order

1. **The rule.** Write form A (or B, if it is the better start) under
   `## Results` in this brief, as a draft K868 section. Give the rule,
   then why a free end cannot occur (or where it can, and what is drawn
   there). Then show how each of these comes out: a crossing, a
   junction, a cap, the END tuck, a corner, a depth switch, the cyclic
   triple and the hook.
2. **Prototype** in the oracle behind a switch (e.g. `ink: "surface"`),
   with the default unchanged:
   - the visible surface per pixel, at the resolution the image check
     renders;
   - ink on the front side of each change, within W;
   - exact distances wherever the members give them.

   Keep today's members, corners, depth and groups.
3. **Measure** master against the prototype, on the 12 real scenes and
   the synthetic ones:
   - free ends by class;
   - census missing and extra ink, under both truths;
   - muse_hash #2, #11, #14, #15 and #16, and #15 and #16 on every scene;
   - the synthetic total (116/117) and corner solves (341/342 on
     muse_hash).

   Say which of K909's leftovers the rule removes: extra ink by
   mechanism; #16's group on top; sheet F's spur, hairlines, seam and
   speck; and S3's far pieces (350 on 319 arms).
4. **Sheet H**, `H_surface_model.png`: today's oracle and the prototype
   side by side. Show muse_hash (the 4-way, j111, j123, j140, j149 and
   crossing 292) and j_hook_cross, with free ends marked. Add crops of
   the largest changes and the hook's candidates under the prototype.
   Add a README line.
5. **Form B**, if A leaves free ends or needs a rule per case. Measure it
   as in step 3.
6. **S3's form**, with a cost estimate against K892's numbers:
   - passes, targets and their formats;
   - taps per pixel at the phone's W in pixels;
   - the precision s and ids need;
   - antialiasing.

   Also say what the oracle's checks become.
7. **Verdict**: adopt, adapt or keep §3.2's rule, with the numbers, and
   what that means for S3's brief.

Steps 1-3 come first.

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop
  when steps 1-7 are done or 2 h after the start, whichever comes first.
  A compaction is not a stop: after one, re-read this brief and
  `git -C <worktree> log --oneline -10` before going on.
- Commit WIP to `k915-border-model` at every milestone, broken or not.
  Never push or merge, and don't edit `LEDGER.md`. If the stage stops
  unfinished, append a `## Handoff` to this brief in the worktree and
  commit it.
- Never run `npm run build` in the main checkout. Never touch processes
  you did not start, never use Levi's Chrome profile, and don't upload
  anything to Drive.
- Use PowerShell for local commands. Read code through the shell
  (`Select-String`, then `Get-Content <file> | Select-Object -Skip <n>
  -First <m>`); use the Read tool only right before an Edit. View images
  as crops of 1000 px or less, cut by script into `.claude/probes/K915/`.
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- The final report gives:
  - what was built, and the rule and why;
  - the numbers before and after, and what is left;
  - a `Ledger items` list (follow-ups, residuals, decisions for Levi);
  - K915's handle fields (branch, last commit, evidence, next).

## Results

### Step 1: the rule (draft K868 §3.2, form A)

Members, corners, depth and junction groups are today's (§3.3-§3.7,
k883 spans with the crossing cut and caps; geo as the A/B).

- **Members.** At a point p: every candidate foot (chain, s) with
  d < h, and every corner fill that holds p. A chain member's label is
  (chain, s, J), where J is the cluster whose span holds s, or none. A
  fill's label is J alone. A chain member's depth is z(chain, s) (§3.3);
  a fill takes the depth of its cluster's nearest foot.
- **Visible surface.** V(p) is the member of greatest z. Ties go to the
  higher chain id, then the larger s (today's order). This is the
  z-buffer: one member per point, not one group.
- **Same surface.** m ~ m′ iff both lie in one cluster J, or both lie on
  one chain within σ = π·h of arc length. The relation is not
  transitive.
- **Ink.** p is ink iff it has a visible member S and either:
  - (a) **the outline:** p lies within W of the exposed outline of S's
    surface. That outline is made of today's primitives and exposure for
    the feet similar to S: J's spans and corners, plus s ± λ (λ = σ/2)
    around each similar foot that lies outside a cluster. The whole
    outline counts, including stretches hidden under another surface,
    so an under thread's band runs straight into the over thread's edge
    and is not notched at an acute wedge; or
  - (b) **a depth switch:** a member T ≁ S also covers p, and within W/2
    of p lies a point q that S and T both cover (each followed along its
    chain within λ) where T is on top. The switch line is centred on the
    switch, W/2 on each side, so it is W wide like every other border.

  (a) is §3.2 with the union-find group replaced by S's own class. (b)
  is new. The groups' refusals become unnecessary: similarity is tested
  between pairs and never chained, so two passes of a crossing never
  share a class through a third member.

**Why a border cannot end freely.** Split the picture into regions in
which the visible surface stays the same. Each piece of a region's
boundary is one of two kinds:
- a silhouette: the front surface ends there, over a back surface or
  paper. The front surface's outline lies on it, so (a) inks the front
  side;
- a switch: two surfaces cross in depth. (b) inks it.

Boundary pieces end only on other boundary pieces or at the picture's
edge, so their bands do too. A hidden outline (S's edge under T) is not
a boundary: the points next to it see T, and T's rules draw nothing
there.

The argument needs ~ to be transitive where a region is built, and it
is not in two places:
1. **The hook.** At a crossing cut, the arm's feet are labelled J before
   the cap and unlabelled after it. Both are similar to each other (same
   chain within σ), but only the first is similar to J's other member M.
   If the arm lies over M past the cap, its side becomes a silhouette
   over M at the cap and not before. That boundary starts in the middle
   of M's tube: a free end. This is K909's "now" look, and form A
   reproduces it.
2. **One chain at Δs ≈ σ.** Two feet of one chain that overlap (a tight
   loop or hairpin) are one surface while |Δs| ≤ σ and two beyond. Where
   |Δs| passes σ inside the overlap, a boundary starts in the middle of
   the overlap.

**How the cases come out:**
- **Crossing.** The over pass is the visible member over the whole
  overlap. Its band runs across. The under pass's band follows its full
  outline into the over pass's edge and stops there, on that band. There
  is no switch. Same as today.
- **Junction.** Every foot inside J's spans is similar, so the union
  (arm tubes over the spans, plus the fills) is one surface. Its outline
  is today's exposed outline of the cluster.
- **Cap and crossing cut.** The arm is similar across its cap (same
  chain), so no border crosses the arm. The arm's sides are exposed
  beyond the cap as today.
- **END tuck (§3.6).** The END arm's feet lie in J, and its tucked cap
  is buried in J's region, as today.
- **Corner.** The corner arcs belong to J's outline and the fill is a J
  member. Unchanged.
- **Depth switch.** New: (b) draws a centred line along the switch. It
  meets the band of the surface that goes under where the switch reaches
  that surface's silhouette, and the band of the other surface at the
  other end.
- **Cyclic triple (k42).** The z-buffer picks one visible member at each
  point. Every pair that swaps order inside the triple overlap gets a
  switch line, and the boundaries close into a partition.
- **Hook.** Form A's own outcome is "now". Candidates in this model:
  - **now:** the arm's silhouette over M starts at the cap;
  - **cap:** the arm past the cut stays similar to J while it lies
    inside M's tube, so its silhouette starts on M's border (K909's
    "cap");
  - **carry:** the arm's side counts as a boundary inside J too, from
    the junction to the cut (K909's "carry");
  - **seam:** the cap counts as a boundary where the arm lies over M: a
    line across the arm at the cut, which closes the side's band.

  This stage does not settle the choice.

### Step 2: the prototype

Behind `ink` in `src/render/field/oracle.ts`. The default (`"group"`,
today's §3.2) is unchanged, and the field tests pass (6 files, 45 tests,
5 skipped).
- `"surface"` (720b36a2, d5830291): Step 1's rule over today's
  primitives: the visible member by z, the outline of the members
  similar to it, and switch lines. `hookLook` gains `"seam"`.
- `"label"` (70b5f40c, b17dae26): the same rule in image space, with no
  outline primitives:
  - V(q), the visible member, on a cached grid of pitch g = W/4: the
    candidate foot of greatest z with d < h; ties go to the higher chain
    id, then the larger s. A fill gives its cluster's label.
  - p is ink iff a grid point q within W shows a label Q ≁ P = V(p), and
    either P's surface is absent at q (a silhouette on P's side: distance
    |p − q|) or both surfaces cover both points (a switch: distance
    2|p − q|, a centred line W/2 a side). Where P covers q but Q is
    absent at p, the silhouette is Q's, and Q's side inks it.
  - The distance is the best one less g/2. Within 1.5g of W it bisects 6
    steps toward the 4 nearest changes, with exact presence and
    similarity, so the band's edge is exact.
  - `labExact: false` ("labc") keeps the grid distance alone.
- Probes in `.claude/probes/K915/` (untracked). `lib.ts` reads `INK`,
  `LAB_EXACT`, `HOOK_LOOK` and `GROUPS` from the environment. The others
  are `indep.ts` (the free-end check), `census.ts`, `checks_ab.ts`,
  `formb.ts`, `h.ts` (sheet H), `table.py` and `left.py`.

### Step 3: the numbers

The 12 real scenes and the synthetic ones, groups k883, cr 3. "group" is
master's ink. Counts are samples in stretches.

| | group | surface | labc | label |
|---|---|---|---|---|
| Free ends, real | 228 | 227 | 104 | **100** |
| Free ends, synthetic | 4 | 2 | 1 | **1** (j_hook_cross) |
| Synthetic checks | 116/117 | 116/117 | 72/117 | **116/117** |
| Census missing, model truth | 148 in 66 | 151 in 66 | 103 in 44 * | **116 in 53** |
| Census extra, model truth | 71 in 46 | 71 in 47 | 81 in 52 * | **94 in 60** |
| Geo truth, class f (real misses) | 144 in 65 | 147 in 65 | 107 in 48 | **113 in 52** |
| #16, stretches | 31 | 31 | 15 | **14** |
| Corners, muse_hash | 341/342 | 341/342 | 341/342 | 341/342 |

\* 11 scenes: labc's census did not reach g41_user_tw64.

- The one synthetic failure under group and label is j_pair_cross #2.
  labc's grid distance also fails #5 and #9 (the band widths) on most
  synthetic scenes; the bisection fixed that.
- The label ink's one synthetic free end is the hook (j_hook_cross), as
  Step 1 predicts for its own look ("now").
- Free ends by scene, group → label: muse_hash 106 → 40, g41_def_tw64
  51 → 12, g41_user_tw64 29 → 20, def 16 → 11, muse_default_tw 6 → 2,
  g41_ring_tw64 6 → 3, g41_def_tw42 5 → 5, ring 3 → 2,
  user_tw42.lightpaper 2 → 2, g41_ring_tw42 2 → 1, g41_user_tw42
  2 → 2, fat 0 → 0.
- By K909's classes, group → label: span fill 74 → 11, group on top
  52 → 6, junction core 47 → 40, union 24 → 19, neither 18 → 13, inked
  by another group 10 → 8, under the fill 2 → 2, under chain 1 → 1.
- muse_hash's checks: #14 fails 349/350 under every ink (it tests the
  depth at the centres, not the ink). #15 passes on every scene under
  every ink. #16: muse_hash 19 → 7 stretches (23051 → 23076 of 23089
  over-side samples inked), g41_def_tw64 11 → 7, g41_ring_tw64 1 → 0.

K909's leftovers:
- **Span fill and group on top** (126 of the 228 free ends) fall to 17:
  no piece of the outline comes from a fill or a group any more.
- **#16's group on top**: 30 → 14 stretches. The buried one is gone.
- **Extra ink by mechanism** is not removed. The core/own and union/own
  seams stay (23 and 17 stretches), and the label ink adds 13 stretches
  in classes the model's truth calls hidden: core/hider 4, core/merged
  3, union/merged 3, under 2, depth/hider 1. Those are switch and
  silhouette lines that today's rule does not draw; the census's model
  truth is that rule, so whether they are right is the image check's
  call.
- **Sheet F's spur, hairlines, seam and speck**: not measured. They sit
  at cr 3, 4.5 and 6 on sheet F's crop, and this stage measured cr 3 on
  the whole scenes only.
- **S3's far pieces** (350 on 319 arms): gone by construction. The label
  ink has no per-side pieces; a band is wherever a label changes within
  W.

**Where the label ink's free ends come from.** `fe_mech.ts` looks for a
non-transitive triple (A ~ C ~ B with A ≁ B, Step 1's two places) among
the labels on a disc around each free end, and, as a control, around the
ink points 4W from it in 16 directions. `fe_mech2.ts` adds the hidden
members (every foot that covers a disc point).

| Disc | Free ends with a triple | Control ink points with one |
|---|---|---|
| R = W, visible labels | 47 of 100 (cap 46, one chain 1) | 17 of 395 |
| R = W, hidden members too | 49 of 100 (cap 48, one chain 1) | 27 of 395 |
| R = 2W, hidden members too | 53 of 100 (cap 53) | 79 of 395 |

Within W, the cap triple (a foot past its span next to J's region) sits
at half the free ends and at 7% of the nearby ink, so it is one
mechanism: Step 1's "the hook". The other half (51) have no triple
even counting hidden members, so a second mechanism exists. It is not
named yet.

### Step 4: sheet H

`H_surface_model.png` in `.claude/probes/K868/sheets/` (README line
added; `h.ts`, crops in `.claude/probes/K915/hcrops/`). Groups k883, cr
3, today's ink ("group") beside the label ink, free ends in magenta:
1. muse_hash's full frame under both.
2. The six sites at 6x, today | label: the 4-way (j7), j111, j123, j140,
   j149, crossing 292.
3. The four largest changes (`hdiffs_label.json`; all add ink: d1 122
   px, d2 117, d3 116, d4 61), today | label.
4. The hook's candidates at 6x, on j_hook_cross and crossing 292: today
   now; surface now, cap, carry, seam; label now.

What it shows:
- **Free ends close.** d1-d4: today's free ends (4, 3, 3, 2) close into
  continuous borders (1, 0, 0, 0 left). The closing lines are the span
  cuts, straight lines across an arm where its unlabelled part meets J's
  region. They read as an arm's end drawn over the junction body, but
  they are angular, with small notches where two cuts meet (d3, d4).
  At d1 the closure is a sawtooth across a crowded junction.
- **Sites.** j123 6 → 4 and j140 5 → 4 free ends: an end where a thread
  meets an over pass closes with a line across (also at crossing 292,
  5 → 4). The 4-way is unchanged (none), and j111 keeps its one free
  end, a band that stops in the middle of the junction's union.
- **New artifact.** j149 has no free ends under either ink, but the
  label ink adds a thin spur and a speck at the bottom left, where today
  draws nothing. This is the extra ink the census flags (Step 3), and
  here it reads as a defect.
- **The hook.** The label ink draws "now": j_hook_cross keeps its one
  free end. At crossing 292, j123 and j140 the arm folding back over its
  own through keeps its three free ends. The candidates are sheet G's
  (now, cap, carry, under the surface ink) plus "seam". As prototyped
  over today's primitives, seam draws a thin wedge and a dart at the cut
  on j_hook_cross, not a clean line across the arm, so it is not a
  usable candidate yet.

### Step 5: form B

Not adopted. `formb.ts` grids a scene at h/4 and takes the visible
member at each point as the oracle does. For each change of visible
member between neighbours, it asks whether a τ_z separates the changes
form A calls "same" from those it calls "apart".
- Synthetic: "same" changes always have dz = 0. A τ exists on j_cross
  (apart min 0.759) and kink (0.606). It does not on j_pair_cross,
  oblique30, k42 or j_hook_cross, whose apart min is 0. On oblique30, 24
  of the 38 apart pairs have dz ≤ 0.05.
- muse_hash: 5034 same pairs (p99 0.465, max 0.927) and 8164 apart (6719
  at crossings, 1445 on one chain; p5 0.145, min 0). No τ: at 0.05, 1170
  same pairs are inked and 265 apart pairs are missed; at 0.3, 221 and
  752.

Why: the depth tent (DEPTH_WINDOW, about 1.2 ctrl) dies out inside a
shallow crossing's overlap (2h/sin θ, about 1.6 world at 30°), so the two
passes tie at z = 0 over its outer parts. The same-surface changes with
large dz are kinks shorter than σ and junction arms at different depths.

The ties matter to form A too. In a shallow overlap its z-buffer falls to
the tie-break (the higher chain id), which shows the under pass when its
chain id is higher. Form A, the oracle and S3 need a depth that orders
the whole overlap: the crossing table's order, or a tent at least
2h/sin θ wide. The hook's fade candidate (a border that fades in with
|Δz|) inherits the same problem.

### Step 6: S3's form

Two passes, no search:
1. **Label pass.** Rasterize the tubes, fills and caps with the depth test
   into an RGBA16UI target: chain id (16 bits), s (16-bit fixed point
   over the chain's length), cluster id (16 bits) and flags. The depth
   buffer holds z ordered over every overlap (Step 5) with the tie-break
   folded in (z, then chain id, then s), so the GPU picks the oracle's
   member.
2. **Band pass.** Draw a strip W wide inside every outline piece (each
   tube edge at ±h, each fill's arcs, each cap), and a strip W wide
   centred on each switch curve, which the CPU finds where two surfaces
   swap in depth inside an overlap. A fragment fetches its own pixel's
   label (similar to the strip's member, or discard) and the label just
   across the edge (not similar, and lower or paper, or discard).

That is 2 fetches per band fragment (3 on a switch strip), and no
search.
- **Antialiasing.** Coverage comes from the strip's own distance
  coordinate, so both edges of a band are exact. Where a label change
  clips a band, the change is another surface's outline, so the clip's
  jaggies sit against that surface's band, ink on ink.
- **Precision.** Ids need 16 bits each. s only has to tell |Δs| ≤ σ
  (σ = π·h, about 1.3 world on muse_hash): 16 bits over a 300-world chain
  is 0.005. The depth needs only the order.
- **Cost, unmeasured.** On the phone W is about 3.3 device px (an
  estimate; about 20 at 6x zoom). A per-pixel search scans a disc of
  radius W: 45-69 taps at 3.3 px and about 1250 at 6x, or a constant ~69
  on a W/4 label grid. That is G3-1's class: its search (up to 64 SAMP
  points a pixel) cost +24.5 to +48 ms of render sync on the Pixel
  (K892), against a 4 ms GPU budget at dpr 2 (K868 §2 item 8). The two
  passes cost one fragment per thread pixel (plus overlap overdraw) and
  2-3 fetches per band fragment, with bands about 2W wide along the
  outline. S3's first step is a Pixel micro-benchmark of the two passes
  on muse_hash.
- **The checks.** The oracle's label ink becomes the reference image: S3
  compares its ink to it per pixel, as K892 does today. The label target
  gets its own check, a readback against the oracle's V on the same
  grid. The free-end image check stays the judge. Checks of the
  outline's pieces (S3's per-side data, the joins of spans and caps)
  have nothing left to check.

### Step 7: verdict

**Adapt.** Replace §3.2's group outline with the label rule (Step 1's
form A, as `ink: "label"` computes it), and keep today's members,
corners, depth and groups. Against master, on the 12 real scenes: free
ends 228 → 100 (span fill 74 → 11, group on top 52 → 6); synthetic
free ends 4 → 1 (the hook); checks 116/117 and corners 341/342
unchanged; #16 31 → 14 stretches; real misses 144 → 113 samples.

The adaptations:
1. **Order the depth over the whole overlap** (Step 5) before S3 builds
   the label pass. Until then, form A's z-buffer reads the tie-break in
   shallow overlaps.
2. **The remaining free ends** (100: junction core 40, union 19,
   neither 13). Half sit at a cap triple (Step 3's mechanism table:
   Step 1's "the hook", in junctions as well as at hooks); the other
   half have no named mechanism yet. See the handoff.
3. **Extra ink** rises from 71 to 94 samples under the model's truth.
   That truth is today's rule, so judge these by image (sheet H), not
   by the census. On sheet H the span cuts that close d1-d4 read as
   borders (angular, with notches), but j149 gains a spur and a speck.

For S3's brief: build the two-pass form, starting with the Pixel
micro-benchmark against the 4 ms budget. Take the depth from the
crossing table over every overlap, and the oracle's label ink as the
reference image. Keep the hook's look open (now, cap, carry, seam).

## Handoff

The stage's seven steps are done (2026-10-27, about 14:50). Nothing is
merged: the branch `k915-border-model` holds the oracle's two new inks
(default unchanged) and this brief. The probes, logs and crops are in
`.claude/probes/K915/` (untracked); sheet H is
`.claude/probes/K868/sheets/H_surface_model.png`.

Open, in the order I would take it:
1. **Depth over the whole overlap.** Order each crossing's overlap from
   the crossing table (or a tent at least 2h/sin θ wide), then rerun
   Step 3's table under `INK=label` (`indep.ts`, `census.ts`,
   `checks_ab.ts`; the commands are in each probe's header). Expect
   #14 (349/350 on muse_hash under every ink) to move, and the d1
   sawtooth (ties in a crowded junction) with it.
2. **The second free-end mechanism.** Half the label ink's 100 free
   ends have no non-transitive triple within 2W, hidden members
   included (`fe_mech2_r1.log`, `fe_mech2_r2.log`). Trace three by hand
   (j111's band end is one; the "no triple" lines in `fe_mech_r1.log`
   give the places): the labels and the presence test on both sides of
   the band, stepping past its end.
3. **The cap triple's look.** The span cuts that close free ends are
   angular and notched (sheet H d3, d4). Decide with Levi whether a cut
   across an arm is the look, and if so smooth it (a cut along the
   corner arc, not the span's straight end).
4. **j149's spur and speck**, and the 13 extra-ink stretches in classes
   the model calls hidden (Step 3): attribute each to its label pair
   before choosing a fix.
5. **Sheet F's cr 4.5 and 6 artifacts** under the label ink: not
   measured.
6. **S3**: the Pixel micro-benchmark of the two-pass form (Step 6)
   before any shader work.
7. **The hook's look** stays Levi's call: now (what the label ink
   draws), cap, carry, and seam, which needs a clean prototype first.

Pending when the stage stopped: `checks_ab.ts`'s muse_hash line under
the label ink (#2 and #11; `checks_lab.log`).
