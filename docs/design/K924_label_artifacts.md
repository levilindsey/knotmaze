# K924: K868, trace the label ink's artifacts to their rules (agent brief)

Stage brief (coordinator, 2026-10-27). Parent: K868
(`docs/design/K868_field_border.md`). Previous stages: K915
(`docs/design/K915_surface_borders.md`, the label ink) and K922
(`docs/design/K922_junction_extent.md`: depth over the overlap, endSnap,
the junction extent). Read K922's `## Results` and `## Handoff`, then
K915's Step 3 and `## Handoff`, before anything else.

## Why

S3 will put K915's label ink into the app: a z-buffered label pass, then
band strips. K923 showed it fits the Pixel's 4 ms with a screen-space LOD
and a packed 32-bit label. S3 copies whatever rule the oracle's label ink
follows, flaws included. Sheet I (`.claude/probes/K922/I_junction_extent.png`)
shows angular shapes at d1-d3 in every label column, whatever the
switches. The label ink also draws extra ink that group ink did not (71 →
94 stretches, 88 under depth).

This stage traces every artifact the label ink adds to the rule that makes
it, counts what each mechanism accounts for, and names the rule change
that would remove it. Building the fixes is the next stage.

What K922 already traced (Step 5):
- d2: the line runs along the boundary between one cluster's member and
  another cluster's fill (J26, J31). The V and the turn are the fill
  polygon's corners.
- d4: ch58 (s 15.2) overlaps J7's fill and arm at equal depth, with no
  crossing between them in the table, so the visible label flips in a tie.
- d3: J8's arm (z 0.76) lies over J0's arm and then J0's fill. It changes
  under depth but stays angular. Inferred, not traced: the overlap order
  reshapes a crossing's depth.

K922 calls these a third mechanism: fill outlines against a foreign
member, and ties where the table has no crossing. Not traced yet: d1's
sawtooth under label and under depth. K915 guessed ties in a crowded
junction; under the extent a crossing cut at crossing 307 replaces it.

## The base

Trace under `INK=label`, `DEPTH=overlap` and `ENDSNAP=1` (the probes' env,
see `.claude/probes/K922/lib.ts`). The coordinator has recommended depth
to Levi (K934, open), and endSnap is a float bug fix. For each artifact,
also say whether `EXTENT=part` changes it. Group ink is the reference, not
the target.

## The list

1. Sheet I's d1, d2, d3 and d4 (muse_hash at 6x; `i.ts crops` gives the
   places).
2. j149's spur and speck. The spur is gone under depth: confirm it, and
   trace the speck.
3. The extra-ink stretches in classes the model's truth calls hidden (K915
   Step 3: 13 under label). Recount them under the base.
4. muse_hash's ink checks:
   - #5's band: 8.5 px under label and depth (W = 3.24 px), with a spike
     at its lower right under depth;
   - #6;
   - #7: 106 under group, 119 under depth;
   - #9.1: 1.60 px under group, 5.28 px under depth.
5. The #16 stretches (the checks table's row: 13 under depth).
6. Sheet F's spur, hairlines, seam and speck at cr 4.5 and 6 (K915 Step 3:
   not measured).

## Order

1. **Attribute.** For each item, give:
   - the labels on each side of the ink (member, fill or arm; cluster; z);
   - the rule in K868 §3.3-§3.7 that inks it there;
   - its mechanism. Known mechanisms are a cap cut (K915 Handoff 3), a
     fill outline against a foreign member, a tie with no crossing in the
     table, and the free-end check's exit count (K922 Step 5). It may also
     be a new one.

   Use K922's `trace.ts`, which reads the visible labels at W/8 around a
   point and runs the presence test across every label boundary within
   1.5W. Confirm d2 and d4 at one more point each, and trace d1 and d3.
2. **Count.** Over the 12 real scenes under the base, count the extra-ink
   stretches, missing-ink stretches and free ends each mechanism accounts
   for. The rows should add up to the base's totals. Report what is left
   unattributed.
3. **Confirm by flipping.** Where an attribution is a hypothesis, flip the
   suspect rule behind a new switch (off by default). Show that the
   artifact goes, and what else moves. Candidates:
   - a fill bounded by its G1 corner arcs instead of its polygon's
     corners (sheet F's corners, which Levi approved);
   - a depth for every fill-versus-member overlap, not only the crossing
     table's pairs;
   - a deterministic tie-break where depths are equal.

   A flip is a diagnostic, not the fix: no tuning and no new defaults.
4. **Name the rule changes.** For each mechanism, give:
   - the change to K868 §3.2-§3.7 that removes it;
   - what it costs S3 (a pass, label bits, a lookup per pixel);
   - what it risks elsewhere.

   Rank the changes.

Not this stage: the free-end check's exit count (Levi's call, K934), the
extent walk, the hook's look and anything on the phone.

## Setup

- **Worktree.** `.claude/worktrees/k924-label-artifacts`, branch
  `k924-label-artifacts`, made from master by the coordinator. Its
  `node_modules` is a junction to the main checkout's. Work and commit
  there.
- **K922's probes** are untracked in the main checkout, in
  `.claude/probes/K922/`: `lib.ts`, `run.ps1`, `trace.ts`, `flood.ts`,
  `arcs.ts`, `indep.ts`, `census.ts`, `checks_ab.ts` and `i.ts`. The run
  commands are in each probe's header. They import the K922 worktree's
  source by absolute path. Copy what you need into your worktree's
  `.claude/probes/K924/`, and repoint the imports to your worktree.
- **Scenes and synthetics.** The scenes are in the main checkout's
  `.claude/probes/K868/`, and the synthetics in `test/render/field/scenes`.
- **The model** is `src/render/field/oracle.ts`; read it by ranges. Its
  rules are in `docs/design/K868_field_border.md` §3.3-§3.7.
- **Images.** View them as small crops (1000 px or less, cut by script),
  never whole sheets.

## Rules

- **Stop rule.**
  - Run `Get-Date` at the start and at every milestone.
  - Stop when steps 1-4 are done or 2 h after the start, whichever comes
    first.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
- **Commits.** Commit work in progress to the branch at every milestone,
  broken or not. Never push. `npm test` passes in the worktree at the end.
- **Defaults.** They stay as they are: `ink: "group"`, today's depth and
  spans, and every new switch off.
- **Not allowed.**
  - No phone and no timing.
  - Never run `npm run build` in the main checkout.
  - Never touch processes you did not start.
  - Never use Levi's Chrome profile.
- **Shell.** Use PowerShell. Read code through the shell (`Select-String`,
  then `Get-Content | Select-Object`).
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Write-up.** Append `## Results` (per step) and `## Handoff` to this
  brief, on the branch.
- **The final report** gives:
  - the attribution table (item, place, labels, rule, mechanism, base
    against extent);
  - the count per mechanism, and what is left unattributed;
  - what each flip showed;
  - the ranked rule changes and their S3 costs;
  - a `Ledger items` list (follow-ups, residuals, decisions for Levi);
  - K924's current handle fields.
