# K1040 S3c: the label pass without discards (the Pixel's GPU)

Ledger K1040, stage S3c, item K1097. One stage: Opus, 2 h cap. Branch
`worktree-agent-aaf87e9d3775b20e4`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-aaf87e9d3775b20e4`
(cut at master 236a18a6, which holds S3b's merge c4863a50; node_modules
joined to the main checkout's). Work only there. Brief written 2026-11-03
by the stage agent, at the coordinating session's (7301c55b) request, from
S3b's brief (`docs/design/K1040_s3b_label.md`: Calls that bind, Rules, F3,
F4, `## Handoff` Next 1) and K1097's `next:` line in `LEDGER.md`.

## Why

S3b's F4 timed the label pass on the Pixel (PowerVR C-Series, ANGLE on
Vulkan, no timer query) by K923's method: 10.6-39.6 ms above the readback
floor against the 2 ms gate. The cost follows the discards, not the depth
writes: with both `gl_FragDepth` writes and all nine `discard`s removed (a
timing-only variant whose labels are wrong) the pass took 6.0-9.2 ms, and
even that is 4.0-7.2 ms above the floor. Inferred there, not tested: with a
`discard` in the shader the tile-based GPU's hidden-surface removal cannot
drop a fragment that may still discard, so the pass pays its overdraw
times the foot test and the merge scan. K923's prototype label (1.83 ms)
set depth from the vertex shader and had no discard.

K1097's next: "S3c: the label pass without discards for the Pixel's GPU
(one shaded fragment per pixel, depth from the vertex shader as K923's
label set it), gated on the Pixel's 2 ms; if it misses, the coarser target
(K923's lr), a new budget (Levi's) only after both." The phone is not
available today, so S3c builds both variants for one later phone session
and leaves the exact command lines.

## Scope, in order

1. **The tent pass** (full resolution): the label drawn as geometry whose
   depth is the cone key at its vertices, so the depth test alone decides
   and the fragment shader neither discards nor writes `gl_FragDepth`.
   Per segment: two side quads (the slab, key z on the line and z - h/K at
   distance h: the key is affine there, so the vertex depth is exact); a
   fan at a joint's convex side (the wedge, a cone faceted) or a free
   end's cap (a half cone); per corner fill the annular sector, split at
   the tangent points' bisector (a constant key per half). Fewer or
   smaller primitives where one shaded fragment a pixel needs them.
   What the old fragment rule did by `discard` and the geometry cannot
   say (the merge scan, the Voronoi test's curved parts, the fill's foot
   windows, the exact outline at d = h) is listed rule by rule, each a
   Finding for the coordinator, and priced by the census.
2. **The coarser target (lr):** the same pass into a 1/lr target (K923's
   `lr`, `scripts/k923/bench.js`: the label read at floor(fc / lr)), the
   form B reference still at dpr 2.
3. **For each:** the census (oracle30's classes at dpr 2; for lr at the
   coarse target's own texel centres, argued in a Finding), the pins under
   `test/render/field/`, and the desktop GPU time by timer query, p50 and
   p95 per scene, against S3b's table (F3, `out/time_summary_s3b_final.md`).
4. **The phone commands:** the exact `run_phone.ps1` lines that time both
   variants and S3b's pass (the control) at dpr 2 by K923's method
   (`--fit 411x753 --b2b`, plus the floor), for one later phone session.

## Calls that bind

- **K1097's next (the stage):** the pass without discards, one shaded
  fragment per pixel, depth from the vertex shader as K923's label set it;
  gated on the Pixel's 2 ms; if it misses, the coarser target (K923's lr);
  a new budget (Levi's) only after both.
- **F7's S3 gate, carried (S3b):** "oracle30-style verdicts at every pixel
  centre on the 12 scenes: 0 DEFECT. ... on the Pixel, by render sync at
  dpr 2, the label costs at most 2 ms (K923: 1.83 ms). On the desktop, by
  timer query."
- **The capsule rule (S3's brief, carried):** a segment's fragment writes
  only where its closest point is a local minimum of the chain's distance
  (the Voronoi test against its neighbours), and two segments of one chain
  at equal z resolve by distance, as the cone key does (K1033). The merge
  scan (S3 D1) stays in S3b's pass. **This stage:** a rule that cannot be
  expressed without a discard is a Finding for the coordinator, not a
  silent change; S3b's pass is not edited.
- **The verdict (S3's brief, carried):** oracle30's classes at every pixel
  centre, dpr 2: agree; boundary (EDGE, MERGE, DEPTH, DEPTH=, CUT); fade
  (undefined: the reference has no single answer); DEFECT otherwise. A
  further class (the coarser target's included) is named and argued in a
  Finding before it counts as anything but DEFECT.
- **K1040's calls (S3's brief), where they reach the label:** continuous
  by construction, no fade on a discrete outcome; watertight at every fade
  value; each definition change gets its own Finding headed
  `Definition change:`; a rule the GPU cannot express is a Finding for the
  coordinator.
- **F7's shape of the pass (S3's brief), carried where the tents allow:**
  static instances (one per segment), rebuilt only when a chain's segment
  count changes (K985); the packed word keeps label_glsl.ts's layout; the
  tables are S3b's (PTS, CHAIN, SPAN, FILL, NB).
- **Decide technical variants by the checks** (the census, the pins, the
  timer query).
- **Not this stage:** S3b's step 5 (the pops over the recordings, the
  point table), the band (S4), the CPU prep (S5), paint (S7), anything
  master's default build draws (no app hook). The ink of form B does not
  change.
- **The phone:** Levi has it today. No adb, no phone kit, nothing sent to
  it; the Handoff carries the commands.
- Levi does not look at this stage; a look question goes in the report.

## Order

Take `Get-Date` at the start and at each milestone; write the times into
Findings. Start 07:05:03, cap 09:05:03.

1. **Read and this brief (07:05-07:30).** Commit.
2. **The tent pass (07:30-08:05):** `label_b_tent_glsl.ts` (the shaders),
   a `tent` mode in `label_b_pass.ts` (same targets, tables and uniforms;
   another program and vertex count), the page's `tent` and `lr` options,
   `run_locked.ps1`'s owner K1040-S3c. `npm test`. Commit.
3. **The census, both variants (08:05-08:25):** under the perf lock;
   each DEFECT bucketed by its distance to the nearest outline and by
   kind, so each dropped rule has a count. Commit.
4. **The desktop timing, both variants and the control (08:25-08:35).**
   Commit.
5. **The pins (08:35-08:50):** the tent geometry's float64 mirror against
   labelAt away from the outlines. Commit.
6. **Handoff (08:50-09:05):** the table, the phone commands, Next.

Steps 2-4 matter most; the cap stops wherever the Order stands.

## Later work (not this stage)

- The Pixel's numbers for both variants and the control (Handoff
  commands), and the gate's verdict from them.
