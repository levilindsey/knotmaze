# K1482 stage 37: the ball at a thread end (a CANDIDATE for Levi)

Added 2026-11-20 17:45 by the coordinator (claude session 09c7a672). One stage, one agent, 2 h.

## Why

Stage 36 classed run 27L's 127 wedge flags on link A's sister mazes A_5, A_7, A_8 (`### Handoff K1482 s36`
in `docs/design/K1482_s36_wedge_class.md`; its tools `.claude/probes/K1482/s36/`; its captures and pictures,
untracked, readable in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a02a2591885b583a9\.claude\probes\K1482\out\s36\`).
96 are the wanted double line, 18 borderline, and 13 sites (7 blobs) are a real fault: a round BALL of ink at
the end of a border line, at a thread end. Five of the seven blobs have one cause, observed in the CPU mirror
(`GF_TANG=0` shrinks the fat disc at exactly these): a fillet tangent point lies inside the tube of its
corner's own other arm (0.61 to 0.92 h from its centre line), its term inks a ball there, and the burial loop
(`eval.ts`, lines 690 to 707 on a52f098bd) skips the corner's own two chains (K1407 c1). Of 2,072 tangent
points on the three mazes and link A, 11 lie inside an own arm: six make the five balls (A_5 j68+t30e,
A_5 j116+t65s, A_7 j159, A_7 j160+t83s+t83e, A_8 j72+t31s), one is link A's k56.a (the bulb at j57+t22e), and
four draw no ball (A_5 k226.a and .b, A_7 k75.a, link A's k60.a at j63).

## The bar (Levi's approved look; binding)

- At junctions and under-tail ends the over thread's outline runs on unbroken: no dot, stub, wedge, tick or
  notch. A ball at a line's end is a dot.
- The under pass keeps its width and its heading: never trade a hook for a point. The hook that carries the
  ball keeps its shape, its width and its heading; only the ball goes.
- Never remove a thread's border: every thread at the place still shows both borders.
- A step where an under thread's edge meets the over thread's border is WANTED, not a fault.
- gf's border look is its own: today's renderer's border strokes are not a bar and not a target.

## The stage

Goal: the ball is gone as a class, by a rule read from the tables (`tables.ts` / `gf_pack.ts` / `eval.ts` /
`gf_glsl.ts`, CPU mirror and shader line for line), at the five blobs and at link A's j57+t22e, and what is
left at each thread end meets the bar. You own the technique. Stage 36's idea (an own arm buries a tangent
point's term when the point lies inside that arm's tube: one more term in the existing burial loop and its
shader twin) is a start, not an order; open are where the line sits (a distance such as 0.95 h, or covered
depth: the four points without a ball are covered out to 0.25 to 0.75 W, the balls to 1.25 W or more) and
what the line's end looks like once the ball is gone. Shader text is compile time on a first visit (K1565):
prefer a term in an existing loop, and report the characters added.

This is a CANDIDATE stage: link A moves at a place Levi has not named, so nothing lands without his yes.
Deliver it ready to land: all checks run, before | after pictures he can judge.

## Done

1. The five blobs and link A's j57+t22e, before | after, each viewed by you against the bar beside its
   before: the ball is gone, the hook is whole, both borders of every thread there are drawn, and no gap,
   stub, notch or point took the ball's place. A site that fails is reported with its picture, not hidden.
2. The four points that drew no ball: 0 px, or before | after viewed and no worse.
3. Link A, border look, your start commit against yours, ONE capture session that loads start, yours,
   start, yours (stage 36's `capseq36.ps1`, stage 34's `s34/capseq34.ps1` and `diffseq34.ps1`): every changed
   place listed and viewed; j59, t23e, t84e, t81s and j15 stay at 0 px (if one moves, do not exempt it: show
   it). The fill look (`&tlk=fill`) 0 px. `&gfk=0`: the px changed and why.
4. A_5, A_7, A_8: every changed place counted and viewed. The other sister mazes (A_4, A_6, A_9 to A_d): the
   changed places per maze, at least 20 viewed across them. The ten D mazes: every change viewed. Any place
   that got worse: its picture in the report.
5. Guards on your last commit, `GF_KRETRY=1`: `.claude/probes/K1482/guards.ps1` (hold 60/60, hold_gfk0,
   panelopen, dragcheck, dragcheck_b, npm test) and the bar (`-BarOnly`, new 0, grown 0). `npm test` with
   `GF_KRETRY` unset.
6. Pictures, untracked under `.claude/probes/K1482/out/s37/pics/`: per place of Done 1 ONE sheet, before |
   after, at two zooms (with the threads around it, and close), as drawn and contrast-stretched, no wider
   than 1800 px, labelled `before` and `candidate`; one sheet of the other changed places. Paths in the
   handoff.
7. A_5 j117 (a vertex-cap ball) and A_7 j37+t28s (a stub, cause not found) are not this stage's: if your rule
   moves them, show them.

## Rules of the run

- Out of scope: `gf_look.ts` (a Muse run edits it), `gf_app.ts`, `gf_pass.ts`, the fill look, slivers, the
  rounder corners (K1559, K1555), stage 35's candidate (do not merge or cherry-pick 9d42c8f90; if your rule
  touches `arms34()`, `member()` or `homeBurial()` say so in the handoff).
- Never change a file in the main checkout (`C:\Users\lsl\Repositories\knotmaze`) or in another agent's
  worktree: read only.
- Captures go through `scripts/perf_lock.ps1` (one capture session at a time on this machine; a Muse run
  captures too, so expect to wait), every look link with `&snd=none`; an rp=gf shot counts only once
  `__knotGf.stats.passes` > 0; compare only loads of one session, and a session whose same-build loads differ
  is not counted. Ports 6301 to 6309. Do not delete the kept Chrome profile
  `$env:TEMP\k1482s27live-profile-20548`; copy it for your own profiles.
- PowerShell. Node probes: `$env:GF_KRETRY = '1'; node scripts/run_node.mjs <entry.ts> ...` (not `npx tsx`).
  Read code through the shell (`Select-String`, ranges of `Get-Content`); the Read tool only before an Edit.
- Tools tracked under `.claude/probes/K1482/s37/` (`git add -f`), outputs untracked under
  `.claude/probes/K1482/out/s37/`: never `git add -f` an output. This branch is on the new history: never
  merge or rebase onto a branch that holds d39e363fe.
- Commit WIP at every milestone, broken or not. Never push. Never edit `LEDGER.md`. No helpers.
- STOP RULE: stop when the stage is done or 2 h after your start (`Get-Date` at the start and at each
  milestone), whichever comes first; then commit WIP, append `### Handoff K1482 s37` to this file (what
  holds, what does not, numbers observed against inferred, picture paths) and report. Neither a compaction
  nor context size is a stop: after a compaction re-read this brief and `git log`.
