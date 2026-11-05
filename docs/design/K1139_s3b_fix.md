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
  them.

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

## Handoff (stopped 2026-11-04 12:30, before the 12:47 cap: no time to build and measure a second rule)

State: 4.1 diagnosed with numbers; 4.2 NOT done. One rule was built in
the GLSL and the CPU twin (fix1, d5fb1f62), measured and backed out
(db172cb), because it fails the seams, the wedges and k320. The branch
head's shader and twin are S3b's again, plus the temporary diag hook,
so merging it ships no behaviour change. `npm test` on db172cb4: green
(212 files passed, 2 skipped; 2831 tests passed, 9 skipped; 12:17-12:19,
after the perf lock was free). Not run: P8, P1-P5, P10, the A/B and the
sheets (section 6), all of which wait for a passing rule.
The sections below are in the order they were written; "Resume" at the
end is the next step.

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
  AN_SCALE / AN_CROP for panel crops; `taujump.mjs <dumpDir> <ji>
  <phase>` (class a's pairs; re-run at the stop on diag2's cross t4: 166
  pairs, worst dv 158 at dtau 0.44, d 0.241) and `grid.mjs` (a dump's
  per-pixel values over a box).

### fix1 measured (d5fb1f62, 2026-11-04 12:05): it FAILS both checks

fix1 is d5fb1f62's rule: two-leg feet (wf), a second candidate blended
by w2 = max(soft, bt * tg), the wedge cover cw = max(bCov, bt) (bt =
the side test times smoothstep(0.3, 0.7, sep)). Dumps
`batch_fix_fix1.txt` (scratchpad `s3bfix\fix1\{cross,x4}`), same
harness as diag2.

| seamG (GPU, dbg 5) | S3b (diag2) | fix1 |
|---|---|---|
| cross ji 33, t0..t7 | 4, 0, 0, 89, 259, 282, 111, 163 | 96, 0, 0, 171, 955, 1548, 830, 296 |
| cross ji 33, all | 908 (CPU 1763) | 3896 (CPU 8037) |
| x4 ji 28 | 1929 | 6213 |
| x4 ji 125 | 439 | 1771 |
| x4 ji 147 | 489 | 5128 |
| x4 ji 149 | 4802 | 11626 |
| x4 ji 108 | 0 | 0 |

Most of fix1's seams are SAME-BAND (cross t4 932, t5 1540, t6 818 of
them; fork siblings 4-23 a phase), so they are not the old tau jumps
moved: the rule itself makes them. The worst switch step at cross fell
94 -> 41/255. x4 ji 125 / 149 add shared/drawing steps (13-95 and
48-200 a phase); x4 ji 147's worst switch step reads 97.

| wedgeG (GPU) | S3b | fix1 |
|---|---|---|
| cross ji 33, t0..t7 | 608, 0, 0, 1, 202, 399, 669, 1491 | 539, 52, 52, 51, 167, 339, 692, 1537 |
| cross ji 33, all (CPU) | 3370 (9922) | 3429 (5536) |
| x4 ji 28 (CPU) | 16130 (6049) | 15549 (4159) |
| x4 ji 147 (CPU) | 3078 (3369) | 539 (152) |

Cross t5 luma in the wedge: GPU 188.9 against pc 200.5 (S3b 169.9
against 187.5): lighter, still below both arms.

Hypotheses (inferred, not tested):
- H1, the same-band seams: the soft rules hold HARD SWITCHES. The side
  test in bt is binary (s1p s1q > 0 and s2p s2q > 0), and it gates cw
  and w2's bt * tg term, so kFanPulseV = v * cw steps wherever the test
  flips outside a band's cover; the second candidate also swaps when
  the 2nd and 3rd nearest bands tie (x4, forks), stepping v by w2 (v2 -
  v3) while the nearest band stays the same; and the soft ramps'
  denominators fall to pxW near a centreline. Attribute by disabling
  bt (GLSL only: the seams are counted on the GPU) and then wf.
- H2, the wedge stays dark: the cover whitens the bare quiet base c by
  f * cw with bt < 1 and tg <= 0.5, so it stays below the composed pc.
  The fill likely needs the arms' quiet blend as its base (pm), not c.
- H3, x4 ji 28's GPU wedge count is several times the CPU twin's in
  both builds: maybe cover-strip pixels in the footprint mask (strip
  records use their own reach/base); not checked.

### Attribution (GLSL-only variants of fix1, 2026-11-04 12:10-12:16)

The seams are counted on the GPU's dbg 5, so each variant changed the
shader alone (the CPU twin's columns are not comparable) and was dumped
through run_locked.ps1 like fix1.

- Side test off (bt = 0; `batch_fix_nobt.txt`): dbg 5 changed in 396 to
  569 px a phase (the wedge, G by up to 196/255; `imgdiff.mjs`), and the
  seam count did not move by one pixel: cross 96, 0, 0, 171, 955, 1548,
  830, 296, exactly fix1's. H1's side-test part is FALSE: the seams are
  not where bt acts.
- Both soft denominators floored at 0.5 reach (`batch_fix_floor.txt`):
  cross 69, 0, 0, 138, 826, 1412, 777, 267 (3489 against fix1's 3896);
  x4 ji 28 5851 (6213), ji 125 2041 (1771), ji 147 5636 (5128), ji 149
  11759 (11626), ji 108 0. The floor part of H1 is false too.
- fix1 does not make the worst step smaller either. diag_an's maxStepG
  (the worst GPU G step a phase, /255), S3b -> fix1:

  | record | S3b t0..t7 | fix1 t0..t7 |
  |---|---|---|
  | cross ji 33 | 6, 1, 0, 92, 153, 62, 64, 23 | 32, 3, 2, 16, 30, 53, 77, 73 |
  | x4 ji 28 | 0, 9, 26, 28, 29, 29, 28, 27 | 43, 40, 16, 15, 17, 92, 137, 82 |
  | x4 ji 125 | 15, 10, 5, 0, 3, 15, 16, 15 | 35, 35, 27, 0, 12, 35, 35, 34 |
  | x4 ji 147 | 13, 12, 10, 56, 56, 38, 56, 21 | 43, 40, 30, 33, 26, 33, 40, 35 |
  | x4 ji 149 | 40, 25, 18, 19, 44, 44, 44, 44 | 47, 48, 47, 18, 35, 44, 48, 48 |

  Only cross t3-t5 (the leg flips) fell; elsewhere it rose. The CPU
  twin's worst same-band step (maxSame) fell at cross (up to 153 -> up
  to 47) and x4 ji 28 (29 -> 19) and stayed about 60 at x4 ji 147.
- And the seams are not a soft field over T: they are RAYS.
  `out/doc/s3b_fix1_cross_panels.png` (diag_an
  panels, cross ji 33; rows S3b t5, fix1 t5, S3b t4, fix1 t4; panels
  GPU, GPU webs off, CPU twin, winner, dbg 5 G, seams) shows fix1's
  whitening as a star of white spokes out of the joint, in the GPU and
  the CPU twin alike, where S3b shows one bright wedge with a few short
  seam lines. It reads worse than S3b, not better.
- Inferred from the sheet: the rays are the FAR feet's own jumps. A
  nearest point on a polyline jumps on the inner side of every vertex,
  by about 2 d tan(theta_i / 2), so by more the farther the pixel is.
  S3b used only the nearest foot of all, whose one big jump is the leg
  flip (class a). fix1 also reads the far leg's foot (wf) and the
  second band's (w2), at distances where their vertex jumps are large,
  and mixes them in at weights up to 0.5 over wide areas (BAND_SOFT 3 *
  d): each far vertex draws a ray.
- Tested for wf (12:24-12:28): fix1's GLSL with `wf = 0.0`, the twin
  left fix1's (`batch_fix_nowf.txt`; dbg 5 changed in 3540-4436 px a
  frame against fix1). seamG all phases, S3b / fix1 / nowf:

  | record | S3b | fix1 | nowf |
  |---|---|---|---|
  | cross ji 33 | 908 | 3896 | 1971 (19, 2, 2, 91, 670, 871, 160, 156) |
  | x4 ji 28 | 1929 | 6213 | 2487 |
  | x4 ji 125 | 439 | 1771 | 439 |
  | x4 ji 147 | 489 | 5128 | 623 |
  | x4 ji 149 | 4802 | 11626 | 4802 |

  The far leg's foot made all of fix1's added seams at the
  shared/drawing records (ji 125 and 149 read S3b's counts and worst
  steps exactly), about 97% of the excess at ji 147, 87% at ji 28 and
  64% at cross. `out/doc/s3b_fix1_nowf_cross_t5.png` (rows S3b, fix1,
  nowf at cross t5, same panels; nowf's CPU panel is fix1's twin):
  nowf keeps fewer, fainter spokes. The rest of the excess (cross 1063
  px, ji 28 558) is the second candidate's blend, w2 (inferred: bt was
  ruled out above, w2's own term was not run).
