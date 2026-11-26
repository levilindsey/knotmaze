# K1584 stage 10: three balls get the wedge, and the wedge opens to the gap's width at its outer side

Read first: `K1584_s9_brief.md` and its handoff (this stage's base: the opening-angle measure,
`GAP_WEDGE_THETA`, the rank sheets), then `K1584_s6_brief.md`'s handoff (the wedge, `lkBall`). Base: this
worktree's HEAD.

## Levi (2026-11-25, on the rank sheets `s9/out/rank_1.png` ... `rank_6.png`)

> Yes, #2 should also have a wedge. #3 I think is just barely skinny enough to need a wedge.
>
> Also, I think these wedges should all do a better job of being wider on their outer side--ideally this
> width should be close to the target gap width

So the wedge applies at #1 A_3 k63 (40.1 deg), #2 A_5 k176 (43.2) and #3 A_6 k265 (44.9), and not at #4
A_6 k331 (45.2) or #5 A_a k202 (45.7), which he called not tight. #3 is "just barely": the line sits right
after it. The angle leaves 0.3 deg between #3 and #4; his word is "skinny", so if another measure (the
ball's or the turn's width, the closed length) separates the three from #4 onward with more room and reads
as what he sees, use it and say so; otherwise set the angle's line between them.

The second paragraph is about the wedge's shape at every ball that gets one: at its outer side (where it
leaves the ball) the wedge should be about as wide as the ordinary gap there, the target gap width. As
built it is still narrow at the ball's edge: on the rank sheets' third column the cut reads as a thin slit.
It keeps its apex at the ball's centre. You own the technique. The earlier variants are on branch
`k1584-wedge` (worktree `...\worktrees\k1584-wedge`, read only): V2 and V3 widened over a longer distance
and read as a crack, the wrong direction; V4's pie broke balls. Measure the width on screen, not in the
model.

## This stage

Those two things only. Balls on the loose side keep stage 9's look pixel for pixel, and so does everything
that is not a ball in a crossing's gap. Not this stage: the loose balls' own look (Levi's call, pending),
the corner misses (K1608), the loop and far terms, the junction rule (`eval.ts`, `gf_glsl.ts`: keep out
unless you must, and name it).

Bindings: all earlier briefs'. The ball stays one piece, joined at its centre; no loose piece of border
left by a ball that gets the wedge (k63's 149 px piece is today's too: do not make it worse, and say what
happens to it); never remove a thread's border; the under pass keeps its width and heading; the fade
narrows with the wedge; `fadeLength` stays live with no table rebuild.

## Done

1. The line and the shape in `src/render/gpu_field/` with the mirror and tests; `npm test` green; every
   re-frozen pin named.
2. A capture of all 21 mazes (tag `s10a`; warm the profiles first with `warm7.ps1`; under the perf lock,
   `scripts/perf_lock.ps1`, never by hand; nothing else heavy running).
3. For Levi: one sheet of the three balls, large (12x or more), columns `today | s9 | s10`, plus fade at
   0, 0.14, 0.5 and 1.2 for each. Viewed by you. Under each, the wedge's width on screen where it leaves the
   ball against the ordinary gap's width just beyond (px, both).
4. s9a against s10a, every changed place on all 21 mazes listed and viewed: each is one of the three
   balls, or you report it.
5. Counts within one run of `screen.py`: closed sides (s9: 136) and loose pieces (s9: 501/16/36/1367), and
   the loose pieces at the three balls.

## How to work

- Work in this worktree on this branch from its HEAD: no reset, rebase or merge. `Get-Date` first.
- Preview ports 5630 to 5639. PowerShell. Read code through the shell; the Read tool only just before an
  Edit, and for images. Write every file inside this worktree, never in the main checkout.
- Commit WIP at every milestone, broken or not (`git add -f` for probe tools, never their outputs). Never
  push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
  `--virtual-time-budget`.
- Helpers on sonnet, mechanical work only, with this stop rule. Looks are yours: view every place you report.

## Stop rule

Stop when every Done holds or after 2 h of wall clock (`Get-Date` at each milestone), whichever comes first.
A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`## Handoff (stage 10)` here, commit, and report: what holds and what does not (failing checks with their
numbers), sheet paths, the widths, the counts, a `Ledger items` list and K1584's handle fields (owner,
branch, last commit, evidence, next).

## Handoff (stage 10)

Agent a740f982f54a7df2a (coordinator session 09c7a672-a414-402a-97da-b3176839a2e5), 09:00:50 to about 10:35 PST.

**Coordinator's change (from Levi, mid-stage; overrides the brief above).** Loose-side balls (#4 onward)
draw the V1 wedge exactly as stage 8 drew it: target pixel-identical to capture s8a at every loose-side ball
(not s9a). Tight-side balls (#1 A_3 k63, #2 A_5 k176, #3 A_6 k265) get the new wedge, wider at its outer
side. The line only chooses between the two shapes. Done 4 compares s10a against s8a (every changed place is
one of the three balls, or reported); Done 5's counts compare with s8 (closed sides 136, loose pieces
501/15/33/1367). Levi's words on the rank sheets: "Looser balls: the stage 5 column is fine, except for k157,
k141, and k2, which all have an extra gap on their middles. The last column seems fine for all of them."

