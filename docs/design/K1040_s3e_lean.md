# K1040 S3e (K1097): the label pass's fixed part, cut to its floor

The coordinator's brief, 2026-11-03. One stage. Branch
`worktree-agent-aaf87e9d3775b20e4`, worktree
`.claude/worktrees/agent-aaf87e9d3775b20e4`, never pushed. S3c and S3d
are on master (`d28d2e2c`).

## Where S3d left it

Read the Handoff of `docs/design/K1040_s3d_tent.md` first; its tables
are the baseline.

- tentv, S3d's vertex-light tent, keeps S3c's tent's census exactly
  (794 DEFECT, 504 of them at 0.03 px or more); the control's is 0.
  Its Pixel label cost is 4.1-9.4 ms (median 5.8) against the 2 ms gate.
- The fixed part alone is over the gate. An empty pass (the records
  uploaded, L and D cleared at 822x1506 and stored, the 1-px readback)
  costs 3.0-4.7 ms on s3d2 and 2.0-3.6 on s3d3. By s3d3's split: the
  render job's round trip about 0 (kick), the clears and stores 2.1
  (1.3-3.1), the record upload 1.1 (0.5-1.5) for 212-410 KB a pass.
- D could not be isolated. Invalidating the sampled D32F texture after
  the draws added 31-34 ms a pass (K1151); K923's D24 renderbuffer,
  invalidated after its draw (`.claude/probes/K923/bench.js`, line 549,
  per that Handoff), cost nothing.
- The drawing past the empty pass is 2.8-3.0 ms (median; 1.2-4.4),
  mostly its vertices. That is S3f's.

## The decision

