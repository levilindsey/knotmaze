# K1482, on a "keep" answer to K1524: tell a faulty corner meeting from a clean point (Claude agent stage)

**Not started. Launch only if Levi answers K1524 with "keep today's sharp corners" (or names rows to keep);
on "take the rounding" delete this file.**

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** rp=gf's corner solver joins
two outlines at an inside corner with a small rounded corner. Where that first try fails the outlines meet
raw. At most such corners the raw meeting is a clean sharp point; at a few it is a fault (a notch, a wedge, a
tick): the 14 sites Levi named on link A (`The sites` in `docs/design/K1482_s20_wedges_notches.md`).

K1482 stage 22's **C1** (a294f3271 on branch `worktree-agent-adabb55bc67661562`; read `### Handoff K1482 s22`
in `docs/design/K1482_s22_landable_corners.md` whole, then `### Handoff K1482 s21` in
`docs/design/K1482_s21_corners_rest.md`) adds a second try with longer arms, drawn in ink only. It finishes
j14 and passes the K1436 bar, but it cannot tell a fault from a clean point: its two gates (r >= 0.1 h, sag
<= 0.35 h) are about the ball, not about the meeting, so on link A it also rounds 98 clean sharp corners
nobody named. Whether rounding those is welcome is Levi's call (K1524, unanswered). **This stage finds what
tells the two apart, so the second try runs only where the raw meeting is a fault** and can be the default
whatever he answers.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5).

## Do

1. In your worktree: `git merge origin/master`. Stage 23 (`docs/design/K1482_s23_corner_switch.md`) put C1 on
   master behind a switch (`gfk=1`; off = the picture without the second try). Work with the switch on.
2. Labels on link A: every corner the second try reaches or should reach. A corner at a named site's fault is
   a **fault** (with or without a ball: j4, j47, t45s, t84e have none worth drawing); every other corner the
   second try changes is **clean** (stage 22's `unnamed_c1_ranked.txt` lists the 98, in
   `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-adabb55bc67661562\.claude\probes\K1482\out\s22\`;
   its tools are in `...\K1482\s22\`: copy what you use, change nothing there).
3. Features, from the tables and the mirror, per corner: why the first try failed (which rejection), each
   arm's length before and after a crossing pin cuts it, the angle, whether an arm ends at a cut, a tail or a
   junction, whether the two raw outline ends meet in one point or miss by a step, home membership. Stage 4
   found the notches where "a crossing pin cuts a T's through arm to Lcut ~0, the corner solve rejects the
   pair and home still joins the arm": start there.
4. Find the rule that keeps the faults and leaves the clean points. Then test it where there are no labels:
   on the bar's four mazes, list every corner the second try still changes with the rule, and judge a sample
   of 20 by eye in a context crop and a detail crop (base | C1 | C1 with the rule): was the raw meeting a
   fault?
5. Build the rule into the second try as its gate. You own the technique; a rule that needs data the tables do
   not carry may add it.
6. Make the gated second try the **default**, with `gfk=1` keeping C1 as it is (every corner rounded) for
   Levi's comparison.

## Done

- **The rule, with numbers on link A:** of the 98 clean corners, how many still round (target 0; each one
  left is shown and explained); j14 still finished; each other C1 gain (t81s, t58e, t4s, j50) kept or lost,
  by your own eye.
- **On screen**, link A, loads of one state and one view (pin the background clock; stage 21's handoff, `The
  76,609 px fill difference`): px changed against master outside the named sites, the fill look 0 px or each
  place named. Sheets in the layout of `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1524\card.py` (the
  surrounding threads with a red box, then the box closer), today | C1 | with the rule: the 14 sites, and
  every unnamed place that still moves.
- **The bar** (`.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` origin/master's SHA, `-Tag k1482keep`): new 0, grown 0, gone 0.
- Under the perf lock on your tip: `hold.mjs` 60/60 on link A; `.claude/probes/K1482/s15/panelopen.mjs`; both
  dragchecks; `npm test` green.
- `docs/design/K1482_fault_gate.md`: the rule in words and in table terms, why it separates the two (the
  geometry), the numbers, what it cannot tell apart, and three or four lines of it in
  `.claude/rules/render-gpu-field.md`.
- If nothing in the tables separates them: which pairs cannot be told apart, with pictures, and what data
  would do it. That is where the next stage starts, not a stop while time remains: try that data.

## How to work

As K1482 stage 22's `How to work` (and the one in `docs/design/K1482_s20_wedges_notches.md` it points to),
with these changes: ports 6090-6109, profiles `$env:TEMP\k1482keep-*`, probe directories
`.claude/probes/K1482/keep` and `.claude/probes/K1482/out/keep` (untracked: do not `git add` raw captures or
dumps). At most three preview builds alive at once; stop yours and remove their directories when you finish
(the disk is short). Muse runs capture work in the main checkout (batch 27) and takes
`$env:TEMP\claude-perf.lock` for up to 25 minutes at a time; wait for the lock
in ONE blocking loop (60 min at most).

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. A compaction is not a
stop: re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 keep` here, commit,
and report: the commits to land by SHA in order (or the prototype's SHA and its base), the rule in two
sentences, the numbers, the sheets' absolute paths, a `Ledger items` list and K1482's handle fields. Never
push, never edit `LEDGER.md`.
