# K1482 stage 10: rp=gf's border faults on Levi's link, the cut beside a fused joint, second try (Claude agent stage)

Read `### Handoff K1482 s9` in `docs/design/K1482_s9_borders.md` and `### Handoff K1482 s8` in
`docs/design/K1482_s8_borders.md` whole, and the bar in `docs/design/K1482_levi_link_borders.md` (Levi's
approved look: at junctions and under-tail ends the over thread's outline runs on unbroken, with no dot,
stub, wedge, tick, notch, sliver, break or stray dash; gf's border look itself stays as it is, and the
Crossing fade keeps acting on the outline as K1492 made it).

**The scoreboard is the sweep**: link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`) at rest, border
look, 327 sites, faulted count by your own eyes on the 4x tiles. Master: 36
(`.claude/probes/K1482/out/s8/classes_tip.txt`). 12 are this stage's: ticks j49, j55, j87; stubs j36, t79s;
breaks j22, j29, t65s; pocket t80s; wedge t81s; sliver t70s; dot j88. With the look's gap patched off every
one joins (`out/s8/b_look3.png`), so the gap removes outline there that today's renderer keeps
(`out/s9/b_ov_a.png`, `b_ov_b.png`: magenta = today's outline where gf has none).

Stage 9 spent its time on statistics over crossings and found no separating number; it ended suspecting that
the faults were assigned to the wrong crossings. Do not repeat that. This stage works pixel by pixel.

## Not yours

- K1490's 22 sharp-V and notch sites, K1485's short tails, K1470's j71 seam, j64's pinhole and speck: leave them.
- The parked home build (branch `worktree-agent-ad03e8b65a2afa540`): do not cherry-pick it.
- The fill look (`tlk=fill`) and today's renderer: no pixel of either may move. `lkGap` returns the outline's
  cut and the coverage's cut (stage 8): a rule here goes in the outline's cut only.
- The baked window sides (`gapWindow`'s bake) are Muse Run M's for now. If your rule needs a new baked
  number, stop and report the rule and the number it needs instead of editing the bake.

## Do, in this order

1. **Read the cut off the shader, at the pixel (40 minutes at most).** For j49, j55, j36 and t70s (the long
   magenta runs), pick three pixels on each run where today has outline and gf has none. With a `PATCHF`
   debug output (stage 8's `DUMPGW` and `gwprobe` in `.claude/probes/K1482/s8/` do most of this) print at each
   pixel: which piece's outline is being cut, the slot that cuts it (its crossing or joint id, which thread
   is its over, the window's two ends in arc, the kept fraction at this pixel) and whether the cut comes from
   the baked window, the `N` branch or `lkCut`. Then, for that same crossing and under thread, print what
   `src/render/ribbon/crossing_gaps.ts` does: its `underWindows` and `chainCuts` extents (stage 9 measured
   gf's window at ±1.0-1.3 arc, today's chainCuts at ±0.85-1.05 and today's underWindows at ±0.44-0.56: say
   which of today's two the outline follows on screen, and whether today ends the cut at the joint). Write
   the twelve pixels' rows to `out/s10/pixels.txt` and state the difference in one sentence per site.
2. **Try rules by patch, judge by the sweep.** Each candidate as a `PATCHF` patch on the outline's cut first
   (no build): capture link A, diff against master in the same physics hash, list every site whose outline
   changed, and look at each on 4x tiles today | master gf | patched gf. A candidate passes when the four
   sites join and no site clean on master turns faulty. Candidates worth trying, in this order unless step 1
   says otherwise: the outline's cut uses today's shorter extent; the outline's cut ends where the under
   thread enters a fused joint's room; the outline's cut applies only to the thread that actually passes
   under at that crossing (not to a third thread inside the window). Record every candidate's result, pass
   or fail, with its sheet.
3. **Write the passing rule in `gf_look.ts`**, its own commit, with a count that fails on master and passes
   on the tip (detached outline components, or today's outline run with no gf ink within 3 px, in the
   site's box, on the `bg=none&cs=mono` today frame of stage 9), then check the other eight sites and fix
   what the same rule or a sibling of it reaches.
4. The Crossing fade still works: `.claude/probes/K1492/dragcheck_b.mjs` (border) and
   `.claude/probes/K1458/dragcheck.mjs` (fill) pass; at `fl` 0 and 1.2 the outline at three ordinary crossings
   away from any joint is unchanged against master.

## Done

- The sweep's faulted count on your tip, by class, by your own eyes, with the class table.
- The fill look: 0 px against master on link A in the same physics hash (fff8c9e5).
- The K1436 bar with `STRICT=1`, once, at the end, as stage 9 ran it (`-Tag k1482s10`; if it waits on a fresh
  perf lock, use `.claude/probes/K1482/s8/bar_ref.ps1`): no new find, or each one shown at 4x and named.
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`. If a fetch
  fails, retry a few times, then carry on from what you have. `npm test` and `scripts/preview.ps1` need the
  worktree's `node_modules` (a junction to the main checkout's; remove the junction, never its target, when
  you finish).
- Files: `gf_look.ts` (the gap functions and the border composite's use of them), its tests, and the look's
  uniforms in `gf_pass.ts` if a fix needs one. Others at work: Muse batch 26 in the main checkout (Run K: the
  marker gap's fade, in `gf_look.ts`'s marker code; then Run L in `tables.ts`; then Run M, the baked gap
  window sides, in `gf_look.ts`). Keep the diff small, stay out of the marker gap and the window bake, and
  rebase on origin/master before the handoff. Do not change any file in the main checkout.
- **Time.** 2 h of wall clock from your first `Get-Date`; work until every Done holds or until 1 h 25 min
  have passed, then spend the last 35 minutes on the bar, the hold check and the handoff. Do not stop
  earlier with the cause open. The look program compiles for 15-120 s on a cold profile and again after
  every shader edit: batch edits, warm each profile once per link, capture with
  `.claude/probes/K1482/s9/cap9.ps1` (stage 8's `cap.mjs` crashes on a today-only shot; a first shot can come
  before the view settles, so take a second), and reuse stage 8's and 9's probes.
- **Memory and disk.** One Chrome at a time, at most two preview builds, profiles under
  `$env:TEMP\k1482s10-*`, each deleted as soon as you are done with it. Before each build or Chrome launch
  wait in ONE blocking loop (15 minutes at most) while `FreeVirtualMemory` is under 3 GB or
  `(Get-PSDrive C).Free` is under 8 GB. Raw frames stay untracked; delete those you no longer need.
- Captures of one build differ load to load by tens of thousands of 1-2 level pixels: compare frames in the
  same physics hash and count dark-ink pixels in a site's box, not whole-frame differences.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5800-5819. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone (the pixel table, each candidate's result), broken or not. Stage probe files
  with `git add -f` on the exact files or on your own new directories `.claude/probes/K1482/s10` and
  `.claude/probes/K1482/out/s10`, never on `.claude/probes` as a whole, and never raw frames. Never push.
  Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s10` here, commit, and report: the sweep's faulted count by class, the sheets' paths (each
site named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle
fields.
