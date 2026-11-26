# K1584 stage 11: the tight wedge runs open all the way out (no hook past its outer end)

Base: `origin/master` (stages 1 to 8 landed as `f915561ca`). Stages 9 and 10 are NOT on master: they sit on
branch `worktree-agent-a2dfb242b056cf793` (worktree `...\worktrees\agent-a2dfb242b056cf793`, read only for
you). Read there first: `docs/design/K1584_s10_brief.md` with its handoff, then `K1584_s9_brief.md`'s
handoff. Their outputs (`.claude/probes/K1584/s9/out`, `s10/out`, captures `s7/out/s8a`, `s10a`) are in
that worktree too.

## Levi (2026-11-25, on a large `today | stage 8 | stage 10` picture of A_3 k63 and A_5 k176)

> K63: stage 10 is mostly right. K176: the wedge seems to end a bit early, causing their to but a bit of a
> dangling hook artifact rendered past the outer end of the wedge. It seems like k63 might also suffer from
> this a tiny bit, but less obviously. In general, the wedge taper/angle is good for both

So: keep stage 10's taper and angle exactly. Fix where the wedge ends: at k176 a dark foot closes it 10 to
12 px from the ball's centre (1.88 / 0 px against the ordinary gap's 3.05 to 3.14) and leaves a hook of
border hanging past the wedge's outer end; k63 shows a little of the same (the dark bits at the mouth's
upper-left lip). The wedge must run open into the ordinary gap beyond the ball with no ink left across or
past its outer end. Stage 10's finding: the pinch starts where the corner list's reach ends (k176 10.17 px,
`s10/kreach.ts`); its two fix candidates are in the handoff. You own the technique.

Second, smaller: at fade 1.2 stage 10 fades 19 to 27 more ball px than stage 8 (k63 58 against 77 inked,
k176 57 against 84; `s10/out/sheet10_fade.png`). Levi's rule from stage 6: "the fade should then also taper
here". Make the fade narrow with the wedge so the long fade keeps about as much of the ball as stage 8 did.
If this fights the first fix, the first fix wins and you report.

## This stage

1. New worktree `...\worktrees\k1584-s11`, branch `k1584-s11`, from `origin/master`; `node_modules` as a
   directory junction to the main checkout's (never `npm install`; never remove the junction's target).
2. Port stages 9 and 10 by cherry-pick from the gap branch: the rule commits `a0f00983b`, `d580f0230`,
   `ac3f194f1`, plus the s9 and s10 briefs, handoffs and probe tools you need. `npm test` green before any
   new change.
3. The two fixes above, in `src/render/gpu_field/` with the mirror and tests. `eval.ts` and `gf_glsl.ts`
   (the junction rule): keep out unless you must, and name it.

Bindings: all earlier briefs'. Only the three tight balls (A_3 k63, A_5 k176, A_6 k265) may change against
master; every other pixel on all 21 mazes equals a capture of master's build. The ball stays one piece,
joined at its centre; no loose piece left by a wedge ball; never remove a thread's border; the under pass
keeps its width and heading; `fadeLength` stays live with no table rebuild.

## Done

1. Src, mirror and tests; `npm test` green; every re-frozen pin named; `npm run build` passes.
2. Captures of all 21 mazes from master's build (tag `m11`) and yours (tag `s11a`), same recipe as stage
   10 (`warm7.ps1`, the perf lock through `scripts/perf_lock.ps1`, ports 5630 to 5639).
3. For Levi: one large sheet (12x or more) of the three balls, columns `today | stage 8 | stage 10 |
   stage 11` at fade 0.14, plus stage 11 at fade 0.5 and 1.2 beside stage 8's. Viewed by you. Under each:
   the wedge's width on screen from the centre out to 3 ball radii (px, against the ordinary gap's), and
   the ink left across or past the wedge's outer end (px; target 0).
4. `m11` against `s11a`: every changed place on all 21 mazes listed and viewed; each is one of the three
   balls, or you report it.
5. Counts within one `screen.py` run, `m11` against `s11a`: closed sides and loose pieces, and the loose
   pieces at the three balls.

## How to work

- `Get-Date` first. PowerShell. Read code through the shell; the Read tool only just before an Edit, and
  for images. Write only inside your worktree.
- Commit WIP at every milestone, broken or not (`git add -f` for probe tools, never their outputs). Never
  push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
  `--virtual-time-budget`.
- Helpers on sonnet, mechanical work only, with this stop rule. Looks are yours: view every place you
  report.

## Stop rule

Stop when every Done holds or after 2 h of wall clock (`Get-Date` at each milestone), whichever comes
first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`## Handoff (stage 11)` here, commit, and report: verdict first (safe to land or not), what holds and what
does not (failing checks with their numbers), sheet paths, the widths, the counts, a `Ledger items` list
and K1584's handle fields (owner, branch, last commit, evidence, next).
