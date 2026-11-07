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