- The report ends with a `Ledger items` list and the handle fields (owner, branch and worktree, last commit,
  evidence, next).

### Handoff K1482 s37

Started Fri 2026-11-20 17:35:30 PT, stop line 19:35:30. A CANDIDATE: nothing here is landed or pushed.
Branch `worktree-agent-a014587de769261dc`, src commit df2e1c8bb (later commits add tools, pins and this text;
`git diff df2e1c8bb HEAD -- src` is empty). Pictures and outputs are untracked, under
`.claude/probes/K1482/out/s37/` of this worktree (`out/s37/` below).

**Against the Done list** (details below; "viewed" = by me, before beside candidate, threads around in view):
1. Five of the six places hold as viewed: link A j57+t22e, A_5 j116+t65s, A_7 j159, A_7 j160+t83s+t83e,
   A_8 j72+t31s. **A_5 j68+t30e FAILS: its ball is smaller and still a ball.**
2. Holds: link A k60.a 25 px and A_5's k226 eye 23 px, both viewed, no worse; A_7 k75.a 0 px on the GPU.
3. Holds: link A 80 px in 2 places, both viewed; j59, t23e, t84e, t81s, j15 0 px; fill 0 px; `gfk=0` 102 px
   in the same 2 places.
4. A_5, A_7, A_8: 7 changed places, all viewed, none worse. **NOT RUN: the other sister mazes (A_4, A_6, A_9
   to A_d) and the ten D mazes.**
