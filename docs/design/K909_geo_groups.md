# K909: K868 oracle, junction groups from geometry (agent brief)

Coordinator, 2026-10-27 11:35. One stage, opus, 2 h cap. Follows K900
(`K900_oracle_holes.md`, merged `263bc134`).

## Why

Levi on the oracle's look (K874, sheet B): "planned is way better. BUT
planned is missing some borders", and on sheet B2: "about twice as many as
you've marked with blue". K900 confirmed the census undercounts and added
two checks that do not lean on the oracle's groups: truth "geo" in
`borderCensus`, and free border ends found in 4x renders
(`.claude/probes/K900/indep.ts`). At `263bc134` the 12 real scenes have
228 free ends (muse_hash 106, g41_def_tw64 51, g41_user_tw64 29, def 16)
against 148 census-missing samples.

K900 traced the free ends to mechanisms (refusal + margin 0.5): muse_hash
span fill 37, junction core 23, a group on top 21, union 11, buried 6,
neither 6; g41_def_tw64 fill 27, group on top 21, neither 7; g41_user_tw64
fill 12, core 8, neither 6. The largest classes come from the oracle's own
span, fill and core heuristics. K900's judgment, which this stage tests:
define a junction's group by geometry, as truth "geo" does (the connected
overlap of the junction's arm tubes that holds the node), with the
crossing cut kept, instead of patching each heuristic.

S3 (the WebGL2 renderer, `K868_field_border.md` §8) is checked against
this oracle, and a shader cannot test 2D connectivity per pixel. So the
rule must reduce to per-arm data, such as how far each side of each arm
stays inside the junction's union.

## Setup

- Worktree `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k909-geo-groups`,
  branch `k909-geo-groups`, made from master. Your shell starts in the MAIN
  checkout, which must stay clean: use absolute paths and
  `git -C <worktree>`. node_modules is a junction to the main checkout's.
- Read first: K900's handoff (the end of `K900_oracle_holes.md`, items 1-7),
  then `K868_field_border.md` §3 (K900 rewrote §3.4), §5 and §6.
- Code: `src/render/field/` (`oracle.ts`: the spans, `armCaps`, the corner
  fit, the options `spans`, `passJoins` and `passMargin`; `checks.ts`:
  `borderCensus` with `truth: "geo"`, `nodeOverlaps`, `geoHider`, checks
  #1-#16; `geom.ts`, `depth.ts`, `g2.ts`, `scene.ts`). Tests:
  `test/render/field/` (`k883.test.ts`, `oracle.manual.test.ts` for sheets,
  `scenes/gen.ts` for synthetic scenes, `hookScene` among them).
- K900's probes are in the main checkout under `.claude/probes/K900/`
  (`lib.ts`, `census.ts`, `indep.ts`, `b3.ts`, `checks_ab.ts`, `hook.ts`,
  `diag.ts`, `crops.ts`; logs `indep_m1.log` and `census_m1.log` are the
  numbers at `263bc134`). They import the `k900-oracle` worktree, which
  sits at `263bc134`, so as they are they give the "before". Don't edit
  that worktree or folder: copy what you use into `.claude/probes/K909/`
  and point the copies at your worktree. S1a's real scenes are in
  `.claude/probes/K868/scenes/`; sheets go in `.claude/probes/K868/sheets/`.

## Order

1. **Geo's crossing order** (K900 item 6). `geoHider` tests a junction's
   node overlap before the crossing table, and the overlap runs on into a
   crossing: in `j_hook_cross` it calls the over pass's border hidden. The
   crossing table decides first, and the overlap stops at each arm's cap
   (the crossing cut at L + h, the next junction's root, the chain's end),
   as the spans do. Rerun geo and the free ends on the 12 scenes and the
   synthetic ones, and report what moved.
2. **The geometric group**, in the oracle behind a switch (e.g.
   `groups: "geo" | "k883"`). A junction's group is the connected overlap
   of its arm tubes that holds the node, cut at the caps. Build it so
   the oracle and truth "geo" share one implementation; from then on the
   free-end image check is the only check independent of the oracle's
   groups, so it is the one that decides. Derive per-arm, per-side spans
   (how far each side stays inside the group) for S3, and count where they
   differ from the 2D overlap, with sizes. Corners stay G1, `cr` 0-6 with
   3 the default, fitted inside the caps; say what replaces the span in
   the corner fit (r ≤ span·tan(θ/2) today). The same-chain refusal and
   the crossing cut stay. Make "geo" the default only if free ends fall
   and census missing, extra ink, #15 (12/12), the synthetic total
   (116/117) and corner solves do not get worse; otherwise leave it behind
   the switch and say why. Write the rule into §3.4 (and §3.7-§3.8 if the
   corner fit changes).
3. **Measure and sheet B4.** Before (`263bc134`) and after on the 12
   scenes: free ends by class, census missing and extra ink under both
   truths, muse_hash #2, #11, #14, #15 and #16, #15 and #16 on every
   scene, the synthetic total, corner solves, and the full suite in the
   worktree (`npx vitest run`). `B4_muse_hash.png` in B3's layout (red
   restored, blue still missing, magenta free ends after). A geometric
   union changes the look as well as the borders (a narrow-angle pair of
   arms stays merged until the tubes part), so also mark where the drawn
   outline moved by more than W, in its own colour, with crops of the
   largest moves. Add a README line.
