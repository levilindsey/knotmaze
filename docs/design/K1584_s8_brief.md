# K1584 stage 8: the last stem corners (a border's gap ends where the corner's fillet starts)

Read first: `K1584_s7b_brief.md` and its handoff (this stage's base and its findings), then
`K1584_s7_brief.md` for the two rules (rule K, the corner rule) and the bindings, which all hold. Base: this
worktree's HEAD `648ca884d`.

## Where it stands

Levi on stems (2026-11-24): "the first column is correct in all cases and the other columns are broken":
today's look at a stem's corner is the bar. Stage 7's corner rule brings five of the seven stems back to it
on the GPU capture (viewed by the coordinator on `s7/out/stems7.png`). Two still show a cut at the corner:
A_6 (1362,1615, corner k197, 23 px) and A_d (2199,952, corner k148, 14 px). The same miss sits at A_9 k307
(41 px), A_c k310 (44 px), A_a x344 and partly A_3 k148 (10 px). Stage 7b found why: there the cut is the
border's own gap, whose end reaches past the corner's flag start (A_6 2.293 against 2.334, A_d 2.427 against
2.284), and no pad of the flag fixes it without shortening real crossing gaps beside junctions on the D
mazes (9 to 12 places a maze, rejected).

## This stage

One thing: where a border runs alongside the over thread into a pair corner, its gap ends where the
corner's fillet starts, so every stem corner shows today's look. Variant `i` of stage 7b is the nearest
start (it clears A_d, misses A_6 by 0.04 arc, and its 20 changed places were never viewed). You own the
technique. Not this stage: the gap stage 4 opens at a stem's far end (Levi's call, pending), the wedge at
balls (K1603, pending), any change to the loop term, the junction rule (`eval.ts`, `gf_glsl.ts`: keep out
unless you must, and name it).

Bindings beyond the earlier briefs': a real crossing's gap beside a junction keeps its stage 7 length on
every maze (the pad's failure); the twelve right loops stay pixel-identical to stage 6 and the three wrong
loops stay closed at the tip; never remove a thread's border; the under pass keeps its width and heading;
stage 4's angled cut ends stay.

## Done

1. The rule on the CPU copy first, all 21 mazes: every changed place listed and viewed before any src
   change. Each is a stem corner going back to today's look, or you report it.
2. The rule in `src/render/gpu_field/` with its mirror and tests; `npm test` green; every re-frozen pin named.
3. A capture of all 21 mazes (tag `s8a`; warm the profiles first with `warm7.ps1`; under the perf lock,
   `scripts/perf_lock.ps1`, never by hand; nothing else heavy running), then the stage 7 post steps.
4. Sheets, each viewed by you, crops centred on the crossing side's point, pxdiff box 40:
   `today | s7 | s8` for the seven stems and the other flag misses; the fifteen loops; every place that
   changed from s7 to s8.
5. Counts within one run of `screen.py`: closed sides (s7: 136) and loose pieces (s7: 501/15/33/1368).
6. For Levi, pictures only (no rule change): one sheet `today | s7` of the 18 corner places the loop term
   still cuts, large enough to read, and one line each on what is drawn there.
7. Report only: in the three wrong loops (A_b x75, A_8 x65, A_5 x277) stages 5 to 7 fill part of the loop's
   eye dark where today shows an open eye (`s7b/out/wrongloops.png`). Say which term paints it and whether
   the right loops show it too. No fix.

## How to work

- Work in this worktree on this branch from its HEAD: no reset, rebase or merge. `Get-Date` first.
- Preview ports 5630 to 5639. PowerShell. Read code through the shell; the Read tool only just before an
  Edit, and for images.
- Commit WIP at every milestone, broken or not (`git add -f` for probe tools, never their outputs). Never
  push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
  `--virtual-time-budget`.
- Helpers on sonnet, mechanical work only, with this stop rule. Looks are yours: view every place you report.

## Stop rule

Stop when every Done holds or after 2 h of wall clock (`Get-Date` at each milestone), whichever comes first.
A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`## Handoff (stage 8)` here, commit, and report: what holds and what does not (failing checks with their
numbers), sheet paths, the counts, a `Ledger items` list and K1584's handle fields (owner, branch, last
commit, evidence, next).

## Handoff (stage 8)

Stopped 2026-11-24 about 20:45, every Done met, inside the 2 h. Branch `worktree-agent-a2dfb242b056cf793`:
the rule is 6c6c5ae0f (`src/render/gpu_field/gf_look.ts`, test `test/render/gf_gap.test.ts` "K1584 s8");
the probe tools are WIP commits ec6e0df77, b318d3369, 5c78dc52a, b970e9047 and 134ce2334, all under
`.claude/probes/K1584/s8/`. Outputs are untracked in `s8/out/`, and the s8a capture is in `s7/out/s8a/`.