5. `npm test` passes with `GF_KRETRY` unset. The capture guards: see **Guards** below. **The bar was NOT
   RUN** (only its CPU mirror scans: new 0, grown 0).
6. Sheets made: paths under **Pictures**.
7. A_5 j117 and A_7 j37+t28s: 0 px, not moved.

**The rule** (`src/render/gpu_field/eval.ts` and `gf_glsl.ts`, the tangent term's burial loop, mirror and
shader line for line). A fillet corner's tangent point is now buried by every tube of its surface except the
chain of the arm the point lies on, so the corner's OTHER arm buries it; the corner's arc is buried by every
tube including both of its own arms. K1407 c1 had exempted both own chains from both. It does not touch
`tables.ts`, `gf_pack.ts`, `arms34()`, `member()` or `homeBurial()`. `GfEval.S37 = "0"` (env `GF_S37=0`)
restores the old burial in the mirror only.

**Shader text** (observed, `s37/srclen37.ts`, start d1c25f5fe against the candidate): the app program
45269 -> 45238 characters, its home form 45730 -> 45699, retry + home 47478 -> 47447 (31 fewer each); the
probe program 45771 -> 45631 (140 fewer in each form). Nothing added. The BASE text changed, so every
program's text changed, `gfk=0` and home-off included: `test/render/gf_home_glsl.test.ts`'s two source pins
were re-frozen (fa3e90967).

**Link A on the GPU** (observed; ONE session, loads start, mine, start, mine; all hash fff8c9e5, lost 0,
passes 708 / 712 / 689 / 713, one view; `out/s37/diff_raw/diffseq_A_3.txt`):
- border look: start against start 0 px, mine against mine 0 px, start against mine 80 px at a step of 1
  level or more, all ink lost, in 2 places: 55 px at 2290,919 (j57+t22e, the ball) and 25 px at 2099,1137
  (k60.a at j63, t26s). j59, t23e, t84e, t81s and j15: 0 px.
- fill look (`&tlk=fill`): 0 px (the four pictures are one hash).
- `&gfk=0`: 102 px in the same 2 places (62 and 40 px, ink lost), floors 0 px, fill 0 px. Why: the rule is
  in the base text, which the retry-off programs share.
- Viewed by me, before beside candidate: j57+t22e's ball is gone and the line now meets the over thread's
  border in a plain corner; the hook keeps its shape, width and both borders
  (`out/s37/pics/linkA_j57_t22e.png`). k60.a at j63 loses a small nub at the hook's tip; the tip still
  reaches the over thread's border, no gap (`out/s37/pics/linkA_j63_t26s_k60a.png`): no worse.
- The loads' `src` record differs: start loads 9 program sources (550467 characters), mine 3 (260438). The 3
  are the look programs that drew the shot (87067 / 87882 / 85800 against 87036 / 87742 / 85660); the start's
  other 6 are the base and reveal sets the idle prewarm issues. Inferred, not checked: the compile worker
  had not finished those sets on my build's new text when the shot was taken (the start's text was already
  in the copied profile's cache). They draw nothing in a border shot.

**The CPU mirror's census of the rule** (observed, stage 36's scenes, `out/s37/census/<maze>.txt`; no place
gained ink):
- A_3 (link A): 108 px in 3 places (69 at k56.a = j57+t22e, 35 at k60.a, 4 px at 0.03 of a level at k129.a,
  which the GPU diff does not show).
