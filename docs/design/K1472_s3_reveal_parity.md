# K1472 stage 3: rp=gf's reveal against today's, the differences (Claude agent stage)

Stage 2 (`docs/design/K1472_s2_reveal_parity.md`: read Handoff K1472 s2 whole; merged 2b0fe219) made an rp=gf
link draw today's reveal ink until gf takes over and made repeat visits warm. Its sheets on Levi's link
(`.claude/probes/K1472/out/s2/pin/levi_sheet_whole.png`, `levi_spots_x3_{0,1,2}.png`, `levi_spots_counts.txt`;
tools `pinsheet.mjs`, `spots.py`) name five differences between gf's reveal and today's; none is fixed.

The bar: **today's renderer on the same link at the same pinned reveal time**, spot by spot, and no visible
jump at the frame gf takes over. gf's border look at rest stays as it is (Levi, 2026-11-17), so difference 3
(today's thin brown centrelines under unrevealed thread against gf's black border look) stays.

Links: Levi's `?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1` (trace, burn, border look), then `?b.FMKB4DIQ` with the
default look and with trace-rainbow (`.claude/probes/K1459/k1469_pinwatch.mjs`, `k1469_live.mjs`).

## Observed on the live site (coordinator, 2026-11-17 21:57-22:00, build 2b0fe219, 1600x900, fresh profile)

`node .claude/probes/K1472/liveshots.mjs <url> <profileDir> <outPrefix> [times]`, gf stats {composites,
fallback, issued, ready}:
- First visit: loader until about 7 s, the reveal over by 20 s, then today's rest look; gf composing between
  60 and 90 s (`c=580` at 90 s, issued 1 / ready 1; 4 / 4 at 150 s).
- Second visit: today's reveal WITH ink at 3 s and 5 s (4,885 and 33,495 coloured px), issued 1 / ready 1
  from 2.5 s, yet gf's first composite only at about 7 s, as the reveal ended. So on that visit gf never
  drew the reveal: today's renderer did, and gf brought its rest look in at the end. Stage 2 measured gf
  taking over at 1.9 s on a profile with all 12 programs cached.

## Do

0. **When gf takes over.** On one profile, visits 1 to 4 of Levi's link: the time of gf's first composite
   against the reveal's end, which programs were ready, and what changes on screen at the takeover (pixels
   differing between the last frame of today's renderer and gf's first, at a pinned reveal time). Decide by
   that number which case Levi sees and make it one case: a takeover in the middle of the reveal must not
   show.
