# K1482 stage 36: the wedge class on link A's sister mazes

Added 2026-11-20 16:40 by the coordinator (claude session 09c7a672). One stage, one agent, 2 h.

## Why

Stages 7 to 35 fixed rp=gf's border look on link A (`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`,
seed 3) one place at a time. Muse run 27L then counted fault kinds on 20 other mazes
(`### Handoff 27L` in `docs/design/K1531_muse_batch27.md`; tools `.claude/probes/K1551/census.py`, `calib.py`;
outputs, untracked, in the MAIN checkout: `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1551\out\27L\`,
one folder per maze with `gf.png`, `sites_gf.json`, `scores.tsv`). The commonest kind is the WEDGE (an ink
blob wider than 1.85 strokes at a junction or an under-tail end): on the ten mazes with link A's settings 264
of 3,602 sites; A_5 44, A_8 42, A_7 41; link A itself 21. On link A the detector is right about half the time
(even sites: 6 of 9 real wedges flagged; 2 clean and 3 other-kind sites flagged too). Not known: how many of
those 127 flags are faults by Levi's bar, and whether they share a cause. The census frames are of an older
build (before stage 34b, ac4387f28): capture again on your starting commit.

## The bar (Levi's approved look; binding)

- At junctions and under-tail ends the over thread's outline runs on unbroken: no dot, stub, wedge, tick,
  notch or sliver. Slivers are accepted (Levi: "Fix the wedges and notches, accept the slivers").
- The under pass keeps its width and its heading: never trade a hook for a point.
- Never remove a thread's border: every thread at the place still shows both borders, its width, its heading.
- A step where an under thread's edge meets the over thread's border is WANTED (t81s), not a fault.
- gf's border look is its own: today's renderer's border strokes are not a bar and not a target.

## The stage

Goal: on A_5, A_7 and A_8 the commonest REAL wedge cause is gone as a class: a rule read from the tables,
never a per-site patch. You own the technique. A way to get there:

1. Class the 127 wedge-flagged sites (4x tiles, `.claude/probes/K1482/tiles.py`): a fault by the bar or not;
   for the faults, the cause, read from the CPU mirror (`GfEval` in `src/render/gpu_field/eval.ts`: which
   piece and which rule inks the blob). Count per cause and per maze.
2. Fix the largest cause in `tables.ts` / `gf_pack.ts` / `eval.ts` / `gf_glsl.ts`, CPU mirror and shader line
   for line. Shader text is compile time on a first visit (K1565; run 27M's numbers): prefer a term in an
   existing loop to a new loop, and report the characters added.
3. If the flags are mostly not faults (detector noise on fat strokes), the classing with its numbers and
   sheets is the finished stage: say so and stop.

## Done

1. The classing table is in the handoff: 127 sites, fault or not, cause counts per maze, one sheet per cause.
2. Every site of the fixed cause viewed again after the fix: the fault is gone at 9 in 10 or more, and none
   is replaced by another fault (no hook traded for a point, no border removed, no new stub or notch).
3. Link A, border look, starting commit against yours in ONE capture session (stage 34's tools,
   `.claude/probes/K1482/s34/`; stage 35's are on branch `worktree-agent-a36a75a8057e449f5` under
   `.claude/probes/K1482/s35/`, read them with `git show`, copy what you use into `s36/`): every changed place
   listed and viewed. j59, t23e, t84e and t81s stay at 0 px: they are with Levi or closed. If your rule moves
   one of them, do not exempt the site: the stage ends as a CANDIDATE with their before and after pictures.
4. The other mazes: A_4, A_6, A_9 to A_d and the ten D mazes, changed places counted per maze; at least 20
   viewed across them, and every D-maze change. A place that got worse stops the landing: report it.
5. Guards on your last commit, `GF_KRETRY=1`: `.claude/probes/K1482/guards.ps1` (hold 60/60, hold_gfk0,
   panelopen, dragcheck, dragcheck_b, npm test) and the bar (`-BarOnly`, new 0, grown 0). `npm test` with
   `GF_KRETRY` unset. The fill look (`&tlk=fill`) and `&gfk=0`: 0 px on link A, or each place explained.
6. Pictures for the coordinator's look, untracked under `.claude/probes/K1482/out/s36/pics/`: per cause one
   before | after sheet of six sites, as drawn and contrast-stretched, with the threads around each site,
   no wider than 1800 px; link A's changed places the same way. Paths in the handoff.

## Rules of the run

- Out of scope: `gf_look.ts` (a Muse run edits it), `gf_app.ts`, `gf_pass.ts`, the fill look, slivers, the
  rounder corners (K1559, K1555), stage 35's candidate (do not merge or cherry-pick 9d42c8f90; if your rule
  touches `arms34()`, `member()` or `homeBurial()` say so in the handoff).
- Never change a file in the main checkout (`C:\Users\lsl\Repositories\knotmaze`): Muse works there. Read only.
- Captures go through `scripts/perf_lock.ps1` (one capture session at a time on this machine), every look
  link with `&snd=none`; an rp=gf shot counts only once `__knotGf.stats.passes` > 0; compare only loads of
  one session, and a session whose same-build loads differ is not counted. Ports 6291 to 6299. Do not delete
  the kept Chrome profile `$env:TEMP\k1482s27live-profile-20548`; copy it for your own profiles.
- PowerShell. Node probes: `$env:GF_KRETRY = '1'; node scripts/run_node.mjs <entry.ts> ...` (not `npx tsx`).
  Read code through the shell (`Select-String`, ranges of `Get-Content`); the Read tool only before an Edit.
- Tools tracked under `.claude/probes/K1482/s36/` (`git add -f`), outputs untracked under
  `.claude/probes/K1482/out/s36/`: never `git add -f` an output. This branch is on the new history: never
  merge or rebase onto a branch that holds d39e363fe.
- Commit WIP at every milestone, broken or not. Never push. Never edit `LEDGER.md`. No helpers.
- STOP RULE: stop when the stage is done or 2 h after your start (`Get-Date` at the start and at each
  milestone), whichever comes first; then commit WIP, append `### Handoff K1482 s36` to this file (what
  holds, what does not, numbers observed against inferred, picture paths) and report. Neither a compaction
  nor context size is a stop: after a compaction re-read this brief and `git log`.
