# K1113 Cursive J3f: b's, v's and w's exits, less down and more out, then one join rule for every exit (v6.9)

Ledger items: K1113 (b, v and w: Levi's call), K1112 (one join rule for
every pair; this stage does its first letters) and K863 (the cursive
work's handle), in knotmaze `LEDGER.md`. Read these first:
- `docs/design/K990_cursive_j3e.md` `## Handoff` (v6.8: f's corner at
  65 u, f's exit port and the 26 solved joins out of f, the six a/q joins
  back to v6.6's; its Next 1 says where b's, v's and w's exits are set);
- `docs/design/K863_trace.md` `## Levi's calls`, to its end: the three
  entries of 2026-11-02 bind this stage (quoted below);
- `.claude/probes/K863/trace/NOTES.md`: `## K990e` (the tools and rerun
  commands this stage ports).
Read the rest only as needed.

## Why

Exit ports with solved joins (J3, K1009) exist for a, d, e, h, i, n, o
and f. The other 18 letters' joins are J2's per-class presets (`cnct.*`
in `work28/base/join_params.json`), and six pins override single pairs
(og, oe, fo, fv, fr, fs; `pins` in `work28/ports_k990e.json`). Levi asked
on 2026-11-02 why the cursive fixes are so finicky and individually
tuned; the answer (`K863_trace.md`, "One join rule, from J3f on") is
this stage's rule set: port the remaining exits, delete the presets and
the pins, and judge by smoothness and locality, one sheet per letter.

The first letters are b, v and w, because Levi named them. v6.8 draws
their body ends at K948's angles (b -22.0 deg, v -17.1 deg, w -20.5 deg,
y up) where the font's path leaves at about -13 deg (b and v -12.5 to
-13.9 deg, w -13.2 to -14.5 deg, flattening to about -9 / -5 / +3 deg
2.5 / 5 / 10 u ahead; NOTES `## K990`, B1's check). In v6.8 each end
rises to a point, runs a few u back down the upstroke and leaves at that
steep angle, and the preset join (`cnct.ful_b_*`) leaves it downward
before turning out (`out28/aq_joins_v68.svg`'s v6.8 column; crops
`work28/sheets/png/zoom_aq_six.png`, `zoom_exit_v68_*.png`).

## Scope, in order

1. **b, v and w (K1113): less down and more out.** Give b, v and w exit
   ports, as J3 did for a, d, e, h, i, n and o and J3e for f, solve every
   join out of them and delete their presets. Build exit variants the
   checks can decide, at least:
   - the font's exit angle (the point and its overstroke kept, the end
     tangent turned to the font's);
   - an end that turns out smoothly instead of rising to a point;
   - and, as a port-level lever, a longer exit stretch (the solve picks
     where the join leaves the body).

   Keep the variant with the best smoothness that goes less down and
   more out with no new hook. The table (each variant's exit angle,
   census counts and per-letter font distance) goes in the Handoff.
   The six joins ba, va, wa, bq, vq and wq become solved joins too and
   are shown beside v6.6's; if a solved one loses v6.6's shape, the fix
   goes into a's or q's entry or into the exit, never into a preset for
   the pair. If no letter-level fix keeps the shape within the cap, that
   letter stays on its presets and the Handoff says so.
2. **The remaining exits (K1112), in this order: c, g, j, k, l, m, p, q,
   r, s, t, u, x, y, z**, one letter at a time, each finished before the
   next: its exit port, its joins solved and its presets deleted, the
   census and locality checks, its sheet (font | v6.8 | v6.9, the letter
   alone and every pair out of it). A letter that fails a gate stays on
   its presets; the Findings say why and the stage goes on to the next.
3. **The pins.** After each letter, test whether any of the six pins can
   go (remove it, solve, check). The Handoff lists the pins that stay and
   what each still needs.

## The rules and Levi's calls this applies

The three rules (`K863_trace.md`, "One join rule, from J3f on", K1112;
Levi, 2026-11-02: "In general, taking a step back, with all of our
cursive fixes, they seem very finicky and individually tuned. How much
is left? Is there not some higher level better general principles
approach we could have taken?"):
1. **No per-pair data.** "A fix goes into a letter (its body or its
   ports) and is checked on every pair of that letter." Every fix here
   is checked on all of that letter's pairs in the census words.
