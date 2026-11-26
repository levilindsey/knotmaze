# K1626 finishing run: the width jump re-sleeps with the joint eyes open (numeric, 1 h)

Read first: `K1626_s2_brief.md` with its `## Handoff (stage 2)` on branch `k1626-s2` (your base), and the
tools under `.claude/probes/K1626/` (`widthjump.ts`, `wj_diag.ts`, `jeye.ts`, `eyetab.py`, `bench.ts`).

## State

Stage 2's joint-eye pressure opens the eyes (first-pass joint eyes under 1.5 widths: 44 -> 1; Levi's J138
0.80 -> 2.05) and the look is the one to keep. One binding fails: on Levi's link
(`?3.FCBQ1H6L4-6NPbeg8HHN09w`) a thread-width jump 0.75 -> 0.5 never re-sleeps within 40 s (master +3.5 s,
stage 1 +5.7 s; `?1` is fine at +5.6 s). Bisected: skipping joint eye 12 alone gives +3.9 s; the motion that
never stops is at chain 82 slot 53, outside every eye's arms. A global per-pair rate limit cannot keep both
the openings and the re-sleep (table in the handoff).

## This run

1. Name joint eye 12 (print after the settle in `wj_diag.ts`) and say, observed, why its pressure keeps the
   knot awake after the jump (target beyond what its arm material allows? a standoff with a neighbour?).
2. Fix it per eye in `applyJointEyePressure` (the handoff's lead: stop pushing an eye whose arms lack the
   material to meet its target, the P3.37 lesson), not with a global cap.
3. Pass, all of: the width jump re-sleeps on Levi's link and `?1` within 10 s; add that case to
   `test/physics/joint_crossing.test.ts` (or a sibling) so it stays; sleep and quiescence tests as written;
   the openings hold (under 1.5: at most 2 eyes over his link and `?1`..`?a`; J138, J64, J13 each within
   0.15 widths of stage 2's); step cost within 5% of master (`bench.ts`, under the perf lock); `npm test`
   green; `npm run build` passes; pins named.

No pictures needed unless an opening moves by more than 0.15 widths: then re-capture that eye with
`cap3.mjs` as `stage 2 | yours` and view it. Keep out of `src/render/`.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1626-s3`, branch `k1626-s3`, from branch
`k1626-s2`; `node_modules` as a directory junction to the main checkout's (never `npm install`). Write only
inside your worktree. Read code through the shell; the Read tool only just before an Edit. Perf lock through
`scripts/perf_lock.ps1` (another agent shares it: wait inside one blocking command), ports 5655 to 5659.
Commit WIP at every milestone (`git add -f` for probe tools, never their outputs). Never push, never bare
`git stash`, never edit LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`.

## Stop rule

Stop when every pass line holds or after 1 h of wall clock, whichever first. A compaction is not a stop:
re-read this brief and `git log`. If the re-sleep cannot be had with the openings, stop and give the best
trade measured (which eyes would have to close, by how much). On stopping: commit WIP, append
`## Handoff (finishing run)` here, commit, and report: verdict first (safe to land or not), numbers, a
`Ledger items` list and the handle fields.

## Handoff (finishing run)

Agent run 2026-11-26 01:28-02:16, branch `k1626-s3` (from `k1626-s2`).
Verdict: every pass line holds; safe to land.

**Eye 12 is J149xX305.** Arm A runs from c68 slot 6 to pass 8.24 (2 interior
parts, 0.56 world of arc). Arm B runs from c82 slot 72 to pass 65.67 (6 parts,
2.03 world). Before the jump, at tw 0.75, all 9 of its pairs already asked for
more than the arms' rest material allows (bound/target 0.58). After 0.75 -> 0.5,
it parked within 3 s with 7 pairs short (0.35 w at the worst pair, 1.6 w summed),
chord 2.03-2.20 w. It stayed parked for the whole run. Through all of that,
maxMove sat at 7.5-9e-2 and chain 82's particles beside pass 53 (s53/s54) moved
0.2-0.3 world a frame. The eye asks for an opening its arms cannot supply (P3.37),
and its standing push pumps c82's crossings. Stage 2 had measured both sides of
it: skipping eye 12 re-slept at +3.9 s, and pressure off re-slept at +4.0 s.

**The law (ff5a98e2c).** At a thread-width change, each joint eye is judged at the
narrower of the two widths. If its worst pair is under 0.98 of the lens target,
the eye stops pushing (`jeyeOff`) until the next change. A first settle has no
change, so no eye is ever released there. The census and every pin are therefore
byte-identical to stage 2.

Timing matters:
- Release at the change: re-sleeps.
- Release 0.05 s after the change: L +4.0.
- Release 0.3 s, 1 s, 2 s, 3 s or 4 s after: L never re-slept. The pump is
  self-sustaining once started.

Rejected, with numbers (commit fce4ff0b2 keeps the code):
- Capping each pair at its arms' material bound, in any of 3 bound modes at
  frac 0.85-1.0. It re-sleeps (L +3.6-3.9, ?1 +5.2-5.6), but on the census it
  leaves 17-35 eyes under 1.5 w, puts J64xX100 at 0.30-0.99, and moves 45-186
  eyes by more than 0.15 w. In the settle, an eye draws material in through its
  crossing, which no bound computed from the arms can see.
- Holding a parked eye at the shape it reached, instead of releasing it: L
  never re-slept.

**Numbers (final code):**
- Width jump (settle 40 s at 0.75, set 0.5):
  - L `?3.FCBQ1H6L4-6NPbeg8HHN09w`: re-slept +4.0 s, eyes 1 2 3 4 7 9 12 released.
  - `?1`: re-slept +5.6 s, eyes 0 4 9 14 released.
  - Stage 2 never re-slept on L in 20 s.
  - Both cases are in `test/physics/joint_crossing.test.ts` ("K1626 width jump", < 10 s).
- Census over L and ?1..?a (205 first-pass eyes): 1 under 1.5 w (D_4 J5xX19,
  1.47). J138xX282 2.05, J64xX100 1.84, J13xX38 2.02. 0 eyes moved by more than
  0.15 w against stage 2. Every maze sleeps at 5.0 s, D_2 at 5.6 s.
- Step cost, B/A against master b9dab2906 (no `src/physics` change since
  stage 2's base), under `perf_lock`, 5 rounds: L 1.004, D_1 0.994, D_4 0.972.
- `npm test`: 251 files, 3226 tests passed, including the sleep, quiescence
  and new width-jump tests. `npm run build` passes.
- Pins moved: none.
- No pictures: no opening moved.

**Residuals:**
- A released eye stays unpressured at that width through later gestures, even
  if a tug later frees material for it. Only a width change re-judges it.
- An eye that parks in a first settle or after a gesture is never released. The
  census shows none, and L at tw 0.75 never sleeps either way (the riders
  residual).
- The released eyes' openings after the jump were not censused. The closest
  joint-crossing pair after the jump: L 1.75 w (other variants 1.78-1.80), ?1 1.58 w.

Evidence: `.claude/probes/K1626/`. `widthjump.ts` prints the released eyes,
`wj12.ts` traces eye 12, `s3_sweep.ps1` runs the jump and census, and
`s3_cmp.py` compares to stage 2. Outputs are in `out/s3_*` (untracked).