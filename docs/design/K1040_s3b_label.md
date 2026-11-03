# K1040 S3b: the label pass's gate (who names a group, the scan's cost)

Ledger K1040, stage S3b, item K1097. One stage: Opus, 2 h cap. Branch
`worktree-agent-a99cc3250b93f7bc0`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a99cc3250b93f7bc0`
(cut at ce6bada2, fast-forwarded to master 6da27898 so that it holds S3
(bf2ba829) and S1g (52945e6e); node_modules joined to the main
checkout's). Work only there. Brief written 2026-11-02 by the stage agent,
at the coordinating session's (7301c55b) request, from S3's brief
(`docs/design/K1040_s3_label.md`: Calls that bind, Rules, Where things
are, Findings, `## Handoff`), the class-B decision in F7 of
`docs/design/K1040_junction_field.md` (S3's result entry) and S1g's
Findings and Handoff (`docs/design/K1040_s1g_gates.md`).

## Why

S3 built the depth-tested label pass (`src/render/field/label_b*.ts`) and
stopped short of its gate: all 137 DEFECTs, on 6 of the 12 scenes, are
class B. form_b.ts `evalLayers` lets every piece within h + aa raise its
surface's key and name its chain and s, while only a piece within h with
fold weight >= 1/2, or a fill, makes the surface cover; the capsules
discard d >= h, so the GPU names a group by its highest covering piece or
fill. One depth-tested pass cannot take a group's key from the pieces
within h + aa and its cover from those within h. The coordinator decided
option (a) by the checks. S3b lands it, re-runs the census for the gate,
cuts the merge scan's cost and times the pass.

S1g changed form_b.ts after S3 measured (F1 the d-edge, `dEdge: "near"`;
F2 the root gate, `rootBand: 0.5`), so S3's numbers predate it. Step 0
re-measures on S1g's form B before (a), so that what (a) moves is
attributed to (a) alone.

## Scope, in order

0. **The baseline:** S3's census and desktop timing on the starting point
   (S1g's form B, before (a)).
1. **The Definition change (a)** in `src/render/field/form_b.ts`: a
   surface is named by its covering pieces only. Written as a
   `Definition change:` Finding. `labelAt` (S3's float64 mirror) and the
   pass's fragment rule follow it, pinned in `test/render/field/` (a
   fixture where a non-covering piece within h + aa used to name the
   group). Every other form B pin keeps its expected value; one that must
   change is a Finding with its reason.
2. **The census again** (`run_locked.ps1 -RunArgs @('verdict')`, then
   `defects.mjs`). The gate is 0 DEFECT on the 12 scenes; 0 closes K1033
   (muse_hash), which the coordinator closes. Any DEFECT left is traced
   with `diag.ts` and classified.
3. **The scan's cost:** clip each capsule to its segment's slab and
   tighten the scan windows. The desktop by timer query under the perf
   lock (`run_locked.ps1 -RunArgs @('time')`, p50 and p95 per scene)
   before and after; the census again after.
4. **The Pixel's time** by render sync at dpr 2 through the phone kit
   (K923's harness, `scripts/k923/`), under both locks, only if the phone
   answers within 5 min; otherwise said in the Handoff.
5. **The label's pops** (S3's step 5) over the four recordings
   (def_drag, def_flow, muse_drag, muse_flow): label_pops' rule on the
   surface, each unexplained pixel tested against the reference's fade
   bits. Then the point-table question: SAMP's upload against
   label_tables', measured.

## Calls that bind

- **The decision (F7, S3's result entry):** "Decided by the checks: (a),
  form B names a surface by its covering pieces only, so the name
  switches at d = h. It costs nothing at run time, the slivers it moves
  are at most aa wide, and it removes the risk of a non-covering piece
  lifting its group above another group's covering piece. It lands as
  **S3b**, after S1g merges, since form_b.ts belongs to the S1 line: the
  Definition change, the census again (0 DEFECT closes K1033), the scan's
  cost (clip each capsule to its segment's slab) and the Pixel timing,
  then the pops over the recordings and the point-table comparison."
- **F7's S3 gate, carried:** "oracle30-style verdicts at every pixel
  centre on the 12 scenes: 0 DEFECT. K1033 closes; the label's own pops
  over the recordings fall only inside the fades; on the Pixel, by render
  sync at dpr 2, the label costs at most 2 ms (K923: 1.83 ms). On the
  desktop, by timer query." K1039 closed in S3.
- **F7's point table:** "It keeps one point table, not two. The
  candidates: SAMP (samp_table.ts, read through fabric_sdf.ts's sampAt),
  which the renderer already keeps in page-lifetime FloatRows and uploads
  by dirty rows; label_tables'. The stage measures both uploads and keeps
  one." "It deletes nothing: the old flags stay until S8."
- **K1040's calls (S3's brief), where they reach the label:** continuous
  by construction, no fade on a discrete outcome (the label is itself
  discrete: its switches sit where the ink's fades already blend the two
  answers, and the pass adds no new switch); watertight at every fade
  value; each definition change gets its own Finding headed
  `Definition change:`; a rule the GPU cannot express is a Finding for
  the coordinator.
- **F7's shape of the pass (S3's brief):** capsules of radius h per chain
  segment and the corner fills, depth-tested on the cone key; surfaces
  from the topological groups and the arm spans, looked up per fragment
  from s; static instances (one per segment), rebuilt only when a chain's
  segment count changes (K985); the packed word keeps label_glsl.ts's
  layout.
- **The capsule rule (S3's brief):** a segment's fragment writes only
  where its closest point is a local minimum of the chain's distance (the
  Voronoi test against its neighbours), and two segments of one chain at
  equal z resolve by distance, as the cone key does (K1033). The merge
  scan (S3 D1) stays: a capsule fragment is discarded when a nearer
  candidate of the same chain lies within foldR in s. Clipping and
  tighter windows must not change any fragment's outcome (the pins and
  the census decide).
- **The verdict (S3's brief):** oracle30's classes at every pixel centre,
  dpr 2: agree; boundary (EDGE, MERGE, DEPTH, DEPTH=, SPAN); fade
  (undefined: the reference has no single answer); DEFECT otherwise. A
  further class is named and argued in a Finding before it counts as
  anything but DEFECT.
- **Not this stage:** the band (S4a, S4b), the CPU prep's budget (S5),
  paint (S7), anything that changes what the app draws by default. The
  ink of form B does not change: (a) is a label rule.
- Levi does not look at this stage.

## Order

Take `Get-Date` at the start and at each milestone; write the times into
Findings. Start 21:29:41, cap 23:29:41.

1. **Read and this brief (done, about 20 min).**
2. **Step 0, the baseline (about 10 min):** the census and the timing on
   S1g's form B, unchanged pass; `out/` copies tagged `s1g`.
3. **Step 1, (a) (about 25 min):** form_b.ts, labelAt and the shaders if
   they need it, the pin, `npm test`. Commit.
4. **Step 2, the census (about 10 min).** Trace what is left. Commit.
5. **Step 3, the scan's cost (about 30 min):** the slab clip in the
   capsule's vertex shader (and its float64 mirror if the rule moves),
   tighter windows in `nbWindows`, timing before and after, the census
   after. Commit.
6. **Step 4, the Pixel (about 15 min)** if the phone answers.
7. **Step 5, the pops and the point table (the rest).**

Then `## Handoff`. Stop at the cap wherever the Order stands; steps 1-3
matter most.

## Later work (not this stage)

- S5's `nbWindows` prep (2M segment pairs on muse_hash; groups only on a
  diagram change, the corner solve off the main thread).
- The app's hook behind a flag (S4b adds the flag param); the pass runs
  only on the probe page.
- Whatever of steps 4 and 5 the cap leaves. (S3b's end: step 4 ran, F4;
  step 5 did not.)
- The scan's remaining cost (F3: muse_hash 2.08 of 3.87 ms on the desktop;
  F4: half of muse_hash's 41 ms on the Pixel) and the span walk, untimed
  alone.
- The Pixel gate (F4): the label costs 10.6-39.6 ms there by K923's
  method against 2 ms, with the scan off still 6.3-19.7 ms above the floor. A decision before
  S4 builds the band on this pass.

## Where things are

- **The reference:** `src/render/field/form_b.ts`: `evalPoint` (about
  1538), `evalLayers` (about 1593: the surface entries, `pieceCover`,
  `fillW`, the top `i1`), `pieces` (1121), `member` (1089), `inFill`
  (1060). S1g's params `dEdge` and `rootBand` are its defaults.
- **The pass (S3):** `label_b.ts` (tables, `labelAt`, `nbWindows`),
  `label_b_glsl.ts` (CAPSULE_VS, CAPSULE_FS with the merge scan, the
  fill shaders), `label_b_pass.ts` (GL, timer queries),
  `label_b_verdict.ts` (the classes); pins in
  `test/render/field/label_b.test.ts`.
- **The runner:** `.claude/probes/K1040/s3/` (`run_locked.ps1`,
  `s3.mjs`, `page.ts`, `defects.mjs`, `diag.ts`, `count.ts`); outputs in
  `s3/out/` (untracked; the summaries the Findings cite are force-added).
- **The scenes** (read-only): the main checkout's
  `.claude/probes/K868/scenes/`, the 12 of `.claude/probes/K1040/s1/scenes.ts`.
- **The recordings** (read-only):
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k868-s3a\.claude\probes\S3a\seq13\`.
- **label_pops:** `scripts/label_pops.ts`; S1's pops probes
  `.claude/probes/K1040/s1/pops*.ts`.
- **The phone kit:** `scripts/k923/` (K923's bench, folded by K932),
  `scripts/phone.ps1`; the locks `$env:TEMP\claude-perf.lock` and
  `$env:TEMP\claude-phone.lock`.

## Rules

- **Files this stage changes:** `src/render/field/form_b.ts` (the
  Definition change only), `src/render/field/label_b*.ts`, tests under
  `test/render/field/`, `.claude/probes/K1040/s3/`, this brief. Not
  `LEDGER.md`, not `src/main.ts`; master's default build draws what it
  draws now (no app hook).
- **Tests:** `npm test` (tsc included) passes at every commit called
  done.
- **The main checkout:** only its untracked
  `.claude\probes\K1040\` is written (the copy of `s3/out/` at the end).
  No git command there, no tracked file, never master.
- **Dev server:** from this worktree, `npx vite --config
  .claude/probes/K1040/vite.private-cache.config.ts --port 5403
  --strictPort --host 127.0.0.1`. Never 5173, 5480-5489 or 5500-5599.
  Stopped when done.
- **Locks:** timing and pixel-exact GPU runs (the census included) under
  `$env:TEMP\claude-perf.lock` (`run_locked.ps1`, owner K1040-S3b); the
  Pixel under both. Wait inside one command. Probe links carry
  `&snd=none`; the phone gets no key or input events. No serials, IPs or
  Tailscale names in tracked files or the report.
- **Reading** through the shell; the Read tool only right before an Edit;
  summaries of at most about 30 lines per call; PowerShell.
- **Commits:** WIP to this branch at every milestone, broken or not.
  Never push, never skip hooks, no subagents, at most 4 worker processes.
- **Stop rule:** at the stage's end or 23:29:41, whichever comes first.
  A compaction is not a stop: re-read this brief and `git log --oneline
  -5`, then go on. On stopping: commit WIP, append `## Handoff`, commit,
  copy `s3/out/` back, report.

## Findings

### F0. The baseline: S3's pass on S1g's form B (21:33-21:35)

Census at every pixel centre, dpr 2, 2480x1800 (4,464,000 px a scene),
under the perf lock (21:33:28-21:34:56; `out/verdict_summary_s1g.md`,
errors 0):

| scene | agree | boundary | fade | DEFECT | groups | fills |
|---|---|---|---|---|---|---|
| muse_hash | 4463084 | 916 | 0 | 0 | 117 | 145 |
| muse_default_tw | 4463615 | 383 | 1 | 1 | 117 | 305 |
| def | 4463591 | 407 | 0 | 2 | 125 | 332 |
| fat | 4463779 | 221 | 0 | 0 | 0 | 0 |
| ring | 4463905 | 95 | 0 | 0 | 16 | 41 |
| user_tw42.lightpaper | 4463264 | 611 | 79 | 46 | 47 | 143 |
| g41_def_tw42 | 4462418 | 1484 | 57 | 41 | 125 | 380 |
| g41_def_tw64 | 4463502 | 498 | 0 | 0 | 125 | 261 |
| g41_ring_tw42 | 4463534 | 464 | 0 | 2 | 16 | 51 |
| g41_ring_tw64 | 4463904 | 96 | 0 | 0 | 16 | 38 |
| g41_user_tw42 | 4463270 | 606 | 79 | 45 | 47 | 143 |
| g41_user_tw64 | 4463674 | 326 | 0 | 0 | 47 | 110 |

137 DEFECT, all class B (`lower` and `lower-gfill`: the same group, another
chain, the GPU's key below the reference's), the same count as S3's. S1g
moved only boundaries and fills against S3's census (muse_hash fills 149 to
145 and 33 px agree to boundary; g41_user_tw64 fills 104 to 110, boundary
342 to 326; user_tw42 and g41_user_tw42 11 px boundary to agree;
muse_default_tw 1 px).

Desktop timing by timer query, 61 draws a scene, under the perf lock
(21:34:56-21:35:12; `out/time_summary_s1g.md`); upload 0.0-0.1 ms on every
scene:

| scene | GPU p50 / p95 ms | sync p50 / p95 ms | upload B | prep ms |
|---|---|---|---|---|
| muse_hash | 10.199 / 10.441 | 11.2 / 13.4 | 802816 | 96.9 |
| muse_default_tw | 4.126 / 4.309 | 5.2 / 5.8 | 851968 | 66.0 |
| def | 4.546 / 4.695 | 5.6 / 6.0 | 884736 | 66.8 |
| fat | 2.363 / 2.390 | 3.3 / 4.9 | 606208 | 34.0 |
| ring | 1.964 / 2.024 | 2.9 / 3.2 | 212992 | 9.8 |
| user_tw42.lightpaper | 2.395 / 2.433 | 3.4 / 4.2 | 409600 | 24.2 |
| g41_def_tw42 | 3.280 / 3.701 | 4.5 / 4.9 | 901120 | 65.7 |
| g41_def_tw64 | 6.579 / 6.919 | 7.7 / 9.0 | 851968 | 105.2 |
| g41_ring_tw42 | 1.230 / 1.254 | 2.2 / 2.5 | 212992 | 11.6 |
| g41_ring_tw64 | 2.373 / 2.411 | 3.4 / 5.0 | 212992 | 15.5 |
| g41_user_tw42 | 2.391 / 2.428 | 3.4 / 3.7 | 409600 | 41.1 |
| g41_user_tw64 | 5.206 / 5.264 | 6.3 / 8.1 | 409600 | 45.4 |

### F1. Definition change: form B names a surface by its covering pieces only (21:40-21:45)

`evalLayers` keeps two keys per surface. The **reach key** (the max cone
key over its pieces within h + aa and its fills within their aa shell)
orders the ink's composite and its tie mix, as before. The **cover key**
(the max over its covering pieces, d < h with fold weight >= 1/2, and the
fills whose `inFill` holds at the pixel) picks the label's top among the
covering surfaces and gives its chain, s, z and key, and the runner-up's
`dz` and `dkey`. So the name switches at d = h, and a piece that does not
cover can neither name its surface nor lift it above another covering
surface. Among equal cover keys the first in the composite order wins.
`labelBy: "reach"` (FormBParams) keeps S1g's rule for A/Bs; `"cover"` is
the default.

- **The pass already followed it**, so `labelAt` and the shaders do not
  change: the capsules discard d >= h, the merge scan discards a fragment
  at |ds| < foldR = 1.5 sigma, the midpoint of the fold weight's ramp
  ss(sigma, 2 sigma), and a fill writes only where `inFill` holds (up to
  Rp).
- **The ink does not change.** ink, its fade bits and `nSurf` are equal
  under both rules at every point of the pin's grid (test), and every
  scene's covered count is the same before and after (F2).
- **The pin** (`test/render/field/label_b.test.ts`, `raisedTee`): a tee
  whose end arm rises toward an over-crossing at s = 4 (depthWindow 6).
  At (1.02, 0.5), 0.5 from the through and 1.02 from the end arm, the end
  arm's piece is a full member of the group (ramp 1) with key 0.315 against
  the through's covering -0.05. The reach rule named the group by the end
  arm (chain 1, s 0.5) and its census has 60 DEFECT (59 `lower`, 1
  `lower-gfill`); the cover rule names it by the through (chain 0, s
  11.02), as `labelAt` does, and its census agrees everywhere. The fixture
  also joins the census list (0 DEFECT).
- **Every other pin keeps its expected value:** form_b.test.ts, k883,
  field_core, label_b's 9 other fixtures and the whole suite (`npm test`: 192
  files, 2617 tests passed).