- So the next rule may blend only quantities that are continuous where
  their weight is above 0. A foot on a sampled polyline is not. Two
  ways: an analytic band (each leg a line plus a circular arc for the
  corner, whose foot is continuous everywhere but at the arc's centre),
  or no far feet at all (blend the crest VALUES of the nearest foot
  across the leg flip and the band switch only, with ramps that vanish
  before the next discontinuity). The winner map also shows the fork
  siblings' stripes on their shared arrival arm (the two centrelines
  coincide, so the winner alternates): their two taus there must agree
  by construction.

### Resume

1. Start from the head (S3b's shader plus the harness) for a new rule;
   `git show d5fb1f62` is fix1, two-leg feet, a second candidate and
   the wedge cover in both GLSL and twin; `git revert db172cb` restores
   it whole.
2. Serve the worktree: `npx vite --config
   .claude/probes/K1139/vite.private-cache.config.ts --port 5620
   --strictPort --host 127.0.0.1` (ports 5620-5639).
3. Dump: copy `batch_fix_fix1.txt` with a new out dir, then `pwsh -File
   .claude/probes/K1139/run_locked.ps1 -Batch <file> -What <text>`
   (cross + x4, 8 phases: about 3 minutes under the lock).
4. Count, from `.claude/probes/K1139/`: `node diag_an.mjs <dump>\cross -`
   (and `x4`) for the seams, `node wedge.mjs <dump>\cross` (and `x4`)
   for the wedges, `node imgdiff.mjs <dumpA> <dumpB>` for a same-stand
   frame diff. The S3b reference is `batch_fix_diag2.txt`'s dump; all
   five dumps (diag2, fix1, nobt, floor, nowf) sat in the session
   scratchpad, which does not outlive it, and every batch file names an
   absolute out dir there: re-dump S3b from a copy of its batch file
   with an out dir of your own.
5. Then the rest of section 5 (P8, P1-P5, P10, the same-state A/B
   against master), section 6's sheets, k320 (fix1 measured 40,147
   against the 37,100 ceiling: fit or raise to a measured length with
   a dated comment), and remove the `__k1139diag` hook (joinery.ts, the
   K1139Diag interface and the DG block) with the fix.

## Stage 2 (2026-11-04): a pulse rule continuous by construction

A new agent runs this stage in a fresh worktree from master, with this
branch cherry-picked onto it. Sections 1-8 hold except where this
section says otherwise: read 1, 3, 5, 6, 7 and the Handoff first.

### S2.1 What is settled

- **T stands as section 5 defines it** (the arm's steepest step +
  2/255: 5.54/255 at cross). Claude looked at S3b's 2x crops of cross
  t4 and t5: every step above T sits on a crease that reads in the GPU
  render (the leg-flip crease up-left of mnode_48; at t4 the whitened
  band's sharp left edge), and the area below T reads smooth.
- **The rule this stage builds to.** Every quantity the fan's colour
  depends on is continuous in the pixel's position wherever its weight
  in the colour is above 0: each band's tau, shift, material read (the
  A-to-B smoothstep), crest, whitening and cover; the weights across
  bands; the crotch fill; the base; and `kFanPulseV` (debug 5, which
  the seam count reads). These break it (measured in S3b and fix1):
  - a nearest foot on a polyline: it jumps on every vertex's inner
    side (by about 2 dist tan(theta_i/2)), and it flips between the
    legs where the turn's radius (about d tan(alpha/2), `routeCorner`)
    is smaller than the reach, so the medial axis enters the band
    (class (a));
  - a winner across bands: S3b's nearest band (class (b)) and its
    shared/drawing tie (class (c));
  - a binary side test (fix1's H1, which was also false);
  - far feet: fix1's rays, where a second leg's foot carried its own
    vertex jumps wherever its weight was above 0;
  - a cut inside a formula: check S3b's whitening `f` at
    `fa >= 0.999`, which steps unless `fb` equals `fa` there.
- **The looks to keep:** Levi's "A, it splits" and "Straight through,
  no dim moment"; no dark wedge between two lit siblings (Claude's
  look); nothing changes outside banded records (the A/B's 0 px).

### S2.2 The design

**(a) One band: a pivot param.** Keep the cover from the true distance
(it is continuous). Replace the band's nearest-foot tau and shift:
- P is where the band's two end normals meet, on the turn's inner
  side. tau(p) is the centreline's tau where the ray from P through p
  meets the polyline: find the segment with cross-product sector tests
  (no atan), then interpolate tau and shift by
  u = cross(p-P, v_k - P) / cross(p-P, v_k - v_(k+1)). Beyond an end
  ray, project onto that end segment's line, extended along its arm
  (never the nearest foot over the whole polyline): on the end ray both
  give the end's tau, since P lies on that end's normal.
- It is singular only at P and needs the polyline star-shaped from P
  (each ray meets it once). The CPU checks both when it builds the band
  (P at least the reach from the polyline; the angle from P monotone
  along it), and the rule says what a band that fails either gets.
- Its cost is compression: tau's gradient grows toward P by
  R_P / (R_P - reach), R_P being P's distance from the centreline (3.4
  at alpha = 90 degrees and 13 at 45 when the ends sit where the two
  arms' ribbons part). On the centreline it equals today's tau, so P8
  should not move. Measure the steepest crest step inside every band
  against T first. P moves out as the ends move along the arm
  stretches, so take them as far as the band runs. If a sharp band
  still steps above T, give it a line-arc-line turn of radius at least
  1.5 reach, distance and foot in closed form: no pivot and no leg
  flip, but it moves the band, so it must still cover the joint and
  its tangent length R cot(alpha/2) must fit inside `capA`/`capB`.
- Straight-through bands: the end normals are nearly parallel and P
  runs off; take the parallel-projection limit there, continuous
  across the switch between the two.

**(b) Several bands: no winner.** Material: each drawing band mixes in
by its own cover, in a fixed order. Whitening: the max over drawing
bands of whitening x cover; `kFanPulseV`: the max over all bands,
shared ones included, of crest x cover. On a fork's shared arrival
stretch both siblings cover the same pixels, and each pivot param
tilts its crest toward its own P: look at that front on the sheets (a
chevron or a smear is a finding). Look too for the ghost the S3b
comment warns about: in the lens past the split, the sibling's
at-joint value painted across this band.

**(c) Shared against drawing (x4 ji 125, ji 149).** First find where
the seams sit: at the switch, or inside the gold blocks. A drawing band
yields to a shared band's gold by a continuous weight (a ramp in
d_shared - d_draw a few px wide, say), never by a nearest test; check
its edge on the sheets. The gold blocks read their crest through the
same nearest-foot tau: if seams sit inside them, the pivot param
applies there too, in banded records only unless the A/B shows no
pixel moving elsewhere.

