# K1482 stage 43: a thread's tight bend drawn round, as pictures for Levi

The second and last try at t81s's step corner (K1559). It makes PICTURES for a choice. Nothing of it lands.

## What Levi asked

- t81s (2026-11-20): "we want the step. Ideally the step corner would be a be rounder though."
- t4s (K1527): "this would be nice to round out, but is not too critical of the fix becomes too difficult to
  make or too costly".

## What stages 41 and 42 found

- Both corners are ONE kind of place: one thread's own outline folding at a bend tighter than its half
  width h, drawn by the chain's own side term. No pair of arms meets there, so no corner record exists.
  t81s's step: c45 L s 18.66..18.92, turn 51, at (907,1137). t4s: c66 R s 27.17..27.49, turn 56, at
  (2174,632)-(2178,640). A lone bend shows the same corner: c2 s 20.75..21.30, turn 94, at (2133,163).
  (Handoffs: `K1482_s41_step_corners.md`, `K1482_s42_t4s_corner.md`; census `bend42.ts`.)
- Link A draws 105 such bends of turn >= 20 deg (94 at >= 45); the sister mazes 87 to 123 each.
- Stage 41's rule (a round join of the stroke's own width) moved the step by 1 px and broke pointed tips
  (t84e 1537,944: a knob and a dot; t2s 1694,228: cut blunt). A corner that reads rounder needs the fold
  itself filleted: border drawn past the half width, where today the ground's wedge ends in a point.

## Goal

Before | round pictures of link A (A_3) at rest, good enough for Levi to say "bends round" or "bends keep":

1. the two named corners and the lone bend at (2133,163);
2. every other place on link A the rule changes.

MIRROR ONLY. The rule lives in `tables.ts` / `eval.ts` on this branch behind a switch that is off by
default. No shader work, no pins re-frozen, no captures (the perf lock is Muse's until about 02:00; link A's
start frames are in `out/s42/start/`). You own the technique, the fillet's radius included.

A picture must read like the render, not like a diagram, and both halves of a pair are made the same way
(the switch off, the switch on), so that the only difference in a pair is the rule. Put the true capture's
crop beside each pair once, so the method's fidelity shows.

## The bar, binding (Levi's look rules)

- t81s's step stays where it is and as high as it is. Only its corner is rounder, and visibly so at the
  close-up's size: stage 41's 1 px is a fail.
- Both borders of every thread stay. No thread reads narrower or wider away from the fold itself. An under
  pass keeps its width and its heading.
- No dot, stub, wedge, tick, notch, sliver or loose pixel left by the rule, at ANY place it changes.
- Pointed tips and under-tail ends are not bends (t84e 1537,944; t2s 1694,228). If the rule changes one,
  show it and say so. Do not tune an angle gate to hide it: stage 41 found none that separates them.
- A check never picks a look. If two radii both pass, show both at the two named corners (two at most).

## Done

1. The rule in the mirror. Switch off: the mirror's ink on link A is bit-identical to the start (0 px), and
   `npm test` is green with `GF_KRETRY` unset.
2. Sheets in stage 39's layout (`.claude/probes/K1482/s39/place39.py`): t81s's step, t4s, (2133,163), t84e,
   t2s.
3. Contact sheets (each at most 1800 px wide) of EVERY changed place on link A, before | round, each
   labelled with its x,y; a list file of the places; the count.
4. The mirror's count of changed places on each of A_4..A_d (list files, no pictures).
5. What the real build would take, in numbers where you can: which program variants need the term, the
   growth of program text you expect, the places a maze. An estimate, not a build.
6. The handoff.

If no rule gives a visibly rounder step corner that passes the bar at the two named corners, stop and say
so. The step's corner then stays as it is: this was its last try.

## Setup and rules

- Worktree and branch: stage 42's (`worktree-agent-aaaeec79b5cca150f`), on from `77ac869d6`. Read this
  brief with `git fetch -q; git show origin/master:docs/design/K1482_s43_bend_pictures.md`.
