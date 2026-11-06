# K1211 S3: the pulse's light reaches the gold's edge and the web

Ledger: K1211 (one seamless light inside each junction). Stage agent: Claude Opus in its own
worktree, started by the coordinator session; cap 2 h; ports 5960-5969.

## Start

Your worktree starts from master. If it lacks this brief, `git fetch -q origin` and
`git merge --ff-only origin/master`. If master lacks S2's fix (`src/render/junction_field.ts` has
no `drawBandYield`), merge S2's branch: `git merge --no-edit worktree-agent-a39ebdc1635ca98dc`
(last commit fba755ea). It brings the gold's round edge, look B behind switch 2, S2's probe tools
in `.claude/probes/K1211/` and S2's Handoff. For `node_modules`, make a junction to the main
checkout's, as S2 did: `New-Item -ItemType Junction -Path node_modules -Target
C:\Users\lsl\Repositories\knotmaze\node_modules`.

## Why

Levi, 2026-11-05: "the pictures I've been seeing of highlights over junctions are bad. There
are clear lines/edges of the highlight within the interior of the junction. These seem to be
artifacts of how the original threads are constructed before the threads were fused and/or the
rounding was applied. These junctions need to appear as though they are one whole fused
seamless unit."

On K1190's card Levi answered "All four" (notes, `## K1211 (2026-11-05, Levi on K1190's
card)`): four spots, each judged against the top row of K1190's sheets (before K1139's change).
S2 (`docs/design/K1211_s2_gold_edge.md`) fixed spot 3: the walked gold ends in one round edge,
because a pulse band no longer paints over the gold. Two flaws in the pulse's light are this
stage's:

- **The lit edge's dark line** (S2's first residual). While a pulse lights the gold, a darker
  line one device pixel wide runs along the gold's round edge. At x4 ji 149, phase k6, the edge
  pixel at device (1262, 532) reads 194,224,212, between the lit gold (251,243,211) and the lit
  band (221,239,236). S2's Handoff gives the cause and a recipe. The band composites over the
  gold at cov x yr x (1 - gC), so an edge pixel keeps a share of the unlit base. The recipe:
  composite the bands under the gold.
- **Spot 4, the bite.** In `t6_ji149_x4_n.png`'s two right columns (middle and bottom rows), a
  small ")" is missing from the light at the right edge of x4 ji 149. S1 found it gone with the
  webs off: the web over that edge does not carry the pulse's light. Run I (K1209) has since
  put every disc, wedge and strip on one bottom fan mesh, so check that the bite is still there
  before fixing it.

Spots 1 and 2 (the pulse's sharp front and its straight-edged wedges) and look B's removal are
stage 4's. Calls that bind every change here:

- K1139 (Levi): the pulse "splits, it runs toward the player, and it goes straight through with
  no dim moment"; "no dark wedge between two lit siblings". Its option C (the whole junction
  lit) was rejected.
- K81: gold never reaches into an off-route arm ("a discontinuous flat nub").
- S2's round edge holds (`test/render/gold_edge.test.ts`).
- A spot is judged against the approved version (the sheets' top row), never against the last
  step.

## Goal

While a pulse lights a junction, the lit gold ends at S2's round edge with no darker or lighter
line, and the web carries the same light as the fan beside it, with no bite. Nothing changes at
rest, and nothing changes away from the edge and the web. The fix is in mode 0 (switch 0, what
players see); look B stays as it is.

## Read first

- S2's brief and Handoff: the cause, the fix, the checks, the residuals and the dark line's
  recipe.
- S1's Handoff (`docs/design/K1211_seamless_junction_light.md`): where each spot comes from (the
  edge maps), the cover strips, checks (a) and (b), the cost.
- `docs/ledger_notes.md`, the K1211 entries (Select-String `^## K1211`; read each to the next
  `## `).
- The headers of `src/render/junction_field.ts`, `src/render/ribbon/joinery.ts` and
  `src/render/junction_routes.ts`.

## Tasks

In this order. If the cap comes first, the Handoff says what is left.

1. **The dark line.** Composite the pulse bands under the gold in mode 0 (S2's recipe, or a
   simpler exact form), and leave look B as it is. Keep the CPU twin in step. Extend
   `gold_edge.test.ts` to pin the lit edge: across the edge, every pixel lies between the lit
   gold and the lit band, with no dip. `npm test` green. Re-freeze a pin only where the lit
   gold's edge is drawn, and name it; a pin moving anywhere else is a stop. Report the K320
   (`k320_slim`) delta against S2's 42,174 (master before S2: 40,495).
