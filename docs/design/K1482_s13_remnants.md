# K1482 stage 13: rp=gf's border faults on Levi's link, the remnant beside a joint, judged on gf alone (Claude agent stage)

Read `### Handoff K1482 s12` in `docs/design/K1482_s12_reference.md` whole, then `### Handoff K1482 s10` in
`docs/design/K1482_s10_borders.md` (the pixel read) and the bar in `docs/design/K1482_levi_link_borders.md`.

**What changed.** Stages 9 to 11 tried to make gf's outline match today's renderer at 12 sites. Stage 12
showed that target was wrong at 10 of them: today draws straight fan strokes through those junctions where
gf follows the threads' curves, and gf draws more outline than today everywhere. Today's renderer is no
longer the reference for these sites. The reference is Levi's bar, read on gf's own picture: no dot, stub,
tick, break, pocket, sliver or stray dash; gf's border look itself stays as it is; the Crossing fade keeps
acting on the outline.

**The fault, on gf alone.** At a crossing 0.45 to 1.4 arc from a fused joint, the crossing's gap cuts the
under thread's outline, and between the cut's end and the joint a short piece of outline survives: a
detached, faded tip (tick, stub, dot), or the cut leaves a break or pocket in a line that should close. The
12: ticks j49, j55, j87; stubs j36, t79s; breaks j22, j29, t65s; pocket t80s; wedge t81s; sliver t70s; dot
j88 (link A `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`, hash fff8c9e5; 36 faulted of 327 on master,
`.claude/probes/K1482/out/s11/classes_base.txt`).

## Do

1. **Sort the 12 by what a clean gf picture would be there** (20 minutes): for each, on a 6x tile of master
   gf, say whether the fix is "the remnant goes" (the cut runs on to the joint, so no tip is left) or "the
   cut should not reach here" (the line closes), and measure the remnant: its length in px and in arc, the
   arc from the window's end to the joint room. Write `out/s13/sort.txt`.
2. **The remnant rule, by patch first**: an outline remnant shorter than a threshold between a gap window's
   end and the under thread's joint room is cut too (the window's outline cut runs on to the joint room).
   Muse's 5dfb8810 did the same for never-clearing windows in the bake; read it. Try thresholds; capture
   link A; list every site whose outline ink moves by 10 px or more and look at each on 4x tiles master gf |
   patched gf, named better, same or worse against the bar. A candidate passes when its target sites are
   clean and no site turns worse.