- A_5: 208 px in 5 places: k124.b (j116+t65s) 102 px, the ball gone (widest disc 1.81 -> 0.96 strokes);
  k257 (j68+t30e) 58 px and THE BALL STAYS (1.93 -> 1.65 strokes): this place FAILS Done 1; k226.b (the
  t34e eye) 37 px; k44.a (t14s, a triangle eye's tip, a place nobody named) 10 px; k146.b 1 px at 0.03.
- A_7: 264 px in 3 places: k163.b (j159) 162 px and k166.a (j160) 98 px, both balls gone (1.87 and 1.75 ->
  0.93); k75.a 4 px at 0.07.
- A_8: 155 px in 1 place: k247.b (j72+t31s), the ball gone (1.80 -> 0.82).
- Why k257 stays (observed depths, `s37/depth37.ts`, plus an inference): its disc lies 2.00 px inside its OWN
  arm's chain (inferred: the hook's far leg, the same chain), and the eye points that must keep their discs
  (k226.a, k75.a) lie 1.32 and 1.30 px inside theirs; 0.7 px is less than the burial's 1 px ramp. Every
  variant that buried own-arm discs opened or notched an eye in the mirror (`out/s37/mir_*`), so none was
  kept.

**A_5, A_7, A_8 on the GPU** (observed; ONE session per maze set, loads start, mine, start, mine, border
look; every load: the maze's hash (c79a38dc, b185ec76, c193f2c9), lost 0, passes 592 to 621, one view per
maze; start against start 0 px and mine against mine 0 px on all three; the still border shot and the
as-loaded shot agree; `out/s37/diff_raw/diffseq_<maze>.txt`). Every change is ink lost (gained 0), and the
repeat pair (second start against second mine) gives the same places and counts. No fill or `gfk=0` shots
were taken of these mazes.
- A_5: 142 px in 4 places: 77 px at 2042,893 (j116+t65s); 40 px at 1233,254 (j68+t30e); 23 px at 2345,852
  (t34e, the k226 eye); 2 px at 1064,410 (t14s, k44.a). j117: 0 px.
- A_7: 217 px in 2 places: 216 px in one blob at 2269,507 (box 2256..2279 x 494..522: j159 and
  j160+t83s+t83e together); 1 px at 1 level at 1707,1132 (near t20e and j53, not in the mirror census; cause
  not looked for). k75.a: 0 px. j37+t28s: 0 px.
- A_8: 119 px in 1 place, 1149,1576 (j72+t31s).
- The mirror counts more px than the GPU diff at each place (A_5 208 against 142, A_7 264 against 217, A_8
  155 against 119, link A 108 against 80): the GPU diff counts steps of 1 level or more.

**Viewed, place by place** (my reading of each sheet; the pictures are the evidence):
- link A j57+t22e: above. Holds.
- A_5 j116+t65s: the ball sat on the vertex of a V. It is gone; the V's two legs are where they were and
  meet in a plain sharp corner. No gap, stub or notch. Holds, with the note that the tip is now a sharp
  vertex.
- **A_5 j68+t30e: FAILS.** The ball at the end of the curled line is smaller and still a ball. The hook is
  otherwise unchanged.
- A_7 j159 and A_7 j160+t83s+t83e (one thread end, a ball on each corner of its end and a small spike
  beside the upper ball): both balls and the spike are gone; the end is a plain rounded U that joins the
  thread's two borders, width kept, no gap. Holds.
- A_8 j72+t31s: the ball is gone; the curled line now ends in a plain corner where it meets the next line,
  as at link A j57+t22e. The curve and both lines are where they were. Holds.
- Other changed places (`others_A3_A5_A7.png`): link A k60.a, a nub at the hook's tip is gone; A_5's k226
  eye, the thick side of the small eye is now as thin as the rest and the eye stays closed; A_5 t14s (2 px)
  and A_7 t20e (1 px): no difference I can see. None worse.