**(d) The crotch between two lit siblings** (cross, 0.3-0.6 world left
of mnode_48, between e21 and e151; x4 ji 28 and ji 147). Fill it from
the siblings' own whitening, never bare quiet base: the fill meets
each band's AA edge without a dim valley and fades continuously where
the crotch borders an unlit arm. The crotch lies on the outer side of
both siblings' turns (inferred: check), so each sibling's tau extends
into it. A candidate: f = max(f1, f2, w min(f1x, f2x)), with fNx band
N's whitening at its tau without the cover and w a continuous crotch
weight (from the two bands' signed distances, not a binary side test).
An angular-sector fill mix(f1, f2, t) steps where the sector's edge
crosses a band's partial cover unless it ramps to match.

### S2.3 Order of work

Times run from your `Get-Date` at the start. Commit WIP at every
milestone, broken or not.
1. **Setup, 15 min.** The cherry-pick (the launch prompt), the
   node_modules junction (section 7), a server on 5620-5639, and an S3b
   re-dump (Resume steps 2-4) from copies of `batch_fix_diag2.txt` with
   out dirs under `.claude/probes/K1139/out/s2/` in your worktree
   (untracked; never a scratchpad, which dies with its session).
2. **(a), by 1 h.** GLSL and the CPU twin; cross's seams by class
   (`diag_an.mjs`) and the worst crest step inside each band. If
   cross's class (a) is not 0 (or every remaining pixel named and
   explained) by 1 h, go to step 5 with the numbers.
3. **(b), (c), (d), by 1 h 30.** Seams and wedges on cross and x4.
4. **The rest:** section 5 (P8, P1-P5, P10, the A/B, `npm test`, the
   pins, k320), section 6's sheets, and the removal of the
   `__k1139diag` hook (joinery.ts, the K1139Diag interface, the DG
   block; git keeps it for a later stage's dumps).
5. **The stop:** done or 2 h, whichever comes first. Neither a
   compaction nor context size is a stop: after one, re-read this
   section and `git log`. Commit WIP, append `### Stage 2 handoff` at
   the end of this section (what passed, the numbers, what is left,
   where the dumps are, how to resume), commit, and report as section
   8 says, with env among the handle fields.

### S2.4 Residuals to record, not chase

- x4 ji 28's GPU wedges were 2.7x the CPU twin's (cover strips in the
  footprint mask? not checked): the first suspect if (d) leaves wedges
  only on the GPU.
- e79 (node_386) and e134 (node_378) are lit with no band: S4's
  (pulseTree declares bands only to tree children).
- The P8 worst points (cross e21 19, x4 e175 15, x4 e135 59 against
  4/255): measure them on the fix and say whether this stage moved
  them.

### S2.5 Limits

Section 7's, and: your worktree is your own; never write into the main
checkout (Muse runs there) or this branch's old worktree
(`.claude/worktrees/agent-abc94fe39cb25940c`); never push; no
subagents; no edits to `LEDGER.md` or `docs/ledger_notes.md`.

### Stage 2 handoff

Stopped 2026-11-04 at about 14:50, before the 15:15 cap, after (a) to
(d) and the hook removal. Section 5 and section 6 did not fit. Agent
a70924906f47e96b0 worked on branch `worktree-agent-a70924906f47e96b0`
(`.claude/worktrees/agent-a70924906f47e96b0`).

The commits:
- 38784fca: (a), the pivot param;
- 9d8edfe4: (a) measured;
- 8ec4c30d: (b) and (c);
- c4f5b9d2: (d), the crotch fill. This is the last commit with the
  `__k1139diag` hook.
- b40392d7: the hook removal. This handoff follows it.

**The rule as built.** The GLSL is junction_field.ts's band loop. Its
CPU twin is cpuJunctionField in joinery.ts.
- **(a)** Tau is read from a pivot P (`pulsePivot`). P is the meet of
  the normals at the band's two L-ends (the ends of its straight legs at
  the corner). It sits in a 4-texel band header: R2 is P as (X, Y, w),
  R3 is the side line (a, b, c). A straight-through band takes the
  parallel limit, w near 0.
- **(b)** No winner. kFanPulseV is the max over bands of crest x cover.
  Each drawing band mixes its own material in by its weight, in block
  order. The whitening, the max over drawing bands of f x weight, is
  applied once, to the composite.
- **(c)** A drawing band's weight is its cover x (1 - smoothstep(0,
  3 px, d_draw - d_shared)). It is 1 on a tie and 0 once a shared band's
  gold is 3 px nearer.
- **(d)** The crotch fill. For two drawing bands that share an arm, the
  fill is wW = max(wW, smoothstep(0, reach^2, -sd_r sd_s fl) x (1 -
  smoothstep(0.52, 1.56, d_r + d_s - 2 reach)) x min(f_r y_r, f_s y_s)),
  where:
  - sd is a band's distance, signed by the cross product at its
    nearest-foot segment;
  - fl is +1 or -1 by the shared arm's direction;
  - each f is the band's whitening at its own tau, without the cover;
  - y is (c)'s yield.

**Measured.** All dumps ran under the perf lock, 8 phases each. Seams
are diag_an.mjs's GPU count (dbg 5's G against T, 5.54/255 at cross).
Wedges are wedge.mjs's dim-valley pixels between lit siblings, as GPU /
twin.

| | S3b | (a) | (b)+(c) | (d) |
|---|---|---|---|---|
| cross ji 33, seams | 908 | 3626 | 1954 | 1954 |
| x4 ji 28, seams | 1929 | 4047 | 3405 | 3405 |
| x4 ji 108, seams | 0 | 0 | 0 | 0 |
| x4 ji 125, seams | 439 | 1631 | 445 | 445 |
| x4 ji 147, seams | 489 | 3120 | 935 | 935 |
| x4 ji 149, seams | 4802 | 6117 | 3990 | 3990 |
| cross, wedges | 3370 / 9922 | | 3505 / 9829 | 2363 / 8670 |
| ji 28, wedges | 16130 / 6049 | | 15505 / 6714 | 15301 / 6451 |
| ji 147, wedges | 3078 / 3369 | | 3579 / 4846 | 2591 / 3814 |

The seams by class, at (b) and again at (d):

| | same-band | fork siblings | shared/drawing |
|---|---|---|---|
| cross | 1833 | 121 | |
| ji 28 | 3309 | 96 | |
| ji 125 | 445 | | |
| ji 147 | 930 | 5 | |
| ji 149 | 3787 | | 203 |