### F2. The census after F1: 0 DEFECT on the 12 scenes (21:45:27-21:47:34)

Under the perf lock (`out/verdict_summary_a.md`, errors 0;
`defects.mjs` lists none):

| scene | agree | boundary | fade | DEFECT | from F0 |
|---|---|---|---|---|---|
| muse_hash | 4463085 | 915 | 0 | 0 | +1 agree |
| muse_default_tw | 4463673 | 327 | 0 | 0 | +58 |
| def | 4463612 | 388 | 0 | 0 | +21 |
| fat | 4463779 | 221 | 0 | 0 | = |
| ring | 4463905 | 95 | 0 | 0 | = |
| user_tw42.lightpaper | 4463790 | 210 | 0 | 0 | +526 |
| g41_def_tw42 | 4463698 | 302 | 0 | 0 | +1280 |
| g41_def_tw64 | 4463509 | 491 | 0 | 0 | +7 |
| g41_ring_tw42 | 4463928 | 72 | 0 | 0 | +394 |
| g41_ring_tw64 | 4463904 | 96 | 0 | 0 | = |
| g41_user_tw42 | 4463795 | 205 | 0 | 0 | +525 |
| g41_user_tw64 | 4463683 | 317 | 0 | 0 | +9 |

The gate is met: **0 DEFECT, so K1033 (muse_hash) can close** (the
coordinator closes it). Every covered count (reference and GPU) is the one
F0 had. The fade class went to 0 too: its 216 pixels were class-B sites
that carried a fade bit (`lower[cap,tie]`, `lower[cap]`, `lower[merge]`).
Most of the boundaries that went were MERGE (g41_def_tw42 1455 to 274,
g41_ring_tw42 457 to 65, g41_user_tw42 592 to 192): there the reference
had named a non-covering second minimum of the same chain within sigma in
s, and the GPU the covering one. What is left is MERGE, DEPTH=, DEPTH and
EDGE only.

