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

## Findings

Times (`Get-Date`, 2026-10-28): start 22:40:40; step 1 (read) done about
22:49; step 2 (form_b.ts and its pins) done 23:30. The pins are
`test/render/field/form_b.test.ts`: 12 tests, about 0.6 s.

**F1 (question 1, a surface's z): the cone key.** A pixel orders its
surfaces by key = z − d/K, with K = h/zt per piece. A surface's key is
the max over its pieces within h + aa. A fill's key is z(nearer foot) −
h/K, which meets its tubes' keys at their outlines. Among equal z the
nearest piece wins, and the trade between z and d is continuous. The max
form cannot give that: two segments of one chain at equal z tie on draw
order (K1033).
- Evidence: pin D4. Across a tie line, with the mix, the ink moves under
  0.1 per step. Without it (`zt: 1e-9`), it jumps more than 0.5.

**F2 (question 2, the cap at both ends): both ramps.** B's burial of A's
foot weighs ramp_B · selfW_B · ramp_A (`capBoth`). With B's ramp alone,
A's foot flips at s_cap(A), where A's piece leaves the group and becomes
its own surface.
- Evidence: pin D2 + D5. A crossing slides up an END from 2.05 to 4.5 in
  steps of 0.002, which moves the cap ramp and r.
- Over six probes the max |Δink| is 0.0300 per step. That is the step
  times the outline AA's slope (1.5/(2aa)), so the ramps add nothing
  sharper.

**F3 (D1, the fold): the far piece fades whole.** The farther piece of a
same-chain pair within 2σ is weighted ss(σ, 2σ, Δs). The weight applies
to its ink and to its coverage, and the piece labels the top only at a
weight of 0.5 or more.
- Weighting the ink alone left a jump of 0.5 on the hairpin pin. The far
  piece, its ink faded to 0, stayed opaque and hid the near piece until
  the merge at σ dropped it.
- Pin D1, walking at aa/10: 0.5000 before the fix, 0.0748 after (the AA
  ramp explains 0.075).

**F4 (the definition at outlines): premultiplied over, with the endpoint
discs clipped by coverage.** The D2 + D5 sweep found two definition
defects at outlines, each a jump of about 0.5:
- A top surface's edge AA faded to paper instead of over the ink below.
  The over chain's outline crossing the END's band took the ink from 0.5
  to 1.0.
- The endpoint discs (t_a, t_b, V) counted only where their surface
  covered the pixel, which left a hard edge at the outline (0.491 to 1.0).

Now each surface carries a coverage a:
- pieces: selfW · ss(−aa, aa, h − d);
- fills: ω · ss(−aa, aa, |p − q| − r).

Its ink is premultiplied by a, and the endpoint discs are multiplied by a.
The pixel composites, front to back in key order, every surface whose
coverage reaches it: ink = Σ ι_i · Π_{j<i} (1 − a_j). The tie mix blends
the two orders of the first adjacent pair within zt whose order matters.
This is question 4's fetch-across in reference form (F11).

**F5 (D6, ω): the ink moves by at most Δω.** A fill covers at ω and its
arc ink is ω · band2, so pin D6 measures 0.01000 per Δω of 0.01. The
earlier mix, ω · ι + (1 − ω) · below, applied ω twice: its slope reached
2.

**F6 (the strips on the pins): an endpoint disc reaches W + 2aa of arc
length.** On the six pin scenes, every winning term lies in a strip that
evaluates it, with 0 outside:

| Pin scene | Inked pixels |
|---|---|
| tube | 2408 |
| dead end | 1455 |
| crossing | 4396 |
| T | 3142 |
| acute | 2841 |
| Y | 3596 |

An endpoint disc spans the edge strips of every segment within W + 2aa
of arc length from its foot (`nearStrips`). That is five segments at the
pins' 0.2 spacing. A reach of ±1 segment missed 4 Y pixels. A GPU stage
evaluates each disc from those segments' strips, or gives it its own
quad.

**F7 (step 3, the 12 scenes): form B's own corners and crossings pass;
#1 fails at mouths.** `scenes.ts` rasters form B's ink at each scene's
camera (1240x900, cov = ink ≥ 0.5) and runs `runChecks` on it. It adds
its own checks of form B's corners (#2) and crossings (#11), the max
decomposition (F8), the free-end walk and the tie-mix count. The output
is `out/scenes/summary.txt` and one JSON per scene; step 3 finished
about 23:40.
- **Own #2 passes on all 12.** It measures form B's corners; runChecks'
  #2 measures the oracle model's. Every corner circle meets both feet at
  h and is tangent there:
  - max ||t − q| − r| is 3.0e-12 px;
  - max ||t − foot| − h| is 2.0e-13 px;
  - max tangency error is 1.2e-12.
- **Own #11 passes on all 12.** On every scene, 0 crossing centres are
  topped by anything but the over pass. runChecks' #11 passes on 11
  scenes and finds 349 of 350 on muse_hash.
- **#1 passes only on fat.** #1 asks for no ink farther than W·ppu + 1 px
  from the outline. On the other 11 scenes, nearly every failing pixel
  lies in a mouth (within 2h + r + W of a junction). "Faded" means a
  pixel whose winning term carries a fade bit.

  | Scene | Failing px | In mouths | Faded | Unfaded | Deepest F (lim) |
  |---|---|---|---|---|---|
  | muse_hash | 437 | 437 | 292 | 145 | 11.2 (4.2) |
  | muse_default_tw | 257 | 249 | 102 | 155 | 9.2 (3.2) |
  | def | 101 | 97 | 92 | 9 | 8.6 (3.2) |
  | fat | 0 | 0 | 0 | 0 | pass (3.3) |
  | ring | 112 | 112 | 112 | 0 | 10.4 (4.7) |
  | user_tw42.lightpaper | 143 | 120 | 128 | 15 | 12.2 (3.7) |
  | g41_def_tw42 | 37 | 31 | 36 | 1 | 6.1 (2.8) |
  | g41_def_tw64 | 209 | 209 | 128 | 81 | 9.0 (3.7) |
  | g41_ring_tw42 | 28 | 27 | 28 | 0 | 8.3 (3.7) |
  | g41_ring_tw64 | 70 | 69 | 68 | 2 | 8.1 (5.0) |
  | g41_user_tw42 | 141 | 118 | 127 | 14 | 12.2 (3.7) |
  | g41_user_tw64 | 652 | 634 | 387 | 265 | 12.2 (5.0) |

  - **Faded pixels** carry the fold's bit (f1), the cap's (f2) or ω's
    (f8). Inferred, not verified by eye: a cross-fade draws two offset
    outlines, the fading piece's and the one replacing it, so a band can
    sit far from the final outline.
  - **Unfaded pixels** win on tA, tB or arc terms at corners. Inferred,
    not verified: acute crotches, where two arms' bands converge.
  - The deepest sites, with term, chain and arc position, are in each
    scene JSON's `check1deep`.
- **runChecks on form B's ink:**
  - #8 passes on all 12.
  - #3 passes on all but muse_hash, where the Hausdorff distance is
    2.46 px.
  - #6 fails on 5 scenes:

    | Scene | Max end error | Ends off by more than 0.5 px |
    |---|---|---|
    | muse_hash | 13.67 px | 17 |
    | g41_user_tw64 | 15.82 px | 5 |
    | g41_def_tw64 | 7.76 px | 3 |
    | def | 0.89 px | 1 |
    | g41_ring_tw64 | 0.59 px | 1 |

  - #7 fails on 3 scenes: muse_hash (21 breaks), g41_def_tw64 (1) and
    g41_ring_tw64 (3).
  - #4 fails on 11 scenes, with max |2h′ − 2h| from 0.13 to 0.90 px
    against a tolerance of 0.05.
  - #5 and #9's walks fail on 11 scenes, and #9's sections on 5 scenes.
  - None of these failures is diagnosed.
  - On muse_hash the oracle's own base fails too: #2-#7, #9 walks, #11,
    #14 and #16 (K900's `checks_ab.log`).
- **Free ends.** The walk combines K900's side walk with K934's
  `exitsBoth`, and `.runs ≤ 1` counts as a free end. It is not K900's
  census, so the two columns are not like for like, and no free end was
  checked by eye.

  | Scene | Form B | Oracle (K900 `indep_now.log`) |
  |---|---|---|
  | muse_hash | 118 | 108 |
  | muse_default_tw | 134 | 11 |
  | def | 113 | 20 |
  | fat | 0 | 0 |
  | ring | 23 | 7 |
  | user_tw42.lightpaper | 99 | 4 |
  | g41_def_tw42 | 80 | 6 |
  | g41_def_tw64 | 115 | 64 |
  | g41_ring_tw42 | 19 | 4 |
  | g41_ring_tw64 | 14 | 11 |
  | g41_user_tw42 | 98 | - |
  | g41_user_tw64 | 58 | - |

  - Every free end is at a junction, except one "other" on ring and one
    crossing on g41_ring_tw64.
  - Inferred, untested: #1's mouth pixels and these free ends are one
    mechanism, the short second outline a fade leaves.
- **Tie-mix pixels (F_TIE) per scene:**

  | Scene | Tie-mix px |
  |---|---|
  | muse_hash | 6357 |
  | muse_default_tw | 52 |
  | def | 91 |
  | fat | 2 |
  | ring | 472 |
  | user_tw42.lightpaper | 0 |
  | g41_def_tw42 | 0 |
  | g41_def_tw64 | 1092 |
  | g41_ring_tw42 | 0 |
  | g41_ring_tw64 | 830 |
  | g41_user_tw42 | 0 |
  | g41_user_tw64 | 1447 |

**F8 (the max decomposition on the scenes): edge strips need mitres, and
discs need quads.**
- **Before.** With plain rectangles, ring's strips missed about 9,000
  band pixels. On the convex side of a turning vertex, a band pixel's
  nearest point is the vertex, which lies outside both segments'
  rectangles.
- **The mitre.** Each edge strip now runs past its ends by
  (h + aa)·tan(φ/2), where φ is the turn there, capped at 80°. Across the
  thread it spans from (h − W − aa)·cos(φ/2) to h + aa (`turnTan`,
  `inEdgeStrip`). This changes only the strip test, not the ink. Ring's
  misses fell to 7, and the six pin scenes still show 0.
- **What is left.** At most 0.14% of the inked pixels on any scene fall
  outside their term's strips:

  | Scene | Misses | Inked px | By term |
  |---|---|---|---|
  | muse_hash | 143 | 222140 | tA 63, tB 79, V 1 |
  | muse_default_tw | 76 | 175707 | tA 41, tB 35 |
  | def | 27 | 178879 | tA 15, tB 9, V 3 |
  | fat | 0 | 172910 | - |
  | ring | 7 | 104062 | V 7 |
  | user_tw42.lightpaper | 25 | 112010 | tA 9, tB 16 |
  | g41_def_tw42 | 9 | 124023 | V 9 |
  | g41_def_tw64 | 76 | 167008 | tA 39, tB 37 |
  | g41_ring_tw42 | 0 | 69883 | - |
  | g41_ring_tw64 | 2 | 97161 | tA 1, V 1 |
  | g41_user_tw42 | 24 | 111994 | tA 9, tB 15 |
  | g41_user_tw64 | 209 | 148315 | tA 87, tB 122 |

  Every miss is an endpoint disc (tA, tB) or a V disc that reaches
  outside the tube (d > h + aa), beyond every edge strip. A GPU stage
  gives each disc its own quad, as F6 says.

**F9 (step 4, the recordings): label_pops' rule fails at a few junctions
and crossings.**
- **The probe.** `pops.ts` applies label_pops' rule to form B's ink on
  the four S3a recordings. It uses the rule as `scripts/label_pops.ts`'s
  header defines it:
  - TOL 32/255;
  - explained both ways within local motion + 1 px;
  - RHO1 and RHO2;
  - AMIN 4 px, 8-connected;
  - the first frame's camera;
  - frames that repeat the last kept frame are dropped.
- **Exclusions.** A pixel with any fade bit in either frame is excluded,
  as the rule's "outside the fades" says. It is counted by its fade bits.
- **The subset.** Three windows of 4 consecutive kept frames, at 0.2, 0.5
  and 0.8 of each recording's 41 kept frames. That is 9 pairs and 12
  frames per recording. A run over every kept frame (`out/pops_full/`)
  started at 23:47; see the Handoff.
- **Where.** A pop is classed by its centroid:
  - a crossing, by angle, if within 3h of a crossing centre;
  - else a junction, if within 2h + W + 3h of one;
  - else other.

| Recording | Inked px | Pops (px) | Where | Unexplained px outside fades | Inside fades, by bits | Max motion |
|---|---|---|---|---|---|---|
| def_drag | 124k | 2 (13) | 2 junction | 20 | f1 310, f8 35, f9 13, f2 2, f3 2 | 0.79 px |
| def_flow | 124k | 8 (101) | 8 junction | 156 | f1 1342, f8 340, f9 178, f2 84, f3 14, f6 12, f4 3 | 1.05 px |
| muse_drag | 167k | 1 (4) | crossing 60°+ | 48 | f1 201, f6 73, f2 66, f8 55, f9 29, f3 28, f4 10, f7 9, f5 4, f13 1 | 5.13 px |
| muse_flow | 167k | 4 (61) | 1 junction, 3 crossing 60°+ | 208 | f1 648, f2 436, f6 267, f3 161, f8 125, f7 89, f4 54, f5 18, f9 14 | 0.67 px |

- **The gate fails.** 15 pops in 36 pairs, and the gate's "label_pops'
  rule holds" does not.
- **The pops cluster at about six sites** (world points in each JSON's
  `pairs[].pops[].at`):
  - def_drag: one junction, near (25.0, 9.0);
  - def_flow: two junctions, near (26.0, 1.1) and (25.1, 30.3 to 31.0);
  - muse_drag: one crossing, at (34.9, 6.7);
  - muse_flow: a crossing at (22.9, 10.7) twice, a crossing at
    (23.0, 23.8) and a junction at (22.2, 2.6).
- **Not yet done:** cropping each site and naming the term that changes.
  Inferred, untested: the junction pops and the in-fade pixels share F7's
  mouth mechanism, a fade's second outline moving faster than the motion
  explains.

**F10 (question 3, the tie band): ties sit at crossings of every angle;
recommend tie strips for every crossing pair.** The counts come from the
same 12 frames per recording:
- The tie band is the pixels where two or more surfaces cover and the top
  two have |Δz| < zt.
- The tie mix is the pixels the mix blended (F_TIE).

| Recording | Tie band px per frame | Share of inked | Tie band by class, summed over 12 frames | Tie mix px per frame |
|---|---|---|---|---|
| def_drag | 77-81 | 0.06% | crossing 60°+ 947 | 80-99 |
| def_flow | 89-121 | 0.1% | crossing 60°+ 986, 30-60° 212 | 91-107 |
| muse_drag | 9704-10033 | 5.9% | crossing 60°+ 97260, 30-60° 15368, <15° 1560, 15-30° 336; junction 3500 | 6280-6481 |
| muse_flow | 9721-10042 | 5.9% | crossing 60°+ 97166, 30-60° 15679, <15° 1510, 15-30° 816; junction 3638 | 6296-6468 |

- **The brief's condition fails.** Ties are not limited to grazing
  crossings and the K42 cyclic triple. Every recording has them at
  crossings of 30° or more, and muse has about 10,000 tie pixels per
  frame.
- **Inferred, not verified: why.** Passes whose depth tents sum to near
  cancel (tight twists, neighbouring crossings: CLAUDE.md's "contributions
  SUM") bring |Δz| under zt at ordinary angles.
- **The class is proximity, not the tied pair's identity.**
  - Def's crossings are sparse, so its ties do sit at crossings of 30° or
    more.
  - On muse, about 97% of tie pixels lie within 3h of a crossing centre.
    Its crossings are dense, so that split is soft.
  - About 300 px per frame lie near junctions instead.
- **Recommendation: tie strips, built for every crossing pair whose
  |Δz| < zt anywhere in its overlap, not only grazing ones.**
  - The CPU knows both passes' z along arc length, so each pair's tied
    interval is a 1D scan per crossing. The strip covers the two tubes'
    overlap over that interval.
  - The fragment cost scales with the tie band: about 100 px per frame on
    def and 10,000 on muse.
  - The second depth layer needs a full extra pass. Inferred, not
    measured: the cone key is computed per fragment, so that pass writes
    depth from the shader and loses early depth rejection. Its stencil
    would also need the tie bands' geometry, which is what the tie strips
    are.
- **What flips it.** S2 must log the runner-up surface at each tie pixel.
  The second layer becomes the choice if the ties near junctions (about
  300 px per frame on muse) or three-way ties turn out not to be crossing
  pairs. The tie mix blends only the first adjacent tied pair (F4).
