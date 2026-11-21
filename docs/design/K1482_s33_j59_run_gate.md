# K1482 stage 33: j59's step, by ending the under bands only along a long run (K1526; Claude agent stage)

**Started 2026-11-20 07:50** from master with stage 32 merged (6fe470618). Stage 32 (t84e's wedge) stopped at
its cap: its lone-fold rule is in `eval.ts` (on only with env `GF_S32=1`) and in `gf_glsl.ts` (`loneFold`,
exported, never called), so master draws as before it. **Leave that code as it is**: its next step is a Muse
run (27J in `docs/design/K1531_muse_batch27.md`), held until this stage has landed or stopped. New since stage
31: `.claude/probes/K1482/guards.ps1` (tracked; usage in its header) runs the seven guards of Done below, each
through the perf lock with its whole output in a file, and `.claude/probes/K1482/cap.mjs` captures on the
first try (K1539).

Levi, 2026-11-19, on K1490: **"Fix the wedges and notches, accept the slivers."** His bar: at junctions and
under-tail ends the over thread's outline runs on unbroken, with no dot, stub, wedge, tick, notch or sliver.
j59 is one of the 14 sites he named on link A (`The sites` in `docs/design/K1482_s20_wedges_notches.md`; his
sheets `.claude/probes/K1490/out/k1490_wedge.png` and `k1490_notch.png` in the coordinator worktree
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af52b1a95572b7c1a`).

## The site

**j59** is at 1060,1512 on the 3200x1800 frame of link A; the step is near 1037,1512. At the top of the
junction's inner leg the outline widens in a step: chain 43's band plus chain 23 (the stub **t23e**,
1050,1521) lie ALONG chain 7's outline for about 20 px and end square. The white sliver beside the step is one
Levi accepted: it stays, and its border stays whole.

Stage 31 found a rule that clears the step and why it cannot land as it is. Read `### Handoff K1482 s31`
(`docs/design/K1482_s31_j59_band_end.md`) and the entry BAND END ALONG A LONE OVER PASS in
`.claude/rules/render-gpu-field.md` first. In short:

- **runT** (the attempt, `git show 75e1a7949 -- src`; it passed `npm test`): a group's side band and vertex cap
  narrow to nothing where a lone piece over it faces the outline point across a small gap. On the GPU it
  clears j59's step: the inner leg's outline runs at one width into the junction, the sliver's border is
  whole, fill 0 px, `&gfk=0` 0 px.
- It fires at every band tail against a lone over pass, and all but j59 are short wedges that converge INTO
  the over outline: stage 30's approved run-on. There it cut ink: t81s 105 px (blunt end and a gap), t76e 72
  (broken outline, a stray dot), t53e 65 (dotted hairline), t36s 21 (knob, dots), j58 14 (a notch), 464 px
  lost in 15 places.
- A gate per PIXEL does not separate them: with each piece's own tangent it leaves ink islands in j59's step,
  with the band chain's tangent j59's spread overlaps t53e's.
- A gate per (band chain, over pass) may: the arc over which the band chain's outline stays within 1 px of
  the over pass's tube is 19.4 px at t23e along chain 7 (1.14 h), 13.2 at t76e (0.77 h), 6.7 at t73e, 2.8 at
  t36s, 0 elsewhere (`out/s31/why31_run.txt` in stage 31's worktree). Within 2 px, t81s (29.6) outruns j59
  (20.8). The margin is thin, and it was measured on link A only.

Stage 31's tools and outputs are in
`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a48af51230e66ddb3\.claude\probes\K1482\s31` and
`...\out\s31` (the run measurement, `isl31.ts`, the mirror image tools, its capture and sheet scripts); stage
30's are tracked in `.claude/probes/K1482/s30`. Copy what you use, change nothing in another worktree.

Link A is `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1` (hash fff8c9e5). `&tlk=border` draws the
outlines only, `&tlk=fill` the fill; `&gfk=0` turns the second corner try off. A Node build leaves it off
unless env `GF_KRETRY=1` (K1536): set that for a Node probe and for the bar, and clear it before `npm test`.

## The steps

1. **Measure first, on five mazes, before any GLSL** (the first 30 minutes). The run length for every (band
   chain, over pass) pair where runT would fire, on link A and on the bar's four mazes (the scenes `ring`,
   `def`, `muse_hash`, `g41_user_tw64`: follow `.claude/probes/K1436/k1436_bar.ps1`'s `-Scenes` to where it
   turns a scene name into a link): a table, longest first, in h and in px. Draw the CPU copy at every pair over 0.6 h and look: is it a band lying along an
   outline that ends in a step (j59's kind), or a wedge that converges into the outline (the approved kind)?
   Then say whether one threshold puts every step on one side and every wedge on the other, and by what
   margin. Commit the table and the verdict in this brief before step 2.
2. **If it separates:** bring runT back from 75e1a7949 with that switch: one value per (band chain, over
   pass), baked in `tables.ts`, constant along the band (no per-pixel gate: stage 31's islands). The CPU copy
   first, where a try costs seconds, then the GLSL, with the programs for `&gfk=0` and home-off unchanged.
3. **If it does not** (a wedge over the threshold, a step under it, or a margin under about 0.2 h): do not
   port the gate. Say which pairs break it, with their crops, and try a technique local to j59; the brief's
   goal still holds and you own the technique.

Stage 32 added code since this was written (off, see the top): re-read `git log -5 -- src/render/gpu_field`
at your start and take your "today" captures from your own base.

## The goal

On link A as it loads: the step at j59 is gone, the inner leg's outline runs at one width into the junction,
and the sliver's border is whole; t23e's stub is no worse; the fill does not move. With `&gfk=0` nothing gets
worse. The run-on wedges at t81s, t76e, t53e and t36s keep their length and their points, and j58 gets no
notch. Nothing else on link A or on the bar's four mazes gets worse: a clean round turned into a point, a
clean point rounded, or an outline that loses ink at a joint corner is a failure, and a changed shape at a
place Levi did not name is his to judge: list it and say what it looked like before and now. A stage that
ends with more diagnosis and nothing in `src/` has not reached the goal while time remains. j47 is NOT this
stage's: leave it.

## Done

- **By eye**: j59 and t23e, context crop and detail crop, today | new, as it loads and with `&gfk=0`,
  contrast stretched (the outline is only about 15 levels darker than a pinhole inside it); the same pair for
  t81s, t76e, t53e, t36s and j58.
- **Link A**, loads of one state and one view (compare the image hashes of repeat loads first, K1539; report
  the floor), made **before** you commit anything as a fix: every place outside j59 where the border look
  changes at a luminance step of 1 is counted, the places that only gain or only lose ink counted separately;
  the ten largest are on a sheet (surrounding threads with a red box, then the box closer; today | new) and
  judged by eye; the fill look 0 px, or each place named.
- **The bar** on your tip: `.claude/probes/K1436/k1436_bar.ps1`, `STRICT=1 -NoPerfLock`, scenes
  `ring,def,muse_hash,g41_user_tw64`, `-Base` master's SHA at your start, `-Tag k1482s33`: new 0, grown 0.
- Under the perf lock (`scripts/perf_lock.ps1 -MaxWaitMin 60`, each wait in ONE blocking command): `hold.mjs`
  60/60 on link A, as it loads and with `&gfk=0`; `.claude/probes/K1482/s15/panelopen.mjs`; both dragchecks.
  `npm test` green, run WITHOUT the lock (a pin that moves is re-frozen in the same commit and named in its
  message). Each guard's whole output kept in a file.
- Three or four lines of lore in `.claude/rules/render-gpu-field.md`.
- The commits on your branch, in landing order, each green.

## How to work

`git merge --ff-only origin/master` in your worktree first. Ports 6270-6289, profiles `$env:TEMP\k1482s33-*`,
probe directories `.claude/probes/K1482/s33` and `.claude/probes/K1482/out/s33` (untracked: do not `git add`
raw captures or dumps). Pass `&snd=none` in every look capture; never Chrome's `--virtual-time-budget`. The
border look under gf is gf's own: today's renderer's border strokes are no bar. Read code through the shell
(`Select-String`, a range of `Get-Content`); use the Read tool only on a file you are about to edit. No
helpers. Commit WIP at every milestone, broken or not, and add two or three handoff lines here each time: the
first commit within 40 minutes of your start.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock from your start (`Get-Date` at the start
and at each milestone), whichever comes first; start the guards by 75 minutes in. A compaction is not a stop:
re-read this brief and `git log`. On stopping: commit WIP, append `### Handoff K1482 s33` here, commit, and
report: the commits to land by SHA in order, what changed at the site by eye, the numbers, each guard's result
with the path of its whole output file, the sheets' absolute paths, a `Ledger items` list and K1482's handle
fields. Never push, never edit `LEDGER.md`.

## Step 1: the measurement (stage 33, 2026-11-20)

Probe: `.claude/probes/K1482/s33/run33.ts` (the CPU copy with s31's runT on everywhere, `GfEval.S33 = "all"`,
against it off; every pixel whose ink moves by more than 0.02 is grouped by (band chain C, over chain M)). The
run is the arc of C's offset outline, on the changed side, that stays within a tolerance of M's tube: at 0.03,
0.06 and 0.12 h (0.5, 1 and 2 px on link A). dCM is the least centerline distance from C to M over all of C,
in h (2.0: the tubes touch; less: C dives under M). Crops: `out/s33/mimg_A`, `mimg_g41`, `mimg_def`,
`mimg_cl` (`mimg33.ts`, before | runT | diff). ring: no pair. muse_hash is link A's maze (the same 12 pairs,
plus C37/M68: 1 px, dCM 1.91).

| maze | place | C/M | px lost | run h at 0.03 / 0.06 / 0.12 | run px at 0.06 | dCM | by eye |
|---|---|---|---|---|---|---|---|
| A | t23e (j59) | 23/7 | 192 | 1.06 / 1.14 / 1.44 | 19.4 | 1.98 | **step** (band along the outline, ends square) |
| g41_user_tw64 | 1012,788 | 1/2 | 333 | 0.48 / 0.98 / 1.76 | 20.6 | 1.57 | wedge, cut |
| A | t76e | 76/48 | 94 | 0.78 / 0.98 / 1.16 | 16.7 | 1.78 | wedge, cut |
| A | t20e (1340,1487) | 20/44 | 14 | 0.44 / 0.94 / 1.22 | 16.0 | 1.91 | chain-end cap, nicked |
| g41_user_tw64 | 278,271 | 9/7 | 113 | 0.48 / 0.68 / 0.88 | 14.3 | 0.00 | wedge, cut (C9 crosses under M7) |
| A | t81s | 81/9 | 131 | 0.26 / 0.56 / 1.28 | 9.5 | 1.63 | wedge, cut |
| A | t73e | 73/67 | 5 | 0.16 / 0.40 / 0.90 | 6.8 | 0.00 | - |
| A | t0e | 0/72 | 3 | 0.18 / 0.36 / 0.80 | 6.1 | 0.00 | - |
| A | t36s | 36/71 | 33 | 0.12 / 0.28 / 1.04 | 4.8 | 1.75 | wedge, cut |
| g41_user_tw64 | 213,1112 | 6/26 | 145 | 0.14 / 0.28 / 0.68 | 5.9 | 0.00 | wedge, cut |
| A | t53e | 53/84 | 81 | 0.10 / 0.20 / 0.42 | 3.4 | 0.01 | wedge, cut |
| A | t14e | 14/38 | 5 | 0.08 / 0.20 / 0.40 | 3.4 | 1.67 | - |
| def | 1180,258 | 79/61 | 4 | 0.08 / 0.12 / 0.86 | 1.4 | 0.00 | - |
| A | t81s, j21, t34e | 45/9, 6/64, 75/34 | 1, 1, 20 | <= 0.04 / 0.14 / 0.34 | <= 2.4 | 0.00 | - |

**Verdict: the run length does not separate them.** j59's step is the only step; at 0.06 h it outruns the
nearest wedges (t76e, g41 C1/M2, both 0.98 h) by 0.16 h, under the 0.2 h the brief asks. At 0.03 h the margin
is 0.28 h (t76e 0.78), but a wedge's run grows about 0.2 h per 0.03 h of tolerance, so the order rests on the
tolerance; at 0.12 h g41 C1/M2 (1.76) outruns j59 (1.44). Breaking pairs: t76e C76/M48 and g41 C1/M2 (wedges
at 0.98 h), t20e C20/M44 (a cap at 0.94 h). The gate is not ported (step 3). What does set j59 apart on the five
mazes: its band never dives under the over chain (dCM 1.98: side contact; next t20e and muse C37/M68 at 1.91,
every wedge 1.78 or less) AND it lies along it for a long run (t20e: 0.44 h at 0.03 h). Step 3 tries that as a
per-(band chain, over chain) switch baked in `tables.ts`: local to j59 by construction, its margins thin
(0.07 h on dCM), and it says nothing about steps on mazes not measured.
- 08:02 WIP 1: step 1 measured (table above); `eval.ts` carries runT again behind a per-chain switch `T.rtM` (absent: master's look; probes set `GfEval.S33` = `all` / `0`), `tables.ts` declares `rtM` and bakes nothing yet. Next: bake the side-contact switch, check the CPU copy at every pair, then the GLSL.
- 08:09 WIP 2: the switch baked (`tables.ts` sideRuns: tubes never nearer than 1.945 h, within 2.03 h over >= 0.6 h; marks only C23/M7 and C7/M23 on the five mazes, 10-20 ms of a 65 ms build) and packed (chain texel 3 .y = rtM + 1); `gf_glsl.ts` RUNT / RT_FACE / RT_VTX in homeBurial (retry programs only). The CPU copy changes link A only at t23e (192 px, `out/s33/run33g_A.txt`). Next: previews, the browser check, captures.
- 08:33 WIP 3: browser check of WIP 2's build (base 4413372e3 on 6270, candidate on 6271; `capseq28.ps1` m / c1 / m2 in one locked session, `out/s33/caps_2.txt`): link A as it loads loses 153 px at ONE place (1034,1515 near t23e, lose-only, box 1024,1505-1044,1528: the doubled band and its square end), stage 31's count; the sliver's border (the short band 1013-1027,1523-1531) stays; fill 0 px, `&gfk=0` border and fill 0 px; floor 0 px (repeat loads hash-equal). t81s, t76e, t53e, t36s, j58: 0 px. Tools: `s33/diff33.py` (places, floor, sheet). Next: guards, lore.
- 08:36 WIP 4: lore (SIDE-RUN GATE in `render-gpu-field.md`); the by-eye sheet `out/s33/sh/s33_places.png` (j59, t23e, t81s, t76e, t53e, t36s, j58; as it loads and `&gfk=0`). A 1-2 px shoulder stays on chain 7's lower edge at 1043,1504-1505, where the doubled band ended (the CPU copy's ungated runT changes the same pair only, so s31 left it too). Guards started 08:33 (`out/s33/guards`).

### Handoff K1482 s33

- 07:45-09:35. Lands in order: 45bac3ad1 (WIP 1), 9935885b0 (WIP 2, the src), 094df7ef9 (WIP 3, tools), 71eb4ae09 (WIP 4, lore), and this commit. Step 1: the run length does not separate j59 from the wedges; the never-dives test (`tables.ts` sideRuns -> `rtM`) does, by a thin margin (j59 1.98 h; a cap 1.91 h, wedges 1.78 h or less), and marks only C23/M7 and C7/M23 on the five mazes.
- Link A as it loads: 153 px lost at ONE place (1034,1515, t23e; box 1024,1505-1044,1528). Stage 31's ungated runT drew the same pixels there (its c1 against this c1: 0 px in 1000-1070,1490-1545). Fill 0 px; `&gfk=0` border and fill 0 px; repeat loads hash-equal (floor 0). t81s, t76e, t53e, t36s, j58 unchanged. A 1-2 px shoulder stays on chain 7's lower edge at 1043,1504-1505. Sheets: `out/s33/sh/s33_places.png`, `out/s33/d/on_b2_top.png`.
- Guards on 094df7ef9 (`out/s33/guards/summary.txt`): bar PASS new 0 grown 0 gone 0; hold 60/60 and gfk=0 60/60; panelopen 1; dragcheck_b max 12; dragcheck max 88 (earlier builds 0-67); npm test 3198 passed, 18 skipped. Residual: sideRuns costs about 9 ms per table build in the browser pool as it loads (tms 21.8-28.5 against 12.2-17.3 ms; gfk=0 unchanged). Next: the cost (cache it per topology or make it cheaper), and validate the margin on more mazes.

### Outcome (2026-11-20): reverted

- Levi, on the live look at j59: "the new render is very bad. It's completely removing a border and consequently
  widening the thread and destroying the visual indication of where that thread is and how it aligns with others".
- The gate's src changes (merge f7b965265) are reverted on master; the probe tools in `.claude/probes/K1482/s33/` stay.
  j59's two close borders are two threads' edges and both stay (lore: NEVER REMOVE A THREAD'S BORDER in
  `.claude/rules/render-gpu-field.md`). No further stage narrows that band.
