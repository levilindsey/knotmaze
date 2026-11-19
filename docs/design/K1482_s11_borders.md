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
