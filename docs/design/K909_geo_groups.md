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
