# K1228: a ribbon covers its half-width on the inside of a tight turn

Ledger: K1228. One Muse fix run, which Claude starts through Paseo from this committed brief. It
works in its own worktree and pushes to master when Done holds. Cap 2 h. Ports 5940-5949.

## Goal

Levi (window 84): junctions must "appear as though they are one whole fused seamless unit". At
cross ji 51 (the `cross` stand of K1218 S5's tools, device px (1019, 1136)), 2-4 px of background
show inside chain 61's half-width (23.4 px), on the inside of a 40° left turn whose radius
(19-21 px, samples 532-533) is under the half-width. K1218 S5's Handoff, item 4
(`docs/design/K1218_s5_section_edges.md`, line 124), measured it and inferred the cause without
testing it: `ribbon_mesh.ts`'s CONCAVE-SIDE CLAMP caps the inner offset at max(0.95 R, 0.3 h), so
the ribbon thins into the turn and leaves a notch.

Test the cause first. Then make the ribbon cover its full half-width on the inside of a tight
turn, without bringing back what the clamp is for: P3.34's sawtooth seam, where the inner strip
folds over itself. The way is yours (for example, the inner vertices of the folding samples
collapse onto the point where the two legs' inner offset lines cross). If the cause is elsewhere,
fix it there.

## Read first

- K1218 S5's Handoff item 4, and the headers of the tools named below.
- `.claude/rules/render-ribbon.md`: the P3.34 clamp entry (line 133), the K580 entries on the
  round outer side past ROUND_DOT_START and the cusp's 0.3 h, and THE PARTS. Also `render.md` and
  `probes.md`.
- `src/render/ribbon_mesh.ts` around `CONCAVE-SIDE CLAMP`, and the tests that cover it.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1228`. Claude made it,
  detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- K1218 S5's tools are tracked in `.claude/probes/K1218/s5/`: `live_s5.mjs` with its modules
  `ribbons_s5.mjs` (which ribbon a pixel lies in, and how deep) and `bend_s5.mjs` (a chain's turn
  and radius per sample); `shoot_s5.mjs`, `run_shots_s5.ps1`, `diff_s5.mjs`. K1220 S2's text
  stands are in `.claude/probes/K1220/s2/`. Copy what you use to `.claude/probes/K1228/`, with lock
  owner `K1228`, master on port 5940 (served from a `git archive` export of this brief's commit
  in `.claude/probes/K1228/master`, `node_modules` junctioned) and yours on 5941.
- Every browser job runs under the perf lock through your copy of the runner: real time, headed,
  at most two browsers.

## Done

1. The cause, tested: ji 51's notch on master, and with the clamp off.
2. At ji 51, no pixel inside chain 61's half-width (edge < -1 px) reads as background, at rest
   and at K1190's four pulse moments.
3. Every turn on the cross, loop and x4 stands whose radius is under the half-width, at rest: the
   background pixels inside the half-width, master's and yours. Yours: 0, or each spot cropped and
   named.
4. No fold: no strip triangle flips (negative area) on the three stands, at rest and in a pluck
   frame. A unit test in `test/render/` pins a turn with R < h: the inner side covers the
   half-width and no triangle flips.
5. Whole-frame diffs at rest, master against yours, on the three stands, the knot-mode default
   link and K1220 S2's a and i text stands: every changed pixel lies within one half-width of a
   turn with R < 1.05 h, or you crop and name it. Crops at zoom 4, master over yours, of ji 51 and
   the five tightest turns, in `.claude/probes/K1228/out/sheets/`, for Claude to judge.
6. `npm test` is green after `git fetch -q origin` and `git rebase origin/master`. Then
   `git push origin HEAD:master` and watch that commit's deploy (`gh run list -R
   levilindsey/knotmaze -L 3`) until it is green. If the push is rejected: fetch, rebase, test,
   push again. Never force, never skip hooks. If Done 2-5 don't hold by the cap, don't push: keep
   the patch in `.claude/probes/K1228/`.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs,
  the master export). The copied tools may go in with the fix's commit.
- Don't touch:
  - the main checkout (Claude merges there), or any other worktree;
  - `src/render/field/` (K1040, another run), and `joinery.ts` or `ribbon_renderer.ts` beyond a
    few lines (K1220 S3, another Muse run, until about 10:10);
  - port 5173, ports 5960-5969 and 5980-5989, or the phone.
- Don't edit LEDGER.md.
- Out of scope (name it if you see it, don't fix it): the dark edges that step at MSAA levels
  (K1231), the section colours' staircases and cross ji 33's seam (K1218), the junction field
  (K1040), how a cursive cusp's spur is filled (K1220), the junction fans and webs.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone).
  Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the last push: the cause, the fix, Done's tables, the sheets
to show first, anything out of scope you saw, your last SHA. Commit messages carry the record.
