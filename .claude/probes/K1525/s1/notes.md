# K1525 s1 running notes

Start 10:57:01 (coordinator: 10:56). Stop 12:56; checks from ~12:26.

## Tools (this dir)
- `cap.mjs <base> <outDir> <profile> <jobs.json>`: same-state capture (phw=0, freeze, K1519 parity `par`,
  stepUntil simT, paint clocks + background pinned, byte-stable = two identical shots; UNSTABLE writes `.alt.png`).
  Job keys: name, query, rp, looks, fls, simT, hash, par, w, h, dsf, fix (uLkFix), dbg (uLkDbg modes).
- `sheet.py <spec.json>`: K1524 layout (W 300, D 76, T 304), counts vs column 0 at `dist`.
- `k1419_spec.py <base> [tip] [out]`: K1419 rows (world -> dev px from meta.json view) -> spec files.
- `dbgread.py <today> <gf> <dbg> <fl> [dist]`: per dive box, the debug terms under the "gf dark" px.
- `dbg.patch`: debug attribution (uLkDbg/uLkFix + lkDbg* in gf_look.ts, uniforms in gf_pass.ts). NOT for src commits.
- servers: 6030 master 330069e61 (`$env:TEMP\k1525s1-prev`), 6032 debug working tree (`k1525s1-prevdbg`).

