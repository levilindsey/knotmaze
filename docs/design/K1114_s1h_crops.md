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
