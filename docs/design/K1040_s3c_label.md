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

Start 07:05:03; the coordinator moved the cap to about 09:10. The brief
landed at 07:14:11 (`37e82c50`). Times below are local (PST), from
`Get-Date`, the reflog (the hook re-dates the commits themselves) and the
summaries' headers (UTC there).

### F1. The tent pass as built (07:14-07:50, `fb483083`; facets `c5144d59` 08:04)

`label_b_tent_glsl.ts`, drawn by `label_b_pass.ts`'s `tent` mode with
S3b's targets, tables and uniforms (S3b's draw unchanged):
- **Depth from the vertex.** Each vertex writes z_clip = -2 key uKeyScale
  with key = z - d/K (Q1), and the depth test (LESS) keeps the highest
  key. The fragment shader neither discards nor writes gl_FragDepth, and
  every vertex shader writes gl_Position (pinned in
  `test/render/field/label_b_tent.test.ts`). It finds s exactly from the
  fragment's own point (segT, as S3b's; a closed chain's s wraps) and the
  surface code from the span at s, and packs the word as label_b.ts does.
- **Segments:** per (chain, k), one strip: the joint's wedge at a (a fan
  on the convex side, at most `TENT_NW` facets), then the two side quads,
  whose key is affine in the distance to the line, so exact. **Caps:** a
  half cone per free end (`TENT_NC` 96). **Fills:** the annular sector
  (r, Rp] per corner fill, a constant key per half (`TENT_NF` 24 a half).
- **Facets:** n = ceil(ang sqrt(r) uFacetK), clamped to [1, nmax], with
  uFacetK = 0.25 / sqrt(eps) and eps = `tentEpsPx` (0.002 px) / ppd
  (4.5e-5 world at dpr 2, uFacetK about 37). Inner vertices sit at the
  balanced radius 2r / (1 + cos(d/2)), so a chord errs by at most
  r tan^2(d/4) either way; the ends that meet another primitive's corner
  dip about 1.5 eps (pinned in (1.2, 1.6) eps). The count is written as a
  product, not a rounded quotient (K299), the same in the shader and its
  mirror (`label_b_tent.ts`, pinned).
- **The capsule rule's Voronoi test is geometry here:** a side quad
  covers exactly the points whose foot is inside its segment, a wedge the
  convex side of its vertex, and nothing covers a concave side's vertex
  region but the two neighbours' slabs. Two pieces of one chain at a
  pixel resolve by key (by distance at equal z), as K1033 asks.
- **What the tents cannot say without a discard** (the census prices
  each below): the merge scan (S3 D1), the fill's foot windows, and the
  exact curved outline (chords within eps).

### F2. The census, both variants: 794 and 371 DEFECT (07:50:21-07:52:46)

Run under the perf lock (`run_locked.ps1`), oracle30's classes at dpr 2,
0 renderer errors, 0 lost contexts. The control is S3b's pass, 0 DEFECT
and 0 fade on the 12 scenes (S3b F2, carried; its timing was re-run, F3).
Each DEFECT is bucketed by the smallest margin (0.003 ... 1 px) within
which the reference gives the GPU's answer ("none": no margin does) and
by kind (`label_b_verdict.ts`). The table is `defects_table.cjs`'s
(`out/defects_s3c.md`):

| scene | tent DEFECT | <=0.01 px | 0.03-1 px | none | fade | tentlr2 DEFECT |
|---|---|---|---|---|---|---|
| muse_hash | 212 | 63 | 119 | 30 | 78 | 78 |
| muse_default_tw | 44 | 16 | 28 | 0 | 135 | 32 |
| def | 50 | 28 | 22 | 0 | 97 | 29 |
| fat | 23 | 23 | 0 | 0 | 0 | 22 |
| ring | 35 | 16 | 19 | 0 | 48 | 15 |
| user_tw42.lightpaper | 64 | 22 | 36 | 6 | 123 | 29 |
| g41_def_tw42 | 32 | 23 | 9 | 0 | 47 | 26 |
| g41_def_tw64 | 58 | 22 | 35 | 1 | 32 | 35 |
| g41_ring_tw42 | 11 | 7 | 4 | 0 | 10 | 9 |
| g41_ring_tw64 | 40 | 13 | 25 | 2 | 23 | 12 |
| g41_user_tw42 | 55 | 14 | 35 | 6 | 123 | 24 |
| g41_user_tw64 | 170 | 43 | 117 | 10 | 85 | 60 |
| **total** | **794** | 290 | 449 | 55 | 801 | **371** |