### F3. The scan's cost: the slab clip and the carried scan, 1.6-2.6x; each side's early end exact but no faster, reverted (21:50-22:21)

Where the time went, from the tables (`win_stats.ts`, weighted by segment
length; `out/win_stats.txt`). A capsule's quad reached h + pad past both
ends, so with segments 0.17-0.41 h long it covered its slab 5.9-12.7
times over (1 + 2h/l), and every fragment of it ran the merge scan over
its segment's window:

| scene | h | l/h | window mean / max | quad / slab | spans walked |
|---|---|---|---|---|---|
| muse_hash | 0.400 | 0.171 | 9.0 / 40 | 12.7 | 4.6 |
| muse_default_tw | 0.260 | 0.248 | 3.4 / 24 | 9.1 | 5.4 |
| def | 0.260 | 0.242 | 3.4 / 23 | 9.3 | 8.2 |
| fat | 0.260 | 0.318 | 2.9 / 14 | 7.3 | 0.5 |
| ring | 0.290 | 0.302 | 4.5 / 20 | 7.6 | 8.1 |
| user_tw42.lightpaper | 0.210 | 0.292 | 3.1 / 21 | 7.9 | 5.3 |
| g41_def_tw42 | 0.210 | 0.298 | 2.7 / 18 | 7.7 | 8.2 |
| g41_def_tw64 | 0.320 | 0.200 | 4.7 / 32 | 11.0 | 8.0 |
| g41_ring_tw42 | 0.210 | 0.410 | 3.0 / 13 | 5.9 | 8.1 |
| g41_ring_tw64 | 0.320 | 0.276 | 5.4 / 23 | 8.2 | 7.8 |
| g41_user_tw42 | 0.210 | 0.292 | 3.1 / 21 | 7.9 | 5.3 |
| g41_user_tw64 | 0.320 | 0.197 | 6.4 / 38 | 11.1 | 4.8 |

