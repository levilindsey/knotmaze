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

## Handoff (stage 11)

Stopped 2026-11-25 about 13:15, inside the 2 h (start 11:50:54). **Verdict: fix 1 is safe to land; fix 2 is
not (it cuts a loose dot off the ball's centre at fade 1.2) and is reverted.** The branch's src and tests equal
fix 1 (033722820); its history holds fix 2 (d1b6677ee, pin 5bf44b0c8) and their revert (b6d87aaf3).

**Fix 1 (033722820, tables only).** A tight wedge's corner (`jointWedges`, from gf_app's `gwJw`) sets no
border's room, so the borders beyond the ball bake the ordinary gap and the wedge runs open into it.
Shader, its CPU twins and the gf_look pin are untouched (master's again after the revert); test:
`test/render/gf_gap.test.ts`. At b6d87aaf3 (src and tests = fix 1): npm test green (260 files, 3256 passed, 18
skipped), npm run build passes. No pin re-frozen in the end (fix 2's gf_look.test pin was reverted with it).

- Changed against m11 (chg11.py, thr 0, all 21 mazes): 66 px in 3 places, all at wedge balls: A_3 (1049, 264)
  31 px at k63, A_5 (2341, 516) 33 px and (2343, 508) 2 px at k176. A_6 k265 and the other 18 mazes 0 px,
  views the same. All three places viewed (sheet11.png): k176's foot and hook are gone, k63 is clean.
- Widths across the axis at 0.5R..4R (wid11.py; `*` = the axis opens onto paper past the lip):
  k63 s11 2.04 4.32 11.42 18* 12.06 12.24 11.79 12.02 (s5d 3.33 4.36 11.42 ...); k176 s11 1.07 2.85 2.98
  3.58 11.40 11.92 12.46 12.07, equal to s5d's ordinary gap from 1R out; k265 every capture = s5d.
- Ink across (closed px of R..4R): k63 0 (today 3.5); k176 0 (s10 2.0, m11 3.5, today 6.5); k265 4.0 in
  every capture, s5d included (the ordinary gap's own end). Ink past (darker than s5d by > 3, bands
  R..2R/2R..3R/3R..4R): k63 0/0/0 (m11 13/0/0, today 17/0/0); k176 0/0/0 (s10 6/2/0, m11 13/2/0, today
  25/3/0); k265 0/0/0 (today 21/18/0).
- Counts, one screen.py run per maze (an11.ps1 -> out/an_s11a/an.txt): sides 29800; closed 134 -> 132
  (2 closed -> part, both A_3 corner 100); gap 29137, bare 258, none 24 unchanged. Loose pieces by size
  1-8/9-40/41-120/121-300: today 486/2/17/882, m11 497/14/34/1370, s11a 497/14/34/1370. At the wedge balls:
  k63 1 in every capture (the ball's own centre piece, today 156 px, m11 149, s11 127, 2-3 px from the
  centre; pre-existing), k176 0, k265 0. Gap balls (a9.py, 42.5 deg): tight side 0/0/0/1 for all; loose
  side today 0/0/0/1, m11 and s11 0/1/1/2.
- Ball ink (px gray < 22 in the ball; k265 of 221), stage 8 / stage 11: fade 0.14 k63 106 / 98, k176
  105 / 100; fade 0.5 93 / 93, 94 / 94 (0 px changed at k63, 2 px at k176's centre); fade 1.2 76 / 57,
  83 / 56 (24 and 29 px changed, all within 6 px of the centre; no new piece, dot11.py). k265 139 / 143 / 143,
  0 px changed at every fade.

**Fix 2 (reverted).** Inside a tight wedge's ball, a fade past 0.14 kept bs^4 of its excess
(`fl = 0.14 + (uLkF - 0.14) * bs^4`). It brought the fade 1.2 ink back to 73 (k63) and 74 (k176), but the
centre stays inked while the mid radius keeps the long fade, so the centre comes loose: at fade 1.2, A_5
k176 has an 18 px piece 2.8 px from the centre beside the 104 px crescent (dot11.py, gray < 22), and k63's
centre hangs on by a 1 px neck (sheet11.png, last column). That fails "no loose piece from a wedge ball".
Why any fade narrowing inside the ball does it: the light band's width there is fw = fl(bs) * bs, which must
reach the ordinary F at the ball's edge (bs = 1); any fl(bs) < F inside makes fw steeper than fix 1's F * bs
somewhere, and a band that widens faster than the ink beside it closes a ring around the centre. A
successor would spread the narrowing past the ball (over the wedge's 3R, lkTw) or not narrow the fade at
all; it must pass dot11.py on m11f12/s11f12-style captures.

**Sheet** (viewed): `.claude/probes/K1584/s11/out/sheet11.png` (untracked; sheet11.py redraws it): rows
k63, k176, k265; columns today | stage 8 | stage 10 | stage 11 (fade 0.14) | stage 8 / stage 11 at fade 0.5
| stage 8 / stage 11 at fade 1.2 | fix 2 at fade 1.2 (rejected).

**Mistakes:** early on a probe script and its folder were written in the main checkout
(`knotmaze\.claude\probes\K1584\s11\wid11.ps1`), and once a commit message went through a file in
`$env:TEMP`; both deleted at once.

**Next:** land k1584-s11: 8b19e5b79 plus 19 commits (stages 9 and 10 re-applied, 13; stage 11, 6), none of the
old history (`merge-base --is-ancestor d39e363fe` exits 1), so a plain merge is allowed. Against master's pictures
the three together change only k63 and k176 (the 66 px above). Ask Levi, with sheet11.png's fade 1.2 columns, whether the
ball's thinner crescent at long fades (57/56 px against stage 8's 76/83) matters; only if it does, a stage
12 for a fade narrowing spread over the wedge's 3R that passes dot11.py.