- The report ends with a `Ledger items` list and the handle fields (owner, branch and worktree, last commit,
  evidence, next).

### Handoff K1482 s36

Stage 36 agent, 2026-11-20 16:35 to 17:35 PT, branch `worktree-agent-a02a2591885b583a9`. Outcome: step 3 of
the stage. The wedge flags are mostly not faults (13 of the 127 sites are, by my eye), so the classing is the
finished stage. No rule was built: `git diff a52f098bd -- src` is empty, shader characters added 0, and the
rule's files, `arms34()`, `member()` and `homeBurial()` are untouched. "Fault", "borderline" and "not a
fault" below are my eye against the bar on 3x to 6x tiles, not Levi's verdicts.

**Done, item by item**

1. Holds: the table below, the cause counts per maze, the sheets under Pictures.
2. to 5. Not applicable (no rule landed): nothing re-viewed after a fix, no start-against-mine session, no
   other-maze count, no guards and no `npm test` run (the tree's `src/` is the starting commit's).
6. Holds where it applies: one sheet per class, as drawn and contrast-stretched, with the threads around each
   site, 1773 px wide at most. There is no before | after, since nothing changed.

**Observed: the recapture and the census**

- A_5, A_7, A_8 captured again on a52f098bd (preview on 6291, `cap34.mjs`: `&phw=0&snd=none&prp=off&rp=gf`,
  `&bgs=0`, the border look shot bit-still, `passes` 605 on A_5), one session 17:02:48 to 17:07:39, hashes
  27L's (c79a38dc, b185ec76, c193f2c9), context losses 0. One load per maze, so there is no same-build
  control in the session. The lock was `muse-27Q`'s, 30 min old, and `perf_lock.ps1` removed it as stale
  after a 1462 s wait: run 27Q may still have been drawing during the session.
- 27L's `census.py`, unchanged, on those frames (stroke width 5.66 px on A_5 and A_8, 6.00 on A_7): 124 of
  27L's 127 sites flag again and no new site flags. Gone: A_5 j35 (1.854 to 1.707), A_8 t33s and j76 (one
  blob, 2.0 to 1.561).
