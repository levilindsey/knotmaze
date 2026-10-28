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