The gate stays as written: the Pixel's label cost (p50 minus
floorall's p50) at most 2 ms on every scene, everything the pass does
counted (the coordinator's call, 2026-11-03). The fixed part comes
first because no drawing fits beside it today. S3f then cuts the
drawing to the gate; S3g takes F4, F6, F8, F9 and F12 (K1143).

## The stage

Cut the pass's fixed part to the least a pass can do and still hand S4
what it reads.

0. Run `Get-Date`. Fetch, then rebase the branch onto `origin/master`.
   Then two small fixes and `npm test`, in one commit:
   - `.claude/probes/K1040/s3/page.ts`, lines 194-195, call
     `opts.floor` "K923's floor". It is the 1-px readback alone; K923's
     floor also cleared the full-size default framebuffer. Say what it
     is.
   - `s3d_gate.ps1` (line 7) and `run_phone.ps1` (line 17) wait 5 min
     for the locks by default, and S3d's gate batch was cut at its
     third run when another agent held the perf lock past that. Gate
     batches wait 15 min, this stage's new scripts included.
1. Measure the floor before you build: one phone batch, one page, with
   S3d's `empty`, `emptynoup` and `floor` as controls beside:
   - **ideal**: what S4 needs stored and nothing else. One full-size
     32-bit target, cleared and stored; depth a renderbuffer,
     invalidated after the draws (K923's setup); no upload, no draw.
   - ideal's parts, for example: its depth renderbuffer not
     invalidated; the 32-bit target with no depth attachment.

   If the ideal floor is over 1 ms on most scenes, less than 1 ms is
   left for any drawing, and tentv's drawing (1.2-4.4) misses that on
   every scene. Say so in the Handoff with the numbers, then go on.
2. Build the lean fixed part as an option of the pass, beside today's.
   S3b's draw, S3c's tent and tentv stay as they are, as controls.
   - **Depth into L's word.** Carry what S4 samples from D in L's
     word, so D becomes a renderbuffer invalidated after the draws.
     Read what S4 reads first (`docs/design/K1040_junction_field.md`:
     F3 D4's fade, F7's S4) and say what precision it needs and why
     the bits suffice. If the Pixel punishes the renderbuffer's
     invalidation the way it punished the texture's, keep the store
     and say so.
   - **No per-pass upload of what is already on the GPU.** Where the
     live renderer already uploads the same samples each frame, read
     its data textures instead (check which do, for example K8's SDF
     tables in `src/render/samp_table.ts`); otherwise upload only the
     rows that changed. The gate times the moving case: a timed pass
     pays what a frame pays while the fabric moves, so an upload
     skipped only because a test scene stands still does not count.
     Report the at-rest pass beside it.
   - **Drop the unread nb.** `label_b_pass.ts` uploads nb for every
     mode but tentv (line 207); only the capsule's merge scan reads it
     (line 18).
   - **A smaller L** (lr 2) only if the census holds: F9's upsample
     class reads DEFECT at lr 2 today.
   - Say whether the Pixel's ANGLE turns the clears into load-op
     clears. If a clear costs a full-screen draw, measure it.
3. Run the gate in one batch:
   - the Pixel: the control `fit`, `tentv`, tentv with the lean fixed
     part, the lean part's empty pass, and `floorall`;
   - the desktop census (`verdict`) and timer (`time`) for tentv with
     the lean part.

   To pass, all three hold:
   - the lean part's empty pass (minus floorall) is within 0.3 ms of
     step 1's ideal floor on every scene;
   - tentv's census with the lean part is unchanged: 794 DEFECT, 504
     of them at 0.03 px or more;
   - the control's census is unchanged: 0 DEFECT.

   Report the full label cost per scene beside it, against the 2 ms
   gate, for S3f.

Out of scope: the drawing (S3f: continuous strips per chain run, tents
only within the junctions' reach, fewer facets, instancing) and S3g's
list (K1143).

## Rules

- **Worktree only.** Muse agents commit on master in the main checkout
  (`C:\Users\lsl\Repositories\knotmaze`). Never edit files there, never
  run git there except `fetch`, and never push.
- **Commits.** Commit WIP at every milestone, broken or not. Probes and
  results stay in `.claude/probes/K1040/s3/` (tracked when reusable;
  `.claude/probes` is ignored, so a new file needs `git add -f`).
- **Timing.** Every timing runs under the perf lock; `run_locked.ps1`
  and `run_phone.ps1` take it.
- **The phone.**
  - Run through `phone_batch.ps1` (it runs `run_phone.ps1`: the phone
    lock, the perf lock, then K1142's shared ready check: the launcher
    in front, no touch for 120 s before a batch's first run and 20 s
    before each later one).
  - Links carry `&snd=none`. Send no key or input event.
  - Stop at the first non-zero exit. If the phone isn't ready by your
    cap, end with the desktop results.
  - Never run `scripts/phone.ps1`. Keep serials, IPs and Tailscale names
    out of tracked files.
- **Ports.** Your dev server uses 5403 (the ledger's env line). Avoid
  5173, the phone's 5480-5489, Muse's 5500-5599 and K1139's 5620-5639.
- **Reading code.** Read it through the shell: `Select-String`, then
  `Get-Content <f> | Select-Object -Skip <n> -First <m>`. Use the Read
  tool only right before an Edit. No helpers.
- **The stop.** Stop when the stage is done or 2 h after step 0's
  `Get-Date`, whichever comes first.
  - Run `Get-Date` at each milestone.
  - A compaction is not a stop. After one, re-read this brief and
    `git log`.
  - At the stop, commit. Then append a Handoff to this brief and commit
    again. The Handoff gives what landed (commit by commit), the before
    and after table, the commands, and the next step.
  - Then report: the gate's verdict, the table, a `Ledger items` list,
    and K1097's handle fields (owner, branch and last commit, evidence,
    next, brief, env).

## Handoff

S3e's agent, stopped 2026-11-03 at 13:58 (cap 14:13). Branch
`worktree-agent-aaf87e9d3775b20e4` on `14e41512`, never pushed.

**The gate: undecided.** Its second and third conditions hold on the
desktop. The first, and step 1's ideal floor, need the Pixel, which was
never ready: K1142's ready check found the screen off and the phone
locked at every try (12:27, 12:29, 12:37, 13:05, 13:09, 13:14, 13:18
and 13:23, then 23 more about 77 s apart from 13:24 to 13:52), so this
stage has no phone run. Both batches are committed and wait for it
(Next).

### What landed

- `36543a12` step 0: page.ts's `opts.floor` comment says what it is
  (the 1-px readback of L alone; K923's floor also cleared the
  full-size default framebuffer). Gate batches wait 15 min for the
  locks: `run_phone.ps1`, `phone_batch.ps1`, `s3d_gate.ps1`,
  `s3d_kick.ps1`, `f11_run.ps1`. npm test passed.
- `cf4b089e` step 1: page.ts's ideal family in timeMany (`ideal`,
  `idealnoinv`, `idealnod`, `ideal8`, `ideal32f`, `idealpt`,
  `idealpt32f`, `idealnoclr`, `idealfsq`; page.ts's header says what
  each one does), split.mjs's `s3e1` set and `s3e_floor.ps1`.
- `aae83cfe` step 2: the lean fixed part, the pass's option `lean`
  (`label_b_pass.ts`'s header). The default pass is unchanged. In lean:
  - L is immutable (texStorage2D);
  - D is a DEPTH_COMPONENT32F renderbuffer, invalidated after the
    draws, and `depth` reads null; `leanStoreDepth` keeps the store, as
    a control;
  - nb is uploaded only for the capsule, the one mode that reads it;
  - each table sends only the rows that differ from its last upload, a
    run of rows per texSubImage2D. `probeAllDirty` sends every used
    row: the moving fabric's frame, which the gate times.
    `uploadBytes` counts what an upload sent.

  Also page.ts's lean variants, `--lean` and `--rest` in s3.mjs and
  phone_time.mjs, `s3e_gate.ps1` and `defects.ps1`.
- `c0c308dd` the D24 hedge: `probeDepth24` (D as K923's
  DEPTH_COMPONENT24 renderbuffer), s3.mjs's `--d24 1`, the variants
  `leanempty24` and `leantentv24`. npm test: 201 files passed.
- `47a0856f` draw()'s GL state save, split out: `probeNoSave` (no
  state queries, no restore, no timer query), the variants
  `leanemptyns` and `leanemptynoupns`, and split.mjs's `save`,
  `ns - ideal` and `noupns - d32f`. `s3e_gate.ps1` runs the one-page
  split first.
- The Handoff's own commit: this Handoff and the desktop summaries in
  `out/` (`many_s3e1smoke`, `many_s3e3`, the `verdict_s3e*` and
  `time_s3e*` summaries).

### Step 1: the floor (desktop only)

The Pixel's ideal floor is unmeasured (`s3e_floor.ps1`), so whether it
is over 1 ms is open. The desktop (2480x1800, many, render-sync p50 in
ms, which resolves 0.1; `out/many_s3e1smoke_summary.md`):

| variant | muse_hash | ring |
|---|---|---|
| ideal | 0.5 | 0.5 |
| idealnoinv | 0.5 | 0.5 |
| idealnod | 0.5 | 0.5 |
| ideal8 | 0.6 | 0.5 |
| ideal32f | 0.6 | 0.6 |
| idealpt | 0.6 | 0.5 |
| idealpt32f | 0.6 | 0.6 |
| idealnoclr | 0.4 | 0.3 |
| idealfsq | 0.4 | 0.4 |
| empty | 0.8 | 0.8 |
| emptynoup | 0.7 | 0.7 |
| floor | 0.3 | 0.3 |
| kick | 0.3 | 0.3 |

On the desktop the ideal floor is 0.2 ms over floor, the clears are
worth 0.1-0.2, a clear as a full-screen draw costs about what the clear
does, and the depth store costs nothing measurable. None of it says
anything about the Pixel's tiler.

### Step 2: what the lean part found

- **S4 reads nothing from D.** F10's tie strips and D4's fade take both
  z's from the CPU; the band inks only where L's surface code says its
  surface is on top; the outer edge's AA fetches L; S1e's burial uses
  the CPU's depth. No shader samples D and `get depth()` has no reader,
  so there is nothing to carry into L's word, and D can be invalidated.
  S3d's Handoff says S4 samples D: it does not.
  - If S4 ever needs z on the GPU: D4's fade, ss(-ε_z, ε_z, Δz) at
    ε 0.06, has a slope of up to 12.5 per z unit, so an error under
    1/256 of the fade needs z to about 3e-4, 13-16 bits. L's word has
    two free bits (30-31), so that takes a second word (RG32UI) or
    bits freed elsewhere.
  - D32F keeps today's keys exactly; D24 reads the same census (step
    3).
- **D's invalidation on the Pixel: unmeasured.** S3d's 31-34 ms came
  from invalidating a sampled D32F texture; lean invalidates a D32F
  renderbuffer that nothing samples. The s3e3 page carries both
  fallbacks: `leantentvst` keeps the store (column `D store`), and
  `leanempty24` and `leantentv24` use K923's D24 renderbuffer. D24's
  census matches D32F's line for line, so D24 is a safe switch if the
  Pixel punishes the D32F renderbuffer.
- **The upload, moving and at rest.** Moving, every table changes
  (every vertex moves), so lean sends today's bytes: 212,992-901,120 B
  a pass (muse_hash 802,816; fat one unused 16 KB row less). S3d's
  "212-410 KB" is wrong: `uploadBytes` reads these totals for today's
  tentv too. At rest lean sends 0 B. S3d measured the moving upload at
  1.1 ms (0.5-1.5) on the Pixel, so the moving lean empty pass is
  probably over the 0.3 ms margin by its upload alone (inferred; `lean
  noup` is the pass without it).
- **What the live renderer already uploads.** K8's SAMP
  (`samp_table.ts`, on by default) holds the chainSamples' x,y, which
  equal the label's pts x,y except at the END arm's extension vertex.
  s and z are on no live table, and nothing else matches. Reading x,y
  from SAMP would cut 8 of tentv's ~32 B a vertex, a quarter of the
  upload: 0.1-0.4 ms by S3d's 0.5-1.5 (inferred). Not built: it needs
  the fetches rewritten, a map from the label's vertices to SAMP's
  samples, and a probe page that runs the live renderer (the s3 page
  builds the pass alone).
- **draw()'s GL state save is the desktop's whole gap.** One page,
  all 12 scenes (`many_s3e3c`): leanemptynoupns 0.5 = ideal 0.5 =
  ideal32f 0.5; leanemptyns 0.5-0.6; leanemptynoup 0.7; leanempty
  0.7-0.8. draw() queries 17 GL state values (6 of them texture
  bindings), restores them and, on the desktop, runs a timer query;
  the ideal does none of it. A pass inside Pixi's frame can restore
  from Pixi's own state tracking instead (or reset Pixi's state cache
  after it). On the Pixel each query may be a synchronous round trip
  (inferred); the s3e3 page's `save` column measures it.