**What passed.**
- (b) took cross's fork-sibling seams from 1282 at (a) to 121. Band
  switches per record fell from 9.1k-9.9k to 1.8k-2.9k.
- (c) took the shared/drawing seams to 0 at ji 125 (from 165) and to
  203 at ji 149 (from 631).
- Tau is continuous across every same-band seam pair: tauan.mjs finds
  no jump (ratio at most 1.05).
- (d) cut the GPU wedges by 33% at cross and 28% at ji 147. The seams
  stayed unchanged, as they should: (d) does not touch kFanPulseV.
- `npm test` passes after the hook removal, typecheck included: 213
  test files (2 skipped) and 2839 tests (9 skipped).
- k320: JUNCTION_FRAG went 37,050 (S3b) -> 39,137 (a) -> 39,238 (b, c)
  -> 40,097 (d); the budget is now 40_150. junction-field and its
  explore variant compile cold once.

**What failed.**
- **Seams are still above S3b** at cross (1954 against 908), ji 28 and
  ji 147. Nearly all are same-band compression ramps. The pivot
  compresses tau toward P, and max |grad tau| reaches 2.61 (cross),
  2.34 (ji 28), 2.65 (ji 147) and 2.39 (ji 149) against the 1.56 that T
  allows. There, T cannot be met by construction. S2.2's fallback for a
  sharp band, a line-arc-line turn of radius at least 1.5 reach, was not
  built.
  - This is a design question for Levi or the coordinator: build the
    turn, or let T scale with the local compression inside a sharp band.
  - ji 125's 445 are such ramps: compression 1.56-1.78 and GPU steps of
    6-7 against T 5.54.
- **ji 28's wedges barely moved** (15505 -> 15301). At its wedge pixels
  the crotch gap d1 + d2 - 2 reach runs mostly 1.2-2, and 3089 px lie
  past 2, beyond (d)'s ramp-out at 1.56. By comparison, cross's runs
  0-1.0 and ji 147's 0.1-0.4 and 0.7-1.5.
  - The untested knobs: a wider ramp-out, or the gap in px.
  - Its GPU wedges are still 2.4x the twin's. This is S2.4's residual,
    not attributed.
- **The cross t5 ghost** at (122, 121) is a 138/255 step at band 1's AA
  edge. The max moved the discontinuity onto a sibling's edge. The
  GPU's edge sits about 1 px ahead of the twin's (inferred: a half-pixel
  offset).

**Deviations from S2.2.**
1. P is the meet of the L-ends' normals, not of ends taken as far as the
   band runs.
2. `arcTrueTau` spreads a steep run's tau over the turn's arc.
3. The CPU checks P at least 1.25 fh from the polyline and the angle
   from P monotone over kA..kB only, not the whole polyline. It adds two
   checks of its own: the sweep under 175 degrees, and the outer bisector
   1.25 fh clear of the polyline. A band that fails any of them gets mode
   0, the nearest foot (`pulsePivot`'s header in junction_routes.ts).
4. There is no line-arc-line turn.
5. A (c) tie keeps drawing, as S3b's tie rule did.
6. The whitening goes onto the composite once.
7. (d) takes its sign from the nearest-foot cross product and pairs
   only bands that share an arm. kFanPulseV is unchanged. The edges
   0.52 / 1.56 are tentative.
8. At fa >= 0.999 the cut is gone. f = (K cr - fa) / max(1 - fa, 1e-3)
   is continuous there: a kink, not a step. It was not measured on these
   stands.

**Risks, not measured.**
- (d)'s sign flips on the extension line beyond a band's end, where the
  nearest foot changes leg.
- At a 4-arm junction, an unlit third arm inside the crotch is whitened.
- ji 28's wide crotch is only partly filled.

**Not run, for time.**
- P8, and its worst points: cross e21 19, x4 e175 15, x4 e135 59.
- P1-P5 and P10.
- The A/B against master (0 px outside banded records).
- Section 6's sheets.

S2.4's e79 (node_386) and e134 (node_378) are unchanged (S4's).

**The dumps** are in `.claude/probes/K1139/out/s2/{s3b,a1,b,d}/{cross,x4}`
(untracked). Each holds meta.json, `t<k>_{n,w,d,dw}.png` and
`r<ji>_t<k>.{u8,f32}`. Their batches are `batch_st2_{s3b,a1,b,d}.txt`.

**To resume.**
1. For new dumps, work on c4f5b9d2's joinery.ts, which has the hook
   that `diag_s3b.mjs` reads (`git show c4f5b9d2:src/render/ribbon/joinery.ts`).
2. Set up env: section 7's node_modules junction, then from the
   worktree `npx vite --config
   .claude/probes/K1139/vite.private-cache.config.ts --port 5620
   --strictPort --host 127.0.0.1`.
3. To dump: `pwsh -File .claude/probes/K1139/run_locked.ps1 -Batch
   <batch> -What "<what>"`. Its lines are `node diag_s3b.mjs <stand>
   <outDir> 8`.
4. Offline, from that folder:
   - `node diag_an.mjs <dir> [outDir|-] [phases] [ji,...]`;
   - `node tauan.mjs <dir> [phases] [ji]`;
   - `node wedge.mjs <dir> [phases] [ji,...]`;
   - `node nbhd.mjs <dir> <ji> <k> <X> <Y> [r]`.
5. Next steps:
   - the compression decision;
   - ji 28's crotch;
   - then section 5 (P8, P1-P5, P10, the A/B) and section 6's sheets.

## Stage 3 (2026-11-04): the compression ruling, ji 28's crotch, the checks and the sheets

A new agent runs this stage in a fresh worktree from master, with
branch `worktree-agent-a70924906f47e96b0` cherry-picked onto it
(`git cherry-pick master..worktree-agent-a70924906f47e96b0`; if a pick
conflicts, stop and report instead of resolving by guesswork).
Sections 1-8 and Stage 2's S2.1-S2.5 hold except where this section
says otherwise. Read 5, 6, 7, Stage 2 and its handoff first.

### S3.1 The compression ruling (Claude, 2026-11-04)

**Let T scale with the local compression; do not build the
line-arc-line turn.** The turn would not meet T either: on an arc of
radius R, tau's gradient at distance d inside the centreline is
R / (R - d), which is 3 at the band's inner edge for S2.2's minimum
R = 1.5 reach, steeper than the pivot's measured 2.34-2.65. Meeting
1.56 would need R of about 2.8 reach, which a sharp joint's
`capA`/`capB` cannot fit and which moves the band off the joint. A
crest that runs round a bend compresses on its inner side, and the
pivot keeps tau continuous there (tauan: ratio at most 1.05 across
every same-band seam pair). T was calibrated on S3b's
discontinuities (S2.1), and it still holds for them.

The seam count from now on:
- A same-band step is a seam when it exceeds T x c, where c is the
  band's compression at that pixel, R_P / (R_P - d), with d the
  pixel's distance from the centreline toward P. c is 1 for a
  straight-through band and for a mode-0 band. Take c from the
  band's header (R2's P) in the twin, so it is exact; never fit it
  from the dumps.
- Same-band steps above T but at most T x c are compression ramps.
  Count them apart, per stand, with the largest c met.
- Fork-sibling and shared/drawing steps get no allowance: above T is
  a seam, as before.
- Per stand, give how many bands fell back to mode 0 (deviation 3)
  and their seams. A mode-0 band keeps the leg flip, and it is the
  one place a turn could still be needed.
