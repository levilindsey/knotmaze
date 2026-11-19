# K1482 stage 12: is the "today" reference of stages 9 to 11 valid? (Claude agent stage, 1 h)

Three stages (9, 10, 11) tried to make rp=gf's border outline match today's renderer at 12 sites on link A
(`?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1`, hash fff8c9e5) and none found a rule. Their reference
was a today frame taken with `&bg=none&cs=mono` through `.claude/probes/K1482/s9/cap9.ps1 -Env "GF=0,TODAY=1"`
(stage 11: `s11/cap11.mjs`). On stage 11's own sheets that frame does not line up with gf:

- `.claude/probes/K1482/out/s11/mask_wide.png` (today | today without its gap mask | gf | diff, j55 and j36):
  today shows long straight ribbon stretches that gf does not draw at all, and the unmasked frame shows many
  more threads crossing the tile than gf has.
- `.claude/probes/K1482/out/s11/sep_0.png` (today | base gf | b3 gf | diff): at j87, t16e, t2s the today tile
  shows a different arrangement of threads from the gf tile beside it.

Stage 8's sheets, taken with the ordinary textured today frame, did line up (`out/s8/fixA_j88j2.png`).

This stage answers one question and builds nothing in `src/`.

## Do

1. **Say what the straight stretches are.** Capture link A at rest three ways in the same physics hash: (a)
   today's renderer as Levi sees it (the link without `rp=gf` and `gfh`, default colours and backdrop), (b)
   the `bg=none&cs=mono` today frame as stages 9 to 11 took it, (c) gf border. Put j55, j36, j87, t16e and
   t2s side by side at 4x in one view box per site (same device pixels in all three: prove the alignment
   with a landmark, for example a marker disc or three crossing positions printed from the page for each
   capture). Then name the straight stretches in (b): a thread today really draws, a piece `cs=mono` or
   `bg=none` un-hides, a stale mesh left by switching renderers at run time, a capture before the view
   settled, or gf failing to draw a thread. Read the code that decides it; do not guess from the picture.
2. **If (b) is not what Levi sees**, build the right reference: a today frame that is pixel-aligned with gf,
   whose outline can be told from the backdrop (say how), and re-make stage 9's overlay
   (`out/s9/b_ov_a.png`, `b_ov_b.png`: today-only outline, gf-only, both) for the 12 sites: ticks j49, j55,
   j87; stubs j36, t79s; breaks j22, j29, t65s; pocket t80s; wedge t81s; sliver t70s; dot j88.
3. **Restate the 12**, one line each, from the valid reference: what today's renderer shows at the fault,
   what gf shows, and whether "today keeps the outline that gf cuts" is still true there.
4. **If gf is the one that is wrong** (it fails to draw a thread today draws), stop and report that first:
   site, thread, what the page's tables say about it.

## How to work

As stage 10's "How to work" in `docs/design/K1482_s10_borders.md`, with these changes: profiles under
`$env:TEMP\k1482s12-*`; ports 5840-5859; your probe directories are `.claude/probes/K1482/s12` and
`.claude/probes/K1482/out/s12`; give every capture a 4 minute limit. No `src/` change, so no bar, no hold
check and no `npm test`. Muse is working in the main checkout: change no file there.

**Stop rule.** Stop when 1 to 3 are answered, or after 1 h 15 min of wall clock (`Get-Date` at the start and
at each milestone), whichever comes first. A compaction is not a stop: re-read this brief and `git log`. On
stopping: commit, append `### Handoff K1482 s12` here, commit, and report: the answer to 1 in two sentences,
the sheets' absolute paths (each site named), the 12 lines of step 3, a `Ledger items` list and K1482's
handle fields.