4. **Sheet G, the hook's look** (K900 item 7). Where a junction's arm
   hooks back over its own through (`j_hook_cross`; muse_hash crossing
   292), the arm's inner border now ends in a free cap inside the through,
   at the cut. Levi decides the look. Render two or three candidates side
   by side on both cases, for example: as now; the arm's inner border
   carried back over the through to where it leaves the junction's outline
   (the arm lies on the through from the junction on); the cap moved out
   to the through's border. Build each behind a switch, write one line per
   candidate on how it would reach S3, and change no default. Save it as
   `G_hook_look.png` with a README line.
5. **Extra ink** (K900 item 2: 54 to 71, mostly junction-core seams),
   under the new groups: by mechanism, each fixed or explained.
6. **Sheet F's artifacts** (K900 item 3; the `cr` range is approved): the
   spur at cr 3, the hairlines and thick seam at cr 4.5, the speck at cr 6.
   Fix what shares a mechanism with steps 1-5, note the rest, and make
   `F2_corner_reach.png` if F changed.
7. **#16** on muse_hash (38 samples), g41_def_tw64 (28) and g41_ring_tw64
   (2), if step 2 left any.

Steps 1-3 come first.

## Rules

- Stop rule: run `Get-Date` at the start and at every milestone. Stop
  when steps 1-7 are done or 2 h after the start, whichever comes first.
  A compaction is not a stop: after one, re-read this brief and
  `git -C <worktree> log --oneline -10` before going on.
- Commit WIP to `k909-geo-groups` at every milestone, broken or not. Never
  push or merge, and don't edit `LEDGER.md`. If the stage stops
  unfinished, append a `## Handoff` to this brief in the worktree and
  commit it.
- Never run `npm run build` in the main checkout. Never touch processes
  you did not start, never use Levi's Chrome profile, and don't upload
  anything to Drive.
- Use PowerShell for local commands. Read code through the shell
  (`Select-String`, then `Get-Content <file> | Select-Object -Skip <n>
  -First <m>`); use the Read tool only right before an Edit. View images
  as crops of 1000 px or less, cut by script into `.claude/probes/K909/`.
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- The final report gives what was built, the rule and why, the numbers
  before and after, what is left, a `Ledger items` list (follow-ups,
  residuals, decisions for Levi), and K909's handle fields (branch, last
  commit, evidence, next).

## Handoff

2026-10-27, from the stage agent (start 11:35). It stopped at 12:59,
before its 2 h cap, rather than start a fix it could not finish in the
time left. Steps 1-4 are done. Steps 5 and 7 are diagnosed, not fixed,
and step 6 is not started.

