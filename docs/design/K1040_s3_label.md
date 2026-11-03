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

Times (`Get-Date`, 2026-11-02): start 18:18:20; brief written 18:30.

## Handoff
