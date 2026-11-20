# K1525 stage 1: rp=gf's fill look where a thread dives under a junction (Claude agent stage)

The fill look of rp=gf has one approved reference: today's renderer on the same link and physics state (K1474
set the fill's colour to it). At a dive, where a thread passes under a junction, gf's fill does not read as
today's. Link A in the fill look is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&tlk=fill` (hash
fff8c9e5); today's is the same link without `rp=gf` and `gfh`.

The goal: at each spot below gf's fill reads as today's. The same thin gap line where today's draws one; no
dark block, no gap line that loops on around the thread, no small triangle; at a long fade no straight hard
edge and no bright sliver across the ramp; smooth colour where today's is smooth. You own the technique.

## The spots

- **The four dives** of `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1495\out\sheet_dives.png` (made
  2026-11-18 by `shots.mjs` and `sheet2.py` beside it; device px in that capture: 1968,432; 2224,976;
  1904,1136; 1248,1104), each at Crossing fade (`fl`) 0, 0.14, 0.5 and 1.2. Seen then: dive 1 a dark square
  block at the lower left at fl 0, and at 0.5 and 1.2 a straight-edged dark wedge across the ramp; dive 2 a
  gap line that runs on in a loop plus a dark triangle, where today's draws one short line; dive 3 the line
  runs on around the lobe; dive 4 a small triangle at the joint. Master has moved since (Muse 26L, 26M, 26N,
  K1482 stages 7 to 19): re-shoot first and class what is left.
- **K1419**: hard run-colour wedges in the fill at junction spots where today's is smooth
  (`...\.claude\probes\K1407\out\c2\c2_sheet_fixed.png` rows 1-4, 11, 13; `gf_look.ts` steps the colour label
  between chains, K1407's c2 handoff in `docs/design/K1407_c2_bar.md`). Filed before K1474: re-shoot first.
- **K1463**: a small notch where the pink arm meets the blue thread at `?3&xp=off&am=instant&rp=gf` (lower
  right of `...\.claude\probes\K1458\live\zoom_a.png`): the look's fill, the field is clean there (Handoff
  K1451 in `docs/design/K1451_crossing_ties.md`).

## Do

1. In the first 20 minutes: today's | master gf at every spot, in context and closer, on one physics hash.
   A spot that already reads as today's is closed with its picture. If all do, stop and report.
2. Each remaining spot to its terms before a fix: which pass and term draws the fault, with numbers.
3. Fix what lives in the look (`gf_look.ts`, `gf_pass.ts`, the look's part of `gf_glsl.ts`). **Hands off the
   junction field**: `tables.ts`, `eval.ts`, `gf_keys.ts`, `gf_pack.ts` and the field evaluation in
   `gf_glsl.ts` belong to the agent of K1482 stage 21 this afternoon. A fault whose cause is there: name the
   term with its numbers, keep your fix as a patch in your probe directory, and leave `src/` alone for it.
4. Judge each spot against today's, not against master gf. Commit WIP on your branch at every milestone; a
   fix that fails Done stays a patch in your probe directory.

## Done

- The class table by your own eyes, in context and at 4x or more: each spot at each fade value finished,
  better with its leftover named, unchanged, or the field's (with its term).
- Beside it, per spot and fade value, the count of pixels in a 76 px box whose colour is further than a
  stated distance from today's: master gf | your tip. The count is not the bar; the look is.
- Nothing else moves for the worse: in the fill look on link A and on `?3`, at fl 0.14 and 1.2, every place
  your tip differs from master gf outside the spots is listed with a crop and judged against today's. The
  border look on link A (`&tlk=border` off the same link, Levi's own view) is 0 px against master gf, or each
  moved place is named with a crop.
- Sheets in the layout of `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1524\card.py` (the surrounding
  threads with a red box, then the box closer), columns today's | master gf | your tip, one row per spot and
  fade value; colours stretched as there.
- Captures pin the physics state and the background clock: two loads of one build differ by 0 px.
- On your tip, in the last 30 minutes: `node .claude/probes/K1450/hold.mjs <url> <outDir> <profileDir> 60 250
  5000` 60/60 on `?3&xp=off&am=instant&rp=gf` and on link A; `.claude/probes/K1458/dragcheck.mjs` passes for gf
  and gfh (the fade slider still moves the fade); `npm test` green; the K1436 bar once, `STRICT=1
  -NoPerfLock`, on `ring,def,muse_hash,g41_user_tw64`, `-Base` your starting commit, `-Tag k1525s1`: no new
  find, none grown. A check you could not run is named as not run, with why.

## How to work

As `docs/design/K1482_s20_wedges_notches.md`'s How to work, with these changes: profiles under
`$env:TEMP\k1525s1-*`; ports 6030-6049; your probe directories are `.claude/probes/K1525/s1` and
`.claude/probes/K1525/out/s1` (untracked: do not `git add` pictures or dumps). Look captures need no perf
lock; a timing check does. At most three preview builds alive at once; stop yours and remove their
directories when you finish (the disk is short: K1467, CC156). Change no file in the main checkout or in
another agent's worktree; copy what you use.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. Do not stop early
while a spot is untried and time remains. A compaction is not a stop: re-read this brief and `git log`. On
stopping: commit WIP, append `### Handoff K1525 s1` here, commit, and report: the class table, the sheets'
absolute paths (each spot named), the numbers, which commits are confirmed on screen, a `Ledger items` list
and K1525's handle fields. Never push, never edit `LEDGER.md`.
