# K1482 stage 29: t84e's wedge from the corner's side, j59's step, j47's block (K1526; Claude agent stage)

**Started 2026-11-20 01:29** on master 1bf4c77d0, after stage 27 landed (the fold shift). Stage 27's tools are the
better starting point (`.claude/worktrees/agent-a198fbb25c384a8cf/.claude/probes/K1482/s27`: `run27.ps1` keeps
each guard's whole output and clears `GF_KRETRY` before `npm test`; `capseq28.ps1` and `diff28.ps1` gave
byte-identical repeat loads). `npm test` runs without the perf lock; the lock's guards wait in one command.

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
The 14 sites he named on link A are in `The sites` of `docs/design/K1482_s20_wedges_notches.md`. His words
for the two kinds, with the sheet he answered on (`.claude/probes/K1490/out/k1490_wedge.png` and
`k1490_notch.png` in the coordinator worktree `.claude/worktrees/agent-af52b1a95572b7c1a`): a **wedge** is
"two outlines run together into a solid dark patch"; a **notch** is "an outline ends in a square or stepped
cut where a corner should be". A notch is a stroke END, not a paper eye.

Stage 28 landed the home burial (66ec58c77): a piece outside every group inks no deeper inside the tubes of
the group it heads into than their own band. It trimmed 11 stub ends on link A (t45s is clean) and left three
of K1526's sites. Read `### Handoff K1482 s28` in `docs/design/K1482_s28_crossing_outline_corner.md` and the
HOME BURIAL lines in `.claude/rules/render-gpu-field.md` first. Its tools and sheets are in the s28 worktree
(`.claude/worktrees/agent-a1c1c68a332de8029/.claude/probes/K1482/s28` and `out/s28`: `wmap28.ts` maps who
draws each pixel, `out/s28/sites.json` has every site's position on its 3200x1800 frame; copy what you use,
change nothing there).

- **t84e** (wedge; 1554,914 on that frame). The dark patch is corner k159's own ink where it meets chain 84's
  outline. The home burial does not reach it: the ink belongs to a corner, not to a piece outside every
  group. Stage 28's next step, untried: a corner-side rule that buries k159's ink under chain 84's band, with
  the burial's guard (only against partners out of every crossing's depth window). First step: `wmap28.ts`
  over the patch, to confirm who draws each of its pixels.
- **j59** (notch; 1060,1512). Its stub t23e lost 28 px; most of the thick step at the top of the inner leg
  remains, and nobody has found who draws it. First step: `wmap28.ts` over the step.
- **j47** (notch; 1204,1054). 8 px went at t17s; the block at the left of the junction remains. Same first
  step.
- **t56s** (K1542; 1077,260). The burial takes 2 antialias px off this clean corner (1040,267). Guess, not
  tested: its membership test sits on a float boundary of chain 28's group. Fix it if it is a line or two.

Not this stage: j4 (a look question with Levi, K1541), GF_KXO's rounds (K1540), t23e's patch and K1528's
other sites.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). The border look draws the
outlines; `&tlk=fill` the fill. The second corner try is on by default (K1524); `&gfk=0` turns it off, and
the home burial with it. A Node build leaves it off unless env `GF_KRETRY=1` (K1536): set that for a Node
probe, and before the bar so its mirror scan matches its pages.

## The goal

On link A as it loads: t84e's patch is gone and the two outlines there each run on at their own width; j59's
step and j47's block are gone, with a corner in their place; the fill does not move. With `&gfk=0` nothing
gets worse. Nothing else on link A or on the bar's four mazes gets worse: a clean round turned into a point,
or a clean point rounded, is a failure, and so is an outline that loses ink at a joint corner. A rule that
only takes ink away is the safer kind; one that adds ink shows every place it adds. You own the technique.
The three sites are independent: land one if the others resist. A stage that ends with more diagnosis and
nothing in `src/` has not reached the goal while time remains.

## Done

- **By eye**, each site, context crop and detail crop, today | new, as it loads and with `&gfk=0`.
- **Link A**, loads of one state and one view (compare the image hashes of repeat loads first, K1539; report
  the floor), made **before** you commit anything as a fix: every place outside the sites where the border
  look changes is counted, with the count of places that only lose ink given separately; the ten largest are
  on a sheet (surrounding threads with a red box, then the box closer; today | new) and judged by eye; the
  fill look 0 px, or each place named. The Node mirror has no gap cuts, so it cannot stand in for this diff.
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` origin/master's SHA, `-Tag k1482s29`: new 0 and grown 0; each
  gone find shown as a fault the fix removed.
- Under the perf lock on your tip (`scripts/perf_lock.ps1`, never the lock file by hand): `hold.mjs` 60/60 on
  link A, as it loads and with `&gfk=0`; `.claude/probes/K1482/s15/panelopen.mjs`; both dragchecks; `npm
  test` green (a pin that moves is re-frozen in the same commit and named in its message). Keep each guard's
  whole output in a file: a failed test is named in the report, with its error's first line (K1543).
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`.
- The commits on your branch, in landing order, each green.