- **The timed window leaves the upload call's CPU out.** page.ts's
  time() times draw() and sync(); building the records, the row compare
  and the copy into the transfer buffer run before the window opens.
  On the desktop that call takes 0.1-0.8 ms of main-thread time, moving
  or at rest (at rest it still builds every record and compares every
  row). The upload's GPU work lands inside the window. The gate counts
  the GPU's time; this main-thread time comes on top.
- **nb:** lean uploads it for the capsule only (tent uploaded it;
  tentv never did).
- **lr 2: skipped.** F9's upsample class reads DEFECT at lr 2, so the
  census would not hold.
- **The clears on the Pixel's ANGLE: unmeasured.** Inferred from
  ANGLE's Vulkan backend: a full, unscissored clear at a render pass's
  start becomes its loadOp CLEAR, and an invalidate inside the open
  render pass becomes storeOp DONT_CARE. The s3e1 page answers it:
  `clears` (idealpt - idealnoclr, the clears over a DONT_CARE load)
  near 0 means ANGLE folds them into the load op, and `fsq - ideal`
  near 0 means a clear costs what a full-screen draw does. On the
  desktop both are within 0.1-0.2 ms.

### Step 3: the gate

1. The lean empty pass within 0.3 ms of the ideal floor on the Pixel:
   **unmeasured.** On the desktop (one page, `many_s3e3c`)
   `leanempty - ideal` is 0.2-0.3 on every scene, and 0.0-0.1 without
   draw()'s save (`ns - ideal`).
