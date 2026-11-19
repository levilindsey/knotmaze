# K1482 stage 13: rp=gf's border faults on Levi's link, the remnant beside a joint, judged on gf alone (Claude agent stage)

Read `### Handoff K1482 s12` in `docs/design/K1482_s12_reference.md` whole, then `### Handoff K1482 s10` in
`docs/design/K1482_s10_borders.md` (the pixel read) and the bar in `docs/design/K1482_levi_link_borders.md`.

**What changed.** Stages 9 to 11 tried to make gf's outline match today's renderer at 12 sites. Stage 12
showed that target was wrong at 10 of them: today draws straight fan strokes through those junctions where
gf follows the threads' curves, and gf draws more outline than today everywhere. Today's renderer is no
longer the reference for these sites. The reference is Levi's bar, read on gf's own picture: no dot, stub,
tick, break, pocket, sliver or stray dash; gf's border look itself stays as it is; the Crossing fade keeps
acting on the outline.

**The fault, on gf alone.** At a crossing 0.45 to 1.4 arc from a fused joint, the crossing's gap cuts the
under thread's outline, and between the cut's end and the joint a short piece of outline survives: a
detached, faded tip (tick, stub, dot), or the cut leaves a break or pocket in a line that should close. The
12: ticks j49, j55, j87; stubs j36, t79s; breaks j22, j29, t65s; pocket t80s; wedge t81s; sliver t70s; dot
j88 (link A `?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`, hash fff8c9e5; 36 faulted of 327 on master,
`.claude/probes/K1482/out/s11/classes_base.txt`).

## Do

1. **Sort the 12 by what a clean gf picture would be there** (20 minutes): for each, on a 6x tile of master
   gf, say whether the fix is "the remnant goes" (the cut runs on to the joint, so no tip is left) or "the
   cut should not reach here" (the line closes), and measure the remnant: its length in px and in arc, the
   arc from the window's end to the joint room. Write `out/s13/sort.txt`.
2. **The remnant rule, by patch first**: an outline remnant shorter than a threshold between a gap window's
   end and the under thread's joint room is cut too (the window's outline cut runs on to the joint room).
   Muse's 9ae14f27 did the same for never-clearing windows in the bake; read it. Try thresholds; capture
   link A; list every site whose outline ink moves by 10 px or more and look at each on 4x tiles master gf |
   patched gf, named better, same or worse against the bar. A candidate passes when its target sites are
   clean and no site turns worse.
3. **Write the passing rule**, its own commit, with a count that fails on master and passes on the tip
   (detached outline components under N px within the site's box). Outline only: the fill look must not
   move. If the rule needs a baked number, you may add it to the window bake in `gf_look.ts` / `tables.ts`
   only after `### Handoff 26M` is on origin/master in `docs/design/K1464_muse_batch26.md` (fetch and check;
   Muse Run M is in the bake until then), and rebase first.
4. **The "line closes" sites**, with the time left: one rule, same method.
5. The Crossing fade still works: `.claude/probes/K1492/dragcheck_b.mjs` (border) and
   `.claude/probes/K1458/dragcheck.mjs` (fill) pass; at `fl` 0 and 1.2 the outline at three ordinary crossings
   away from any joint is unchanged against master.

## Done

- The sweep's faulted count on your tip, by class, by your own eyes, with the class table.
- The fill look: 0 px against your starting commit on link A in the same physics hash.
- The K1436 bar with `STRICT=1`, once, at the end (`-Tag k1482s13`; if it waits on a fresh perf lock, use
  `.claude/probes/K1482/s8/bar_ref.ps1`): no new find, or each one shown at 4x and named.
- `hold.mjs` (`.claude/probes/K1450/`) 60/60 warm on link A; `npm test` green.

## How to work

As stage 10's "How to work" in `docs/design/K1482_s10_borders.md`, with these changes: profiles under
`$env:TEMP\k1482s13-*`; ports 5860-5879; your probe directories are `.claude/probes/K1482/s13` and
`.claude/probes/K1482/out/s13`; capture with `.claude/probes/K1482/s11/cap11.mjs` or `s12/cap12`, each capture
under a 4 minute limit (a patch that does not compile hangs the capture: read the console). Muse works in
the main checkout: change no file there.

**Time.** 2 h of wall clock from your first `Get-Date`. Do not stop early with step 2 open: a threshold that
cleans some sites and worsens none is worth landing even if others stay. Keep the last 35 minutes for the
bar, the hold check and the handoff.

**Stop rule.** Stop when every Done holds, or after 2 h of wall clock (`Get-Date` at each milestone), whichever
comes first. A compaction is not a stop: re-read this brief and `git log`. On stopping: commit WIP, append
`### Handoff K1482 s13` here, commit, and report: the class table, the sheets' absolute paths (each site
named), the numbers, which commits are confirmed on screen, a `Ledger items` list and K1482's handle fields.
