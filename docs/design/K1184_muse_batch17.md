# Muse batch 17 (K1184)

Claude starts these runs through Paseo, one run at a time, after
batch 16 (`docs/design/K1178_muse_batch16.md`, K1178) was reviewed
and closed. Each run is a fresh Muse agent that reads this brief,
does its run's tasks, and stops. Claude reviews each run on master
afterwards and closes K1184 (including resolving the K1139 agent's
then-live work, which no run here touches).

This was a drafting run (Run A,
`docs/design/K1184_muse_batch17_run_a.md`), so the batch's runs are
B to G, in that order. Claude may commission more than one at a
time; the chain tags are 17B to 17G. There are no ports or gates of
its own in Run A's brief beyond what the runs below say: batch 17
uses ports 5640-5699, one range per run.

Runs came from the candidates in Run A's order:

- (1) The "Approved, to schedule" items K22, K23, K322 and K805:
  none fits (the batch 16 reasons still hold; "Left out on purpose"
  below says why, and K144 is skipped as Run A directs).
- (2) The residuals numbered above K1178, except K1184 itself:
  K1181 and K1182 are skipped by Run A itself, K1183 fits: Run B.
- (3) "Residuals (known, not fixed)", in ledger order, starting
  after K648 (batch 16's draft took its last run there, and batch
  16 has since narrowed K648; its remaining phone measures stay in
  K648 and no run here touches them): piece (b) of K711 fits first
  (Run C), then the fire piece of K737 (Run D) and the follower
  piece of K782 (Run E). Nothing after K782 through the end of the
  section fits. With fewer than six runs fitting, the section was
  read on from its top, in ledger order, through K648 again: one
  piece of K188 fits there (Run F). That full circle is why the
  last residual read is K648, so batch 18's draft starts after
  K648, the same place this one did.
- (4) With one run still to fill, "Next, in order" from the top:
  nothing fits until K292 (its gate, K298, is Done): Run G. That
  section was read from K875 through K292; the read stops there -
  the rest of Next, from K265 on, was not read for this draft.

Two items end outright (K1183 in Run B, K292 in Run G once its
sheet is judged). Runs C, D, E and F each take one piece of a
bundled item and leave the rest; their close lines give the
item's new text in their reports, for Claude to apply
(`ledger.mjs` has no command that rewrites an item's text, so the
rewriting close says so, as the drafting brief requires).

Every task is decided by a unit test, a desktop probe, a dry run
or a measurement table below, and none needs Levi or a phone.
Runs C, D, E and F change what the game does only by removing a
wrong answer (char drawn on a gone run, a hint naming a run the
tap refuses, a follower stepping over a snare, confetti left in
the air by a restart); they gate on unit tests and counts, not a
look (batch 14's Runs C and D and batch 16's Runs F and G are the
shape). Run G changes what the player sees (the panel gains a
mark and a key) and stops at its look sheet, for Claude to judge
first.

No two runs touch one file ("How to work", rule 3). Read the
whole brief before your first command.

Claude added Run H (K1179 S1d, below, before Run B) on 2026-11-04,
after reading Run L's S1c record. It runs first and alone, as chain
run 17H, while Claude reviews runs B to G against the code; those
are queued only after that review, which records its amendments
here.

Run I (K1179 S1e, after Run H) was added the same day, after Claude
read Run H's record (7cefb993). It runs second and alone, as chain
run 17I, before runs B to G.

## How to work

Batch 16's "How to work" applies unchanged: read it in
`docs/design/K1178_muse_batch16.md` (it sends you on to batch
15's, in `docs/design/K1169_muse_batch15.md`, to the ten rules
of batch 8 in `docs/design/K1131_muse_batch8.md`, and to the
shared process in `docs/design/K1050_muse_week.md`). Read K1184
wherever it, or a page it sends you to, says K1178, K1169 or
K1131; the chain tags are 17B to 17G, and Claude may start more
than one at a time. Batch 17 uses ports 5640-5699; each run
below names its own range. After each run, update K1184's
handle (the next run in B, C, D, E, F, G order, or, after G,
that all the runs are in and Claude reviews and closes K1184).

## Run H - K1179 S1d: a round pinned at V, in closed form, offline

Read first: `docs/design/K1179_s1c.md` (all of it: Run L's record,
which this run builds on); Run L's section in
`docs/design/K1178_muse_batch16.md` (its decisions and criteria,
which stand except where this section changes them); section 7 of
`docs/design/K1179_geometry_review.md`; in
`src/render/field/form_b.ts`, `solveCorner` (the comment at about
line 870 states the rule: θ from the arms' chords at 2h, r0, the ball
grown along V's branch and stopped by the margin, steep and cap gates
over 32 nodes); and Run L's probes, `.claude/probes/K1179/s1c/`
(`lib_s1c.ts` the exact outline, `closed.ts`, `s1c_cost.ts`).

The ledger says (In progress):

> **K1179** · Thread geometry (Levi 11-04: rethink how thread bodies, junction rounds and gaps are built, maybe
> as a skin on the thread centres). Review (`docs/design/K1179_geometry_review.md`): keep threads and physics,
> one per-pixel outline rule for both looks, no simulated skin. S1, S1b, S1c: K1178 Runs I, K, L (all fail).

What Run L found (8df07b54): V is exact everywhere (max ΔV = 0 on
47,109 corners). Criterion 2 passes exactly on the exact outline, and
criterion 3 in substance. Criterion 1v fails on master's rule itself:
63 scene corners, where the margin band lets the ball finish up to
0.029h past another part of its arm (median jump 7.3°, worst 73.4° at
muse_hash j63). Master's answer at 17.8% of scene corners is its
stepped tracking, not a branch-independent rule. The cost misses by
31-78x: a median of 58 µs a corner, 69% of it the walk along the
branch.

Claude's read of that record (the rethink Run L asked for):

1. The cost is the ball's search, not its arithmetic. Any rule that
   follows the medial branch, node by node or piece pair by piece
   pair, pays Run L's cost. The budget allows about 2 µs a corner
   (0.75 ms over the 385 corners of `g41_def_tw42`), so the rule must
   be closed form at each corner, from what the frame already has.
2. The branch question goes away with the branch. V and θ are exact
   and need no tracking. A round defined from them alone is
   independent of any sheet or step size by construction.
3. Feet need no search either. For straight arms, form B's round
   touches each edge at L = r0·cot(θ/2) from V, which works out to
   (cr/3)·min(1.5h, 2h·cot(θ/2)) times the style. A round that puts
   its feet there and meets each edge with the edge's own tangent is
   G1 by construction, on straight arms and curved ones.
4. The crease is gated by what can be seen. A meet with a tangent
   jump over 1° counts in 1v only where the fill runs at least 0.5
   device px (dpr 2) past the edge it crosses; report the raw count
   beside it. Run L put all but one class-d corner under that.
5. The GPU question waits. A closed-form outline can be drawn as one
   mesh per junction on today's mesh machine, so a per-pixel distance
   field is no longer the only route. The phone check (S2) comes only
   after a rule passes here.

The rule under test, per corner form B makes (the same cyclically
adjacent arm pairs; style, cr and h as form B has them):

