# 27Z5 handoff (K1582): what closed the two spots' outline ends

## Answer first

No single commit did it. The ends close in three steps, and the picture
Levi judged (Nov 19) is complete at the last of them:

1. `3d7acffe4` (merge of K1492, branch `8877d6129`, 2026-11-18) - the
   border outline fades over the crossing gap's whole ramp. Net of the
   alpha sequence around it (below): muse box 378 px, g41 box 156 px
   over 2 levels against Nov 18. It softens ends; it does not join them.
2. `363b69487` (merge of stage 8, branch `17b9dfc9f`) - inside a baked
   gap window only that crossing's over thread cuts. g41 box +368 px;
   muse box 0. First joiner at the g41 spot.
3. `cf38cf6bb` (merge of stage 18, branch `644f9bc39`: a slot whose
   under pass is a fused joint's arm within the cut's reach takes the
   short cut) - muse box +183 px, g41 box +257 px. At this merge both
   boxes equal the Nov 19 picture exactly (0 px), so this is the commit
   that completes the closing Levi saw. Small earlier steps at muse:
   stage 15 merge `0cee0dc16` (+66; branch `c44b564a6`, c1 per slot side
   from a baked joint flag) and stage 16 merge `dfcbd69e0` (+8).

The literal first difference against Nov 18 is not a joiner:
`3c6a52ca1` (K1474) made the gf composite write its alpha on the canvas
(both boxes ~7,300 px), and `5c058f5cd` scoped that write to the fill
look, putting the border back; only the fade above survives from that
sequence. A fresh capture of Nov 18's own commit (`9f2c226f`) by this
run's tool equals the bar's Nov 18 frame at over 2 levels in both boxes,
so the baseline is the bar's, not a re-render of it.

Later steps to today (same measure, consecutive): stage 24's reach gate
`1c763ce39` undid stage 18 at both boxes exactly (boxes back to stage
17's pictures), `6e0a51c2f` backed it out exactly. `650aac4fa` (second
corner try the default under gfh=1) moved muse +243 and g41 +318;
at muse that already is today's box. `c40417678` (third bound) moved
muse 48 px and `87727fafd` moved it back (today's box, byte-equal);
g41 unmoved by both. `d136ec526` (stage 28 home burial) moved g41
+258 and its box is byte-equal to today's. Both boxes sit at today's
pictures from `d136ec526` on; every captured commit after it
(`f9d12313a`, `386744b36`) reads 0.

Not captured, so their individual steps are unmeasured (endpoints
anchor the totals; any change there must net to 0 at muse and is
bounded by 0 at g41 after `d136ec526`): `0f6ff6c37`, `13184cdd2`
(GF_KXO WIPs; `4798557a2` then put tables.ts back to master, so the
three net to the `c651efe12` tables), `fc1da3ad2`, `198469fc7`,
`f0fe2f692`, `e3bde61b0`, `05155fa4e`, `928ed154a`, `7d1605597`,
`2afde92f0`, `ac4387f28`, `dcd8e81e6`, `a3a4831ef`. Skipped by file,
not captured: `27a2120bb` (probe pin only), `067b772d6` (ribbon/paint,
no gpu_field), `5564d2665` (context reload), `3ee641a4e` (CPU-only,
off). IDs are post-K1493-rewrite IDs, as in the tree now.

## Done 1 - sheets and floor

`.claude/probes/K1582/out/27Z5/sheet_muse.png` and `sheet_g41.png`:
columns Nov 18 (`9f2c226f`), Nov 19 (`24a9f83b`), today (`06dafebf4`),
wide view and red-box closer, wide4.py's recipe (W 480, D 160, T 320,
own-percentile stretch). Captures: `.claude/probes/K1582/capbox.mjs`
(bar freeze recipe, border look only) on `scripts/preview.ps1` builds;
listener command line and page stamp named the commit each time.
Repeat of today: g41 box 0 px; muse box 142 px at 1 level, 0 over 2
(the repeat's cold view landing, x off by 0.0004 CSS px). Floor used:
over 2 levels, floor 0; cumulative counts carry about ±2 px of
threshold noise where noted in the table tool.

## Done 2 - step table and crops

`python .claude/probes/K1582/table.py` reprints every step
(cumulative vs Nov 18, consecutive step; px over 2 levels). Crops
(before | at | today) in `out/27Z5/`: `crop_muse_alpha.png`,
`crop_muse_fade.png`, `crop_muse_s15.png`, `crop_muse_s18.png`,
`crop_muse_650a.png`, `crop_g41_fade.png`, `crop_g41_s8.png`,
`crop_g41_s18.png`, `crop_g41_650a.png`, `crop_g41_d136.png`.
(The `c404`/`8772` pair's 48 px muse excursion has numbers in the
table; no crop was kept for it.)

## Done 3 - rules and today's switches

- K1474 alpha (`3c6a52ca1`, `gf_pass.ts` composite): writes the
  composited coverage as canvas alpha instead of keeping destination
  alpha. `5c058f5cd` scopes it to the fill look, so today's border
  keeps the pre-K1474 behaviour; no switch restores the unscoped write.
- K1492 fade (`8877d6129`, `gf_look.ts` border composite): thresholds
  uncut ink first, then scales by the baked gap factor, so the outline
  fades over the whole ramp instead of moving only inside
  [0.36, 0.65]. Still today's form; the ramp's length is the Crossing
  fade setting (`fl`), the old step is not selectable.
- Stage 8 (`17b9dfc9f`, `gf_look.ts` `lkGap`): inside a baked window
  only the named crossing's over chain cuts the outline. Stands (Run Q
  later rewrote the coverage half; the outline half is this rule).