**Build.** d580f0230 (`gf_look.ts`: lkBall returns vec2(s, tw); tw = 1 - smoothstep(GAP_OPEN_FULL 2.0,
GAP_OPEN_END 3.0, r) on corners tighter than the line, `ballOpenAt` its CPU twin; where tw > 0 lkGap mixes the
coded cut's scales toward the ordinary gap's (1, 1) and lifts jf and fo), ac3f194f1 (tests; one re-frozen pin:
`test/render/gf_look.test.ts` ~line 99, the call-site string, because lkBall's .y now recomputes the gap where
the coded cut is 0), 39347d3ed (probe tools). eval.ts and gf_glsl.ts untouched. `npm test` green on 39347d3ed:
3252 passed, 18 skipped.

**Done 2.** s10a: 21 mazes on ac3f194f1, warmed, under perf_lock, lost 0 (`s7/out/s10a/`).

**Done 4 (s8a -> s10a).** 48 px in 3 places, all tight balls: A_3 (1049,264) 29 px (k63); A_5 (2341,514) 18 px
and (2343,508) 1 px (k176). k265 0 px (it was already open to its centre in s8a). Every loose-side ball 0 px,
so pixel-identical to s8a. All 21 mazes viewed (`s10/out/chg10.txt`, `chg10_1.png`).

**Done 5 (one screen.py run).** Closed sides 136 -> 134: A_3 side 100 (1053.9,263.7) closed -> part (gap
0.964 -> 0.544) at k63, A_5 side 258 (2341.1,510.8) closed -> part (0.922 -> 0.567) at k176; no other verdict
moved. Loose pieces 501/15/33/1367 -> 501/15/33/1367. At the balls: k63's piece 149 -> 127 px at (1054,266),
same bin, still one piece (the ball itself, 156 px today); none within R + 10 px of k176 or k265.

**Done 3 (sheet).** `.claude/probes/K1584/s10/out/sheet10.png` (today | s9 | s8 | s10 = fade .14 | fade 0 |
.5 | 1.2, 12x) and `sheet10_fade.png` (s8 against s10 at fades .5, 1.2, .14; s8 captured at those fades as
`s10/out/s8f05`, `s8f12`, build 6c6c5ae0f, same state hashes). Widths (`s10/wid.py`, across the wedge's axis,
t = distance from the ball's centre, ink 20 / paper 30-34):
- k63 (axis 187 deg): at the ball's edge (t 6.45) 4.31 px against the ordinary gap's 4.36 (s5); t 8: 4.47 vs
  4.47. Apex t 3/4/5: 1.99/2.38/3.26 px. Fade 0: 3.37 px at the edge.
- k176 (axis 101 deg): edge 2.85 vs 2.85; t 8 2.90 vs 2.76-2.90; then a PINCH: t 10 1.88 px, t 12 0 px,
  where the ordinary gap is 3.05-3.14 px.
- k265 (axis -25 deg): edge (t 8.45) 2.99 px; t 9.5/11/13 2.95/3.10/3.30. Unchanged from s8a.

**What does not hold.**
1. k176's pinch, the dark "foot" closing the wedge 10-12 px out (1.6-1.9 R). Observed: `s10/kreach.ts` puts
   the corner list's reach (kRmax + W + 2aa) at 10.17 px for k176 (10.39 k63, 13.18 k265), where the pinch
   starts; the open form runs to GAP_OPEN_END 3 radii but lkBall sees only listed corners. Inferred: past the
   reach tw = 0 and the slot's narrow s7 code returns. Not tested by a change. Fix candidates: bake the
   ordinary code into the GfGapTable slots near a tight corner (tables only), or widen the list's reach for
   tight corners (gf_glsl.ts's scan).
2. The fade at 1.2 widens instead of narrowing with the wedge. Fade .5: 0 px differ from s8 at all three
   balls. Fade 1.2: k63 18 px and k176 19 px differ from s8, all within 6.1 px of the centre; the ball keeps
   58 of 130 disk px inked (s8: 77) at k63 and 57 (s8: 84) at k176, so k63 reads as a lower crescent and k176
   as a right crescent, and k176's centre 3x3 is part lit (23-32). Inferred: the mix toward the ordinary
   scales lets the fade run its full length from a cut that now reaches the centre. Fix candidate: scale the
   fade by the wedge's local width (tw times the open fraction), not the full ordinary scale.
3. Look (viewed, for Levi): k63 reads as a clean pac-man mouth to the upper left. k176 reads as a light
   triangle on the ball's left closed by the foot, beside s8a's vertical slit: likely a crack. k265 shows no
   change.

**Next.** Levi's look at `sheet10.png` and `sheet10_fade.png`; then k176's pinch and the long-fade width,
both in tables/gf_look.ts, re-captured against s8a.
