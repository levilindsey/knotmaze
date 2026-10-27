# K868 S1b: the CPU oracle, checks and contact sheets (agent brief)

Stage S1b of K868. The design is `docs/design/K868_field_border.md`; all of
§3 is the spec you implement, and §5-§7 say what the oracle, the checks
and the sheets are. The scene format is `src/render/field/scene.ts`. This
is one stage: stop when it is done or at the cap.

## Setup

- Worktree `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k868-s1b`,
  branch `k868-s1b`. Your shell starts in the MAIN checkout, which must
  stay clean: use absolute paths and `git -C <worktree>`. node_modules is
  a junction to the main checkout's.
- Code: `src/render/field/` holds the geometry core, pure TypeScript (no
  DOM, no pixi, nothing the app imports). Tests go in `test/render/field/`;
  synthetic scenes go in `test/render/field/scenes/` as JSON fixtures, with
  their generator beside them.
- The oracle and the sheets run from a skip-gated manual vitest
  (`K868=1 npx vitest run test/render/field/oracle.manual.test.ts`, the
  pattern of `test/sweep.manual.test.ts`) or from `npx vite-node <script>`.
  Outputs go to the main checkout's
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\` (`oracle/`,
  `sheets/`; ignored by git).
- PNG: no image library is installed, and you add no dependencies. Write a
  small encoder on `node:zlib` (deflateSync plus CRC32). Compose captioned
  sheets as HTML rendered by puppeteer-core (Chrome found as
  `scripts/diag_screenshot.mjs` finds it; headless is fine for static
  pages; use a temp profile and delete it after) or by blitting.
- Real scenes come from S1a, which runs in parallel and writes to
  `.claude/probes/K868/scenes/` in the main checkout. The coordinator
  tells you when they are ready; don't wait for them.
- Never run `npm run build` in the main checkout (a test server serves its
  `dist`). Never touch processes you did not start.

## Order (commit after each)

1. The geometry core, the oracle and the synthetic scenes; sheet A with
   raw renders.
   - Core (`src/render/field/`): polyline arc length and closest point;
     local minima within reach; z lookup; union-find groups with junction
     spans (§3.4); corner eligibility, V and the G1 rolling ball on curved
     polylines (§3.7); the END extension to c′ (§3.6); caps.
   - Oracle: per pixel, supersampled: candidates, groups, the top group,
     the exact distance to its exposed outline (§3.5, §5), ink or paper;
     and the float32 distance and top-id fields.
   - Synthetic scenes (§4) at h = 1 world unit, W = 0.38h, and a camera
     that puts h near 10 CSS px at 1x, so 6x crops show line structure.
2. Checks 1-9 and 11 (§6) as code with their thresholds, run on every
   synthetic scene, with results in a JSON and markdown report and in
   sheet A's captions. Cross-check the oracle's field against a Euclidean
   distance transform of the rasterised union. Unit tests for the core.
3. Real scenes, once S1a's exports exist: oracle renders of `muse_hash`
   (full frame) and of its j123, j49 and tip crops at their exported
   cameras; sheet B (master next to the oracle) and the full frames. Run
   the image-based checks on master's screenshots too, so master's
   defects become numbers.
4. Sheet C: the r sweep {0, 0.25h, 0.5h, h, 2h} and the web-length cap
   (§3.7). And §3.8: what master draws for `cr` and `crs`
   (`src/render/ribbon/joinery.ts`, `corner_share.ts`, G3G4 §3.5), with a
   proposed mapping from cr to r.

If the real scenes are not there when you reach step 3, do step 4 first.

## Decisions you make and record

σ (§3.4), the span margin, ε, the supersampling, how a corner's opening
θ is measured on curved arms, the crop sizes, and anything in §3 you found
underspecified or wrong. Write them in the Handoff with the reason.

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop
  when steps 1-4 are done or 2 h after the start, whichever comes first.
  A compaction is not a stop: after one, re-read this brief and
  `git -C <worktree> log --oneline -10` before going on.
- Commit WIP to `k868-s1b` at every milestone, broken or not, and never
  push. Commit messages end with the two trailer lines below. Take SHAs
  from `git rev-parse HEAD` (a hook re-dates work-hours commits).
- If `src/render/field/scene.ts` needs a field, append it as optional at
  the end of its interface, with a comment.
- Never edit LEDGER.md, CLAUDE.md or `.claude/rules/`; never upload to
  Drive; add no npm dependencies.
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- When you stop, append a `## Handoff` section to this brief in the
  worktree and commit it: done, not done, the decisions above, the next
  step. Your final report carries the same, plus each sheet's path and
  what it shows, a `Ledger items` list (follow-ups, residuals, decisions
  for Levi) and the handle fields (branch, last commit, evidence, next).

