# K900: K868 oracle, the last missing borders (agent brief)

Coordinator, 2026-10-27 09:50. One stage, opus, 2 h cap.

## Why

K883 (merged `5048670e`; its handoff closes
`docs/design/K883_oracle_borders.md`) cut the missing border samples over
the 12 real scenes from 1540 to 208 and every named cause to 0. The CPU
oracle is the reference K868's S3 (the WebGL2 renderer) will be checked
against, so each border it still misses, and each bit of ink it adds,
must be explained and then fixed, or accepted with a reason, before S3
starts. What is left:

- **#15's crossing 292 on muse_hash**, a real rule failure. Its over pass
  (chain 84) lies in no span; the same-chain rule (σ 3.14h) links it
  through chain 84's own samples to a cluster-68 arm 5h further on, and
  cluster 68 holds the under pass. At 47° the crossing cut looks only 2.8h
  past an arm's end, short of σ's reach.
- **208 "other" missing samples**, no mechanism named: g41_def_tw64 62,
  muse_hash 60 (27 stretches: the blue dashed circles on sheet B2),
  g41_user_tw64 23, g41_ring_tw64 22, def 14, ring 13, muse_default_tw 7,
  the rest 0-3.
- **Extra ink rose**: muse_hash 13 to 22, g41_user_tw64 2 to 14, positions
  unknown.
