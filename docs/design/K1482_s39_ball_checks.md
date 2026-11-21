# K1482 stage 39: the ball candidate's remaining checks (no source change)

Brief for one Claude agent (model sonnet), 2026-11-20. Mechanical work: captures, scans, sheets. It changes
nothing under `src/` or `test/`.

**What exists.** Stage 37 built a CANDIDATE that removes the round ball where a thread's end meets a joint:
src commit `df2e1c8bb` on branch `worktree-agent-a014587de769261dc` (not on master, never pushed), start
commit `d1c25f5fe`. The branch's HEAD `6254a1006` has the same `src/` plus the re-frozen test pins
(`fa3e90967`): build and test THAT commit as the candidate. Its brief and handoff are `docs/design/K1482_s37_tangent_ball.md` on that branch
(`### Handoff K1482 s37`), its tools `.claude/probes/K1482/s37/` there. It checked link A and sister mazes
A_5, A_7 and A_8 in the border look and stopped at its time cap. Levi decides whether the candidate lands
(K1572); this stage delivers what that decision and the landing still need.

**Setup.** `Get-Date` first. In your worktree: `git merge --no-edit worktree-agent-a014587de769261dc` (local
only: never push, never rebase). Read the handoff and the headers of `s37/cap37.ps1`, `capseq37.ps1`,
`diffseq37.ps1`, `place37.py`, `others37.py` and of `.claude/probes/K1482/guards.ps1`. The 20 test mazes
(A_3 = link A to A_d, and the ten D mazes) and their links are the ones K1551's census uses
(`.claude/probes/K1551/`, `.claude/probes/K1482/s36/`). Ports 6320-6339. Outputs go under
`.claude/probes/K1482/out/s39/` (untracked), tools you write under `.claude/probes/K1482/s39/` (tracked).
You may reuse stage 37's two builds in `$env:TEMP\k1482s37-prev` before you remove them.

**Done, in this order** (the numbers of each go in the handoff; stop where the time runs out):
1. Sister mazes A_4, A_6, A_9, A_a, A_b, A_c, A_d, then the ten D mazes, border look, as stage 37 ran A_5:
   ONE session per maze, loads start, candidate, start, candidate; compare only loads of one session. Per
   maze: start against start and candidate against candidate (both must be 0 px, else capture again), start
   against candidate px, the places, gained px (in stage 37 every change was ink lost). For EVERY changed
   place one sheet: before | candidate, a wide view with the threads around it and a close view, each as
   drawn and brightened, two pictures per row, no wider than 1800 px, named by maze and place. Plus
   `places.txt` (maze, screen x,y, px changed, px gained, sheet).
2. The two muse_hash places the bar's mirror scan lists as gone (world 34.2,18.5 and 29.7,23.5): one sheet
   each, the same layout.
3. The full guards on the candidate with `GF_KRETRY=1`: `guards.ps1 -Tag s39 -Port <p> -Ref 6254a1006
   -BaseRef d1c25f5fe -BarPort <p2> -OutDir .claude/probes/K1482/out/s39/guards -Owner <you>` (hold,
   hold_gfk0, panelopen, dragcheck_b, dragcheck, npm test, then the K1436 bar). Report each guard's line, and
   the bar's new / grown / gone per scene with its verdict line; a sheet for each new or grown find.
4. Fill look (`&tlk=fill`) and `&gfk=0` on A_5, A_7 and A_8: px changed and places, start against candidate.
5. A_7's 1 px at 1707,1132: does it repeat in a fresh session (yes or no, and the count)?
6. The candidate loads' `src` record: on one candidate load of link A, poll it until it stops growing (cap
   120 s) and report whether it then matches the start's count of program sources and characters.