By kind (tent): higher-own* 460, gpu-hole/extra 205, other 128,
lower-gfill 1. tentlr2: <=0.01 px 235, 0.03-1 px 121, none 15, fade 211.
The gate's 0 DEFECT is not met by either variant.

### F3. Attribution: the merge scan is every DEFECT at 0.3 px and beyond (08:14-08:20)

`attribute_sites.ts` replays form B's candidates and the merge scan at
each DEFECT the census sampled (at most 80 a scene: 540 of tent's 794,
367 of tentlr2's 371) and names the GPU's piece: **merge** (a candidate
the reference drops: a nearer candidate of its chain lies within sigma in
s), **kept** (a candidate the reference keeps too: the order differs),
**hole** (the GPU drew nothing). Output `out/attribute_s3c.md`.
- **Observed, tent:** merge 333, kept 93, hole 114. By bucket: 0.003 px
  hole 76, kept 73, merge 8; 0.01 hole 28, kept 7, merge 9; 0.03 hole 5,
  kept 6, merge 25; 0.1 hole 4, kept 7, merge 59; 0.3 hole 1, merge 98;
  1 px merge 83; none merge 51. Every sampled DEFECT at 0.3 px or more is
  the merge scan but one hole.
- **Observed, tentlr2:** merge 120, kept 176, hole 71; the 0.3 px, 1 px
  and none buckets are merge 87 and kept 1.
- higher-own (127 of them, 108 with the reference's top at an open
  chain's end), higher-own-samechain (170) and most "higher" (34) are
  merge. The tents also add 801 fades (from 0): GPU answers inside the
  reference's own fades (flags merge, tie, cap), not attributed further.

### F4. Definition change: the merge scan becomes the max key

The tents keep every candidate and the depth test takes the max key; the
reference drops a candidate within sigma of a nearer one of its chain
and takes the max key of the rest. The scan reads the other candidates
of the chain at the fragment, so a vertex depth cannot say it: **a rule
the GPU cannot express without a discard, a Finding for the coordinator,
not a silent change.** Its price: 333 of tent's 540 sampled DEFECTs and
all but one at 0.3 px or more (tentlr2: 120 of 367), and the fades
flagged merge (not counted apart).
The options the brief names: keep the scan in a small discard draw after
the opaque tents (only where a chain's two feet lie within sigma), change
the census (max key over all candidates, the fades then defined), or a
new budget. Not decided here.

### F5. Definition change: the fill's foot windows become the max key

S3b's fill excludes the points within h - 2aa of either arm (inFill);
the tent fill draws its whole sector at its constant key, and the depth
test settles it against the arms. Price: 1 DEFECT (ring, lower-gfill).

### F6. A candidate class: SNAP, the outline within 0.01 px (not counted)

The tents' outline is the reference's within the chord error (eps 0.002
px, about 1.5 eps at the end chords) and their facet keys are linear, so
a near-tie can flip within a few eps of an outline. The DEFECTs within
0.01 px are 290 of tent's 794 (235 of tentlr2's 371); the sampled ones
are hole 104, kept 80, merge 17. Argued: a pixel centre within 0.01 px
of the outline (a hundredth of a pixel) cannot be told apart on
screen. Not argued: the merge sites inside it (F4's rule, not the
snap). It counts as DEFECT until the coordinator accepts it.

### F7. The sharp joints, 0.03 px and beyond (08:16-08:20)

`nonmerge_sites.ts` details the 23 sampled tent DEFECTs at 0.03 px or
more that are not merge. **Observed:** each has the reference's foot on a
VERTEX of an open chain at a sharp turn (0.29-1.41 rad): mostly vertex 1
at s = 0 of an extended start (s0 from -0.08 to -0.24: the joint between
the extension and the first real segment), or vertex n-2 before an
extended end (turns 0.49-0.82), and two interior vertices. The "lower"
ones are near-ties between two chains at nearly equal d; the holes lie
near the rim (d close to h). **Inferred:** the wedge's facet count is
clamped at `TENT_NW` 3 where it needs 6-27 (n = 18.9 ang at r = h), so
its linear key falls below the cone between facets (flipping the
near-ties) and its rim chords cut inside the arc (the holes). Tested in
F8.

### F8. The NW test: TENT_NW 32 fixes the joints at 2.8-4.9x the time (08:22-08:25)

`TENT_NW` 32 in place of 3 and nothing else; the census and the timing
re-run under the perf lock (tags `tentnw32`, `tentlr2nw32`; tables
`out/defects_s3c_nw32.md`, `out/attribute_s3c_nw32.md`), then back to 3.
- **Census, observed:** tent 794 to 664 DEFECT (<=0.01 px 208, 0.03-1 px
  401, none 55; gpu-hole/extra 205 to 142, lower-gfill 1 to 0), tentlr2
  371 to 336. Sampled, 496 of tent's 664 and all 336 of tentlr2's:
  **every DEFECT at 0.03 px or more is merge** (tent 334, tentlr2 113).
  What is not merge (tent hole 72, kept 73; tentlr2 hole 61, kept 154)
  lies within 0.01 px, F6's class.
- F7's inference holds: the wedge clamp made the sharp joints' DEFECTs.
  F5's one DEFECT went with it (inferred: the same clamp, not the foot
  windows).
- **Time, observed (desktop gpu p50):** 2.8-4.9x NW 3's (muse_hash 0.886
  to 4.170 ms, def 0.962 to 4.413, ring 0.351 to 0.993), above S3b's pass
  on 10 of the 12 scenes (not ring, g41_ring_tw64). Every segment strip
  pays NW: 2 NW + 6 vertices, 12 at NW 3 and 70 at 32, degenerate where
  a joint needs fewer.