- The look decides whether this ruling is right. S3.3's sheets show
  the worst ramps at 2x. If one reads as a crease, say where, and
  Claude rules on the turn after the look.

### S3.2 ji 28's crotch

(d)'s ramp-out ends at 1.56. ji 28's crotch gap runs mostly 1.2-2,
with 3089 px past 2. Try the far edge at 2.5 and at 3.0, in today's
units.
- Measure the wedges (GPU / twin) at ji 28, cross and ji 147.
- Check that the seam counts do not move.
- Check that no unlit arm inside a crotch whitens (the handoff's
  risk, at a 4-arm junction).
- Keep the best edge that removes ji 28's dim valley without
  whitening an unlit arm, or keep 1.56 and say why.
- Measure the fa >= 0.999 kink (deviation 8) on these stands.

### S3.3 The checks and the sheets

- **Section 5 in full:**
  - P8 and its worst points (cross e21 19, x4 e175 15, x4 e135 59,
    against 4/255): say whether Stages 2-3 moved them;
  - P1-P5 and P10;
  - the A/B against master: 0 px outside banded records;
  - `npm test`, the pins and k320.
- **Section 6's sheets, plus 2x crops of:**
  - the worst compression ramp per stand (cross, ji 28, ji 125,
    ji 147, ji 149), each labelled with its c;
  - the cross t5 ghost at (122, 121), with the sibling's edge it sits
    on;
  - ji 28's crotch at 1.56 and at the kept far edge;
  - a fork's shared arrival front (S2.2 (b): a chevron or a smear is
    a finding).
- **The half-pixel suspicion.** The GPU's edge sits about 1 px ahead
  of the twin's at cross t5. Measure the offset, sub-pixel, on one
  straight band edge, GPU against twin. Say whether it explains the
  ghost or ji 28's 2.4x wedges.
- **Record, not chase:** e79 and e134 (S4's); the cold compile of
  junction-field and its explore variant, timed if section 5's k320
  check already times it.

### S3.4 Order of work and stop

Times run from your `Get-Date` at the start. Commit WIP at every
milestone, broken or not.
1. **Setup, 15 min.**
   - Do the cherry-pick, section 7's node_modules junction, and a
     server on 5620-5639.
   - Put c4f5b9d2's `__k1139diag` hook back in a WIP commit for the
     dumps. Remove it again before the end, as Stage 2 did.
   - Fresh dumps of (d) from a copy of `batch_st2_d.txt`, with out
     dirs under your worktree's `.claude/probes/K1139/out/s3/`
     (untracked). Stage 2's dumps stay readable in the old worktree,
     for comparison only.
2. **S3.1 by 45 min:** the classifier in `diag_an.mjs`, then the
   counts on (d).
3. **S3.2 by 1 h 15.**
4. **S3.3:** section 5, then the sheets, under
   `.claude/probes/K1139/out/s3/sheets/`.
5. **The stop:** done or 2 h, whichever comes first.
   - Neither a compaction nor context size is a stop. After one,
     re-read this section and `git log`.
   - Commit WIP, append `### Stage 3 handoff` at the end of this
     section, commit, and report as section 8 says, with env among
     the handle fields.
   - Never push. No subagents. No edits to `LEDGER.md` or
     `docs/ledger_notes.md`.
   - Never write into the main checkout (Muse runs there) or into
     the old worktrees.

### Stage 3 handoff

Agent a8280f4d14ebd8ad1, 2026-11-04, 14:59:47 to 16:25: the stage is
done, inside the 2 h cap. Stage 3
changes no source: `src/` is 944bb761's (Stage 2's final code). The
`__k1139diag` hook went back in for the dumps (a072dc4c, e7dc5fda adds
c and mode) and out again (a5698618). The cherry-pick renamed Stage 2's
commits: 38784fca = ac0cf168 (a), 9d8edfe4 = 5ca8ee2e, 8ec4c30d =
ced3cea3 (b)+(c), c4f5b9d2 = f923140e (d), b40392d7 = 952fe803.
Evidence: `.claude/probes/K1139/` (scripts tracked; `out/s3/` untracked
except `out/s3/sheets/`, added with -f).

Stage 3's commits, oldest first: a072dc4c (the hook back), e7dc5fda (c
and mode in the dumps), e0669c2d (S3.1's classifier), c5bca162 (the
same-band jumps split), 28552345 (far edge 2.5, tried), be7e023b (back
to 1.56), a5698618 (the hook out), d540fabc (S3.3's probes and sheets),
then this handoff's.

**S3.1, the classifier** (`diag_an.mjs`, on fresh (d) dumps,
`out/s3/d/`). T = 5.54/255; a same-band step is a seam above
T max(1, c), c = |w q - Pxy| / |w p - Pxy|; ramps are counted apart.

| record | seams (old rule) | fork / shared | ramps | max c | worst ramp: step/T at (k, X, Y), c |
|---|---|---|---|---|---|
| cross ji 33 | 1599 (1954) | 121 fork | 355 | 1.456 | 1.263 at (0, 138, 110), 1.286 |
| x4 ji 28 | 2025 | 96 fork | 1380 | 1.328 | 1.263 at (3, 180, 117), 1.286 |
| x4 ji 108 | 0 | - | 0 | - | - |
| x4 ji 125 | 445 (all steep) | - | 0 | - | no ramp |
| x4 ji 147 | 162 | 5 fork | 773 | 1.945 | 1.805 at (0, 78, 179), 1.905 |
| x4 ji 149 | 1449 | 203 shared | 2541 | 1.58 | 1.444 at (2, 89, 84), 1.536 |

x4 in all: 4081 (old rule 8775). Mode-0 bands: none. The same-band
seams by class (`diag_an.mjs` ~170: steep = the twin's own tau step
explains it; jump:twin = the twin steps as far; jump:gpu = the twin is
smooth and the GPU leaves it; jump:zero = one side's GPU pulse is 0;
jump:arm = one side is the webs-off frame's; cover = a band's AA edge):

| record | steep | jump:twin | jump:gpu | jump:zero | jump:arm | cover |
|---|---|---|---|---|---|---|
| cross ji 33 | 561 | 540 | 296 | 70 | 6 | 5 |
| x4 ji 28 | 1145 | 237 | 447 | 90 | 5 | 5 |
| x4 ji 125 | 445 | 0 | 0 | 0 | 0 | 0 |
| x4 ji 147 | 13 | 49 | 87 | 8 | 0 | 0 |
| x4 ji 149 | 838 | 1 | 297 | 56 | 8 | 46 |

- The ruling's c misses two things: the arc-true tau rate (1.2-1.56
  where c reads 1) and the band's obliqueness. So "steep" seams pass
  as compression only up to T c, and ramps reach 1.8 T.
- jump:twin was attributed to rule (a)'s ray-hit segment flip: tau
  jumps where the ray from P changes segment.
- jump:gpu at cross t7, box (115-120, 78-83), is unattributed.

S3b against the fix. The old-rule columns are the Stage 2 handoff's
table. S3b's new-rule count is not measured: the rule needs c per
pixel, and only this branch's hook (e7dc5fda) dumps it.

