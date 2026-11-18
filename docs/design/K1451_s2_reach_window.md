# K1451 stage 2: the reach window in src (Claude agent stage)

Stage 1 (`docs/design/K1451_crossing_ties.md`, read it whole, Handoff K1451 above all) classified rp=gf's
crossing-tie finds and found one candidate that clears most of them in the CPU probe: **rck1.15**. This stage
builds it into `src/` and verifies it on the GPU. The bar is Levi's: at a crossing or junction the over
thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch, sliver or smear.

## The candidate (from Handoff K1451; probe code `.claude/probes/K1451/k1451_sev.ts`)

Each pin's depth window, per side, is max(0.658, 1.15 x the arc along the pin's chain over which the partner
pass's centreline stays within 2h), so the depth hat spans the whole ribbon overlap of a shallow or curved
crossing. It feeds the KEYS only (the depth ordering between overlapping threads); `member()` / `homeRamp`
keep today's depth (applying it there too adds 216 strays at junction homes: rch1.15, failed).
Probe census at `gfh=1`: all 2434 -> 2351, tie 176 -> 35, ramp 192 -> 253 (52 of the ramp rise are tie finds
relabelled with the same pixels, not new ink; 10 finds are new, 209 px). Flag off: all 3964 -> 3198, tie
1744 -> 901. Mirror sheets `out/fix_a.png`, `out/fix_b.png`: spots 1-8 fixed, 9-12 open (the relabels),
spots 5 and 7 change a nearby group patch's shape.

## Do

1. `tables.ts`: a per-pin window per side, found by walking both threads together from the crossing (the
   probe's brute force is too slow for the build; measure the build time before and after). Pack it into free
   PIN texel slots.
2. Mirror it in `eval.ts`, the field evaluation in `gf_glsl.ts` and the pin bounds in `gf_keys.ts`, for the
   depth ordering only. It applies with the `gfh` flag off and on; the flag-off pins
   (`test/render/gf_home_glsl.test.ts`, the tables digest) move: update them and name what moved in the commit.
3. Wire `K1438_FL` into the scan (`k1451_sev.ts`'s `loadEv`), so the scan can sweep the fade.

## Done

1. The scan on your src equals the probe's rck1.15 within 2% per class (all, tie, ramp) at `gfh=1` and flag
   off; find by find against master: no tie find worse, and each new find (the probe had 10) cropped at 4x on
   the GPU and judged against today's renderer. A new find that draws ink today does not draw is a failure:
   fix it or report it with its crop.
2. A 4x GPU sheet (today | master gf | your gf) of the twelve spots of `fix_a.png` / `fix_b.png` under
   `.claude/probes/K1451/out/s2/`, each named fixed or open, spots 5 and 7 looked at closely.
3. The scan at fade 0 and 1.2 (after Do 3): no class above master's at the same fade.
4. The bar census (`k1407c1_bar.ps1`, exceptions file) no category above master's, counting a tie find
   relabelled ramp with the same pixels as unchanged (show the matching); c5's 29 spots none worse; GPU census
   equal to the mirror. Stop preview servers before the GPU census and run no CPU census beside it.
5. The new tables digest, the pins updated, pooled builds equal to cold (`k1362t2_digest`).
6. `hold.mjs` (`.claude/probes/K1450/`) 60/60 on `?3&xp=off&am=instant&rp=gf` and
   `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`. `npm test` green.
7. Bench last and alone (`k1362c1_bench.ps1`, perf lock: wait for it inside one blocking command, never
   overwrite another owner's lock): GPU and work p50 within 5% of master, and the tables build time reported.
   If the machine is too loaded for a clean round, say so and report the round you got.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `tables.ts`, `eval.ts`, `gf_keys.ts`, `gf_pack.ts` if the PIN layout needs it, the field evaluation
  in `gf_glsl.ts`, their tests, the census tools and `.claude/probes/K1451/`. Stay out of `gf_look.ts`,
  `gf_pass.ts`, `gf_app.ts`, `gf_reveal.ts`, `gf_explore.ts` (Muse batch 25 and the K1460 agent).
- Not in this stage: the cfg cause (90 finds: the weighted configuration mix in `member()` / `homeRamp`
  fades the outline into dashes). Report what you learn about it.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5540-5559. Headed, real-time Chrome, never `--virtual-time-budget`.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files, but not scan dumps you can
  regenerate: keep the tables and sheets). Never push. Never edit LEDGER.md. Never use bare `git stash`.
  Never touch the phone.
- Helpers run on sonnet for mechanical work (scans, sheets), with this stop rule.
- Own the technique: if the walk gives windows that differ from the probe's, find out which is right by the
  crops, not by the count.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1451 s2` here, commit, and report: what holds, the sheets' paths (each spot named fixed
or open), the numbers, a `Ledger items` list and K1451's handle fields.
