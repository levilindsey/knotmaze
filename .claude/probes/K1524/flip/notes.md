# K1524 flip guards, 2026-11-19 17:37-17:49 (build 083a8cb1c, preview port 6074, profile %TEMP%\k1482s23-tip)

Observed:
- flagcheck.mjs PASS: the flag is on as the link loads, off with `gfk=0`, on with `gfk=1`; default vs `gfk=1`
  7 px, default vs `gfk=0` 1339 px.
- Border drag check (K1492/dragcheck_b.mjs, TLK=border): 0 px at stops 0, 0.5, 1.2, 0.14.
- Fill drag check (K1458/dragcheck.mjs): stops 0 and 0.5 0 px; `17:42:33 pageerror Cannot read properties of
  undefined (reading 'stats')`; stop 1.2 1672 px, stop 0.14 1600 px (limit 200).
- Every differing pixel at both failed stops is in one cluster, device px x 745..826, y 78..159 (css 372,39 to
  413,80), max level difference 28 (tolerance 24): the ring around the start marker. `dcf_marker_stops.png`:
  top row the dragged page at the four stops, bottom row their fresh loads; the glow is on every fresh load and
  on the dragged page at stops 0 and 0.5, and gone from the dragged page at 1.2 and 0.14. `dcf_diff_*.png`:
  dragged | fresh | differing px. No pixel differs at any thread, corner or crossing.
- The profile's Crashpad holds a GPU-process dump written 17:42:07 (`cddfeb06-...dmp`, annotation
  `ptype = gpu-process`), 26 s before the page error. An older GPU-process dump on the same profile is from
  16:24:03 (`ed38d75b-...dmp`), before the flip existed.

Inferred, not tested:
- The GPU process restarted during a cold gf compile at stop 1.2 (K1468), the page lost its context, gf was
  disposed and rebuilt (`delete G.__knotGf`, hence the poller's error), and the glow did not come back (K1537),
  or the probe's clock pins went with a rebuilt renderer.
- Muse 27B's Chrome was live during the run (its 30-minute-old lock had been removed as stale at 17:29:41), so
  GPU load from it may have contributed.

`dcf_diff.py <drag.png> <ref.png> <out_sheet.png>` reproduces the cluster list from a drag check's shots.

# The live look and the red strokes, 2026-11-19 18:16-18:42 (levi.dev on 083a8cb; local preview of 66459246a on port 6075)

Observed:
- Fill drag check with the rounding on, on a new Chrome profile (18:05-18:09) and again warm (18:09-18:12):
  0 px at stops 0, 0.5, 1.2 and 0.14 both times, no context loss, no crash dump.
- Live, link A at 1600x900 dsf 1.5 (`live/live_default.png`, `live/live_gfk0.png`, `live/V1_on_a.png`): the
  rounding shows at j14 and j41 as the link loads and is gone with `gfk=0` (`live/live_sites_clean.png`: off
  context | on context | off detail | on detail).
- `live/live_default.png` has 619 px of dull red outline strokes (42, 29, 32 where the `gfk=0` shot has 18, 20,
  26) at device px x 1181-1294, y 790-869 (`live/red_j4.png`); an earlier live pair (K1535, 16:12-16:14) has
  the same colour at other places, again only in the shot with the corner try on (`live/k1535_a.png`, `_b`).
- Five loads through `redshot.mjs` (three shots each, 1.5 s apart; `live/red_report.txt`): local with the corner
  try on twice, local with `gfk=0`, local with `snd=none`, live. Reddish px outside the two markers: with
  `gfk=0` 369, 279 and 224 px at three different places; with the try on 436/0/0 and 1230/0/2491; with
  `snd=none` 0/0/0 and `plucks` 0; live 0/96/0. Every other load had 1 to 3 plucks active. No context event,
  no hover, in any load.

Concluded: the red strokes are music mode's plucks (`soundMode` defaults to music), not the corner try. The two
earlier pairs had them only in the "on" shot by chance. Lore: probes.md, PROBE LORE (2026-11-19, K1524).
