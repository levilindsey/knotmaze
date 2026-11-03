# K1040 S3: the label pass (form B's top surface on the GPU)

Ledger K1040, stage S3. One stage: Opus, 2 h cap. Branch
`worktree-agent-a4d6c4eb46ea384c4`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a4d6c4eb46ea384c4`
(at 5b8522a5, node_modules joined to the main checkout's). Work only
there. Brief written 2026-11-02 by the stage agent, at the coordinating
session's (7301c55b) request, from F7 of
`docs/design/K1040_junction_field.md` (S3's entry, its gate, and the
carried K1033, K1039 and K985) and S1e's Handoff.

## Why

S1 to S1e built form B's float64 reference (`src/render/field/form_b.ts`)
and showed it continuous on the 12 scenes and the four recordings. The
GPU path starts here: S3 draws the reference's TOP SURFACE per pixel,
depth-tested, into a packed R32UI label and a sampleable depth texture.
S4a and S4b's band reads this label to ink only where its surface is on
top, and S7's paint reads its chain and s. What S3 proves (F7): the GPU's
top surface equals the reference's, and what the label costs.

What the reference's label is (`FormB.evalPoint` / `evalLayers`):
- pieces: per chain, the local minima of |p − c(s)| within h + W + 2aa,
  merged within σ (the nearer kept), each with key = z − d/K (Q1's cone
  key, K = h/zt; z linear along a segment);
- a piece's surface: its group g when `member(chain, s)` puts s in an arm
  span, else OWN (its own surface); in a cap ramp, the heaviest
  configuration of the cap mix (one piece: a member iff ramp ≥ 0.5);
- a corner's fill (r > 0, ω > 0): the curvilinear triangle V, t_a, t_b
  outside the ball, 2aa into the arms' tubes, keyed z(nearer foot) − h/K,
  its chain and s the nearer tangent point's;
- the top: of the surfaces that COVER the pixel (a piece within h with
  fold weight ≥ 1/2, or a fill), the one with the highest key, where a
  surface's key is the max over its pieces within h + aa and its fills;
  the label is (top, its max-key piece's chain and s).

## Calls that bind

- **The reference** is `src/render/field/form_b.ts` as on the base
  (5b8522a5), default params. S3 does not edit it. A label-rule bug found
  in it is reported (a Finding and the report), not fixed here.
- **K1040's calls** (S1 to S1e), where they reach the label:
  - continuous by construction; no fade on a discrete outcome. The label
    is itself discrete (a surface id): its switches sit where the ink's
    fades already blend the two answers (cap ramp at 1/2, fold weight at
    1/2, the tie mix), and S3 adds no new switch;
  - watertight at every fade value: every pixel the reference covers gets
    a label (no holes between capsules, fills and caps);
  - each definition change gets its own Finding headed
    `Definition change:`. S3 expects none (it implements the label, not
    the ink); a rule the GPU cannot express is a Finding for the
    coordinator.
- **F7's shape of the pass:** capsules of radius h per chain segment and
  the corner fills, depth-tested on the cone key; surfaces from the
  topological groups and the arm spans, looked up per fragment from s;
  static instances (one per segment, (chain, k)), rebuilt only when a
  chain's segment count changes (K985), positions from a per-frame point
  table. The packed word keeps label_glsl.ts's layout: chain + 1 (8
  bits), s11 (11 bits), cluster + 1 (8 bits, now the surface: group + 1,
  0 = the piece's own surface), fill, cap, closed.
- **The capsule rule:** a segment's fragment writes only where its
  closest point is a local minimum of the chain's distance (the Voronoi
  test against its neighbours), so a vertex's two segments never both
  claim a pixel the reference gives to one foot, and two segments of one
  chain at equal z resolve by distance, as the cone key does (K1033).
- **The verdict** (oracle30's classes, at every pixel centre, dpr 2):
  agree; boundary (the reference's own margin under eps: an edge within
  eps of h, a span bound within eps of the foot, a key gap under the
  float32 depth's resolution); undefined (the reference has no single
  answer); DEFECT otherwise. Any further class is named and argued in a
  Finding before it counts as anything but DEFECT.
- **Not this stage:** the band (S4a, S4b), the CPU prep's budget (S5),
  paint (S7), and anything that changes what the app draws by default.
  The prep may build on FormB's constructor (it is the reference's frame);
  S5 makes it fast.
- **S1f** works beside this stage on form B's band and corner rules (the
  phantom reach), not the label. A verdict difference traced to a corner
  or band rule is attributed and left.
- Levi does not look at this stage. The debug view sits behind the probe
  hook.

## Order

Take `Get-Date` at the start and at each milestone; write the times into
Findings.

1. **Read (done with this brief, about 15 min).**
2. **The pass (about 45 min).** In `src/render/field/`:
   - `label_b.ts`, pure CPU: from a FormB frame, the GPU tables (per
     chain: points (x, y, s, z) in world units, the label span table from
     `member()` under the heaviest-configuration rule, the chain's flags),
     the corner fill table, the static segment instances with a layout
     key that changes only with a segment count, the group count against
     the word's 255; and `labelAt()`, the fragment rule's float64 mirror
     for the pins;
   - `label_b_glsl.ts`, the capsule and fill shaders (packed word, cone
     key into the depth);
   - `label_b_pass.ts`, the GL side: R32UI + DEPTH32F targets, the two
     draws, the caller's state restored, readback of the word and the
     key, timer queries.
   Pins in `test/render/field/label_b.test.ts`: labelAt equals form_b's
   top on small fixtures (tube, crossing, T, Y, a cap ramp, a bend), the
   layout key's rule (K985), the word's packing. Commit.
3. **The verdicts (about 30 min).** `.claude/probes/K1040/s3/verdict.ts`
   (vite-node, headed hardware-GPU Chrome as run.mjs launches it; the
   page filters the favicon 404, K1039): the GPU label on the 12 scenes
   at their cameras at dpr 2, read back, against `FormB.evalPoint` at
   every pixel centre. Per scene the classes' counts and the DEFECT
   sites. Fix the pass until 0 DEFECT (K1033: muse_hash). Commit.
4. **Timing (about 15 min).** Desktop by timer query (per scene, p50 and
   p95), under the perf lock. The Pixel by render sync at dpr 2 through
   the phone kit, under both locks, if it answers within 5 min; else
   Handoff Next 1. Commit.
5. **The label's pops (rest).** The four recordings (def_drag, def_flow,
   muse_drag, muse_flow): successive frames' labels through the pass,
   label_pops' rule on the surface, each unexplained pixel tested
   against the reference's fade bits. And the point-table question (SAMP
   or label_tables'): the two uploads measured.

Then `## Handoff`. Stop at the cap wherever the Order stands; steps 2 and
3 matter most.