2. tentv's census with the lean part (`verdict_s3eleantentv`):
   **holds.** 794 DEFECT, 504 at 0.03 px or more, the same per scene as
   S3d: muse_hash 212/149, muse_default_tw 44/28, def 50/22, fat 23/0,
   ring 35/19, user_tw42.lightpaper 64/42, g41_def_tw42 32/9,
   g41_def_tw64 58/36, g41_ring_tw42 11/4, g41_ring_tw64 40/27,
   g41_user_tw42 55/41, g41_user_tw64 170/127. With D24
   (`verdict_s3eleand24`): the same, line for line.
3. The control's census: **holds.** 0 DEFECT (`verdict_s3ectl`), and 0
   with the lean part (`verdict_s3ectllean`).

### Before and after

The Pixel's label cost (render-sync p50 minus floorall's, ms) against
the 2 ms gate. Before: S3d's Handoff. After, tentv with the lean part:
not run. The desktop beside it (2480x1800): the render sync on one
page minus floor (`many_s3e3`), moving and at rest, and the GPU timer's
p50 (`time_s3etentv`, `time_s3eleantentv`).

| scene | Pixel fit | Pixel tent | Pixel tentv | Pixel tentv lean | desk tentv | desk lean | desk lean at rest | GPU tentv | GPU lean |
|---|---|---|---|---|---|---|---|---|---|
| muse_hash | 38.5 | 10.8 | 7.0 | - | 1.1 | 1.1 | 1.0 | 0.655 | 0.647 |
| muse_default_tw | 22.8 | 10.0 | 7.1 | - | 1.1 | 1.1 | 1.0 | 0.697 | 0.688 |
| def | 24.1 | 10.9 | 8.5 | - | 1.2 | 1.2 | 1.0 | 0.719 | 0.711 |
| fat | 20.0 | 6.7 | 5.7 | - | 0.9 | 0.8 | 0.8 | 0.484 | 0.476 |
| ring | 11.4 | 5.8 | 4.6 | - | 0.7 | 0.7 | 0.6 | 0.323 | 0.315 |
| user_tw42.lightpaper | 15.2 | 6.1 | 5.6 | - | 0.8 | 0.8 | 0.7 | 0.436 | 0.428 |
| g41_def_tw42 | 21.7 | 11.6 | 9.4 | - | 1.1 | 1.1 | 0.9 | 0.732 | 0.724 |
| g41_def_tw64 | 25.4 | 10.7 | 7.4 | - | 1.1 | 1.1 | 1.0 | 0.702 | 0.694 |
| g41_ring_tw42 | 9.6 | 5.0 | 4.8 | - | 0.7 | 0.7 | 0.6 | 0.311 | 0.304 |
| g41_ring_tw64 | 12.5 | 5.1 | 4.1 | - | 0.7 | 0.7 | 0.6 | 0.328 | 0.320 |
| g41_user_tw42 | 14.7 | 6.2 | 4.7 | - | 0.8 | 0.8 | 0.7 | 0.435 | 0.428 |
| g41_user_tw64 | 25.0 | 7.8 | 5.8 | - | 0.8 | 0.8 | 0.7 | 0.433 | 0.426 |
| median | 21.7 | 7.8 | 5.8 | - | 0.9 | 0.8 | 0.8 | 0.484 | 0.476 |

