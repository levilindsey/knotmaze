# K1040 S1: the float64 reference

Ledger K1040, stage S1 of the plan in `docs/design/K1040_junction_field.md`
(F7). One stage: Opus, 2 h cap. Branch `k1040-field`, worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1040-field` (at
master, node_modules joined to the main checkout's). Work only there.
Brief written 2026-10-28 by the coordinating session.

## Why

K1040's design stage chose form B as the junction look's definition (F2):
a pixel's distance to its surface's exposed outline is the minimum of
three terms (side feet with burial, exposed endpoints, rolling-ball
fillets in closed form), and every discrete decision is either
topology-fixed or fades over a stated width (F3). The GPU will evaluate it
in two raster passes: a depth-tested label pass (S3) and a band pass of
strips combined by MAX blending (S4a, S4b).

Before any shader, the definition needs a float64 evaluation on the CPU.
It is the reference every GPU stage is checked against, and it shows on
real scenes and real motion that the definition itself is watertight and
continuous. It also settles five questions the GPU stages depend on.
Levi does not look at this stage.

## Calls that bind

- F1's table: the looks Levi approved and the rule that carries each.
  Where a row is still open (8, sharp or round where two threads split;
  13, K943's crossed pair; 14, the hook; 15, the cap triple's notches),
  follow F2's current choice and keep it a parameter or an input bit.
- Every pop counts (K992, K1000). Between two frames a pixel changes only
  as far as the scene moved it, except inside the fades: D1 the fold (σ),
  D2 the cap (h), D4 the depth tie (0.1·amp), D6 ω, and the overlap gate
  (ovw = 0.05h; a look call, so a parameter).
- The label and the band are a pure function of the frame. Nothing
  carries over between frames.
- The plan and its calls: F7, and the design doc's
  `## Coordinator's calls`.

## What to build

- `src/render/field/form_b.ts`: F2 in float64, pure TS, beside
  `oracle.ts`. It reads `geom.ts`, `depth.ts` and `scene.ts`. Nothing in
  the app imports it. Per pixel it gives:
  - the top surface (surface, chain, s);
  - the distance to the exposed outline and which term won;
  - the band's coverage with aa;
  - for the max decomposition, the strip the winning term belongs to.
    F7's band pass draws one strip per tube edge, fillet arc and dead
    end's cap, reaching W + aa inside its piece and aa outside.
- `test/render/field/form_b.test.ts`, on small fixtures built in the test
  or committed under `test/render/field/`. Pins:
  - each term on a case with a known answer: a straight tube, a T, a Y,
    an acute pair, a dead end, a crossing;
  - the corner's closed form against a numeric rolling ball;
  - each fade swept across its width, with no jump larger than the step
    explains;
  - the max decomposition.

  Keep the file under about 10 s: the merge runs `npm test`.
- A probe driver in `.claude/probes/K1040/s1/` that runs the reference
  over the 12 scenes and the recordings. Commit its source with
  `git add -f`; its outputs go to `.claude/probes/K1040/s1/out/`,
  untracked.

## The five questions (F7)

Settle each by the reference's own checks. Write the answer and its
evidence into Findings.

1. **A surface's z at a pixel.** F2 says the nearest member's. A depth
   test computes the max over the covering pieces, and two segments of
   one chain at equal z tie on draw order (K1033 in `LEDGER.md`). The
   candidates:
   - write F2 in the max form;
   - key the depth test on z − d/K (the cone key): among equal z the
     nearest piece wins, a continuous trade between z and d.

   Decide while building; it changes the definition.
2. **The cap at both ends of a burial pair.** F2 fades B's burial by B's
   ramp. Suppose A's own foot is buried up to s_cap(A) and exposed past
   it, because A's piece becomes its own surface there. Then it flips at
   the cap unless A's ramp also fades it. Decide while building.
3. **D4 in raster form.** The top surface's strip does not know the
   runner-up's z.
   - First count the tie-band pixels per frame on the recordings: pixels
     covered by two surfaces with |Δz| < zt.
   - If only grazing crossings and the K42 cyclic triple (F3 D4) have
     any, the cheaper option wins. The options: tie strips over each
     crossing pair's tie band (K923's switch strips, moved to where
     |Δz| < zt), or a second depth layer under a stencil limited to the
     tie bands.
   - Recommend one, with the counts.
4. **The outer edge's AA.** A strip also covers aa outside its piece. Its
   fragment blends its coverage over the label fetched across the edge
   (K923's fetch across), so no runner-up label is needed. Compute the
   reference's coverage the same way, and say where it differs from exact
   area coverage.
5. **The prototype's stray ink on muse_hash** (F5's caveat, about a dozen
   junctions). Diagnose it against the reference. It is either a
   definition defect, which you fix in form_b.ts, or a prototype defect,
   which you describe for S4.

## The gate

- checks.ts's checks 1-9 and 11 (K868 §6) pass on the reference's ink on
  the 12 scenes.
- label_pops' rule (`scripts/label_pops.ts`, its header) holds on the
  reference over the four recordings. No pixel changes more than the
  motion explains, outside the fades.
- Every term's support lies inside the strips that evaluate it.
- The free-end check (K910, K934) runs on the reference. Report its
  counts per scene.

