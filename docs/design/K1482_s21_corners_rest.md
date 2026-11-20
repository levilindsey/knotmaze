# K1482 stage 21: finish the 14 wedges and notches on top of fix3 (Claude agent stage)

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** Stage 20 built fix3 (a second
corner try with longer arms, ink only) and did not land it. Read `### Handoff K1482 s20` in
`docs/design/K1482_s20_wedges_notches.md` whole, then that brief's `The sites` and `How to work`: both hold
here with `s21` for `s20`. Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5).

The goal is Levi's approved look: at each of the 14 sites the two outlines meet in one clean rounded or mitred
corner, with no solid dark patch, no square or stepped cut, no tick. You own the technique.

## Where it stands

- fix3 is three WIP commits on branch `worktree-agent-a0f22901bb5fca4a4` (142179c03, 0e0dbc36f, 37eda49e8; not
  on master, not pushed). Start by cherry-picking them onto your branch; your work goes on top.
- Stage 20's tools and captures are untracked in its worktree,
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a0f22901bb5fca4a4\.claude\probes\K1482\s20` and
  `...\out\s20` (site pixels: `out\s20\raw\fix3\sites_gf.json`). Copy what you use into your own
  `.claude/probes/K1482/s21`; change nothing there.
- Two of its previews still run and are yours now (stop them when you finish): port 6010 is the start build
  (master's `src/`), port 6012 is fix3. Your own builds take ports 6013-6029, profiles `$env:TEMP\k1482s21-*`.
- The coordinator's own look at today | fix3 with the surrounding threads in view
  (`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1524\out\k1524_named.png`, made by `card.py` beside it):
  only **j14** reads as finished. Left over at the sites stage 20 counted as improved: t58e the second V, t81s
  the tick at the top, t4s the step at the bottom, j47 the dark stub at the left, j15 the Z spike at the right,
  j4 hardly moves. Partial: t23e, j59. Unchanged: j50, t59s, t84e, j41, t45s. So 13 sites are open.

## Do

1. Stage 20's two causes, each fixed where it is made: (a) pass 0 keeps a corner with a tiny positive r, so no
   retry runs and the tiny corner draws the fault (t59s, j41): replace it without moving t43s's coverage; (b)
   the retry's extension starts from a negative Lcut and stays short (t84e, t45s, j59, t23e): measure the
   extension from the arm's true end. Then j50's cause, then each leftover above to its terms before a fix.
2. Judge every one of the 14 against the goal, not against fix3, in a context crop and a detail crop.
3. **fix3 also rounds about 27 sharp corners Levi did not name; whether that is welcome waits on him (K1524).**
   Until he answers: do not land, and add no new changed place beyond fix3's (name any you add, with a crop).
   If you meet a rule that holds the change to the 14 at no cost to them, keep it as a patch with its numbers:
   it is the fix for a "keep the sharp corners" answer. Do not spend the stage searching for one.
4. Commit WIP on your branch at every milestone. A fix that fails Done is kept as a patch in your probe
   directory, not in `src/`. The coordinator will message you if Levi answers while you run.

## Done

- The class table on your tip, by your own eyes at 4x or more and in context: each of the 14 named finished,
  better with its leftover named, or unchanged. The 5 slivers, j29, j49 and j64 not worse (mirror numbers as
  stage 20's), `count13.py --specks` against the start build 0 new.
- Sheets in `card.py`'s layout (context with the red box, then the box closer), columns today | fix3 | your
  tip: all 14 sites, and every other place your tip moves beyond fix3.
- The capture pins the background clock, so two loads of one build differ by 0 px in the fill look (stage 20's
  `cap20.ps1` does not: 72,965 px between two loads of the start build). Then fill look 0 px, your tip against
  the start build, on built previews.
- On your tip, in the last 30 minutes: `hold.mjs` 60/60 on link A; `.claude/probes/K1482/s15/panelopen.mjs`,
  then both dragchecks pass; `npm test` green; the K1436 bar once, `STRICT=1 -NoPerfLock`, on
  `ring,def,muse_hash,g41_user_tw64`, `-Base` the start build's commit, `-Tag k1482s21`: no new find, none
  grown. A check you could not run is named as not run, with why.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from the end of your first lock wait
(`Get-Date` at each milestone), whichever comes first; keep the last 30 minutes for the checks. Timing checks
need `$env:TEMP\claude-perf.lock` (Muse holds it often: wait in ONE blocking loop, 60 min at most); look
captures do not. Do not stop early while a site is untried and time remains. A compaction is not a stop:
re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s21` here, commit, and
report: the class table, the sheets' absolute paths (each site named), the numbers, a `Ledger items` list and
K1482's handle fields. Never push, never edit `LEDGER.md`.
