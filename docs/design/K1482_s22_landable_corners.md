# K1482 stage 22: a wedge and notch fix that can land (Claude agent stage)

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** Two stages have built and
measured, and nothing has landed. Read `### Handoff K1482 s21` in `docs/design/K1482_s21_corners_rest.md` whole
(the class table, the knobs already rejected, the bar's finds), then `The sites` and `How to work` in
`docs/design/K1482_s20_wedges_notches.md`: both hold here with `s22` for `s20`. Link A is
`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5).

The goal is Levi's approved look: at each of the 14 sites the two outlines meet in one clean rounded or mitred
corner, with no solid dark patch, no square or stepped cut, no tick; everywhere else the picture stays as
master draws it. This stage's job is to **land the first part of that**: a change that makes at least one
named site finished or better, harms nothing, and passes every check below. You own the technique.

## Where it stands

- Master's `src/` is the start build (a83721537; equal to ccd63bcde's). 14 named sites are open on it: wedge
  j15 j50 t23e t59s t81s t84e, notch j4 j14 j41 j47 j59 t4s t45s t58e.
- **fix3** (the second corner try with longer arms, ink only; `git diff a83721537 a9985b1d3 -- src test`)
  finishes j14 and betters t23e, j59, t58e and t81s on link A. It cannot land as built:
  - It **fails the K1436 bar** in other mazes with 10 new finds
    (`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-afdf2b8bb494bb380\.claude\probes\K1436\out\bar\k1482s21\`:
    `bar.txt`, `sheet.png`, `sheet.txt`). The coordinator's own look at them: on g41_user_tw64 the retry arc
    sweeps across a sharp fill corner, so the fill's tip has no outline (29 px), and at another corner it leaves
    a square-ended stub; on def five V mitres become arcs with a small peak, tick or stub left at the old apex.
    The fill is the same in every tile. Stage 20's "bare 0 at all 165 retry corners" held on link A only.
  - It **rounds about 27 corners Levi did not name** on link A. Whether rounding there is welcome is his call
    (K1524) and he has not answered. Until he does, a clean sharp corner on master stays a clean sharp corner.
- Stage 21 traced the 13 leftovers to three kinds (its handoff's `Next`): a ball that a crossing thread runs
  through or arms too short for one (j50, j4, j47, t84e, j59, t45s); a crossing cut whose square end pokes out
  under another outline (t81s's tick, probably t4s's step; stage 13's lkGap class); two outlines that converge
  with no corner at all (t59s, j15's Z, t58e's second V, t23e's patch). j41 fits none of them yet.
- Stage 21's patches, tools and captures are untracked in its worktree,
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-afdf2b8bb494bb380\.claude\probes\K1482\s21` and
  `...\out\s21`; stage 20's in `...\agent-a0f22901bb5fca4a4\.claude\probes\K1482\s20`. Copy what you use into
  your own `.claude/probes/K1482/s22`; change nothing there. No preview of theirs still runs.

## Do

1. Start from master. Take from fix3 what serves the goal; you are not bound to it.
2. Whatever you draw, **the outline stays on the fill**: an outline that leaves the fill's edge bare, or stands
   off it as a stub, is a new fault, in every maze and not only on link A. Decide how (hold the corner ball
   inside the fill's corner, apply it only where the raw meeting is a fault, or another way).
3. Run the K1436 bar as a working tool, not as a last step: the first time when your first candidate builds,
   then on every candidate you mean to keep. A candidate with a new or grown find is not kept in `src/`.
4. Order the work by what can land soonest: first a change that keeps fix3's gain at j14 (and at t23e, j59,
   t58e, t81s if it carries them) and moves nothing else; then the kinds above, most sites first. Commit each
   part that passes on its own, so the coordinator can land a part without the rest.
5. `gf_look.ts` and `gf_pass.ts` are in another agent's hands until about 13:00 (K1525, the fill look). Leave
   them alone until the coordinator messages you; if a fix needs them before that, build it last, after
   `git merge origin/master`.
6. Judge every site against the goal in a context crop and a detail crop, not against fix3. Commit WIP on your
   branch at every milestone. A fix that fails Done is kept as a patch in your probe directory, not in `src/`.
   The coordinator will message you if Levi answers K1524 while you run.

## Done

- **The bar** (`.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base a83721537`, `-Tag k1482s22`; stage 21's base captures are reusable
  if the tool allows): no new find, none grown, on your tip.
- **Nothing unnamed moves** on link A: the mirror's moved-site list against the start build holds only named
  sites, or every other moved place is listed with a context crop and a detail crop and is clean by your own
  eye (fewer is better; none is the target). The 5 slivers, j29, j49 and j64 not worse (mirror numbers as
  stage 20's), `count13.py --specks` against the start build 0 new.
- The class table on your tip, by your own eyes at 4x or more and in context: each of the 14 finished, better
  with its leftover named, or unchanged; for each unchanged site, what you tried and why it failed.
- Sheets in the layout of `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1524\card.py` (the surrounding
  threads with a red box, then the box closer), columns today | your tip: all 14 sites, every other place your
  tip moves, and the bar's 10 fix3 finds on your tip (base | fix3 | your tip).
- Captures pin the background clock and compare only within loads that agree (stage 21's handoff, `The 76,609
  px fill difference`). Fill look 0 px against the start build, or each moved place named with a crop and
  judged against today's renderer.
- On your tip, in the last 30 minutes: `hold.mjs` 60/60 on link A; `.claude/probes/K1482/s15/panelopen.mjs`,
  then both dragchecks pass; `npm test` green; the bar once more. A check you could not run is named as not
  run, with why.

## How to work

As stage 20's `How to work`, with these changes: ports 6050-6069, profiles `$env:TEMP\k1482s22-*`, probe
directories `.claude/probes/K1482/s22` and `.claude/probes/K1482/out/s22` (untracked: do not `git add` raw
captures or dumps). At most three preview builds alive at once; stop yours and remove their directories when
you finish (the disk is short: K1467, CC156). Timing checks need `$env:TEMP\claude-perf.lock` (Muse holds it
often: wait in ONE blocking loop, 60 min at most); look captures and the bar with `-NoPerfLock` do not.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. Do not stop early
while a kind is untried and time remains, and do not stop at a cause: a traced cause is where the fix starts.
A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s22` here, commit, and report: which commits pass every check and can land (by SHA, in
order), the class table, the sheets' absolute paths (each site named), the numbers, a `Ledger items` list and
K1482's handle fields. Never push, never edit `LEDGER.md`.
