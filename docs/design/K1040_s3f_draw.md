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

The S3f agent, 2026-11-03, 19:20 to 21:20 (the cap). Branch
`worktree-agent-a8112b33d998f9629`, rebased onto origin/master
`16246c90` (K1139 S2; still master at 20:45). The stage's commits sit
on it, and the last one adds this Handoff.

**The gate missed on the Pixel: 4.0-10.9 ms against 2** (the coordinator's run, 22:21-22:29; The Pixel gate, at the end). Before it, K1142's
ready check stopped the gate batch every time it was tried:
- at 20:28, because the phone's screen was off
  (`out/gate_s3f_20261103_2028.log`);
- at 20:46, with `-PhoneRuns 3`, because an app was in front of the
  launcher (`out/gate_s3f_20261103_2046.log`);
- 7 more tries, every 2 minutes from 20:51 to 21:03, with the phone
  awake and unlocked but Chrome (6 tries) or another app (1) in front
  (`out/gate_s3f_poll_20261103_2051.log`). Nothing ran on the phone.

The desktop half ran.
- Steps 1 and 4 are done.
- Step 3 has its count and one lever, the facets, which fail the
  census.
- Step 2 needs the phone; it is the batch's s3f1 run.

### What landed

- `4ea95f35`, step 1 (K1158). The live pass keeps GL state without
  querying it: no `getParameter` and no timer query on the per-frame
  path.
  - draw() ends with `release()`. It hands the context back through a
    `LabelBHost`: `label_b_host.ts`, Pixi v8's, takes the viewport from
    its adaptor's cache, then calls `resetState()`, so Pixi's next
    draw rebinds what it uses.
  - Uploads bind lazily, and uniform locations are cached per program.
  - The first table bind of a frame sets UNPACK_FLIP_Y and PREMULTIPLY
    false.
  - sync() reads through READ_FRAMEBUFFER.
  - `probeQuery` keeps S3e's query and restore (the control);
    `probeTimer` keeps the timer for the desktop's GPU column.
- `4ea1c0af`, step 1's proof.
  - The same-state A/B (`s3.mjs ab`, `out/ab_s3fab2_summary.md`): the
    old restore and the new host each differ from the control by 0 px
    on all 12 scenes, with no GL error.
  - Its negative controls show that it would see a missed state:
    resetState without the viewport differs by 214574 px, and no
    restore by 306k px with error 1282.
  - The desktop split (`out/many_s3fsplit_summary.md`, sync p50):

    | variant | ms |
    |---|---|
    | the new empty pass, `fempty` | 0.5-0.6 |
    | S3e's no-save `leanemptyns` | 0.5-0.6 |
    | `leanempty` | 0.7-0.8 |
    | the new tentv, `ftentv` | 0.7-1.0 |
    | `leantentv` | 0.8-1.1 |
    | ideal | 0.5 |
    | floor | 0.2-0.3 |
- `ed9708c9` and `a69911c3`, step 4: `s3f_gate.ps1` and its dry run,
  which touches no phone and takes no lock. The phone runs put the
  gate's pair first:
  - s3fnew, the new pass on a Pixi host;
  - s3ffloorall;
  - s3ftentv, S3e's tentv on today's code;
  - s3ffit, the control;
  - s3ffloorhost and s3fnewrest;
  - last, s3f1: step 2's split on one page.
- `c869c6c8`: the censuses on today's code (The census, below).
- `cfa7981b`: the upload's CPU.
  - The Pixel's upload calls cost 1.1-5.5 ms a frame (S3e's phone
    JSONs, `upload.p50`). S3e measured as much at rest (0 bytes sent)
    as moving, so the cost is CPU work, not transfer.
  - `tentSpanRecord` (`label_b_tent.ts`) runs inside them every frame,
    at 16 halvings a point. A chain whose spans are sorted now walks
    from the previous point's span instead.
  - The record is the same bit for bit. The tests check the walk
    against S3d's halvings verbatim, including unsorted, NaN and
    duplicate spans and 200 random chains. npm test: 207 files passed.
  - `span_bench.ts` (`out/span_bench.md`, desktop Node, the 12 scenes):
    the search falls from 0.095-0.574 ms to 0.038-0.235 (0.34 ms saved
    on def), with the same bits on every scene.
  - The at-rest row diff over the five tables costs 0.055-0.308 ms
    there, untouched.
- `49f13a81`: step 3's count and the facet knob.
  - `vert_count.ts` (`out/vert_count.md`): tentv issues 64k-370k
    vertices a frame. About 90% are segments (12 vertices each) and
    8-10% caps (193 each).
  - `s3.mjs --nw n` (page.ts `nwOpts`) sets the segments' wedge facets
    (today 3), for the facet lever's census.
  - The desktop gate times: `out/desktop_table_s3f.md`.
- `6acc10b8`: the facet census (NW 2, NW 1), which fails.
- The next commit: this Handoff.

### The census

