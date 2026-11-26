# K1627 stage 1: no notch cut into a junction's rounded corner (rp=gf; Levi: "pretty important")

Levi, 2026-11-25, with a phone picture (`.claude/probes/K1627/levi_phone.png` in the main checkout, untracked;
copy it into your worktree): on `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`, right side of the maze, a third
down from the top: "I guess we're seeing either a border space or a notch cut out for some other reason into
the rounded corner of the junction. This is also a generally recurring issue we must solve".

In the picture the place is the junction at about (470, 1050) of the 891 x 2000 screenshot: where the salmon
thread from the lower left meets the purple junction and passes under, a wedge of paper is cut into the
junction's rounded corner, leaving a small pointed tab of thread at about (450, 1050). A second, smaller one
shows on the junction above it at about (375, 865). His earlier picture of the same link
(`.claude/probes/K1626/levi_phone.png`) shows the same kind of notch at about (500, 715). Read ledger item
K1627 (`node $HOME/Repositories/claude-config/tools/ledger.mjs show K1627 --repo .`). Base: `origin/master`.

## Goal

A junction's rounded corner stays whole: no wedge, notch or tab cut into it by a neighbouring crossing's gap,
a border space or anything else, at Levi's places and at every place of this kind. You own the technique.
Still binding: never remove a thread's border; the under pass keeps its width and heading; stage 4's angled
cut ends stay; tight turns keep today's ball (K1572); closed sides do not rise (master: 132).

## This stage

1. Attribute the notch: which primitive removes those pixels (the gap pass's `lkCut` / `lkGap` / `lkBall`,
   the junction rule, a border space), observed by switching it off on a frozen settled state, not by
   reasoning. Then count the places of this kind on Levi's link and the 21 test mazes (A_3..A_d, D_1..D_a).
2. Fix it in `src/render/gpu_field/` (source, the CPU mirror, tests).
3. Every other changed pixel on the 21 mazes and Levi's link: counted, and the changed places listed and
   viewed; each must be this kind of notch going right. Strays, smudges or holes elsewhere are a fail: say so.

Another agent (K1604 stage 3) is changing the gap pass for two other junction leftovers right now, on branch
`k1604-s3` (read only for you; its captures recipe and `screen.py` are under `.claude/probes/K1604/` on
`k1604-s1` / `k1604-s2`). Keep your change small and local. A third agent works in gf's reveal path (the fx
table, `lkRainbow`, the reveal alpha): keep out of it.

## Done

1. The cause, with the switch-off measurement; the count of such places per maze, master against yours.
2. Src, mirror, tests; `npm test` green; every re-frozen pin named; `npm run build` passes.
3. For Levi: one sheet, `master | yours`, 14x, of his three places and five others, settled real-time
   captures of a frozen state (same state both sides), viewed by you; the list of every other changed place.
4. `screen.py` counts, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1627-s1`, branch `k1627-s1`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Write only inside your
worktree. Read code through the shell; the Read tool only just before an Edit, and for images. Real-time
captures only, under the perf lock (`scripts/perf_lock.ps1`; four other agents share it: wait inside one
blocking command), ports 5660 to 5664. Commit WIP at every milestone (`git add -f` for probe tools, never
their outputs). Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
`--virtual-time-budget`. Helpers on sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. On stopping: commit WIP, append `## Handoff (stage 1)` here, commit, and report:
verdict first (safe to land or not), sheet paths, counts, a `Ledger items` list and the handle fields.

## WIP notes (stage 1, 23:05, before the fix)

Tools: `.claude/probes/K1627/` (cap.ps1 adds maze L, `$env:LHASH`; run.ps1 `-OnlyThen -ThenPin <tag> -Then
'tag:patch.json;...'` re-captures L pinned to a frozen state under look patches; places.py lists changed places;
rows.py / crop.py make sheets; near.py lists junction-near-crossing candidates; p_*.json are the switch-offs).
L on master freezes at physics hash 231ba8fa (3200x1800); Levi's place 1 is (2329,584) there.

