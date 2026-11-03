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
- Whatever of steps 4 and 5 the cap leaves.

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

## Handoff
