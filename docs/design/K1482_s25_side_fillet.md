# K1482 stage 25: where two outlines run together with no corner (K1528; Claude agent stage)

**Queued behind stage 24** (`docs/design/K1482_s24_tick_step.md`): one code agent at a time in
`src/render/gpu_field/`. Start only when the coordinator says stage 24 has landed or stopped.

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
The 14 sites he named on link A are in `The sites` of `docs/design/K1482_s20_wedges_notches.md`.

This stage takes the four sites where **two outlines converge and no corner exists**, so no corner ball is
ever built and the two strokes run together into a dark patch or a pointed V:
- **t59s** (wedge): one chain's two sides converge at a twist's foot.
- **j15** (wedge): the Z spike at the right; the +1 sides of chains 70 and 5 converge with no corner within
  30 px.
- **t58e** (notch): the second V, at centre right.
- **t23e** (wedge): the patch between two chains' sides.

Read `### Handoff K1482 s21` in `docs/design/K1482_s21_corners_rest.md` (the site table and its last list)
and `### Handoff K1482 s22` in `docs/design/K1482_s22_landable_corners.md` (the class table). Stage 21's
starting idea was a new corner kind, a side-to-side fillet. If time remains, **j41** (notch: a sharp ">" on
the right outline that a 0.26 h first-pass corner keeps; retrying it changes nothing visible) is yours too.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). The border look draws the
outlines; `&tlk=fill` the fill. The second corner try (stage 23) is on by default since K1524 (Levi,
2026-11-19: "take the rounding"); `&gfk=0` turns it off. A Node build leaves it off unless env `GF_KRETRY=1`
(K1536): set that for a Node probe, and before the bar so its mirror scan matches its pages.

## The goal

On link A as it loads (the second try on) and with `&gfk=0`: at the four sites the two outlines meet in **one clean join** (a round
or a clean point, the stroke at its own width) with no solid patch, spike, stub or gap, and the fill does not
move. Nothing else on link A or on the bar's four mazes gets worse. You own the technique. The cause is not
the finish line: a stage that ends with a diagnosis and nothing in `src/` has not reached the goal while time
remains. If the join you can build is a shape Levi has not seen (a round where today shows a point at places
he did not name), build it, count those places and show the ten largest: that becomes his look question, not
a reason to stop.

## Done

