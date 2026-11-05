# K1139 S3b fix: the crest through the fans without seams

Item: K1139 (choice pulses across junctions). Stage: the S3b fix, between
S3b (df30a7f3, Muse batch 16 Run B) and S4. One Claude Opus agent in a
worktree, coordinated by claude session
7301c55b-f743-4e00-a519-883d9aaaaa7c. Written 2026-11-04.

## 1. Why

S3b draws the pulse crest through the junction fans. A fan pixel takes
its NEAREST band's crest, at dG = distJ + tau, over the arms' quiet rows
(the band loop of `junctionField` in `src/render/junction_field.ts`,
about lines 387-467; its CPU twin in `src/render/ribbon/joinery.ts`, from
about line 606). Its numbers passed. Claude's look at its sheets found
four things to fix:

1. **Seams.** Straight lines run through the fan where the nearest band
   switches: the pixels on the two sides read different bands' distJ,
   tau and inward flag, so the crest steps. See
   `.claude/probes/K1139/out/doc/s3b_seams_cross.png` (cross; top row
   the build before S3b, bottom row S3b, four phases) and
   `s3b_seams_x4.png`.
2. **Dark teal wedges** in cross's fan at the third and fourth frames of
   `s3b_seams_cross.png`: wedge-shaped regions darker than the arms
   around them. The cause is not known.
3. **P8 in the fan.** df30a7f3's record: "after 2.6-7.7 on 12 of 15
   bands; above that, single worst points: cross e21 19 (one arm-overlap
   vert), x4 e175 15, x4 e135 59 (a 4-arm centre)". The bound is 4/255.
4. **Lit arms with no band** (P10): x4 node_378 e134 and node_386 e79.
   e134 is a cycle arm, which S4 owns (plan section 5, S4): record it,
   don't fix it. e79 has no recorded cause.

## 2. Read first

- Run B's section of `docs/design/K1178_muse_batch16.md` (from its
  "Run B" heading to the next run's, about lines 92-270): the harness,
  stands, commands, checks and done criteria this stage reuses. Where
  this brief differs, this brief wins.
- df30a7f3's commit message: Run B's record, the k320 ceilings it set.
- The plan, `docs/design/K1139_pulse_junctions.md`: 2.2 (option A: the
  light splits at a fork), 2.6, 4.2 (probes P1-P10), 4.4 (stands and
  hooks), 5 (what S3b and S4 each own).
- The comment above the band loop in `junction_field.ts` (about lines
  387-402). It says why S3b took the nearest band and not a max: past a
  fork's split, a max painted the sibling's at-joint value across this
  band's wedge. The fix must not bring that back.

## 3. Code

- GLSL: `junction_field.ts` (`junctionField`, the band loop);
  `paint_glsl.ts` (the shared crest, `kPulseCrest`, `kPulseCrestQuiet`).
- CPU twin: `ribbon/joinery.ts` (`cpuJunctionField`, its band loop);
  `paint_math.ts` (`kPulseCrest`, `kPulseBandV`, about lines 1463-1517).
- Records: `junction_routes.ts` (`pulseBandRoute`, `assignPulseSlots`,
  `routeCubic`, the arc-true tau from about line 344);
  `ribbon/paint_state.ts` (setPaint's route resolution, about lines
  640-689); `arm_strip.ts` (the quiet rows).
- Tests: `test/render/paint_*.test.ts` (the mirror against the GLSL
  text), `k320_slim.test.ts` (shader length ceilings: JUNCTION 37,050
  after S3b).
- Harness: `.claude/probes/K1139/`. `fan.mjs` (P8 in the fan, P1-P5 in
  full mode) and `ab_s3b.mjs` (the same-state A/B) were committed with
  this brief: Run B left them untracked. Run B's `batch_s3b_*.txt` show
  its commands; copy them with this stage's ports.

## 4. The work

### 4.1 Diagnose, with numbers

Before changing the shader, find out:

- **Which bands meet at each seam**, on cross and x4, then the other
  stands' banded records. Map the winning band per fan pixel (the CPU
  twin over a pixel grid, or a temporary debug view), and the crest step
  across each switch. Name each pair's class: fork siblings past their
  split, bands of different arm pairs crossing, inward against outward,
  shared (a gold block carries it) against drawing.
- **What makes the wedges dark.** At the wedge pixels: the winning band,
  its cov, v, fa and f, whether it is shared, and the fan's base `c`
  against the quiet material `pm`. Candidates to test, not assume: the
  quiet material showing where the crest is low (f = 0 when fb < fa)
  beside arms whose ordinary paint is brighter; a shared band winning
  the pixel, so nothing is drawn where its gold block does not reach; a
  cov below 1 mixing back to `c`.
- **Why the P8 worst points miss**, and why node_386's e79 is lit with
  no band.

Write the findings into the handoff (section 8) before the fix, and
commit.

### 4.2 Fix

