# K1482 stage 40: the ball candidate, narrowed (the ball's second and last try)

Brief for one Claude agent (model opus), 2026-11-20. Render work in `src/render/gpu_field/eval.ts` and
`gf_glsl.ts` (the mirror and the shader, in step) and their tests. `gf_look.ts` is hands-off (a Muse run
works there).

**What exists.** Stage 37 built a CANDIDATE that removes the round ball where a thread's end meets a joint:
src `df2e1c8bb`, branch `worktree-agent-a014587de769261dc`, HEAD `6254a1006` (the same src plus the re-frozen
pins), start `d1c25f5fe` (its `src/` and `test/` equal master's on 2026-11-20). Its rule: a fillet corner's
tangent point's disc is buried by every tube of its surface except the chain of the arm the point lies on;
`GfEval.S37 = "0"` restores the old burial in the mirror only. Brief and handoff:
`docs/design/K1482_s37_tangent_ball.md`. Stage 39 checked it on five more sister mazes (branch
`worktree-agent-ad0904a323c8cdfe0`, HEAD `5b915117e`; handoff `### Handoff K1482 s39` in
`docs/design/K1482_s39_ball_checks.md`; tools `.claude/probes/K1482/s39/` and `s37/`). Its sheets and
`places.txt` are untracked files of its worktree:
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-ad0904a323c8cdfe0\.claude\probes\K1482\out\s39\`
(read them there; view a place's sheet before you reason about it).

**The coordinator's look at every changed place** (3200x1800 frames, border look, start against stage 37's
candidate). The bar: at junctions and thread ends the outline runs on unbroken, with no dot, stub, wedge,
tick or notch; every thread keeps both borders, its width and its heading.
- WORSE than the start: A_b 1077,1509 (near t22s): the candidate cuts a thin slit through a border line at a
  kink (the start's line runs through). A_a 2257,991 (near t29s): a notch bitten into the top of a join (the
  start draws a smooth pointed join).
- NOT CLEAN: A_4 937,1627 (t32s): the ball becomes a smaller ball with a bite out of it. A_a 2270,848
  (t16s): a smaller, slightly lopsided ball. A_5 1233,254 (j68+t30e): the ball only shrinks (1.93 to 1.65
  strokes).
- BETTER, to keep: link A 2290,919 (j57+t22e) and 2099,1137 (j63/t26s); A_5 2042,893 (j116+t65s); A_7
  2269,507 (j159/j160, t83s, t83e); A_8 1149,1576 (j72+t31s); A_9 2154,126 (t28e) and 1894,1390 (t47e); A_b
  994,224 (t25e).
- No visible difference (1 to 39 px): A_4 1948,1293; A_4 996,1410; A_4 2322,673; A_5 2345,852; A_5 1064,410;
  A_6 1094,1294; A_6 1448,1477; A_7 1707,1132; A_9 2258,963.

**Goal.** One narrower rule, yours to design, that (a) leaves the two WORSE places exactly as the start
draws them, or clean: never a slit through a border, never a notch; (b) keeps the BETTER places as stage
37's candidate draws them; (c) at the NOT CLEAN places draws a clean end or the start's ball, not a bitten
one, where that is reachable without breaking (a) or (b): say which each ends as. First find WHY the burial
cuts the border at A_b t22s and notches A_a t29s (which disc, buried by which tube): the narrowing follows
from that cause, not from a per-place exception. The result is a CANDIDATE: Levi decides (K1572), nothing is
pushed.

**Done.**
1. The cause at A_b t22s and at A_a t29s, shown in the mirror, in two or three lines each.
2. The narrowed rule in the mirror and the shader; pins that move re-frozen and named; `npm test` green
   (with `GF_KRETRY` unset). A Vitest case for the rule if a scene fixture makes it cheap; else say so.
3. Every changed place against the start over the 20 test mazes (A_3 = link A to A_d, D_1 to D_a; links as
   in `.claude/probes/K1551/` and `.claude/probes/K1482/s36/`), border look. The mirror can list them without
   a capture (start against candidate on one frozen scene); captures confirm: ONE session per maze, loads
   start, candidate, start, candidate, compared only within the session (start against start and candidate
   against candidate must be 0 px). Capture first the mazes of the list above (A_b, A_a, A_4, then link A,
   A_9, A_5, A_7, A_8), then any maze where the mirror shows a place that is not on the list. A maze takes
   about 4.7 min under the lock: name what you did not capture.
4. For EVERY changed place one sheet in stage 39's layout (before | candidate, wide and close, as drawn and
   brightened, two pictures per row, at most 1800 px wide), a `places.txt`, and a table of the listed places:
   px changed by stage 37's candidate, px changed by yours, one plain line on what is drawn.
5. Guards on your candidate with `GF_KRETRY=1`: `guards.ps1 -Tag s40 -Port <p> -Ref <your commit> -BaseRef
   d1c25f5fe -BarPort <p2> -OutDir .claude/probes/K1482/out/s40/guards -Owner <you> -NoBar`; then, if 35 min
   remain, the K1436 bar (`-BarOnly`): new / grown / gone per scene and its verdict line.

**Setup and rules.** `Get-Date` first. In your worktree: `git merge --no-edit
worktree-agent-ad0904a323c8cdfe0` (local only; it brings stage 37's candidate and both stages' tools). Never
push, never rebase. Ports 6340-6359. Outputs under `.claude/probes/K1482/out/s40/` (untracked; never `git
add -f` them), tools under `.claude/probes/K1482/s40/` (tracked). A build of a commit: `scripts/preview.ps1
-Port <p> -Ref <commit>`. One capture at a time, machine-wide: every capture and guard through
`scripts/perf_lock.ps1` (Muse runs share the lock; wait inside ONE blocking command; leave no lock behind).
`&snd=none` in every shot; never Chrome's `--virtual-time-budget`; Node probes as `node scripts/run_node.mjs
<entry.ts>`. Do not move gf's border strokes toward the older render's, and do not use that render as a bar.
Do not edit `LEDGER.md`. Commit at each milestone (WIP counts). Read code through the shell
(`Select-String`, ranges of `Get-Content`); the Read tool only just before an Edit. Clean up at the end:
previews stopped, no lock held, your temp folders and Chrome profiles removed; never touch
`$env:TEMP\k1482s27live-profile-20548` or another stage's folders.

**Stop rule.** Stop when the list is done or 2 hours after your start (`Get-Date` at the start and at each
milestone), whichever comes first; then commit WIP, append `### Handoff K1482 s40` to this file (the cause,
the rule, the numbers, what did not run, the sheets' paths, the commit to build as the candidate) and
report. A compaction or context size is not a stop: after one, re-read this brief and `git log`. If no rule
meets (a) and (b) together, say so with the numbers and stop: this is the ball's last try. The report ends
with a `Ledger items` list and the handle fields (owner, branch, last commit, evidence, next).

### Notes K1482 s40

- Cause (mirror): at A_b t22s (k21.a, other arm c2) and A_a t29s (k230.a, other arm c56) the other arm's outline at the tangent point is DRAWN (its point qO, h out from the arm, lies in no other chain's tube and no corner sector; the own arm reaches only 1.026 h / 1.047 h), so the disc and arc end there join the arc to a visible outline and burying them cuts a slit / notch. At every better place that outline is buried (own arm within h, or another corner's sector).
- Probe modes (eval.ts GfEval.S37, WIP): P/Q/D = depth-based gates (failed: depth does not separate); U = own arm reach (dropped: the arm sits exactly h from T); S = the tangent disc's other-arm burial times outlineBur (A_b t22s 0 px vs start, A_a t29s 2 px left: arc k61 still buried by own arm c56); V = S with thru corners kept (same as S); W = S plus the arc's own-arm burial gated the same way (t22s 0 px, t29s 0 px; every listed better place equal to stage 37 at 0 px).
- W is the candidate: an own arm buries a corner face only as far as that arm's own outline is buried at the face's point.

### Handoff K1482 s40

Build **4925aa786** as the candidate (the rule and the re-frozen pins; the commits after it add only probe tools
and this handoff). Start d1c25f5fe, stage 37 df2e1c8bb.

**Cause at the two worse places** (mirror, `qo40.ts`, `why40.ts`):
- A_b 1077,1509 (t22s, corner k21.a, other arm chain 2): at the tangent point the other arm's outline is DRAWN. Its
  point qO, h out from that arm, lies in no other chain's tube and no corner's sector, and the corner's own arm reaches
  it only at 1.026 h. Stage 37 let that own arm bury the tangent disc and the arc's end, which is the joint between the
  arc and that visible outline: burying it cut the slit through the border.
- A_a 2257,991 (t29s, k230.a, with corner k61's arc; other arm chain 56): the same, own arm at 1.047 h; stage 37's
  own-arm burial of the disc and of k61's arc end cut the notch.
- At every better place the other arm's outline at qO is buried, by the own arm within h (0.86-0.95 h) or by another
  corner's sector (A_b k64.b by k273, A_3 k60.a by k246, A_7 k166.a by k163, A_9 k143.b by k146), so the buried ball
  joins nothing. Depth does not separate the two groups (modes P, Q, D failed).

**Rule** (eval.ts `outlineBur`, gf_glsl.ts `outlineBur` + `armBur`, in step): a corner's own arm buries a corner face
(an arc point, or the tangent disc at T) only as far as that arm's own outline is buried at the face's point. qO = the
point's foot on the arm's piece pushed out to h; its burial = other chains' tubes of the same surface and the pixel
cell's corners of that surface with kR < r < kRmax, in sector, outside their arms. Form: `if (wb2 > bur) wb2 *=
armBur(...)` (own arm only) at the six face loops (layers arc / tangent, ONE_FACE_OLD arc / tangent, ONE_FACE_NEW,
cornerMerge); stage 37's cT exemption stays. It only lowers a burial, so the zb route stays exact (its two regexes
accept the line). Pins re-frozen: `gf_home_glsl.test.ts` app 925f0fd3..., probe 0ba4866b...; K299's registry
(`paint_ring_lap.test.ts`) counts outlineBur's cell bin as main's expression (2 sites). `npm test` green with
GF_KRETRY unset. No Vitest case: `s40/scan40.ts` finds 0 px between stage 37 and stage 40 on all 15 field fixtures
(retry off and on), so no fixture reaches a changed corner cheaply.

**Numbers** (screen: border look gf_b2, lum step 1, start vs candidate in one session per maze, start vs start and
candidate vs candidate 0 px on all three; every change is ink lost, gained 0; the repeat pair gives the same).
Stage 37's column is its screen count (s37 / s39 handoffs); "mirror" = `census40.ts`, s40 vs s37 px at that place.

| place | stage 37 | stage 40 | what is drawn |
|---|---|---|---|
| A_b 1077,1509 t22s (worse) | 26 | 0 | the start's look: no slit |
| A_a 2257,991 t29s (worse) | 15 | 0 | the start's look: no notch |
| A_b 994,224 t25e | 73 | 73 | stage 37's look |
| A_a 2270,848 t16s (c) | 38 | 3 | the start's ball, 3 px lighter on its left rim |
| A_4 937,1627 t32s (c) | 83 | 83 | stage 37's look (smaller ball with a bite on its right): not reachable, see below |
| A_4 1948,1293 t22s | 39 | 39 | stage 37's look (no visible difference) |
| A_4 996,1410 | 2 | 0 | the start's look |
| A_4 2322,673 | 1 | 0 | the start's look |
| link A 2290,919 | 55 | not captured; mirror 0 | stage 37's look in the mirror |
| link A 2099,1137 | 25 | not captured; mirror 0 | stage 37's look in the mirror |
| A_5 2042,893 | 77 | not captured; mirror 0 | stage 37's look in the mirror |
| A_5 1233,254 j68+t30e (c) | 40 | not captured; mirror 0 | stage 37's look (smaller ball): not reachable |
| A_5 2345,852 / 1064,410 | 23 / 2 | not captured; mirror 0 / 0 | stage 37's look in the mirror |
| A_7 2269,507 | 216 | not captured; mirror 0 | stage 37's look in the mirror |
| A_7 1707,1132 | 1 | not captured; mirror not listed | - |
| A_8 1149,1576 | 119 | not captured; mirror 0 | stage 37's look in the mirror |
| A_9 2154,126 / 1894,1390 | 97 / 35 | not captured; mirror 0 / 0 | stage 37's look in the mirror |
| A_9 2258,963 | 1 | not captured; mirror 1 (s37 2 -> s40 1 px vs start) | - |
| A_6 1094,1294 | 7 | not captured; mirror 25 (s40 = the start's) | the start's look in the mirror |
| A_6 1448,1477 | 1 | not captured | - |

(c) at t32s and t30e: the other arm's outline at qO is buried there, as at the better places, so the rule keeps stage
37's burial; reaching the start's ball there would need a gate that also takes it from the better places ((b)).
Mirror census (`out/s40/census/<maze>.txt`) beyond the list: A_3 1818,892 4 px (s40 = start), A_5 1264,1258 1, A_7
1103,748 1, A_c 1429,785 0, A_d 2102,995 0 and 1057,769 1 (s40 vs s37).

**Did not run**: captures of A_3, A_9, A_5, A_7, A_8, A_6, A_c, A_d and D_1..D_a (Muse held the perf lock 22:06 to
22:23 and the guards needed the rest; seqB was stopped before it took the lock); the D mazes have no scene, so no
mirror census either; the guards panelopen, dragcheck_b and dragcheck; the K1436 bar (-NoBar, under 35 min left).

**Guards** (GF_KRETRY=1, -NoBar, 4925aa786 on 6341, `out/s40/guards/`):
- PASS hold: 60/60 frames, edges min 7090 max 8756
- PASS hold_gfk0: 60/60 frames, edges min 6854 max 9062
- npm test (GF_KRETRY unset, as the guard runs it; run by hand at 22:44 after the guards were stopped): exit 0, 258
  files passed / 2 skipped, 3198 tests passed / 18 skipped.
- NOT RUN: panelopen, dragcheck_b, dragcheck. Muse took the lock at 22:42 after hold_gfk0, and they could not finish
  before the stop; the guards were stopped while waiting (no lock held).

**Sheets**: `.claude/probes/K1482/out/s40/sheets/` (A_b_994x224_t25e, A_a_2268x850_t16s, A_4_937x1627_t32s,
A_4_1948x1293_t22s), `out/s40/places.txt`, `out/s40/mazes.txt`, `out/s40/diff_raw/diffseq_<maze>.txt`,
`out/s40/census/`. Tools: `.claude/probes/K1482/s40/` (runseq40 / capseq40 / cap40, diffseq40, analyze40,
census40, cmp40, scan40, qo40, why40, map40).

**Next**: Levi looks at t22s, t29s and t16s on 4925aa786 (start's look, start's look, start's ball) and at t32s /
t30e (stage 37's look kept); capture the uncaptured mazes (`runseq40.ps1 -Name seqB -Mazes A_3,A_9,A_5`, then A_7,
A_8, A_6) and run guards.ps1's panelopen, dragcheck_b and dragcheck on 4925aa786.
