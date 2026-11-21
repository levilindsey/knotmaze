# K1482 stage 8: rp=gf's border faults on Levi's link, the crossing-gap family (Claude agent stage)

Read `### Handoff K1482 s7` in `docs/design/K1482_s7_borders.md` whole, and the bar in
`docs/design/K1482_levi_link_borders.md` (Levi's approved look: at junctions and under-tail ends the over
thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch, sliver, break or stray dash; gf's
border look itself stays as it is, and the Crossing fade keeps acting on the outline as K1492 made it).

**The scoreboard is the sweep**: link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) at rest, border
look, 327 sites, faulted count by your own eyes on the 4x tiles. Master after stage 7: 41
(`.claude/probes/K1482/out/s7/classes.txt`). 17 of them are this stage's: the look's crossing gap (`lkGap`,
`lkCut`, `gapWindow` in `src/render/gpu_field/gf_look.ts`) cuts the border outline where today's renderer
draws it whole. Dots j2 j88 t1s t24s t46e; ticks j49 j55 j87; stubs j36 t79s; dash t39s; breaks j22 j29 t65s;
pocket t80s; wedge t81s; sliver t70s. Stage 7 showed each one changes when the gap is patched off
(`.claude/probes/K1482/s5/patch/nogap.json`; sheets `out/s7/gap_tiles_00.png`, `rest_tiles_00.png`).

## Not yours

- K1490's 22 sharp-V and notch sites, K1485's short tails, K1470's j71 seam, j64's pinhole: leave them.
- The parked home build (branch `worktree-agent-ad03e8b65a2afa540`): do not cherry-pick it.
- The fill look (`tlk=fill`) and today's renderer: no pixel of either may move.

## Do, in this order

1. **Split the family by cause.** For each of the 17 sites print, at the fragment's pixels, which gap window
   cuts the outline (its crossing or joint, its two ends, the kept fraction) and what today's renderer does
   with the same window (`src/render/ribbon/crossing_gaps.ts`). Stage 7's reading: dots and the dash are
   short islands of outline between two cuts; ticks and stubs are cuts at junction joins, not crossings,
   leaving a faded tip; breaks are cuts where no over thread is visible. Muse's K1502 (Handoff 26H in
   `docs/design/K1464_muse_batch26.md`) names another cause for stubs past a crossing, the surface key order
   with the pin key windows hands-off: tell the two apart at j36, t79s, j49, j55, j87 first, and leave to
   K1502 what is its.
2. **Fix one cause at a time, the largest first**, each its own commit: a count that fails on master (dark
   outline pixels missing against today's renderer in the site's box, or island components), the fix, the
   count passing, 4x tiles today | master gf | tip gf at every link A site whose screen changed, each looked at
   and named. No site clean on master turns faulty.
3. The Crossing fade still works: `.claude/probes/K1492/dragcheck_b.mjs` (border) and
   `.claude/probes/K1458/dragcheck.mjs` (fill) pass; at `fl` 0 and 1.2 the outline at three ordinary crossings
   is unchanged against master.

## Done

- The sweep's faulted count on your tip, by class, by your own eyes, with the class table.
- The fill look: 0 px against master on link A in the same physics hash (fff8c9e5).
- The K1436 bar with `STRICT=1`, once, at the end (`pwsh -NoProfile -File .claude/probes/K1436/k1436_bar.ps1
  -Ref <tip> -Base <your starting commit> -HomeFlag 1 -Scenes ring,def,muse_hash,g41_user_tw64 -Port <p> -Tag
  k1482s8`): no new find, or each one shown at 4x and named; a scene's two captures share a physics hash.
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. If a fetch
  fails, retry a few times, then carry on from what you have.