- Outputs: `.claude/probes/K1482/out/s43/` (untracked; never `git add -f` an output). Tools:
  `.claude/probes/K1482/s43/`, added by file name. The mirror's src change is committed on the branch as
  WIP at each milestone; it is never pushed and never lands.
- Hands off: `src/render/gpu_field/gf_look.ts` (a Muse run edits it tonight), `LEDGER.md`, the main checkout.
- Never push, rebase or merge. No ledger edits: your report ends with a `Ledger items` list and the
  handle's fields (owner, branch, last commit, evidence, next).
- Read code through the shell (`Select-String`, ranges of `Get-Content`); the Read tool only just before
  an Edit, and for pictures (crops of at most 800 px).

Context budget: stage 41 compacted six times in 55 minutes because it printed much. Keep every tool output
short (cut lines, tails, counts), put multi-step work in one script file per step, and never print a whole
file or a whole list.

## Stop rule

Stop when the Done list is complete, or 2 hours after your start (`Get-Date` at the start and at each
milestone), whichever comes first. Then commit WIP, append `### Handoff K1482 s43` to this brief on your
branch, and report. Neither a compaction nor context size is a stop: after a compaction re-read this brief
and `git log`.

### Handoff K1482 s43

2026-11-21, started 00:32, stopped about 01:15 by the brief's own stop line: **no rule gives t81s's step a
visibly rounder corner that passes the bar.** By this brief, the step's corner stays as it is. Nothing lands.
Branch `worktree-agent-aaaeec79b5cca150f`, commits 23604b938 and 28c8cc71c (WIP, mirror only, never pushed).

**The rule (mirror only, off by default).**
- `tables.ts` `buildBends(T, rfH)` finds each tight inside bend of a thread. A bend's record holds a disc
  centre F at R = h + rf from both legs, with feet fa and fb on the legs.
- `eval.ts` `bendFillets()` runs before the depth keys. Inside a bend's sector (between F's rays to the
  feet), the bend chain's pieces on the inside take distance min(pd, max(R - r, floor)).
- Switch: env `GF_BEND=<rf in h>` (`GfEval.BEND`); 0 or unset is off. No GPU program has it.
- Variants, all env and off by default:
  - `GF_BENDIN=1`: the inner (fill) edge rounds too, floor h - W - 2aa, radius rf + W. Without it, floor is
    h - W + aa: only the outer (ground) edge rounds, and ink is only added.
  - `GF_BENDKEY=1`: the depth key reads the distance from before the fillet.
  - `GF_BENDOTH=1|2`: the inner rounding is dropped where another chain's tube (1) or band (2) lies.
  - `GF_BENDPD=1`: the distance only; the foot and tangent are kept.
  - `GfBendsOpt.otherPass` (env `OTHER` in pic43): drops a bend only when another pass is nearer F than
    OTHER * R (default 1).

**Checks.**
- Switch off: 0 px of 5,760,000 on link A (A_3), against the stage start's mirror (77ac869d6's eval.ts and
  tables.ts, copied beside the live ones for the run and deleted after). The check compares ink, cov and
  chain (`s43/off43.ts`).
- `npm test`, with GF_KRETRY and every GF_BEND* unset, is green: 258 files, 3201 tests passed, 2 files and
  18 tests skipped (`out/s43/test/npm_test.txt`).
- Method: the mirror is coloured like the render (`colour43.py`) and set against the true capture
  (`out/s42/start/gf_b2.png`). Mean |diff| is 0.77 levels in t81s's 220 px window and 1.24 in t4s's. The
  sheets `*_0_capture_before.png` show capture | mirror, switch off.

**t81s (907,1137): fails.**
- The step corner is obtuse, about 136 degrees on the ground side, and the step's outer face is about 7 px
  long. A round of radius rf there is 0.0785 rf deep and runs 0.404 rf along each leg.
- Outer edge only (the clean form):
  - At rf 17 px (1.0 h) the round is 1.3 px deep and changes 17 px. At the sheet's close scale it reads the
    same as before (`sheets/view_t81s_1_outer_rf17_step.png`).
  - From rf 25 px (1.5 h) the round eats the 7 px face, and the step gets lower. That fails "as high as it
    is".
