# K1240 S1: one outline for both looks - a clean prototype

Ledger: K1240. Claude sent this run: one Muse run, started through Paseo from this committed brief,
which is the authority. It works in its own worktree and pushes to master when Done holds. Cap 2 h.
Ports 5980-5989.

## Goal

Levi's sketch (2026-11-06; `docs/ledger_notes.md`, K1240):
- Each thread is a centreline polyline, and its two borders are offset polylines at the half-width h.
- Cuts are segment intersections. At a crossing, the under thread's borders stop on the over's
  outline. At a junction, the arms are trimmed against each other into one outline, with a corner
  arc spliced in where two arms' borders meet. Dead ends get round caps.
- That one outline is the single geometry definition. The border look strokes it, and the filled
  look fills the regions it bounds.

Today five renderers each derive junctions on their own: ribbons and joinery, junction fans, arm
strips, route bands and the field. Their disagreements are the seams. Levi asked for "a new prototype
of this approach, without all the tech debt of the current systems", and for the approach to be
verified there. Find out three things: is it simple, is it exact, is it cheap?

Binding (Levi):
- The structure is defined once: which pieces exist, which crossing cuts which border, which corner
  joins which arms, and sharp or round. Only positions follow the frame.
- Cut and tangent points are fractional, because crossings slide along the threads and arm angles
  change. Each frame recomputes them in closed form from that frame alone: no stepped walks, no
  iteration warm-started from the last frame, no state carried between frames.

## Read first

- `docs/design/K868_field_border.md` §1-2: the border look's goals and its check table.
- `docs/design/K1040_junction_field.md`:
  - F1, the calls;
  - F2, form B: the exact definition and the corner radius rule, which the prototype matches;
  - F3, the discrete decisions. For each, say whether the prototype has it and how it stays
    continuous.
- `src/render/field/scene.ts`: the FieldScene format (centrelines, crossings, junctions, corners,
  dead ends).
