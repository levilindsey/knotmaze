# K1626 stage 2: open the eye a junction's two arms close when they cross

Read first: `K1626_s1_brief.md` with its `## Handoff (stage 1)` on branch `k1626-s1` (your base), and its
tools under `.claude/probes/K1626/` (`eyes.py`, `census.ts`, `frozen.ts`, `bench.ts`, `cap.mjs`,
`compose.py`, `match_levi.py`, `widthjump.ts`).

## Goal

Levi's place on `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1` is J138: a T junction whose two arms cross each
other at X282, 2.6 ctrl from the junction, closing a small eye between junction and crossing. Stage 1
lengthened the half segments beside fused junctions (joint-to-crossing distances rose everywhere) but the
eye is still nearly shut: opening 0.80 -> 1.23 widths, and it reads open at about 2. On his link 9 such eyes
exist; J64 (0.25 w), J138 (1.23 w) and J13 (1.38 w) stay under 1.5. Levi: "Physics isn't doing a good enough
job of keeping these threads apart. This is a recurring problem in other places too", "a priority".

## This stage

Make every junction eye of this kind rest open (paper visible inside, opening at least about 2 widths, or
the largest the arm lengths allow: say which), at his link and on `?1`..`?a`, the way kink eyes are held
open (the KINK EYES lore in `.claude/rules/physics*.md`: rest-material ratchet, across-eye pressure, fairing
exemption) or another way: you own the technique, in `src/physics/`. Confirm by a change on a frozen settled
state before building. Keep stage 1's gains (its `joint_crossing.test.ts` passes, tightened if you can).

Binding: the knot still sleeps (sleep and quiescence tests as written, never loosened; stage 1's
width-jump case re-sleeps); drag feel unchanged in kind; step cost within 5% of MASTER (stage 1 used 0.4 to
3.3% of it); no new kinks, pinches or stretched arms elsewhere (stage 1 left one x1.48 segment on `?7` and a
few more sharp bends: do not add to them, reduce them if it is cheap). Keep out of `src/render/`. Another
agent (K1622) is changing how junction arms bend, on `k1622-s1` (read only).

## Done

1. Per-eye openings, master | stage 1 | yours, on his link and `?1`..`?a`; the count under 1.5 and under 2.
2. Src, tests, `npm test` green, `npm run build` passes, pins named.
3. For Levi: one picture `master | stage 1 | yours`, each crop at least 600 px wide and sharp (capture at
   high zoom or device scale 3, not an upscaled 1x), of J138, J64, J13 and three more eyes, in his link's
   look, settled, real time, viewed by you; plus the three whole mazes.
4. Step cost and time to sleep, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1626-s2`, branch `k1626-s2`, from branch
`k1626-s1` (not master); `node_modules` as a directory junction to the main checkout's (never
`npm install`). Write only inside your worktree. Read code through the shell; the Read tool only just before
an Edit, and for images. Real-time captures only, under the perf lock (`scripts/perf_lock.ps1`; other
agents share it: wait inside one blocking command), ports 5655 to 5659. Commit WIP at every milestone
(`git add -f` for probe tools, never their outputs). Never push, never bare `git stash`, never edit
LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`. Helpers on sonnet, mechanical only.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. This is the second stage: if the eyes cannot be opened without costing the sleep,
stop and say so with pictures. On stopping: commit WIP, append `## Handoff (stage 2)` here, commit, and
report: verdict first, picture paths, numbers, a `Ledger items` list and the handle fields.

## Handoff (stage 2)

Stopped at the 2 h cap (2026-11-26 ~01:35). Source state: a4f07f431 + c7e05f439 (no rate limit; see below).

**Verdict: the eyes open, the settle still sleeps, but one binding fails: stage 1's width jump
(tw 0.75 -> 0.5) on Levi's link no longer re-sleeps.** ?1's jump re-sleeps (+5.6 s).