2. **One join rule for every pair.** "Port the exits J3 has not, then
   delete J2's per-class presets and the six pins." A ported letter's
   joins all come from the solve; a pin goes once a letter-level change
   makes it unnecessary.
3. **The gates are smoothness and locality.** "The gates are smoothness
   (the census's hooks, spikes, rough and seams) and locality. Distance
   to the font is reported per letter, not chased per pair. Levi judges
   one sheet per letter." Hooks, spikes, rough FAILs and undesigned
   seams must not rise, and nothing moves outside the joins of the
   ported letters. Distance to the font is reported per letter (mean and
   max over its joins).

Levi's calls of 2026-11-02, quoted from `K863_trace.md`:
- **v6.6's a/q joins stand; b, v and w go less down, more out** (on the
  a/q picture font | v6.6 | v6.7: "aq: definitely 6.6. BUT, these
  letters--b,v,w--all have too much of a downward hook/cusp--it should
  be less down and more out"). Porting b, v and w makes ba, va, wa, bq,
  vq and wq solved joins: they are shown beside v6.6's, and a lost shape
  is fixed in a's or q's entry or in the exit.
- **The new f stands** ("The new f is better"): f stays as v6.8 draws
  it. fm, fn, fv and fz sit farther from the font than v6.7's presets
  did (K1116); that is reported, not a target.
- **Two entry modes per letter** (2026-10-27): "Each letter takes an
  entry from the baseline and one from higher up (after b, o, v and
  w)". b, v and w are high exits (`HIGH = bovw`): their joins take each
  letter's high entry, the one o's joins take.
- **Smooth, continuous strokes** (2026-10-27): "I'm going to want our
  eventual letter strokes/threads to look smooth and continuous".
- **Cusp entries** (2026-10-28, K991): "The entry segment should NOT
  cross over the vertical segment--it should instead just come up to
  meet it from the one side." The side test (`side_min_u`) is reported
  for every cusp entry.
- **Smoother, then Levi's hand edits** (2026-10-27, K928): body ends are
  placed in the template as a designer would place the nodes; nothing
  else in the template moves.

## Method (technical)

1. **The exit variants of b, v and w.** `mk_template_k1113.py <out.svg>
   <variant>` writes out28's template (v6.8) with only the ends of
   `letter-b-s1`, `letter-v-s1` and `letter-w-s1` changed: A (v6.8's, a
   copy), F (the point and overstroke kept, the last cubic's end tangent
   at the font's angle), S (no point: the bowl's upstroke rounds over
   into the exit at the font's angle). Each is built with B3's build as
   J3e built `work28/base` (`work23/dbg/build_k1019.ps1 ... -Mode ports`).
2. **The exit ports.** `work29/ports_k1113.json` (`mk_ports_k1113.py`)
   is J3e's `work28/ports_k990e.json` with variant N = M plus, for each
   ported letter, `variants.N.<X>.exit` (a merge at the body end, as
   f's: stretch [0, 2] u, maxfev 8000, unless a variant sets the
   stretch). With b, v and w ported, the right letters' high entries
   (the `after_high` records J3c wrote for o, `"after": "o"`) apply
   after every high exit, `bovw`: one high entry per letter, Levi's two
   entry modes. o's joins keep their records, so they do not move.
3. **The solves.** `gen_k1027.py` as it is (it solves every pair whose
   left letter has an exit in the variant); a copy only if a rule needs a
   new term. Each solve reports status, nfev, the attach against its
   bound, crossings, the hook, the side test and the lowest point. The
   "less down and more out" measures, per join: the exit angle (the
   join's tangent where it leaves the body, deg, y up) and the drop (how
   far the stroke falls below the body's top point before the join
   turns up or out, u).
4. **The decision** is the census on every pair out of b, v and w and on
   the census words that hold one, per variant: hooks, spikes, rough
   FAIL, undesigned seams (must not rise), the per-letter distance to
   the font (reported), and the two measures above (less down, more
   out).
5. **The later letters** (scope 2) take the same steps on their own
   bodies: port, solve, census, locality, sheet; a body edit only where
   the gates need one, made in the template as for b, v and w.

## Checks

J3e's checks, ported to `work29/dbg/checks_k1113.ps1 [step]` and rerun
after each letter on v6.9 against v6.8:
- **Census** of v6.8 and v6.9 on J3e's words and pairs plus every pair
  out of each ported letter and be, ve and we, compared: only the
  ported letters' bodies, the joins out of them and the words holding
  them may move; every other row equal. The hooks, spikes, rough FAIL
  and undesigned-seam counts must not rise.
- **Locality**: `work29/base` against `work28/base`, body by body and
  piece by piece; the untouched pieces byte-identical.
- **Solves**: every pair out of each ported letter.
- **Determinism**: a second build and sheet, byte for byte.
- **The guard** (`work20/dbg/check_out_k990.py out29`) before each
  upload.
- **Sheets**, each visible change beside v6.8 and the font, looked at in
  crops before they go to Levi: per letter or letter group, font | v6.8
  | v6.9, the letter alone and every pair out of it in the census words;
  for b, v and w also the six a/q joins beside v6.6's, and be, ve, we;
  plus the census words that differ.

## Outputs

Version v6.9, in the main checkout's `.claude/probes/K863/trace/`:
`work29/` (base, variant builds, ports, censuses, logs, crops), `out29/`
(the template and the sheets), tools `work29/dbg/*_k1113.py` (and
`.ps1`), the record in `NOTES.md` `## K1113` with the rerun commands.
The sheets Levi looks at go to Drive `K863/` with `v69` in their names,
as J3e's did: one per letter or letter group, plus the census words
that differ.

## Goal

- b, v and w leave less down and more out, with no new hook, from exit
  ports; every join out of them solved; their presets deleted; the six
  a/q joins shown beside v6.6's.
- As many of c, g, j, k, l, m, p, q, r, s, t, u, x, y, z ported as the
  cap allows, in that order, each passing the gates or left on its
  presets with the reason.
- The pins that can go gone; the rest listed with what each needs.
- Nothing else moves; every visible change shown beside v6.8 and the
  font.

## Order

1. `Get-Date`. This brief, committed first.
2. b, v and w: the variants, their builds and censuses, the decision,
   v6.9's template and build, the checks, the sheet (N1).
3. The later letters, one at a time, in the order above (N2...).
4. The pins after each letter.
5. The upload, NOTES `## K1113`, the Handoff.

## Setup

- Repo `C:\Users\lsl\Repositories\knotmaze`; the branch is
  `worktree-agent-a6420b23c491748f8` (worktree
  `.claude/worktrees/agent-a6420b23c491748f8`), fast-forwarded to
  master's `6da27898` (J3e merged, `d505cbbf`).
- The work is untracked, in the main checkout's
  `.claude/probes/K863/trace/`. Python: `venv\Scripts\python.exe -I`;
  the font `font\PlaywriteUSTrad[wght].ttf`.

## Rules

J3e's `## Rules` hold, with these changes:
- **Names**: tools `work29/dbg/*_k1113.py` (and `.ps1`); outputs in
  `work29/` and `out29/`; the record in `NOTES.md` `## K1113`; view
  images from copies in `$env:TEMP\k1113_view\`; the version is v6.9.
- **Copy shared tools; don't edit them.** Leave the earlier work folders
  and Levi's template files as they are.
- **No timing, no perf lock**; at most 4 worker processes; no subagents.
- **Never touch the main checkout's tracked files or master, and never
  run git there**; don't edit `LEDGER.md`; commit on the branch at every
  milestone, broken or not; never push.
- **Stop rule**: at the stage's end or 2 h from the start (21:30:06, so
  23:30:06), whichever comes first (`Get-Date` at each milestone):
  commit WIP, append the Handoff, commit, report. A compaction is not a
  stop; after one, re-read this brief and `git log`.

## Later work (not J3f's)

- The letters the cap leaves, in the order above (c, g, j, k, l, m, p,
  q, r, s, t, u, x, y, z), and then removing the join sets.
- K1006, the leads and tails (a word-final f has no tail).
- K1116's other residuals: f's exit at its 2.00 u bound, fr and fs at
  2 u, fj's and fw's side_min slightly negative.
- K991 (the entries), K948 (the e after o, b, v and w; be, ve and we are
  on this stage's sheet because the new exits move them).
- K1014, K1035, K1036, K1044, K1090, K937, K997 and K998.

## Handoff