## Later work (not this stage)

- Whatever of steps 4 and 5 the cap leaves.
- The app's hook behind a flag (S4b adds the flag param); S3 runs the
  pass on a probe page.
- The prep in budget (S5): groups only on a diagram change, the corner
  solve off the main thread.

## Where things are

- **The definition:** `docs/design/K1040_junction_field.md` F2 (238),
  F3, F7 (616, S3 at 693), amended by S1-S1e's `Definition change:`
  Findings (`docs/design/K1040_s1*.md`). The label's rules: `evalPoint`
  (1411), `evalLayers` (1466), `pieces` (1050), `member` (1018),
  `inFill` (989) in form_b.ts.
- **Reused patterns:** `src/render/label/label_pass.ts` (targets, draws,
  state), `label_glsl.ts` (the packed word), `label_band_gpu.ts` (the
  static instance layout), `label_tables.ts` (per-fragment s and span
  lookup), `label_app.ts` (camera, `__knotLabel`).
- **The scenes** (read-only): `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\scenes\`,
  the 12 of `.claude/probes/K1040/s1/scenes.ts`.
- **The recordings** (read-only):
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k868-s3a\.claude\probes\S3a\seq13\`.
- **oracle30** (read-only, the verdict classes):
  `...\k868-s3a\.claude\probes\S3a\oracle30.ts`.
- **The prototype:** `.claude/probes/K1040/proto.js` (prep, timer
  queries, render sync) and `run.mjs` (the Chrome launch).
- **Outputs:** `.claude/probes/K1040/s3/out/` (untracked; the summaries
  the Findings cite are force-added), copied to the main checkout's same
  path at the end.

## Rules

- **Files you may change:** new files under `src/render/field/` for the
  label pass and its prep; new tests under `test/render/field/` (not
  form_b.test.ts); at most one small hook where the app or a probe page
  runs the pass behind a flag that is off by default (master's default
  build draws exactly what it draws now; the golden snapshots and
  byte-identity tests stay green); `.claude/probes/K1040/s3/`; this
  brief. Not `src/render/field/form_b.ts`, `.claude/probes/K1040/s1/` or
  `LEDGER.md`. Keep app wiring out of `src/main.ts`; list every file
  changed outside `src/render/field/` and `test/` for the merge.
- **Tests.** `npm test` (tsc included) passes at every commit called
  done.
- **Other checkouts.** Write nothing in them, except the copy of
  `.claude/probes/K1040/s3/out/` back to the main checkout at the end
  (untracked files only; no git command there). Don't run
  `npm run build` in the main checkout. Every script that runs jobs
  first checks that `git rev-parse --show-toplevel` prints this
  worktree's path, and stops if not.
- **Dev server:** from this worktree, `npx vite --config
  .claude/probes/K1040/vite.private-cache.config.ts --port 5403
  --strictPort --host 127.0.0.1` (S1f uses 5401). Never 5173; leave
  5480-5489 alone. Stop it when done.
- **Locks.** Timing and pixel-exact GPU probes (the verdict census
  included) run under `$env:TEMP\claude-perf.lock` (one line: owner
  K1040-S3, start time, what; wait inside one blocking command if
  another owner holds it; stale after 30 min) and delete it after. The
  Pixel also takes `$env:TEMP\claude-phone.lock` in the kit's format.
  Probe links carry `&snd=none`. Never touch the phone (no input, keys,
  screen or settings commands). No serials, IPs or Tailscale names in
  tracked files, commits or the report. If the phone does not answer
  within 5 minutes or its lock stays held, time on the desktop only.
- **Reading code and output** through the shell (`Select-String`,
  `Get-Content | Select-Object -Skip -First`); the Read tool only right
  before an Edit. Probe output to files; summaries of at most about 30
  lines per call. PowerShell for every command.
- **Commits.** WIP to this branch at every milestone, broken or not.
  Never push, never skip hooks, no helpers (no subagents).
- **Stop rule.** Stop when the gate is met or at 20:18 (2 h after the
  18:18 start), whichever comes first. A compaction is not a stop: after
  one, re-read this brief and `git log --oneline -5`, then go on. When
  you stop: commit WIP, append `## Handoff` (what landed, the
  measurements with the commands that reproduce them, Next 1-3), commit,
  copy `s3/out/` back, and report.