- Stage 15/16/18 (`c44b564a6` tables bake; `4c1267846`/`708da671d`,
  `644f9bc39` in `gf_look.ts`/`tables.ts`): the cut is decided per slot
  side from a baked joint flag, a flagged side's fade starts a pixel
  inside, and a joint arm under within reach takes the short cut. All
  stand in today's source; no switch selects the pre-stage-15 cut.
- Retry default (`650aac4fa`): the second corner try is on under
  `gfh=1`; `gfk=0` in the link turns it off (`gf_app.ts`: `gfh=1`
  unless `gfk=0`), so the earlier behaviour is selectable per link.
  Its third bound (`c40417678`/`87727fafd`) is `GF_KXB` in
  `tables.ts`, on with the retry; `GF_KXB=0` serves Node probes only.

## Done 4 - how many places elsewhere

Same tool on the whole frames (`places.py`, ink gain of 8+ levels,
24 px cells merged by touching): Nov 18 to today - muse maze 146 gain
places (2,631 cells), g41 maze 285 gain places (1,440 cells); Nov 18
to the Nov 19 state - 158 (2,523 cells) and 286 (1,418 cells). Three
largest gain cells - muse to today: 201 px at device 2100,2388;
191 px at 2652,1500; 175 px at 1428,1932. g41 to today: 299 px at
972,708; 268 px at 828,1692; 259 px at 1212,1140. These count every
ink-gaining change (fade, joint flags, retry corners), so they bound
the number of joined ends from above; the two spots are two of them.
Link A proper was not framed: the count ran on the two scenes that
carry the spots (`muse_hash`, `g41_user_tw64`), which is what the
K1485 tool compares; no Nov 18 build failed.

## Taken for granted / not checked

- The bar's Nov 18/19 frames as the earlier pictures (verified by a
  fresh `9f2c226f` capture and by `cf38cf6bb` equalling Nov 19).
- Physics hashes `733ee14a` / `0d51331b` held at every build; views
  bit-equal to the November metas on warm loads.
- No src or test was changed; no tests were run. `npm test` not run.
- Ledger untouched (Close K1582 by hand, quoting this file).
- Servers stopped, preview folders and profile removed; captures,
  sheets and crops stay untracked under `.claude/probes/K1582/out/27Z5/`.