- Branch: `k909-geo-groups`, worktree `.claude/worktrees/k909-geo-groups`.
- Probes, logs and censuses: `.claude/probes/K909/` (untracked).
- Sheets: `.claude/probes/K868/sheets/B4_muse_hash.png` and
  `G_hook_look.png`, each with a README line.

1. **Geo's crossing order** (8866cd49). `geoHider` now asks the crossing
   table first. The node overlap stops at each arm's cap (`geoCaps`). In
   j_hook_cross, 8 over-pass samples on chain 1 near crossing 0 now show.
2. **The geometric group** (8866cd49, da1ef576, a1c9b2eb).
   `src/render/field/geo_group.ts` (`GeoGroups`, `geoCaps`) is the one
   walk behind both the oracle's `groups: "geo"` and the census's truth
   "geo".
   - The rule is in K868 §3.4. Per §3.8, the cap bounds the round, not
     the span, so nothing replaces the span in the corner fit.
   - Geo stays behind the switch; the default is still "k883". Free ends
     fall by only one (228 to 227), and two guards get worse: census
     missing rises from 148 to 152 (8211 to 8236 under truth geo), and #16
     on muse_hash gains a sample (38 to 39).
   - `geoCut`, the per-junction crossing cut, stays off. With it on, free
     ends rose to 235 and census missing to 163.
3. **Measured.** Before is groups k883, which is 263bc134's oracle; after
   is groups geo.
   - Free ends: 228 to 227.

     | Class | Before | After |
     |---|---|---|
     | fill | 74 | 71 |
     | group on top | 52 | 50 |
     | core | 47 | 48 |
     | union | 24 | 24 |
     | neither | 18 | 20 |
     | inked by another | 10 | 9 |
     | under the fill | 2 | 4 |
     | under chain | 1 | 1 |

   - Census under the model's truth: missing 148 to 152, extra 71 to 71.
     Under truth geo: missing 8211 to 8236, extra 0 to 0.
   - muse_hash checks:
     - #2 fails in both (gap max 26.75 px, one solve failed).
     - #11 (349/350), #14 (349/350) and #15 (350/350) are unchanged.
     - #16: 23051 to 23050 of 23089 (19 to 20 stretches).
   - #15 passes 12/12 in both. #16 fails on muse_hash, g41_def_tw64 (28
     samples) and g41_ring_tw64 (2), the same in both.
   - Synthetic: 116/117 in both, free ends 4 to 4. Corner solves are
     unchanged (muse_hash 341/342).
   - Suite: 178 files passed, 2 skipped; 2369 tests passed, 6 skipped.
   - Spans: 3589 of 3622 arms are equal, 11 longer and 22 shorter (the
     shorter ones come from the cluster-wide cut).
   - S3's per-side data: 350 far pieces on 319 arms, 421.5h in all.
     - The largest is 5.13h (g41_user_tw64).
     - muse_hash has 57 pieces on 51 arms (median 0.75h, max 4.87h).
     - The synthetic scenes have none.
   - B4: no outline moved by more than W. 5 px changed in 3 places, all
     lighter. Free ends are 106 to 106, in the same places. One census
     stretch appears (a1).