Technique (`src/physics/particle_system.ts`, `applyJointEyePressure`, constants above
`JOINT_EYE_DIST_PER_WIDTH`): a joint eye is two arms of one fused joint whose first passes outward (within 8
ctrl, none between) are one crossing's over and under. Each substep, pairs across the eye are pushed apart in
2D toward the lens target (H/2)(sin(pi tA) + sin(pi tB)), H = 3.0 widths, REPULSION_STIFFNESS 0.15. Tried and
dropped: a 3D lens (no effect), a fairing exemption, a global-repulsion skip; H 2.6 / 3.4 / 4.0.

Eyes (first-pass joint eyes; n / min widths / under 1.5 / under 2), `jeye.ts` + `eyetab.py`, MAXC 8:
total master 207 / - / 44 / 149; stage 1 207 / - / 42 / 150; stage 2 205 / - / 1 / 51. His link: master
14 / 0.29 / 3 / 3, stage 1 14 / 0.25 / 3 / 3, stage 2 14 / 1.84 / 0 / 1. Per maze in
`.claude/probes/K1626/out/census_{master,s1,mine}.json`. J138xX282 0.80 / 1.23 / 2.05; J64xX100 0.29 / 0.25 /
1.84; J13xX38 1.18 / 1.38 / 2.02. The one stage-2 eye under 1.5 is ?4 J5xX19 (1.47); most sub-2 eyes sit at
80-100% of their straight-arm material bound (J64 76%, ?7 J115xX178 44%).

Cost: step B/A against master L 1.013, ?1 0.958, ?4 0.981 (`bench2.txt`); sleep 5.00 s both builds (?2 5.6).
Stretch: his link maxStr 1.30; ?7 1.37 (stage 1 1.48); ?1 1.28 (stage 1 1.20). Sharp turns: his link 54
(stage 1 56, master 50); ?8 7 (stage 1 3); ?9 6 (stage 1 8).

Width jump re-sleep (tw 0.75 -> 0.5): master ?1 +2.9 / L +3.5; stage 1 +5.2 / +5.7; stage 2 +5.6 / never
(40 sim-s; a standing move 7.5e-2 at chain 82 slot 53, outside every eye arm). Pressure off after the jump:
+4.0. Bisection (`wj_diag.ts`, MODE=skip<e>): skipping joint eye 12 alone re-sleeps it (+3.9); skipping any
other eye does not. Rate limits (per pair, per substep, world): 0.002 re-sleeps (+4.7) but the settle's
openings collapse; 0.005 re-sleeps (+3.9) with his link's min 0.62 (one eye under 1.5); 0.01 and 0.02 never
re-sleep (min 1.35 / 1.78). Softer stiffness (x0.33, x0.5) never re-sleeps. So no single cap keeps both; the
cap is NOT in src.

Next: look at eye 12 after the jump (which joint and crossing, `wj_diag.ts` EYEN=12) and why its pressure
drives a cycle at chain 82 slot 53: a per-eye release (stop pushing an eye whose target the arms' material
cannot meet, the P3.37 lesson) is the likely fix, not a global cap. Then re-run widthjump.ts, the census and
the bench.

Picture (a4f07f431's state; viewed): `.claude/probes/K1626/out/K1626_s2_sheet.png` (master | stage 1 |
stage 2; J138, J64, J13, J152, J132, J28 crops 720x720 at DSF 2, real time, settled, rp=gf, plus the three
whole mazes) and `K1626_s2_sheet_eyes.json`. Tools: `cap3.mjs`, `compose3.py`, `seq3.ps1`, `wj_diag.ts`.

Checks on babb80fb7 (source = a4f07f431): `npm test` green (251 files, 3224 tests), `npm run build` passes.
Pins moved (c7e05f439): the byte_identity maze golden's three frames, hash -542937758 -> -636749779,
680178677 -> -34876091, 714262602 -> -2142615734; knot goldens unchanged (no fused joints). New guard:
`test/physics/joint_crossing.test.ts` (his link: asleep < 10 s, J138xX282 > 1.95, every eye > 1.75; ?1 every
eye > 1.5). Joint eye 12's name is still unread: `wj_diag.ts` EYEN=12 printed nothing (its line runs before
the eyes are built); print it after the settle.
