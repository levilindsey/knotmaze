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
