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

## Handoff