| tag | pass | DEFECT | at >= 0.03 px |
|---|---|---|---|
| s3fq | today's tentv (S3e's query and restore) | 807 | 515 |
| s3fnew | the new pass (K1158) | 807 | 515 |
| s3fctl, s3fctllean | the control, live state (and lean) | 0 | 0 |
| s3fnw2 | the new pass, NW 2 | 1071 | 681 |
| s3fnw1 | the new pass, NW 1 | 2980 | 2290 |

s3fnew equals s3fq scene by scene and class by class.

Both are above the brief's 794 / 504. That figure is tentv's count
from before master's two field commits since S3e: K1114 S1i F2 and F3
(`ac5c2c9d`, `6c019b35`), both in `src/render/field/`. s3fq is tentv on
today's code. So the new pass is no worse than tentv, but it does not
meet the brief's literal numbers. **Whether the condition moves to
807 / 515 is the coordinator's call.**

Fewer facets fails:
- NW 2 has more DEFECT on every scene. The smallest steps are fat (25
  against 23) and g41_def_tw42 (40 against 32, with the same 9 at
  0.03 px or more).
- Most of NW 2's extra defects are gpu-hole (136 to 286) and lower (44
  to 127).
- NW 2 also has one class tentv lacks: `gpu-extra[cap,tie]`, 1 pixel.
- NW 1 has 3.7 times tentv's DEFECT count.

### Before and after, per scene (ms)