Observed on that frozen state (switch-offs, gf_look patched in place):
- p_gapviz: the notch pixels carry a CORNER label (lkJb < 0) and are cut by lkGap (the gap cut, not the ball).
- p_nocorner (no lkGap on corner labels): the notch fills. L: 409 px at 21 places; 18 are notches of this
  kind (Levi's place 1 among them), 3 are true crossing gaps that reach corner pixels and must keep their cut
  ((2234,936), (2329,358), (2346,380)), so the fix must be selective.
- p_noball: 0 px on L (the K1572 ball is not involved).
Inferred, being tested: a self-cut. A corner's key is its nearer arm's z at the tangent point minus uZt, and
outside a gap window lkGap lets every piece with pkey > that z cut, the corner's own arm included where a
nearby crossing's depth tent makes the arm's z rise toward the junction. Candidate fix: a corner label skips
its own chain within the K1460 selfEx arc (as lkNearOn does); p_noself / p_noselfall test it.

## Handoff (stage 1)

Verdict: safe to land as a partial fix. It fills Levi's place 1 and 10 more notches of that kind on his link,
and nothing else moves: the 21 mazes are byte-identical to master. It does not fix his places 2 and 3, which
are a different mechanism, and 7 small specks of the place-1 kind remain on his link.

Fix (324ac882a, registry a51ec8b12): in `gf_look.ts`, lkGap skips the corner's own chain within sx of the
corner's arc, wrapped on a closed chain as lkNearOn wraps it. The best configuration's corner chain is kept in
the global `lkCs`, which is set only for a corner label (lkJ < 0). Other threads still cut the corner. There is
no CPU mirror for this (eval.ts draws no gaps, and gapCutAt twins lkCut, which is unchanged). The pin is
`test/render/gf_corner_self.test.ts`. No pin was re-frozen. K299's registry
(`paint_ring_lap.test.ts`) gained one ROUNDED_QUOTIENTS entry for the new `floor(da / cPer + 0.5)`. `npm test`
is green and `npm run build` passes (`.claude/probes/K1627/out/npm_test2.log`, `npm_build.log`).

Cause, from switching each primitive off on L frozen at 231ba8fa:
- `p_gapviz`: the notch pixels carry a corner label and are cut by lkGap.
- `p_nocorner`: 409 px fill at 21 places. 18 are notches; 3 are true gaps that must stay.
- `p_noball`: 0 px, so the K1572 ball is not involved.
The cause is the corner's own arm cutting it: the corner's key is z at its tangent point, and a crossing's depth
tent lifts the arm toward the junction.

Measured (real-time captures under the perf lock, the same frozen state on both sides; gf_b2view and hashes
equal):
- L, master against 324ac882a: 323 px at 11 places, every one viewed (`look/k1_L_rows.png`). All 11 are notches
  filled: (1229,1148), (2329,584) (Levi 1), (913,536), (1787,1607), (1141,1638), (1399,826), (1895,1167),
  (1815,1150), (2038,880), (1879,1223), (870,1004). No strays.
- One notch is only partly filled: at (1141,1638) a 4 px paper tip remains at the old stripe's far end. Those
  pixels are unchanged from master.
- The 3 true gaps are unchanged: (2234,936), (2329,358), (2346,380).
- 21 mazes (A_3..A_d, D_1..D_a): 0 px changed in both gf.png and gf_b2.png, with every hash equal. screen.py
  (an.ps1) gives equal counts: loose pieces ALL 44/10/38/1787 on both, junction closed 104 / part 245 /
  bare 492 / none 24 / gap 28935 on both. Closed sides cannot rise because nothing moved.
- Count of the place-1 kind (p_nocorner minus the 3 true gaps): L master 18, mine 7. On the 21 mazes there are 0
  self-cut notches (the skip changes no pixel there). p_nocorner was run on L only, so the 21 mazes' count of
  corner cuts by other threads is not measured.

Sheet for Levi: `.claude/probes/K1627/look/K1627_s1_sheet.png`, master | yours at 14x, from `sheet_places.json`
(Levi's 3 places, then 5 others).

Left open:
1. Levi's places 2 and 3 ((2308,522) and (2276,842) on L) are colour wedges, not paper. p_nocorner leaves them
   unchanged. Inferred cause: a corner pixel takes its nearer arm's colour at the tangent point
   (`lkColour(lab, lookQs(lab, lkSb))`), flat for each half of the corner, so the nearerA bisector draws a
   hard colour edge against the per-pixel tubes. The filled notches also wear that flat colour, which shows as
   faint wedges at 14x (Levi 1, (1229,1148), (1815,1150)). For stage 2, colour corner pixels per pixel (for
   example, lookQ of p on the nearer arm), keeping out of the reveal path.
2. 7 specks remain on L: (1377,746), (1199,1250), (1046,494), (1400,523), (1644,829), (981,1357),
   (1547,904), 1 to 6 px each at a corner's apex (`look/k1_L_remain.png`). p_nocorner fills them and my fix does
   not, so they are cut by the corner's other arm or beyond sx (inferred, not switched off yet). The next step
   is a switch-off that skips both arms, checked against the 3 true gaps.
3. The paper tip at (1141,1638) is probably the same as item 2 (the stripe's piece beyond sx).