- A junction and its tail ends usually flag one blob: the 124 sites are 65 blobs (`group36.py`: widest ink px
  within 4 px).
- 66 of the 124 flags sit on the lowest value the measure can take over the line (1.854 on A_5 and A_8,
  1.886 on A_7); the line is 1.85.

| | A_5 | A_7 | A_8 | all |
|---|---|---|---|---|
| sites flagged by 27L | 44 | 41 | 42 | 127 |
| sites flagged on a52f098bd | 43 | 41 | 40 | 124 |
| blobs | 23 | 22 | 20 | 65 |
| mirror: two chains' side bands only (blobs / sites) | 17 / 31 | 14 / 25 | 11 / 23 | 42 / 79 |
| mirror: side band + fillet arc or tangent term | 4 / 8 | 5 / 11 | 6 / 11 | 15 / 30 |
| mirror: vertex cap | 2 / 4 | 2 / 4 | 3 / 6 | 7 / 14 |
| mirror: open end's cap | 0 | 1 / 1 | 0 | 1 / 1 |
| by eye: FAULT, a ball at a thread end (blobs / sites) | 3 / 5 | 3 / 6 | 1 / 2 | 7 / 13 |
| by eye: borderline | 3 / 6 | 3 / 5 | 4 / 7 | 10 / 18 |
| by eye: not a fault | 17 / 32 | 16 / 30 | 15 / 31 | 48 / 93 |
| fault cause: tangent-point term (blobs / sites) | 2 / 4 | 2 / 4 | 1 / 2 | 5 / 10 |
| fault cause: vertex cap | 1 / 1 | 0 | 0 | 1 / 1 |
| fault cause: not found | 0 | 1 / 2 | 0 | 1 / 2 |

The mirror rows are `class36.ts` + `group36.py`: which outline terms of `GfEval.layers()` ink the blob's
inscribed disc (side band, fillet arc, tangent term, vertex cap, end cap). Of 27L's 127 sites that is 13
faults, 18 borderline and 96 not faults (the 93 and the 3 that no longer flag).

The sites, by eye:
- Fault, tangent-point term: A_5 j68+t30e (census 2.121), j116+t65s (2.000); A_7 j159 (2.219),
  j160+t83s+t83e (2.219); A_8 j72+t31s (2.121). A solid round ball about 2 strokes across at a thread end.
- Fault, vertex cap: A_5 j117 (2.354), the same ball.
- Fault, cause not found: A_7 j37+t28s (1.886), a square, flag-headed stub; the mirror gives side bands only.
- Borderline: A_5 j2, j42+t17s+t17e, j66+t29e; A_7 j20+t7s, j133+t70s, j12; A_8 j74+t32s, j60+t25s, t42s,
  j118+t52e (small nibs, thick apexes, V tips: I could not call them either way).