- **The report:** what landed, the gate's results (verdicts per scene,
  pops, desktop and Pixel timings, the group count against 255), the
  files changed outside `src/render/field/` and `test/`, the Handoff's
  Next; then `Ledger items` (and whether K1033 and K1039 close) and the
  S3 handle fields: owner, branch and worktree, last commit, evidence,
  next, brief, env.

## Findings

Times (`Get-Date`, 2026-11-02): start 18:18:20; brief written about
18:25 (af7f79f1); the pass and its pins committed 18:43 (4649c8ca); the
verdict runner 18:53 (05727f6c, WIP); resumed after a compaction
19:03:04; the merge scan coded 19:06:55, committed 19:18 (7f32e8e0);
muse_hash at 0 DEFECT 19:18:48; the 12-scene census 19:18:55-19:20:40;
resumed after a second compaction about 19:24; the verdict's tie
margin, census again 19:28:10-19:29:31; desktop timing
19:29:31-19:29:47, without the scan 19:31:33-19:31:49; suite green
19:35; final commit 19:38 (dedfaf13), outputs copied back 19:39;
stopped 19:40, 38 min before the cap, with the gate not met: the
remaining DEFECTs wait on a label-rule decision (class B below), and a
first phone run under both locks, or the pops harness, would not have
finished in the time left.

**The pass.** `label_b.ts` (tables, `labelAt`, the float64 mirror of
the fragment rule), `label_b_glsl.ts` (capsule and fill shaders),
`label_b_pass.ts` (GL: an R32UI word and a DEPTH_COMPONENT32F texture,
`gl_FragDepth = 0.5 - key * keyScale` with LESS, five RGBA32F tables
read by `texelFetch`).
The word keeps label_glsl.ts's packed layout (`label_b.ts` line 39).
Static instances are rebuilt only on a segment-count change (one build
per scene in every timing run).

**D1, muse_hash (K1033): form B's merge and fold.** Before the scan, at
stride 4: 12 DEFECT, MERGE 1939, fade 6. form B's `pieces()` sends a
candidate within sigma (|dS|) of a KEPT nearer candidate of its chain
into `alts`, and the fold gives the far piece of a kept pair
`selfW = ss(sigma, 2 sigma, ds)` (it covers only from 1.5 sigma). The
capsules drew every segment's foot, so a hairpin's or a kink's far side
won by depth where form B had merged it into the near one. **The merge
scan:** a capsule fragment of segment k is discarded when a nearer
candidate of the same chain (geom.ts's candidate rule) lies within
|dS| < foldR (1.5 sigma with the fold, else sigma). It reads only
segment k's window (`nbWindows`: the segments that could hold such a
candidate, from necessary conditions on the arc to them, their distance
and the turning between them), two numbers per segment in a fifth
table. Pin: the crossed
hairpin (`hairpinX`) departs from form B at 80 points without the scan,
0 with it. Residual: form B's merge is greedy (into kept candidates
only), the scan drops a fragment against any nearer candidate; no
census site traced to it.