## How to work

`git merge origin/master` in your worktree first. Then as stage 24's `How to work`
(`docs/design/K1482_s24_tick_step.md`), with these changes: ports 6190-6209, profiles `$env:TEMP\k1482s29-*`,
probe directories `.claude/probes/K1482/s29` and `.claude/probes/K1482/out/s29` (untracked: do not `git add`
raw captures or dumps); stage 28's `run28.ps1` in its worktree is the guards as one sequence. Change two
things in your copy: it keeps only each guard's last lines, and it leaves `GF_KRETRY=1` set after the bar, so
its `npm test` fails 3 tests of `test/render/gf_k1482_switch.test.ts` (K1543: that file pins the Node default
off): clear the variable before `npm test`. Commit WIP at every milestone, broken or not, and add
two or three handoff lines here each time. Read code through the shell (`Select-String`, a range of
`Get-Content`); use the Read tool only on a file you are about to edit.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. A compaction is not a
stop: re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s29` here, commit,
and report: the commits to land by SHA in order, the numbers, the sheets' absolute paths, a `Ledger items`
list and K1482's handle fields. Never push, never edit `LEDGER.md`.

### Handoff K1482 s29

Stopped 2026-11-20 about 02:55 (start 01:29), with the checks done. **Landed: t56s only.** t84e, j59 and j47 are as on
master.
- **Commits, in order:**
  - 1bb6f9c19: the side-face burial along a tangent run (WIP).
  - e66fe43b4: the home burial's z guard ramps over 1e-4..1e-3 instead of 0.004..0.02 (eval.ts + gf_glsl.ts), and
    drops 1bb6f9c19's rule. The net src diff against 1bf4c77d0 is that guard alone, 8+/4- lines.
  - 029a29ec2: lore.
  - this handoff.
- **t56s, by eye:** the corner pixel 1040,267 is ink again, as with `gfk=0`, and the corner is square.
  - Cause: chain 28 ramps into group 64 there (homeRamp 0.12). Chain 56 reads |z| 0.005 at its tent's foot, so the old
    guard counted it as being at z 0 and buried chain 28's over-pass outline.
- **Link A** (GPU, master m vs c2 = e66fe43b4):
  - Floor (m vs m2): 0 px at T 1 and at T 6, on and off.
  - c2: 1 place changed, 1040,267, 1 px. It only gains ink, and no place only loses ink.
  - `gfk=0`: 0 px.
  - Fill: 0 px.
  - In the mirror the same rule moves 4 px on the whole link (1039,266, 1040,267, 1880,1105 and 1800,1592), all of
    them ink put back.
- **The bar** (STRICT, -NoPerfLock, ring, def, muse_hash, g41_user_tw64, -Base 1bf4c77d0): PASS, new 0, grown 0, gone 0.
- **The guards** (`perf_lock.ps1`):
  - hold, as it loads and with `gfk=0`: PASS, 60 of 60 frames each.
  - panelopen: OK.
  - dragcheck_b: PASS.
  - dragcheck: PASS.
  - npm test with GF_KRETRY cleared: 3198 passed, 18 skipped.
- **Why the other three stay open:**
  - **j59.** The step is chain 43's band plus chain 23 (stub t23e) running ALONG chain 7's outline.
    - Burying the under band inside the over pass's tube along that run (1bb6f9c19) opened the white sliver's border
      mid-strip.
    - With a tolerance (TOLG), that rule left a flag tick and a hairline at t84e and removed a whole outline to its
      left.
    - A round cap at the run's end leaves knobs.
  - **t84e.** It is k159's own-fold piece band against chain 84. It needs paper (an ink-only change cannot make it),
    and the own-fold variants left a flag.
  - **j47.** It was not reached.
  - **Next:** a rule that ends chain 43's and chain 23's bands where they meet chain 7's band, without burying along
    the run. Build it in the mirror first (`hb29.ts`, `spine29.ts` with BOX, `mimg29.ts`).
- **Evidence:** `.claude/probes/K1482/s29` (tools) and `.claude/probes/K1482/out/s29` (sheet `sheet_s29_sites.png`,
  diffs `diff_m_c2_t1.txt`/`_t6.txt`, guards `raw/guards/*.txt`).