- **Sheet F** (`.claude/probes/K868/sheets/F_corner_reach.png`): a spur at
  cr 3, hairlines and a thick seam at cr 4.5 and a speck at cr 6, where an
  arm is cut short (near j34's top arm).

Levi is reviewing sheets B2 (the borders apart from the blue spots) and F
(`cr`'s range), ledger K891. Nothing here waits on his answers; the
coordinator folds them in later.

## Setup

- Worktree `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k900-oracle`,
  branch `k900-oracle`, made from master. Your shell starts in the MAIN
  checkout, which must stay clean: use absolute paths and
  `git -C <worktree>`. node_modules is a junction to the main checkout's.
- Read first: K883's handoff (the end of `K883_oracle_borders.md`), then
  `K868_field_border.md` §3 and §6 (K883 rewrote §3.1, §3.3, §3.4, §3.7,
  §3.8).
- Code: `src/render/field/` (`oracle.ts`: `buildSpans`, `armCaps`, the
  corner fit; `checks.ts`: `borderCensus`, #1-#16; `geom.ts`, `depth.ts`,
  `g2.ts`, `scene.ts`). Tests: `test/render/field/` (`k883.test.ts`,
  `oracle.manual.test.ts` for sheets, `scenes/gen.ts` for synthetic
  scenes).
- K883's probes, in the main checkout: `.claude/probes/K883/`
  (`census.ts`, `census_all.log`, `diag.ts` traces one sample, `x15.ts`
  and `x15_muse_after.log`, `sheets.ts` made B2, F and worst12,
  `spots.json`). S1a's real scenes: `.claude/probes/K868/scenes/`.
- Outputs go in the main checkout, where git ignores them: probes and logs
  in `.claude/probes/K900/`, sheets in `.claude/probes/K868/sheets/`.

## Order

1. **Positions.** Make the census record every missing stretch and every
   extra-ink stretch: scene position, chain and sample range, the nearest
   junction and crossing ids, and its class. Write one JSON a scene to
   `.claude/probes/K900/census/`, and rerun all 12 scenes as the baseline.
2. **Crossing 292.** Fix the rule. Choose between padding the crossing
   cut by σ and keeping same-chain joins out of a cluster that holds the
   crossing's other pass by what §3 means a group to be, and write down
   why. Add a synthetic scene that reproduces it (`gen.ts`) and a unit
   test. #15 must pass on every scene, real and synthetic.
3. **The 208 "other" samples.** Trace them (`diag.ts`) and group them by
   mechanism, largest scenes first: muse_hash (B2's blue circles), then
   g41_def_tw64. Each mechanism gets a census class, a synthetic scene
   where one can show it, and either a fix in the rule or a reason it is
   right as drawn. If the census is wrong (a border that geometry it does
   not model really hides), fix the census, and say so.
4. **Extra ink**, the same way, from step 1's positions.
5. **Sheet F's artifacts.** Diagnose the spur, the hairlines, the seam
   and the speck; fix them if they share a mechanism with steps 2-4,
   otherwise note them.
6. **Sheets**: `B3_muse_hash.png` in B2's layout (before = `5048670e`'s
   oracle, after = this stage's; red for restored stretches, blue for
   ones still missing) and `F2_corner_reach.png` if step 5 changed F. Add
   a line for each to `.claude/probes/K868/sheets/README.md`.

Update `K868_field_border.md` wherever the rule changes.

## Checks (report the numbers)

- The census per scene and class, before (`5048670e`) and after, missing
  and extra ink.
- muse_hash #2, #11, #14, #15 and #16; #15 and #16 on every real scene;
  the synthetic total (86/86 at `5048670e`).
- Corner solves per scene.
- The full suite in the worktree (`npx vitest run`).

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop
  when steps 1-6 are done or 2 h after the start, whichever comes first.
  Steps 1 and 2 come first. A compaction is not a stop: after one,
  re-read this brief and `git -C <worktree> log --oneline -10` before
  going on.
- Commit WIP to `k900-oracle` at every milestone, broken or not. Never
  push or merge, and don't edit `LEDGER.md`. If the stage stops
  unfinished, append a `## Handoff` to this brief in the worktree and
  commit it.
- Never run `npm run build` in the main checkout. Never touch processes
  you did not start, never use Levi's Chrome profile, and don't upload
  anything to Drive.
- Use PowerShell for local commands. Read code through the shell
  (`Select-String`, then `Get-Content <file> | Select-Object -Skip <n>
  -First <m>`); use the Read tool only right before an Edit. View images
  as crops of 1000 px or less, cut by script into `.claude/probes/K900/`.
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- The final report gives what was built, the census before and after,
  each mechanism found and what was done about it, the check numbers,
  what is left, a `Ledger items` list (follow-ups, residuals, decisions
  for Levi), and K900's handle fields (branch, last commit, evidence,
  next).

## Handoff (2026-10-27, at the 2 h cap)

Steps 1-2 and the 10:28 redirect (independent check, sheet B3) are done,
step 3 is grouped by mechanism but not fixed, and steps 4-5 are handed
off. Branch `k900-oracle`, 2208d844..7c972033.

Built:
- Step 1: census positions (2208d844).
- Step 2, crossing 292: σ joins into a group holding the crossing's other
  pass are refused (`passJoins` "k900"), and the crossing cut and its
  clash test moved from L + h/2 to L + h (`passMargin` 1, 6f1efba0). Why
  both: K868 §3.4. `j_hook_cross` (gen.ts `hookScene`) fails under either
  change alone and passes under both; `k883.test.ts` pins it (7c972033).
- Redirect: `borderCensus` truth "geo" (a side is hidden only under an
  over pass by the crossing table, or inside the connected overlap of a
  junction's arm tubes that contains the node; 3ad3187c) and free border
  ends in 4x oracle renders (`.claude/probes/K900/indep.ts`). Sheet B3
  (`.claude/probes/K868/sheets/B3_muse_hash.png`) marks census, geo and
  free ends each in its own style.

Numbers, 12 real scenes (5048670e -> 7c972033):
- Census missing 208 in 93 stretches -> 148 in 66; extra ink 54 -> 71.
- Geo missing 8519 in 4377 -> 8283 in 4312; free ends 281 -> 228 (seen
  by the census 85 -> 54, by geo 257 -> 210, by neither 24 -> 18).
- #15 11/12 -> 12/12 (muse_hash 349 -> 350 of 350); #16 3/12 -> 9/12
  (still failing: muse_hash 38 samples, g41_def_tw64 28, g41_ring_tw64
  2). muse_hash #2, #11, #14 unchanged (fail); corners 341/342 both.
- Synthetic #2-#16 over 15 scenes: 114/117 -> 116/117 (left: j_pair_cross
  #2, unchanged).

Mechanisms of the free ends (refuse + m 0.5, before the cut moved):
muse_hash: span fill 37, junction core 23, a group on top 21, union 11,
buried 6, neither 6; g41_def_tw64: fill 27, group on top 21, neither 7;
g41_user_tw64: fill 12, core 8, neither 6. The largest classes come from
the oracle's span, fill and core heuristics. Judgment: defining the
junction group geometrically (the arm-tube overlap that contains the
node, as truth "geo" does) would remove those classes instead of
patching each heuristic.

Next:
1. Replace the span/fill/core grouping with the geometric group; re-run
   `indep.ts` and `census.ts` on the 12 scenes.
2. Step 4: extra ink (54 -> 71, mostly junction-core seams: muse_hash
   core/own 13 in 32, g41_user_tw64 5 in 8).
3. Step 5: sheet F's artifacts (range approved), then F2.
4. #16 on muse_hash, g41_def_tw64 and g41_ring_tw64.
5. Sheet A's curved EDT FAIL (6.751 px): check whether it predates K900.
6. Truth "geo" checks a junction's node overlap before the crossing
   table (`geoHider`), and the overlap can run on into a crossing: in
   `j_hook_cross` the END's inner side lies inside the through's tube from
   j0 through the crossing, so geo calls the over pass's border there
   hidden. A geometric group needs the same crossing cut as the spans; fix
   geo before trusting its extra-ink numbers.
7. `j_hook_cross`'s 6x render (`.claude/probes/K868/oracle/j_hook_cross/
   crossing_6x.png`) shows a free border end: the hook's inner border
   stops inside the through's body where the END's group (cut at s 9.30)
   rejoins j0. The same shape is crossing 292's; it needs the look
   decided (Levi) before a fix.