**Rules.** One capture at a time, machine-wide: every capture through `scripts/perf_lock.ps1` (a Muse run
shares the lock; wait inside ONE blocking command; leave no lock behind). `&snd=none` in every shot. Never
Chrome's `--virtual-time-budget`. Node probes run as `node scripts/run_node.mjs <entry.ts>`, not `npx tsx`.
You do not judge looks: for each changed place write one plain line (what was lost or gained, and where) and
leave the verdict to the coordinator, who views every sheet. Do not edit `LEDGER.md`. Commit tools and this
file's handoff at each milestone (WIP counts); never `git add -f` anything under `out/`; never push. Read
code through the shell (`Select-String`, ranges of `Get-Content`).

**Clean up at the end** (and say what could not be removed): your previews stopped, no lock held, your temp
folders and Chrome profiles removed; and stage 37's leftovers: `$env:TEMP\k1482s37-prev` (its two registered
worktrees `src-d1c25f5fe` and `src-df2e1c8bb` by `git worktree remove`, then the folder), the Chrome profiles
`$env:TEMP\k1482s37-m`, `k1482s37-c`, `k1482s37-m2`, `k1482s37-c2` and `$env:TEMP\k1482-guards-ec107c48`.
Never touch `$env:TEMP\k1482s27live-profile-20548` or anything of another stage.