## Same state
- Link A fill: hash fff8c9e5 at simT 20 with par 0 (without par, today's froze on 10104c64).
- mdt: hash c5d9f3b6 simT 40.0087; g41: 5ccb276f.
- `?3&xp=off&am=instant` (q3): every shot UNSTABLE on master gf (two redraws differ). Cause not found yet
  (FabricMazeRenderer.tickAnim moves only an in-flight dot; suspects: K390 start-marker flip, fog/explore ticks).

## Step 1: today's | master gf, link A fill (D 76, dist 32 counts)
| dive | fl0 | fl0.14 | fl0.5 | fl1.2 |
|---|---|---|---|---|
| 1 (1968,432) | 676 | 706 | 730 | 727 |
| 2 (2224,976) | 300 | 326 | 506 | 1100 |
| 3 (1904,1136) | 186 | 209 | 450 | 868 |
| 4 (1248,1104) | 310 | 529 | 861 | 885 |
Sheet: `.claude/probes/K1525/out/s1/sheets/dives_base.png` (+ _d1.._d4).
- d1: gf dark square block lower left, wide notch upper right, fl 0.5/1.2 straight-edged wedge across the purple
  ramp; today's thin diagonal gap line missing.
- d2: today's thin arc (C ramp at long fl) right of the arc missing; gf draws a dark lens notch upper right.
- d3: gf lacks the thin line and ramp; straight hard colour edge; small dark notch at the left edge.
- d4: gf dark block lower left of the blue arm (wider than today's outline line); long-fl ramp shape differs.
All four: unchanged (none closed).

## Hypotheses
- Blocks/notches: lkGap's coverage cut gA takes EVERY higher piece (other junction arms), not just the slot's
  over chain cS. Test: uLkFix bit 1 (gA only from PC(j)==cS when cS>=0). Debug modes 1 (gA,g,src) and 5 (cS,cutter,in-window).
- Missing lines: window/slot naming (wm, cS) or the label.
- K1419 (corner wedges): corner label = lookQs(lab, lkSb) with one flat s, chosen by nearerA (|p-K4.zw|^2 <= |p-K5.xy|^2)
  at gf_glsl.ts layers() 1345-1355; colour steps at the bisector. Fix idea: capture both arms' (chain, s) + a weight
  from dA-dB at SITES 2377/2380/2381/2385 and mix the two lkColour smoothly.
- K1463: find in q3 once q3 is stable.

## Log
- 11:17 K1419 base capture (mdt, g41) running on 6030 -> out/s1/base/{mdt,g41}_{gf,today}.

## K1419 on master (11:25, sheets out/s1/base/k1419_{mdt,g41}_{f,b}.png, dist 32)
- fill: r1 453, r2 740, r3 515, r4 493 (mdt, fl 0.14 = fl 1.2), r11 419, r13 484/482 (g41 fl 0/1.2). All six UNCHANGED:
  gf draws hard straight colour steps (wedges, a disc edge at r1) where today's blends smoothly between the arms.
- border (gf's own look, render-gpu-field.md): mdt 1061-1426 px vs today's are the stroke look difference, not K1419.
- 11:23 tip build on 6031 (k1525s1-prevtip): K1419 corner blend in SITES (lkCornerW: other arm's composed colour
  mixed by the edge-line distance ratio, smoothstep; non-label weight continuous 0.5 at the bisector). Debug patch
  present but off.

## Dive attribution (11:28, dbg build 6032, out/s1/dbg/A_gf, dbgread.py)
- uLkFix bit 1 (gA only from the slot's over chain) changes nothing: d1 676->676, d2 300, d3 186, d4 310->303. Not the cause.
- The gf-dark blocks/notches at dives 1 and 4 are pixels with NO LABEL (lab < 0): d1/d5 debug draw background there
  (debug sets ink/cov 1 only when lab >= 0). So the dark comes from the fringe path (lkFringe: lowest piece within
  h+aa cuts the coverage by its gap) or from the field having no coverage. Test: uLkFix bit 2 = skip lkFringe
  (jobs_dbgB.json, fx2), rebuild 6032.

## K1419 tip1 (11:33, out/s1/tip1, sheets base/k1419_mdt_{f,b}.png with tip column)
- lkCornerW blend: fill r1 453->436, r2 740->732, r3 515->506, r4 493->502. Whole frame 31543 px moved but only 71 px > 32. The wedges stay: the corner-label bisector step is NOT the wedge (diagnosis class wrong). Wedge edges look like arm piece edges (pd = h lines) and a corner disc edge.
- 11:33 dbgB (fx2 = skip lkFringe) on 6032 -> out/s1/dbg2.
- 11:35 fx2 (skip lkFringe): dives unchanged (d1 676/676, d4 310/311 at fl0). The dark blocks are NOT the fringe cut: the field gives those pixels no coverage. 11:45 dbg mode 6 (min pd/2h, raw field cov, label, nk) on A and mode 2 (chains) on mdt -> out/s1/dbg3.
- 11:41 mode 6 at the gf-dark/today-ink px (fl0): d1 336 px, min pd/h 1.04/1.18/1.44 (p5/50/95), raw field cov 0, unlabelled, nk 0-1; d2 45 px pd/h 1.03-1.13 cov 0; d3 30 px pd/h 1.02-1.18 cov 0; d4 129 px pd/h 0.96-1.26, cov 0..1 (part labelled: a gap cut there). => the FIELD's: no piece within h and no corner disc covers those px; today's draws ink there.
- 11:44 tip2 = K1419 pair blend (lkPairJ: label piece's nearest same-surface, same-key-band partner of another chain, weight smoothstep of (h-d) depths) on 6031 -> out/s1/tip2 (jobs_tip.json: A both looks 4 fl, mdt, g41).
- 11:51 tip2 (pair blend, same surface + |dkey| <= zt): dives unchanged (d1-d4 = master to the px, sheets/dives_tip2.png). A fill: 152 px moved outside the spots (fl 0.14 and 1.2), each region a few px nearer today's. mdt K1419 rows = tip1's numbers exactly (436/732/506/502): the pair filter finds no partner at the wedges (class wrong again: the stub arm is in another surface or key band). 11:53 dbgD on 6032: fix bit 8 drops the key band, 16 drops the surface test (mdt fill fl 0.14 -> out/s1/dbg4).
- 11:57 dbg4: fix 8/16 (drop key band / surface test) = 0 px whole frame; fix 24 = 112000 px whole frame but the 4 mdt rows unchanged (436/732/506/502). Mode 2 at mdt r1: the wedge is a boundary between PIECE labels of chains 77 and 68 (both lkJb >= 0), so the pair blend should see it. 11:59 dbg mode 7 (pair found, weight, pd label/h) and 8 (nearest other-chain piece: pd/2h, key diff, same surface) -> out/s1/dbg5.
- 12:01 dbg5 (modes 7/8 at mdt r1 and r2, 1122 / 1162 px where two piece labels of different chains touch): the pair search
  finds NO partner at any of them. At r1, 289 px read the label piece itself at pd >= h and 205 at pd ~ 0; 265 px have no
  piece of another chain in pd[] at all, the rest have one at 1.1-1.4 h, same key, same surface. So at the output site pd[]
  and the label index do not describe the evaluation that chose the label (layers() runs once per ramp configuration and
  the label is the best-weighted configuration's; psurf is the last configuration's; the label rule's tie-break is the
  surface ENTRY e, not distance). Next step for K1419: capture the partner INSIDE layers() where labC is assigned (the
  second same-key covered piece of another chain, with both pd), through the look's SITES, then blend by (pdB - pdA).
- 12:05 DECISION: no src change lands. tip1 (lkCornerW) and tip2 (pair blend) fail Done on every K1419 row (the wedges
  stay; mdt r4 493 -> 502 worse); both plus debug modes 1-8 are in k1419_attempts_dbg.patch (git apply onto 330069e61).
  The tip's src = 330069e61's, so the checks run on 6030 (the 330069e61 build).
- Dives: the field's (raw field coverage 0 and no label at the gf-dark px; mode 6's min pd/h read at the output site is
  suspect for the same reason as above, the coverage term is not).
- 12:05 checks on 6030 (= the tip's src) via run_checks.ps1 -> out/s1/checks.log: hold q3 PASS 60/60 (12:08), hold A PASS 60/60
  (12:09); npm test green (256 files passed, 2 skipped; 3190 tests passed, 18 skipped); fade + dragcheck, the two-load
  control and the K1436 bar (-Ref 7e905988d, port 6040) follow in the same script.
- Final sheets (attempt column labelled "attempt tip2 (patch)"): out/s1/sheets_final/{dives_tip2,k1419_mdt_f,k1419_mdt_b,k1419_g41_f,k1419_g41_b}.png.
- 12:17 fade.mjs (SHOTS=1, fl 0/0.5/1.2/0.14, gf + gfh): FADE GUARD FAIL on the 330069e61 build (= the tip's src). The arc
  distances pass at every fl (678/679, 627/631, 439/451, 676/679 sides); the fail is K1460's dot test: 79 / 98 / 68 / 103
  sides with more than 2 dots (gf and gfh alike). Master's own state, not this stage's; not investigated.
- 12:21 dragcheck gf PASS (0.5: 99 px, 1.2: 131, 0.14: 0, of 4357572 > 24 levels); 12:25 dragcheck gfh PASS (0, 124, 60).
- 12:27 two-load control: A gf fill fl 0.14 and 1.2 recaptured on 6030 vs out/s1/base/A_gf: 0 px differ (max 0).
- 12:27 K1436 bar started (-Ref 7e905988d -Base 330069e61, STRICT=1, -NoPerfLock, port 6040).
