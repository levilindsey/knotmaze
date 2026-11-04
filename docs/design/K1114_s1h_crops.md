# K1040 S1h (K1114): S1g's at-rest changes, before and after

The coordinator's brief, 2026-11-03. One stage, for a Sonnet agent in
its own worktree, never pushed.

## Why

S1g (`docs/design/K1040_s1g_gates.md`: F1, F2 and the Handoff) changed
two of form B's definitions: F1, the d-edge (`dEdge: "near"`), and F2,
the root gate (`rootBand: 0.5`). Its gate cropped only the pops. At
rest, F1 moves 607 arms and 100 corners and empties four corners' fill,
all in muse_hash (j0 0-1, j36 109-110, j155 471-472, j156 475-473), and
K1114 names a fifth site, j62 189-187, whose r goes from 2.438h to
1.431h. F2 moves 155 corners' r; the largest tip move is 0.221h
(muse_hash j124 375-376). Nobody has looked at any of it at rest. This
stage makes the pictures; the coordinator looks, and Levi gets one only
if it reads as a change.

## The stage

0. Run `Get-Date`. Read F1, F2 and the Handoff of
   `docs/design/K1040_s1g_gates.md`, then the headers of
   `.claude/probes/K1040/s1/b_crop.ts`, `dedge_s1g.ts` and
   `gate699_s1g.ts`. S1f's final is frozen as `form_b_s1f_q.ts`, and
   the Handoff says `new FormB(scene, {dEdge: "skip", rootBand: 0})`
   reproduces it.
1. List the sites, each with its scene, junction and corner, world x,y,
   and what changed:
   - F1's four emptied corners and j62 189-187 (find j62's scene and
     numbers in F1's census, `out/s1g/dedge_near.txt`, or recompute);
   - F2's ten largest at-rest r moves (its census,
     `out/s1g/gate699_rb05.txt`, or recompute against rootBand 0).
2. For each site, a before/after pair: before is S1f's final, after is
   today's defaults, the same scene, centre and scale. Make each pair
   twice, at play size (zoom 1, dpr 2) and at zoom 4. Use `b_crop.ts`;
   if it cannot take form B's options, add a small probe beside it
   (for example `s1h_pair.ts`) rather than editing a shared one. Label
   the panels before and after. Outputs go in
   `.claude/probes/K1040/s1/out/s1h/`.
3. One contact sheet (`out/s1h/sheet.png`) holding every pair at zoom
   4, each labeled with its scene, site and change, and an index
   (`out/s1h/index.md`): one row per site with the scene, the site,
   what changed (fill emptied; r from h to h; tip move) and its files.
4. Commit the new probes and the index (`.claude/probes` is ignored, so
   `git add -f`), and the PNGs if they total under 5 MB.

Done: every listed site has its pair at both sizes, and the sheet and
the index exist. Don't judge the looks: describe what differs between
before and after in one line per site, and leave the verdict to the
coordinator.

## Rules

- **Worktree only.** Muse commits on master in the main checkout
  (`C:\Users\lsl\Repositories\knotmaze`). Never edit files there, never
  run git there except `fetch`, and never push.
- **Inputs.** The probes read the main checkout's scenes
  (`.claude/probes/K868/scenes`), as the S1g Handoff says. Read them in
  place; don't copy them into the worktree.
- **Commits.** Commit WIP at every milestone.
- **No timing and no phone.** This stage takes no perf lock. If it
  needs a dev server, use a port in 5405-5409; avoid 5173, 5403, the
  phone's 5480-5489, Muse's 5500-5599 and K1139's 5620-5639.
- **Reading code.** Read it through the shell: `Select-String`, then
  `Get-Content <f> | Select-Object -Skip <n> -First <m>`. Use the Read
  tool only right before an Edit, and to look at a PNG you made. No
  helpers.
- **The stop.** Stop when the stage is done or 1 h after step 0's
  `Get-Date`, whichever comes first.
  - Run `Get-Date` at each milestone.
  - A compaction is not a stop. After one, re-read this brief and
    `git log`.
  - At the stop, commit. Then append a Handoff to this brief (what
    landed, commit by commit; the sites; the commands; anything left)
    and commit again.
  - Then report: the sheet's and the index's paths, one line per site,
    a `Ledger items` list, and K1114's handle fields (owner, branch and
    last commit, evidence, next, brief).

## Handoff (S1h agent, 2026-11-03, stopped 14:45, stage done; cap was 15:06)

