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