- Whatever rule the tents drop that the census prices above 0 DEFECT: the
  coordinator's decision (keep it in a small discard draw after the opaque
  tents, change the census, or a new budget).
- S3b's step 5 (the pops over def_drag, def_flow, muse_drag, muse_flow;
  SAMP's upload against label_tables'), S4's band, S5's prep, S4b's flag.

## Where things are

- **S3b's pass (the control):** `src/render/field/label_b.ts` (tables,
  `labelAt`, `nbWindows`), `label_b_glsl.ts` (CAPSULE_VS with the slab
  clip, CAPSULE_FS with the carried merge scan, the fill shaders),
  `label_b_pass.ts` (GL, timer queries), `label_b_verdict.ts` (the
  classes); pins in `test/render/field/label_b.test.ts`.
- **The reference:** `src/render/field/form_b.ts` (`evalPoint`, the cone
  key Q1: K = h/zt, zt = 0.1 depthAmp; the fold D1).
- **The runner:** `.claude/probes/K1040/s3/` (`run_locked.ps1`, `s3.mjs`,
  `page.ts`, `defects.mjs`, `diag.ts`, `time_table.ps1`); the phone kit
  `phone_time.mjs`, `run_phone.ps1`, `phone_table.ps1` (S3b F4). Outputs
  in `s3/out/` (untracked; the summaries the Findings cite are
  force-added).
- **The scenes** (read-only): the main checkout's
  `.claude/probes/K868/scenes/`, the 12 of S3's census.
- **K923's bench:** `scripts/k923/bench.js` (LABEL_VS line 288: depth
  from the vertex's z, no discard; `lr` line 31), its brief
  `docs/design/K923_s3_bench.md`.

## Rules

- **Files this stage changes:** new `src/render/field/label_b_tent*.ts`,
  `src/render/field/label_b_pass.ts` (the tent mode only; S3b's draw
  unchanged), tests under `test/render/field/`,
  `.claude/probes/K1040/s3/`, this brief. Not `form_b.ts`, not
  `LEDGER.md`, `CLAUDE.md` or `.claude/rules/`, not `src/main.ts`;
  master's default build draws what it draws now (no app hook).
- **Tests:** `npm test` (tsc included) passes at every commit called
  done.
- **The main checkout:** Muse works on master there during this stage.
  Only its untracked `.claude\probes\K1040\` is written (the copy of
  `s3/out/` at the end). No git command there, no tracked file, never
  master.
- **Dev server** (if needed): from this worktree, `npx vite --config
  .claude/probes/K1040/vite.private-cache.config.ts --port 5403
  --strictPort --host 127.0.0.1`. Never 5173, 5480-5489 or 5500-5599.
  Stopped when done.
- **Locks:** timing and pixel-exact GPU runs (the census included) under
  `$env:TEMP\claude-perf.lock` via `run_locked.ps1`, owner K1040-S3c (Muse's
  probes take it too). Wait inside one command, never by checking again on
  later turns. Probe links carry `&snd=none`. No phone: no adb, no phone
  kit run, nothing sent to it. No serials, IPs or Tailscale names in
  tracked files or the report.
- **Reading** through the shell; the Read tool only right before an Edit;
  PowerShell.
- **Commits:** WIP to this branch at every milestone, broken or not.
  Never push, never skip hooks, never touch master. No subagents, at most
  4 worker processes.
- **Stop rule:** at the stage's end or 09:05:03, whichever comes first. A
  compaction is not a stop: re-read this brief and `git log --oneline
  -5`, then go on. On stopping: commit WIP, append `## Handoff` (what
  landed, commit by commit; a before and after table; the commands;
  Next), commit, copy `s3/out/` to the main checkout's same path, report.

## Findings
