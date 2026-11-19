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

### Handoff K1482 s12

Claude agent, 2026-11-18, 16:47 to 17:30; steps 1 to 3 answered, no step 4 case, no `src/` change. All frames
are one physics state (hash fff8c9e5) under one root transform. Probes are in `.claude/probes/K1482/s12/`
(cap12, tupd, tdiff, tfan, sheet12, poly12, ov12), sheets and data in `.claude/probes/K1482/out/s12/`.

**1. The straight stretches are something today really draws, in (a) exactly as in (b).** They are its fan
layer: root child 1 (`filletLayer`), the one TriFanMesh `rebuildFillets` refills from the current junction
records on every frame (its rebuild count tracks `geomRev`).
- `cs=mono&bg=none` un-hides nothing: (a) and (b) draw the same geometry in other colours.
- Nothing is stale. The frame changes by 0 px after `rebuildFillets(true)`, after `update()` + `tickPaint(0)`,
  and after 1 or 30 more `update()` calls, and the today pages never load `rp=gf`.
- The view had settled: every capture has the same root transform.
- Hiding root child 1 removes every straight stroke at j55, j36, j87, t16e and t2s. Hiding child 0 (the base
  ribbons) leaves them all. See `step1_fans.png` (u0, base hidden, fans hidden, gf, with the chainSamples
  polylines).
- A hit-test of the stroke pixels against the fan mesh's triangles (`tfan.mjs`, `tfan2.json`) finds each one
  inside triangles that carry one junction's own field record:
  - j55: junctions 55 (arms 21, 58, 58) and 9;
  - j36: junction 36 (arms 11, 11, 50);
  - j87: junctions 87 and 99;
  - t16e: junctions 45 and 46 (arms 16, 71, 71);
  - t2s: junction 4 (arms 2, 68, 68).

  The records match exactly, which rules out the fractional-tagged cover strips. These webs reach up to about
  3 world units (128 dev px) from their joint.
- gf draws every thread's outline along its chainSamples polyline.
- Not pinned: why the web draws these arms straight where the thread, and gf's border, curve.
  - A candidate in the code: an arm's radial profile keeps its last outward sample where the radius stalls,
    and extends straight past its grid (joinery.ts about line 1191, `profArc` in junction_field.ts).
  - This is not verified. Only two arms of junctions 55, 36, 4 and 45 turn back within 4 world (chain 11 at
    j36, chain 2 at j4), so it does not explain j55 or t16e.

**2. Reference.** (b) is what Levi sees geometrically, but its outline mixes two layers, so the reference splits
them.
- Today's outline is the mono frame's outline colour: R >= 32 (backdrop (21,27,40), outline (42,29,40)).
- It is split by layer with the fans-hidden default frame: FAN is `|u0 - hide_1| > 6`, BASE is the rest.
- gf's outline is gc_b's border: B <= 35 (backdrop B 42 to 48).

Sheets:
- `ov12.png`: stage 9's overlay. Green is both, magenta today's base only, orange today's fan only, grey gf
  only.
- `ov12_far.png`: only what one renderer draws with no outline of the other within 4 dev px. Orange is
  today's fan, magenta today's base, blue gf. The ring is the 30 dev px counting window.
- `step3_a.png` and `step3_b.png`: today, mono, today without fans and gf, at 4x.
- `site_counts.json`: the counts.

**3. The 12.** In the lines below:
- "keeps" counts today's pixels within 30 dev px of the site that have no gf outline within 4 px.
- "adds" counts gf's pixels that have no today outline within 4 px.

- j49 tick: today draws a straight fan stroke running SE below the site. gf draws the same stroke about 8 px to
  the SW, plus a curved border right of the site that today lacks. Keeps 98 (74 fan), adds 228. Not true: today's
  extra is a displaced fan stroke.
- j55 tick: today draws a long straight fan stroke (junction 55's web) below the site. gf draws a diagonal border
  beside it and the junction's curve right of the site. Keeps 129 (127 fan), adds 253. Not true.
- j87 tick: today's strokes are all in gf. gf adds a T-shaped border below the site and a short stroke left of
  it. Keeps 3, adds 191. Not true.
- j36 stub: today draws a straight fan stroke (record 12716, junction 36) just below the site, across a gap in
  gf. gf draws a Y border above and right of the site that today lacks. Keeps 153 (117 fan), adds 295. Partly
  true.
- t79s stub: today draws a short tapered stub ending at the site (fan and base). gf has none there, but draws a
  curved border right of the site that today lacks. Keeps 99 (79 fan), adds 224. True for the stub.
- j22 break: today's diagonal and loop are both in gf. gf adds a short border left of the site. Keeps 6,
  adds 107. Not true.
- j29 break: today's curve and top stroke are both in gf. gf adds a curved border below the site. Keeps 0,
  adds 184. Not true.
- t65s break: today draws a fan stroke right of the site, about 10 px right of gf's border. gf also draws a short
  border above the site. Keeps 95 (94 fan), adds 213. Not true: the stroke is displaced, not cut.
- t80s pocket: today's diagonal and arc are both in gf. gf adds a border right of the site and the hook below it
  (the pocket). Keeps 0, adds 283. Not true.
- t81s wedge: today's arc and branch are both in gf. gf adds a long arc below the site. Keeps 2, adds 289. Not
  true.
- t70s sliver: today draws a fan stroke at the window's upper-right edge. gf adds a diagonal border right of and
  below the site (the sliver) and one at the upper left. Keeps 64 (61 fan), adds 301. Not true at the site.
- j88 dot: today's strokes are in gf, plus a fan fleck at the top. gf adds a hook below the window. Keeps 18,
  adds 96. Not true.

At every site gf draws more outline than today. Where today keeps an outline that gf lacks, it is almost all fan
layer:
- straight strokes at j49, j55, j36, t65s and t70s;
- the t79s stub.

Next:
- Decide what gf should match at these sites: today's straight fan-layer webs, or the threads' curves (a look
  question for Levi, with `step1_fans.png` and `ov12_far.png`).
- Separately, find why today's junction field draws arms straight up to about 3 world from the joint:
  - dump junction 55's radial profile rows against the chainSamples arm;
  - this is a possible residual in today's renderer.
