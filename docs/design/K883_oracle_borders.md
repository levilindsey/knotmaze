# K883: K868 oracle, sheet B's missing borders and the §3 fixes (agent brief)

Brief for one agent stage. Coordinator: the knotmaze Claude session that
filed K883's handle. Written 2026-10-27. Follows S1b
(`K868_s1b_oracle.md`) and S2 (`K868_s2_g2.md`); the design is
`K868_field_border.md`.

## Why

Levi judged the S1b and S2 sheets on 2026-10-27:

- Sheet B (muse_hash, master against the oracle): "Yes, planned is way
  better. BUT planned is missing some borders". The oracle's look is
  accepted. The missing borders block S3, the WebGL2 prototype.
- Sheet C (the corner rule): "your recommendation sounds good. But having
  a slider for this roundness is a good idea." The recommended rule was
  r = min(2h, h·max(0, 1.25·cr·tan(θ/2) − 0.97)) under the web cap
  ℓ ≤ 1.5h (h is the thread's half-width). Under it the slider (`cr`,
  "Corner reach", 0 to 6, default 3) barely acts. The two caps decide
  every corner wider than 47° at cr 3 and wider than 18° at cr 6, which
  is what sheet B used. Right angles stop changing past cr ≈ 2.
  Decision (coordinator): **the slider scales the approved corner**,
  r(θ) = (cr/3)·min(2h, 1.5h·tan(θ/2)), so ℓ ≤ 0.5·cr·h and
  r ≤ (2/3)·cr·h. At cr 3 this reproduces sheet B's corners, except that
  sheet B left corners under 14.7° sharp and rounded those from 14.7° to
  18.4° less. At 0 every corner is sharp, and at 6 every corner is twice
  as round. Master keeps its own mapping.
- Sheet E: Levi saw no difference between G1 and the G2 candidates, so
  G1 (rolling-ball arcs) stays, and K882 (S2b) is dropped.

What sheet B shows. This is the coordinator's look at the sheet, not a
measurement. In the oracle's full frame, some places where threads touch
draw as one hollow blob, and the borders between those threads are
missing. The 6x overlays show strokes that only master draws.