**Verdict correction (`label_b_verdict.ts`): key ties.** After the scan,
12 DEFECTs on 5 scenes were exact ties that fp32 broke the other way
(the sites traced had the mirror agreeing with form B and the GPU not):
|dkey| 1.5e-9 to 1.1e-6, between two chains (g41_def_tw64,
muse_default_tw) or two distinct pieces of one chain (ring and its g41
variants, e.g. ring 763,351: c1 at s 9.76 and at -0.19, both at d
0.0732, form B and the mirror take 9.76). DEPTH= excluded the same chain
and code, and its margin was the depth word's rounding alone (a few
1e-7). A tie is now a boundary the way an edge is: the margin adds the
image of the position margin (each piece's d moves by epsW, the gap by
2 epsW / K, about 7e-6 on ring and user_tw42), and any two distinct
pieces count (the same chain reaches DEPTH= only beyond sigma: agree and
MERGE return first). 149 DEFECT became 137; DEPTH= rose by the same 12
(muse_default_tw 1, ring 3, g41_def_tw64 1, g41_ring_tw42 2,
g41_ring_tw64 5). The label rule is untouched, and the smallest
class-B gap is 5.9e-5, so the margin absorbs none of class B.

**The census** (stride 1, dpr 2, 2480x1800, every pixel centre against
`FormB.evalPoint`; page errors 0, favicon requests 0, context lost 0 on
every scene; `s3/out/verdict_summary.md`, last run):

| scene | agree | boundary | fade | DEFECT | groups |
|---|---|---|---|---|---|
| muse_hash | 4463117 | 883 | 0 | 0 | 117 |
| muse_default_tw | 4463616 | 382 | 1 | 1 | 117 |
| def | 4463591 | 407 | 0 | 2 | 125 |
| fat | 4463779 | 221 | 0 | 0 | 0 |
| ring | 4463905 | 95 | 0 | 0 | 16 |
| user_tw42.lightpaper | 4463253 | 622 | 79 | 46 | 47 |
| g41_def_tw42 | 4462418 | 1484 | 57 | 41 | 125 |
| g41_def_tw64 | 4463502 | 498 | 0 | 0 | 125 |
| g41_ring_tw42 | 4463534 | 464 | 0 | 2 | 16 |
| g41_ring_tw64 | 4463904 | 96 | 0 | 0 | 16 |
| g41_user_tw42 | 4463259 | 617 | 79 | 45 | 47 |
| g41_user_tw64 | 4463658 | 342 | 0 | 0 | 47 |

137 DEFECT on 6 scenes, all class B. Groups: at most 125, under the
word's 255.

**Label rule question (not changed): who names a group.** Every
remaining DEFECT: the GPU equals its mirror, form B gives the same group
code but another chain, nSurf 1, fade 0, and the GPU's key is lower
(`lower`; `lower-gfill` where a corner fill covers). form_b.ts
`evalLayers` (about line 1466): every piece within h + aa raises its
surface's key and, when highest, names the surface's chain and s, while
only a piece within h with selfW >= 0.5, or a fill, makes the surface
cover. So where two arms of one group meet, an arm that does not cover
the point (h <= d < h + aa, or a folded far piece) can name it. def
851,376: c62 at d 0.2411 covers (key -0.0668); c84 at d 0.2647 > h 0.26
names it (key -0.0614). user_tw42.lightpaper 1106,1411 (the largest
gap, 0.089): c30 at d 0.1935 covers (z -0.0926, key -0.1375); c11 at d
0.2103 > h 0.2100 names it (z 0, key -0.0488). |dkey| over the 137
sites: 5.9e-5 to 8.9e-2, so the sliver is thin but the key gap need not
be.
The capsules discard d >= h, so the GPU names a group by its highest
covering piece or fill. The two differ in slivers at most aa wide (half
a device pixel) along same-group seams; both sites traced
(`out/diag_*.txt`) are such shells, and all 137 carry fade 0. Possible
under form B's rule though not seen: a non-covering piece lifting its
group above another group's covering piece, which changes the top, not
only the name. One depth-tested pass cannot take a group's key from the
pieces within h + aa and its cover from those within h. Ways out: (a)
form B names a surface by its covering pieces only (the name then
switches at d = h, the arm's half-ink line, not at h + aa where its ink
starts); that would be a definition change with its own Finding; (b) a
second pass: shells (h <= d < h + aa) and folded pieces of the first
pass's top group, depth-tested against it and reading its label (exact
for the same-group case, every site seen; not for the other); (c) a
per-fragment cover test for a shell's group. form_b.ts was not edited.
Next 1.

