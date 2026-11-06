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