Trailer:

    Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
    Claude-Session: https://claude.ai/code/session_01TnQvxftruF6gxzRe3bigQ6

## Handoff

(Written as decisions are made; the status lines are updated at each
milestone. Code: `src/render/field/geom.ts`, `src/render/field/oracle.ts`.)

### Decisions (with reasons)

- **σ = π·h** (same-chain merge distance, §3.4). A tube of half-width h
  overlaps itself only where the centreline comes back within 2h of
  itself, which needs at least a half turn of radius h, i.e. π·h of arc.
  Two candidates on one chain closer than that in s are the same piece of
  thread; farther apart they are separate passes (a kink loop's two
  passes, a hairpin's legs). The plain-member outline window is Λ = σ/2
  either side of the candidate's s.
- **Span margin = h** beyond the farthest corner foot (tangent point, or V
  when r = 0) + W. With no corner on an arm (an obtuse side, θ ≥ 180°):
  h + W + margin from the root.
- **ε = 1e-3·h** for the exposure probe (a point ε outward of an outline
  point must lie outside every other member). Inside tests are strict
  (d < h), so a point exactly on another tube's outline counts as outside.
- **Supersampling 4×4** per device pixel for ink coverage; the float32
  distance field F and the top-id field are taken at pixel centres. F is
  clamped to ±1.5h and stored in CSS px.
- **Opening θ on curved arms**: the angle between chords from the arm's
  root point to the point at arc length 2h along each arm (2h ≈ where the
  outline of a straight arm leaves the junction's disc). Tangents at the
  root are noisy on real sampled polylines; chords at 2h are not.
- **Reach** for candidates: 2h + W + 2·r_max (a fill point can be up to
  that far from the nearest arm centreline of its group).
- **Depth ties** (|Δz| ≤ 1e-6): higher chain id, then larger s.
- **END extension (§3.6)**: c′ = the nearest point to the END's terminal on
  the junction's through chains, searched within ±4h of the through arm's
  s; the junction centre if the junction has no through. z is held
  constant along the extension. The extended end gets a cap; it is always
  buried by the through (checked by check 3/6 numbers).
- **Corner solve**: V (δ = h) and q (δ = h + r) by damped 2-D Newton on
  dist(q, arm A) = dist(q, arm B) = δ, with feet found exactly on the
  polylines within ±(4h + 2·(h + r)/sin(θ/2)) of each arm root. t_A, t_B =
  q's feet moved h toward q. The fill is the curvilinear triangle V, t_A,
  t_B: r ≤ |x − q| ≤ |V − q| + h, inside the sector q→t_A..q→t_B, and on
  the wedge side of both arms.
- **Exposure is canonical per primitive**: a primitive (offset segment,
  vertex join arc, cap, corner arc) inside a junction cluster's span is
  tested against that cluster's region (arm tubes over their spans + the
  corner fills); any other primitive against its own chain within σ of it
  (self-burial at hairpins). Found by sampling every 0.02h along the
  primitive plus 40-step bisection at each transition.
- **Checks (`src/render/field/checks.ts`), thresholds**: #2 gap ≤ 0.01 px
  and tangent angle ≤ 0.5°; #3 ≤ 0.05 px (exact field), ≤ 0.5 px (image);
  #4 ≤ 0.05 px; #9 ≤ 0.25 px; #1, #5, #6, #7, #8, #11 count failures (0
  passes). Each result lists its sites and the sites it skipped, by reason.
- **#1 counts cov > 0.5 strictly** and F > W·ppu + 1 px: a pixel at exactly
  0.5 coverage is a tie on the band's inner edge and counts as paper.
- **#5 walks** go inward along the normal from −W/2 to h at every exposed
  outline sample. Skipped, by reason: out of view; `neighbour` (the deep
  end is within h of another exposed outline, so the section is thinner
  than 2h there); `outside` (the point W/2 outward is inside some region:
  another outline runs within W/2 outside this one, i.e. the other arm of
  a sharp V, a junction wedge or an over crossing; at x4_ends' 60° corner
  the walk's first run was the other arm's band); `group` (the walk
  changes group between −W/2 and its deep end).