1. **The differences, largest first** (stage 2's list): (1) gf shows whole strands where today's come in as
   broken pieces (1.2-2.5k px a spot; suspect a per-piece reveal clock or extent, `gf_reveal.ts` KREVEAL
   against today's reveal widths); (2) gf's cut ends are staircase diagonals, today's straight or notched;
   (4) hard dark seams across a strand at crossings where today fades softly; (5) the start marker's white
   glint, which today shows during the reveal and gf only at rest. A number for each (pixels differing from
   today inside a named box at a pinned time) failing on master, then the fix.
2. **01c72dfc's verdict** (Muse 26B's junction cut in the reveal, `lkJCut`): a build with it reverted beside
   master at the junction spots; keep, repair or revert by what the tiles show.
3. The two other links, same sheets.

## Done

0. Item 0's table and the takeover's pixel count before and after.
1. Sheets today | master gf | your gf under `.claude/probes/K1472/out/s3/`, every tile looked at, each spot
   named fixed, same as master or open; each number failing on master and passing on your tip.
2. A plain verdict on 01c72dfc.
3. `npm test` green; `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on
   `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`; at rest your gf against master's gf differs by
   0 px, or every differing pixel is named.

A partial result lands: say plainly which commits are confirmed on the sheets.

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `gf_reveal.ts`, the reveal's code in `gf_look.ts` (`lkJCut`, `lkFx`), the switch gate and the
  compile order in `gf_app.ts` and `gf_pass.ts`, the FX table, their tests. Another agent (K1482) edits the
  border and junction code in `gf_look.ts`, `eval.ts`, `tables.ts`; Muse batch 26 edits gf files in the main
  checkout. Keep the diff small and rebase on origin/master before the handoff. Do not change any file in
  the main checkout.
- **Memory and disk.** One Chrome at a time, one cold gf load at a time, at most two preview builds, profiles
  under `$env:TEMP\k1472s3-*`, all deleted when you stop. Before each build or Chrome launch wait in ONE
  blocking loop (15 minutes at most) while `FreeVirtualMemory` is under 3 GB or `(Get-PSDrive C).Free` is
  under 8 GB. Stop to report only if C: is still under 5 GB after that wait.
- A profile is warm only for the exact links it has loaded.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5640-5659. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers: do not take the
  perf lock.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files and sheets, not raw frames).
  Never push. Never edit LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried
  and why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1472 s3` here, commit, and report: what holds, the sheets' paths (each spot named), the
numbers, which commits are confirmed on screen, a `Ledger items` list and K1472's handle fields.

### Handoff K1472 s3

Stopped 2026-11-18 00:22 PT, stage 3 partial. Branch `worktree-agent-af888a799cf269dde`, rebased on
origin/master. Same-state stands throughout: `phw=0`, shots at the slept state (hash all=15294c37, sim 5.0).

**Holds.**
- Item 0, the takeover (7a518b9c, 5130685e): gf never switches in mid-reveal (`midReveal` opt for probes)
  and waits out today's FX tail. Takeover diff (today's last frame vs gf's first): master warm
  45708 / 37862 / 49130 px, master cold 2853; tip warm 5426 / 10423 / 624. For scale, today's own step
  across the FX end is 9605 / 286 px, and gf post0 vs today post0 is 20 / 173 / 283 px.
- At rest, gf on master vs gf on the tip: 0 px (pin2, `rest`).
- `npm test` green (254 files, 3169 tests).

**pin2 sheets** (`.claude/probes/K1472/out/s3/pin2/`, `spot_00..12.png`, rows f3 f5 f6 rest, columns
today | master gf | tip gf; `spots_counts.txt`, `whole_counts.txt`). master~tip, whole frame f0-f7, rest:
0 / 70 / 217 / 596 / 624 / 429 / 40 / 53 / 0 px. Every mid-reveal pixel sits in appear_fx's smoke and ember
particles, which `revealPin` does not pin. In every spot box master~tip is 0-25 px: all 13 spots are
**same as master**. today~master is **open** in all 13 (peak counts: 00 start marker f3 262, rest 55;
01 1761; 02 1157; 03 1681; 04 869; 05 1212; 06 1415; 07 903; 08 235; 09 1384; 10 437; 11 2507; 12 1814).
Whole frame today~master: f1-f7 965 / 9012 / 24734 / 40077 / 48230 / 43381 / 36448, rest 59.

**Difference 1 (broken pieces vs whole strands): attribution, not fixed.** Ruled out, each with a number:
- settle and timing skew: the same hash at every shot;
- the thread reveal: today `xp=off` vs today at f4, 715 px (`out/s3/xpoff/xo_f3..5.png`, `xm_f4`, `xt_f4`);
- today's crossing gaps: gaps on vs `gaps.setEnabled(false)` at f4, 3644 px, almost all smoke
  (`xpoff/gaps_onoff.png`, `gaps_offtint.png`);
- the reveal mask: `maskprobe.mjs` in spot 01's box at f3 reads mask 1 and width 1 on every sample of every
  chain there (`xpoff/mask_spot01_f3.json`), but today draws that strand broken.
So today's pieces come from a term after the mask. Next suspect: the burn FX paint (kBurnAge / char in
today's paint shader vs gf_look's lookForm burn, gf_look.ts ~1032-1036, `U.uKFx[2] < c.fxDone`), then the
over-patch meshes. Next step: shoot today at f4 with the FX style forced off (or the burn age pinned past
fxDone) and see whether the strand joins; if yes, diff gf's burn term against `paint_glsl.ts`.

**Not done:** differences 2-4 (staircase cut ends, crossing seams, the start marker's glint), item 2
(01c72dfc verdict), item 3 (`?b.FMKB4DIQ` sheets), `hold.mjs` 60/60.

Probes: `.claude/probes/K1472/` `pinsheet.mjs`, `spots4.py`, `pairmask.py`, `takeover.mjs`,
`maskprobe.mjs`, `gapsoff.mjs`, `run_xpoff.ps1`.