The stage is done: 18 sites, each with a before/after pair at play size
(zoom 1, dpr 2) and at zoom 4, one contact sheet and an index. Nothing is
pushed. Branch `worktree-agent-ae83ec07a4b4a228c` (worktree
`.claude/worktrees/agent-ae83ec07a4b4a228c`). The coordinator's verdict on
the pictures is all that is left; no judgment on the looks is made here.

### What landed, by commit
- `6ed0fd55` the site list (`s1h_sites.ts`: builds the S1f-final, the
  defaults, F1-only and F2-only forms per scene, picks the sites, writes
  `out/s1h/sites.json` and `sites.txt`) and the pair probe
  (`s1h_pair.ts`), WIP.
- `aa049a13` the 36 pair PNGs, `sheet.png`, `index.md`, `pairs.txt` (WIP).
- `e73a0317` the diff panel made signed (after minus before: red = more ink
  after, blue = less), one `seen` line per site (what differs, no verdict)
  in the pictures, `pairs.txt`, the sheet and `index.md`; the figures of
  sites 05, 16, 17, 18 re-measured along rows or columns of the forms' ink
  (WIP).
- `f58553ac` site 17's elbow in its `seen` line; `s1h_runs.ts` (ink
  runs along rows or columns) and `s1h_zoom.ts` (zoom 6-10 crops, before |
  after | signed diff) kept (WIP).
- the commit holding this Handoff.

### The sites (`out/s1h/index.md`: one row each; `sites.txt`: the numbers)
- 01-04: F1's four emptied corners, all muse_hash: j0 0-1, j36 109-110, j155
  471-472, j156 475-473 (03 and 04 are the two ends of one small eye).
- 05: muse_hash j62 189-187 (F1, r 2.438h -> 1.431h).
- 06-15: F2's ten largest at-rest r moves (by delta r / h): muse_default_tw
  j57 172-173, muse_hash j23 72-70, muse_hash j110 335-333, muse_default_tw
  j110 335-333, muse_default_tw j164 499-497, muse_hash j57 172-173,
  g41_user_tw64 j12 36-37, user_tw42.lightpaper j49 151-152, g41_user_tw42 j49
  151-152 (13 and 14 are one corner in two scene files), muse_hash j124 375-376.
- 16-18: not in the brief. The three largest tip moves among corners the
  list does not hold, all F1's: muse_hash j131 397-398, j99 301-299, j73 222-220.
- 18 pairs hold 16 distinct changes.

### Commands (from the worktree; it has no node_modules, Node finds the main checkout's)
- `npx.cmd vite-node .claude/probes/K1040/s1/s1h_sites.ts` (about 30 s): the site list.
- `npx.cmd vite-node .claude/probes/K1040/s1/s1h_pair.ts` (about 35 s): the pictures, `sheet.png`,
  `index.md`, `pairs.txt`. The one-line `seen` texts are the `SEEN` map in `s1h_pair.ts`, keyed by site
  id (a missing key prints "(not described)").
- `s1h_runs.ts` and `s1h_zoom.ts`: usage in their headers (`ARGS` env).
- Scenes are read in place from the main checkout's `.claude/probes/K868/scenes`.

### Findings worth keeping
- `FormB({dEdge: "skip", rootBand: 0})` reproduces the frozen S1f ink exactly at all 18 sites (0 px differ,
  both windows), so before = S1f's final and the only difference to after is F1 and F2.
- F1's four emptied corners: the old fills at j0, j155, j156 are r 0.04-0.13h (under 2 device px), so what
  differs there is at the thread ends and the eye; j36's old fill was r 2.721h. The defaults build no corner at
  j0 and j156; j36 and j155 keep one with r = 0.
- S1g's "tip moves at most 0.221h (j124)" is the straight-arm formula
  (`docs/design/K1040_s1g_gates.md`, lines 303 and 577). Measured from the corners' own V, q, r (the arc point nearest V),
  j124 moves 0.087h and the ten F2 sites 0.036-0.096h. The F1-driven tip moves are larger: 0.34-0.75h at sites 16-18
  (F2 0.000h there).
- A play-size window can hold other corners' changes: site 04 144 px against 112 in the zoom 4 window, site 08 230
  against 36 (F1 elsewhere), site 09 83 (F2 elsewhere).
- The sheet holds before | after only (the brief's ask); the signed diff is in each site's own pictures.

### Left
Nothing technical. The coordinator looks at `out/s1h/sheet.png` and the per-site pictures and decides whether
any of it reads as a change worth showing Levi (K1114).
