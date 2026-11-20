# K1482 stage 26: a crossing thread runs through the second-try corner (K1526; Claude agent stage)

**Queued behind stage 25** (`docs/design/K1482_s25_side_fillet.md`): one code agent at a time in
`src/render/gpu_field/`. Start only when the coordinator says stage 25 has landed or stopped.

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
The 14 sites he named on link A are in `The sites` of `docs/design/K1482_s20_wedges_notches.md`.

This stage takes the six sites where a crossing cut the junction's arms short, so the second corner try
(stage 23) either builds a ball the crossing thread runs through or has no room for one. Stage 21's
measurements, taken on its own tip (measure again on master first; the second try that landed is stage 22's):
- **j50** (wedge): arm a0 (chain 71) is cut 0.27 units out by chain 71's own other pass. The second-try ball
  k250 (r 0.67 h) rounds past that crossing, the crossing pass's +1 outline runs through it, and a "<" sliver
  of paper is left.
- **j4** (notch): second-try corners a1/b2 and a2/b0 at r 0.30 h and 0.26 h, intruded by chain 82 (the
  crossing that cut the arms): too small to show.
- **j47** (notch): the acute corner k248 (a2/b0, chains 17 and 64) gets r 0.001 h, so chain 64's +1 outline
  and the arc meet in a solid ">".
- **j59** (notch): a step at the top of the inner leg; a2/b0's second try has r 0.02 h.
- **t84e** (wedge): j139 a0/b1, no second-try corner at all (the arm past the cut is too short for a ball).
- **t45s** (notch): j99, no second-try corner; the stub end at the top right stays.

Read `### Handoff K1482 s21` in `docs/design/K1482_s21_corners_rest.md` (the site table and `Knobs tried and
rejected`). Longer arms do not help: measuring the arm from its true end (GF_KFROM) forms corners too small to
show and moves 36 other windows, and a third pass on extended arms (GF_KX2) makes t58e, j15 and j50 worse
(patches in the s21 worktree, `.claude/worktrees/agent-afdf2b8bb494bb380/.claude/probes/K1482/s21`; read
there, change nothing). Stage 21's starting idea: the crossing pass's near outline is the corner's real
partner, so solve the corner against it (a third bound on the ball, or a corner between the arm's outline
and the crossing's) instead of between two arms the crossing has cut.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). The border look draws the
outlines; `&tlk=fill` the fill. The second corner try (stage 23) is on by default since K1524 (Levi,
2026-11-19: "take the rounding"); `&gfk=0` turns it off. A Node build leaves it off unless env `GF_KRETRY=1`
(K1536): set that for a Node probe, and before the bar so its mirror scan matches its pages.

## The goal

On link A as it loads (the second try on): at the six sites the outlines meet in **one clean join** (a round or a clean point,
the stroke at its own width) with no wedge, notch, stub, step or sliver of paper, and the fill does not move.
With `&gfk=0` nothing changes (0 px against master's `&gfk=0`, both looks), unless your fix needs no second
try at a site, in which case it shows there too (count those places and show them). Nothing else on link A or on the bar's four mazes gets
worse. You own the technique. The cause is not the finish line: a stage that ends with a diagnosis and
nothing in `src/` has not reached the goal while time remains.

## Done

- **By eye**, the six sites, context crop and detail crop, master | new, both as they load (the second try on).
- **Link A**, loads of one state and one view (pin the background clock; stage 21's handoff, `The 76,609 px
  fill difference`; report the floor first). With `&gfk=0`: 0 px against master's `&gfk=0` in the border and fill looks, or
  each place named. As it loads, against master as it loads: every place outside the sites where the border
  look changes is counted, the ten largest are on a sheet (surrounding threads with a red box, then the box
  closer; master | new) and judged by eye; the fill look 0 px. Make this diff **before** you commit anything
  as a fix: stage 24's one fix removed its named fault and opened about 270 joint corners elsewhere.
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`,
  scenes `ring,def,muse_hash,g41_user_tw64`, `-Base` origin/master's SHA, `-Tag k1482s26` (its pages
  load with the second try on; set `$env:GF_KRETRY = "1"` first so its mirror scan has it too): new 0 and grown
  0; each gone find shown as a fault the fix removed.
- Under the perf lock on your tip: `hold.mjs` 60/60 on link A, as it loads and with `&gfk=0`;
  `.claude/probes/K1482/s15/panelopen.mjs`; both dragchecks (they wait 180 s for a redraw, `WAITMS`; a new
  Chrome profile's first redraws take 30 to 60 s); `npm test` green (a pin that moves is re-frozen in the
  same commit and named in its message).
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`.
- The commits on your branch, in landing order, each green.

## How to work

`git merge origin/master` in your worktree first. Then as stage 24's `How to work`
(`docs/design/K1482_s24_tick_step.md`), with these changes: ports 6130-6149, profiles
`$env:TEMP\k1482s26-*`, probe directories `.claude/probes/K1482/s26` and `.claude/probes/K1482/out/s26`
(untracked: do not `git add` raw captures or dumps); `.claude/probes/K1482/s23/run23.ps1` in the s23
worktree (`agent-a5016731195d015ff`) is the four guards as one sequence. Commit WIP at every milestone,
broken or not, and add two or three handoff lines here each time. Read code through the shell
(`Select-String`, a range of `Get-Content`); use the Read tool only on a file you are about to edit.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. A compaction is not a
stop: re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s26` here, commit,
and report: the commits to land by SHA in order, the numbers, the sheets' absolute paths, a `Ledger items`
list and K1482's handle fields. Never push, never edit `LEDGER.md`.

2026-11-19 18:30 (s26): cause at j50, measured in the tables: the retry ball (K237, r 0.672h) grows into the tube
of chain 71's own over pass (X317), and the arc's buriers skip the corner's own chains, so nothing hides it.
Candidate: the retry's third bound (`GF_KXB`, tables.ts): the spine of a crossing pass that cuts either arm bounds
the ball like the arms' far parts. Over every crossing (217bfb130) it shrinks almost all 109 retry corners; over
the corner's own chains only (`GF_KXBS`, 303eec6b6) it moves 18 (j50 0.672h -> 0.171h). GPU captures queued.

### Handoff K1482 s26

2026-11-19 19:45. Fix landed on the branch: 44fd1b814 (the corner retry's third bound, `GF_KXB`/`GF_KXBS`,
tables.ts only). Sites, as it loads: **j50 better** (the retry ball no longer runs through chain 71's own crossing:
r 0.672 -> 0.171 h, the arc turns in a small round; the paper sliver below it stays, which Levi accepts); **j4, j47,
j59 same** (their arms are cut by OTHER chains: the ball is tiny or rejected, and a third bound only shrinks it);
**t84e, t45s same** (no retry corner; their stubs show with `gfk=0` too). With `gfk=0` all six are 0 px.
Link A (hash fff8c9e5, one view, load floor 0 px): `gfk=0` 0 px border and fill; as it loads border 645 px at 16
places (the ten largest judged by eye: j50, t43e, t27s lose a wedge or blob; t63e, t75e gain a round; t34e, t30e,
t21s round less; all one clean join), fill 0 px. Bar PASS new 0 grown 0 gone 0 (under load). Guards on 303eec6b6
(same build): hold 60/60 both, panelopen, both drag checks PASS. Sheets: `.claude/probes/K1482/out/s26/`
`six_c2_a.png`, `six_c2_b.png`, `top10_a.png`, `top10_b.png`, `z_j50_c2.png` (master | new).
Next (j4, j47, j59, t84e, t45s): solve a corner between the uncut arm's outline and the crossing pass's near outline
(the crossing is the corner's real partner), which needs a new corner kind in tables.ts, gf_glsl.ts and eval.ts;
a smaller or larger ball between the cut arms cannot make that join. Capture views can differ by 2e-5 between
loads of one hash (c1/c2 `gfk=0` did): compare `gf_b2view.txt` before trusting a diff.