- Not faults, three kinds: the double line (two threads' borders side by side for a stretch, ending in a
  step or a fork: t81s's kind, which Levi wants; most of the 42 side-band blobs), a pointed corner with a
  thick apex (A_5 t44e, t77e, j156; A_7 j82, j90, j62; A_8 j64, j132), and a fat line beside an eye or a
  sliver (A_7 j101, t42s, j63, j27; A_8 j45, j34, j87, j59, j68, j95; slivers are accepted). The three sites
  that no longer flag look the same in 27L's frame and mine (a V tip; a double line).

**Observed: the ball's cause in the mirror**

- `ball36.ts` (the mirror's widest inked disc at each of the 65 blobs, in strokes, with a term switched
  off). Tangent terms off (`GF_TANG=0`): the disc shrinks at five blobs and nowhere else: A_5 j68+t30e 1.93
  to 1.16, j116+t65s 1.81 to 1.12; A_7 j159 1.75 to 0.93, j160+t83s+t83e 1.87 to 1.05; A_8 j72+t31s 1.80 to
  0.82. Vertex cap off (`E.vtx = () => 0`): A_5 j117 1.73 to 0.83; five more blobs by 0.11 to 0.40 (A_7
  j133+t70s, j37+t28s; A_8 j132+t56e, j118+t52e; A_5 j74+t35s). The other blobs do not move under either.
- `tandepth36.ts`, every fillet tangent point of a corner that inks (R > 0, not a through pass): 526 + 524 +
  512 on the three mazes and 510 on link A (captured 17:24, hash fff8c9e5, losses 0), 2,072 in all. Per
  point: `own`, its distance from the centre line of the nearer of its corner's own two chains on the
  corner's surface, in half-widths h (a point on that chain's outline reads 1.00), and `share`, the part of
  the stroke-radius disc round it that its own tangent term inks. 11 points have `own` under 0.95 h, and the
  same 11, no other, have `share` at or over 0.1:

  | maze | point | px | own (h) | share | covered out to | corner | drawn |
  |---|---|---|---|---|---|---|---|
  | A_5 | k124.b | 2041,892 | 0.67 | 0.55 | 1.25 W | j115, chains 47/65, R 1.665 h | ball (j116+t65s) |
  | A_5 | k257.a | 1240,255 | 0.88 | 0.38 | over 2 W | j68, chains 45/30, R 0.132 h | ball (j68+t30e) |
  | A_5 | k257.b | 1237,255 | 0.91 | 0.27 | over 2 W | the same corner | the same ball |
  | A_5 | k226.a, .b | 2345,837; 2344,849 | 0.92, 0.92 | 0.16, 0.23 | 0.5 W | j20, chains 6/34, R 0.420 h | no ball, not flagged |
  | A_7 | k163.b | 2274,500 | 0.61 | 0.69 | 2 W | j159, chains 66/83, R 0.880 h | ball (j160+t83s+t83e) |
  | A_7 | k166.a | 2262,517 | 0.92 | 0.63 | 1.25 W | j160, chains 83/66, R 0.478 h | ball (j159) |
  | A_7 | k75.a | 1108,744 | 0.93 | 0.17 | 0.25 W | j81, chains 78/37, R 0.189 h | no ball, not flagged |
  | A_8 | k247.b | 1149,1576 | 0.63 | 0.67 | 1.25 W | j72, chains 49/31, R 1.139 h | ball (j72+t31s) |
  | link A | k56.a | 2288,918 | 0.83 | 0.38 | 0.75 W | j56, chains 22/66, R 2.688 h | a round bulb at a hook's end; j57+t22e flag 2.000 there |
  | link A | k60.a | 2103,1138 | 0.79 | 0.16 | 0.75 W | j63, chains 26/71, R 2.999 h | no ball, not flagged |

- `tancover36.ts` at the six ball points of the three mazes: each lies on one arm's outline (1.00 h, or 1.11
  at k257.a) and inside the tube of the corner's OTHER own arm (0.61 to 0.92 h); `tandepth36.ts` finds no
  third chain of that surface among the pieces gathered there. The term's burial loop (`eval.ts` 690 to 707)
  skips the corner's own two chains (K1407 c1), so nothing buries it there.
- 35 tangent points on the three mazes are covered out to 1 W or more and their terms ink under a tenth of
  the disc. The ones I read with `tancover36.ts` (a sample, not all 35) lie inside another chain's tube or
  under a piece of another surface, which the burial loop does read.
- The ball corners are not all tiny: R 0.13, 0.48, 0.88, 1.14, 1.67 h.
- Link A on a52f098bd flags 21 sites (27L: 21). Its guard sites in the mirror: j59 and t23e are side bands of
  three chains plus the vertex cap (28 of 137 disc px), t81s two chains' side bands, t84e one chain's side
  band: no tangent term at any of the four. j57+t22e is tangent term k56 (37 of 101 disc px) with two arcs.

**Inferred (not tested)**

- The tangent term takes its point for a point of the trimmed outline. At these corners the point is inside
  the corner's other arm (in the pictures, at a thread end), so the term inks its whole disc inside the
  surface: the ball.
- Why a point at `own` 0.92 makes a ball at A_7 k166.a and none at A_5 k226 or A_7 k75: how much of its disc
  the surface covers (1.25 W against 0.5 and 0.25 W). Read from the table, not tested by a switch.
