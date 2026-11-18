# K1460: rp=gf's crossing fade, the leftovers after K1458 (Claude agent stage)

K1458 (merged c5fc87d1, live) made rp=gf fade the under thread before a crossing as today's renderer does, live
with the "Crossing fade" slider. Read `docs/design/K1458_gf_crossing_fade.md` whole first (Levi's words, the
cause, Handoff K1458 and its tools in `.claude/probes/K1458/`). The bar is unchanged: **today's renderer at the
same slider value**, spot by spot.

## What is left (coordinator, live build c5fc87d1, real slider drags; `.claude/probes/K1458/live/`)

`zoom_a.png`, `zoom_b.png` (rows today | gf | gf + gfh 1; columns fade 0.14 | 0.62 | 1.2, 4x of
`?3&xp=off&am=instant`), `zoom0_a.png` (fade 0), and the agent's `pv6` sheet described in Handoff K1458:

1. **A thin dotted line continues the over thread's edge across the faded under thread** at fade 0.28 and up
   (every crossing in `zoom_a` and `zoom_b` at 0.62 and 1.2; today draws nothing there). Levi named this
   ("plenty of border artifacts"). It is the first thing to fix.
2. **Radial bands and a stepped outer edge** on long fades along curved threads: the blue kink loop in `zoom_a`
   at 1.2 (today's ramp is smooth), junction B and ci3's upper right in Handoff K1458.
3. Today's protect term (pr) is not ported into gf's gap window (Handoff K1458).
4. A small round blob at junction B at fade 0 (Handoff K1458), if it is in your files.

Not yours: the dashed dark tick across the top of the kink loop at every fade (`zoom0_a.png`) is the junction
field's (K1451, another agent in `tables.ts` / `eval.ts` / `gf_glsl.ts`). Report what you learn about it.

## Done

1. On a local build of your branch, at fade 0, 0.14, 0.5 and 1.2, with and without `gfh=1`: a 4x sheet
   (today | master gf | your gf) of the six crossings and three junctions of K1458's sheet plus the kink loop of
   `zoom_a`, and at each no dotted line, band or stair that today does not draw. Look at every tile yourself.
2. A number for item 1 that fails on c5fc87d1 and passes on your branch (for example gf-only dark pixels inside
   the under thread's faded span, per crossing side), added to `fade.mjs` or beside it; `fade.mjs` compares
   same-state loads (retry until the physics hashes match, as `dragcheck.mjs` does).
3. `dragcheck.mjs` passes for gf and gfh; `hold.mjs` (`.claude/probes/K1450/`) passes 60/60 on
   `?3&xp=off&am=instant&rp=gf` and `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`.
4. `npm test` green; flag-off shader text, keys and pack unchanged (`test/render/gf_home_glsl.test.ts`).

## How to work

- Your worktree. Start with `git fetch origin`, `git merge --ff-only origin/master`, `Get-Date`.
- Files: `gf_look.ts`, `gf_pass.ts`, `gf_app.ts`. Muse batch 25 edits `gf_look.ts` too (route bands, then the
  burn's char) in the main checkout: keep the diff small and rebase on origin/master before the handoff.
  Hands off `tables.ts`, `eval.ts`, `gf_keys.ts` and the field evaluation in `gf_glsl.ts`.
- PowerShell. Read code through the shell; the Read tool only just before an Edit, and for images.
- Ports 5580-5599. Headed, real-time Chrome, never `--virtual-time-budget`. No perf numbers are asked: do not
  take the perf lock. Stop your preview servers when done.
- Commit WIP at every milestone, broken or not (`git add -f` for probe files). Never push. Never edit
  LEDGER.md. Never use bare `git stash`. Never touch the phone.
- Own the technique; do not stop at the cause. For anything open at the stop line, report what you tried and
  why each attempt fell short.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1460` here, commit, and report: what holds, the sheets' paths (each spot named fixed or
open), the numbers, a `Ledger items` list and K1460's handle fields.

### Handoff K1460

Claude agent af9d883f955f02076, 2026-11-17 11:10-13:05; stopped at the 2 h cap. Branch
`worktree-agent-af9d883f955f02076`, rebased on origin/master 1de01c12 (one conflict with Muse 25 in the output
site's line, resolved by keeping 25's line and adding the fringe call). Sheets (not tracked):
`C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1460\out\` (`sheet_12.png`, `sheet_05.png`: today | master gf
| 76dbcb86 at seven sites; `kink.png`, `kink3.png`, `kink4.png`: the kink loop; `fx1c.png`: the dotted line).
All shots are one frozen state (hash 49c20566, `shot.mjs` with HASH), 1600x900 at DSF 2.

- **Item 1, the dotted line: fixed** (a8d36be3). gf_glsl's `layers()` labels a pixel only where d < h, so an
  antialiased fringe pixel (coverage, no label) was never cut and took a labelled neighbour's colour along the
  over thread's edge. `lkFringe` cuts it by its lowest piece's gap. Gone at all six crossings at 0.5 and 1.2.
- **Kink loop tick (coordinator's addition): fixed at 0, 0.14, 0.5; open at 1.2** (3e8f23bb). The window
  bake names the over pass on the SAME chain, and `lkNearOn` found the loop's own centreline, so the cut drew a
  circle around the search's clamped end (the dashed tick). Now the search skips the under pass's half of the
  chain and drops a hit clamped at that border. At 1.2 the fade still reaches around the loop top and ends in a
  radial edge (today fades only the lower left): the window's arc reaches too far around a small loop.
- **Item 2, radial bands and stairs: open.** Still at jB 866,138, ci3 580,70, 941,75 and the kink loop's crossing
  at 1.2 (sheet_12). Tried: central-difference tangents blended along the segment (`lkTanS`, as today's
  gap shader), in b0707a26, set aside in cdb54238 because that build hung a 1600x900 DSF 2 load (Pixi "Could not
  initialize shader", a context loss) and was never seen on screen. One later gfh load of the tip failed the
  same way and its retry composed, so that loss may be transient, not the change: retry b0707a26's lkTanS alone.
- **Item 3, protect: open.** A per-pixel form (pr from a lower piece's coverage, no arc interval) is in
  b0707a26, set aside with lkTanS, unviewed.
- **Item 4, the jB blob at fade 0: not looked at.** At 0.5 and 1.2 jB also shows a dark bite where the under arm
  meets the junction in gf (master and branch), which today does not draw.
- **Done 2: not met.** `fade.mjs` now retries loads until the hash matches (sameState true); fl 0.5 sides 614/630,
  fl 1.2 432/451 within tolerance, master and branch alike. Its dots count does not separate them (872 vs 867).
  `.claude/probes/K1460/spikes.py` (gf-only one-pixel spikes where today is smooth over 7x7) reads master 3604 vs
  76dbcb86 2979 at 1.2 and 3099 vs 3098 at 0.5: a floor of about 3000 shared spikes (the exit marker, gf's own
  edges) swamps it. Next: count only pixels near the over thread's edge contour across a faded span.
- **Done 3: not run** (dragcheck, hold). **Done 4:** `npm test` green on 76dbcb86's tip (pre-rebase); gf tests
  160/160 and tsc on the rebased tip; `gf_home_glsl.test.ts` passes, so the flag-off text, keys and pack hold.
- The pink-arm notch: not traced.