- V and θ exactly as `solveCorner` computes them.
- L = style·(cr/3)·min(1.5h, 2h·cot(θ/2)).
- The gates, form B's own, evaluated once at the points L from V
  along each edge instead of over 32 nodes of the branch, and not
  iterated: g = the cap gate ss(slack/0.5h) on the smaller of the two
  arms' slack, times the steep gate ss((den/den(V) − 0.3)/0.4) with
  den = 1 + n_a·n_b from the edges' normals there.
- The feet F_a and F_b at arc length L·g from V, along each arm's
  edge on the exact outline (offset segments and vertex arcs, as
  `lib_s1c.ts` traces it).
- The round: the rational quadratic from F_a to F_b whose control
  point C is where the edges' tangent lines at the feet meet, with
  weight w = cos(φ/2), φ the turn between the two tangents. On
  straight arms that is exactly form B's circle. Where the tangent
  lines do not meet on the fill side, or C lies farther than 4h from
  V, use the cubic with handles along the tangents of length
  0.55·|F_a F_b|; count those corners.
- The fill: the region bounded by the round and the two edges from
  each foot back to V.

Two variants, both measured:

- (i) the rule above;
- (ii) the rule with a margin gate: for every other piece within
  h + L (other arms' tubes, and arms a and b beyond their feet), the
  margin m is the least distance from the round's points at t = 0.25,
  0.5 and 0.75 to that piece's centreline, less h. Scale L·g by
  ss(1 + min(0, m)/0.05h), form B's margin gate, evaluated once on
  variant (i)'s round and not iterated.

Tasks, in order (Node only, through `npx.cmd vite-node`; no GPU,
browser, server or phone, so no port: runs B-G hold 5640-5699).
Write only new files under `.claude/probes/K1179/s1d/` and
`docs/design/K1179_s1d.md`. Import Run L's probes, or copy one into
`s1d/` to change it; leave its files and outputs as they are. Change
nothing in `src/` or `test/`.

1. The rule, deterministic and cold every frame: no warm start, no
   tracking, no Newton, no bisection. State the most work a corner can
   take: segments walked, pieces tested.
2. The criteria, three columns: master's form B on the exact outline
   (Run L's column, re-run, not copied), variant (i) and variant (ii),
   on Run L's inputs (the 12 scenes, every distinct frame of the 4
   recordings, the four sweeps):
   - 1v: the visible count of read item 4 and the raw count, per
     class (Run K's a-e, plus any new class, named), with Run L's 1v
     (b) and (c) clauses unchanged;
   - 2: the tangent jump and the position gap at every foot;
   - 3: as Run L measured it (edge points, round points, and the
     sweeps against form B's rates: gate699 0.1270, tee 0.1480, ring
     0.1737, the synthetic sweep 0.0508);
   - no concave turning anywhere along a round, and Run I's
     small-round clause (no round under 0.25h of its rule where the
     rule gives at least 1h, null bands listed);
   - the fallback cubic's count.
3. Agreement with form B's look, per corner: the largest distance
   between each variant's fill boundary and form B's on the exact
   outline, between the outer of the two solves' feet, in device px at
   dpr 2. Give p50, p95 and the maximum, and list every corner over
   1 device px with its θ, its arms' curvature at the feet and what
   gated it.
4. Cost, under the perf lock as Run L took it: p95 a frame at most
   0.75 ms on the desktop, cold, over every distinct frame of the 4
   recordings, counting everything a frame needs to make its rounds
   beyond the sampled centrelines it already has. Time the parts (V
   and θ, the feet, the round, the cap gate, the margin gate). Give
   the cost per corner with its p50 and p99 and the scene medians.
   Also report, not gated, what tessellating every round to 0.1
   device px chord error would add a frame.
5. SVG plots under `.claude/probes/K1179/s1d/out/`, drawn as Run L's
   (centred on the corner, 4h across, form B beside each variant):
   Run L's four sites, and per variant the worst agreement corner,
   the worst visible 1v failure and the worst criterion 3 failure.
   No pngjs.
6. Stop when the tables are done. A variant passes when 1v (visible),
   2 and 3 hold, no round turns concave and its cost is in budget;
   agreement is reported for Claude's look, not gated.

Done:

- `docs/design/K1179_s1d.md`: the rule as built, the tables per
  criterion (three columns), the agreement, the cost split, a verdict
  per variant (pass or fail, and by how much), and what comes next: on
  a pass, which variant and why; on a fail, what failed and where.
- The probe code force-added and pushed with the doc (a docs and
  probes push, so no deploy runs).
- `npm test` passes.

Report: the verdicts, the agreement, the cost, the doc's path and the
commit. Then update K1179's handle:
`ledger.mjs handle K1179 --owner "nobody since <yyyy-mm-dd hh:mm> (S1d done in Muse batch 17 run H)" --last-commit <sha8> --next "S1d done (<pass or fail per variant>); Claude reviews it and looks at the plots"`
and K1184's:
`ledger.mjs handle K1184 --last-commit <sha8> --next "Run H done; Claude reviews runs B-G and queues them"`.

## Run I - K1179 S1e: the pinned round with form B's own gate integral, offline

Read first: `docs/design/K1179_s1d.md` (all of it: Run H's record,
which this run builds on); Run H's section above (its rule, criteria
and harness, which stand except where this section changes them); in
`src/render/field/form_b.ts`, `solveCorner`'s gates: the comment at
about line 870, then from `denV` at about line 976 through the
integral that ends at about line 1075 (`marginOf`, `rbEff`, `wOf`,
with `denOf` and `slackOf` above them); and Run H's probes,
`.claude/probes/K1179/s1d/` (`lib_s1d.ts`, `walkEdge`, the harness
scripts).

The ledger says (In progress):

> **K1179** · Thread geometry (Levi 11-04: rethink how thread bodies, junction rounds and gaps are built, maybe
> as a skin on the thread centres). Review (`docs/design/K1179_geometry_review.md`): keep threads and physics,
> one per-pixel outline rule for both looks, no simulated skin. S1-S1d: K1178 Runs I, K, L, K1184 H (all fail).

What Run H found (7cefb993): V is exact (5.8e-13h), criterion 2
passes exactly and the raw 1v meets fall from 63 to 7. But the gates,
read once at the full feet, null 883 of master's 1,833 live rounds
(`muse_default_tw` j130: form B draws r ≈ 1.9h, the variants draw
none). That one choice drives the motion overs (up to 256 against
master's 25), most of the agreement gap (p50 1.57 device px) and,
with no root gate in the rule, gate699's pop (an ink step of 1.0
against 0.127). All 21 concave rounds are the 0.55 fallback cubic.
The cost is 18.8 µs a corner (median), mostly exact-edge walks built
per corner (45%) and V's window scans (25%).

Claude's read of that record:

1. The gate was the brief's error, not the pinning. Form B's round
   is r = ∫S dρ, S the running minimum of `wOf` over 32 nodes, so a
   gate that closes partway leaves a partial round. Read once at the
   full feet, the same gate leaves none. The same integral taken
   along the pinned path is form B's own gate on straight arms, by
   construction, and is continuous wherever `wOf` is.
2. All four factors, as form B has them: margin, steep, cap and root
   (S1g's band with K1163's tip scale, `rbEff`). Run H had no root
   gate, and gate699 popped.
3. The fallback must not be able to turn concave. Where the feet's
   tangent lines do not meet on the fill side within 4h of V, no
   convex G1 round exists at those feet. Use the largest node already
   evaluated at which one does.
4. Share what a frame shares. Each arm's exact edge is built once a
   frame and walked cumulatively across the nodes, and that build is
   counted once in the frame's cost.

The rule under test, per corner form B makes (the same cyclically
adjacent arm pairs; style, cr, h, θ and r0 as `solveCorner` has
them, r0 = style·(cr/3)·min(2h, 1.5h·tan(θ/2))):

- V and θ exactly as `solveCorner` computes them (any exact method:
  |ΔV| ≤ 1e-9h against the built corner's V on every corner).
- Nodes k = 0..K at r_k = k·r0/K. At each node, the edge points E_a
  and E_b sit at arc length r_k·cot(θ/2) from V along each arm's
  exact edge (Run H's walk), with the centreline feet E − h·n (n the
  edge's normal away from its own centreline). The probe point q_k
  is the mean of E_a + r_k·n_a and E_b + r_k·n_b, which on straight
  arms is form B's ball centre.
- w_k = `wOf` at node k: the margin gate with `marginOf`'s own
  definition (each arm's window outside its foot's basin, against
  dc = |q_k − that arm's centreline foot|), the steep gate (den from
  the normals at the feet, den(V) as `denV`), the cap gate
  (`slackOf`'s slack at the feet) and the root gate (each centreline
  foot's distance from its root over `rbEff`).
- S_0 = w_0 and S_k = min(S_{k−1}, w_k). Then r = Σ ½(S_{k−1} +
  S_k)·r0/K, form B's trapezoid. A node whose feet would pass an
  arm's window end ends the sum (S = 0 past it), as the branch's end
  does in form B.
- The feet at arc length r·cot(θ/2) from V, and Run H's round: the
  rational quadratic with C where the feet's tangent lines meet and
  weight cos(φ/2). Where C is not on the fill side, or is farther
  than 4h from V, use the largest node radius r_k ≤ r at which it
  is (null at k = 0). Count those corners and list their sites.
  There is no cubic fallback.
- The fill as Run H's.

Two variants, both measured: (i) K = 32 (form B's node count);
(ii) K = 8.

Tasks, in order (Node only, through `npx.cmd vite-node`; no GPU,
browser, server or phone, so no port). Write only new files under
`.claude/probes/K1179/s1e/` and `docs/design/K1179_s1e.md`. Import
Run H's or Run L's probes, or copy one into `s1e/` to change it;
leave their files and outputs as they are. Change nothing in `src/`
or `test/`.

1. The rule, deterministic and cold every frame: no warm start, no
   tracking, no Newton, no bisection. State the most work a corner
   can take.
2. The criteria, three columns: master's form B on the exact outline
   (Run H's column, re-run, not copied), variant (i) and variant
   (ii), on Run H's inputs (the 12 scenes, every distinct frame of
   the 4 recordings, the four sweeps): 1v, visible and raw, per
   class, with Run H's clauses; 2; 3, the recordings and the sweeps
   against form B's rates; no concave turning anywhere along a
   round; the small-round clause with its null bands; and the
   node-fallback count.
3. Agreement with form B's look, now gated: over the 12 scenes and
   over the recordings, p95 ≤ 1 device px at dpr 2, measured as Run H
   measured it. Corners where master itself fails 1v are reported
   apart and left out of the gate. Give p50, p95 and the maximum,
   and list every corner over 2 device px with its θ, its arms'
   curvature at the feet and the factor whose running minimum set S.
4. Cost, under the perf lock as Run H took it: p95 a frame at most
   0.75 ms on the desktop, cold, over every distinct frame of the 4
   recordings, counting everything beyond the sampled centrelines.
   Time the parts: the edges' build, V and θ, the nodes (feet, then
   each gate factor apart), and the round. Give the cost per corner
   with its p50 and p99 and the scene medians. Also give, not gated,
   the p95 a frame without the margin gate.
5. SVG plots under `.claude/probes/K1179/s1e/out/`, drawn as Run H's:
   Run H's sites (`muse_default_tw` j130, `muse_hash` j49, `muse_flow`
   R|18|2-0, the gate699 corner at its pop), and per variant the
   worst agreement corner, the worst visible 1v failure and the worst
   criterion 3 failure. No pngjs.
6. Stop when the tables are done. A variant passes when 1v (visible),
   2, 3, no concave turning, agreement and cost all hold.

Done:

- `docs/design/K1179_s1e.md`: the rule as built, the tables per
  criterion (three columns), the agreement, the cost split, a verdict
  per variant (pass or fail, and by how much), and what comes next:
  on a pass, which variant and why; on a fail, what failed and where,
  and for cost, which parts would have to shrink, and by how much,
  to meet 0.75 ms.
- The probe code force-added and pushed with the doc (a docs and
  probes push, so no deploy runs).
- `npm test` passes.

Report: the verdicts, the agreement, the cost, the doc's path and the
commit. Then update K1179's handle:
`ledger.mjs handle K1179 --owner "nobody since <yyyy-mm-dd hh:mm> (S1e done in Muse batch 17 run I)" --last-commit <sha8> --next "S1e done (<pass or fail per variant>); Claude reviews it and looks at the plots"`
and K1184's:
`ledger.mjs handle K1184 --last-commit <sha8> --next "Run I done; Claude applies the review of runs B-G and queues them"`.

## Run B - K1183: the field's own rules file

**Chain tag:** 17B · **Suggested ports:** 5640-5649 (this run
starts no server; the range is unused).

### Read first

- `docs/lore_index.md` (the index the new row joins) and
  `scripts/lore_index_check.mjs` (its dry-run check).
- `.claude/rules/render.md` (its topic list at the end) and one
  narrow topic file as the form to follow:
  `.claude/rules/render-routes.md` (title and `paths:` style).
- Batch 16's Run D in `docs/design/K1178_muse_batch16.md`
  (K999): the standing way to change rules coverage and prove it
  with a census script plus the index check.
- The design docs the field's lore lives in today:
  `docs/design/K868_field_border.md` (the scene format and the
  border), `docs/design/K1040_junction_field.md` (form B), and
  the parts of `docs/design/K1179_geometry_review.md` that state
  what form B does today - read as reviewer notes to respect,
  not as settled grammar (task 2).
- The headers of `src/render/field/scene.ts`, `form_b.ts`,
  `oracle.ts`, `checks.ts` and `label_b_pass.ts` (read for this
  draft), then the remaining headers under `src/render/field/`
  (read-only; task 4 forbids edits there).

### What is there today

> **K1183** · No `.claude/rules/` file covers `src/render/field/`
> (form B and the field scene's lore lives only in design docs):
> write `render-field.md` with narrow paths and add the
> lore-index row.

Nothing in `docs/lore_index.md` covers the field today: the
render area pairs `src/render/**` with `render.md` and its topic
files, so a session opening a file in `src/render/field/` gets
the general rendering lore, not the field's own grammar. The
grammar lives only in design docs, handoffs and code headers:
the scene format is version 1 and a required-field change bumps
`SCENE_VERSION` (scene.ts's header); form B is a pure function
of the frame, evaluated in float64 on the CPU, and nothing in
the app imports it (form_b.ts's header); the oracle owns its
exposed outline with exact distances and shares no code with
the app's renderer (oracle.ts's header); the checks are pure
TS over that geometry (checks.ts's header); the label pass
draws form B's top surface with its own targets and modes
(label_b_pass.ts's header). The directory holds 17 sources.
Claude's K1040 label work and the
K1179 geometry review are live around this code; this run
writes about the built code only and settles nothing either of
them leaves open.

### Tasks

**Exception (`.claude/rules/`):** this run creates
`.claude/rules/render-field.md`, adds its row to
`docs/lore_index.md`, and adds one line naming it to
`render.md`'s topic list. Nothing else under `.claude/rules/`,
and no CLAUDE.md, is edited.

1. **Before census.** A plain `node` census in a new
   `.claude/probes/K1183/census.mjs` (`git add -f`): walk
   `src/render/field/` and `test/render/field/`, and report
   which rules files attach to each file (today: `render.md`
   only, via `src/render/**`) plus the count of files the field
   topic file attaches to (today 0). Run it on the unmodified
   tree; its whole output goes in the report.
2. **Write the file.** Create `.claude/rules/render-field.md`
   with narrow paths `src/render/field/**` and
   `test/render/field/**`, distilling only binding rules for
   the built code, each with its design-doc or code source:
   the scene format and its version rule, form B as a pure
   float64 function of the frame that nothing in the app
   imports, the oracle's exposed outline and checks, the
   label pass's modes and targets, and where the field's
   scenes and gates come from. If a claim has no source in
   the docs or headers, leave it out and name it in the
   report as unwritten.
3. **Register it.** Add the `render-field.md` row to
   `docs/lore_index.md` beside the other render topic rows,
   and name it in `render.md`'s topic list.
4. **After census + check.** The census again: every field
   file now attaches `render-field.md` alongside `render.md`
   (the general file keeps attaching, as it does for every
   render topic file), the new file attaches nothing outside
   its two paths, and `node scripts/lore_index_check.mjs`
   exits 0. Edit nothing in `src/render/field/`,
   `test/render/field/` or `.claude/probes/K1040/`.
5. `npm test`.

### Done and close

**Done when:**

- `render-field.md` exists, its paths attach only over
  `src/render/field/**` and `test/render/field/**`, and the
  report traces every claim in it to a design doc or code
  header.
- The after census shows the field files covered by the new
  file (before 0), it attaches nothing outside its two
  paths, and `node scripts/lore_index_check.mjs` exits 0.
- `npm test` passes.

**Close lines:**

Claude to mark the item done:

`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs done K1183 --commit <sha8> --what ".claude/rules/render-field.md covers src/render/field/ and test/render/field/ with narrow paths, distilling only the binding form B and field-scene grammar from the design docs and code headers; no open K1179 question settled"`

After the run, update K1184's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1184 --last-commit <sha8> --next "Run B done; Claude reviews it"`

## Run C - K711 piece (b): a gone run stops drawing burnt

**Chain tag:** 17C · **Suggested ports:** 5650-5659 (Node tests
only; unused otherwise).

### Read first

- `docs/design/K137_s3a.md`'s Residuals (the item's source,
  piece 4 on its list) and batch 14's Run D in
  `docs/design/K1161_muse_batch14.md` (the same item's piece
  (c), the pattern for the optional-predicate fix and its
  source-scan pin).
- `src/game/fire.ts` (read for this draft): `runBurnAt`'s
  header ("the one fire-to-run read") and its body - it reads
  `fire.dist` alone and knows no broken set; `fireTrapped` and
  `safeArms` take the optional `broken` predicate batch 14
  added.
- `src/render/fabric_maze_renderer.ts`'s `drawFire` burnt-spans
  loop (read for this draft): every edge's `runBurnAt` answer
  is drawn, burnt as a whole span, burning as a span from the
  burnt end; nothing skips a gone run there. The same file's
  smolder loop reads the controller's `choices()` (broken runs
  already excluded there), and its pulse gate is blocked for
  broken runs through `pulseTree`'s `blocked` argument.
- `test/game/fire.test.ts` (read for this draft): its
  `runBurnAt` cases are the answers the fix must keep giving.

### What is there today

> **K711** · K137-b edges (K137_s3a.md Residuals b, d-f):
> runBurnAt may draw a burnt broken run as burning; refire is
> O(V^2) per breaking move; __knotChaseTap ignores broken runs;
> broken-run counts need main.ts to report every accepted run
> (safeArms and fireTrapped count broken arms gone since
> c7e6329a)

When a breaking move lands, the controller refires the maze
(`fireArrive` in `fabric_controller.ts`): distances reached
before the break are kept. The broken run's endpoints may both
have been reached, so `runBurnAt` keeps answering "burning",
then "burnt", for a run that is gone - and `drawFire` draws it.
The game's own readers never see this: `choices()`, `goodArm()`
and `shortestRoute()` exclude broken runs before asking. The
renderer is the one reader that asks about every run. Only
this piece of K711 is taken; refire's cost, the chase tap's
miss and the accepted-run counts stay with the item.

### Tasks

1. **Before table (pure, unmodified source).** In
   `test/game/fire.test.ts`'s fixture style (`RUNS`: S-A 2,
   A-B 1, a second A-B 1, B-C 4, A-X 4; fire rate 0.5, hold
   0), write the case first and record today's answers: for
   one mid-graph run (not the S-A run), the clocks where
   `runBurnAt` reads "burning" and where it reads "burnt".
   Those two states, at named clocks, are the before table;
   state them in the report.
2. **Fix (pure).** Extend `runBurnAt` with the trailing
   optional `broken` predicate `safeArms` already uses: a run
   the predicate names answers unburnt at every clock.
   Signature order and naming follow `fireTrapped`'s; callers
   that pass no predicate get today's answers, exactly.
3. **Fix (renderer half).** In `drawFire`'s burnt-spans loop
   (and its smolder loop, which reads the same states), pass
   the controller's `broken`: `runBurnAt(..., (e) =>
   controller.broken(e))` in the file's own style. Audit
   every other `runBurnAt` call site (`fabric_controller.ts`'s
   three, `drawFire`'s pulse gate included) and list in the
   report which now pass the predicate and which already
   exclude broken runs before asking; leave the excluding
   sites untouched.
4. **Pin the wiring.** In `test/game/fire.test.ts`, in the
   panel_rect manner (read the file, assert the call): the
   burnt-spans loop passes the controller's broken predicate
   to `runBurnAt`.
5. `npm test`.

### Done and close

**Done when:**

- The run named broken reads unburnt at the clocks where the
  before table reads "burning" and "burnt"; with no predicate
  named, every `runBurnAt` case in its test file reads as
  today.
- Fire's own cases in `test/game/fire.test.ts` pass, as does
  its source pin for the renderer.
- `npm test` passes.

**Close lines:**

This close rewrites K711's text (`ledger.mjs` has no command
for it): the report must give it, with the new first clause -
"runBurnAt reads a broken run unburnt since <sha8> (the (b)
piece)" - and the (d), (e) and (f) leftovers kept, for Claude
to apply by hand. Then:

After the run, update K1184's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1184 --last-commit <sha8> --next "Run C done; Claude reviews it"`

## Run D - K737's fire piece: hints stop naming a refused arm

**Chain tag:** 17D · **Suggested ports:** 5660-5669 (Node tests
only; unused otherwise).

### Read first

- `docs/design/K137_s2.md`'s Handoff, "Residuals" (the item's
  source; the aids' own words) and its design section 4 (the
  decided calls: hints point to the exit ignoring the minotaur).
- `src/game/hints.ts` (read for this draft): its header carries
  that call - the aids ignore the minotaur and the fire.
- `src/game/fabric_controller.ts`'s `goodArm()` and
  `shortestRoute()` (read for this draft): both build the same
  `live` set (never broken, cut or burnt) and walk it with
  `nextGoodArm`. `smoldering()` asks `armSafe` whether a tap
  from the head would be refused as "smolder". `hintRoute()`
  draws `shortestRoute()`'s first runs.
- `test/game/hints.test.ts` (read for this draft) and
  `test/game/fire.test.ts`'s `graph()` helper (the hand-graph
  shape to copy into the hints test, not to edit here - Run C
  touches that file).

### What is there today

> **K737** · K137 s2 (K137_s2.md Handoff): with fragile runs or
> collapse the spool can leave no legal move at its limit
> (Undo or restart gets out); a lit hint hides the minotaur
> warning up to 2 s; the path-display row does nothing under
> the spool; hints and the compass ignore the fire; a catch
> restart keeps hints used and chalk; the aids are off in
> walker modes; saved attempts keep no chalk or hints used
> (store version); the compass shares the hint mint

The fire clause, in the handoff's words: "`goodArm` ignores
the fire, so a hint or the compass can name a smoldering arm
the tap then refuses." Today `goodArm`'s `live` excludes a
run whose burnt state reads "burnt", but not one still
burning whose tap would arrive too late (`smoldering`); the
refused tap answers "smolder" and the player keeps their
place, having spent attention on the aid. The no-fire answers
are pinned (the shortest route out, the backtrack refusal,
the wrong-end tests in its own test file). Only this piece
of K737 is taken: the spool's dead end, the warning's slot,
the display row, the restart's kept hints, the walker modes,
the saved attempts and the shared mint all stay with the item.

### Tasks

1. **Before table (pure, unmodified source).** A hand graph
   in `test/game/hints.test.ts` (copy `fire.test.ts`'s
   `graph()` helper shape; lengths on the runs): S-H 2,
   H-A 1, A-X 1, H-B 4, B-X 4, S-A 1, fire rate 0.5, hold 0.
   The player taps S-H and stands at H. Record today's
   answers: `goodArm()` names the H-A run, `tapEdge` on it
   answers "smolder", and `shortestRoute()` starts on it.
   (Check the arithmetic when writing it: the fire reaches A
   at 2 through S-A, H at 4, B at 12, so H-A is smoldering
   from H at clock 2, while H-B arrives at 6, well inside 12.)
2. **Fix.** In `goodArm()` and `shortestRoute()`, extend the
   shared `live` meaning by the fire: when a fire is on, a
   run that is smoldering from the current head (the
   `smoldering(eid)` read, the tap's own test) is not live.
   That is the whole fix: the distances are recomputed
   without such runs, so the route the aids name is one the
   first tap will take. A state with no fire-safe first run
   left names no arm (`goodArm` -1, its contract's "no route
   left"), and `shortestRoute()` returns nothing. The rule
   path (`ruleGoodArm`) is untouched - rules with fire is a
   separate question, left with the item - as are the
   minotaur and spool behaviours (deliberate, by the design).
3. **Tests.** In the same hand graph after the fix:
   `goodArm()` names the H-B run, its tap advances,
   `shortestRoute()` starts on it, and the hint's first drawn
   span sits on it (`hintRoute()`). A state where every arm
   from the head is smoldering names -1. No-fire cases in the
   file read exactly as today, and fire's optimal-route case
   in its own file still escapes.
4. `npm test`.

### Done and close

**Done when:**

- With the fire on, the aids never name a run whose tap
  answers "smolder" while a fire-safe route to the exit
  exists, and name nothing when none does.
- No-fire answers in `test/game/hints.test.ts` unchanged;
  the new smolder cases land as above.
- `npm test` passes.

**Close lines:**

This close rewrites K737's text: the report must give it
with the piece recorded ("hints and the compass no longer
name a run the fire refuses, since <sha8>") and the spool
itself, the warning's slot, the display row, the restart's
kept hints, the walker modes, the saved attempts and the
shared mint kept, for Claude to apply by hand. Then:

After the run, update K1184's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1184 --last-commit <sha8> --next "Run D done; Claude reviews it"`

## Run E - K782's follower piece: the first step checks the snare

**Chain tag:** 17E · **Suggested ports:** 5670-5679 (Node tests
only; unused otherwise).

### Read first

- `docs/design/K137_s4.md`'s Handoff, "Residuals" (the item's
  source) and its snare design sections (a sprung snare stops
  a monster at the run's nearer end, holds both clocks'
  monsters, and holds `m.holder`).
- `src/game/snares.ts` (read for this draft): the snare's
  states and its hold (`SNARE_HOLD`).
- `src/game/minotaur_turns.ts`: the extras' turn loop (search
  `extrasTurn`, read for this draft) - the awake extras are
  cut by `cutAtSnare` / `cutAtMud`, but a waiting follower
  becoming awake takes `followStep` with no check - and
  `followStep` and `cutAtSnare` themselves (read for this
  draft): a cut puts the monster back in its pre-step state,
  and the awake branch saves and restores the follower's
  trail cursor (`x.at`) around the step.
- `test/game/snares.test.ts` (read for this draft: the line
  graph and `play` helper, the sleeping-minotaur pattern from
  `test/game/monsters.test.ts`'s follower cases - read only,
  Run E does not edit it).

### What is there today

> **K782** · K137 s4 lure and snare residuals
> (docs/design/K137_s4.md Handoff): the Snared toast fires
> before the monster reaches the snare; an armed tool lights
> any run on hover; a live switch to travel by length keeps
> snares that never spring, rings drawn; the follower first
> step skips the snare check; under length a lure clears one
> hop late (read, untested); untested under clk=beat; the
> ring is a stand-in for a glyph

A snare stops a stepping monster unless it is asleep,
waiting, or already holding - decided in the extras' turn
loop. An awake extra stepping onto a snare is cut back to
its pre-step state, its trail cursor restored, so it
retries the step after the hold. A waiting
follower's first appearance is the one step with no cut: it
is moved by `followStep` straight onto - and past - the
snare it should have sprung. It is the only monster step
that skips the check, and the only piece of K782 taken here:
the toast's timing, the hover light, the by-length keeps,
the late lure, the untested beat clock and the ring glyph
all stay with the item.

### Tasks

1. **Before case (pure, unmodified source).** In
   `test/game/snares.test.ts`'s line graph (S-A-B-C-D-X,
   each run 2), with the minotaur asleep (`sleep: 100`),
   `setMonsters` a follower homed at A (choose the seed whose
   follower delay is 1, as `monsters.test.ts`'s follower
   cases do), play S-A, A-B (the follower sets off), lay the
   snare on A-B at B, then play B-C: the follower appears and
   steps A-B onto the snare. Record today's answer: it lands
   at B, the snare still set (unsprung), its phase awake.
2. **Fix.** In the waiting-to-awake branch of the extras'
   turn loop, run the same machinery the awake branch runs:
   save the trail cursor, `followStep`, then `cutAtSnare`;
   on a cut, spring the snare and restore the follower's
   pre-step state, exactly as the awake branch does. A mud
   cut on that step is the same shape;
   take it or leave it read this way - say which, in the
   report, so the item's new text can say so.
3. **Tests.** After the fix: the follower is held at A, the
   snare reads holding with it as holder, it stands at A
   through the hold turns, and it walks on along the trail
   when the hold ends. Existing snare and monster suites
   pass unchanged: a sleeping minotaur's cut, the primary's
   cut, and the extras' replay (`replayTurnMinotaur`) all
   read as today.
4. `npm test`.

### Done and close

**Done when:**

- The follower's first step onto a set snare springs it and
  holds the follower at the step's start, for the same hold
  an awake step gets.
- Every other cut in `test/game/snares.test.ts` and
  `test/game/monsters.test.ts` reads as today.
- `npm test` passes.

**Close lines:**

This close rewrites K782's text: the report must give it
with the piece recorded ("the follower's first step is
snare-checked since <sha8>") and the toast's timing, the
hover light, the by-length keeps, the late lure, the
untested beat clock and the ring glyph kept, for Claude to
apply by hand. Then:

After the run, update K1184's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1184 --last-commit <sha8> --next "Run E done; Claude reviews it"`

## Run F - K188's first piece: a restart drops the confetti

**Chain tag:** 17F · **Suggested ports:** 5680-5689.

### Read first

- `.claude/rules/render-confetti.md` (the confetti's lore).
- `src/render/confetti.ts` (read for this draft):
  `ConfettiLayer.clear()` already drops every piece and syncs
  all four containers to 0, and `src/render/confetti_model.ts`'s
  sim `clear()` resets each pool's alive count.
- `src/main.ts`'s `restartSolve` (read for this draft): it
  rebuilds the controller and the chase and hides the banners,
  and never touches the confetti. The panel already clears the
  confetti when its amount is set to 0
  (`panel_wiring.ts`'s `onConfettiChange`).
- `src/app/probe_hooks.ts`'s confetti hooks (read for this
  draft): `__knotConfetti()` (alive counts per pool) and
  `__knotConfettiBurst()` (a finish's burst on demand).
- `.claude/probes/K657/banner.mjs` (the standing way to finish
  seed 7 with `__knotTurnMove` and read `#maze-banner`; rule
  11: the new probe's stand copies its source).

### What is there today

> **K188** · K140's residuals (`docs/design/K140.md`, "Stage 1
> handoff"): `restartSolve()` leaves pieces in the air; the
> open desktop panel covers the spray when the exit is at the
> lower right; the rain takes 5.5-6.2 s to fall out, longer
> below 10 fps.

A win throws the confetti; its rain alone lives 5.5-6.2 s.
Restarting the solve in that window (the banner's button, a
catch's carry restart, a clock change) starts a fresh maze
under the old celebration, which keeps falling over a solve
it does not belong to. The layer can already drop everything
- a scene rebuild and the amount setting at 0 both call it -
the restart path is the one caller that does not. Only this
piece is taken: the panel covering the lower-right spray and
the rain's fall time stay with the item.

### Tasks

Use ports 5680-5689.

1. **Before table (headed probe, unmodified tree).** A new
   `.claude/probes/K188/restart.mjs` (`git add -f`), copying
   K657's banner probe's stand under rule 11 (base URL and
   output name change; the private vite cache and Chrome
   profile die with the run): finish seed 7, wait two frames,
   record `__knotConfetti()`'s alive counts, click
   `#maze-banner`'s primary button (the restart), wait two
   frames, record the counts again. Today: pieces are still
   alive and falling after the restart.
2. **Fix.** In `src/main.ts`'s `restartSolve`, drop the
   pieces with the banners: call the confetti's `clear()` as
   the restart begins, so both the plain and carry paths
   start clean. No other caller changes; a later win must
   throw again.
3. **After table + pin.** The probe again: within two frames
   of the restart every pool reads 0 and `active` reads
   false, and finishing the new solve throws again (bursts
   goes up). A wiring pin in a new
   `test/app/restart_confetti.test.ts`, in the panel_rect
   manner (read `src/main.ts`, assert `restartSolve` clears
   the confetti), so the call cannot quietly fall out.
4. `npm test`.

### Done and close

**Done when:**

- After a restart, no confetti piece survives a frame; a
  later win throws as today.
- The before/after probe tables show it (alive after a win,
  0 after the restart) and `npm test` passes.

**Close lines:**

This close rewrites K188's text: the report must give it
with the piece recorded ("a solve restart drops the pieces
since <sha8>") and the covered spray and the rain's fall
time kept, for Claude to apply by hand. Then:

After the run, update K1184's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1184 --last-commit <sha8> --next "Run F done; Claude reviews it"`

## Run G - K292: dog-ears on the panel's design rows

**Chain tag:** 17G · **Suggested ports:** 5690-5699.

This run changes what the player sees and stops at its look
sheet: build the marks, prove them by counts and a sheet,
and stop - Claude judges the sheet first (Run A's rule for
player-visible work; batch 16's Run B is the shape). It does
not call the look settled and does not ask Levi anything.

### Read first

- `docs/design/K339_panel_audit.md`, sections 6 and 7 (read
  for this draft: Levi chose a dog-ear over a separate
  section, and `DAILY_EXEMPT_KEYS` is the personal set).
- `src/ui/daily_link.ts` (read for this draft): it owns
  `DAILY_EXEMPT_KEYS` and the design comparison
  (`matchesDesign` walks every param but the exempt ones) -
  a row is a design row when its key is a param and not
  exempt. K57's late review of the exempt list moves the
  marks automatically if it moves the list.
- `src/ui/tweakpane_panel.ts` (searched for this draft): the
  `.kp-row` styling block, where `kp-mod` already recolors a
  changed row's label, and where rows gain their classes.
- `test/ui/panel_rows.test.ts` (read for this draft): the
  source-scan inventory - every param has a panel row or a
  stated reason it has none (the census's expectation needs
  that list) - and `test/ui/daily_link.test.ts` (the design
  comparison's test home).
- `.claude/rules/gameplay-panel.md` (what the panel may and
  may not do to a row).

### What is there today

> **K292** · Mark the panel's maze rows with a subtle
> top-right dog-ear triangle (Levi 10-14), a key at the
> panel's top; personal settings (`DAILY_EXEMPT_KEYS`,
> localStorage prefs) unmarked; sheet for Levi first. After
> K298; replaces K84's section; K57 settles edge cases;
> leads to K297.

The gate has landed: K298 is Done. The panel has no way to
tell, looking at a row, whether it belongs to the design (it
rides in the link and the daily's design) or to the player
alone (a playback preference, kept per browser). Rows are
already classed per row (`kp-row`, with `kp-mod` when
changed), in one styling block; what is missing is the class
and the mark. The key line at the panel's top names what the
mark means; nothing else in the panel changes (no row moves,
no label changes, no value changes - `gameplay-panel.md`'s
rules stand).

### Tasks

Use ports 5690-5699.

1. **Before table (pure counts).** From the tables alone
   (Node, unmodified tree): the params (`PARAM_DEFAULTS`'
   keys), minus `DAILY_EXEMPT_KEYS`, are the rows to mark;
   list both sets' counts and the exempt keys in the report.
   That list is the expectation the DOM census below must
   match, less the params `panel_rows.test.ts` says have
   no row (they cannot carry a mark; name them too).
2. **The mark (pure).** A helper in `src/ui/daily_link.ts`,
   beside the exempt set it reads (a name in that file's
   style, e.g. `isDesignParam`): a key that is a param and
   not exempt. Tests in `test/ui/daily_link.test.ts`: a
   design key marks, an exempt key does not, a non-param
   key does not (one of each, named), and the marked set
   over all param keys equals task 1's table.
3. **The mark (panel).** In `tweakpane_panel.ts`, rows for a
   design key gain a class from that helper next to where
   `kp-row` is added, and the styling block gains a subtle
   top-right triangle on that class (CSS only, theme-neutral
   - no new colour). Add the key line at the panel's top,
   beside the version line: words to the effect of "the
   corner mark: this setting is in the link". Touch no row's
   label, value, place or fold.
4. **After census + sheet (desktop probe).** A new
   `.claude/probes/K292/dogear.mjs` (`git add -f`): open the
   panel at desktop width, count `.kp-design` rows in the
   DOM against task 1's set (open the folders - a hidden row
   is still in the DOM; if a row is not built until its
   folder opens, say so and open them), and shoot the panel:
   the top with its key, one folder where marked and
   unmarked rows sit side by side, full height and a crop,
   at desktop and phone widths (for scaling only; no phone
   is used). Save under `.claude/probes/K292/sheet/`. Stop
   at the sheet - the report carries the census and the
   sheet, and Claude judges.
5. `npm test`. The probe and the sheet ride with the work
   commit (the probe folder via `git add -f`).

### Done and close

**Done when:**

- Marked rows in the DOM are exactly the params minus
  `DAILY_EXEMPT_KEYS` that have rows; personal rows carry no
  mark; the helper's marked set over all param keys equals
  the counted table.
- The sheet exists under `.claude/probes/K292/sheet/` with
  a full panel and a crop.
- `npm test` passes.

**Close lines:**

Claude to mark the item done once the sheet is judged:

`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs done K292 --commit <sha8> --what "panel design rows carry a top-right dog-ear (params minus DAILY_EXEMPT_KEYS, derived from the lists so K57's review moves them), key line at the panel top; look sheet at .claude/probes/K292/sheet/ judged by Claude <date>"`

After the run, update K1184's handle:
`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs handle K1184 --last-commit <sha8> --next "Run G done; Claude reviews the batch and closes K1184"`

## Left out on purpose

Drafting order, with what was read and skipped. Runs B to G
above are the fits; everything named here was read and left.

**Step (1), Approved (K144 skipped by Run A, not read as a
candidate; it waits on Levi and Claude's brief):**

- K22, K23, K322 and K805 - batch 16's reasons, rechecked
  against today's ledger, still hold: K22 follows the G3
  design (K8), whose G3-3 still waits on Levi's phone look;
  K23 is the GPU thread renderer, its render-to-own-texture
  swap and GPU particles, still outside every lane batch 17
  may use (and `src/render/ribbon/` is Claude's K1139 lane
  this batch besides); K322 is commissioning, Levi's budget
  and taste, nothing a check decides; K805's gates have not
  landed (K797's stage d is still in Next, K1149 still not
  built), so there is still nothing to schedule.

**Step (2), residuals numbered above K1178 (K1179 is In
progress, not a candidate here; K1183 is Run B):**

- K1181 (`laptop-windows` in this checkout is an unregistered
  worktree) - skipped by Run A itself (the laptop's own
  checkout), not read further.
- K1182 (S1c's fill can rim one chain's samples with another's
  depth) - skipped by Run A with the K1179 geometry review;
  its file, `src/render/ribbon/rim_curve.ts`, is in the
  `src/render/ribbon/` lane no run may touch this batch
  besides.

**Step (3), Residuals in ledger order after K648 (K652 on;
the taken pieces are inside K711 (b), K737's fire clause and
K782's follower clause; their other pieces stay with those
items as their new texts say):**

- The field, junction and oracle lane (Claude's; Run A bars
  `src/render/field/` and `.claude/probes/K1040/`, and the
  K1179 review owns the geometry): K871, K872, K884, K898,
  K899, K911, K985, K993, K1008,
  K1024, K1032, K1037, K1041, K1042, K1043, K1093, K1103,
  K1105, K1117, K1122, K1151, K719 (a junction record's glyph
  row), K734 (a junction fork's hairline), K1123 (appends in
  the K1040 probe tree), and at the section's end K1165
  and K1174 (the K1040 tree itself; Run A's lane).
- The cursive: K677, K885, K903, K913, K927 (the glyph taper
  included), K986, K989, K1014, K1035, K1036, K1044, K1090,
  K1116, K1120, K1121, K1144. (K1021's measures are reported;
  nothing is left to do there.)
- Physics and the sim: K673 (the awake knot's frame cost -
  K611's question, renderer work besides), K908
  (probe control, worker frames, the K576 lane).
- Phone-bound, iOS-bound or sitting on a device: K723's sword
  half, K732 (iOS-unique now), K750, K751, K894, K897, K920,
  K1128 (its desktop page is Claude's lane besides).
- Levi's calls, looks and balance: K659 (star thresholds -
  the sim kit below is stale besides), K668 (a new stalk
  state), K669 (routing balance), K683 (collapse copy),
  K689, K691 and K692 (glyph root looks), K699 (which visibility rule -
  the two rules stand as written until Levi unifies them),
  K712 (default lives when switched on - a panel row call),
  K760 (band contrast on the phone), K770 and K771 (awake
  sizes and indicators - looks and new state), K772 (catch
  semantics, Levi's K768), K888 (rule colors by eye), K1095
  (the layout call is Levi's, as its own text says).
- The GPU and shader lanes: K678 (the cover strip's fallback;
  its file is in `src/render/ribbon/`, this batch's forbidden
  folder, and no A/B scene reaches the case besides), K700
  (the census's GPU gaps - the tap is a renderer read),
  K781 (chevron draw calls - pooling is a look-adjacent
  renderer change with no timed gate), K1133 (the burn
  fillet's rebuilds; `joinery.ts` is in the same folder).
- The thread-reveal lane (K268 is In progress; its next stage
  is Levi's phone proof): K652 (the telegraph over hidden
  runs), K663 (the reveal's leftovers, K525's predicate
  included).
- Untracked probe and sim kits (this machine's `.claude/probes/`
  only, nothing tracked to test or commit; batch 16's Run E
  exception was for a dev server every probe starts, which
  these are not): K660 and K670 (the stale sim kit and the
  wrong page label), K714 (the balance walker's cutter),
  K791 (a census slice on an unmerged branch).
- Page checks and the standing Claude page lane: K679 (the
  K653 fix verified, no code defect to fix), K723's page half,
  K744 (page gaps under rule colors; its webs are the
  junction fans' besides), K803 (K748's lane; the exception
  is not a residual run's shape).
- Bundles not split, and splits whose other pieces need a
  call this brief may not make: K729 (three sim models, no
  one Done check), K737's remaining pieces (the spool's dead
  end and the saved attempts want calls; Run D takes only the
  fire clause), K769 (by-length steps, a balance call
  besides), K773 (probe hooks for one queue's worlds), K782's
  remaining pieces (Run E takes only the follower's step),
  K711's (d), (e) and (f) (a perf ceiling with no gate, a
  probe hook, a reporting contract - Run C takes only (b)).
- Design first, or a research programme with no one-run Done
  check: K665 (a fog measure whose cause is untested -
  a measure in search of a defect), K682 (a bound to prove), K684 (an idle-slice
  design), K740's remainder (no placement under an open
  panel is stated as the toast's target, so nothing to
  decide), K755 (beat-note scheduling), K756 (a wait action
  - Levi's design), K757 (gates that measure, not decide),
  K758 (a third control, which does not exist), K761 and
  K780 (one question in two dresses: the clocked search's
  shape - waiting detours past 4 taps and the turnstile
  trap - wants its own design and census first; K780's
  period-1 half was closed by K788, and the ice half is the
  same research), K802 (waits on K138's stage 6), K889 (a
  placement redesign - what planting does to the share, the
  bite and the detour rate is a design question, not a
  census answer).
- Tooling with no desktop stand: K1058 (worktree removal -
  `.claude/worktrees/` itself, Run A's forbidden tree, and
  its fix is a working practice, already half landed), K1086
  (a reload trace - traces to a fix in Claude's lane, none
  stated), K1147 (the scripts' phone lock lives in an
  untracked helper and the watchdog cannot be shown armed
  without a live pass; batch 14's reason stands), K1167
  (other repos), K1177 (the scripts' own runs - a phone
  pass, Run A's skip).

**Step (3) wrapped, Residuals from the top through K648
again (the taken piece is inside K188; its other two pieces
stay with the item):**

- The junction, oracle and field lane, as above: K1130's
  neighbours in the junction group - K1048, K1047, K1046,
  K1000, K1002, K1003, K954, K957, K958, K966, K967, K972,
  K973, K974, K936, K933, K877. (K1130 itself: a dark first
  screenshot - a probe habit, no harness named, nothing to
  commit.)
- The cursive: K982, K977, K978, K951, K947, K938, K555,
  K556, K560, K562, K564, K565, K583, K621, K622, K642.
- Physics (Run A's skip, every dress): K11, K12, K13, K14,
  K16, K29, K30, K50, K51, K59, K65, K136, K455, K576, K596,
  K612, K615.
- Phone-bound: K123, K157, K168, K172, K181, K195, K196, K197,
  K252, K254, K300, K379, K477, K491, K574, K594, K613, K614,
  K892. (K413 belongs here in spirit - claude-config's phone
  lock - but it lives in another repo and waits on a person.)
- Levi's calls and looks, as their own texts say: K26, K27,
  K54, K62 (the two dead rows - rescale, relabel or hide is
  Levi's), K95, K106, K133, K143, K176 (a fairness call),
  K221, K226, K230, K281, K588, K914.
- GPU, shader and renderer-cost work, and the thread-reveal
  lane's remainder: K15, K42, K43, K163, K164, K166, K167,
  K190, K236, K242, K258, K266 (the hover rim - it travels
  with K265/K328 and their Levi-reviewed look), K271, K276,
  K287, K354, K355, K356, K363, K380, K384 (pieceVis's ring
  unwrap - its GPU twin and recompile ride with the reveal
  lane), K385 and K386 (the warm-up's submit and compile-out
  - Claude's K307 lane), K387, K424, K450, K451, K494, K537,
  K538, K540, K542, K547, K632, K633.
- Bundles, deliberate trade-offs already in the lore, and
  tidy-ups with no defect: K44, K175, K205, K246, K278,
  K348 (its edges are the lore's stated trade-offs - the X
  flicker guard, the quick-press rule, the intentional
  mid-move wait tap - not defects), K392's remainder (46
  long lines in probe_hooks - a style tidy), K506, K602.
- Untracked probes and kits, as above: K131, K223, K262,
  K295, K301, K303, K304, K349, K374, K391, K417, K420,
  K422, K425, K457, K460, K476, K487, K504, K508, K639.
- Measurements, dated records and inferred causes with no
  fix stated: K103, K107, K124, K142, K150, K158 (custom
  colors - byte-identity needs a higher-precision color in
  the link and the picker, a format change, not a rounding
  fix), K159, K189, K216, K232, K267, K285, K305, K315
  (K576's lane), K319, K342 (browsers beyond desktop),
  K358 (its trigger has not fired), K364, K367, K375, K378,
  K382, K388, K405, K407, K416, K427, K428, K431, K432,
  K433, K439, K444, K445, K446, K452, K453, K458, K464,
  K473, K474, K475, K484's remainder (sheet history - Chrome
  may skip its entry on Back; no fix is stated), K497, K498,
  K503, K512, K520, K528,
  K535 (its audio half already runs on pointerdown - verify
  only - and its snap cause is the joinery lane), K575,
  K604, K605, K607, K608, K619, K638, K640, K641 (K546's
  lane).
- No target, no tolerance, or a gate that has not landed:
  K208 (a tidy with no defect - and Run C takes its file
  this batch besides, so its own no-two-runs wait renews),
  K214 (physics lore, trimmed in Claude's pass), K217 (no
  tolerance stated, and its fix needs arc lengths the
  caller does not hand it), K218 (a cap under the web
  meshes), K222 (the K198 calls beyond it, no new target
  stated), K206 (stamping after the first sleep - a physics
  settle probe and a timing call), K220 (an untracked tool
  shape), K289 (media files, manual steps).

**Step (4), Next from the top, read through K292 (Run G;
the section's rest, from K265 on, was not read):**

- K875 and K876 (K868's oracle - Claude's junction lane, its
  product gap and water besides), K784 (a phone sitting),
  K579 (GPU confetti - it pays only if K318 raises the
  counts, and the phone is not CPU-bound; K318 has not
  landed), K797 (paper stage d - Levi's look, perf-gated on
  the phone), K409 (its look calls, K623 and K624, wait on
  Levi), K557 (cursive, after K115), K531 (launch-time
  determinism - Levi's launch prep, no device today), K533
  (alongside K144, out of scope), K345 (rides K868/K9's
  field), K240 (after K238's review, which waits on Levi),
  K46 and K78 and K297 and K340 and K341 (designs and audits
  sequenced after the panel's churn, K297's casual set for
  Levi to cut and K340's folder set Levi's pick), K9 (G4 -
  the junction field), K116 (pluck instruments - a Pixel
  pluck probe first, and Levi's lowest priority), K10 (the
  phone benchmark).

Nothing after K292 in Next was read, and nothing in Waiting
or Ideas was a candidate: Waiting holds Levi's calls, and
Ideas are not scheduled by these drafts.
