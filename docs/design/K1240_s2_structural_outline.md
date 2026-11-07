# K1240 S2: the outline from the scene's own structure

Ledger: K1240. Claude sent this run: one Muse run, started through Paseo from this committed brief,
which is the authority. Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1240-s1`
(reused, detached at this brief's commit, `node_modules` junctioned; never `npm ci`). Ports 5980-5989.
Cap 2 h.

## Why S2

S1 (`docs/design/K1240_s1_outline_proto.md`, its Handoff) split every one of def's 75,889 border
segments wherever any other crossed it, traced 1,994 faces, and guessed each face's owner from a
sample point. That re-derives the structure every build, which Levi's binding rule forbids (the
structure is defined once; only positions follow the frame). S1's failures come from that route:
- 0.24-2.6 s per build;
- holes between threads filled with a neighbour's colour (main checkout:
  `.claude/probes/K1240/s1_out/page_def_top.png`);
- exposed borders missing (def: chain 41 beside j107, 58 px from any of ours) and our borders 8-9 px
  off form B's beside j184, j9 and j135.

What held: plain borders lie on form B's (median 0.000 px), and the border look draws in under 0.1 ms.

## Goal

Rewrite `outline.ts`'s core so that every cut comes from a feature the scene names. Keep the table
format, so `draw.ts`, the page and the checks still work. No global split, no face tracing, no
sampled owners.
- **Borders:** each chain's two offsets at h. Where an offset folds back at a tight bend, cut its
  swallowtail at the self-intersection, searched inside that bend only.
- **Crossings:** for each crossing in the scene, intersect the under's two borders with the over's
  two borders near it, starting from the crossing's s on each chain. The under's borders and its
  strip end on the over's borders; the over's run on.
- **Eyes:** where two crossings of the same pair, or a kink's self-crossing, leave the tubes
  overlapping between them, the top changes at the depth tie, a closed-form point from the diagram's
  depth. Cut there, and crop how it looks.
- **Junctions:** arms in angular order. Each neighbouring pair's facing borders meet at a corner,
  where the arc of form B's radius rule (`docs/design/K1040_junction_field.md` F2) is spliced in
  tangent to both. The junction is one polygon.
- **Dead ends:** round caps.
- **Regions:** each piece of a chain's strip between its cuts, and each junction polygon. A region's
  owner is the chain or junction it came from.
- **Features that reach each other** (a crossing inside a junction's reach, a corner arc near
  another thread): apply the same rules in order along the border. Count and crop those spots.

Read first: S1's brief and Handoff, S1's `outline.ts` (its table format), K1040 F2-F3,
`src/render/field/scene.ts`, and `.claude/rules/probes.md` and `render.md` (Muse does not load them).

## Done

1. **The builder** as above, still with zero imports. Synthetic tests: a straight tube, an X
   crossing, a closed eye, T and Y junctions, a fold and a dead end.
2. **Exact** on the 12 scenes, both ways, outside F3's fade widths, in device px at dpr 2: p99 at
   most 1/8 px, max at most 1/2 px.
   - Fix the check first. It drops every sample where form B gives no distance (Dexp = infinity:
     23,817 of def's 56,060 ours-to-B samples; `form_b.ts` `inkOf` leaves Dexp infinite unless a
     weight there reaches 0.5). Find out what those samples are, and measure them.
   - Report measured and dropped counts per direction. Crop and name every spot over target.
3. **The page's tests from S1, passing:** fill owner, overlap ownership from the cuts, border band,
   fill edge on the stroke centre.
4. **Cheap:** builder median and p95 per scene on the desktop, under the lock. Target: def's median
   at most 3 ms. Draw GPU time at dpr 2.
5. **Sheets Levi can read**, at zoom 4, in `out/s2/sheets/`: no test text over the picture, and
   strokes that stand out from the background. def's junctions, its closed eyes, and S1's spots
   (j184, j9, j135, j107), each beside form B's border look (`&fbb=1`) and today's look. Name the two
   to show Levi first.
6. **A Handoff** appended to this brief: the numbers, what failed, and the commands.

## How to work

- Commit finished, tested parts and push them to master yourself: `git fetch`, rebase on
  origin/master, `npm test` green, then push `HEAD:master`.
- Stage files by name. Never force-push, skip hooks, or add anything under `out/`. Outputs go to
  `.claude/probes/K1240/out/s2/`.
- Never rewrite `outline.ts` through PowerShell text IO (S1's 101 MB accident). Write it through Node
  or the editor.
- Browser and timing jobs: under the perf lock (`$env:TEMP\claude-perf.lock`, owner `K1240-S2`),
  waiting inside one blocking command. At most two headed, real-time browsers. Kill every browser,
  dev server and runner of yours, and release the lock, before you stop.
- Ledger follow-ups go through `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
  Leave K1240's handle alone; Claude keeps it.
- No subagents.
- Stop when Done holds or at 2 h, whichever comes first. Run `Get-Date` at the start and at each
  milestone. When you stop, commit your WIP, append the Handoff, push, and report.
