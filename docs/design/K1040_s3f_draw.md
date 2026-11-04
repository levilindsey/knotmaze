# K1040 S3f (K1097): the label pass under 2 ms on the Pixel

The coordinator's brief, 2026-11-03. One stage. The agent's own
worktree and branch (Claude Code names them), never pushed. S3e is on
master (`f00a59c1`), and the coordinator's S3e phone gate
(2026-11-03, 18:45-18:54) is recorded in S3e's Step 3 and table
(`db7e5e98`).

## Where S3e left it

Read `docs/design/K1040_s3e_lean.md` first: its Handoff (What landed,
Steps 1-3, Before and after, Commands) is the baseline, and its Rules
section is this stage's, with the changes under Rules below.

- **The gate missed.** The Pixel's label cost for tentv with the lean
  fixed part is 4.5-9.9 ms (median 6.2) against 2, on every scene, and
  no better than today's part measured on the same pages (4.1-9.6;
  `out/phone_table_s3e.md`). A media session was playing on the phone
  during that run; S3d measured 4.1-9.4 without one, so it mattered
  little.
- **The fixed part.** `leanempty - ideal` is 2.3-3.6 ms (median 2.7;
  `out/split_s3e3.md`). The medians split it: draw()'s GL state save
  1.9 (`ns - ideal` 1.2), the upload about 0.2 (`lean noup` 2.5), and
  0.6 that neither explains (`noupns - d32f`). Invalidating D32F is
  free (`D store` -0.2), and D24 is worse, so D stays D32F. On the
  desktop `leanempty - ideal` is 0.2-0.3 and `ns - ideal` 0.0-0.1: the
  save costs only on the Pixel.
- **The floor.** The ideal pass (`out/split_s3e1.md`) costs 0.5
  (median; -0.2 to 1.3, over 1 ms only on muse_hash). That leaves about
  1.5 ms under the gate for the upload, the state handling and the
  drawing together.
- **The drawing.** Past the empty pass, tentv's drawing costs 2.8-3.0
  ms (median; 1.2-4.4), mostly its vertices (S3d's split).
- **The census.** tentv keeps S3c's tent's census exactly: 794 DEFECT,
  504 of them at 0.03 px or more. The control's is 0.

So the budget: with the save gone, the fixed part sits near ideal +
0.8-1.2, which leaves well under 1 ms for a drawing that costs about
2.9 today. This stage must cut both.

## The gate

Unchanged from S3e's decision (the coordinator's call, 2026-11-03): the
Pixel's label cost, p50 minus floorall's p50, at most 2 ms on every
scene, everything the pass does counted. The cost now also counts the
pass's main-thread time spent in its upload calls (0.1-0.8 ms on the
desktop, which a render-sync timing does not see): measure it beside
the GPU time, on the desktop and the Pixel, and add it.

## The stage

0. Run `Get-Date`. Fetch, then rebase the branch onto `origin/master`.
   Read S3e's doc whole, K1158 and K1157 (LEDGER.md, Ideas), F7 of
   `docs/design/K1040_junction_field.md`, and the header and draw() of
   `src/render/field/label_b_pass.ts`.
1. **No state queries (K1158).** The live pass keeps GL state without
   querying it. Read how Pixi v8 tracks GL state (its state, texture,
   buffer, shader and render-target systems: bindings, viewport, blend,
   depth, the bound framebuffer) and either restore what the pass
   changed from Pixi's own tracking or reset Pixi's caches after the
   pass, so its next draw rebinds. No `gl.getParameter` and no timer
   query on the per-frame path; probes keep theirs behind their own
   options. Prove that the game draws the same after the pass: a
   same-state A/B of the old restore against the new on the S3 scenes,
   0 px different outside the label. Then the desktop split
   (`leanemptyns` against the new pass's empty pass). Commit.
2. **The unexplained 0.6 ms** (`noupns - d32f`): what the empty pass
   still does past the ideal with no upload and no save (program and
   VAO binds, uniform uploads, the 1-px readback, the draw calls'
   setup). Split it into variants the gate can time; remove what is
   cheap to remove. Commit.
3. **The drawing.** Cut tentv's drawing toward 1 ms on the Pixel. Its
   cost is mostly vertices, so first count them per scene (today's
   count, and what each lever would save), then build the levers as
   options of the pass beside today's, in the order of their expected
   saving: tents only within the junctions' reach; fewer facets where
   the census allows; continuous strips per chain run; instancing.
   K1157's levers (SAMP's x,y, the tables in one texture) cut the
   upload, about 0.2 ms on the Pixel: take them only if they come
   cheap. Each lever that changes geometry runs the census
   (`verdict`) before it is timed. Commit each.
4. **The gate batch.** Write `s3f_gate.ps1`, modeled on
   `s3e_gate.ps1` (both locks through `phone_batch.ps1`, K1142's ready
   check, 15-minute lock waits): on the Pixel, the control `fit`,
   today's tentv, the new pass with each lever that kept the census,
   the new pass's empty pass, `ideal` and `floorall`; on the desktop,
   the census (`verdict`) and the timer (`time`) for the same
   variants. Prove that it parses and plans with a dry run that
   touches no phone. If the phone is ready (K1142's check passes inside
   your cap), run it; otherwise the coordinator runs it.

To pass, all hold:

- the label cost (as The gate defines it) at most 2 ms on every scene
  on the Pixel;
- the census no worse than tentv's: at most 794 DEFECT, at most 504 at
  0.03 px or more, and no defect class that tentv does not have
  (`defects.ps1`'s classes);
- the control's census unchanged: 0 DEFECT.

If the levers cannot reach 2 ms, say what they reach, scene by scene,
and what is left (the floor, the fixed part, the drawing). Don't
change the gate, and don't take S3g's list.

Out of scope: S3g's list (F4, F6, F8, F9 and F12, K1143), the label's
look, and S4.

## Rules

S3e's Rules apply, with these changes:

- **Ports.** Your dev server uses 5403 (K1097's env line). Avoid 5173,
  the phone's 5480-5489, Muse's 5550-5599, and K1139's 5620-5639: Muse
  batch 15's run A works there during this stage.
- **Master moves under you.** Muse commits on master during this stage
  (batch 15: K1139 S2 in `src/render/fabric_maze_renderer.ts`,
  `src/render/pulse_path.ts`, `src/game/route_plan.ts` and
  `src/app/probe_hooks.ts`; K778 in the HUD, the panel and the link
  codec). None of it is in `src/render/field/`. Rebase before the
  Handoff and say on which commit you ended.
- **The perf lock** is shared with Muse's probe batches: wait inside
  one blocking command, as S3e's rules say.
- **The stop.** Stop when the stage is done or 2 h after step 0's
  `Get-Date`, whichever comes first. A compaction is not a stop. At the
  stop, commit, then append a Handoff to this brief (what landed,
  commit by commit; the before and after table per scene; the
  commands; the next step), commit again, and report: the gate's
  verdict, the table, a `Ledger items` list, and K1097's handle fields
  (owner, branch and last commit, evidence, next, brief, env).

## Handoff