Three cuts, each timed and censused under the perf lock:

1. **The slab clip (kept, CAPSULE_VS).** The fragment shader keeps t in
   [0, 1), a free end's cap, and at t <= 0 only the convex wedge at a
   (past the previous segment's end too, within h). That wedge reaches
   back h |sin phi| for a turn phi below 90 degrees, h past it. So an
   inner end now extends by that plus the pad at a and by the pad alone
   at b; free ends and zero-length segments keep h + pad. No fragment it
   drops was kept, so labelAt is unchanged.
2. **The carried scan (kept, CAPSULE_FS).** Consecutive segments share a
   point, so the merge scan carries it: one texel fetch a step, not two
   or three. It tests the distance before the foot rule; both only skip,
   so the order does not change the result.
3. **Each side's early end (measured at 22:16, reverted).** NB's z/w held
   each side's window arc; each side scanned outward from k and ended
   once |p - Q| - (arc left) >= d + 1e-3 h. It was exact (census
   identical) but no faster: muse_hash 3.87 to 3.72 ms, the other eleven
   0.01-0.06 ms slower. `nbWindows` already keeps only what can hide a
   fragment: (i) arc within foldR, (ii) within 2h of segment k, (iii)
   turning enough to come back, so a straight stretch gets +-1, and the
   early end seldom fires before the window ends. It moved labelAt,
   `nbWindows` and the pins for nothing, so cut 3 is reverted (it stays
   in 41951b5c).

Desktop timing by timer query, 61 draws a scene, under the perf lock.
Before: 1778fc58 (F1) at 21:52 (`out/time_summary_pre3.md`). After: cuts 1
and 2 at 22:18 (`out/time_summary_s3b_final.md`; the first run of them, at
21:57, `s3b_a`, is within 0.01 ms). Cut 3: 22:16 (`s3b_b`). Scan off: cuts
1 and 2 with the merge scan skipped (`--noscan 1`, a timing knob whose
labels are wrong), 21:59 (`s3b_a_noscan`). The two cuts were timed
together. Sync is the wall time of the draw plus `pass.sync()`, with
about 2 ms fixed, so it moves less.

| scene | GPU p50 / p95 before | after | x | sync p50 | cut 3 | scan off |
|---|---|---|---|---|---|---|
| muse_hash | 10.236 / 10.515 | 3.869 / 3.938 | 2.65 | 11.5 to 5.2 | 3.719 / 3.821 | 1.792 / 1.831 |
| muse_default_tw | 4.146 / 4.448 | 2.128 / 2.162 | 1.95 | 5.4 to 3.4 | 2.165 / 2.205 | 1.595 / 1.742 |
| def | 4.544 / 4.741 | 2.205 / 2.231 | 2.06 | 5.8 to 3.5 | 2.242 / 2.269 | 1.656 / 1.823 |
| fat | 2.360 / 2.385 | 1.189 / 1.197 | 1.98 | 3.4 to 2.4 | 1.250 / 1.255 | 0.794 / 0.799 |
| ring | 1.968 / 2.014 | 1.016 / 1.029 | 1.94 | 3.1 to 2.2 | 1.030 / 1.056 | 0.735 / 0.755 |
| user_tw42.lightpaper | 2.397 / 2.441 | 1.269 / 1.290 | 1.89 | 3.6 to 2.8 | 1.307 / 1.323 | 0.956 / 1.268 |
| g41_def_tw42 | 3.268 / 3.553 | 1.827 / 1.863 | 1.79 | 4.8 to 4.1 | 1.875 / 1.907 | 1.472 / 1.498 |
| g41_def_tw64 | 6.607 / 6.903 | 2.750 / 2.769 | 2.40 | 7.9 to 5.0 | 2.746 / 2.770 | 1.810 / 1.837 |
| g41_ring_tw42 | 1.235 / 1.453 | 0.761 / 0.777 | 1.62 | 2.4 to 2.6 | 0.787 / 0.802 | 0.625 / 0.637 |
| g41_ring_tw64 | 2.371 / 2.400 | 1.124 / 1.141 | 2.11 | 3.5 to 2.9 | 1.140 / 1.156 | 0.761 / 0.778 |
| g41_user_tw42 | 2.401 / 2.589 | 1.266 / 1.291 | 1.90 | 3.6 to 3.1 | 1.305 / 1.324 | 0.953 / 0.973 |
| g41_user_tw64 | 5.198 / 5.288 | 1.999 / 2.017 | 2.60 | 6.4 to 3.7 | 1.986 / 1.998 | 1.114 / 1.139 |

The census after, at 22:19:30-22:21:10 (`out/verdict_summary_s3b_final.md`,
errors 0), is F2's line for line: the same agree, boundary, fade and
DEFECT counts, the same boundary kinds and the same covered counts on all
12 scenes (`verdict_summary_a.md` against it, run times stripped: 0
differences; cut 3's `verdict_summary_s3b_b.md` too). **0 DEFECT still.**

What is left is the scan itself. After minus scan off: muse_hash 2.08 ms
(54% of its 3.87), g41_def_tw64 0.94, g41_user_tw64 0.89, 0.14-0.55 on the
other nine. muse_hash is the outlier because its h is large against its
segments (l/h 0.17), so its windows hold 9 segments on average and up to
40. The span walk (4.6-8.2 spans a fragment) was not timed separately.
Both are left for S5 (Later work).

Commands (from the worktree; each `run_locked.ps1` run takes the perf lock
and appends a run to `out/<mode>_summary.md`, and the labelled copies hold
one run each):

```powershell
& .claude\probes\K1040\s3\run_locked.ps1 -RunArgs @('time')
& .claude\probes\K1040\s3\run_locked.ps1 -RunArgs @('time', '--noscan', '1')
& .claude\probes\K1040\s3\run_locked.ps1 -RunArgs @('verdict')
node scripts/run_node.mjs .claude/probes/K1040/s3/win_stats.ts
& .claude\probes\K1040\s3\time_table.ps1 pre3 s3b_final s3b_b s3b_a_noscan
# the census compare, run times stripped:
$norm = { param($f) Get-Content $f | Where-Object { $_ -match '^\s*- ' } |
  ForEach-Object { $_ -replace '; \d+ ms$', '' } }
Compare-Object (& $norm out\verdict_summary_a.md) (& $norm out\verdict_summary_s3b_final.md)
```

### F4. The Pixel: 10.6-39.6 ms by K923's method, against the 2 ms gate (22:37-22:49)

The kit's read-only check (`scripts/phone_pass.ps1 -Phase check`) passed
before every run, so step 4 ran: nine runs under both locks, eight over
the 12 scenes and a first floor run over two. Each began with the
launcher in front.
**The gate fails by 5-20x.** By K923's method the label costs 10.6-39.6 ms
above the readback floor; K923's prototype label cost 1.83 ms. F3's cuts
help there too, less than on the desktop: 1.1-1.6x from 1778fc58's shader
(pre3) by K923's method, 1.07-1.9x at 2480x1800.

**The kit** (new): `phone_time.mjs` bundles `page.ts` with rolldown
(`--glsl <file>` swaps another `label_b_glsl.ts` in at bundle time), serves
it on 127.0.0.1:5403, adds the adb reverse and the 9222 forward only if
missing, opens the page with `am start` (a VIEW intent, no key or input
event) and drives `window.s3.time` over CDP. A `getevent` watch stops the
run at any input event; none fired. After the run it closes its own tab,
sends HOME if the launcher was in front, and removes only the tunnels it
added. `run_phone.ps1` runs it after the kit's read-only check, under the
phone lock and then the perf lock, and releases both by owner.
`phone_table.ps1` tabulates the runs. The renderer is ANGLE on Vulkan,
PowerVR C-Series CXTP-48-1536, with no timer query, so the measure is
render sync: the draw plus a 1-px `readPixels`. In every run: thermal 0,
battery 22.6-23.4 C, no media playing, 0 context losses.

**Two setups.** (a) S3's `time()`: the scene's camera at scale 2
(2480x1800), one render a rAF, 60 frames. (b) K923's (`--fit 411x753
--b2b`, new in `page.ts`): the Pixel's window at dpr 2 (822x1506), K923's
fit (the chains' bbox plus h, times 1.04, centred), 60 renders back to
back in one task after 10 warm-ups. Its floor (`--floor`, the readback
alone) is 1.0-2.8 ms. The gate's numbers are (b)'s.

(b), sync p50/p95 ms. The middle three columns are timing-only variants
whose labels are wrong: the scan off (`--noscan`, every window empty); no
`gl_FragDepth` (both writes removed, so depth is the vertex's constant
0.5); and no `gl_FragDepth` and none of the nine `discard`s.

| scene | final | pre3 | scan off | no FragDepth | no FragDepth, no discard | floor | final − floor |
|---|---|---|---|---|---|---|---|
| muse_hash | 41.1/48.8 | 57.9/66.7 | 21.2/24.6 | 36.9/49.0 | 8.3/14.2 | 1.5/3.0 | 39.6 |
| muse_default_tw | 23.3/32.9 | 34.5/45.0 | 18.6/22.0 | 25.4/33.8 | 6.0/7.5 | 2.0/4.3 | 21.3 |
| def | 24.8/36.2 | 35.5/43.7 | 20.2/24.7 | 24.8/34.9 | 8.2/9.4 | 2.3/4.2 | 22.5 |
| fat | 22.0/25.2 | 24.2/33.8 | 14.2/18.7 | 20.8/25.4 | 6.9/8.2 | 2.1/3.8 | 19.9 |
| ring | 13.8/15.9 | 21.0/25.2 | 9.1/11.1 | 13.6/15.7 | 7.0/8.4 | 2.8/4.4 | 11.0 |
| user_tw42.lightpaper | 17.4/21.1 | 25.4/31.4 | 12.3/16.9 | 17.5/20.9 | 7.3/9.5 | 2.6/3.9 | 14.8 |
| g41_def_tw42 | 25.3/29.9 | 31.0/41.8 | 20.1/25.9 | 26.8/34.8 | 9.2/15.0 | 2.2/3.7 | 23.1 |
| g41_def_tw64 | 32.5/42.7 | 42.8/53.2 | 20.2/23.8 | 34.2/41.4 | 9.2/14.1 | 2.0/3.7 | 30.5 |
| g41_ring_tw42 | 11.6/14.0 | 14.3/17.1 | 9.1/11.4 | 11.7/14.8 | 6.0/7.2 | 1.0/3.4 | 10.6 |
| g41_ring_tw64 | 15.2/18.9 | 24.7/28.9 | 9.8/13.6 | 14.8/18.7 | 6.5/7.9 | 1.9/3.9 | 13.3 |
| g41_user_tw42 | 17.8/22.3 | 26.9/30.4 | 12.6/17.5 | 17.4/21.9 | 7.8/10.5 | 2.6/4.2 | 15.2 |
| g41_user_tw64 | 23.6/32.0 | 38.0/48.0 | 13.6/16.7 | 24.4/31.0 | 7.1/9.9 | 2.0/3.7 | 21.6 |

(a), sync p50/p95 ms, final against pre3: muse_hash 43.6/52.9 against
82.3/92.9, muse_default_tw 28.6/37.3 against 40.0/46.7, def 27.3/38.0
against 42.0/51.5, fat 22.9/30.9 against 28.5/37.9, ring 19.4/25.4 against
24.1/33.1, user_tw42 25.1/29.4 against 26.8/35.1, g41_def_tw42 25.5/33.7
against 34.2/43.3, g41_def_tw64 34.6/42.9 against 55.7/62.4, g41_ring_tw42
14.5/18.3 against 21.7/26.1, g41_ring_tw64 21.4/24.8 against 25.6/34.3,
g41_user_tw42 25.6/28.8 against 30.2/37.8, g41_user_tw64 29.6/35.5 against
44.1/50.7. Uploads took 0.1-0.4 ms (213-901 kB). `buildLabelB` took 11-104 ms
on the phone (`prepMs`).

**Where the time goes, measured.**
- **The scan** (scan off): 9.1-21.2 ms remain, 6.3-19.7 ms above the
  floor, still 3-10x the gate. The scan is half of muse_hash (41.1 to
  21.2 ms) and 2.5-12.3 ms of the others.
- **`gl_FragDepth`**: removing both writes changes nothing beyond the
  noise: every scene stays within 10% of final, either way.
- **The discards**: removing them as well gives 6.0-9.2 ms, 1.9-5x faster
  than final.

Observed: the cost follows the discards, not the depth writes. Inferred,
not tested: with a `discard` in the shader, the PowerVR shades every
capsule and fill fragment that covers a pixel, because its hidden-surface
removal cannot drop a fragment that may still discard. The pass then pays
its overdraw times the foot test and the scan. Without the discards, at
the vertex's constant depth and LESS, only a pixel's first fragment
passes, and the GPU can reject the rest before shading them.

K923's label set depth from the vertex (`scripts/k923/bench.js`,
LABEL_VS's `gl_Position`, line 288), never writes `gl_FragDepth` and has
no discard: that file's seven discards are all in later shaders (lines
374-426).

Even the variant without discards costs 4.0-7.2 ms above the floor
(observed), 2-3.6x the gate. Inferred: that is about one shading a
covered pixel plus the geometry (23,349 instanced capsules on
muse_hash), and these runs cannot split the two. This needs a decision
before S4 builds the band on this pass (Later work, Handoff Next 1).

Commands (from the worktree; each run appends to
`out/phone_time_summary.md` and writes `out/phone_time_<label>_<scene>.json`):

```powershell
$s3 = '.claude\probes\K1040\s3'
& $s3\run_phone.ps1                                   # (a), 2480x1800
& $s3\run_phone.ps1 -RunArgs @('--fit', '411x753', '--label', 'fit', '--b2b')
& $s3\run_phone.ps1 -RunArgs @('--fit', '411x753', '--label', 'floorall', '--b2b', '--floor')
& $s3\run_phone.ps1 -RunArgs @('--fit', '411x753', '--label', 'fitnoscan', '--b2b', '--noscan')
# The swapped shaders: build the file, then pass its absolute path.
$o = "$PWD\$s3\out"
cmd /c "git show 1778fc58:src/render/field/label_b_glsl.ts > $o\label_b_glsl_1778fc58.ts"
$src = [IO.File]::ReadAllText("$PWD\src\render\field\label_b_glsl.ts")
$nofd = $src.Replace('gl_FragDepth = 0.5 - key * uKeyScale;', '/* K1097 HSR probe: no gl_FragDepth */')
[IO.File]::WriteAllText("$o\label_b_glsl_nofd.ts", $nofd)
[IO.File]::WriteAllText("$o\label_b_glsl_nofd_nodiscard.ts", $nofd.Replace('discard;', '{} /* K1097 HSR probe: no discard */'))
& $s3\run_phone.ps1 -RunArgs @('--glsl', "$o\label_b_glsl_1778fc58.ts", '--label', 'pre3')
& $s3\run_phone.ps1 -RunArgs @('--glsl', "$o\label_b_glsl_1778fc58.ts", '--fit', '411x753', '--label', 'pre3fit', '--b2b')
& $s3\run_phone.ps1 -RunArgs @('--glsl', "$o\label_b_glsl_nofd.ts", '--fit', '411x753', '--label', 'nofd', '--b2b')
& $s3\run_phone.ps1 -RunArgs @('--glsl', "$o\label_b_glsl_nofd_nodiscard.ts", '--fit', '411x753', '--label', 'nofdnd', '--b2b')
& $s3\phone_table.ps1 fit pre3fit fitnoscan nofd nofdnd floorall -Floor floorall
& $s3\phone_table.ps1 final pre3
```

## Handoff

S3b stopped after step 4, at 22:58 (start 21:29:41, cap 23:29:41).
Step 5 was not started. The branch is
`worktree-agent-a99cc3250b93f7bc0`, never pushed.

**What landed, commit by commit:**
- `d4ad825d`: the brief.
- `1778fc58` (F1-F2): form B names a surface by its covering pieces only
  (`labelBy: "cover"` in `form_b.ts`, pinned in `label_b.test.ts`). The
  census reads 0 DEFECT and 0 fade on all 12 scenes, so K1033 can close.
- `41951b5c`: step 3 WIP.
- `2e1f0815` (F3): in `label_b_glsl.ts`, the slab clip (VS) and the
  carried scan (FS). The desktop runs 1.6-2.6x faster and the census is
  unchanged. Cut 3 (each side's early end) was exact but no faster, so it
  was reverted. `npm test`: 2617 passed, 8 skipped.
- This commit (F4): the Pixel kit (`phone_time.mjs`, `run_phone.ps1`,
  `phone_table.ps1`; `page.ts`'s `time()` gains K923's fit,
  back-to-back renders and the floor), its numbers, and this Handoff.

**Before (F0, the stage start) and after**, the census at dpr 2 and
2480x1800. The desktop column is the GPU p50 by timer query, in ms. The
Pixel column is the sync p50 by K923's method, from 1778fc58's shader to
now, with the floor taken off in parentheses.

| scene | DEFECT | fade | desktop GPU p50 | Pixel sync p50 |
|---|---|---|---|---|
| muse_hash | 0 → 0 | 0 → 0 | 10.199 → 3.869 | 57.9 → 41.1 (39.6) |
| muse_default_tw | 1 → 0 | 1 → 0 | 4.126 → 2.128 | 34.5 → 23.3 (21.3) |
| def | 2 → 0 | 0 → 0 | 4.546 → 2.205 | 35.5 → 24.8 (22.5) |
| fat | 0 → 0 | 0 → 0 | 2.363 → 1.189 | 24.2 → 22.0 (19.9) |
| ring | 0 → 0 | 0 → 0 | 1.964 → 1.016 | 21.0 → 13.8 (11.0) |
| user_tw42.lightpaper | 46 → 0 | 79 → 0 | 2.395 → 1.269 | 25.4 → 17.4 (14.8) |
| g41_def_tw42 | 41 → 0 | 57 → 0 | 3.280 → 1.827 | 31.0 → 25.3 (23.1) |
| g41_def_tw64 | 0 → 0 | 0 → 0 | 6.579 → 2.750 | 42.8 → 32.5 (30.5) |
| g41_ring_tw42 | 2 → 0 | 0 → 0 | 1.230 → 0.761 | 14.3 → 11.6 (10.6) |
| g41_ring_tw64 | 0 → 0 | 0 → 0 | 2.373 → 1.124 | 24.7 → 15.2 (13.3) |
| g41_user_tw42 | 45 → 0 | 79 → 0 | 2.391 → 1.266 | 26.9 → 17.8 (15.2) |
| g41_user_tw64 | 0 → 0 | 0 → 0 | 5.206 → 1.999 | 38.0 → 23.6 (21.6) |
| total | 137 → 0 | 216 → 0 | | |

**Commands:** F2's census, F3's desktop timing and F4's Pixel blocks.
Everything runs from the worktree, under `run_locked.ps1` (the perf lock)
or `run_phone.ps1` (both locks). The outputs are in
`.claude/probes/K1040/s3/out/`, untracked except the summaries and tables
the Findings cite. They are also copied to the main checkout's same path.

**Next:**
1. **The Pixel gate (F4)** needs a decision before S4 builds the band on
   this pass. The label costs 10.6-39.6 ms there against 2 ms. The cost
   follows the discards. Even with no discard it costs 4.0-7.2 ms above
   the floor. The options: restructure the
   pass for the tile-based GPU (one shaded fragment a pixel, and fewer or
   smaller capsules), a coarser label target (K923's `lr`), or a new
   budget.
2. **Step 5**, not run:
   - The pops over def_drag, def_flow, muse_drag and muse_flow. The
     recordings are read-only, in
     `.claude/worktrees/k868-s3a/.claude/probes/S3a/seq13/`; the tools
     are `scripts/label_pops.ts` and S1's `.claude/probes/K1040/s1/pops*.ts`.
   - Then SAMP's upload against label_tables'. The label tables upload
     213-901 KB a scene, in 0.2-0.4 ms on the Pixel.
3. **The rest:**
   - the scan's remaining cost and the untimed span walk (F3, F4);
   - S5's `nbWindows` prep (`buildLabelB` takes 9-128 ms on the desktop,
     12-103 ms on the Pixel);
   - S4b's flag hook.