- **EDT cross-check (check 0)**: F against a brute-force EDT of the ink
  region's boundary on a 0.02h grid, excluding a disc of radius
  max(2h, h/sin(θ/2)) + 2W around each crossing, where the top group
  changes and F measures to the other group's outline by design. Max
  |F − EDT| is about 0.1 px on every synthetic scene, half the grid step.
- **#7 does not count third-chain gaps**: an over band line that only a
  third chain on top interrupts is not broken (k42 has 3). #6 and #7 name
  the top chain at each failing site.
- **Image path**: every check except #2 and #11 also runs on an image
  (luminance to coverage, bilinear). On the oracle's own 1x renders the
  floor is about 0.1-0.3 px (#4 up to 0.11 px against 0.05, #9 walks up
  to 0.31 px against 0.25: `oracle/checks_synthetic_image1x.md`), so image
  results at 1x are measurements, not verdicts. kink's 1x image #5 (2 of
  300 walks) and #9 (1.39 px) are not analysed.
- **Crops**: 6x the scene camera. Synthetic scenes: a square of radius
  min(poi.radius, 3)·h at each POI. Real scenes: the centre 512 px square
  of S1a's zoom cameras (the POI sits at the frame centre).
- **Sheet B, muse_hash**: round corners use r = min(2h, h·max(0,
  1.25·cr·tan(θ/2) − 0.97)) (§3.8's mapping, below) under the web cap
  ℓ ≤ 1.5h. The 2h cap is there for time: reach is 2h + W + 2·r_max, and
  the uncapped r near θ = 180° made it scene-sized (1.5 ms a sample, hours
  a frame); capped, reach is 2.55 units and a sample about 0.2 ms. Full
  frame at 1 sample a pixel (81 s), crops at 2x2 (35-56 s each), model
  9 s. Checks see only x < 900 CSS px: the panel covers x ≥ 910.
- **Sheet B's overlay tile and registration**: a third tile per crop
  draws the oracle's ink in red over master's crop, and its caption
  gives the share of master's ink (luminance < 128) within 1 px at 1x
  (6 px in the crop) of the oracle's ink (cov > 0.5), and the reverse.
  It separates "the two disagree on geometry" from "they are not
  registered".
- **Sheet D (added when S1a's scenes landed, 20:57)**: one row per S1a
  scene, master's screenshot and the image checks on it with the
  oracle's geometry, with no oracle render (a full frame costs 80-90 s
  on these scenes). The light-paper scenes only: the image probe needs
  paper and ink it can tell apart, and S1a made light-paper reruns for
  this. Three of them are dsf 3 (resolution 2, upscaled by the page), so
  their values include the upscale's blur.
- **S1a's scene notes, how the oracle reads them**:
  - z: each chain's exported z is used as given (physics zPos); nothing
    builds a tent from the crossings. Checks #6 and #7 take over and
    under from the crossing records and the top from z, so where
    physics z contradicts a record they fail on the exact field. Not
    measured: the exact-field checks ran on the synthetic scenes only.
  - END terminals: §3.6's extension, as written. Each END terminal is
    extended straight to c′, the foot on the nearest through centreline
    within ±4h of the through's arm, and its cap is buried there. S1a's
    0.76h tuck therefore becomes a 0.76h segment inside the through tube
    (0.76h < h). Not compared with master.
  - Ink: sheet D's probe takes `look.ink` as given; where "#000000"
    means the automatic ink (S1a's notes), its coverage scale is off by
    that ink's luminance. Not checked against the notes.
  - Emergent crossings (`emergent?`) are read like any other crossing.

### Findings

1. **k42: a tight cyclic triple has no consistent top (real).** k42
   fails #6 (3 of 12 band ends off by more than 0.5 px, max 2.16 px) and
   #7 (3 of 6 over band lines broken); every other synthetic scene passes
   every check (`oracle/checks_synthetic.md`). Observed at crossing 0
   (chain 0 over chain 1; h = 1, W = 0.38): walking chain 1's band line
   in, chain 1 stays on top until 0.46h from chain 0's centreline (0.54h
   inside its outline), then chain 2 is on top; chain 0 never is. Along
   chain 0's band line (#7 side 1), chain 1 is on top at t ∈ [−1.6h,
   −1.2h] and there is paper under chain 1 at t ∈ [−1.1h, −0.6h].
   Inferred: the three crossings form a cyclic triple about 1.5h apart,
   so the three tubes share an area (a triangle of side 1.5h has inradius
   0.43h < h) where no single top honours all three pairwise orders, and
   the tent-summed z decides it. The design needs a rule for that area.
   (k42's z is `gen.ts`'s tent sum; S1a's scenes carry physics zPos,
   which can differ from the tent by up to 0.75, and the oracle uses it
   as given.)
