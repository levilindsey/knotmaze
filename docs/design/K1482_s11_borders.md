# K1482 stage 11: rp=gf's border faults on Levi's link, land the joint-group rule (Claude agent stage)

Read `### Handoff K1482 s10` in `docs/design/K1482_s10_borders.md` whole (and `.claude/probes/K1482/out/s10/`
`pixels.txt`, `candidates.txt`), then the bar in `docs/design/K1482_levi_link_borders.md` (Levi's approved
look: at junctions and under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge,
tick, notch, sliver, break or stray dash; gf's border look itself stays as it is, and the Crossing fade keeps
acting on the outline as K1492 made it).

**The scoreboard is the sweep**: link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) at rest, border
look, 327 sites, faulted count by your own eyes on the 4x tiles. Last count: 36 at 880ec605
(`.claude/probes/K1482/out/s8/classes_tip.txt`). Master has moved since (Muse's K1502, b0f4f9a7 and 3971ec64,
the reach key windows in `tables.ts`), so that count is stale.

Stage 10 found one candidate that helps: `s10/patch_b3.json` (no outline cut from an over piece inside a
fused joint's group) joins the tick at j87 and a stub at t16e, and moves 52 other sites by 10 px or more that
nobody looked at. This stage lands it, or a narrower form of it, on the evidence of those sites.

## Not yours

- K1490's 22 sharp-V and notch sites, K1485's short tails, K1470's j71 seam, j64's pinhole and speck.
- The parked home build (branch `worktree-agent-ad03e8b65a2afa540`).
- The fill look (`tlk=fill`) and today's renderer: no pixel of either may move. A rule goes in the outline's
  cut (lkGap's x lane) only.
- The baked tables and window sides (`tables.ts`, `gapWindow`'s bake): Muse's (Run L, then Run M). j49 needs a
  baked fan reach along the over thread; do not add it, it is recorded.

## Do, in this order

1. **Recount on today's master (30 minutes at most).** Capture link A on your starting commit (border, fill,
   and the `bg=none&cs=mono` today frame) in hash fff8c9e5. Diff the border frame against stage 8's tip frame
   per site box; look at the old 36 and at every site that moved by more than 8 px on 4x tiles, and write the
   new class table (`out/s11/classes_base.txt`). If the hash differs, say so and count all 327.
2. **b3 as a patch on the new master**: capture, list every site whose outline ink moves by 10 px or more,
   and look at every one on 4x tiles today | master gf | b3 gf. Name each better, same or worse against
   today's outline (`out/s11/b3_sites.txt`). Sheets of at most 12 sites each.
3. **If no site is worse, write the rule in `gf_look.ts`**; if some are, narrow the rule (say what separates
   the worse sites, in the numbers the shader already has) until none is, and say what the narrowing gave up.
   Its own commit with a count that fails on master and passes on the tip (detached outline components, or
   today's outline run with no gf ink within 3 px, in the site's box). Confirm the built rule equals the
   patch on screen.
4. **With the time left, the mask case** (j55, j36, t70s): stage 10 says today's mask removes the ribbon at
   those pixels and "today hides a whole stretch" that gf draws. Say, per site, which of today's mask terms
   hides it and what gf would have to hide to match; try it as a border-only patch; land it only if it passes
   the same site-by-site look.
5. The Crossing fade still works: `.claude/probes/K1492/dragcheck_b.mjs` (border) and
   `.claude/probes/K1458/dragcheck.mjs` (fill) pass; at `fl` 0 and 1.2 the outline at three ordinary crossings
   away from any joint is unchanged against master.

## Done

- The sweep's faulted count on your starting commit and on your tip, by class, by your own eyes.
- The fill look: 0 px against your starting commit on link A in the same physics hash.
- The K1436 bar with `STRICT=1`, once, at the end, as stage 9 ran it (`-Tag k1482s11`; if it waits on a fresh
  perf lock, use `.claude/probes/K1482/s8/bar_ref.ps1`): no new find, or each one shown at 4x and named.
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

## How to work

As stage 10's "How to work" in `docs/design/K1482_s10_borders.md`, with these changes: profiles under
`$env:TEMP\k1482s11-*`; ports 5820-5839; your probe directories are `.claude/probes/K1482/s11` and
`.claude/probes/K1482/out/s11`. A patch whose shader does not compile makes `cap.mjs` wait forever (stage 10
lost 8 minutes to it): give every capture a 4 minute limit and read the page's console for the compile
error. Muse is in `tables.ts` now and in `gf_look.ts`'s window bake next: keep the diff small and rebase on
origin/master before the handoff.

**Time.** 2 h of wall clock from your first `Get-Date`. Step 4 is optional; steps 1 to 3 are not. Keep the
last 35 minutes for the bar, the hold check and the handoff.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s11` here, commit, and report: the two class tables, the sheets' paths (each site named),
the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle fields.

### Handoff K1482 s11

Stopped at 16:45 (started 15:28), no `src/` change: no rule landed. Tip = origin/master 314b1896 + probe files.

- **Step 1, recount** (`out/s11/classes_base.txt`, sheets `base_0..3.png`, `base_moved.png`, `base_moved_wide.png`,
  `z_j36.png`, `z_j50.png`): starting commit c198e005, hash fff8c9e5 (as s8/s10). K1502 moved 10 sites by more than
  8 px (t50s, t18e, j36's top arm, t18s, j50 ...): its reach windows run an outline on past shallow crossings; none
  reads faulted. Count 36, unchanged: wedge 10, notch 9, sliver 6, tick 3, break 3, dot 2, stub 2, pocket 1 (K1490 22,
  GAP 12, K1470 1, PIN 1). Tip: the same 36, by construction (tip `src/` = c198e005's).
- **Step 2, b3 on the new master** (`out/s11/b3_sites.txt`, sheets `b3_0..b3_7.png`, 12 groups each, today | base gf
  | b3 gf | ink diff; `sep_0.png`, `zoom_t16e.png`): ink changes 2341 px (gain 2194, loss 147), 86 groups of >= 10
  px. Better 2: j87 (today meets the over thread; base leaves a 2-3 px gap; b3 meets it), t16e (the same; least
  sure, today's tile sits off gf's geometry there). Same 0. Worse 84: everywhere else b3 runs the under line hard
  into the over line as a T where today and base fade it out before it.
- **Step 3, narrowing** (`out/s11/narrow.txt`; patches `s11/patch_n1..n3.json`, debug `patch_dbg11*.json`,
  `dbgread11.py`): n1 (the under chain has a candidate piece in the over piece's group) 11 groups, n2 (the slot's
  clearance scales below 1) 24, n3 (the under chain has an arm in that group) 24: all of them b3-worse sites, and
  none keeps j87 or t16e. FAIL. At 77 of the 86 groups the over piece is a member through its HOME interval only.
  The numbers the shader has do not separate the two better sites: arc from the crossing to the over chain's
  joint root j87 0.40 h, t16e 0.53 h against worse t21e 0.25, t25s 0.45, t2s 0.53, j102 0.55; sinT and the cut
  overlap too. Given up: j87's and t16e's joins. What likely separates them is today's fan reach along the OVER
  chain (s10's finding at j49): a new baked number in the window bake, not added (not mine).
- **Step 4 (optional, partial)** (`out/s11/mask.txt`, `mask_0.png`, `mask_wide.png`; cap11.mjs gains `PATCHT`, today's
  gap-mask programs; `s11/patchT_*.json`): at j55, j36, t70s (and j49) today's hiding is the over SILHOUETTE term
  (margin and fade zeroed bring back only short end stubs at j55 and j36; nomask shows the whole under ribbon).
  Today's ribbons do not overlay gf's lines at these sites, so what gf would have to hide is not mapped; no
  border patch tried.
- **Step 5**: not run; no `src/` change, so the Crossing fade is master's.
- **Done**: counts above (36 = 36). Fill look: 0 px by construction (tip `src/` = starting commit's). `hold.mjs`
  60/60 PASS warm on link A (min 6855 edges, max 8260). `npm test` green on the tip (256 files, 3187 tests).
  K1436 bar STRICT=1 `-Tag k1482s11` (`-Ref b0490d9d -Base c198e005`): **PASS**, new 0, grown 0, gone 0 (`out/s11/bar.txt`).
- **Confirmed on screen**: none (no rule built).
- **Next**: the joins at j49, j87, t16e need the over chain's fused-joint fan reach baked into gf's window (the
  window bake, Muse's area): measure it at those three against the worse sites (t21e, t2s) first. The mask case
  needs the slot's over polyline and hO drawn in frame coordinates at j55, j36, t70s, then a comparison with gf's
  window there.