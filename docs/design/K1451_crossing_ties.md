# K1451: rp=gf's crossing-tie ticks, dashes and wedges (Claude agent stage)

The goal and Levi's bar are those of `docs/design/K1407_c1_bar.md` (read its first section): at a junction or
under-tail end the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
Levi, 2026-11-17, on rp=gf live: "I still see plenty of border artifacts." rp=gf's junction spots being truly
correct is the most important thing in the project right now.

## Where it stands (master c5fc87d1, live)

- K1449's scan of `gfh=1` at the default fade reads 368 finds; **246 are crossing-tie wedges and dashes that the
  flag-off renderer draws too** (ledger K1451; Handoff K1449 in `docs/design/K1449_home_leftovers.md`, tools
  `.claude/probes/K1449/`, scan table `out/map2/table.txt` in worktree `agent-a02a2023ec92cd84f`).
- One of them on the live page, an ordinary load of `?3&xp=off&am=instant&rp=gf`: **a dashed dark tick across
  the top of the blue kink loop**, at every Crossing fade value, with and without `gfh=1`; today's renderer
  draws a clean thread there (`.claude/probes/K1458/live/zoom0_a.png`, `zoom_a.png`: today | gf | gf + gfh 1).
  The same crops show a small notch where the pink arm meets the blue thread (lower right).
- Their cause is composite()'s equal-depth tie blend over the zt window (Handoff c5 in
  `docs/design/K1407_c5_bar.md`: the smudges, what was tried and why each failed; its "Next": find what
  rp=outline keys on for an own piece whose arm is cut at the root, and port that as the tie's discriminator).
  A kink loop is one chain crossing itself, so start there: the tick sits where the loop's two passes tie.

## Do

1. Reproduce the kink-loop tick and the notch in the CPU mirror (`eval.ts`) and name the pieces and the term
   that draws each. Then classify K1449's 246 by cause (how many share the tick's, how many the notch's).
2. Fix the causes in `tables.ts` / `eval.ts` / the field evaluation in `gf_glsl.ts`, the largest class first,
   flag off and `gfh=1` alike where the code is shared.
3. Keep what holds: c5's 29 spots, the bar census, GPU = mirror.

## Done

1. The kink-loop tick and the notch are gone on an ordinary load of a local build of your branch, at fade 0,
   0.14 and 1.2, with and without `gfh=1`: a 4x sheet (today | master gf | your gf) under
   `.claude/probes/K1451/out/`. Look at every tile yourself next to today's.
2. K1449's scan at the default fade: the crossing-tie class at most half of 246, none of the other classes
   higher; ten of the fixed finds on a 4x sheet (master gf | your gf | rp=outline), looked at.
3. The bar census (`k1407c1_bar.ps1`, exceptions file) no category above master's; c5's 29 spots none worse;
   GPU census equal to the mirror. Stop preview servers before the GPU census and run no CPU census beside it.
4. If `tables.ts` changes: the new digest, the pins updated, pooled builds equal to cold (`k1362t2_digest`).
5. `hold.mjs` (`.claude/probes/K1450/`) 60/60 on `?3&xp=off&am=instant&rp=gf` and
   `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`. `npm test` green.