| record | seams, S3b (old rule) | fix (old rule) | fix (new rule) | wedges GPU / twin, S3b | fix |
|---|---|---|---|---|---|
| cross ji 33 | 908 | 1954 | 1599 | 3370 / 9922 | 2363 / 8670 |
| x4 ji 28 | 1929 | 3405 | 2025 | 16130 / 6049 | 15301 / 6451 |
| x4 ji 108 | 0 | 0 | 0 | - | - |
| x4 ji 125 | 439 | 445 | 445 | - | - |
| x4 ji 147 | 489 | 935 | 162 | 3078 / 3369 | 2591 / 3814 |
| x4 ji 149 | 4802 | 3990 | 1449 | - | - |

Under the old rule the fix is still above S3b at cross, ji 28 and
ji 147, and below it at ji 149.

**S3.2, the crotch far edge: kept at 1.56** (be7e023b; 28552345 tried
2.5).
- The wedges (GPU / twin) are the same at 1.56, 2.5 and 3.0: cross
  2363 / 8670, ji 28 15301 / 6451, ji 147 2591 / 3814.
- The d and dw frames change 0 px from 1.56 to 2.5. At 3.0, 66 px change
  on ji 147's lit arm 2, by up to +11 luma.
- Fill pixels at 1.56 / 2.5 / 3.0: ji 147 9735 / 10358 / 10374, ji 28
  6226 / 6321 / 6339, ji 33 6811 at all three.
- So the far edge does not bind the wedges; they need a different fill
  rule.
- The fa kink is unreachable: max fa with cov > 0 is 0.3077.
- Stage 2's 3089 px was not reproduced.
- Offline and the GPU disagree at ji 28: +113 fill px offline, 0 on the
  GPU.

**The half-pixel suspicion: there is no sub-pixel offset**
(`halfpx.mjs`).
- The GPU's edge fitted against the twin's on fan-class pixels: cross
  shift (-0.007, -0.012) device px, bias -0.011; ji 28 (0.005, 0.006),
  bias -0.003.
- The "about 1 px ahead" is the cover strip's designed pad. A strip
  fragment reaches fh + 1.5 pxW (`reach`, `junction_field.ts:346`,
  ROUTE_BAND_PAD + 1); a fan fragment reaches fh + 0.5 pxW. The twin
  draws no strip: `diag_s3b.mjs:176` passes strip = false.
- Edge pixels by class, fan / strip / neither: cross 103 / 23 / 98
  (whole-fit bias +0.149 px), ji 28 281 / 35 / 129 (+0.113).
- **The t5 ghost at (122, 121) is the strip pad.** Its G 89 is band 0's
  cov-1 value. The pixels beside it are band 1's strip edge: (123, 121)
  reads G 227 against a strip model of 226.8 and a fan model of 4.2;
  (122, 122) reads 220 against 220.3 and 32.7.
- **The pad does not explain ji 28's 2.4x wedges** (`wedge_strip.mjs`).
  - Wedges: GPU 15301, twin 6451, both 6386, GPU only 8915, twin only
    65.
  - Of the GPU-only wedges, 6055 lie beyond any strip's reach (e <
    -1.5 px), 2557 inside the fan's own reach, and 6358 are bare (both
    bands cov 0).
  - In those pixels the GPU is 16.3 luma darker than the twin (p10
    -22.4, p90 -10.7).
  - Unattributed: the GPU and the twin disagree on the fan's base
    material at ji 28, plausibly the same disagreement as the fill's
    above.
  - At ji 33 and ji 147 it runs the other way, with the extra wedges in
    the twin (twin only 6522 and 1275).

