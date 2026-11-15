# K1408: Muse batch 23, rp=gf fixes (overnight 2026-11-15)

Six runs, one at a time, started by Claude through Paseo with the K1053 chain (`.claude/probes/K1053/`, tags 23A to
23F). This brief is the authority: a run does its own section and stops. Levi (2026-11-15): getting the rp=gf
junction spots truly correct is the most important thing now; maximize Muse.

**rp=gf** (K1362) draws the junction and outline look per pixel on the GPU: a worker builds CPU tables
(`src/render/gpu_field/tables.ts`, `gf_build.ts`, `gf_worker.ts`) and a shader pass draws them (`gf_glsl.ts`,
`gf_pass.ts`, `gf_look.ts`, `gf_reveal.ts`, `gf_app.ts`). It is opt-in (`rp=gf` in a link), so the shipped default
look does not change, but every push to master deploys. **Today's look** is the default renderer.

## How to work (every run)

- **Read first:** your run's section, its ledger items (`node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs
  show <ID> --repo .`), the documents it names, then the `.claude/rules/` files whose `paths:` cover the files you
  touch (`docs/lore_index.md` maps them; always `render-gpu-field.md`, `render.md`, `probes.md`). Muse does not
  load them by itself.
- **Checkout:** the main checkout, on master. Start with `git pull --rebase`. Leave it on master, clean (no tracked
  changes) and level with origin/master when you stop: the chain checks that before the next run.
- PowerShell. Read code with Select-String and 40-80 line ranges of Get-Content; never print a whole file. Write
  TypeScript through Node or the editor, never through PowerShell text IO. No subagents.
- **Dev servers and probes:** a port of your own, 5480-5499 (never 5173, Levi's). A pixel-exact GPU probe (census,
  sheet, same-state A/B) and every timing take the perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start
  time, what); wait for another owner inside one blocking command (poll each minute, up to 30 minutes; older than
  30 min is stale); delete it when done. Never `--virtual-time-budget`; headed real-GPU Chrome off-screen
  (`probes.md`). Never touch the phone. Cap parallel Chrome or Node workers at 4.
- **Commits:** each finished, tested part: stage files by name (scripts under `.claude/` need `git add -f`),
  `npm test` green, the message ends with `(Muse batch 23 Run <X>, 23<X>)`, then `git pull --rebase` and
  `git push origin master`. Never force-push, skip hooks, or commit outputs (`out/`, PNGs, probe JSON). After a
  push, watch its deploy run (`gh run list --workflow deploy.yml --limit 3`) and fix red before anything else.
- **Ledger:** close your run's item with `ledger.mjs done <ID> --commit <sha> --repo .` only when every Done
  holds; file follow-ups with `ledger.mjs add --section Residuals --text "..." --repo .`. Leave K1407 and K1408
  open (Claude closes them).
- **Looks:** you match a reference (form B's CPU oracle, today's look, an earlier sheet), never invent a look. Put
  before/after crops of what you changed under `.claude/probes/<ID>/out/` (untracked) and name them in the
  handoff: Claude looks at them before telling Levi anything is fixed.
- `Get-Date` at the start and at each milestone. **Stop** at 2 h or when every Done holds. A Done that looks out of
  reach is not a stop: spend the time on the next most promising part. Then append `### Handoff 23<X>` under your
  run's section (start and stop times, the before/after numbers, what changed, what is left), commit and push it,
  and report. A stopped run pushes only its finished part and keeps the rest as a patch under
  `.claude/probes/<ID>/` (untracked).

## Run A (23A) and Run C (23C): K1407, the gf look to zero census finds

