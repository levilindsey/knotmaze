# K1482 stage 27: t81s's tick and t4s's step, second attempt (K1527; Claude agent stage)

**Queued behind stage 26** (`docs/design/K1482_s26_crossing_in_ball.md`): one code agent at a time in
`src/render/gpu_field/`. Start only when the coordinator says the stage before it has landed or stopped.

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
The 14 sites he named on link A are in `The sites` of `docs/design/K1482_s20_wedges_notches.md`.

Stage 24 found the cause at both sites and fixed neither. Read `### Handoff K1482 s24` in
`docs/design/K1482_s24_tick_step.md` and the GAP JOINT FLAGS lines in `.claude/rules/render-gpu-field.md`
first; its probe tools and sheets are in the s24 worktree
(`.claude/worktrees/agent-a1ac1faa36f86dcc4/.claude/probes/K1482/s24` and `out/s24`; copy what you use,
change nothing there).

- **t81s** (wedge; the tick at the top). Stage 18's under rule in `gapJointFlags` flags chain 45's +1 side
  where it passes under chain 9 (slots 348-367, the inner side of a sharp bend, where the outline's points
  pile up at the V). Gating that rule past the over thread's cut reach removed the tick and opened the
  outline at about 270 joint corners on link A (3902 px at 274 places: j63, j15, j148, t57e; backed out in
  9b98e47b0). The over thread's distance, joint membership and an outline fold-back test do not separate
  t81s's flags from those corners'. Untested idea: the tick is the step where one side's flag switches
  between neighbouring slots, so blend across the step instead of dropping the flag. First step: log each
  slot's flags at crossing 9:45, plot them on the t81s crop, and see whether the tick's square end falls
  where a flag switches.
- **t4s** (notch; the step at the bottom right). Chain 4's arm-extension end sits on chain 66's centre
  line, and its disc hides part of chain 66's -1 band, which leaves the step and a hole (at 2177,634 on
  stage 24's frame). Untried: (a) in the hiding loops of `eval.ts` and `gf_glsl.ts`, ignore another piece's
  hiding deep inside the band; (b) move the arm-extension end off chain 66's centre line.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). The border look draws the
outlines; `&tlk=fill` the fill. The second corner try (stage 23) is on by default since K1524 (Levi,
2026-11-19: "take the rounding"); `&gfk=0` turns it off. A Node build leaves it off unless env `GF_KRETRY=1`
(K1536): set that for a Node probe, and before the bar so its mirror scan matches its pages.

## The goal

On link A as it loads (the second try on) and with `&gfk=0`: t81s's tick and t4s's step and hole are gone, the outlines there run on
at their own width, and the fill does not move. No outline anywhere on link A loses ink at a joint corner
(stage 24's failure, and stage 18's before it). Nothing else on link A or on the bar's four mazes gets worse.
You own the technique. The cause is known: a stage that ends with more diagnosis and nothing in `src/` has
not reached the goal while time remains. The two sites are independent: land one if the other resists.

## Done

- **By eye**, both sites, context crop and detail crop, today | new, as it loads and with `&gfk=0`.
- **Link A**, loads of one state and one view (pin the background clock; stage 21's handoff, `The 76,609 px
  fill difference`; report the floor first), made **before** you commit anything as a fix: every place
  outside the two sites where the border look changes is counted, with the count of places that only lose
  ink given separately; the ten largest are on a sheet (surrounding threads with a red box, then the box
  closer; today | new) and judged by eye; the fill look 0 px, or each place named. The Node mirror has no
  gap cuts, so it cannot stand in for this diff.
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` origin/master's SHA, `-Tag k1482s27`: new 0 and grown 0; each
  gone find shown as a fault the fix removed.
- Under the perf lock on your tip: `hold.mjs` 60/60 on link A; `.claude/probes/K1482/s15/panelopen.mjs`; both
  dragchecks (they wait 180 s for a redraw, `WAITMS`; a new Chrome profile's first redraws take 30 to 60 s);
  `npm test` green (a pin that moves is re-frozen in the same commit and named in its message).
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`.
- The commits on your branch, in landing order, each green.

## How to work

`git merge origin/master` in your worktree first. Then as stage 24's `How to work`, with these changes:
ports 6150-6169, profiles `$env:TEMP\k1482s27-*`, probe directories `.claude/probes/K1482/s27` and
`.claude/probes/K1482/out/s27` (untracked: do not `git add` raw captures or dumps);
`.claude/probes/K1482/s23/run23.ps1` in the s23 worktree (`agent-a5016731195d015ff`) is the four guards as
one sequence. Commit WIP at every milestone, broken or not, and add two or three handoff lines here each
time. Read code through the shell (`Select-String`, a range of `Get-Content`); use the Read tool only on a
file you are about to edit.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. A compaction is not a
stop: re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s27` here, commit,
and report: the commits to land by SHA in order, the numbers, the sheets' absolute paths, a `Ledger items`
list and K1482's handle fields. Never push, never edit `LEDGER.md`.

### Handoff K1482 s27

- t4s: eff52514d (src). Chain 66's -1 outline point q sits in a shallow own fold (pieceD(66) 0.37-0.38 < h) and
  chain 4's arm-extension end disc (c4 [0,3], centred on 66's spine, radius h) partly buried it: the step and the
  pinhole. Fix: another piece m buries a side point only past its own fold (m's distance + fo, fo faded out over
  2-4 aa of fold depth: unfaded, j58's 0.14 fold drew a stray line in a fill). GPU, link A, loads of one state
  (floor m vs m: 0 px border and fill, on and gfk=0): t4s's hole and step gone; outside the two sites 5 places
  (on) / 4 (gfk=0) change by 1 px each, all ink gained, 0 lose ink (j38's pinhole filled, the rest invisible);
  fill 0 px. Sheets: `.claude/probes/K1482/out/s27/sheet_t4s*.png`, `sheet_places.png`.
- t81s: no fix (`.claude/rules/render-gpu-field.md`, t81s entry): its tick pixels are unfolded, so the fold shift
  leaves it; all slots k348-370 of crossing 9:45 carry bits 3, so a flag switch cannot separate it. Next: run
  45's +1 in-leg on from its corner to chain 9's band (a corner, not a cut), then the short out-leg can go.- Checks on the tip (src = eff52514d): the bar (STRICT=1, -NoPerfLock, ring/def/muse_hash/g41_user_tw64, base
  df4506594) PASS new 0 grown 0 gone 0; under the perf lock hold 60/60 on link A and 60/60 with gfk=0, panelopen,
  dragcheck_b PASS, dragcheck PASS. npm test in that sequence: 3195 passed, 3 failed, all in
  gf_k1482_switch.test.ts, because run27.ps1 had set GF_KRETRY=1 (the Node default-off pins); without it that file
  is 7/7. Full outputs: `.claude/probes/K1482/out/s27/raw/guards/*.txt` (run27.ps1 now clears GF_KRETRY first).- The clean npm test rerun (GF_KRETRY unset) never got the perf lock (muse-26Z held it 00:39-01:22+, two waits gave
  up): next session runs `npm test` on this tip first, then lands eff52514d and 2097f737a+ in order.
- Left: t81s (above); the preview builds are stopped and removed; this worktree's node_modules junction is kept.