2. **Sharp acute corners leave a gap of ε·cot θ (oracle tolerance).** At
   r = 0, acute30 and acute20 fail #2 by 0.0173 and 0.0275 px in the 1x
   frame. That is exactly ε·cot θ·ppu (ε = 1e-3·h, ppu 10): the exposure
   probe's ε, stretched along the arm by the acute angle. It is
   sub-pixel and not a design defect. Fix: snap exposure ends to V at
   sharp corners, or give #2 a tolerance of ε·cot θ. (The first sheet C
   also showed #5 failing there; that run predated the `outside` skip,
   and the rerun passes.)
3. **muse_hash: 59 of 342 corner solves fail** ("q solve residual") with
   the capped mapped r. Not analysed; the diagnostics are in
   `oracle/muse_hash/b.json` and the first five are on sheet B.
4. **Master on muse_hash (sheet B)**: master's full frame leaves out
   whole stretches of outline that the oracle draws. The tip crop
   registers with the oracle (#4 0.39 px, #8 passes, #1 983 px deep ink).
   The junction crops do not: j123 has 21119 px of master's ink deeper
   than W + 1 px inside the oracle's regions, and #6 finds 18 of 18 band
   ends off (max 96.7 px); j49 is similar
   (`oracle/checks_muse_hash_master.md`). The overlay tiles show which
   ink each side draws.
5. **§3.8, what master draws for cr** (sheet C's last rows; the numbers
   are a helper's reading of `joinery.ts` and `rim_curve.ts`, drawn over
   the oracle, not screenshots). Master's corner radius is effectively
   r(θ) = h·max(0, 1.25·cr·tan(θ/2) − 0.97), so h·(1.25·cr − 0.97) at
   90°. Its rim is a quadratic Bézier A–V′–B, with V′ where the 0.97h rim
   lines meet; the tips sit d = 1.25·cr·h − 0.97h·cot(θ/2) from V′, and
   the band runs 0.254h inward and 0.185h outward of the rim.
   Corrections for §3.8:
   - k_max = 1.25·cr − 0.97·cot(θ/2).
   - Master rejects corners at θ ≲ 49°.
   - The K854 comment at joinery.ts:1469-1471 is stale.
   - The sdf and strip silhouettes differ in width.

   Proposed mapping: that r, capped at 2h. Uncapped, r grows without
   bound as θ → 180° while the fill there is almost nothing.

### Status (21:00, 2026-10-26)

Done: steps 1-4. The three sheets are in the main checkout's
`.claude/probes/K868/sheets/` and render with
`K868=A|B|C npx vitest run test/render/field/oracle.manual.test.ts
--testTimeout 3600000` from the worktree. B's environment:
`K868_REAL` (muse_hash), `K868_ZOOMS` (j123,j49,tip), `K868_SS_FULL` (1),
`K868_SS_ZOOM` (2), `K868_PANEL_X` (900). After B's long synchronous
renders vitest reports an RPC timeout ("Timeout calling onTaskUpdate")
and exits 1 although the test passed; the outputs are complete.

Not done:
- image checks on S1a's other exported scenes (only muse_hash ran, for
  time; `K868_REAL=<name>` runs one);
- the root cause of the 59 failed corner solves;
- the depth rule for k42 (a decision);
- a bounded reach, so that large r costs no time (for example, per
  junction instead of 2·r_max everywhere);
- #2's tolerance at sharp acute corners.

### Next step

Levi reads sheets A-C. Decide finding 1 (the depth rule) and the §3.8
mapping and its cap, and correct §3.8 with finding 5. Then the next
stage's renderer can be measured against this oracle: render its
screenshot, then run `runChecks(model, imageProbe(...))`, and use sheet
B's layout for master against new.