- Why the census flags double lines: two borders side by side are 2.0 strokes by construction and the line
  is 1.85. The wedge count is therefore not a fault count on these mazes: 13 of 127 by my eye. The balls'
  own values (2.000 to 2.354, the stub 1.886) overlap those of sites I did not class as faults (up to 2.207
  on A_8 and 2.219 on A_7), so no higher line separates them.
- A rule for the tangent balls would move link A at k56.a (j57+t22e) and perhaps k60.a, and none of j59,
  t23e, t84e, t81s.

**Not explained**

- A_7 j37+t28s, the flag-headed stub (side bands only; the mirror's disc 1.47, 1.35 with the vertex cap off).
- The 10 borderline blobs: no cause read, no verdict.
- Why 3 sites stopped flagging: the build changed (27L's frames are from before stage 34b) and the session
  changed; I did not separate the two. The shapes look the same.
- A_5 j117's vertex-cap ball: which vertex and why its cap is not buried was not read.

**The next stage's target (not built)**

The one class with a cause is small: 5 blobs / 10 sites on the three mazes, 1 on link A. Candidate rule, read
from the tables: bury a tangent point's term by its corner's own arms too when the point lies inside that
arm's tube (`own` under about 0.95 h): 11 of 2,072 points. It is a term in the existing burial loop
(`eval.ts` 690 to 707, and the shader's twin), not a new loop. Open: whether 0.95 h is the line or the
covered depth is (k226, k75 and link A's k60.a pass under 0.95 with no ball; burying them too would have to
be looked at), and what is drawn at the thread end once the ball is gone (a notch or a break there would be
a trade, not a fix). The vertex-cap ball (A_5 j117) and the stub (A_7 j37) are one site each.

**Pictures** (untracked, `.claude/probes/K1482/out/s36/pics/`; each tile as drawn and stretched, 3x)

- `cause_ball.png`: the seven fault blobs (five tangent-term balls, A_5 j117, A_7 j37).
- `cause_double_line.png`: nine double lines, three per maze (not faults).
- `cause_corner_apex.png`: nine corner apexes, V tips and nibs (not faults or borderline).
- `tangent_unflagged.png`: A_5 k226 and A_7 k75, tangent points inside an own arm with no ball.
- `no_longer_flagged.png`: A_5 j35 and A_8 t33s+j76, 27L's frame beside mine.
- `linkA_flagged_calibration.png`: six of link A's flagged sites on 27L's frame (t81s, t84e, j59, j55, j101,
  j120).
- `linkA_tangent_inside.png`: link A's k56.a and k60.a on a52f098bd.
- All 124 sites by maze: `../class/sheet_A_5.png`, `sheet_A_7.png`, `sheet_A_8.png`, `zoom_<maze>_<1|2>.png`.

**Tools** (tracked, `.claude/probes/K1482/s36/`; each header has its usage)

`cap36.ps1`, `capseq36.ps1` (captures; `-Mazes A_3` is link A), `blob36.py` (the census's fat blobs per
site), `class36.ts` (the mirror's terms in a blob's disc), `group36.py` (sites by blob and signature),
`ball36.ts` (term switches), `corner36.ts` (corner rows), `tanball36.ts`, `tandepth36.ts`, `tancover36.ts`
(tangent points), `sheet36.py`, `stack36.py` (sheets). Outputs, untracked: `.claude/probes/K1482/out/s36/
class/m/<A_3|A_5|A_7|A_8>/` (`gf_b2.png`, `sites_gf.json`, `scene_gf.json`, `scores_b2.tsv`, `blobs.json`,
`class.tsv`, `groups.json`, `ball_tan.tsv`, `ball_notan.tsv`, `tandepth.txt`).

**Leftovers**

- `$env:TEMP\k1482s36` (the a52f098bd preview: a registered git worktree `src-a52f098bd` and its build;
  server stopped, its `node_modules` junction deleted), `$env:TEMP\k1482s36-m` (a warmed Chrome profile),
  `$env:TEMP\k1482s36_preview_base.log`.
- This worktree's `node_modules` junction is deleted; recreate it before running `scripts/preview.ps1` here.