2. **The bite.** Shoot x4 ji 149 on master at K1190's pulse moments, and find what draws the
   bite now (crop it with the webs on and off). Make the web carry the fan's light there, in
   mode 0, with the twin in step and a unit test that pins it. The same pin rule applies. If the
   web's light needs a design choice beyond this (a new texture, or a change to how the web is
   built), stop at the cause and say what the fix would take.
3. **Checks**, with S2's tools (`run_shots2.ps1`, `shoot2.mjs`, `checks2.mjs`, `crops2.mjs`)
   copied to new names for this stage:
   - The edge check: on the shots, no pixel on the lit gold's edge is darker than both its gold
     side and its band side, at every pulse phase and every stand.
   - (c), the locality against master, and the nub and corner checks, as S2 ran them.
   - (a), calibrated on the pure colours reference (S2's `pure.png` per stand), and (b), as S1
     ran it.
   - One explore-mode shot: it draws, and the console has no error.
4. **Sheets**: columns master | branch | pure colours, plus K1190's top row beside x4 ji 149.
   Include three pulse moments at x4 ji 149 (K1190's), the dark line zoomed, and the bite
   before and after. At rest, show one row per kind (cross ji 113, x4 ji 102, loop ji 13, loop
   ji 89, x4 ji 125, loop ji 12, loop ji 88), to show nothing moved. View every crop yourself at
   full size and give a verdict for each spot: the dark line, the bite, and rest. Say what you
   see; pick nothing.
5. **Handoff**, appended below.

## Muse in the main checkout

Muse runs in the main checkout on master during your stage and may push. The coordinator
merges S2's branch into master while you run. At your end, `git fetch -q origin` and rebase onto
`origin/master` (git drops the S2 commits master already has); then run `npm test` again. If the
rebase needs more than conflict lines, don't do it: say what it would take.

## Out of scope

Spots 1 and 2, and look B (stage 4). The crossing-gap mask's zigzags at the T and the four
(K1218). Loop ji 12's dark triangle and x4 ji 149's teal notch (K1219). Fire and collapse
(K1210). Anything for Levi.

## Rules

- PowerShell. Read code through the shell (Select-String, Get-Content ranges); use the Read tool
  only right before an Edit, and to view crops.
- Never touch the main checkout (Muse runs there on master), another worktree or another probe
  folder. Read-only references: K1190's sheets in the main checkout
  (`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1139\out\s4\sheets\`), and S2's shots in
  its worktree (`C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a39ebdc1635ca98dc\.claude\probes\K1211\out2\`).
  Write your own output to `.claude/probes/K1211/out3/`.
- Commit WIP on your branch at every milestone, broken or not; never push; never edit LEDGER.md.
- No helpers.
- Shots in real time (never `--virtual-time-budget`), under the perf lock through your copy of
  `run_shots2.ps1` (owner `K1211-S3`); at most two browsers at a time; ports 5960-5969 only. A
  dev server's build stamp is the SHA it started from: check the served code, as `smoke2.mjs`
  does.
- Stop rule: stop when the tasks are done or 2 h after your start, whichever comes first
  (`Get-Date` at the start and at each milestone). Then commit WIP, append the Handoff and
  report. A compaction is not a stop: after one, re-read this brief and `git log`.

## Report

In plain words, report:
- the dark line's fix and its K320 delta;
- what draws the bite, and the fix (or what it would take);
- the checks' numbers per stand;
- the sheets' paths, and your verdict for each spot;
- the rebase;
- your last commit's SHA.

Then give `Ledger items` and K1211's handle fields (owner, branch, last commit, evidence, next).

## Handoff

(The stage agent appends here.)

Start: 2026-11-05 13:47:41 -08:00 (`Get-Date`). Cap: 15:47:41.

WIP note (14:58): tasks 1 and 2 are in 75bafefb and 4ed0db10. Task 3's checks are done for x4
and cross (outputs in `.claude/probes/K1211/out3/checks_<stand>.txt`); loop, the bite's after
shot and the explore smoke are next, then the sheets. The builds: master = c0a72eb8 (K1209 in,
S1 and S2 out), so master vs branch is S1 + S2 + S3; S2's shots (`out2/s2b`, cfe50075) predate
K1209, so S2 vs branch is S3 + K1209.

### Handoff (15:10): tasks 1-4 done

**Commits.** 75bafefb (task 1), 4ed0db10 (task 2), 11646f59 (the probe tools, force-added under
`.claude/probes/K1211/`: `checks3.mjs`, `crops3.mjs`, `hcat.mjs`, `shoot3.mjs`,
`run_shots3.ps1`, `bite3.mjs`, `s3_ids.ts`), then this note. Shot and check output is untracked
in `.claude/probes/K1211/out3/` (`m/` = master c0a72eb8, `b/` = the branch at 4ed0db10, per stand;
`checks_<stand>.txt`; `bite/`, `bite_b/`; `smoke_xp/`; `sheets/`).

**1. The dark line.** Cause (S2's): a drawing band was composited over the gold at
cw (1 - gC), so a pixel on the gold's one-pixel edge ramp kept a share of the unlit base under a
lit band. Fix: in mode 0 the bands now go under the gold. `junctionField` keeps c0 (the colour
before the gold), cg (after the gold) and gT (the product of 1 - cov over the gold blocks), draws
the bands and the whitening on c0, and ends with `c = cg + gT (c - c0)`: the gold over (the bands
over the base), exact for any number of gold blocks. With no gold (gT 1) the output is S2's bit for
bit; inside the gold (gT 0) it is the gold alone, as S2's; only the edge ramp changes. Look B
keeps gT 1. The explore variant and the CPU twin (`cpuJunctionField`) are in step. Pin:
`gold_edge.test.ts`, rewritten for S3 (the lit edge lies between the lit gold and what is beside
it, no dip and no rise; S2's rule dips). K320: 42,174 -> 42,394 (+220).

**2. The bite.** Still there on master after K1209 (x4 ji 149, k4 and k6). What draws it: the pulse
enters from arm 1 and splits; the drawing band turns into arm 2, and inside that turn the web
reaches past the band's tube. There a banded record's base reads the arms' quiet rows, so the
light stopped at the tube's edge: the twin at k6 is lit to 6 device px left of (1291, 520) and
quiet (122,191,184) from 4 px. With the webs off that spot is background; with the fan bands off
the light reaches the rim. Fix, mode 0 only: per band, `sIn` = side x cross(first leg, chord)
(> 0 inside its turn); where `junctionBase`'s bracketing arms are the band's pair (either order)
and `sIn` > 0, `wW = max(wW, sF yr)`, the band's whitening times its yield, off the tube as on
it. `junctionBase` now leaves jbIa/jbIb in every mode. The twin runs the same rule
(`bandTurnSide`, `bandLightsWeb`). Pin: `test/render/web_light.test.ts` (15 tests). K320:
42,394 -> 42,888 (+494). S3 in all: +714 over S2's 42,174; +2,393 over master before S2 (40,495).
No other pin moved in either task.

**3. Checks** (phases k0-k7, every stand; full output in `out3/checks_<stand>.txt`).
- Edge check (a dip: an edge pixel darker than both its gold side and its band side by more than
  4 luma; a bump: lighter than both).
  - x4: branch 0 dips at every phase; 1 bump, k7 ji 125 (1087, 474), 4.6. S2: dips at k0 9
    (worst 12.5), k3 14 (12.9), k4 24 (23.7), k5 67 (23.1), k6 61 (21.7), k7 37 (17.4); ji 125
    122, ji 149 90. Master: 0 dips (its gold ends in a straight cut); bumps at k2-k6, up to 27 a
    phase (worst 14.3), stray gold past the cut.
  - cross: 0 dips, 0 bumps on the branch, S2 and master.
  - loop: branch 1 dip, k0 ji 88 (1990, 531), 4.9; the same pixel dips in master and S2, so it
    predates S3. S2 also dips at k1 24 (20.4), k2 25 (26.8), k3 27 (16.0), k4 4, k6 1.
- Controls, master vs branch: no pulses (`np`), pure colours, no fan bands (`nb` k0 and k3) and
  webs off (`w0` k0): 0 px at every stand. The live frame without the gap mask moves with the
  light (x4 6,202, cross 18, loop 5,150 px).
- (c) locality, master vs branch: 0 px outside the lit records. x4 47,884 px, furthest 4.22 fh
  (ji 149 21,580; ji 125 21,536; ji 108 1,726; ji 147 1,493; ji 28 1,354; ji 146 195). cross 83
  px at ji 33, 1.60 fh. loop 24,891 px, 3.63 fh (ji 88 24,100; ji 89 791). S2 vs branch: x4
  6,620, loop 2,278 (S3 plus K1209).
- Nub: 0 px at cross 113 and 33, x4 102, 125, 149 and 146, loop 12, 13, 88 and 89.
- Corners: the branch's sharpest is 98 deg at 125 and 149 (bound 109); 113 (90 deg at 3.6) and
  102 (109 at 1.5) unchanged.
- (a), calibrated on `pure.png`: no record's step rose against master at any stand. Lower at x4
  (ji 28 31 -> 22, ji 125 101 -> 75, ji 147 64 -> 58, ji 149 97 -> 73) and at two loop records;
  cross the same (ji 34 59/15 -> 57/14).
- (b): S3 adds no frame-to-frame jump at any stand (S2 vs branch: 0 jumps on the branch alone).
  Against master the jumps are S2's: x4 ji 125 27.1 -> 39.5 (k0), x4 ji 149 20.2 -> 33.7 (k1),
  loop ji 88 27.9 -> 43.2 (k6), frames failing 5/8 -> 7/8.
- Look B: S2 vs branch 0 px at x4 and cross; 63-74 px at loop (1921,498-1960,533), which is
  K1209's (master vs branch reads 0 px there with the fan bands off).
- Explore smoke (`k111&am=instant&fw=0&snd=none&phw=0&xp=threads`, the branch, stamp
  4ed0db10): it draws (the start marker, the stub and its glow; drawn share 0.294), no console
  error, no context lost. `out3/smoke_xp/`, crop `sheets/explore_smoke.png`.

**4. Sheets** (`out3/sheets/`; each viewed at full size).
- `pulse_149_k1190.png`: K1190's top row (left strip, its four cells as they are) beside x4
  ji 149 at k2, k4 and k6 (rows), columns master | branch | pure (`pulse_149.png` alone).
- `dark_line.png`, 6x: x4 ji 149 at (1262, 532) k6 (S2's pixel) and x4 ji 125 at (1022, 472) k4
  (S2's worst dip); columns master | S2 | branch | pure.
- `bite.png`, 5x at (1291, 520): k4 and k6; columns master | branch | pure.
- `rest_1.png` (cross 113 k0, x4 102 k0, loop 13 k0, loop 89 k1) and `rest_2.png` (x4 125 k7,
  loop 12 k0, loop 88 k3): the live frame at each record's least-lit phase, as S2's rest crops
  were (113, 102, 13 and 12 are unlit at every phase); columns master | branch | pure.
  `rest_np.png`: loop 89, x4 125 and loop 88 with no pulse.

Verdicts (what I see; nothing picked):
- The dark line: in S2's column, a darker line one pixel wide runs along the gold's round edge at
  both spots. In the branch's, the gold meets the band's light with no line, darker or lighter.
  Master has no line, but its gold ends in a straight cut. K1190's top row shows a round gold
  edge with the light right under it, and the branch reads that way.
- The bite: in master, at k4 and k6, a ")" of unlit teal hugs the junction's right rim between
  the light and the dark background. In the branch the light runs to the rim at both phases. The
  pure column has no ")", so it was missing light, not shape.
- Rest: with no pulse, master and branch are the same to the pixel at every stand. In the live
  frames, 113, 102, 13 and 12 look the same in both. 89, 125 and 88 are lit at every phase in
  these shots, and their changes sit inside the light: the gold runs whole through the band
  (S2), and the light reaches the gold's edge (S3).
- Seen, not this stage's: the pulse's straight front and the straight-edged teal wedge beside the
  light at ji 149 (spots 1 and 2); loop ji 12's dark triangle (K1219).

**Residuals.**
- Loop ji 88's one edge dip (k0, (1990, 531), 4.9 luma) is in master and S2 too.
- One 4.6-luma bump on the branch (x4 k7, ji 125, (1087, 474)): one pixel, just over the bar.
- The turn side `sIn` is the sign of a cross product, so on a near-straight drawing band it is
  noisy and could switch the web's light from frame to frame. The shots show no new (b) jump, but
  no stand has a band near 180 deg.
- The (b) jumps against master are S2's.
- My master build (c0a72eb8) lacks S1 and S2, so (c) includes them; S2's shots predate K1209, so
  S2 vs branch mixes S3 with K1209.

**What's left:** stage 4 (spots 1 and 2, look B's removal).