One rule, the same in the GLSL and the CPU twin, that makes the crest
continuous across band switches, leaves no dark wedge, and keeps a
fork's wedge clean. The diagnosis picks it. Candidates: a soft
nearest-band blend (weights from each band's distance minus the
nearest's, over a width tied to the pixel or to the band's half width);
blending the crest values and the whitening rather than the materials;
a per-class rule if the classes need different treatment. Keep the added
fan cost small: carry one more candidate through the existing loop, no
second pass over the verts.

Fix the P8 points and e79 as the diagnosis says. e134 stays S4's.

## 5. Checks

Numbers decide whether it works; Claude decides the look. Builds: S3b
(the worktree's base) and the fix; for the sheets only, Run B's strips
of the build before S3b.

- **Seams (new).** In debug view 5's G (the fan's crest), over each
  banded record's fan pixels, count the pixels whose step to a
  4-neighbour is larger than the steepest step the same crest makes
  along its arms at the same zoom and phase, plus 2/255. Leave out the
  band union's anti-aliased rim. The count must read well above 0 on S3b
  at the seams in `s3b_seams_cross.png` (a check that reads 0 there
  proves nothing), and 0 on the fix, or each remaining pixel is named.
- **Wedges (new).** A count that reads S3b's wedges at cross's third and
  fourth frames and 0 on the fix. Define it from the diagnosis, for
  example: fan pixels darker than every band's own paint at that point
  and than the arms' quiet floor, by more than 2/255.
- **Run B's after record, again**, on all five stands: P8 in the fan
  within 4/255 along every band's centreline and within 2/255 on the
  arms (`fan.mjs`), each band's max listed; P1-P5 from the kymograph
  (`fan.mjs <stand> <out> full`); P10, every slot and fallback
  (`bands.mjs`, the hooks); the same-state A/B against master with
  `__knotPinClocks` and `phw=0`, same-build control first, 0 px outside
  banded records (`ab_s3b.mjs`).
- `npm test` green. No golden pin moves: byte_identity, K87, the golden
  dailies, param_codec, and paint_gameplay's `kPulseV`. The k320
  ceilings: raise one only to a measured length, with a dated comment.
- If the fix changes what `.claude/probes/K1139/out/s3b/pixel_batch_plan.md`
  should measure on the phone, update that file and say so.

## 6. Sheets for Claude's look

- `out/doc/s3b_fix_<stand>.png` for cross, src and x4: eight phases a
  row (`sheet.mjs`, 8 columns, as in `batch_s3b_final.txt`), rows
  before S3b, S3b, fix. The before-S3b row: Run B's strips under the
  main checkout's `.claude/probes/K1139/out/s3b/today/` (copy them).
- `out/doc/s3b_fix_seams_cross.png` and `s3b_fix_seams_x4.png`: each
  fan at 4x, centred on its junction, at the four phases of
  `s3b_seams_*.png`, rows before S3b, S3b, fix (`crop.mjs`, then
  `sheet.mjs`).
- Track the sheets with `git add -f`. No sheet for Levi: Claude shows
  him.

## 7. Setup and limits

- **The worktree** is created from origin/master. Never write into the
  main checkout (`C:\Users\lsl\Repositories\knotmaze`): Muse works there.
  Reading and copying from it is fine.
- **node_modules:** a junction to the main checkout's (`New-Item
  -ItemType Junction -Path node_modules -Target
  C:\Users\lsl\Repositories\knotmaze\node_modules`). Never remove it
  recursively: `(Get-Item node_modules).Delete()` removes the junction
  alone.
- **Ports 5620-5639 only.** Dev servers: `npx vite --config
  .claude/probes/K1139/vite.private-cache.config.ts --port <p>
  --strictPort --host 127.0.0.1`. `K1139_HOST` names the host the
  harness drives. For the A/B's master side, `pwsh scripts/preview.ps1
  -Port <p> -Ref <commit>` serves any commit. Stop your servers when
  done.
- **The perf lock.** GPU pixel probes run in batches through
  `pwsh -File .claude/probes/K1139/run_locked.ps1 -Batch <file> -What
  <text>`, which takes `$env:TEMP\claude-perf.lock` and waits inside the
  one call. Before other heavy work (`npm test`, a build), if another
  owner holds the lock, wait inside one command until it clears (a lock
  older than 30 minutes is stale): Muse may be timing on this desktop.
- `phw=0` on every probe. No phone. Don't start S4: no `kPulseV` change,
  no pre_g23 re-freeze.
- **Commits:** WIP at every milestone (diagnosis, fix, record), broken or
  not, on the worktree's branch. Never push. Don't edit `LEDGER.md` or
  `docs/ledger_notes.md`.

## 8. Stop rule and report

Note the time with `Get-Date` at the start and at each milestone. Stop
when the stage is done or at 2 hours, whichever comes first: commit WIP,
append a `## Handoff` section to this brief (what you found, what you
changed, the numbers, what is left, how to resume), commit, and report.
A compaction is not a stop: after one, re-read this brief and `git log`.