6. Bench last and alone (`k1362c1_bench.ps1`, perf lock: wait for it inside one blocking command, never
   overwrite another owner's lock): GPU and work p50 within 5% of c5fc87d1. If the machine is too loaded for a
   clean round, say so and report the round you got.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `tables.ts`, `eval.ts`, `gf_keys.ts`, the field evaluation in `gf_glsl.ts`, the census tools and
  `.claude/probes/K1451/`. Stay out of `gf_look.ts`, `gf_pass.ts`, `gf_app.ts`, `gf_reveal.ts`,
  `gf_explore.ts` (Muse batch 25 and the K1460 agent).
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5540-5559. Headed, real-time Chrome, never `--virtual-time-budget`.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit
  LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Helpers run on sonnet for mechanical work (scans, sheets), with this stop rule.
- Own the technique; do not stop at the cause. Measure a discriminator in the CPU mirror and the census before
  it goes into src. For anything open at the stop line, report what you tried and why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1451` here, commit, and report: what holds, the sheets' paths (each spot named fixed or
open), the numbers, a `Ledger items` list and K1451's handle fields.

### Handoff K1451

Stopped 2026-11-17 ~12:05 (started 11:10), before the cap: no src change is ready, and the one candidate
that meets the tie number needs a geometric pass in tables.ts, the GLSL and gf_keys, plus the full
verification round, which does not fit the remaining hour. Nothing in src/ changed; master's census, digest,
hold and bench numbers stand. All evidence is under `.claude/probes/K1451/` (committed with -f).

**The tick and the notch are not the field.**
- Tick (dashed dark tick across the blue kink loop, `?3&xp=off&am=instant&rp=gf`): drawn by K1458's window
  term in gf_look.ts (lkGap's `uGwLive > 0.5 && wm > -pxw && g < 0.999` block, lkGwSlot / lkNearOn, and
  lkCut's `fs` factor). Pre-K1458 build 48d1b37c draws the loop clean (`cmp4.png`); the CPU mirror and a
  look-off render are clean. gf_look.ts is outside this brief and inside K1460's lane.
- Notch (pink arm into blue): the look's colour/fill; present in master and pre-K1458, field clean there.

**Tie-class causes** (`k1451_cls.ts`, 5x5 majority vote; src scan at GF_HOME=1, ppu 100, 12 scenes: all
2434, tie 176, ramp 192; `out/w1/cls_src.txt`, sheet `out/tie_causes.png`):
- cfg 90 finds (3584 px): configuration mixing of a ramping piece (home ramp or cap ramp): the outline
  fades by weight into straight-ended dashes at fixed-s tent edges.
- zeq 29 (2028 px): two thread pieces at EQUAL z (usually both 0) overlap past the depth window at a
  shallow crossing, so the key gap is d alone and the whole overlap smears the under outline. The largest
  per-find pixels.
- grp 33 (1868 px): a junction-group surface ties with a thread piece.
- zdiff 24 (872 px): a depth swap inside the window.

**Variants tried (probe-only, `k1451_sev.ts`; scanned with `k1451_scanall.ps1`):**

| variant | all | tie | ramp | verdict |
|---|---|---|---|---|
| src | 2434 | 176 | 192 | baseline |
| tie window 0.5 zt / 0.25 zt | 2429 / 2415 | 171 / 157 | 191 / 191 | too small |
| dz hard switch (1, 0.5) | 2425 / 2423 | 167 / 165 | 192 / 191 | smear becomes a crisp stub (`out/tie_dz.png`) |
| cfg = heaviest only | 2429 | 170 | 198 | no |
| cfg = least ink | 2422 | 102 | 247 | ramp +55, rbreak:plain 231 -> 246: fails |
| per-pin window from crossing angle (win1; sin 2h/sin) | - | ring spot 1275 -> 1210 / 1047 px | - | straight-line reach is far short of the real one |
| reach window, depth AND member (rch1.15) | 2456 | 107 | 172 | 216 new finds (ramp strays at junction homes): fails |
| **reach window, keys only (rck1.15)** | **2351** | **35** | **253** | candidate, below |

**The candidate (rck1.15):** each pin's depth window, per side, is max(win, 1.15 x the arc along the pin's
chain over which the partner pass's centreline stays within 2h), i.e. the depth hat spans the whole ribbon
overlap of a shallow or curved crossing, not a fixed 0.658. It applies to the KEYS only; member() /
homeRamp keep today's depth (applying it there too is rch1.15, which adds 216 strays at junction homes).
Pins pair with the nearest opposite-sign pin within 1h (174/174 paired); windows reach up to 3.3 (default
0.658). Census, matched find by find to src: 81 tie finds gone, 32 stay tie, 52 relabel tie -> ramp
(same pixels, 2526 -> 2495 px: not fixed, the judge now sees a ramp there), 10 relabel to plain, and 10
new finds (209 px, rthin, largest 62 px). Flag off (GF_HOME=0): all 3964 -> 3198, tie 1744 -> 901, ramp
53 -> 115. The "ramp rises" are the relabelled finds, not new artifacts, but by the letter of Done 2 a
class rose.
Sheets (CPU mirror, scene palette, not GPU; master | master's tie tint | candidate):
`out/fix_a.png`, `out/fix_b.png`, plus `out/ring_wide2.png`. Spots 1-8 (the gone finds: ring:19.63:20.34,
muse_hash:31.56:7.41, g41_ring_tw64:19.78:20.37, muse_hash:30.46:20.29, :21.86:18.64, :30.61:19.95,
:16.17:18.39, g41_ring_tw64:19.43:20.05) read FIXED in the mirror: the smear/dash over the under thread
is gone and the over outline runs on. Spots 9-12 (tie -> ramp: muse_hash:16.43:4.77, :22.38:10.76,
:5.09:8.32, :2.02:9.63) stay OPEN: the sliver/tick is still drawn. Spot 5 and 7 change a nearby group
patch's shape; look at them at 4x on the GPU before calling them fixed.

**Not measured:** the scan reads the same numbers at FL 0 and 1.2 as at the default (`out/w_fl0`,
`out/w_fl12`), because `k1451_scan.ts` only records K1438_FL in its JSON and never sets the evaluator's
fadeLength: the fade sweep was not measured (wire it in k1451_sev.ts's loadEv before trusting one). GPU, bar census, c5's 29 spots, hold and bench
were not run (no src change).

**Next (one stage):** put the reach window into src.
1. tables.ts: per pin, left and right windows (pinWL, pinWR) = max(win, 1.15 x reach), reach measured by
   walking the pin's chain and the partner pass's chain together from the crossing (both polylines are
   in vx/vy/vs; scene.crossings gives the pair), stopping at 2h separation or the next pin. The probe's
   brute force (`k1451_sev.ts`, mode reach) is O(pins x steps x samples) and too slow for the build;
   a tandem walk is O(reach / step). Pack them in the PIN texel's free slots (gf_pack: (pinS, pinZ, 0, 0)).
2. eval.ts: a keyDepth(c, s) with the per-pin windows for piece keys; member() keeps depth(). The same in
   gf_glsl.ts's field eval, and gf_keys.ts's pin bounds widen by the new windows.
3. Then the census against rck1.15's numbers, the 4x GPU sheet, Done 3-6. Separately: the cfg class
   (52 relabelled + 90 cfg finds) is member()/homeRamp's weighted configuration mix, where the over thread's
   outline fades with the under piece's group weight; a fix there is its own stage.