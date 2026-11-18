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

### Handoff K1451 s2

Agent: claude session 01SUPGULDxvE5gKXozfaFaFG (worktree agent-a53218bf2f47c89c2, branch
`worktree-agent-a53218bf2f47c89c2`), 12:04-13:55 on 2026-11-17. Commits: 153f8db9 (windows in tables, eval,
glsl, pack), f32b820d (re-pin), 3857450c (sheet and matcher probes, sheets), c8f6c396 (home-only gate),
plus the handoff commit.

**What is in src.** `tables.ts` builds `pinWL` / `pinWR` per pin, per side: max(win, 1.15 x the arc over which
the partner pass stays within 2h) (`GF_REACH_K`, `pinReach`). `eval.ts` and `gf_glsl.ts` cut each key's hat at
its side's window; `gf_pack.ts` carries them in the PIN texel's z/w. member() / homeRamp keep today's depth.
The windows apply only with home membership (`opts.home ?? GF_HOME`, i.e. `gfh=1`). With home off, the shipped
default, every window is `win` and the keys are master's: the first cut applied them in both modes, and the
home-off bar census went stray 16 -> 231, hard 0 -> 6 (member() without home splits a crossing's ribbons into
blocks the wider hat re-orders); c5's spot muse_hash:5.88:8.50 went 1243 -> 5450 px.

**Done items.**
1. Scan at gfh=1, flag off: src 2351/35/253 (all/tie/ramp) = the probe rck1.15 exactly; master 2434/176/192.
   Find by find (`k1451_match.ts`): 0 new finds, 83 gone, no tie find worse. Holds.
   The home-off run before the gate read 3196/894/120 against the probe's 3198/901/115 (ramp 4.3% off), with 2
   new tie finds the probe shows too; with the gate home off is master's scan.
2. Sheet (home on, 4x GPU, columns today | master gf | this gf): `.claude/probes/K1451/out/s2/sheet_a.png`
   (spots 1-8), `sheet_b.png` (9-12), `sheet_57.png` (close-ups of 5 and 7). Spots 1, 2, 3, 4, 5, 6, 8 fixed
   (master's grey smudge gone, the crossing reads as master's over/under). Spot 7: the ink is fixed, the chain
   colour is open (pink -> lilac with a leftover pink fragment). Spots 9-12 open (relabels: dark wedges where
   master had grey slivers). GPU vs mirror on these tiles reads 1.0 in master and mine alike (pre-existing).
3. Fades (home on): fade 0 2408/32/21 vs master 2523/182/21; fade 1.2 2150/0/493 vs master 2236/86/496. No class
   above master. But fade 0 has 16 new plain rthin finds (the probe has the same); the GPU crops (`new_fl0.png`)
   show larger dark crescents than master at g41_def_tw64:34.66:13.94 and :6.26:32.46 and a notch at
   g41_user_tw64:16.20:5.30. Holds by count, open by look.
4. Bar census. Home off (shipped): 16/0/11/14 = master's, 141 = 141 finds, identical; c5's 29 spots identical to
   master (`check29_mine_gated.txt`). Home on (GF_HOME=1, `bar_home_k1451mh_k1451s2h.txt`): master 14/0/11/399,
   mine 21/11/11/393: does NOT hold. 7 new stray (ring and g41_ring_tw64 near x68: 1987 and 3687 px;
   muse_hash near j50 2943, j36 1911, x301, j78) and 11 new hard edges (muse_hash j149, j126, j78, j124, j152,
   j53; g41_def_tw64 j118, j119; g41_user_tw64 j71, j35): list in `bar_home_new.txt`. Master's own home-on
   census has 399 broken, so the home flag is not at the bar yet either. GPU census (home off, `k1407c1_gpucensus.ps1 -Tag k1451s2g`): only group 1 (g41_def_tw64, user_tw42.lightpaper) wrote output (4/0/1/13, `.claude/probes/K1362/out/s2/census_k1451s2g_1.txt`); the other five groups wrote nothing and the merge did not run (cause not looked at). Not done. Home off builds master's tables, so it should equal c5g.
5. Tables digest: all b0fc8ce3... (297 pooled builds, 0 mismatches). Pins: flag-off pack j_cross db23c268...,
   k42 93cc931f... (the PIN texel's z/w hold win where master had 0). Holds.
6. Hold: 60/60 on both links (`?3&xp=off&am=instant&rp=gf` and the gfh=1 link). `npm test` green (251 files,
   3114 tests). Holds.
7. Bench: not done. One try (`k1362c1_bench.ps1`, master build on 5542 vs c8f6c396 on 5543, local `vite build`s in `$env:TEMP\k1451s2_prev2`) failed on its first URL at the 120 s "leave loading" wait; the same URL loaded fine in `diag_screenshot.mjs` after. Out of time for a second try. With home off the shipped path differs from master only by the window fill and the packed z/w, so a change is unlikely, but it is unmeasured. Tables build time (`k1451_buildtime.ts`, home on, 12 scenes, median of 7): 156.8 -> 218.6 ms
   (+39%); fat 4.4 -> 17.5 ms. Home off adds only the window fill.

**Tried and fell short.** Windows in both modes (bar census, above). Nothing learned on the cfg cause.

**Next.** Find why the wider hat makes stray / hard ink at home-on crossings near x68 (ring scenes) and the
muse_hash junctions above: crop them on the GPU against master home-on; then decide whether the windows need
member()'s depth to match (the brief kept member() at today's depth) or a narrower reach. Cut pinReach's cost
(fat +295%) before home goes default.