- **Kept at 3, by the timing.** The fix to try: the sharp joints in a
  draw of their own (an instanced wedge of the needed n facets, only
  where n > NW, the strip's own wedge collapsed there). Not tried; NW 5-8
  not measured.

### F9. The coarse target certifies its texel centres only

At lr 2 the pass draws into ceil(W / 2) x ceil(H / 2) with the camera
over 2, and the census reads each coarse texel at its own centre (device
px (2i + 1, 2j + 1)) against form B at dpr 2 (`page.ts`, `coarse()`): a
quarter of the samples, none of them at a device pixel's centre.
`tentEpsPx /= lr` keeps the world eps, so the facets and the vertex work
are lr 1's. What the screen shows between the centres (K923's upsample
of the label) is a class no Finding argues, so by the census rules it is
DEFECT until one does; tentlr2's 371 says nothing about it. Observed,
not attributed: per sample, tentlr2's DEFECT rate is 1.9x tent's (371 in
a quarter of the samples against 794), most of it within 0.01 px (235)
and in "kept" near-ties (176 of 367 sampled, against tent's 93 of 540).

### F10. Desktop timing: tent 1.9-4.4x faster than S3b's pass (08:03)

The timer query (`time`, 60 frames, dpr 2), p50/p95 ms; one locked
batch, errors 0, lost contexts 0. The control is S3b's pass re-run in
the batch, within about 0.01 ms of S3b's table.

| scene | S3b's pass | tent | tentlr2 |
|---|---|---|---|
| muse_hash | 3.868/3.941 | 0.886/0.891 | 0.762/0.770 |
| muse_default_tw | 2.131/2.164 | 0.929/0.933 | 0.809/0.818 |
| def | 2.208/2.237 | 0.962/0.968 | 0.841/0.849 |
| fat | 1.190/1.200 | 0.629/0.634 | 0.509/0.518 |
| ring | 1.013/1.028 | 0.351/0.356 | 0.228/0.237 |
| user_tw42.lightpaper | 1.267/1.288 | 0.537/0.546 | 0.417/0.425 |
| g41_def_tw42 | 1.825/1.852 | 0.976/0.981 | 0.856/0.864 |
| g41_def_tw64 | 2.758/2.787 | 0.942/0.946 | 0.821/0.839 |
| g41_ring_tw42 | 0.762/0.778 | 0.353/0.358 | 0.232/0.240 |
| g41_ring_tw64 | 1.127/1.147 | 0.351/0.356 | 0.227/0.237 |
| g41_user_tw42 | 1.268/1.286 | 0.537/0.542 | 0.416/0.423 |
| g41_user_tw64 | 1.998/2.026 | 0.529/0.534 | 0.406/0.416 |

- **Observed:** lr 2 saves 0.120-0.124 ms on every scene, at NW 3 and at
  NW 32 alike, whatever the scene's size, though it shades a quarter of
  the fragments; NW 32 (70 vertices a strip against 12) costs 2.8-4.9x.
- **Inferred, not verified on the phone:** on this GPU the tents are
  bound by their vertices and primitives (23,349 segment strips on
  muse_hash), not by shading. The Pixel's tiler bins every primitive
  too, so there lr 2 may buy little and the vertex count matters most.

### F11. The phone: not timed (08:04-08:30)

The coordinator replaced the Rules' "No phone" line at about 08:00: the
Pixel on its charger from about 08:05, S3b's procedure (`run_phone.ps1`),
`&snd=none`, no key or input event, never `scripts/phone.ps1`, the perf
lock, and a wait until 08:30 at the latest.
- **08:04:36, the control's first run:** the kit's read-only check passed
  (awake and unlocked), but an app was in front. The probe opened its
  Chrome tab over it at 08:04:38; at 08:04:39 an input event (a person's
  touch) stopped the run (phone_time.mjs watches getevent). The probe
  closed its tab and released both locks; nothing else was sent and
  nothing was timed.
- **The guard (`680651fe`):** `phone_quiet.mjs` waits, read-only
  (dumpsys and getevent), until the phone is awake, unlocked, at the
  launcher and untouched for `--quiet` seconds; `phone_time.mjs` refuses
  to start away from the launcher, puts the launcher back with a HOME
  intent after an untouched run, and names what is in front by kind only
  (`out/phone_time_summary.md`'s package names are kinds now too).
- **08:06:55-08:30:04:** the wait (`--quiet 120 --until 08:30`) saw the
  phone asleep and locked from its first poll to the deadline, so no
  phone run: **the Pixel's 2 ms gate is unmeasured** for both variants.
  The commands are in the Handoff.

### F12. The pins as they stand

`test/render/field/label_b_tent.test.ts`, 7 tests: for both debugOut
builds, no discard and no gl_FragDepth in any tent shader, and every
vertex shader writes its depth through gl_Position; the facet count
(uFacetK = 0.25 / sqrt(eps); the smallest n whose chords meet eps,
clamped to [1, nmax], for NW, NF and NC) and an unclamped arc's chord
errors (eps outside, 2 eps inside at the ends, eps between). Not built:
step 5's float64 mirror of the tent geometry against labelAt away from
the outlines (the time went to F3-F8). `npm test` passed at 08:28 (198
files, 2663 tests) on the tree this handoff commits.

## Handoff

Stopped at 08:38, short of the gate, before the cap (about 09:10).
Branch `worktree-agent-aaf87e9d3775b20e4`, never pushed; master
untouched.

**Landed, commit by commit:**
- `37e82c50` (07:14) this brief.
- `fb483083` (07:50) the tent pass: `label_b_tent_glsl.ts`,
  `label_b_pass.ts`'s tent mode (S3b's draw unchanged), `--tent` and
  `--lr` in `page.ts`, `s3.mjs` and `phone_time.mjs`, run_locked.ps1's
  owner.
- `c5144d59` (08:04) the facet count as a product (K299), its mirror
  `label_b_tent.ts`, the pins (F12), the phone kit's owners.
- `680651fe` (08:14) the census and timing summaries,
  `defects_table.cjs`, `phone_quiet.mjs`, phone_time.mjs's launcher
  guard.
- This commit: F3-F12 and this handoff; `attribute_sites.ts`,
  `nonmerge_sites.ts`, `site_probe.ts`, and the sizing probes
  `tent_stats.ts` and `span_stats.ts` (07:17, 07:27); the NW test's
  summaries and tables; kinds for package names in
  `out/phone_time_summary.md`.

**Before and after** (dpr 2, the 12 scenes; oracle30's classes; the
desktop column is the timer query's p50):

| | S3b's pass (control) | tent | tentlr2 | tent at NW 32 (reverted) |
|---|---|---|---|---|
| DEFECT | 0 (S3b F2) | 794 | 371 (coarse centres, F9) | 664 (lr 2: 336) |
| of them at 0.03 px or more | 0 | 504 | 136 | 456 (113), every sampled one merge |
| fade | 0 | 801 | 211 | 786 (207) |
| desktop gpu p50, ms | 0.762-3.868 | 0.351-0.976 | 0.227-0.856 | 0.991-4.449 |
| Pixel, K923's method | 10.6-39.6 ms above the floor (S3b F4) | not measured | not measured | - |

**Commands**, from the worktree root, with
`$s3 = '.claude\probes\K1040\s3'`. Desktop, each run under the perf
lock (owner K1040-S3c); `@('verdict')` alone is the control's census:

    & "$s3\run_locked.ps1" -RunArgs @('verdict', '--tent', '1', '--tag', 'tent')
    & "$s3\run_locked.ps1" -RunArgs @('verdict', '--tent', '1', '--lr', '2', '--tag', 'tentlr2')
    & "$s3\run_locked.ps1" -RunArgs @('time', '--tag', 'ctl')
    & "$s3\run_locked.ps1" -RunArgs @('time', '--tent', '1', '--tag', 'tent')
    & "$s3\run_locked.ps1" -RunArgs @('time', '--tent', '1', '--lr', '2', '--tag', 'tentlr2')
    node "$s3\defects_table.cjs" "$s3\out" tent tentlr2 > "$s3\out\defects_s3c.md"
    node scripts/run_node.mjs .claude/probes/K1040/s3/attribute_sites.ts .claude/probes/K1040/s3/out tent tentlr2
    node scripts/run_node.mjs .claude/probes/K1040/s3/nonmerge_sites.ts .claude/probes/K1040/s3/out tent

The NW test: `TENT_NW = 32` in `label_b_tent_glsl.ts`, the same lines
with the tags `tentnw32` and `tentlr2nw32`, then back to 3.

Phone: the Pixel left at the launcher (on its charger). `run_phone.ps1`
checks it read-only, takes the phone lock and the perf lock, serves the
page itself over adb reverse, and releases both; its links carry
`&snd=none` and it sends no key or input event. Wait before each run;
stop at the first non-zero exit:

    node "$s3\phone_quiet.mjs" --quiet 120 --until <HH:MM>
    & "$s3\run_phone.ps1" -RunArgs @('--fit', '411x753', '--label', 'fit', '--b2b')
    node "$s3\phone_quiet.mjs" --quiet 20 --until <HH:MM>
    & "$s3\run_phone.ps1" -RunArgs @('--fit', '411x753', '--label', 'tent', '--b2b', '--tent')
    node "$s3\phone_quiet.mjs" --quiet 20 --until <HH:MM>
    & "$s3\run_phone.ps1" -RunArgs @('--fit', '411x753', '--label', 'tentlr2', '--b2b', '--tent', '--lr', '2')
    node "$s3\phone_quiet.mjs" --quiet 20 --until <HH:MM>
    & "$s3\run_phone.ps1" -RunArgs @('--fit', '411x753', '--label', 'floorall', '--b2b', '--floor')
    & "$s3\phone_table.ps1" tent fit tentlr2 floorall -Floor floorall
    & "$s3\phone_table.ps1" tentlr2 fit tent floorall -Floor floorall

`fit` is S3b's pass at K923's fit, the control; `floorall` is the
readback floor. The table's last column is its first label's p50 minus
the floor (K923's label cost), the number the 2 ms gate reads.

**Next:**
1. The coordinator's call on F4, the merge scan: a small discard draw
   after the tents where a chain's two feet lie within sigma, a census
   defined by the max key over all candidates, or a new budget. With the
   joints fixed (F8), every DEFECT at 0.03 px or more is the scan.
2. F6's SNAP class (within 0.01 px): accept it, or tighten eps (more
   facets, so F8's cost).
3. The sharp joints in a draw of their own (F8), then the census and
   the timing again.
4. lr 2 (F9): argue the upsample's class or drop lr; attribute its
   per-sample DEFECT rate.
5. Step 5's float64 mirror pin (F12).
6. The Pixel, by the commands above: the gate is unmeasured for both
   variants. Inferred from F10: the tents are vertex-bound, so on the
   phone lr 2 may help little and a joint draw's vertices count.
