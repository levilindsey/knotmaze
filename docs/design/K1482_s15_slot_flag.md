# K1482 stage 15: c1 keyed by a baked per-crossing flag, not per pixel (Claude agent stage)

Read `### Handoff K1482 s14` in `docs/design/K1482_s14_c1.md` whole, then `### Handoff K1482 s13` in
`docs/design/K1482_s13_remnants.md`. The reference is Levi's bar on gf's own picture.

**Where it stands.** c1 (an over piece that belongs to a fused joint cuts the under's outline with margin 0
and fade 0.3) makes 15 of its 23 movers better, the ticks at j55 and j87 among them. Stage 14 showed why it
cannot land as written: the shader decides "the over piece is a joint member" per pixel, from the candidate
list and the nearest point on the over chain, and that decision flips between neighbouring pixels (specks at
j36 and near t64e) or lands on a different pass of the chain from the one the crossing's slot names (j77,
t64e worse). Seventeen per-pixel variants did not fix it.

**This stage's idea.** Decide it once per crossing on the CPU and bake it: a per-slot flag (or a 0..1
weight) in the gap-window slot data that `lkGap`'s loop already reads, saying "the over pass of THIS crossing
is an arm of a fused joint within reach" (the same membership c1 reads, evaluated at the slot's own over
pass and arc, in the bake). The shader then uses margin 0 / fade 0.3 for that slot's outline cut and nothing
per-pixel. This is K1512's baked number in another form; the window bake is free now (Muse's Run M ended).

## Do

1. Find where the slot data is baked and packed and where `lkGap` reads it; pick the cheapest carrier for
   one more value per slot (a spare channel if there is one). Say what it costs (texture size, build time).
2. First as a prototype you can iterate on quickly (a build with the flag, variants of the membership test
   by rebuild or by a debug uniform): capture link A, run `.claude/probes/K1482/s13/count13.py` (limits and
   `--specks` against master), and look at every site moving 10 px or more on 4x tiles master gf | tip gf.
   Expect c1's 15 better sites back, j77 and t64e not moving, and no flip specks. What may remain: the
   joint-tip islands at j37 and j70 (the reduced cut ends where the over's own outline is not drawn) and
   t25s / j60's 1 px seam: fix them with the flag's definition (for example no flag where the over pass ends
   inside the cut, or a reach limit in arc), not per pixel.
3. Land the form in which no site is worse and no speck is new, its own commit, with a unit case for the
   bake's flag on a fixture scene and `count13.py` failing on master, passing on the tip. A narrower flag
   that keeps some of the 15 and worsens none is worth landing: say what it gave up.
4. The Crossing fade still works: `.claude/probes/K1492/dragcheck_b.mjs` (border) and
   `.claude/probes/K1458/dragcheck.mjs` (fill) pass; at `fl` 0 and 1.2 the outline at three ordinary crossings
   away from any joint is unchanged against master.

## Done

- The sweep's faulted count on your tip by class (start: 36, `.claude/probes/K1482/out/s11/classes_base.txt`),
  by your own eyes, and the list of sites the rule moved with each named.
- The fill look: 0 px against your starting commit on link A in the same physics hash (fff8c9e5).
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green (digests re-frozen only where
  the new value moves them, each named).
- The K1436 bar once with `STRICT=1 -NoPerfLock` on `ring,def,muse_hash` (`-Tag k1482s15`); for
  g41_user_tw64 show instead, at 4x, master gf | tip gf in one physics hash at every site whose outline ink
  moves 10 px or more (the bar is noisy on that scene, K1519).
- The tables build time on muse_hash within 3% of your starting commit, or the cost named (no perf lock
  needed for a rough paired median of 7; label it "under load").

## How to work

As stage 10's "How to work" in `docs/design/K1482_s10_borders.md`, with these changes: profiles under
`$env:TEMP\k1482s15-*`; ports 5900-5919; your probe directories are `.claude/probes/K1482/s15` and
`.claude/probes/K1482/out/s15`; each capture under a 4 minute limit. Muse's Run P is working in the main
checkout on `tables.ts`, `eval.ts` and `gf_glsl.ts` (j64's fan coverage): change no file in the main
checkout, keep any diff in those three files to the few lines the carrier needs, fetch and rebase before
each commit that touches them and before the handoff.

**Time.** 2 h 30 min of wall clock from your first `Get-Date`. Do not stop early while a variant is still
untried and time remains: stage 14 stopped with 45 minutes unused. Keep the last 30 minutes for the checks
and the handoff.

**Stop rule.** Stop when every Done holds, or after 2 h 30 min of wall clock (`Get-Date` at each milestone),
whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP,
append `### Handoff K1482 s15` here, commit, and report: the class table, the sheets' absolute paths (each
site named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle
fields.