The probable cause is §3.4's open case: a crossing whose two passes both
lie inside one junction cluster's span gets unioned like a junction.
That is 29 of muse_hash's 350 crossings, 2-8h from a junction root,
often inside an acute corner's long V-to-tangent stretch
(`K868_s2_g2.md`, "What §3 gets wrong"). Clusters whose spans overlap
also merge, and long spans (sheet B's cr 6) make that more likely. None
of this is verified yet; step 1's census decides it.

## The rule to build

A crossing is two surfaces, so no group may hold both passes of one
crossing. The proposed rule follows; the census may refine it.

- An arm joins its junction's group only as far as the first of: its
  first crossing pass (stop at the gap's near edge, less a margin), its
  end, or the next junction.
- A corner's round fits inside the spans of both its arms: ℓ is at most
  the shorter span, so r ≤ span·tan(θ/2). This is §3.8's missing
  short-arm cap, and it also covers a crossing near the root.
- A corner with no V (j58/1): define what it draws. It may be the case
  where the clipped spans leave no corner at all.

## Setup

- Worktree `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k883-borders`,
  on branch `k883-borders`, made from master.
  - Your shell starts in the MAIN checkout, which must stay clean: use
    absolute paths and `git -C <worktree>`.
  - node_modules is a junction to the main checkout's.
- Read first:
  - `K868_field_border.md` §3-§6.
  - From `K868_s2_g2.md`: its Handoff, "What §3 gets wrong", and the
    §3.4 crossings near line 227.
  - The Findings in `K868_s1b_oracle.md`.
- Code is in `src/render/field/`: `oracle.ts`, `checks.ts`, `geom.ts`,
  `depth.ts`, `g2.ts` and `scene.ts`.
- Sheets come from `test/render/field/oracle.manual.test.ts`
  (`K868=A|B|C|D|E`). Reuse its PNG encoder and sheet B's layout.
- Scenes:
  - The synthetic ones are in `test/render/field/scenes/`. Add new ones
    to `gen.ts`.
  - S1a's real ones are in the main checkout's
    `.claude/probes/K868/scenes/`.
- Outputs go in the main checkout, where git ignores them:
  - sheets and oracle runs in `.claude/probes/K868/` (`sheets/`,
    `oracle/`);
  - probes and logs in `.claude/probes/K883/`.

## Order

1. **Census of missing borders.**
   - Define "missing" from the scene, not from master: a thread side
     that should show and is not drawn. A side should show unless it is
     under an over pass or inside its own junction's union.
   - Master's crop is only a second opinion. Levi preferred the oracle's
     look, and master's extra strokes inside the union are master's
     errors.
   - Run it on muse_hash and every other S1a real scene.
   - Classify each missing border by cause, giving counts and junction
     or crossing ids:
     - a crossing inside a cluster's span (§3.4);
     - two clusters merged through overlapping spans;
     - a failed corner solve;
     - a short arm;
     - the corner with no V;
     - other.
   - Add a crop sheet of the 12 worst.
   - Keep the census as a check in `checks.ts`, testing two things:
     - no group holds both passes of a crossing;
     - every crossing's over pass keeps both of its borders through the
       crossing.
2. **The rule.** Build it in the oracle, then rerun the census. Every
   §3.4 case must be fixed. Report what is left in each class, and why.
3. **The slider mapping.** Change the oracle's r rule and `webCap` to
   r(θ) = (cr/3)·min(2h, 1.5h·tan(θ/2)), then apply the arm-span fit.
   The reach bound used for timing changes with it: r_max is
   (2/3)·cr·h.
4. **Design doc.** Rewrite these parts of `K868_field_border.md`:
   - §3.3: the tent-inversion claim is false (S2's numbers);
   - §3.4: the rule;
   - §3.7: G1 stays (Levi, 2026-10-27, on sheet E); G2 is recorded, not
     pursued;
   - §3.8: the slider mapping, the short-arm fit and the corner with no
     V;
   - the side curvature of polyline arms: make S2's Menger window the
     rule, or replace it.

   Keep it terse; history goes in the commit message.
5. **Sheets**, in the main checkout's `.claude/probes/K868/sheets/`:
   - `B2_muse_hash.png`:
     - the full frame with S1b's oracle (before) beside this stage's
       (after), every restored border circled and numbered;
     - 6x crops of up to 8 restored spots, each as before | after |
       master;
     - the oracle at cr 3 under the new mapping, and master as S1a
       captured it.
   - `F_corner_reach.png`: one muse_hash crop with several junctions, at
     cr 0, 1.5, 3, 4.5 and 6 under the new mapping.
   - A README line for each sheet. PNG only: no HTML with relative image
     paths, because the coordinator uploads the PNGs to Drive.

## Checks (report the numbers)

- The census before and after, per class.
- Every existing check on the synthetic scenes and muse_hash, before and
  after. There should be no new failures; name any check whose result
  changes.
- Corner solves on muse_hash (S2 left 1 of 342 failing).
- `npx vitest run` passes in the worktree. The K868 sheets skip unless
  `K868` is set.
- New unit tests cover:
  - the arm-span clip;
  - the no-merge check;
  - the mapping at cr 0, 3 and 6.

## Rules

- Stop rule:
  - Run `Get-Date` at the start and at every milestone.
  - Stop when steps 1-5 are done or 2 h after the start, whichever comes
    first. Steps 1 and 2 come first.
  - A compaction is not a stop. After one, re-read this brief and
    `git -C <worktree> log --oneline -10` before going on.
- Commits:
  - Commit WIP to `k883-borders` at every milestone, broken or not.
  - Never push or merge, and don't edit `LEDGER.md`.
  - If the stage stops unfinished, append a `## Handoff` to this brief
    in the worktree and commit it.
- Never run `npm run build` in the main checkout.
- Never touch processes you did not start, never use Levi's Chrome
  profile, and don't upload anything to Drive.
- Use PowerShell for local commands. Read code through the shell:
  `Select-String`, then `Get-Content <file> | Select-Object -Skip <n>
  -First <m>`. Use the Read tool only right before an Edit.
- Helpers only if needed: `model: sonnet`, a 1 h cap and these rules.
- The final report gives:
  - what was built;
  - the census before and after;
  - the rule as built;
  - what is left;
  - a `Ledger items` list (follow-ups, residuals, decisions for Levi);
  - K883's handle fields (branch, last commit, evidence, next).

## Handoff (coordinator, from the agent's report; 2026-10-27 09:26)

(Agent a9e0698a57556c168 of claude session bf876705, opus. Steps 1-5
were done inside the cap; the full suite passed at `d08820be` (178
files, 2363 tests). Its branch `k883-borders` merged as `5048670e`.)

**Built.** `borderCensus` (a thread side is missing when it should show
and is not inked; it should show unless an over pass covers it or its
own junction's union holds it; each missing stretch is classed (a)-(f),
and the census also counts shifted outlines and extra ink) and checks
#15 (no group holds both passes of a crossing) and #16 (an over pass
keeps both borders through the crossing) in `src/render/field/checks.ts`.
The rule in `oracle.ts`: `buildSpans` with `spans: "k883"` by default
(`"s2"` keeps the old one), `armCaps`, the corner fit, the corner with
no V and the `cr` mapping (`cornerRadius`, `cornerRadiusMax`; `webCap`
is gone). Six tests in `test/render/field/k883.test.ts`. §3.1, §3.3,
§3.4, §3.7, §3.8, §6 and §8 of `K868_field_border.md`. Last commit: #15
read three shallow kink loops (2-14°) as joined, because its window
(h·cot(θ/2) + h) was longer than half the loop; on a kink a member now
counts for its nearer pass only.

**Census**, missing border samples over the 12 real scenes, 1540 -> 208.
By class: (a) a crossing inside a cluster's span 374 -> 0, (b) clusters
merged 561 -> 0, (c) a failed corner 20 -> 0, (f) other 585 -> 208:
g41_def_tw64 62, muse_hash 60 (27 stretches), g41_user_tw64 23,
g41_ring_tw64 22, def 14, ring 13, muse_default_tw 7, the rest 0-3.
muse_hash: shifted outlines 90 -> 13, extra ink 13 -> 22, clusters 48 ->
84 (the cuts split them), 151 corners fitted.

**Checks.** Synthetic 76/83 -> 86/86 (acute20 #2, j_pair_cross #7, #15
and #16 now pass; j_pair_cross #2 fails in both modes). muse_hash keeps
every status (#2-#7, #9.1, #11, #14, #15, #16 fail; #8, #9 pass): #2
Infinity / 90° -> 26.75 px / 86.6°, #6 20.96 -> 16.60 px, #7 239 -> 114
of 700, #9.1 3.04 -> 1.60 px, #11 and #14 310 -> 349 of 350, #15 302 ->
349 of 350, #16 20321/21208 -> 22927/22992. Elsewhere #14 and #15 pass,
and #16 fails slightly on 9 scenes (at most 65 samples). Corner solves:
muse_hash 341 of 342 (j58/1, no V, now the union of its arms); 1-2
failures a scene elsewhere, unchanged and not the no-V kind.

**Left** (ledger K891 and K898-K900):
- #15's crossing 292 on muse_hash is a real failure. Its over pass
  (chain 84) lies in no span; the same-chain rule (σ 3.14h) links it
  through chain 84's own samples to a cluster-68 arm (j123, j139, j140)
  5h further on, and cluster 68 holds the under pass. At this 47° angle
  the cut looks only 2.8h past an arm's end, short of σ's reach. Pad the
  cut by σ, or keep same-chain joins out of a cluster holding the other
  pass (`.claude/probes/K883/x15.ts`, `x15_muse_after.log`).
- The 208 "other" samples have no named cause; the census counts, it
  does not explain. `diag.ts` traces one sample.
- Extra ink rose on muse_hash (13 -> 22) and g41_user_tw64 (2 -> 14);
  the census should record positions. Sheet F (coordinator's look): a
  spur at cr 3, hairlines and a thick seam at cr 4.5 and a speck at cr 6
  where an arm is cut short.
- #14's crossing 15 on muse_hash: the S1a export holds the passes apart.
- #16 on 9 scenes; the corner solves; j_pair_cross #2 and muse_hash #2.

Evidence: `.claude/probes/K883/` (census/, census.ts, census_all.log,
checks_ab.ts, diag.ts, x15.ts, jpair.ts, sheets.ts, inspect.ts,
spots.json, crops/, look/, logs) and
`.claude/probes/K868/oracle/muse_hash_k883/`. Sheets B2, F and
K883_worst12 with the README are on Drive `K868/sheets/`.