- `.claude/rules/probes.md` and `.claude/rules/render.md`. Muse does not load them by itself.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1240-s1`. Claude made it,
  detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- Everything new goes in `.claude/probes/K1240/proto/`, and nothing in `src/` changes.
  - Track the source and tests with `git add -f <file>`, by name.
  - Outputs go to `.claude/probes/K1240/out/` and stay untracked.
- Input is FieldScene JSON: the scene's centrelines exactly as given, so that the comparison with form
  B is like for like.
  - The 12 scenes are read-only in the main checkout: `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K868\scenes\*.json`,
    not the `*.diag.json` files.
  - The app's export (`window.__knotSceneExport`, `src/render/field/scene_export_hook.ts`) makes more.
- The reference is form B (`src/render/field/form_b.ts`) in float64, as check #12 uses it
  (`.claude/probes/K1040/s4c/s4a.mjs`). It is the only code from `src/render/` you may use, and only
  in the checks. Copy any tool you use.
- Browser jobs:
  - Run each one under the perf lock (`$env:TEMP\claude-perf.lock`, owner `K1240-S1`), waiting
    inside one blocking command. K1040 S4d and K1220 S6 run on Muse and take the lock too.
  - Use real-time, headed Chrome, at most two browsers.
- Dev servers run only on a private-cache config (copy `.claude/probes/K1040/vite.private-cache.config.ts`),
  on ports 5980-5989.

## Done

1. **The builder.** `outline.ts` is pure TypeScript: a FieldScene goes in and one outline table
   comes out.
   - The table holds the pieces (border runs between cuts, corner arcs, caps), each with its chain,
     side and s range, plus the regions they bound.
   - A test fails if the builder imports anything from `src/render/`.
2. **Exact.** On the 12 scenes, compare the outline with form B's exposed outline, both ways, in
   device pixels at dpr 2.
   - Report the p99 and the maximum distance per scene, outside F3's fade widths.
   - Target: p99 at most 1/8 px, maximum at most 1/2 px. Crop and name every spot over that.
3. **Both looks from the one table,** drawn by one small WebGL2 page (`index.html`).
   - The border look: strokes, K868's goals 1-6.
   - The filled look: one flat colour per section in `src/core/section_colors.ts`'s scheme, borders
     off.
   - Tests: the fill's edge lies on the stroke's centre within 1/8 px. Inside the outline every
     pixel is fill, with no gap, doubled pixel or seam where pieces meet. In an overlap the over's
     piece owns the pixel, from the cuts alone, with no depth or label pass.
4. **Cheap.**
   - The builder's time per frame on each scene on the desktop: median and p95, under the lock.
   - The draw's GPU time at dpr 2.
   - Line counts for the builder and the draw.
5. **Sheets** at zoom 4, in `.claude/probes/K1240/out/sheets/`.
   - The border look beside form B's (`&fbb=1`) and today's border look.
   - The filled look beside today's default look.
   - Spots: those in K1040 S4d's Done 4 (the eyes K1045, the bends K1049, a corner ball near
     another thread K1002, a V apex K1003), plus every junction of def on a contact sheet.
   - Name the two sheets to show Levi first.
6. **A Handoff** appended to this brief: the numbers, what failed, the command that runs the tests,
   and what S2 should measure. S2's ground: continuity across frames on recorded drags, plucks and
   flow; the Pixel's p95.

## How to work

- Commit finished, tested parts and push them to master yourself:
  - `git fetch`, rebase on origin/master, `npm test` green, then push `HEAD:master`.
  - Stage files by name. Never force-push, skip hooks, or add anything under `out/`.
- Ledger follow-ups go through
  `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`. Leave K1240's
  handle alone; Claude keeps it.
- No subagents.
- Stop when Done holds or at 2 h, whichever comes first. Run `Get-Date` at the start and at each
  milestone. When you stop, commit your WIP, append the Handoff, push, and report.

## Handoff (S1, 2026-11-06, started 15:18 PST, stopped at the 2 h cap)

Built and pushed on master: the pure builder `.claude/probes/K1240/proto/outline.ts`
(1451 lines, zero imports — nothing from the app renderer; a test fails if that
changes), its synthetic tests `outline.test.ts` (ALL PASS: straight tube area/caps,
crossing lens owned by the over chain, T-junction round corners, fill-edge vertices,
import guard), the exact check `check_exact.ts`, the bench `bench.ts`, and the
WebGL2 page (`index.html` + `main.ts` + `draw.ts`, 329 lines): one table drawn as
border bands and as a stencil fill, with pixel tests on `window.__k1240`.

### Numbers

Exact vs form B, device px at dpr 2 (p50 is 0.000–0.014 px on every scene — the
geometry agrees to the last bit almost everywhere; the tails do not):

| scene | ours→B p99 | ours→B max | B→ours p99 | B→ours max |
|---|---|---|---|---|
| muse_hash | 4.518 | 15.42 | 36.36 | 64.52 |
| muse_default_tw | 5.949 | 12.73 | 28.38 | 54.04 |
| def | 3.334 | 8.93 | 32.39 | 58.17 |
| fat | 4.330 | 4.99 | 6.94 | 13.16 |
| ring | 4.869 | 13.17 | 45.98 | 63.26 |
| user_tw42.lightpaper | 2.730 | 12.97 | 30.64 | 54.22 |
| g41_def_tw42 | 3.064 | 9.38 | 28.68 | 55.52 |
| g41_def_tw64 | 3.818 | 9.70 | 33.93 | 49.88 |
| g41_ring_tw42 | 2.631 | 10.69 | 30.33 | 57.69 |
| g41_ring_tw64 | 4.944 | 12.88 | 44.18 | 60.87 |
| g41_user_tw42 | 2.593 | 12.97 | 30.45 | 61.34 |
| g41_user_tw64 | 4.255 | 15.13 | 48.75 | 71.88 |

The B→ours tail is mostly a check artefact: most of form B's raw border
candidates are buried under other tubes in form B's own field (the check counts
them anyway — e.g. g41_user_tw42: 21,060 of 21,459 candidates buried), so they
have no exposed counterpart. The genuine ours→B tail sits at junctions and dense
self-crossing eyes. Worst named spots in def: ours→B 8.93 px at (7.29, 12.07),
runs ch88/ch91 beside j184 (~1.4h away); 8.72 px at (6.62, 20.83) beside j9.
B→ours 58.17 px at (1.47, 7.03), chain 41 beside j107 (3.8h) — inside the buried
class above. Corners solved: def 360/386 (form B 361), muse_hash 186/342 (form B
192) — muse_hash is the worst corner scene; the rest match or beat form B.

Page pixel tests (12 scenes, `out/page_results.json`): fill samples land on the
owning chain's colour 93–96% (fat 1113/1291, def 1571/1684, ring 338/352);
overlap ownership from cuts alone 100% on fat (428/428) but only ~57–63% on
junction scenes (def 222/353, ring 72/87); border band inside 97%, outside-not-ink
86–95%; fill edge on the stroke centre 89–92% (def 17670/19385). Draw GPU time at
dpr 2 (10 synced draws, median): fill 1.4–11.2 ms, both 1.5–12.4 ms, border below
timer resolution (<0.1 ms). Builder CPU (median/p95 under the perf lock): ring
239/278 ms, user scenes 656–838 ms, def 2387/2680 ms, muse_hash 2422/2685 ms —
seconds per build, nowhere near per-frame; the split/face-trace passes dominate.

### What failed

- Done 2's target (p99 ≤ 1/8 px, max ≤ 1/2 px) is not met in the tails, per the
  table. The median outline is exact; junctions, terminals and kink eyes are not.
- Done 3's pixel tests fail as listed. Root cause found, not fixed: the planar
  face trace produces monster faces in dense areas (def face 546 is one simple
  1007-edge loop; 66 faces have >200 edges). A big eye face takes the owner of
  whatever tube passes near its sample, so whole eyes fill with one chain's
  colour (visible as the yellow balloon in `out/page_def.png`). Overlap ownership
  inherits the same defect. The stencil fill itself is exact for simple loops —
  ear clipping was replaced by stencil fan + bbox quad per face for that reason.
- Sheets: zoom-4 crops for def/ring junctions are in `out/sheets/` (not
  committed; `out/` stays unadded). Show Levi first: `out/page_def.png` (the
  balloon defect) and `out/sheets/def_junctions_border_sheet.png`. The side-by-side
  against form B (`&fbb=1`) and today's looks was not produced; the exact check's
  numbers stand in for it.
- `outline.ts` had an encoding accident mid-run (PowerShell text round-trips
  bloated comment lines to a 101 MB file; GitHub refused the push). Repaired to
  pure ASCII via Node; never rewrite this file through PowerShell text IO again.

### Commands

- Builder tests: `node scripts/run_node.mjs .claude/probes/K1240/proto/outline.test.ts`
- Exact check: `node scripts/run_node.mjs .claude/probes/K1240/proto/check_exact.ts [scene,...]`
- Bench: `& .claude/probes/K1240/proto/run_locked.ps1 -Script bench.ts`
- Page + tests: `& .claude/probes/K1240/proto/run_locked.ps1 -ScriptName run_page.mjs -RunArgs @('def,ring')`
- Sheets: same with `-RunArgs @('def,ring','sheets')`, then `out/montage.ps1`.

### For S2

Per the brief: continuity across frames on recorded drags, plucks and flow, and
the Pixel's p95. Before that pays off, S2 should also: (1) fix face tracing so
dense areas subdivide into small faces (cap face edge count; investigate the
half-edge turn rule at coincident vertices) — this unblocks fill and overlap
ownership; (2) cut builder time from seconds toward frame budget (profile points
at the split-candidate gather and `spliceAll`); (3) solve the 26–156 unsolved
corners per scene (muse_hash worst); (4) re-run the exact check with form B's
exposed outline only, dropping buried candidates, so the B→ours tail measures
the real gap.