4. **Sheet G**, from the oracle's `hookLook: "now" | "carry" | "cap"`
   (default "now", unchanged; 18f1b288, with a k883.test.ts case).
   - A hook arm is a crossing-cut arm with exactly one side inside the
     crossing's other pass at the cut. `findHooks` finds 1 in j_hook_cross
     and 5 in muse_hash, 3 of them at crossing 292 (j139 arm 2, j140 arms
     1 and 2).
   - "carry" draws that side's border from the cut back to the root, over
     the group's body.
   - "cap" hides that side's ink inside the other pass's tube.
   - Results (`.claude/probes/K909/g_run3.log`; ink in px, and in
     brackets the px changed from now):

     | Scene | now | carry | cap |
     |---|---|---|---|
     | j_hook_cross | 32600 | 33144 (576) | 29941 (2753) |
     | muse_hash, crossing 292 | 71954 | 73716 (1865) | 69205 (2863) |

   - j_hook_cross: cap is clean. The through's lower border turns
     straight into the END arm's inner border, and the free cap is gone.
     carry adds a short stub from the cap back to the root, inside the
     through.
   - muse_hash crossing 292: carry draws a long new line across the
     group's body. cap turns now's rounded end into two open, jagged
     border ends, because no other border is drawn there for them to end
     on. Three hook arms share the crossing, on both of its chains (66
     and 84).
   - Census on the 12 scenes (`.claude/probes/K909/census_hook_cap.log`,
     `census_hook_carry.log`; `HOOK_LOOK` in the probes' `lib.ts`). Its
     truth draws the hook as now. Only muse_hash, muse_default_tw and
     g41_user_tw64 move.
     - carry: extra ink 71 to 88, because the truth has no carried
       border. Nothing else moves.
     - cap: extra ink 71 to 66, and missing 148 to 165. #16 newly fails
       on muse_default_tw (18 samples, chain 28 at crossing 100) and
       g41_user_tw64 (12: chain 26 at crossing 151, and 2 on chain 22 at
       crossing 139). On muse_hash it loses 2 samples (23051 to 23049).
       #15 stays 12/12.
     - Why cap fails #16: 4 of the 9 hook arms in these four scenes are
       the crossing's over pass (`hooks_over.ts`). They are j_hook_cross
       j0, muse_hash j140 arm 1, muse_default_tw j64 arm 2 and
       g41_user_tw64 j66 arm 0. There, cap hides the over pass's own
       border inside the through, and #16 flags the last two. The 2
       samples on chain 22 are the over pass's border next to an under
       hook (j53 arm 1). The cut-cap rule (dOther < h near the side's end
       point) hides them.
     - What cap fixes: j_hook_cross's only extra stretch (core/own, 4
       samples, at the hook). On muse_hash it removes 5 core/own
       samples: 4 of j140's 5 (chain 84, crossing 292) and 1 of j81's 3
       (chain 34, crossing 134, another hook). It also hides one sample
       the truth wants on each scene's hook side by the crossing:
       j_hook_cross chain 1 at s 6.13, and muse_hash chain 84 at s
       32.36, where #16 loses its 2 samples (s 32.36 to 32.41).
   - Levi picks the look. For cap Levi also picks what an over hook arm
     does (its border over the through, or merged as cap draws it now),
     and what happens where no border is drawn for the hook side to end
     on.
5. **Extra ink** (71 stretches, unchanged under geo), by mechanism: not
   fixed.

   | Mechanism | Stretches | Samples |
   |---|---|---|
   | core/own | 23 | 45 |
   | union/own | 16 | 18 |
   | union/other | 4 | 4 |
   | core/other | 3 | 4 |

   The muse_hash sites:
   - j111 (chain 83, 6 samples);
   - j123 (chain 66);
   - j149 (chain 82, near crossing 305; j149 arm 1 is an under hook
     there, but cap leaves this stretch alone);
   - j140 (chain 84, near crossing 292). This is the hook's free cap:
     cap removes 4 of its 5 samples (step 4).
6. **Sheet F**: not started. Under geo, F's crops are the same as before,
   because the outline there is identical, so nothing in steps 1-4 shares
   a mechanism with F's artifacts.
7. **#16** under k883: not fixed. 30 of the 31 stretches (67 of 68
   samples) are "chain X's group on top": the over pass's border lies
   under a group that holds no piece of the sample's own chain. The other
   one is buried (muse_hash chain 84, s 12.46).

**Next steps**:
1. Levi chooses the hook look (sheet G, and for cap what an over hook
   arm does), and whether to keep or remove `groups: "geo"`.
2. Step 5, the core/own seams first. The hook's (j_hook_cross, j140)
   follow the look Levi picks.
3. Step 7, the "group on top" class.
4. Step 6.