**Timing, desktop** (timer query over 61 draws, 60 frames and the
warm-up, 2480x1800 at dpr 2; GPU p50 with the scan / without it, p95
within 0.25 ms of p50; render sync runs 0.8-1.3 ms above): muse_hash
10.38 / 3.67 ms, muse_default_tw 4.15 / 2.58, def 4.55 / 2.90, fat
2.37 / 1.35, ring 1.98 / 1.23, user_tw42.lightpaper 2.41 / 1.56,
g41_def_tw42 3.28 / 2.33, g41_def_tw64 6.60 / 3.53, g41_ring_tw42
1.24 / 0.90, g41_ring_tw64 2.38 / 1.33, g41_user_tw42 2.41 / 1.56,
g41_user_tw64 5.20 / 2.33. The scan costs 0.3-6.7 ms (2.8x on
muse_hash). Upload of all five tables 0.0-0.1 ms (213-901 kB); prep
8.5-95 ms of CPU (S5; `nbWindows` walks about 2M segment pairs on
muse_hash). The gate's 2 ms is the Pixel's at its own viewport (about
1.24 Mpx against these 4.46 Mpx), so these do not convert, but the
scan's share is the first cost to cut.

**Not run (time):** the Pixel's render-sync timing, the label's pops
over the recordings, the point-table upload comparison (SAMP against
the label tables).

**K1039:** the page's favicon is a data: URL (no request), and the
runner drops any favicon request from its error count: 0 errors and 0
favicon requests on all 12 scenes in every run.

## Handoff

What landed (branch `worktree-agent-a4d6c4eb46ea384c4`, not pushed):
af7f79f1 the brief; 4649c8ca the pass (`label_b.ts`, `label_b_glsl.ts`,
`label_b_pass.ts`, `label_b_verdict.ts`) and its pins
(`test/render/field/label_b.test.ts`); 05727f6c the verdict runner
(`.claude/probes/K1040/s3/`: `page.ts`, `s3.mjs`, `run_locked.ps1`,
`count.ts`); 7f32e8e0 the merge scan (CAPSULE_FS and `labelAt`), the
hairpinX pin, `diag.ts`, `fixdbg.ts`; the last commit: the verdict's tie
margin, `defects.mjs`, the runner's `--noscan`, the summaries and the
three traced sites (`out/diag_*.txt`), these Findings. No app hook: the
pass runs only on the probe page, so
master's default draw is unchanged. Outside `src/render/field/` and
`test/`: `.claude/probes/K1040/s3/` (force-added) and this brief.

Measurements, from the worktree:
- Pins: `npx.cmd vitest run test/render/field/label_b.test.ts` (19
  tests; `$env:LABELB_LOG='<file>'` appends the fixtures' verdict
  counts).
- Census: `& .claude\probes\K1040\s3\run_locked.ps1 -RunArgs
  @('verdict')` (perf lock; 12 scenes, 80-105 s; `out/verdict_*.json`,
  `out/verdict_summary.md`), then `node
  .claude/probes/K1040/s3/defects.mjs [scenes]` (DEFECT sites by class;
  `$env:ALL='1'` lists each with its key gap) and `node
  scripts/run_node.mjs .claude/probes/K1040/s3/diag.ts <scene> <i> <j>`
  (one site: candidates, pieces, evalPoint, labelAt).
- Timing: `& .claude\probes\K1040\s3\run_locked.ps1 -RunArgs @('time')`,
  and `@('time', '--noscan', '1')` with every scan window emptied
  (`out/time_summary.md`).

Next:
1. Class B: settle who names a group (the Finding's options). With (a)
   form B changes (its owner's stage), and this pass should clear the
   137 unchanged if each is a shell naming its group (two traced, all
   137 share the pattern); with (b) a shell pass lands here. Then re-run
   the census for K1033's gate.
2. Cut the scan's cost (overdraw: every capsule overlapping a pixel runs
   its window; clip each capsule to its segment's slab, tighten the
   windows), then time the Pixel by render sync at dpr 2 (K923's
   harness, both locks).
3. Step 5: the label's pops over the four recordings (label_pops' rule
   against the fade bits) and the point-table upload comparison; S5:
   `nbWindows`' prep.
