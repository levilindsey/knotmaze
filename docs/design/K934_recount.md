# K934: K868, a fixed checker, the settled rules as defaults, a clean re-count (agent brief)

Stage brief (coordinator, 2026-10-27). Parent: K868
(`docs/design/K868_field_border.md`). Previous stages: K922
(`docs/design/K922_junction_extent.md`: Step 5 and `## Handoff`) and K940
(`docs/design/K940_label_fixes.md`: `## Results` and `## Handoff`). Read
those before anything else.

## Why

S3 will put the label ink (K915) into the app, and it copies whatever rule
the oracle follows. K922 and K940 left that ink's switches undecided, and
Levi handed those technical calls to the coordinator (2026-10-27). The rule
rounds now gain little (K940's best: extra 34 to 31, missing 36 to 35, #16
13 to 11), so before any more rule work this stage:

1. fixes the free-end check, which counts two close legs or a filled corner
   as one exit and so reports a free end where the ink is continuous (52 of
   label ink's 83, K922 Step 5);
2. makes the settled calls the oracle's defaults and removes the switches
   that lost (K942);
3. picks the junction extent with the fixed check;
4. re-counts the 12 scenes from that base;
5. shows what remains at the size a player sees it, so the coordinator can
   choose between more rule work and the app port (S3).

## The calls (the coordinator's; do not reopen them)

- `depth: "overlap"` and `endSnap` become defaults, endSnap
  unconditionally (K922: a float-bug fix in `clusterAt`).
- Label ink: `labFill: "yieldOrder"` in K940's crossed form becomes the
  only form, with `labTie: "surface"`.
- Removed: `labFill` "arcs" and "yield", `labFillDepth`, `labCap`,
  `labCapReach`, and the `labYieldChain` switch (crossed is the only form).
- `ink: "group"` stays the default ink until S3. Where a new default
  changes group ink's output, keep the change and report it.

## Order

1. **The checker.** Fix the exit count in the free-end check (`indep.ts`;
   K922's copy is in `.claude/probes/K922/`): count exits as connected runs
   of ink cells on the ring, or as components of the ink in an annulus, not
   by angular gaps (K922 Step 5).
   - Unit cases: a straight end (one exit, a free end), a band (two), an L
     whose inside is filled (two), a V whose legs are under 0.5 rad apart
     (two), a T (three), a thick blob whose exits merge.
   - Against the old count on K940's crossed candidate: list the free ends
     the fix drops, crop ten of them and confirm the ink is continuous
     there. Look at every free end it adds.
   - Keep the old count behind a flag, and report both in step 4.
2. **The calls as defaults** in `src/render/field/oracle.ts`, with their
   `OracleParams` docs. Add unit tests for the crossed yield order (none
   exist; K940's `## Results` says where near and crossed differ) and for
   `labTie: "surface"`. `npm test` passes.
3. **The extent.** Three candidates on the new defaults:
   - `span` (today's rule);
   - `part`;
   - `part` stopped short of crossing cuts. K922's `## Handoff`: an arm
     carried into a crossing's overlap now ends at its cut (23 free ends);
     this walk stops before it enters that overlap.

   Judge by the fixed free-end check first, then extra plus missing, then
   #16. Crop d1 (`part` removes its island) and the five sites where the
   candidates differ most. Adopt the winner as the default, and remove the
   losing values.
4. **The re-count** on the 12 scenes under the adopted set: extra, missing,
   free ends (the new count and the old), and #16, per scene and in total,
   beside K940's base (`INK=label DEPTH=overlap ENDSNAP=1`) and group ink.
   Sort what remains by mechanism as far as the tools allow (`cls.ts` has
   two known caveats: ledger K954).
5. **Sheet K: what remains, at play size.** For each mechanism left, take
   its worst two or three sites. Show each crop at the scale the app would
   draw that scene on the phone: the scene fitted to the screen's width in
   device pixels, as the app's camera fits it (find the phone's width in
   earlier phone probes' notes, else use 1080). Put the same crop at 4x
   beside it, and group ink beside label ink. Look at every crop and say
   whether the defect shows at play size. Write
   `.claude/probes/K934/K_recount.png` and its crops.

Not this stage: K943 (the over line inside a junction, next, behind a
flag), K953 (M1), K952's traces and S3.

## Rules

- **Worktree.** `.claude/worktrees/k934-recount`, on branch
  `k934-recount`. The coordinator made it, and its `node_modules` is a
  junction to the main checkout's. Copy the probes you reuse from the main
  checkout's `.claude/probes/` (K940's set and its helpers, K922's
  `indep.ts`) into `.claude/probes/K934/` in the worktree, and point their
  imports at the worktree's `src/`. Keep everything there.
- **Stop rule.**
  - Run `Get-Date` at the start and at every milestone.
  - Stop when steps 1-5 are done or 2 h after the start, whichever comes
    first.
  - A compaction is not a stop. After one, re-read this brief and
    `git log` before going on.
- **Commits.** Commit work in progress to the branch at every milestone,
  broken or not. Never push. `npm test` passes in the worktree at the end.
- **Not allowed.**
  - No phone and no timing.
  - Never run `npm run build` in the main checkout.
  - Never touch processes you did not start.
  - Never use Levi's Chrome profile.
  - Upload nothing; the coordinator uploads the sheet.
- **Shell.** Use PowerShell. Read code through the shell (`Select-String`,
  then `Get-Content | Select-Object`).
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Look.** Crop and look at your own images before you call anything
  right or fixed.
- **Write-up.** Append `## Results` (per step) and `## Handoff` to this
  brief, on the branch.
- **The final report** gives:
  - the checker: what changed, the unit cases, and the dropped and added
    free ends you looked at;
  - the defaults changed and the switches removed, with the tests added;
  - the extent table and the winner;
  - the re-count table (step 4);
  - sheet K's path, and for each mechanism whether it shows at play size;
  - your recommendation: more rule work (which) or S3 now;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K934's current handle fields.