**Section 5 on the fix** (a5698618 on 5620; S3b is Run B's after
record, the main checkout's `out/s3b/after/`). The pages' stamp reads
a072dc4c because the dev server fixes its SHA when it starts. It serves
the working tree, whose `src/` matches 944bb761's (0 files differ).

P8 (`fan.mjs`: max |G - model| on each band's centreline, ceiling 4/255;
fix's worst point as tau, v, G), P1 and P4 (/255 and %), and P3 (the
model's value in brackets where `fan.mjs` gives one). P5min is
unchanged on every band.

| band (record, slot) | S3b P8 | fix P8 (tau, v, G) | S3b P1 / P3 / P4 | fix P1 / P3 / P4 |
|---|---|---|---|---|
| cross e150>e21 (ji 33, 0) | 19 | 67 (0.19, 0, 67) | 4.3 / 1.229 / - | 4.3 / 0.781 (1.221) / - |
| cross e150>e151 (ji 33, 1) | 2.6 | 13.5 (0.15, 0.747, 204) | 1.7 / 1.344 / - | 2.4 / 1.267 / - |
| src e150>e198 (ji 155, 1) | 7.3 | 120 (0.06, 0, 120) | 2 / -1.229 / 21.42 | 2.1 / -0.562 (-1.279) / 3.1 |
| src e150>e199 (ji 155, 0 shared) | 4.4 | 50 (0, 0, 50) | 4.4 / -1.281 / 26.78 | 4.4 / -0.854 (-1.288) / 26.45 |
| four e135>e18 (ji 28, 0) | 4.3 | 61 (0.23, 0, 61) | 5.3 / 1.354 / 23.02 | 5.3 / 1.045 / 12.56 |
| four e135>e136 (ji 28, 1) | 7.7 | 15 (0.12, 0, 15) | 3.3 / 1.363 / 20.14 | 3.3 / 1.346 / 17.75 |
| x4 e180>e140 (ji 149, 0 shared) | 4.4 | 128 (0.09, 0, 128) | 2.9 / -1.619 / 0.02 | 7.7 / -1.256 (-1.615) / 2.59 |
| x4 e180>e141 (ji 149, 1) | 5.8 | 18.8 (v 0.824) | 4.9 / -1.638 / 1.44 | 8.6 / -1.556 / 6.1 |
| x4 e176>e135 (ji 147, 0) | 59.1 | 71.8 (0.05, 0.792, 130) | 3 / 1.391 / 9.56 | 3 / 1.404 / 1.09 |
| x4 e176>e175 (ji 147, 1) | 15.1 | 14.1 (the same point) | 1.5 / 1.638 / 9.66 | 3.1 / 1.638 / 4.19 |
| x4 e177>e178 (ji 108, 0) | 4.4 | 6.5 | 4.5 / 1.638 / 0.72 | 4.5 / 1.638 / 1.39 |
| x4 e140>e95 (ji 125, 0 shared) | 5.5 | 15.8 | 4 / -1.599 / 1.9 | 5.9 / -1.638 (-1.485) / 3.09 |
| x4 e140>e139 (ji 125, 1) | 3.4 | 61 (0.02, 0, 61) | 3.9 / -1.638 / 0.55 | 6 / -1.43 (-1.506) / 8.27 |
| x4 e135>e18 (ji 28, 0) | 6.7 | 64 (0.23, 0, 64) | 6.8 / 1.499 / 6.91 | 6.8 / 1.229 / 2.96 |
| x4 e135>e136 (ji 28, 1) | 6.5 | 11 (v 0) | 2.9 / 1.516 / 5.06 | 2.9 / 1.491 / 2.85 |

- Observed:
  - Stages 2-3 moved P8 on 14 of 15 bands, all up. Only x4 e175 held
    (15.1 to 14.1).
  - The named worst points: cross e21 19 to 67; x4 e175 15 to 14.1;
    x4 e135 59 to 71.8.
  - Nine of the fix's worst points read v 0 (the band's own pulse off)
    with G 11-128.
  - The drawn P3 fell below the model's on 7 bands.
  - fanmax rose on e175 (1.9 to 4.9), e95 (2.2 to 5.2), e139 (1 to
    2.8) and e135 (11.3 to 11.9).
- **Most of it is rule (b), by design** (`p8max.mjs` on the e30 dumps;
  centreline pixels, dnow < 0.5 px, inside the fan's foot where d
  differs from dw).
  - 467 of the 561 off-crest centreline pixels (83%) sit within 4/255
    of the max over bands: a sibling band's crest lights them.
    `fan.mjs`'s P8 model reads one band's own pulse; it predates (b).
  - P8 has to be re-measured against the max over bands before it can
    pass or fail the fix.
  - The v-0 worst points fit this. Inferred, untested: the P3 drop is
    the same effect.
  - 94 pixels remain. 70 of them are ji 28 band 0, where G sits above
    even the max, by up to 69 (k4 (146, 148): G 200, own 126.2, max
    130.9). Candidates, untested: the strip pad and rule (a)'s segment
    flip.

| record, band | centreline px | off own crest > 4 (max) | of them within 4 of the max |
|---|---|---|---|
| ji 33, 0 | 252 | 78 (125.3) | 67 |
| ji 33, 1 | 252 | 19 | 17 |
| ji 28, 0 | 372 | 149 (73.8) | 79 |
| ji 28, 1 | 247 | 60 | 58 |
| ji 147, 0 / 1 | 66 / 117 | 13 / 27 | 13 / 27 |
| ji 149, 0 shared / 1 | 904 / 666 | 118 / 97 | 114 / 92 |
| ji 125, 0 / 1 | 120 / 120 | 0 / 0 | - |

ji 108 has no centreline pixels inside the foot.

- **P10** (`bands.mjs`): every stand reads hook == model, with max
  |dDistJ| 0.0000. Bands per stand: fork 0, cross 2, src 2, four 2,
  x4 9. x4 keeps two lit arms with no band, e134 (node_378) and e79
  (node_386), in both builds. Both are S4's.
- **The A/B against master c4a9dd60** (`ab_s3b.mjs`, `phw=0`, clocks
  pinned): **PASS, 0 px outside banded records** on every frame.
  - The same-build control read 0 px.
  - Pixels that differ, t0 / t1 (max /255): fork 0 / 0; cross 730 /
    703 (92); src 608 / 547 (106); four 534 / 749 (59); x4 2958 / 3617
    (131).
- **P8 on the arms** (`p8live.mjs`): **PASS on all five stands**, 0
  extrema over 2/255 anywhere. max |dv| /255 (extrema): fork 0.0 (2),
  cross 0.0 (3), src 1.1 (7; e151 at t100, v 0.051, G 12), four 0.3 (7;
  e176 at t100, v 0.143, G 36), x4 0.5 (16; e176 at t100.45, v 0.900,
  G 229).
- **`npm test`**: exit 0 on d540fabc's tree. tsc passed on all three
  projects, then Vitest: 213 files passed and 2 skipped; 2839 tests
  passed and 9 skipped (`out/s3/npm_test.txt`). The batch itself
  exited 1, but only from the false "!! exit" after its `$env:` lines
  (ledger item below).
- The cold compile of junction-field and its explore variant is not
  timed: `k320_slim.test.ts` measures program text, and builds no
  program.

**The sheets** (`.claude/probes/K1139/out/s3/sheets/`, tracked). No
labels are drawn; the file names and this list say what is where.
- `s3b_fix_{cross,src,x4}.png`: eight phases a row. The rows are before
  S3b (the main checkout's `out/s3b/today/`), S3b (`out/s3b/s3b/`) and
  the fix (`out/s3/after/`).
- `s3b_fix_seams_cross.png` (ji 33) and `s3b_fix_seams_x4.png` (ji 28,
  ji 147, ji 149, three rows each): 48 CSS px at 4x, centred on the
  junction, phases t0, t2, t4 and t6. Each record's rows are before
  S3b, S3b and the fix. ji 108 and ji 125 lie outside the x4 strips'
  clip.
- `crop2x_ramp_<stand>_ji<ji>_t<k>_c<c>.png`: the worst compression ramp
  per record, the fix's n frame beside its debug view 5, 48 CSS px at
  2x: cross ji 33 (c 1.286), ji 28 (1.286), ji 147 (1.905), ji 149
  (1.536). ji 125 has no ramp.
- `crop2x_ghost_cross_t5.png` and `crop8x_ghost_cross_t5.png`: the t5
  ghost, n beside d, with band 1's strip edge beside it.
- `crop2x_crotch_x4_ji28_e156_e25_e30.png`: ji 28's crotch. The columns
  are far edge 1.56 (kept), 2.5 and 3.0; the rows are t2, t4 and t6.
- `crop2x_fork_front_cross_ji33.png`: the fork's shared arrival front
  at cross ji 33, all eight phases. The rows are S3b and the fix.
  - Observed: S3b's front has a chevron, a V notch between the two
    bands at t5 and t6.
  - The fix's front is one round arc about the pivot, with no chevron
    and no smear.
  - But at t4 and t5 the fix's lit disc ends at its lower left in a
    crisp arc, a hard edge where S3b ramps. It shows again in
    `s3b_fix_seams_cross.png`, the fix row at t4.
  - This is a finding; it is unattributed.
- The ji 28 crotch crop's three columns look the same, as the d frames
  say (0 px from 1.56 to 2.5).

**`pixel_batch_plan.md`** (in the main checkout; not edited) should
change in two places:
- the twin and the strip pad: model the cover strips (reach
  fh + 1.5 pxW), or mask the strip ring, before any GPU-against-twin
  comparison;
- P8: measure it against (b)'s max over bands, not one band's own
  pulse.

**Ledger items** (for the coordinator to file):
- P8 against the max over bands. 14 of 15 bands read worse under
  `fan.mjs`'s per-band model; 83% of the off-crest pixels are (b) by
  design. Re-measure, then attribute the 94 px that remain (70 at ji 28
  band 0).
- The twin must model the cover strips (`diag_s3b.mjs:176`). That
  explains the "1 px ahead" and the t5 ghost.
- ji 28's GPU-only wedges: the GPU's bare fan is about 16 luma darker
  than the twin's, and 6055 of the 8915 lie beyond any strip.
  Unattributed; check it against the offline/GPU fill disagreement at
  ji 28 (+113 px).
- The crotch fill's far edge does not bind the wedges: a new fill rule
  is needed. The fa kink is unreachable.
- The seam ruling's c misses the arc-true rate and the obliqueness.
- jump:gpu at cross t7 is unattributed.
- Stage 2's 3089 px was not reproduced.
- `scripts/preview.ps1` fails under a long `-Root` (the short root
  `C:\Users\lsl\AppData\Local\Temp\k1139s3pv` works).
- `run_locked.ps1` logs a false "!! exit" after `$env:` lines, and the
  batch then exits 1.
- A `preview.ps1 -Ref` server stopped by killing its process (TaskStop)
  skips the script's `finally`, so its temporary worktree stays
  registered with a `node_modules` junction inside. A plain
  `git worktree remove --force` on it would follow the junction. This
  stage's leftover (`k1139s3pv\src-c4a9dd60`) was unlinked first, then
  removed, the way the script's own `finally` does it.
- e79 and e134 stay S4's.

**Handle**
- owner: nobody since 16:25 on 2026-11-04 (stage done); it was claude
  session 01TnQvxftruF6gxzRe3bigQ6, agent a8280f4d14ebd8ad1.
- branch: `worktree-agent-a8280f4d14ebd8ad1` at
  `.claude/worktrees/agent-a8280f4d14ebd8ad1`. last commit: this
  handoff's; the WIP before it is d540fabc.
- evidence: `.claude/probes/K1139/` (`diag_an.mjs`, `halfpx.mjs`,
  `wedge_strip.mjs`, `p8max.mjs`, `crotch_fill.mjs`, `sheets_s3.mjs`,
  `batch_st3_checks.txt`; `out/s3/` holds the dumps, untracked; its
  `sheets/` is tracked).
- next: re-measure P8 against (b)'s max over bands; give the twin the
  cover strips; attribute ji 28's darker bare fan and the 94 px. All of
  these come before S4 or a merge.
- brief: `docs/design/K1139_s3b_fix.md` (Stage 3 and this handoff).
- env: `npx vite --config
  .claude/probes/K1139/vite.private-cache.config.ts --port 5620
  --strictPort --host 127.0.0.1` from the worktree (the node_modules
  junction, section 7); master on `pwsh scripts/preview.ps1 -Port 5630
  -Ref c4a9dd60 -Root C:\Users\lsl\AppData\Local\Temp\k1139s3pv`; GPU
  probes through `run_locked.ps1 -Batch`.

## Stage 4 (2026-11-04): attribution before any merge

This is the fix brief's Stage 4. K1139's own S4 (e79 and e134) is a
different stage and stays where it is.

A new agent runs this stage in Stage 3's worktree,
`.claude/worktrees/agent-a8280f4d14ebd8ad1`, on its branch
`worktree-agent-a8280f4d14ebd8ad1`, so that Stage 3's untracked dumps
under `.claude/probes/K1139/out/s3/` stay at hand.
- Make no new worktree, and do not rebase onto or merge master.
- Sections 1-8, Stage 2's S2.1-S2.5 and Stage 3 hold except where this
  section says otherwise.
- Read Stage 3 and its handoff first.

### Stage 4.1 Claude's ruling on Stage 3 (2026-11-04)

- **No line-arc-line turn.** At 2x the compression ramps read as soft
  shading, not creases. ji 147's curved edge at t0 (c 1.905) is no
  crisper than master's own fronts there, so S3.1's rule stands.
- **The classifier's missing terms are recorded, not fixed.** These are
  the arc-true tau rate and the band's obliqueness. Use the classes as
  they are and say where a class depends on them.
- **No merge yet.** The fix removes S3b's chevron with one round arc,
  but four things are visible and unexplained:
  - The fork front at cross ji 33, t4-t5, ends at its lower left in a
    crisp arc where S3b ramps.
  - ji 28 has 8915 GPU-only wedges, 6055 of them beyond any strip's
    reach and 16.3 luma darker than the twin.
  - P8 rose on 14 of 15 bands under a model that predates rule (b).
  - ji 149's partition. In master the yellow/teal boundary at ji 149 is
    an arc; in S3b and the fix it is a straight edge with a corner,
    the same in both rows (`s3b_fix_seams_x4.png`, the ji 149 tiles).
    The right-edge notch at t4 and t6 shows in both too.

### Stage 4.2 The work

Measurement and attribution come first. The rules for source changes:
- A source change lands only where an attribution proves a defect,
  meaning a bug rather than a design choice.
- Each such change goes in its own commit, with section 5 re-run on it.
- A new fill rule is a design choice: propose it in the handoff with
  its numbers, and do not build it.

The six tasks:
1. **P8 against the max over bands.**
   - Re-measure P8 on every band of section 5's table. The model's
     value at each pixel becomes the max over bands of each band's
     crest there, which is rule (b)'s design.
   - Give Stage 3's table again with this column added, and say pass
     or fail against 4/255 per band.
   - Then attribute the pixels that remain over 4/255 (Stage 3 counted
     94, 70 of them on ji 28 band 0). For each, give:
     - the rule (a)-(d) that set it;
     - its band, distJ and tau;
     - whether a strip covers it;
     - whether rule (a)'s ray changes segment there.
2. **The twin draws the cover strips.**
   - Give `diag_s3b.mjs`'s twin the strips. Today it passes
     strip = false (line 176). A strip reaches fh + 1.5 pxW, per
     `junction_field.ts:346`.
   - If that cannot be exact, mask the strip ring out of every
     GPU-against-twin comparison. Say which you did.
   - Re-run the wedge census and the seam classes with it, and give how
     many GPU-only wedges remain at ji 28, ji 33 and ji 147.
3. **ji 28's darker bare fan.** In the GPU-only wedges beyond strip
   reach, find which input differs between the GPU and the twin:
   - the fan's base material;
   - the arm strip it samples (`arm_strip.ts`, K4);
   - the band partition;
   - the light.
   Check the answer against offline's +113 fill px at ji 28. A twin bug
   is fixed in the twin. A shader bug is named with its line and fix,
   and lands only under 4.2's rule.
4. **The fork front's crisp arc** (cross ji 33, t4-t5).
   - Name the rule that draws the arc.
   - Measure its edge width: the 10-90% rise in px at 1x, along the
     edge's normal. Measure master's fronts the same way, at the same
     place and at ji 147.
   - If the fix's arc is no crisper than master's fronts, it is not a
     defect. Say so, with the numbers.
5. **jump:gpu at cross t7**, box (115-120, 78-83): attribute it.
6. **ji 149's partition corner.** Name the code that draws master's arc
   and the code that draws the fix's straight edge. Say whether the
   corner is the route band's designed corner (K81,
   `junction_routes.ts`) or the fill.

### Stage 4.3 Sheets

For each of tasks 3-6, a 2x crop with three rows, before (master
c4a9dd60), S3b and the fix, in Stage 3's layout. Files go under
`.claude/probes/K1139/out/s4/sheets/`, tracked with `-f`, and the
handoff lists what is where.

### Stage 4.4 Order of work and stop

Times run from your `Get-Date` at the start. Commit WIP at every
milestone, broken or not.

1. **Setup, 15 min.**
   - Start the server on 5620-5639 from this worktree, and master's
     preview on 5630 (the Stage 3 handoff's env line, the same short
     `-Root`).
   - Fix `run_locked.ps1`'s false "!! exit" after `$env:` lines in its
     own commit. It reads a stale exit code.
   - If dumps are needed, put the `__k1139diag` hook back in a WIP
     commit (e7dc5fda's version). Take it out again before the end.
2. **Tasks 1-2 by 1 h.** Their numbers change how 3-6 read.
3. **Tasks 3-6, then 4.3's sheets.**
4. **The stop:** done or 2 h, whichever comes first.
   - Neither a compaction nor context size is a stop. After one,
     re-read this section and `git log`.
   - Stop the servers. Remove master's preview worktree the way
     `preview.ps1`'s `finally` does: unlink its `node_modules` junction
     first, then remove the worktree.
   - Release the perf lock.
   - Commit WIP, append `### Stage 4 handoff` at the end of this
     section, commit, and report as section 8 says.
     - Give the handle fields, env among them.
     - List the ledger items.
     - For each finding, say whether it blocks a merge.
   - Never push. No subagents. No edits to `LEDGER.md` or
     `docs/ledger_notes.md`.
   - Never write into the main checkout (Muse runs there) or into the
     other worktrees.