Where the columns come from:
- **Pixel before** is S3e's gate run on the same phone
  (`out/phone_table_s3e.md` in the main checkout, and the upload p50
  from S3e's phone JSONs). Its cost is s3eleantentv - s3efloorall, and
  the gate's cost adds the upload.
- **Pixel after** is not measured.
- **Desktop** is the GPU timer p50 plus the upload calls' p50
  (`out/desktop_table_s3f.md`, a 0.1 ms timer). Today's tentv is
  s3ftentvtime (S3e's restore, with the walk) and the new pass is
  s3fnewtime. At rest, both read the same as moving.
- **Draw** is 10.8 ns a vertex times the vertices, from the fit below.
  It is an inference.

| scene | Pixel before: cost + upload = gate's cost | desktop tentv | desktop new | vertices | draw at 10.8 ns |
|---|---|---|---|---|---|
| muse_hash | 7.9 + 4.6 = 12.5 | 1.05 | 0.87 | 328196 | 3.5 |
| muse_default_tw | 5.4 + 1.1 = 6.5 | 1.19 | 0.82 | 347624 | 3.8 |
| def | 9.9 + 5.5 = 15.4 | 1.21 | 0.93 | 363206 | 3.9 |
| fat | 6.1 + 1.6 = 7.7 | 0.78 | 0.66 | 207900 | 2.2 |
| ring | 4.6 + 1.2 = 5.8 | 0.42 | 0.39 | 64354 | 0.7 |
| user_tw42 | 5.4 + 2.2 = 7.6 | 0.63 | 0.53 | 155836 | 1.7 |
| g41_def_tw42 | 8.5 + 5.5 = 14.0 | 1.13 | 0.82 | 369806 | 4.0 |
| g41_def_tw64 | 7.6 + 5.3 = 12.9 | 1.09 | 0.85 | 353984 | 3.8 |
| g41_ring_tw42 | 4.5 + 1.1 = 5.6 | 0.40 | 0.37 | 65878 | 0.7 |
| g41_ring_tw64 | 5.1 + 1.1 = 6.2 | 0.42 | 0.39 | 63928 | 0.7 |
| g41_user_tw42 | 6.2 + 2.3 = 8.5 | 0.63 | 0.53 | 155836 | 1.7 |
| g41_user_tw64 | 6.3 + 2.2 = 8.5 | 0.63 | 0.57 | 151294 | 1.6 |

The desktop's control fit (s3ffittime) reads 0.76-4.00.

**What is left is inferred, not measured.** S3e's Pixel cost fits 10.8
ns a vertex plus 4.1 ms (r 0.81), so the drawing alone cannot bring it
to 2 ms. K1158 removes the state save; on the desktop, the new empty
pass sits exactly at the no-save one. With the save gone, the brief's
budget (from S3e's split) puts the fixed part near ideal + 0.8-1.2.

Per scene, that leaves:
- the floor and the fixed part, about 1.3-1.7 ms;
- the drawing, 0.7-4.0 ms;
- the upload, 1.1-5.5 ms before the walk. The walk's saving on the
  Pixel is unmeasured.

On that reading, no scene gets under 2 ms. Even ring, the smallest,
sums 1.3-1.7 of floor and fixed part and about 0.7 of drawing, with
the upload on top. **The gate needs both the drawing and the upload
cut, not one of them.**

### Commands

Run them from the worktree root. `run_locked.ps1` takes the perf lock
(owner `K1040-S3d`).

**Never pipe `run_locked.ps1` through `Select-Object -First n`.** That
stops the pipeline, its `finally` releases the lock, and node runs on
unlocked. It happened twice in this stage, 20:34-20:36.

- **The gate**, with the phone awake (K1142's check):
  `& .claude\probes\K1040\s3\s3f_gate.ps1 -SkipDesktop` runs the seven
  phone runs and the tables. `-SkipDesktop -PhoneRuns 3` runs only the
  new pass, floorall and today's tentv, and `-DryRun` checks the plan
  without the phone.
  - The cost per scene is the last column of the s3fnew table in
    `out/phone_table_s3f.md` (`s3fnew - s3ffloorall + upload`).
  - Step 2's split is in `out/split_s3f1.md`.
- **A census**: run
  `& .claude\probes\K1040\s3\run_locked.ps1 -RunArgs @('verdict','--mode','tentv','--lean','1','--state','new','--tag','<t>')`,
  then `& .claude\probes\K1040\s3\defects.ps1 <t>`. A lever adds its
  knob, as `'--nw','2'` did.
- **A desktop time**: `-RunArgs @('time','--mode','tentv','--lean','1','--state','host','--tag','<t>')`;
  add `'--rest','1'` for the pass at rest. For every time and the
  table: `s3f_gate.ps1 -SkipPhone -SkipVerdicts`.
- **The A/B**: `-RunArgs @('ab','--tag','<t>')`.
- **The counts**, in Node:
  `node scripts/run_node.mjs .claude/probes/K1040/s3/vert_count.ts`.
  `span_bench.ts` sits beside it and is a timing, so run it under the
  perf lock.

### Next

1. **The gate on the Pixel**, the coordinator's run
   (`s3f_gate.ps1 -SkipDesktop`). It measures K1158 there (s3fnew
   against s3ftentv) and the walk (against S3e's s3eleantentv), plus
   step 2's split (s3f1).
2. **Step 2**, from s3f1: remove what is cheap in `noupns - d32f`.
3. **The upload**, the largest term on the dense scenes (4.6-5.5 ms on
   muse_hash, def and the g41_def pair):
   - skip the span record and the row diff on a frame where nothing
     moved;
   - then cut the moving transfer (K1157: SAMP's x,y, and one
     texture).
4. **The drawing**:
   - first, tents only within the junctions' reach. It is not built,
     and not yet counted: `vert_count.ts` counts today's vertices only.
   - then continuous strips per chain run.
   - A circumscribed wedge is an untested way to keep fewer facets:
     push its facet vertices out so the polygon contains the round
     shape instead of sitting inside it. NW 2's added defects are
     mostly holes.

## The Pixel gate

The coordinator ran `s3f_gate.ps1 -SkipDesktop` on 2026-11-03,
22:21-22:29: all seven phone runs, exit 0
(`out/batch_s3f_20261103_2221.log`). The phone was cool (thermal 0,
battery 27.2 C); a media session was playing, as in S3e's run.

**The gate missed.** The label cost (`s3fnew - s3ffloorall + upload`,
`out/phone_table_s3f.md`) is 4.0-10.9 ms (median 5.5) against 2, on
every scene. S3e's lean pass measured 4.5-9.9 (median 6.2).

| scene | label cost | K1158: s3ftentv - s3fnew (p50) | upload, moving / at rest |
|---|---|---|---|
| muse_hash | 5.1 | 3.4 | 1.2 / 2.5 |
| muse_default_tw | 4.8 | 1.8 | 0.7 / 0.9 |
| def | 10.9 | 0.9 | 2.8 / 4.1 |
| fat | 6.4 | 1.8 | 1.5 / 1.4 |
| ring | 4.0 | 1.6 | 0.6 / 0.7 |
| user_tw42.lightpaper | 5.5 | 1.6 | 1.3 / 1.7 |
| g41_def_tw42 | 6.1 | 4.8 | 2.6 / 4.0 |
| g41_def_tw64 | 9.4 | 2.9 | 2.7 / 4.0 |
| g41_ring_tw42 | 4.8 | 2.0 | 0.6 / 0.7 |
| g41_ring_tw64 | 4.4 | 1.6 | 0.6 / 0.7 |
| g41_user_tw42 | 6.4 | 2.0 | 1.3 / 1.7 |
| g41_user_tw64 | 5.4 | 2.0 | 1.3 / 1.7 |

The upload columns are the pass's main-thread time in its upload calls
(the tables' `+x`; at rest from s3fnewrest). At rest it costs as much
as moving, or more: the CPU work runs whether or not anything moved.

- **K1158 works.** The new pass is 0.9-4.8 ms (median 1.9) faster than
  S3e's query and restore on the same pages.
- **The split** (`out/split_s3f1.md`, medians): the fixed part over the
  ideal (`fempty - d32f`) 1.5 (0.9-2.4; S3e's `leanempty - ideal` was
  2.7), of which the host restore 0.2 and `noupns - d32f` 0.5; the
  drawing 2.5 (1.4-4.1); the ideal floor 0.3. With the upload (median
  1.3) they add up to the median cost.
- **What 2 ms needs.** Every term has to fall: for example the drawing
  to about 0.8, the fixed part to about 0.6 and the upload to about
  0.3, over the 0.3 floor.

Next: S3f2 (`docs/design/K1040_s3f2_levers.md`), the Handoff's Next 2-4.