- **By eye**, the four sites (and j41 if taken), context crop and detail crop, today | new, as it loads and with `&gfk=0`.
- **Link A**, loads of one state and one view (pin the background clock; stage 21's handoff, `The 76,609 px
  fill difference`; report the floor first): every place outside the sites where the border look changes is
  counted, the ten largest are on a sheet (surrounding threads with a red box, then the box closer; today |
  new) and judged by eye; the fill look 0 px, or each place named.
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` origin/master's SHA, `-Tag k1482s25`: new 0 and grown 0; each
  gone find shown as a fault the fix removed.
- Under the perf lock on your tip: `hold.mjs` 60/60 on link A; `.claude/probes/K1482/s15/panelopen.mjs`; both
  dragchecks; `npm test` green (a pin that moves is re-frozen in the same commit and named in its message).
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`.
- The commits on your branch, in landing order, each green.

## How to work

`git merge origin/master` in your worktree first. Then as stage 24's `How to work`, with these changes:
ports 6110-6129, profiles `$env:TEMP\k1482s25-*`, probe directories `.claude/probes/K1482/s25` and
`.claude/probes/K1482/out/s25` (untracked: do not `git add` raw captures or dumps).

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. A compaction is not a
stop: re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s25` here, commit,
and report: the commits to land by SHA in order, the numbers, the sheets' absolute paths, a `Ledger items`
list and K1482's handle fields. Never push, never edit `LEDGER.md`.

### Handoff K1482 s25

- 17:34 WIP (rounding on = `gfk=1`/`GF_KRETRY=1` judged first). Causes, from the mirror (`pix25.ts`, `tr24.ts`):
  t58e's first V fails pass 0 at j10 (arm 250, chain 58's end, is 0.199 ctrl, so the feet fall outside it) and
  the retry rounds it (K208, r 0.42 h); the second V (chain 58 under chain 68's crossing) stays in both states.
  t23e: chain 7 and chain 23's start run nearly tangent (gap about 0.1 h), so two W strokes make a 2W band.
  j15, t59s, t58e's second V: two outlines converge at an acute angle; from gap 0 to overlap W the visible band
  is 2W - overlap, so a thick spike runs about W / tan(angle) past the paper tip. The retry changes none of them.
- Tried in the mirror only (`GF_SHARE` in `eval.ts`, env-gated, off = master): two surfaces' facing sides
  within G of each other keep half a stroke each, plus ink in the paper gap under G. G = W changed 45 places
  on link A, mostly the slivers Levi accepted, and left specks; G = 0.4 W left j15, t59s and t58e unchanged
  and put a round blob at t23e. Ruled out as is. Next: carry the half strokes into the overlap
  (w = (W - g) / 2 for -W < g < 0) so the band stays W through the spike.
- 18:10 STOP, NO FIX: `src/` at the tip is origin/master's (083a8cb1c). Sites, rounding on and `gfk=0`: j15, t59s,
  t58e, t23e and j41 all the same as today.
- The third corner try (9ee85c483, backed out in edd983c0f; the patch is `.claude/probes/K1482/s25/kroot25.patch`):
  where pass 1 still gives no pushable corner and an arm's cut is at or behind its root (Lcut <= 0), extend that arm
  from GF_KROOT 0.4 h. The page then held 22 more corners. Link A, border look (`gf_b2.png`, diffed at a luminance
  step of 6: its ink differs from paper by about 30 levels, so the default step of 25 reads 0): load floor 0 px
  (base_on vs base_on2); rounding on, 403 px at 19 places (t8e 53, t54e 46, t77s 38, t83e 34, t51e 28, t83s 27,
  t14e 27, t37e 26, t20e 25, t25e 19, j15 17, t7s 17, t45s 15, t38e 13, t62e 8, t19e 5, t81s 2, t36s 2, t53e 1);
  `gfk=0` 0 px. Fill 30 px > 6 (max 121) against a load floor of 183 px > 6, not attributed. By eye: j15's inner
  paper tip rounds a little, the Z spike stays, and a tick appears on its upper outline; t77s and t14e gain a tick on
  the outer outline and a lump in the joint; t54e a dark blob at a V; the rest about unchanged. Worse, so backed out.
- Also tried, reverted unlooked: retrying corners whose pass-0 radius is under GF_KRMIN h (t59s's j132 has 0.031 h
  and 0.087 h): j132 then gets 0.113 h, and 13 more corners appear elsewhere on link A.
- J15'S SPIKE IS CHAIN 70'S START, not a missing corner (`pix25.ts` on base_on, rounding on): at (1209,1240) and
  (1214,1243) the ink is chain 70's piece at s 0.00 (its first few hundredths) at d 0.96-1.27 h, group 15,
  key -0.09, while chain 5 there (s 4.02-3.88, d 0.58-0.68 h, inside its tube) is a surface of its own: its group-15
  arm is cut (ramp 0.32 at s 4.13, none from 4.02) and its key, -0.37, ranks under chain 70's. So chain 70's cap
  strokes across chain 5's paper. Next for j15, in the mirror first: (a) carry chain 5's group membership over a
  member end's cap footprint, (b) no round cap past an end rooted in a junction group, or (c) rank such a cap under
  the cut partner. Each touches every junction end on link A: diff the whole border look. Ruled out in the mirror
  (`capb25.patch`, `capdiff25.ts`, `cmp_capb1.png`, `cmp_capb2.png`): burying a surface's stroke by the tube of any
  chain that is a member of that surface elsewhere. An end-cap-only version (`pend`) changed 0 px, so the ink at
  (1209,1240) is chain 70's side near s 0, not its cap proper. Without that condition, 49 places changed: j15's spike
  goes, but the eye's outline opens at its left tip, and p1 (2137,990) loses a long outline. Chain 5's cut there is
  its crossing with chain 70's s 11.5 (the Z), so extending chain 5's membership over it would fight that crossing.
- t23e: chain 43 (both arms cut behind the root, Lcut -0.222 and -0.047) and chain 23's end run nearly tangent;
  passes 1 and 2 give r 0.018-0.031 h, under GF_KRMIN. No arm extension rounds it. t58e's second V: unchanged by
  every try.
- Checks: none ran on a fix, since none is left. The bar on 9ee85c483 and the guards were stopped when it was
  backed out (the guards had waited for the perf lock behind Muse 27B since 17:50).
- Sheets (rounding on, today | new for 9ee85c483): `.claude/probes/K1482/out/s25/ten_on.png`, `sites_on.png`,
  `sites_off.png`, `judge_ten.png`, `judge3.png`, `judge_j15.png`. Probes: `cap25.ps1` (captures), `inkd24.py`
  (cluster diff), `sheet25b.py`, `pix25.ts`, `kcheck25.mjs` (the page's corner counts per `gfk`).