The report: the diagnosis (each seam class, the wedge cause, the P8
points, e79); the rule chosen and why; the tables for S3b against the
fix (seams, wedges, P8 per band, P1-P5, P10, the A/B); the sheet paths;
the commits; and at the end a `Ledger items` list and K1139's handle
fields (owner, branch, last commit, evidence, next, brief).

## Handoff (WIP, 2026-11-04 11:20)

State: diagnosis in progress (4.1); no shader change yet.

- Harness: `.claude/probes/K1139/diag_s3b.mjs <stand> <outDir> [frames]`
  dumps, per banded record and phase, the CPU twin over every device
  pixel of the record's box (per band: dist, tau, v, cov, f, the quiet
  and composed A->B blends; then base, gold, out, the winner) and the
  GPU frames of a 640x420 CSS clip (normal, webs off, dbg 5, dbg 5 webs
  off). It needs the temporary `__k1139diag` hook in
  `src/render/ribbon/joinery.ts` (cpuJunctionField), to be removed with
  the fix. `diag_an.mjs <dumpDir> [outDir]` reads the dumps offline:
  band switches, fan pixels no band covers, and the brief's GPU seams
  count. Batches: `batch_fix_diag.txt`, `batch_fix_diag2.txt` (paths
  are relative to the probe dir for run_locked.ps1).
- Banded records (meta.json): fork has none (its head gets no band).
  Fork siblings, both drawing: cross ji 33 (mnode_48, e150 -> e21 /
  e151), x4 ji 28 (mnode_27, e135 -> e18 / e136), x4 ji 147 (node_378,
  e176 -> e135 / e175; e134 the cycle arm has no band), four ji 28.
  Shared against drawing: x4 ji 125 (node_714), x4 ji 149 (mnode_171),
  src ji 155 (node_116). x4 ji 108 (node_386) has one band, e177 ->
  e178; e79 is lit with no band. No record mixes inward and outward
  bands.
- The cross wedge (s3b_seams_cross.png, frames 3-4) sits 0.3-0.6 world
  left of mnode_48, between the two branch arms (e21 up-left, e151
  down-left), past the split.

### 4.1 findings (S3b, measured on the diag2 dumps, 2026-11-04 11:55)

- SEAMS (diag_an: dbg 5's G steps above T = 5.54/255 inside the web
  footprint, its AA rim eroded). cross ji 33 per phase t0..t7: 4, 0, 0,
  89, 259, 282, 111, 163 (908 in all; the CPU twin's G 1763). x4: ji 28
  1929, ji 125 439, ji 147 489, ji 149 4802, ji 108 0. Three classes:
  - (a) SAME-BAND tau jumps, most of cross's (t3 87 of 89, t4 216 of
    259, t5 265 of 282). On the inner side of a band's turn, past its
    radius of curvature, the nearest point flips between the band's A
    leg and its B leg: tau jumps by about 2d/tan(alpha/2). cross t4: 166
    jumping pixel pairs, the worst dtau 0.44 at d 0.241, a G step of
    158/255 (taujump.mjs). The nearest-band rule cannot see it: it is
    inside one band.
  - (b) BAND SWITCHES between fork siblings: the winner changes along
    the wedge's bisector and the crest steps there, up to 94/255 at
    cross, 22-44 at x4.
  - (c) THE DARK WEDGE. wedge.mjs counts footprint pixels that lie
    between two drawing bands (on band 2's side of band 1 and on band
    1's side of band 2, the feet well apart) and read darker in luma
    than both bands' own composed arm paint at their projections (pc)
    by more than 2/255. S3b: cross ji 33 t0..t7 608, 0, 0, 1, 202, 399,
    669, 1491; x4 ji 28 16130, ji 147 3078. The wedge pixels read the
    QUIET FLOOR, not below it: cross t5 GPU 169.9 against pc 187.5 and
    pq (the quiet A->B blend) 163.4; x4 ji 147 t6 160.1 / 169.8 / 157.0.
    Most are bare (cross t5 355 of 399; x4 ji 147 99 of 106): no band
    covers them, so the quiet base shows beside whitened arms.
    Before S3b the base read the arms' composed rows and the angular
    blend whitened them. The rest are band-edge pixels, cov < 1 mixing
    back to that quiet base. A shared band does not cause it: cross ji
    33 and x4 ji 28 / 147 have no shared band.
- node_386 e79 (x4 ji 108): inferred, not run: e79 is a non-tree
  (cycle) arm, and pulseTree (pulse_path.ts, the tree-children filter
  near line 200) declares bands only to tree children, like e134 at
  node_378. The banded record's base reads quiet rows, so e79's own
  crest shows only in its ribbon. S4's; not fixed here.
- P8's worst points (cross e21 19, x4 e175 15, x4 e135 59): not
  analysed separately; the P8 run after the fix answers whether they
  move.
- Harness additions: `wedge.mjs <dumpDir> [phases] [ji,...]` (the
  count above, GPU and CPU twin); diag_an gained the AA-rim erosion and
  AN_SCALE / AN_CROP for panel crops.