On the desktop the lean part's GPU time is 0.007-0.009 ms under
today's on every scene: the clears and stores it drops are nearly free
there. The desktop cannot stand in for the Pixel's tiler.

### Commands

From the worktree, in PowerShell:
- The gate's phone batch, then its split:
  `& .claude\probes\K1040\s3\s3e_gate.ps1`, then, in
  `.claude\probes\K1040\s3`, `node split.mjs s3e3 out/split_s3e3.md s3e3`.
  The first condition is `leanempty - ideal` (and `leanempty - d32f`);
  the label cost per scene is `out/phone_table_s3e.md`'s s3eleantentv
  column.
- Step 1's floor: `& .claude\probes\K1040\s3\s3e_floor.ps1`, then
  `node split.mjs s3e1 out/split_s3e1.md s3e1`.
- The desktop census: `& .claude\probes\K1040\s3\run_locked.ps1
  -RunArgs @('verdict', '--mode', 'tentv', '--lean', '1', '--tag',
  's3eleantentv')` (add `'--d24', '1'` for D24; leave out `--mode` for
  the capsule control), then `& .claude\probes\K1040\s3\defects.ps1
  s3eleantentv`.
- The desktop timer: the same with `'time'` in place of `'verdict'`;
  `'--rest', '1'` times the row diff at rest, and leaving out `--lean`
  times today's part.
- The desktop split: `-RunArgs @('many', '--tag', 's3e3c', '--variants',
  'ideal,ideal32f,leanempty,leanemptynoup,leanemptyns,leanemptynoupns,empty,floor')`.

### Next

1. With the phone awake and unlocked (the launcher in front, nobody
   touching it), run `s3e_gate.ps1` (six runs, about 15 min), then
   `s3e_floor.ps1` (one page, about 6 min), then both split.mjs lines.
2. Read the gate's first condition from `split_s3e3.md`. If
   `leanempty - ideal` is over 0.3 on any scene, its columns split the
   excess: `lean noup` minus `ideal` is the pass without its upload,
   `save` is draw()'s state queries, and `D store` and
   `leanempty24 - ideal` say whether invalidating the D32F renderbuffer
   costs (if it does, switch D to D24: census-safe). The expected
   excess is the moving upload (S3d: 1.1 ms). Its lever is fewer bytes,
   SAMP's x,y first; dropping draw()'s queries belongs to the live pass.
3. Read the ideal floor from `split_s3e1.md` (`ideal`). If it is over
   1 ms on most scenes, less than 1 ms is left for the drawing, and
   tentv's drawing (1.2-4.4) misses that on every scene. S3f starts from
   that number.
4. Hand S3f the label cost per scene against 2 ms:
   `phone_table_s3e.md`'s s3eleantentv column.
