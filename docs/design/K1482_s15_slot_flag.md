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

### Handoff K1482 s15

Stopped at 10:30 PM (start 8:34:58 PM), in the handoff reserve. Branch `worktree-agent-a3458badfbb729ef7`,
landing commit 61e8ab9e (WIP fedc721e, d197a7e5). Source diff: `gf_look.ts`, `gf_app.ts`, `gf_gap.test.ts`;
tables.ts, eval.ts and gf_glsl.ts untouched.

**Carrier and rule.** The GW4 slot texel's y fraction: y = over chain + 0.125·bits (bit 1 = left of the under
tangent, bit 2 = right); `int(y + 0.5)` still names the chain, so no texture grows. Per slot side, Q = the under
sample ± leftNormal·(fh + 0.04) (`GAP_JOINT_OB`); dM / dN = the nearest joint-member / non-member over sample to
Q among the over samples within oC ± 1.5 arc (`GAP_JOINT_RA`; member = gf_app's `gwMember`, eval.ts member()).
The side is flagged when `dM < fh + mg + fd && dM <= dN && dN >= fh`; lkGap then cuts that side's outline with
c1's reach (margin 0, 0.3 of the fade). CPU cost: one member test per over sample in the window plus two
nearest-sample scans per slot side, only in the gap bake (which re-runs on a fade or gap change, so flags follow
the slider). On link A 1005 slots on 153 of 350 crossings are flagged. Its time on muse_hash was NOT measured.

**Numbers (link A, tip 61e8ab9e on screen).**
- count13: 20/20 within the limits, `--specks` 0 new against master; 49 movers at 10 px+ (p8's own run: 46;
  load noise is about 1300 ink px). count13 fails on master (shown at the prototype step).
- c1's 15 are back: t21e j55 t2s j122 j4 j140 j83 j71 j102 t30e t34s j120 t36s j21 j87 are all movers, all
  gains, each closing a joint outline on its tile. j77 1/1 and t64e 1/0 px: unmoved.
- The named pairs (`sheets/pairs_1.png`): j37 +17/-1, its top-right gap closes; j70 0/0; t25s +37/-2 and j60
  +28/-0, the dark smudge fills but a 1 px light seam stays along the over thread at 1596:1542.
- The flag patched off (`s15/patch_flagoff.json`) against master: 276 ink px, under the load noise: the tip
  with flags off draws master.
- Class table (`out/s15/classes_tip.txt`, sheets `cls_1.png`, `cls_2.png`): 36 -> 31. Fixed: j55 tick, j87
  tick, j82 wedge, j143 wedge, t79s stub. Smaller but still faulted: j4 notch, j36 stub (1 px seam at
  2097:1035), j71 sliver, j158 wedge, t16e notch, t73e wedge. No site on the 49 movers' tiles reads newly
  faulted (`tip_1..7.png`, all viewed at 4x).
- Residual 1 px seams: t25s/j60 1596:1542, j36 2097:1035, j143/t67s 1968:388, j4/t2s 1646:231.
- Fill look, tip against tip-flag-off: 5 ink px, 28 px differ by more than 40 levels; the 4 near borders are
  identical at 4x (`fillnear_1.png`). Not 0 px: lkFringe reads g.x in both looks, so a flagged slot can shift a
  fringe colour (inferred, not isolated).
- Ordinary crossings (no member within 1.5 arc; `s15/ordfade.py`), tip against tip-flag-off: fade 0, 28 lost /
  21 gained over 173 boxes, none at 10 px; fade 1.2, 27 lost / 968 gained, 36 boxes at 10 px+. An ordinary
  crossing carries no flag by definition, so the 1.2 gains are joint sides inside those 48 px boxes: at a large
  fade the reach fh + mg + fd flags more sides, and a flagged side fades over 0.36 instead of 1.2 (inferred from
  the rule; `ord_fl1.2_1.png`). The three crossings farthest from any site move at most 1 px at both fades
  (`ord_fl0_1.png`), but their tiles show no crossing clearly, so where they sit is unverified.
- dragcheck_b (border) PASS at fade 0 / 0.5 / 1.2 / 0.14, 0 px; dragcheck (fill) PASS, 0 px; hold.mjs 60/60
  warm (link with `&rp=gf`). `npm test` green (256 files, 3189 tests); the only pin moved is gf_gap.test.ts's
  s8 shader pin (the new branch), plus the new case "a slot beside a joint member's over pass carries its
  side's joint flag in y's fraction".

**Not done.** The K1436 bar (`STRICT=1`, ring,def,muse_hash); the g41_user_tw64 master | tip sheets; the
tables build time on muse_hash. Seven preview builds, against the brief's two.

**Probe notes.** cap15.mjs sets localStorage `knotmaze.panelOpen=0` in its profile, and the drag checks need
the panel open: `s15/panelopen.mjs <base> <profile>` sets it back (the first dragcheck_b failed on it).
hold.mjs needs the link's `&rp=gf` given. judge14's internal tiles13 loop wrote no sheets here (its output goes
to Out-Null; cause not found); the tip sheets came from direct tiles13 calls.

**Next.** Run the three undone checks on 61e8ab9e; then the four residual seams (cause not yet attributed) and the
six smaller-but-faulted sites; Levi to say whether c1's
short fade on joint sides at a large fade is the look he wants.
