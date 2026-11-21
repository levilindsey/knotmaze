# K1482 stage 35: t81s's under pass shows its width (K1560; Claude agent stage)

**Started 2026-11-20** from the ledger commit that added this brief (stage 34b's end-arm burial is merged:
`arms34()` in `tables.ts`, `T34` in `gf_glsl.ts`). If this file is not in your worktree, the worktree starts
from an older commit: before any work run `git fetch` and `git reset --hard origin/master` (history was
rewritten on 2026-11-20, K1493: never merge or rebase across it).

Levi, 2026-11-20, on t81s: **"we want the step. Ideally the step corner would be a be rounder though. Also,
on the pictured example, the under thread bottom side borders don't weem wide enough apart to properly
indicate the thread width and alignment with the upper side of the under crossing?"** He saw it right
(measured, `docs/ledger_notes.md` `## K1560`: read it first, it is 28 lines). This stage builds a
**candidate**: it is shown to Levi before and after, and it lands only on his yes. You do not push.

His rules bind every change (`.claude/rules/render-gpu-field.md`):

- **The under pass keeps its width and its heading:** where a thread goes under another, its two outlines
  read as one thread of constant width, in line with itself on the far side. Never trade a hook for a point.
- **Never remove a thread's border:** two close borders are two threads' edges and both stay. At every place
  your change moves, each thread still shows both borders, its width and its heading.
- **t81s's step is wanted:** the 6 px mark at x 907-912 below the over thread stays as it is.
- gf's border look is gf's own: do not move its strokes toward today's renderer or use today's as a bar.

## The site

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5; add `&snd=none`;
`&tlk=border` the outlines only, `&tlk=fill` the fill, `&gfk=0` the second corner try off). **t81s** is at
929.1,1152.7 on its 3200x1800 frame (42.594 px per world unit, a thread 34.1 px wide, the outline 6.47 px).
The over thread is chain 9. The under thread, chain 45, passes under at about (929.9, 1119.8). The branch,
chain 81, starts at junction j103 (921.4, 1149.0), only 30 px (0.70 world) below the crossing.

Along the over thread's lower edge the under thread's true edges leave at x 907.2 and x 939.3. Drawn 2-4 px
below that edge: the step at x 907-912, no ink from x 913 to 936, then a 23 px smear at x 933-959 that hugs
the over outline (the branch's upper border fusing into it). Across chain 45, 24 and 30 px below the
crossing, only the step-side border is drawn; both borders are back from 36-48 px on. So below the crossing
the eye gets one border and a 20-26 px open gap where a 34 px thread comes out.

## The goal

Below the over thread the under thread reads as a 34 px thread coming out where it does: its right edge is
marked at x 939 the way its left edge is at x 907, in line with the two borders above the crossing, and the
junction below still reads as a junction (the under thread and the branch stay fused: no border between
them). A step on the branch side like the wanted one on the left is the candidate I would try first; the
technique is yours. If the junction is so close to the crossing that no mark can do this without breaking a
rule above, say so with the picture that shows why: that is a result.

## The steps

1. Which pieces, keys and cuts draw the smear and leave x 913-936 empty: the CPU copy (`eval.ts`) first.
   Stage 34b's tools are tracked in `.claude/probes/K1482/s34/` (`pix25.ts`, `mir34.ts`, `wd34.ts`,
   `cap34.mjs`, `capseq34.ps1`, `diffseq34.ps1`, `crop34.py`); `.claude/probes/K1482/t81s_answer.py` made
   the measurements above. Node probes: `$env:GF_KRETRY = '1'; node scripts/run_node.mjs <tool.ts> ...`.
2. The narrowest rule that marks the right edge. Count where it fires on link A and on the bar's mazes
   (`ring`, `def`, `muse_hash`, `g41_user_tw64`) before any GLSL; draw each place in the CPU copy and look.
3. GLSL, the CPU copy and the shader in step.
4. One capture session: master, candidate, master, candidate, each as it loads and with `&gfk=0`, through
   `scripts/perf_lock.ps1 -Owner 'claude-s35'` (at most 25 minutes per call; the lock is shared). Repeat
   loads of one build must be equal before a diff means anything. Ports 6280-6289.

Muse's run 27Q edits `lkGap` in `src/render/gpu_field/gf_look.ts` while you work (K1561: the coverage cut
`gA`). Prefer the other gpu_field files; if your rule needs `gf_look.ts`, keep off the `gA` lines and say so.

## Done

- Pictures for Levi, untracked in `.claude/probes/K1482/out/s35/`: t81s before | after | changed pixels in
  red, with its surroundings (about 300 px across) and close (x12), each as drawn and contrast-stretched
  (link A is dark). The same for every other place the frame changes, with a list (box, px, nearest site).
- Every changed place looked at by you against the rules above. A changed place that is not plainly better
  is a reason to narrow the rule, not a trade to report.
- Fill shots 0 px, or each changed fill place listed and pictured.
- The bar (`.claude/probes/K1436/k1436_bar.ps1`) and the guards (`.claude/probes/K1482/guards.ps1`) pass with
  `GF_KRETRY=1`; `npm test` passes with it unset.
- Cost in numbers: the table build's `tms` on link A, the shader text's growth (new text makes first loads
  cold: 40-96 s, K1456; keep it small).

## Rules of work

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`); the Read tool only
  just before an Edit. No helper agents.
- Work only in your worktree; commit WIP at every milestone, broken or not; never push; never edit a ledger.
- Probe OUTPUT stays out of git (never `git add -f` it); tools go in `.claude/probes/K1482/s35/`.
- Whole output of every capture and guard goes to a file; report from the files.
- **Stop** when Done holds or at 2 h from your start (`Get-Date` at the start and at each milestone),
  whichever comes first. A compaction is not a stop: re-read this brief and `git log`. Then commit, append
  `### Handoff K1482 s35` here (what draws the place, what you changed, every changed place, the checks with
  their numbers, the pictures' paths, what is left) and report. End the report with a `Ledger items` list
  and your item's handle fields (branch, last commit, evidence, next).