**The rule (rule d).** Per border, the bake finds the corner's fillet start: the nearer of the under's
pair-corner tangent point and the over's, projected to the nearest under sample within GAP_FILLET_REACH 1.5.
A side where some border's gap end reaches its fillet start flags from the largest need: the fillet start
for such a border, and its code's reach for the others, never past stage 7's flag. A side with no border
reaching its corner keeps stage 7's flag, so D_a x174's real gap keeps 0.819. Variants b and c were
rejected: they shorten that gap by about 3 px. No pin was re-frozen, and `npm test` is green (3248).

**Done 1 to 6 hold.**

- **Mirror, all 21 mazes.** Only A_6 k197 (39 px) and A_d k148 (19 px) change, both going back to today.
  The src bake equals the mirror (0 differing runs on all 21).
- **Capture s8a, s7a against s8a.**
  - Every view is the same.
  - Changed places: only A_6 (32 px) and A_d (15 px), both stem corners going back to today
    (`chg8_1.png`).
  - The D mazes, the fifteen loops and every crossing gap are pixel-identical to s7. The twelve right loops
    therefore stay identical to s6, and the three wrong loops stay closed at the tip.
- **Counts (one screen.py run, s7a | s8a).** Closed sides 136 | 136. Loose pieces 501/15/33/1368 |
  501/15/33/1367 (today 486/2/17/882).
- **The seven stems all show today's look** (`stems8.png`). A_6 p3 (k197) and A_d p7 (k148) are fixed.

**Misses that remain (not stems).**

- **A_c k310:** a 19 px far part is still cut. It needs a far bit per border; today the bit is per side.
  That is a shader and z-encoding change.
- **A_9 k307:** the pixels still cut lie inside the border's own gap, before its end. A later flag start
  cannot reach them.
- **A_3 k148:** a partial flag miss.
- **A_a x344:** unchanged.

**Done 6, for Levi (`levi18.png`, one line per place in `levi18_notes.json`).** At the 18 corner places the
loop term still cuts, today runs a thread into its neighbour in a corner. Stage 7 ends it short of the
neighbour with a gap.

**Done 7, report only.**

- **No term paints the eye.** Within 96 px of any of the fifteen loops, no pixel is darker than today in
  s4, s5, s6, s7 or s8 (`eyefind.py`, threshold 3 levels; s4 has 1 px at A_3 x192). The dark wedge is the
  loop's own arm.
- **What cuts it.** The under pass of the loop's own crossing is cut at the eye's closed end, where the
  arm's foot meets the other side, by the loop term and the far term together.

  | Loop | Crossing | Cut on |
  |---|---|---|
  | A_b | k45 (6 over 33) | chain 33, s 0.685 to 2.011 |
  | A_8 | k81 (67 over 39) | chain 39, s 0.425 to 1.195 |
  | A_5 | k185 (64 over 64) | chain 64, s 49.13 to 49.98 |

  Bake codes are mostly pk 1023/1023 (A_8 also 0/1023, A_5 1023/0). s6's bake cut the same pixels.
- **How it reads.** With the foot cut, the eye opens at that end and the arm reads as a dark wedge hanging
  from the tip. s5 and s6 also cut the tip, so the arm became an island; stage 7 closed the tip again.
- **When it started.** The foot cut came with stage 3/4's gaps: A_b has 33 px from s3, A_8 42 px and A_5
  51 px from s4, and s1's after has none. Today draws the foot uncut (lum about 20 to 22; s4, s6 and s8
  read 23 to 31). Today→s8 cut px around each crossing: A_b 34, A_8 38, A_5 42 (`eyes8_k.png`).
- **The right loops.** None of the twelve shows a wedge (`eyes8_right.png`, `eyes8_all.png`).
  - Two were checked against their own bake crossing, A_3 x49 k215 and A_d x241 k288 (`eyes8_rk.png`).
    The same terms cut the arm there too. The cut sits where the arm meets the other thread at an angle,
    so it reads as the arm passing under.
  - The other ten have no bake crossing with s5's over/under pair inside an 80 px box, so they were
    judged by eye only.
  - In all five loops checked, the bake crossing centre lies off the ink, in the eye (today lum 27 to 32).
    So a centre in the eye does not single out the wrong loops.
  - Observed difference: in the wrong loops the cut lands at the eye's narrow closed end, where the two
    sides run nearly side by side. The angle between the passes there was not measured.

**Sheets in `s8/out/`.** `stems8.png`, `loops8.png`, `chg8_1.png`, `levi18.png`, `eyes8.png`, `eyes8_k.png`,
`eyes8_all.png`, `eyes8_right.png` and `eyes8_rk.png`, plus the text outputs `post8.txt`, `an8.txt` and
`eyek.txt`.

**Next.**

1. Merge s8. Check K1493's rule first: `git merge-base --is-ancestor d39e363fe <branch>`.
2. Levi's picks on `levi18.png` and on the wrong loops' foot cut (`eyes8_k.png`).
3. A per-border far bit for A_c k310.