- Files: `gf_look.ts` (the gap functions and the border composite's use of them), its tests, and the look's
  uniforms in `gf_pass.ts` if a fix needs one. Others at work: Muse batch 26 in the main checkout (the frame
  time on link A, then Run K: the marker gap's fade, also in `gf_look.ts` but in the marker code). Keep the
  diff small, stay out of the marker gap, and rebase on origin/master before the handoff. Do not change any
  file in the main checkout.
- **Time.** The look program compiles for 15-120 s on a cold profile and again after every shader edit: batch
  edits, warm each profile once per link, capture link A with `.claude/probes/K1482/cap.mjs` (its `PATCHF`
  patches the full program without a build, good for trying a rule before writing it), and keep the last 35
  minutes for the bar, the hold check and the handoff.
- **Memory and disk.** One Chrome at a time, at most two preview builds (`scripts/preview.ps1 -Port <p> -Ref
  <commit>`; it needs the worktree's node_modules complete), profiles under `$env:TEMP\k1482s8-*`, each
  deleted as soon as you are done with it. Before each build or Chrome launch wait in ONE blocking loop (15
  minutes at most) while `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is under 8 GB.
- Captures of one build differ load to load by tens of thousands of 1-2 level pixels: compare frames in the
  same physics hash and count dark-ink pixels in a site's box, not whole-frame differences.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5760-5779. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock (Muse may hold it; its run does not stop yours).
- Commit WIP at every milestone, broken or not. Stage probe files with `git add -f` on the exact files or on
  your own new directories `.claude/probes/K1482/s8` and `.claude/probes/K1482/out/s8`, never on
  `.claude/probes` as a whole, and never raw frames. Never push. Never edit LEDGER.md. Never use bare
  `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s8` here, commit, and report: the sweep's faulted count by class, the sheets' paths (each
site named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle
fields.

### Handoff K1482 s8

Claude agent a453ce852efbe1ae6, 10:58-12:58 (2026-11-18), branch `worktree-agent-a453ce852efbe1ae6`, rebased on
origin/master f8d5c07d (only LEDGER.md and docs moved upstream). Probes in `.claude/probes/K1482/s8/`, results
and sheets in `.claude/probes/K1482/out/s8/` (raw frames in `out/s8/raw/`, untracked).

**Sweep: 41 on master -> 36 on the tip** (`out/s8/classes_tip.txt`, by eye on 4x tiles): wedge 10, notch 9,
sliver 6, tick 3, break 3, dot 2 (j64's pinhole, PIN; j88, GAP), stub 2, pocket 1; by owner
K1490 22, GAP 12, K1470 1, PIN 1. This stage's family: 17 GAP sites -> 12.

**Cause A, fixed (fix A + the split; `src/render/gpu_field/gf_look.ts` `lkGap`).** Inside a gap window the bake
names (`sl.x >= 0`), master cut the under thread's outline with EVERY higher-key piece; today's slot cuts with
its own crossing's over pass alone. A tucked tail's host (a fused joint, no crossing) therefore cut a short
island out of a neighbour's outline: dots j2/t1s (one dot, both tiles), t24s, t46e and dash t39s. Fix A: inside
a baked window only that crossing's over thread (`PC(j) == cS`) cuts. It also moved 975 px of the fill look
(thin casing slivers beside crossings, `out/s8/fill_diff.png`), so lkGap now returns `vec2(outline gap,
coverage gap)`: x (fix A's) cuts ink and the border's flag lane (lkCo.a), y (master's, every higher piece) cuts
cov and lkHiA, all the fill look reads. Commits: 5b7a149f fix A, 22bd59d9 fix A confirmed on screen, 6dd647e0
the split, d04c9c27 the split confirmed.
- Numbers, link A at rest, hash fff8c9e5: fill look (tlk=fill) 0 px vs master; border frames at fls 0 / 1.2 /
  0.14 0 px vs fix A's own build (so the split leaves fix A's border bit for bit); fix A vs master: 25 changed
  blobs, 0 px of ink lost, 159 px gained, 14 sites change (all named in `out/s8/fixA.txt`); islands in a 64x64
  box, today | master | tip (`out/s8/islands_th73.txt`, TH 73): j2 0|1|0, t1s 0|1|0, t24s 0|2|0, t39s 0|1
  (52 px)|0; t46e's dot is lighter than the threshold (by eye only).
- Crossing fade: K1458 `dragcheck.mjs` (fill) PASS at 0 / 0.5 / 1.2 / 0.14 on the split build; K1492
  `dragcheck_b.mjs` (border) PASS on fix A's build (border frames identical to the split's; not re-run on the
  split build); ordinary crossings x84 x88 x52 0 px vs master at fl 0, 1.2 and 0.14.
- `hold.mjs` (K1450) 60/60 PASS warm on link A (edges min 6854 / max 9593); `npm test` green (254 files, 3174
  tests).
- The K1436 bar (STRICT=1, -Ref 6dd647e0 -Base 850b7f58, ring, def, muse_hash, g41_user_tw64): **PASS, new 0,
  grown 0, gone 0**; every scene's base and ref captures froze at the same physics hash (`out/s8/bar.txt`). The
  bar's own run waited on Muse's perf lock (26K) at the ref's captures, which this brief says not to wait on, so
  its ref half ran by hand on the same served build with `s8/bar_ref.ps1` (the bar's lines and its compare, no
  lock wait).
- Sheets: `fixA_m0..m4.png` (the 17 GAP sites, master | tip | diff, 4x), `fixA_blobs_0..3.png` (every changed
  blob, named), `fixA_t18s.png`, `fixA_j88j2.png` (today | master | tip | diff), `j88_zoom.png` (nogap | master |
  tip, 10x), `fill_diff.png` (fix A's fill leak before the split). Attribution (e67203c6): `m_a/m_b.png` and
  `split_a/split_b.png` (the 17, today | nogap | master [| onlyslot]), `os_others_a/b.png` (the other sites
  onlyslot moved), `var_*.png`, `mz_*.png`, `ov_b*.png` (window overlays: centrelines, crossings, joints).

**Cause B, open (12 GAP sites): the cut next to a fused joint.** j49 j55 j87 (tick), j36 t79s (stub), j22 j29
t65s (break), t80s (pocket), t81s (wedge), t70s (sliver), j88 (dot). At a crossing 0.45-1.4 arc from a fused
joint, the gap cuts the under arm's outline back by margin + fade; past the cut the arm's outline resumes only
as a detached faded tip at the joint. The nogap patch (`s8/patch/nogap.json`) joins every one of them to the
look today's renderer draws (`b_a/b_b.png` today | nogap | master; `b_look1.png` stretched today | nogap | tip |
diff at j49 j55 j87; `b_look3.png` today | nogap | tip at j49 j87 j55 j36 t79s), so at j36 t79s j49 j55 j87 it is
the gap's, not K1502's key order. Not attempted for time. What is known: 156 of link A's 350 crossings lie
within 1.5 arc of a fused joint (`s8/xpos.ts`), so a blanket "no cut near a joint" is far too broad; the rule
has to name the arm whose outline ends at the joint (inferred from the tiles, not traced in
`crossing_gaps.ts`: today's renderer keeps that outline running into the joint). Border-only, in the x lane,
so the fill look stays put.

**Not done:** cause B; dragcheck_b re-run on the split build.

Next: cause B in lkGap's x lane (border only), from `b_look3.png`'s five sites, then the other seven.