- Both edges (`GF_BENDIN` + `GF_BENDKEY`): the fill-side corner rounds visibly at rf 8.5-17. But t81s is
  chain 81's start, and chain 81's start cap lies under chain 45's band on the fill side. Where 45's inner
  edge pulls back, that cap's outline shows as dots at about (910,1138) and (907,1140) and a notch at
  (912,1135). That fails "no dot ... notch" (`sheets/t81s_2_both_rf8.5.png`, `pic/t81s_v9.png`).
- Gating the inner rounding off where another chain's tube lies (`GF_BENDOTH=1`) takes all of it away at
  t81s. Gating on another chain's band only (`=2`) leaves 9-17 px, outer only again (`pic/t81s_v10.png`).
- So the visible part of a round at t81s needs the inner edge, and the inner edge at t81s is where chain
  81's start sits. A larger outer radius only lowers the step.

**t4s (2177,641).** The outer rule rounds the pale wedge's square end: a little at rf 8.5 px and visibly at
rf 17 px. At rf 17, OTHER=0.6 is needed, or the record is dropped for chain 4's pass
(`sheets/t4s_1_outer_rf8.5.png`, `t4s_2_outer_rf17.png`). I looked only at the close brightened rows of
these two sheets. I did not judge their wide rows or the rest of the bar at t4s.

**Counts (outer rule, OTHER 1, whole frame, mirror; places = changed px within 6 px of each other;
`s43/cnt43.ts`, lists in `out/s43/cnt/<scene>_outer_<rf>.txt`).**
- rf 0.5 h: 67-109 places a scene on A_3..A_d (A_3: 99 places, 1925 px).
- rf 1.0 h: 40-84 places a scene (A_3: 71 places, 2913 px).
- Per scene: `out/s43/cnt/counts.txt`. The largest places on A_3 at rf 0.5 are (1062,772) 157 px,
  (1541,1612) 98 px and (1032,1134) 72 px. None of them was viewed.
- Some pixels lose ink (for example, 17 px on A_3 at rf 0.5): the depth key reads the lowered distance.
  `GF_BENDKEY` is the fix; it was not counted.

**Not done (the stop line came first).**
- Sheets for (2133,163), t84e and t2s.
- Contact sheets of the changed places.
- A measured build estimate. The guess, unmeasured: the term needs a bend table (F, rf, feet, chain: 2
  texels a bend) and a sector test per bend near the pixel, before the keys, in every program variant that
  computes membership: the tier, full, the corner-free variant, and the retry and reveal forms. It would
  add about 1.5-3k characters per variant.
- At 70-100 places per maze, any form of this rule would need every place listed and looked at before a
  card (NAMED PLACES ONLY, render-gpu-field.md).

**Pictures** (`.claude/probes/K1482/out/s43/`, untracked):
- `sheets/`: stage 39's layout, 1616x3320, with rows wide as drawn, wide brightened, close as drawn and
  close brightened.
  - The mirror's 220 px window is pasted into the capture frame (`s43/frame43.py`), so only the window is
    the mirror; every tile lies inside it.
  - Sheets: `t81s_0_capture_before`, `t81s_1_outer_rf17`, `t81s_2_both_rf8.5`, `t4s_0_capture_before`,
    `t4s_1_outer_rf8.5`, `t4s_2_outer_rf17`.
  - `view_*.png` are 808 px cuts of the close brightened rows.
- `pic/`: the windows as PGM/PNG (`<name>_off|b<rf>_<x0>_<y0>`), change maps, zoom strips (`t81s_v1..v10`,
  `t4s_v1..v3`), and fillet geometry overlays (`*_geo*`).

**Tools** (`.claude/probes/K1482/s43/`):
- `place43.ps1`: one place, mirror off and on, coloured, with its change map.
- `pic43.ts`, `colour43.py`, `diff43.py`, `strip43.py`, `geo43.py`.
- `px43.ts`: one pixel's pieces, off and on.
- `frame43.py`, `off43.ts`, `cnt43.ts`.