**Stop rule.** Stop when the list is done or 1 hour after your start (`Get-Date` at the start and at each
milestone), whichever comes first; then commit WIP, append `### Handoff K1482 s39` to this file (what ran,
the numbers, what did not run, the sheets' paths) and report. A compaction or context size is not a stop:
after one, re-read this brief and `git log`. The report ends with a `Ledger items` list and the handle
fields (owner, branch, last commit, evidence, next).


### Handoff K1482 s39

Agent: claude session 01SUPGULDxvE5gKXozfaFaFG (stage 39, sonnet). Start 19:56:45 PT, stop line 20:56:45. No change under
`src/` or `test/`. Candidate = `6254a1006` (src `df2e1c8bb`), start = `d1c25f5fe`; stage 37's two builds served on 6320
(start) and 6321 (candidate). Border look, `rp=gf`, K868 frozen state at the maze's physics hash, still shot `gf_b2.png`.
Tools: `.claude/probes/K1482/s39/` (cap39, capseq39, runseq39, runlock39, diffseq39, analyze39, place39, mhsheet39,
src39). Outputs (untracked): `.claude/probes/K1482/out/s39/`: `places.txt` (one line per changed place), `mazes.txt` (one
line per maze), `sheets/` (one sheet per place: before | candidate; wide and close, as drawn and brightened x7, red frame
on the wide tiles), `raw/{m,c,m2,c2}/<maze>/`, `diff_raw/`, `guards/`.

**Item 1 (sister mazes), ran: A_4, A_6, A_9, A_a, A_b (and A_7 as item 5). Did not run: A_c, A_d, the ten D mazes
(time: each maze is 4 loads, about 4.7 min under the lock, and a Muse run and the guards shared the lock).** One session
per maze, loads start, candidate, start, candidate. Every maze: start vs start 0 px, candidate vs candidate 0 px (no
recapture), the second pair (m2 vs c2) repeats the first exactly. Every change is ink lost; no px gained anywhere.

| maze | start vs candidate | places (screen x,y at DSF 2; px lost) |
|---|---|---|
| A_4 | 125 px, 4 places | 937,1627 t32s 83; 1948,1293 t22s 39; 996,1410 t27s 2; 2322,673 j11 1 |
| A_6 | 8 px, 2 places | 1094,1294 t29s 7; 1448,1477 j45 1 |
| A_9 | 133 px, 3 places | 2154,126 t28e 97; 1894,1390 t47e 35; 2258,963 t10s 1 |
| A_7 | 217 px, 2 places | 2269,507 t83e 216; 1707,1132 t20e 1 |
| A_a | 53 px, 2 places | 2270,848 t16s 38; 2257,991 t29s 15 |
| A_b | 99 px, 2 places | 994,224 t25e 73; 1077,1509 t22s 26 |

One plain line per place (sheets in `out/s39/sheets/<maze>_<x>x<y>_<place>.png`; the verdict is the coordinator's):
- A_4 937,1627 t32s: the round ball at the thread end shrinks to a small nub with a notch. A_4 1948,1293 t22s, A_4
  996,1410 t27s: the end bulb loses ink (not viewed in detail). A_4 2322,673 j11: 1 px at a joint.
- A_6 1094,1294 t29s: 7 px at a thread's tip (a few edge px, the end is slightly narrower); A_6 1448,1477 j45: 1 px.
- A_9 2154,126 t28e: the bulb at the kink-eye thread end shrinks and tapers to the thread width. 1894,1390 t47e: 35 px of
  the end bulb gone. 2258,963 t10s: 1 px.
- A_7 2269,507 t83e: both round nubs at the hook's end (the side nub and the end bulb) are gone, the hook end is a plain
  rounded thread end. 1707,1132 t20e: 1 px.
- A_a 2270,848 t16s: the curled hook's outer rim at the end is slimmer (the bulb at the curl end is gone). 2257,991 t29s:
  15 px, a thread end loses ink.
- A_b 994,224 t25e: the round nub on the side of the arc's end is gone, flush with the thread. A_b 1077,1509 t22s: **the
  candidate shows a thin background-coloured slit across the thread just above its end stub (before: the thread is
  continuous there); 26 px lost.** Worth a close look: it is the only place where the candidate cuts through a thread
  instead of only trimming an end.

**Item 2 (muse_hash), ran.** Same hash 733ee14a on both builds, one load per build (no floor control). World 34.2,18.5 =
device 2291,924: 55 px differ in a 48 px box; the rounded bulge at the hook thread's end is gone, flush with the thread
width. World 29.7,23.5 = device 2100,1137: 26 px differ in a 48 px box. Sheets `muse_hash_w34.2_18.5.png`,
`muse_hash_w29.7_23.5.png`.

**Item 3 (guards on the candidate, `GF_KRETRY=1`, `-NoBar`), partly.** All five run guards PASS (summary in `out/s39/guards/summary.txt`): hold 60/60 frames (edges min 7155, max 9390); hold_gfk0 60/60 (min 6852, max 9559); panelopen panelOpen=1 exit 0; dragcheck_b 0 / 0 / 0 / 0 px over TOL 24 (max 0 <= 200); dragcheck 0 / 57 / 0 / 0 px over TOL 24 (max 57 <= 200); npm test 258 files, 3198 tests passed (18 skipped; GF_KRETRY removed for it). `ALLDONE 20:55:18 failed=0`.
The K1436 bar did NOT run (30+ min, past the cap): no new / grown / gone per scene and no verdict line.

**Item 4 (fill and gfk=0 on A_5, A_7, A_8): did not run (time).**

**Item 5, ran: yes, it repeats.** A_7's 1 px at 1707,1132 (t20e) is there in the fresh s39 session: 1 px in each of its two
pairs (start vs candidate and start2 vs candidate2).

**Item 6, ran: the count matches, the characters do not (by design).** Link A, candidate load, `window.__srcs` polled every
5 s: t=0 n=2 chars=174778, t=5 s n=12 chars=812888, then no growth to 30 s (stopped, cap 120 s not reached). The start's
load: t=0 n=2 chars=174949, t=5 s n=12 chars=814132, unchanged to 30 s. So the candidate reaches the same 12 program
sources as the start; it holds 1244 fewer characters in total (every source is 31 or 140 chars shorter, 4 x 31 + 8 x 140 =
1244: the candidate's changed shader text). Stage 37's small candidate count was the prewarm not yet finished.

**What did not run:** item 3's K1436 bar, item 4; item 1's A_c, A_d and D_1..D_a. **Next:** run A_c, A_d and the D mazes in the
border look (about 4.7 min per maze under the lock), the fill and `gfk=0` on A_5/A_7/A_8, and the K1436 bar
(`guards.ps1 -BarOnly`). View A_b 1077,1509 first (the slit).