3. **Write the passing rule**, its own commit, with a count that fails on master and passes on the tip
   (detached outline components under N px within the site's box). Outline only: the fill look must not
   move. If the rule needs a baked number, you may add it to the window bake in `gf_look.ts` / `tables.ts`
   only after `### Handoff 26M` is on origin/master in `docs/design/K1464_muse_batch26.md` (fetch and check;
   Muse Run M is in the bake until then), and rebase first.
4. **The "line closes" sites**, with the time left: one rule, same method.
5. The Crossing fade still works: `.claude/probes/K1492/dragcheck_b.mjs` (border) and
   `.claude/probes/K1458/dragcheck.mjs` (fill) pass; at `fl` 0 and 1.2 the outline at three ordinary crossings
   away from any joint is unchanged against master.

## Done

- The sweep's faulted count on your tip, by class, by your own eyes, with the class table.
- The fill look: 0 px against your starting commit on link A in the same physics hash.
- The K1436 bar with `STRICT=1`, once, at the end (`-Tag k1482s13`; if it waits on a fresh perf lock, use
  `.claude/probes/K1482/s8/bar_ref.ps1`): no new find, or each one shown at 4x and named.
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

## How to work

As stage 10's "How to work" in `docs/design/K1482_s10_borders.md`, with these changes: profiles under
`$env:TEMP\k1482s13-*`; ports 5860-5879; your probe directories are `.claude/probes/K1482/s13` and
`.claude/probes/K1482/out/s13`; capture with `.claude/probes/K1482/s11/cap11.mjs` or `s12/cap12`, each capture
under a 4 minute limit (a patch that does not compile hangs the capture: read the console). Muse works in
the main checkout: change no file there.

**Time.** 2 h of wall clock from your first `Get-Date`. Do not stop early with step 2 open: a threshold that
cleans some sites and worsens none is worth landing even if others stay. Keep the last 35 minutes for the
bar, the hold check and the handoff.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s13` here, commit, and report: the class table, the sheets' absolute paths (each site
named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle fields.

### Handoff K1482 s13

Claude agent ac8618d194aa1ac8d (claude session 09c7a672-a414-402a-97da-b3176839a2e5), 2026-11-18 17:32-19:30.
Branch `worktree-agent-ac8618d194aa1ac8d`, rebased on origin/master 1dfe82a8. **No `src/` change**: no candidate
passed step 2. Link A, K868 frozen state, hash fff8c9e5, border look, gf, ink = RGB sum <= 73.

- **Step 1, the sort** (`out/s13/sort.txt`, 52e22de7): the remnant goes 4 (j36, t79s, t70s, j88), the line closes
  7 (j49, j55, j87, j22, j29, t65s, t80s), neither 1 (t81s, a wedge in the joint's own outline). The brief's
  remnant (a window ending short of the joint room) is rarely there: at the faults the window already reaches the
  room (rem <= 0) or the joint is on the over chain. What shows is the crossing cut's own end (margin + fade) next
  to the joint's outline. So no under-chain room rule reaches them, and nothing waited on 26M's numbers.
- **Step 2, by PATCH** (`out/s13/step2.txt`; `s13/patch_c1..c12.json`, c1 as a source diff `s13/c1_rule.diff`):
  c1 = in `lkGap`, an over piece of the slot's chain cS that is a fused joint's member cuts the OUTLINE with
  margin 0 and fade 0.3, and so does the N cut when such a member cut the pixel; gA untouched. Fill 0 px; 8
  ordinary crossings unchanged at fl 0 and 1.2. 23 sites move 10 px or more: better 15 (t21e j55 t2s j122 j4
  j140 j83 j71 j102 t30e t34s j120 t36s j21 j87: the under arm's outline meets the joint's), same 3 (t42e, t27s,
  j46 = t16e), worse 4 (j77 and t64e: a detached stub turns solid; t25s = j60: a 1 px background sliver between
  the joined strokes), plus 5 new specks (`count13.py --specks`: j36 2 px, j37 3 px, 1 px beside t64e, t10s,
  j16). **FAIL** ("no site turns worse"). c2-c12 locate it: closures and specks both come from the N cut's
  reduction at the label site (c3 reverts N: 0 closures, 0 specks; c7 leaves `lkFringe` as master: same as c1);
  member choice, fade 0.1, non-member and window-less pixels change nothing; fade 1.0 and margin 0.5 are worse.
  The blank pixels around a speck are cut outside `lkGap`'s g (the under arm's faded tip is identical in every
  variant), not identified. Inferred, not tested: a speck is the under arm's outline kept just outside the over
  pass's edge where the over pass draws no outline of its own there.
- **Step 3**: nothing committed to `src/`. The count test is ready for the next candidate: `s13/count13.py`
  (20 sites, master 0/20, c1 20/20; a pass also needs `--specks` against master to find none).
- **Steps 4, 5**: not run (no `src/` change: the Crossing fade is master's).
- **Done** (all measured on e9c54923's `src/`, which my commits never change; the rebase onto 1dfe82a8 brings
  Muse's K1502, whose table arrays Muse reports bit-identical, not re-measured here): class table on the tip (sheets `out/s13/sheets/
  class_a.png`, `class_b.png`, tip | c1): 12 of 12 faulted, as the sort: tick 3 (j49, j55, j87), stub 2 (j36,
  t79s), break 3 (j22, j29, t65s), pocket 1 (t80s), wedge 1 (t81s), sliver 1 (t70s), dot 1 (j88). Fill look 0 px
  by construction. `hold.mjs` 60/60 PASS warm on link A (min 6828, max 8767 edges; first composite 1.8 s), on
  e9c54923's build (same `src/` as my commits). `npm test` green before the rebase (256 files, 3187 tests).
  K1436 bar STRICT=1 `-Tag k1482s13` (`-Ref acb1eb76 -Base e9c54923`; it waited on Muse's perf lock until the
  lock went stale at 18:41, then ran 18:41-19:16): **FAIL, new 11, grown 3, gone 2, all on g41_user_tw64**, but
  ref and base have the SAME `src/` (`git diff e9c54923 acb1eb76 -- src` is empty: my commits change only probes
  and docs) and the same physics hash there (0d51331b). Observed: the two loads' border frames differ by mean
  0.03, p99 1 RGB-sum level, max 136 at 268 px (fill: 75,568 px over 30), not a shift; the scan turns that into
  the 14 finds. Each one at 4x (`out/s13/sheets/bar_sheet.png`, rows as `out/s13/bar_sheet.txt`; `bar.txt`):
  base and ref tiles look the same by my eyes at all 14 (cut:ramp j66; cut:plain j34, x155; speck:plain x151,
  x18, x113, x37, x21, x47, x53, x110, x43; spill:plain x110, x108). So no find is this stage's; the bar's
  run-to-run noise on g41_user_tw64 is a residual of the bar. Also: g41_ring_tw42 froze on different states
  (base f7b1dff2, ref 076a1b2a), as `render-gpu-field.md` records for ring.
- **Confirmed on screen**: none committed. c1 was seen on screen as a PATCH and as a build, not landed.
- **Next**: attribute the speck pixels at j36 (2097,1031) and j37 (1988,1083) per term under c1 (paint the label
  site's g, the band and the under arm's taper each in its own colour), then a c1 variant that keeps the N cut's
  reduction only where the over pass's own outline is drawn beside it, judged with `count13.py` and the 23
  movers' tiles. t25s/j60's sliver and j77/t64e's stubs are the other worse sites to clear.