K1362 s1's census compares rp=gf's GPU readback with form B's CPU reference pixel by pixel on 12 scenes: 301 finds
(rp=outline then: 17), every one an incomplete port of form B (the corner set, stray arcs, K1049 radii, burial).
Read `docs/design/K1362_s1_gpu_formb.md` (Goal, How the result is judged, the Handoff's accuracy part) and
`docs/design/K1362_s2_glsl.md`'s handoff; the tools are `.claude/probes/K1362/k1362s2_census.ps1` (its header) and
`k1362s2_census.ts`. The speed stages since kept the tables bit-identical (`.claude/probes/K1362/k1362t1_digest.ts`),
so nothing has fixed a find since 11-12.

- **Run A:** first re-run the census on master and record finds per category per scene (the baseline). Then fix
  the category with the most finds. **Run C:** read 23A's handoff, re-run the census, fix the next category.
- **The bar is the look Levi approves, not form B.** Port form B where it is right. Form B is known wrong in two
  places: K1315's under-tail ends and K1267's jitter (`ledger.mjs show K1315 K1267`). Do not copy form B there:
  list those finds separately and leave them.

**Done (per run):**
1. The category's finds at 0, or as low as you reach, with the remaining ones explained; no other category's count
   rises on any scene; the total falls. The census before and after in the handoff.
2. Crops of at least 8 fixed spots, 4x, each as master gf | new gf | form B reference | today's look, plus one
   contact sheet, under `.claude/probes/K1407/out/23<X>/`.
3. The tables' new digest (`k1362t1_digest.ts`) in the handoff; any test that pins it updated in the same commit.
4. Speed: the worker's ms per rebuild on the def and fat desktop drags (`.claude/probes/K1362/k1362c1_bench.ps1`,
   perf lock), p50 no more than 10% above master's.
5. `npm test` green.

## Run B (23B): K1404, rp=gf's intro draws no ribbons

Under rp=gf the default intro draws the reveal sparks but no ribbons, while today's look draws them. K1383 s1's
sheet (handoff commit 03102199, `docs/design/K1383_s1_gf_reveal.md`) drew ribbons through the reveal, so a later
commit regressed it; it is also broken at 119249c0. Sheet tool: `.claude/probes/K1387/k1387_sheet.mjs`; the broken
sheet is `.claude/probes/K1387/out/s2h_def_sheet.png`.

**Done:** 1. The first bad commit named (bisect between 03102199 and master with the sheet). 2. Fixed on master: in
every sheet frame where today's look shows ribbons, gf shows them, its ribbon pixel count at least 90% of
03102199's sheet for that frame (counts in the handoff). 3. A test that fails on the regression, where one can
(a Node test of whatever broke). 4. The am=instant look and the tables digest unchanged. 5. `npm test` green.

## Run D (23D): K1405, rp=gf draws no gold traveled path in play

In play under rp=gf the gold traveled path is missing; today's look draws it (`.claude/probes/K1387/out/
play7_gf_head.png` against `play7_today_head.png`; find the script that made them under `.claude/probes/K1387/`).
Carry the traveled path's paint (`paintTraveled`, `trail_paint.ts`, the memory trail's fade) into gf.

**Done:** 1. On seed 7 after the same walk, gf's gold pixels in the head crop within 15% of today's and on the same
runs (same-state recipe: `probes.md`, K83 and K550). 2. Before/after crops. 3. Nothing else in the frame moves
(the same A/B with no walk: 0 px beyond the K83 control). 4. `npm test` green.

## Run E (23E): K1398, rp=gf crossing gaps clear to the background

Where today's look paints a crossing's gap in a flat dark casing colour, gf clears it to the background: in the
border look gf's outline reads redder and fainter (pixels darker than the background: today 11k-21k, gf about
1.4k), and in fill today shades the under-thread softly where gf draws a crisp line (K1389 s1 handoff,
`.claude/probes/K1389/out/z_pair.png`, its probe `k1389s2_desk.mjs`).

**Done:** 1. Border look: gf's darker-than-background count within 20% of today's on the K1389 scenes. 2. Fill: the
under-thread shading's profile across a gap within 15% of today's at its midpoint (measure it; say how). 3. Crops,
4x, today | master gf | new gf. 4. `npm test` green.

## Run F (23F): K1374, the slice pool on junction builds

The slice pool (`gf_slice_worker.ts`, `gf_split.ts`, Muse t2) engages only on junction-free builds: the
coordinator's 6-8 ms serial prefix eats its gain (`docs/design/K1362_t2_muse_build.md`, both handoffs). Make it win
on junction builds (partition pins by chain and the chunk merge by cell range, or send the slices the scene as
typed arrays), or remove it.

**Done:** 1. Every frame's tables bit-identical to a cold build of the same code: the digest on the 12 scenes and
the s18 drags (take the digest master has after 23A and 23C). 2. The worker's ms per rebuild on the def and fat
drags (`k1362c1_bench.ps1`, perf lock) p50 at least 25% under master's; if no variant reaches it, remove the pool
and its code, and show the removal costs nothing. 3. `test/render/gf_build.test.ts` covers the new path.
4. `npm test` green.
