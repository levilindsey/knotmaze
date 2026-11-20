# K1482 stage 28: a corner against the crossing thread's outline (K1526's five sites; Claude agent stage)

One code agent at a time in `src/render/gpu_field/`: this stage runs alone there. Stage 27
(`docs/design/K1482_s27_flag_step.md`) waits behind it.

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
On K1524 the same day: **"take the rounding"**, so the second corner try's rounds (default since 083a8cb1c,
`&gfk=0` turns them off) are the approved look wherever master draws one cleanly. The 14 sites he named on
link A are in `The sites` of `docs/design/K1482_s20_wedges_notches.md`.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). The border look draws the
outlines; `&tlk=fill` the fill. A Node build leaves the second try off unless env `GF_KRETRY=1` (K1536): set
it for a Node probe, and before the bar so its mirror scan matches its pages. **Every capture passes
`&snd=none`** (the song's plucks redden outline strokes: probes.md, PROBE LORE K1524).

## The five sites

A crossing by ANOTHER chain cut the junction's arms short, so no ball between the two cut arms can make the
join. Stage 26 (`### Handoff K1482 s26` and `s26c` in `docs/design/K1482_s26_crossing_in_ball.md`; lore
"THE RETRY'S THIRD BOUND" in the area's rules file) fixed j50, whose crossing was the corner's own chain, and
measured these (measure again on master first):
- **j4** (notch): retry corners a1/b2 and a2/b0 at r 0.30 h and 0.26 h; chain 82 cuts the arms.
- **j47** (notch): the acute corner a2/b0 (chains 17 and 64) gets r 0.001 h and is rejected; chain 64's +1
  outline and the arc meet in a solid ">".
- **j59** (notch): a step at the top of the inner leg; a2/b0's retry has r 0.02 h, rejected.
- **t84e** (wedge): j139 a0/b1, no retry corner at all (the arm past the cut is too short for a ball).
- **t45s** (notch): j99, no retry corner; the stub end at the top right stays. Both stubs show with `&gfk=0` too.

Stage 26's conclusion: the crossing pass is the corner's real partner. The join wanted is between the UNCUT
arm's outline and the crossing pass's NEAR outline, a new corner kind in `tables.ts`, `gf_glsl.ts` and
`eval.ts`; a smaller or larger ball between the cut arms cannot make it. Already rejected, do not repeat:
measuring the arm from its true end (GF_KFROM), a third pass on extended arms (GF_KX2) (both stage 21), and a
bound on the whole ball (stage 26's first version: it took the round from t34e, t30e and t21s). Stage 26's
probes (`kxc26.ts`, `geo26.ts`, `card26.py`: per-corner geometry and master | new sheets) are in
`.claude/worktrees/agent-a306305e3593e9802/.claude/probes/K1482/s26`: copy what helps, change nothing there.

## The goal

On link A as it loads, each of the five sites joins in **one clean round** like the rounds the second try
draws beside them (j14, j41), the stroke at its own width, with no wedge, notch, stub, step or sliver of
paper, and the fill does not move. Where only a clean point can be had, show it beside master and say so:
round or point is Levi's choice, not yours. You own the technique. The cause is not the finish line: a stage
that ends with a diagnosis and nothing in `src/` has not reached the goal while time remains. A fix for some
of the five that harms nothing lands; say which are left and why.

## Done

- **By eye**, the five sites: context crop with a red box and a detail crop, master | new, as they load.
- **Every corner that moves anywhere else** on link A is on a sheet in the same format and judged against
  MASTER, corner by corner: faulty in master and better, or it must not move. A clean round in master that
  turns smaller, into a point or into anything else is a failure, not a trade. Make this whole-link diff
  **before** you commit anything as a fix (loads of one state and one view: compare `gf_b2view.txt` first;
  warm the Chrome profile or capture twice before reading a fill diff; report the load floor). Fill look: 0 px.
- With `&gfk=0`: 0 px against master's `&gfk=0`, border and fill (the new corner sits under the same switch).
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` origin/master's SHA, `-Tag k1482s28`, `$env:GF_KRETRY = "1"`
  first: new 0 and grown 0; each gone find shown as a fault the fix removed.
- Under the perf lock (`scripts/perf_lock.ps1`, never by hand) on your tip: `hold.mjs` 60/60 on link A, as it
  loads and with `&gfk=0`; `.claude/probes/K1482/s15/panelopen.mjs`; both dragchecks; `npm test` green (a pin
  that moves is re-frozen in the same commit and named in its message).
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`.
- The commits on your branch, in landing order, each green.

## How to work

`git merge origin/master` in your worktree first. Then as stage 24's `How to work`
(`docs/design/K1482_s24_tick_step.md`), with these changes: ports 6170-6189, profiles
`$env:TEMP\k1482s28-*`, probe directories `.claude/probes/K1482/s28` and `.claude/probes/K1482/out/s28`
(untracked: do not `git add` raw captures or dumps); `.claude/probes/K1482/s23/run23.ps1` in the s23
worktree (`agent-a5016731195d015ff`) is the four guards as one sequence. Commit WIP at every milestone,
broken or not, and add two or three handoff lines here each time. Read code through the shell
(`Select-String`, a range of `Get-Content`); use the Read tool only on a file you are about to edit.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; keep the last 30 minutes for the checks. A compaction is not a
stop: re-read this brief and `git log`. On stopping: stop your previews, commit WIP, append
`### Handoff K1482 s28` here, commit, and report: the commits to land by SHA in order, the numbers, the
sheets' absolute paths, a `Ledger items` list and K1482's handle fields. Never push, never edit `LEDGER.md`.

### Handoff K1482 s28

Nothing lands in `src/`. The try is in the WIP commits 5710afd7c and 1d7facd32. The last commit puts
`tables.ts` back to master. The try was `GF_KXO`: a retry-only, ink-only corner on the ball tangent to the two arms and the
crossing pass's outline (`tri3`, Newton on three tubes). It also emitted the corner (cut arm, crossing) at the
pocket's close. The kept pockets must close at the cut arm, and each arc's sag must be within GF_KSAG.

- **Captured** at 1d7facd32 vs dfcced282 on link A, as it loads, with matching views:
  - border: 1256 px in 23 clusters; fill: 1 px (at t56e).
  - At the five sites, j4 moved 4 px and t84e 0. j47, j59 and t45s found no pocket: j47's candidate failed the
    close check, j59's ball is 0.011 h, and t45s's foot lands at the window start.
  - 22 V points Levi never named turned into rounds. Clean ones: t56e, t63e, t59e, t29e, t39e, t36e, t54s, t83e,
    t58e, t4s, j143. With a spur, a step or a thickened tip: t10e, j95, t44e, t77s.
  - `&gfk=0`: the two loads settled on views 2e-5 apart, so its 42 + 30 px is unread. The tables are master's by
    construction.
- **What is at j4's notch.** `wimg28.ts` (who draws each pixel, `out/s28/wj4.png`, beside the GPU crop, s20's
  framing 1626,182 at 8x; s20's own sheet row is `out/s28/s20j4row.png`) shows a paper eye at the junction's top
  left, about 10 px across. Its left side and top are chain 82's -1 outline, one continuous stroke. Its bottom is
  the -1 outline of chain 68's arm a0, which meets chain 82's at a square 90-degree corner (the eye's bottom
  left); the eye's right end is an acute tip. NOT confirmed: whether Levi's "notch" is the whole eye (paper cut
  into the outline, which only closing the eye would fix) or its square end.
- **Why GF_KXO did not move it.** Its pocket ball (the tubes of a0, b1 and chain 82; r 0.205 h, centre about
  1640, 191) is the right ball, and the (chain 82, a0) corner sits at that bottom-left vertex. But a 3.5 px round
  on a 90-degree corner changes about 3 px, which is the 4 px measured.
- **What a round end would take.** The end would need the incircle of the eye's left end: a ball tangent to a0
  and to both sides of chain 82's turning outline, about 0.28 h. Even that is only about 6 px of change.
- **Wedges.** An ink-only arc only adds ink, so a wedge (t84e, a dark patch) cannot be fixed this way. It needs
  paper.
- **The mirror matches the GPU.** Overlays at j4, j139, t56e and t10e put the mirror's ink on the GPU's border ink.
  The early "mismatch" was my probe window. Probes: `.claude/probes/K1482/s28/mrender28.ts` (ink PGM),
  `ovl28.py` (mirror over GPU), `wmap28.ts` (who draws each pixel: winKind:winA:winB, and the fill chain),
  `grid28.py` (master | new grids).
- **Next.** Name the exact pixels of each notch first: s20's `ba_fix1_notch_*.png` in worktree
  `agent-a0f22901bb5fca4a4`, against `wmap28.ts` maps. Then decide whether the look needs ink taken away (burial,
  a cap) rather than an arc added. The 22 V-to-round changes are a look question for Levi (sheets
  `out/s28/g1.png`, `g4.png`, `g5.png`). They do not land without his call.