Report each part with its numbers. A part that fails is a finding, not a
stop: say what fails, where, and why.

## Where things are

- **The design:** `docs/design/K1040_junction_field.md`.
  - F2 is at line 238 and F3 at 350.
  - F6's note on oracle30 is at 584-606, F7 at 607-800 and the Handoff
    at 801.
  - `.claude/probes/K1040/proto.js` holds the prototype and the corners
    in closed form (F2 step 4).
- **oracle30:** `git show k868-s3a:.claude/probes/S3a/oracle30.ts`. F6
  lists what carries over and what does not. It lends the segment
  geometry and s, `depthAt`, the margin framework, the verdict classes,
  TOL, the driver and the PNG writer.
- **`src/render/field/`:**
  - geom.ts, depth.ts, scene.ts and scene_export.ts;
  - checks.ts: `oracleProbe` (line 39), `imageProbe` (51), `runChecks`
    (1705);
  - oracle.ts, the FieldModel: the look reference, not the definition.
- **The 12 scenes** are read-only in the main checkout, at
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\scenes\`.
  - They are def, fat, ring, muse_hash, muse_default_tw, g41_def_tw42,
    g41_def_tw64, g41_ring_tw42, g41_ring_tw64, g41_user_tw42,
    g41_user_tw64 and user_tw42.lightpaper, each a `.json`.
  - The format is `docs/design/K868_s1a_scene_export.md`.
  - muse_hash.j123, .j49 and .tip are the same frame with crops.
- **The four recordings** are read-only in the `k868-s3a` worktree, at
  `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k868-s3a\.claude\probes\S3a\seq13\`.
  - They are `def_drag`, `def_flow`, `muse_drag` and `muse_flow`
    (`.jsonl.gz`, about 25 MB each). `label_pops.ts` takes `--seqdir`.
  - If whole frames at full resolution do not fit the time, run a stated
    subset (label_pops' crops or windows, or frames at a stride) and say
    which.
- **The free-end check** is read-only in the main checkout:
  - `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K900\indep.ts`;
    its header says how it runs and what it counts;
  - `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K934\`;
  - the docs: `docs/design/K900_oracle_holes.md` and `K934_recount.md`.

  Copy what you adapt into `.claude/probes/K1040/s1/`.
- **The dev server,** if a step needs the page: from the worktree, run
  `npx vite --config .claude/probes/K1040/vite.private-cache.config.ts --port 5401 --strictPort --host 127.0.0.1`.
  `label_pops.ts` takes `--port`. Stop the server when you are done.

## Order

Take `Get-Date` at the start and at each milestone, and write the times
into Findings. Append `## Findings` (F1, F2, ...) to this brief as you go.

1. **Read (about 15 min):**
   - F2, F3, F6's oracle30 note and F7's S1 in the design doc;
   - proto.js's corner solve and oracle30's parts;
   - K868 §6 (line 394 of `K868_field_border.md`);
   - label_pops.ts's header, and checks.ts around `runChecks`.
2. **form_b.ts and its pins (about 45 min).** Settle questions 1 and 2
   as you build. Commit.
3. **The 12 scenes (about 20 min):** checks 1-9 and 11, the max
   decomposition, and the free-end check. Commit.
4. **The recordings (about 25 min):** label_pops' rule, and question 3's
   tie-band counts on the same frames. Commit.
5. **Questions 4 and 5 (about 15 min).** Commit.

Then `## Handoff`.

## Rules

- Create only these files:
  - `src/render/field/form_b.ts`;
  - its tests and fixtures under `test/render/field/`;
  - the probe files in `.claude/probes/K1040/s1/`;
  - this brief's Findings and Handoff.
- Edit no existing file under `src/`, `test/` or `scripts/`. Master's app
  keeps its behaviour. `npm test` (tsc included) passes at every commit
  you call done.
- Don't run `npm run build` in the main checkout, and write nothing in
  other worktrees.
- Read code through the shell: `Select-String` finds the lines, and
  `Get-Content <file> | Select-Object -Skip <n> -First <m>` reads them.
  Use the Read tool only for images and for a file you are about to edit.
  Branches can be read without a checkout: `git show k868-s3a:<path>`.
- Commit WIP to `k1040-field` at every milestone, broken or not. Never
  push. Never skip hooks. Use no helpers (no subagents).
- If you time anything, take the machine-wide perf lock first
  (`$env:TEMP\claude-perf.lock`).
  - Write one line in it: owner K1040-S1, start time, what.
  - If someone else holds it, wait inside one blocking command. A lock
    older than 30 min is stale.
  - Delete it after.
- **Stop rule.** Stop when the Order is done or 2 h after your start
  (`Get-Date`), whichever comes first. A compaction is not a stop. After
  one, re-read this brief and `git log --oneline -5`, then go on. When you
  stop:
  1. Commit WIP.
  2. Append `## Handoff` to this brief: what is done, what is next, and
     how to rerun the driver and the pins.
  3. Commit.
  4. Report.
- Your final report ends with `Ledger items` (new follow-ups, residuals,
  decisions for Levi) and K1040's handle fields: owner, branch, last
  commit, evidence, next, brief, env.
