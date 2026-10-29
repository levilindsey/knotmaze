# K1019 Cursive B3: frames carried by arclength, and g's even top (v6.3)

Ledger items: K1019 (the reader) and K1020 (g's top) in knotmaze
`LEDGER.md`; the stream's handle is K863. Read first: B2's `## Handoff`
in `docs/design/K1012_cursive_gq_corner.md`, and `NOTES.md` `## K1012`
(N9 and N10 above all) in `.claude/probes/K863/trace/`. B2's brief's
`## Rules` hold, with the changes under Rules below.

## Why

B2 (v6.2) gave g and q a's top-right corner. It left two faults and
one open question:
- **The reader carries frames to the wrong place (N9).** `transport`
  in `tools/asdrawn_k980.py` reads a Bezier t as a fraction of arc
  length, at both ends. Where an edit merges cubics, the frames it
  carries land far off. q's after_o and after_b moved 36.1 and 34.6 u
  onto the bowl's left side, so bq, vq and wq sag onto q's left
  shoulder (2.2-3.0 u from the font in v6.1, 22.9-23.3 u now). a has
  carried the same error since B1 (16.4 and 14.4 u; ba, va and wa went
  from 1.7-1.9 to 6.8-7.0 u). By true arclength the frames would land
  4.3 and 4.2 u (q) and 2.7 and 2.2 u (a) from their old places.
- **The census may measure the moved frame, not the join.** oq's and
  oa's distances from the font (59.3 and 38.5 u; oa in oat is 39.5 u,
  the census's third worst) come from `gen_k1009`'s
  `pair_reference(..., fR0)`, which B2 inferred takes the carried
  frame. Not tested.
- **g's top runs flat, then bends late (N10).** g's new top cubic is
  short (58.9 u; a's is 95.4 and q's 125.2) and meets the kept cubic 2
  where the bowl already turns at radius 42 u. No angle or w_pk of a
  one-cubic edit removes it.

## Coordinator's calls (technical)

1. **Frames move by true arclength.** Fix `transport` in a copy that
   takes `_k1019`, so earlier versions still rebuild as they were; v6.3
   builds with the copy. Carry a frame by its arclength along the
   stroke, and check where it lands against the nearest point of the
   new stroke. If another carry is right (say, a fraction of a named
   span), give the reason in a finding.
2. **Nothing else moves.** A frame on a stroke that no edit changed
   lands where it was (within 1e-9 u). List every frame that moves,
   with how far and why.
3. **Recheck the high joins** into a, g and q: ba, va, wa, oa, bg, vg,
   wg, og, bq, vq, wq and oq. Give each one's distance from the font in
   v6.1 A, v6.2 and v6.3. Each lands near its value before the merge
   that moved it (q's: v6.1 A; a's: before B1, 1.7-1.9 u), or a finding
   says why not.
4. **Settle the census's oa and oq.** Test what `pair_reference(...,
   fR0)` measures, before and after the fix. If it measures the frame
   and not the join, fix the measure in the census's copy and give both
   numbers. o's exit itself waits on Levi (K1013): don't change it.
5. **g's top curves evenly, like a's and q's.** Refit g's top cubic and
   cubic 2 together.
   - Hold the corner: its point and both tangents (B2's N2).
   - G2 at every other joint. The bowl past cubic 2, the junction (y
     60 u) and the stem stay where they are.
   - Measure the curvature along the top, from the corner to the bowl's
     leftmost point, for a, g and q, before and after: the largest
     |dk/ds|, and the arclength to 45 and to 90 degrees of turn. g's
     should sit with a's and q's, with no flat run before a sharp rise.
   - Give g's distance from the font's g before and after.
   - Only g moves: every other letter in the template stays
     byte-identical.
6. **Two builds.** v6.3a is the reader fix alone; v6.3 adds g's refit.
   Each gets the locality check and the census against the build before
   it (v6.2, then v6.3a), so each change answers for its own moves.

## Goal

- `out23/cursive_template.svg`: g's top refit, nothing else differing
  from `out22`'s. It becomes Levi's file to edit.
- v6.3a (`work23/base_a`) and v6.3 (`work23/base`): J3a's ports build,
  variant A, each with its census and locality check (call 6).
- Sheets, each guarded:
  - `out23/high_joins_v63.svg`: the twelve joins of call 3 in v6.1 A,
    v6.2 and v6.3 side by side, with the font's joins in grey.
  - `out23/g_top_v63.svg`: a, g and q in v6.2 against v6.3, whole and
    zoomed on the top, with the curvature drawn as a comb.
  - `out23/gq_words_v63.svg` (B2's eight words) and
    `out23/cursive_v63_words.svg` (J3a's 14 words), v6.2 against v6.3.

## Order

1. `Get-Date`. Read the files above. Find `transport`, its callers, and
   how `pair_reference` takes fR0.
2. The reader's copy (call 1). Carry every frame and list the moves
   (call 2). N1.
3. Build v6.3a. Run its locality check and census against v6.2, the
   twelve joins (call 3), and oa and oq (call 4). N2, N3.
4. g's refit (call 5) and the template. N4.
5. Build v6.3. Run its locality check and census against v6.3a. N5.
6. Build the sheets, guard them, then crop and look. N6.
7. Append the handoff and report.

## Rules

B2's `## Rules` hold, with these changes:
- **Names.** Tools are `work23/dbg/*_k1019.py` (and `.ps1`); outputs go
  in `work23/` and `out23/`; the record goes in `NOTES.md` `## K1019`;
  view images from copies in `$env:TEMP\k1019_view\`. The version is
  v6.3.
- **Copy shared tools; don't edit them.** `tools/asdrawn_k980.py`,
  `gen_k1009`, the census and the build scripts stay as they are.
  Changed copies take `_k1019`.
- **Other agents.** K868's S3a8b3 (worktree `k868-s3a`, until about
  17:10) and K992's stage 4 (worktree `k992-corners`, until about
  16:40) take timings under the perf lock on this machine. You time
  nothing, so never take the lock. Run one Python process at a time.
- **Stop rule:** as B2's, with this brief's Order (steps 1-7). At 1 h
  30 min, finish the step you are on, build the sheets for what exists,
  and write down what is missing.
- **The final report** gives:
  - the reader fix: what `transport` did, what it does now, and every
    frame that moved (call 2);
  - the twelve joins in v6.1 A, v6.2 and v6.3 (call 3);
  - what the census's oa and oq measure, with both numbers (call 4);
  - g's refit: the cubics before and after, the curvature measures for
    a, g and q, and g's distance from the font;
  - the locality checks and the censuses (the worst rows);
  - the crops you looked at, and the outputs;
  - what Levi should look at, in plain words;
  - a `Ledger items` list: follow-ups and residuals. A question for
    Levi only about what shows on screen, in plain words;
  - K863's current handle fields.