**Pictures** (`out/s37/pics/`, each before | candidate, as drawn and contrast-stretched, 1786 px wide, two
zooms): `linkA_j57_t22e.png`, `A_5_j116_t65s.png`, `A_5_j68_t30e.png` (the failing place), `A_7_j159.png`,
`A_7_j160_t83s_t83e.png`, `A_8_j72_t31s.png`; `linkA_j63_t26s_k60a.png`; the other changed places on one
sheet, `others_A3_A5_A7.png` (1562 px wide). The mirror's pictures of each corner: `out/s37/mir_rule/`.

**The `src` record on the sister mazes** (observed): the start's loads hand the GPU 638543 / 725241 / 814132
characters of program source on A_5 / A_7 / A_8, mine 354996 / 403588 then 499973 / 499973 then 549534 (first
then second load). Mine grows from load to load, which fits the inference above (the idle prewarm still
compiling my build's new text); it is still not checked.

**Tests** (observed): `npm test` with `GF_KRETRY` unset: 258 files passed, 2 skipped; 3198 tests passed, 18
skipped; exit 0 (`out/s37/npmtest_unset_2.txt`, tree a201efc7a; src and tests are the same at HEAD). With
`GF_KRETRY=1` set (not asked for; `out/s37/npmtest_kretry1.txt`) one test fails, `gf_home.test.ts` "packs
aHome into the arm record's free .y only with the switch on" (the arm record's .z reads 1, expected 0), and
it fails the same way on the start commit d1c25f5fe with that flag set: not this stage's. No unit
test asserts the new burial itself: the two source pins in `gf_home_glsl.test.ts` catch a change of the
shader text, nothing catches a change of the mirror's rule. On the 15 tracked fixture scenes
(`test/render/field/scenes/`, 18 fillet corners among them) the rule changes 0 px in the mirror (`census37.ts`
on each, observed), so a test of it needs a new fixture, for example a cut-out around A_7 j159.

**Guards** (`guards.ps1 -Tag s37 -Port 6302 -Ref ec107c484 -BaseRef d1c25f5fe -NoBar` with `GF_KRETRY=1`;
the page on 6302 is df2e1c8bb's build, whose `src/` is ec107c484's and HEAD's; one line per guard in
`out/s37/guards/summary.txt`, each guard's whole output beside it), observed:
- PASS hold: 60/60 frames, edges min 6830 max 8494
- PASS hold_gfk0: 60/60 frames, edges min 7005 max 8817
- PASS panelopen: panelOpen=1 exit 0
- PASS dragcheck_b: 0 / 0 / 12 / 0 px over TOL 24 (max 12 <= 200)
- **dragcheck: NOT RUN.** The guards started at 18:57:20 and waited 17 minutes for the lock behind stage 38's
  capture and a Muse run, then 4 more before dragcheck_b; dragcheck could not finish before the stop line, so
  the run was stopped at 19:27:35, in its wait for the lock (it held none).
- The guards' own `npm test`: NOT RUN (it comes last); the same suite passed with `GF_KRETRY` unset on the
  same `src/` and tests (**Tests** above).

**The bar: NOT RUN.** Its builds, warm passes and screen scans (30 minutes or more) did not fit beside the
lock waits. Run instead, CPU only: the bar's mirror scans of ring, def, muse_hash and g41_user_tw64 on
d1c25f5fe and df2e1c8bb with `GF_HOME=1`, compared by `k1436_bar_cmp.mjs` (`out/s37/barmirror/bar.txt`):
new 0, grown 0, gone 4, all on muse_hash at two places (world 34.2,18.5: dstray 43 px and rstray 100 px;
29.7,23.5: dstray 45 px and rstray 50 px). The comparator's verdict line reads FAIL only for the four
missing screen scans. Those two places were not viewed (inferred, not checked: two more balls of this
class).

**Not run** (the capture lock was shared with a Muse run and stage 38; my waits: 23 minutes before the
sister mazes' session, and the guards queued behind stage 38 at 18:57): the bar; the other sister mazes
(A_4, A_6, A_9 to A_d); the ten D mazes; fill and `gfk=0` shots of A_5, A_7 and A_8.
