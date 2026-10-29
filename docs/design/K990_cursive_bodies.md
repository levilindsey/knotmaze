# K990: Cursive B1, the bodies (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K863
(`docs/design/K863_trace.md`; its `## Levi's calls` bind every stage).
Previous stage: J2, K962 (`docs/design/K962_cursive_joins.md`). Read its
`## Handoff`, above all "o's exit" and "Body defects", and `NOTES.md`
`## K962` in `.claude/probes/K863/trace/`, before anything else. Ledger
items: K990 (this stage, Levi's body notes), K976 (o's exit), K996
(J2's body findings) and K995 (b's lead-in).

## Why

Levi reviewed v5.8 on 2026-10-28 and asked for body changes before the
hand edits. Once the letters look right, Levi edits the template by hand,
and after that the pipeline never changes the letters (K928). J2 (v5.9)
fixed the joins it could. It found that several of the join defects left
live in the bodies:
- fo's burst comes from f's loop end;
- p's exit peaks because p's end runs long and flat;
- the lead into h curls because h's start curves tightly.

Levi's words are in `K863_trace.md` `## Levi's calls`, under "o's exit is
a cusp" and "v5.8's other notes". The edits:

- **o (K976).** The body closes at the top, stops in an abrupt cusp, and
  runs slightly back over itself (a short overstroke) into the exit. No
  S-bend. This applies to every o exit, plain and fused.
- **a (K990).** The turnaround at a's top and the top of its right-side
  stroke become one point, at the exact top of that stroke. Today the
  turnaround sits a bit lower. The point is a corner with two tangents.
  A thread will later run around it unbroken.
- **k (K990).** The leg meets the tall stem at a sharper angle.
- **p (K990, K996).** The end into the exit is shorter.
  - J2 measured it: the last cubic runs 130 fu along the baseline (x 340
    to 470 fu).
  - End it near x 430, so the exit turns up sooner (crop
    `work19/crops/notes_pexit_j1_j2.png`).
- **f (K990, K996).** Fix the cusp into the exit.
  - Today the lower loop ends mid-turn: a slight S-bend, then a tight curl
    over into the exit.
  - So fo has to start at the loop's tight curvature and unwind at once.
    That is the red fan in `work19/crops/over_j2.png`, panel "fo 4.64 S".
  - End the loop either before the turn or after it, where it curves less.
- **h (K996).** h's start curves tightly, so the word-initial lead curls
  in its last 2-3 u to match it. Levi: "The entry segment to h doesn't
  match the curvature of the start of h well". Start h's body where it
  curves less (crop `work19/crops/notes_leads_j1_j2.png`).
- **b's lead-in (K995).**
  - Levi, on v5.9 (2026-10-28): the b entry segment "is still a sharp
    corner".
  - The corner is the knee in the orange lead itself, where it turns up
    from its shallow start, well before the seam (crop
    `work19/crops/K995_b_lead.png`, v5.8 above, v5.9 below). The font's
    own lead has the knee. J2's lead b follows it, 2.96 u off.
  - Make the lead one even curve from its baseline start into b's loop:
    its curvature changes steadily, with no knee, and it leaves the
    font's lead as far as that needs.
- **b, v, w (K996, check only).**
  - Their exits end 17-22° below level, which feeds K948's e hook.
  - Compare each drawn end with the font's.
  - Edit one only where its drawn end is off the font's. Otherwise report
    the font's angle, for K948.

## Coordinator's calls (technical)

1. **Every change is a template edit.**
   - Each body change is a node edit in the template's Letters layer, the
     way Levi will edit it: few nodes, and G2 (curvature continuous)
     except at the deliberate corners (o's cusp, a's top, k's leg where it
     meets the stem, and f's cusp if it stays one).
   - Every letter you do not edit stays byte for byte as in out18 (J2
     changed no body).
2. **o's cusp and overstroke live in the body.**
   - The drawn o ends after its overstroke, and the exit starts G2 at that
     end. That needs no "cusp" exit kind, and Levi can later reshape the
     cusp and the overstroke by hand.
   - The overstroke is a retrace. Where the exit leaves the shared curve,
     it leaves tangentially with continuous curvature ("Smooth, continuous
     strokes" in Levi's calls), as the retraced stems of a, d, g and q do.
   - If this cannot work, build J2's seam-cusp route instead (J2's
     handoff, "o's exit", items 1-6) and say why in the handoff.
   - J2's census already counts every `exit o` seam as a designed cusp
     (`census_k962.py`, `summary`, about line 512), written for a cusp
     at the seam. With the cusp in the body, that seam is G2 again: drop
     the exemption, and name the body's cusp point as designed instead
     (call 3).
3. **a's corner is exact.**
   - The turnaround and the top of the right-side stroke share the same
     coordinates, and the two strokes leave that point with distinct
     tangents.
   - Name it as a deliberate corner, the way J2 names the cusp entries, so
     the census and rough don't count it as a kink. The same goes for
     o's cusp, k's leg where it meets the stem, and f's cusp if it stays
     one.
   - The thread mapping that runs around it comes later, not in this
     stage.
4. **The distance budget holds, except where Levi asks to leave the
   font.**
   - Bodies stay within 2.5 u of the font's path (3.0 u inside the K960
     junction stretches).
   - The exceptions are the changes Levi asked for: o's cusp and
     overstroke, a's corner, k's sharper leg, p's shorter end, f's cusp
     and b's lead-in.
   - Report each edited stretch's distance before and after.
5. **Re-choose only the join sets these edits move.**
   - Joins read the drawn ends, so they follow the edits by construction.
   - Their frozen settings (`work19/template_map_k962.json`) were chosen
     against the old ends. After each edit, compare the unedited build
     with J2's (`sensitivity_k962.py cmp`, as J2 wrote
     `work19/cmp_j1.txt`) to list the pieces that moved. Re-choose the
     sets of exactly those pieces, with joinfit and freeze, and nothing
     else.
   - Expect o's six exit sets (ox, oe, ow/op, og, ot, ov), p's exits, f's
     exits (fo, fe), lead h and h's entries, and whatever a's and k's
     edits move. Lead b is re-chosen for K995 (call 8).
   - e's after_o variant (`k962.evar.o`) is K948's, for the next joins
     stage. Leave its settings, and report oe's numbers.
6. **The take rule reads the census's peak (K997).** When you choose a
   set, score the census's peak |dk/ds| away from the seam, with the hook
   as its own term. J2 took fo and tail t on the hook alone, and their
   peaks rose.
7. **Locality holds.** J2's harness (`work19/dbg/sensitivity_k962.py`,
   via `derive_k962.ps1`) passes all nine edits at the end, with
   untouched pieces at 0 u. If one of its edits touches a letter you
   changed, re-derive that edit on the new letter and say so.
8. **b's lead-in is a setting, not a body.**
   - Its knee comes from following the font's lead, so the fix is lead
     b's frozen setting (`k962.lead.b` in J2's map), not b's body.
   - Re-choose it with joinfit and freeze, scored for evenness: the
     lead's |k| changes steadily from its start to the seam, with no
     interior peak of |k| or of |dk/ds| (call 6), and the distance
     budget does not apply to it.
   - If no setting of the lead's form can do that, give the lead a form
     that can: one G2 curve from the start tangent to the seam frame, as
     few nodes as K930's writer needs. Say why in the handoff.
   - Then look at the other leads in the census words (c, d, f, h, k, l,
     s, ...) for the same knee. Fix only b's and h's here, and list the
     others with crops for the next stage.

## Goal

- The edited letters in `out20/cursive_template.svg`. This becomes Levi's
  file to edit, after Levi's review.
- The re-chosen sets, frozen in `work20/template_map_k990.json` (key
  `k990`).
- J2's census, copied as `work20/dbg/census_k990.py`, before and after.
  It covers every pair whose pieces moved, including pairs outside the 14
  sheet words (add words to the census and the combs sheet as needed: fe
  is one).
- In `out20/`:
  - `cursive_v60.svg` (the alphabet);
  - `cursive_v60_words.svg`;
  - `combs_v60.svg` (every pair whose pieces moved);
  - `letters_v60.svg`: each edited letter alone and in two or three
    words, v5.9 beside v6.0, large enough that the change reads;
  - `census_v60.txt` (before and after).

## Order

1. **The baseline:** the census on J2's build (`work19/build_k962`),
   with the extra pairs added. Write the table into `NOTES.md` `## K990`.
2. **o (K976):** the cusp and the overstroke. Build, crop and look,
   re-choose the moved sets, and rerun the census.
3. **a, f, p, k, h,** in that order, each the same way: edit, build, crop
   and look, re-choose the moved sets, rerun the census.
4. **b's lead-in (call 8):** re-choose, build, crop and look beside
   `K995_b_lead.png`, census.
5. **b, v, w:** compare with the font, and edit only if off it.
6. **Build and look.**
   - The unedited letters, byte for byte.
   - The unedited build against J2's: which pieces moved, and by how much.
   - The census before and after, and the harness.
   - Crops of every edited letter and every moved join, before and
     after.

Not this stage:
- the cusp-entry rule (K991, the next joins stage);
- K948's e variant;
- K998's coverage beyond the pairs you move;
- the other leads' knees (list them only, call 8);
- K927;
- capitals (K931);
- the thread mapping.

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k990.py`, copied from J2's latest
    (`tools/*_k962.py`, `work19/dbg/`).
  - `work20/dbg/build_from_svg.ps1`, copied from J2's, runs the whole
    build.
  - Outputs go in `work20/` and `out20/`.
  - The record goes in `NOTES.md` `## K990`, with its rerun commands and
    every label list written out.
    - Write each finding there when you have it, not at the end. It
      survives a compaction, and a transcript is a poor place to dig
      results back out of.
    - Scripts go in `work20/dbg/`, never the session scratchpad.
  - Leave earlier versions' tools and outputs untouched.
- **K930's writer** (`tools/fewnode_k930.py`, the few-node writer). Every
  new curve goes through it: few nodes, G2.
- **Software.**
  - Python: `.claude/probes/K863/trace/venv/Scripts/python.exe -I`.
  - Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`, from the
    command line only. Never open its window, and don't change its
    preferences.
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`).
  - Downloads: none should be needed. If one is, put it in a new, empty
    directory and run Python on it with `-I`.
- **Levi's chart.**
  - `ref/chart.jpg` is never committed, uploaded or embedded in an SVG.
  - No output SVG may hold an `<image>`, `data:`, an `href` to a raster,
    or the word "chart".
  - Upload nothing: the coordinator uploads the SVGs.
- **Tracked files.**
  - Everything lives in the untracked probe directory, so there is
    nothing to commit.
  - The `## Handoff` you append to this brief is the coordinator's to
    commit.
  - `LEDGER.md` is the coordinator's.
  - Don't touch other tracked files.
- **Other agents** (K868's S3a7 and K992) work in their own worktrees
  until about 10:20 and may hold the perf lock. You time nothing, so never
  take the lock, and run one Python build at a time.
- **Not allowed:**
  - the phone;
  - timing;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile.
- **Crop and look** at your own renders before you call a visual result
  done.
- **Levi** is named, never "he" or "his", even where older notes say so.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-6 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, finish the letter you are on. Rerun the harness and
    the census, and say what is missing. What is left becomes the next
    stage.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## K990`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - per letter: the edit (which nodes, and how), the crops you looked at,
    and the distance before and after;
  - the re-chosen sets, with their numbers before and after;
  - the census before and after, in short: the worst rows;
  - the harness at the end;
  - the unedited build against J2's: the largest moves;
  - the outputs;
  - anything Levi should know, in plain words;
  - a `Ledger items` list (follow-ups and residuals; a question for Levi
    only about what shows on screen, in plain words);
  - K863's current handle fields.

## Handoff

### B1 handoff (K990 agent, 2026-10-28, 08:53-10:51)

Stopped at 10:51, inside the 2 h cap. The work is untracked in
`.claude/probes/K863/trace/` (`work20/`, `out20/`, tools in
`work20/dbg/*_k990.py`); `NOTES.md` `## K990` has the commands, the
numbers and the deviations.

**Body edits** (one template, `work20/edit/cursive_template_input.svg`;
the build re-derived only a, f, k, o and p; every other stroke 0 u from
J2's). Distance from the font's path (traced centreline), edited
stretch, before -> after (`work20/fit/bodydist_k990.txt`):
- o: 5 -> 8 cubics. Node 5 is a 180 deg cusp at the top (the close),
  then a 4 u overstroke back along the closing curve and a 12 u G2 tail
  that ends at +10 deg with k 0. `exit o` is no longer exempt in the
  census; the body's cusp is named instead. 2.47 -> 7.41 u (the tail's
  end).
- a: 12 -> 11 cubics. Node 6 is one 180 deg corner shared by the
  turnaround and the stem top; the bowl leaves it at -4 deg, 0.71 u
  above the old stem top. 0.87 -> 8.04 u (the bowl's first stretch after
  the corner sits above the font's rounder top).
- p: the end is cut 40 fu (end 1 deg, k -0.018; was -15.6 deg,
  -0.040). 0.76 u -> cut away; the new end lies on J2's path.
- f: 11 -> 12 cubics, no corner: the loop ends 20 u further on, at 50
  deg with k 0 (was 40.7 deg, k 0.226). 1.89 -> 4.30 u (the moved end).
- k: the leg's turn is now a corner (node 15, a 100 deg turn: in at 160
  deg, out at 60); node 9 is the stem's cusp. 2.52 -> 3.77 u (the
  corner's tip).
- h, b: no body edit. b, v, w checked only: their drawn ends sit
  0.08-0.34 u off the font's path, and their exits leave at -22.0,
  -17.1 and -20.5 deg against the font's -12.5 to -14.5 (left as they
  are; see the ledger items).
All five distances over 2.5 u are Levi's named exceptions (call 4).

**Re-chosen sets** (`work20/fit/take_k990.txt`; joinfit on the moved
sets only, the take read from the census, rule v2 in `NOTES.md`):
taken lead b and lead h (evenness: b's knee gone, |k| max 0.0930 at the
middle -> 0.0035 near the seam; h's 0.0202 -> 0.0053, a gentle hump
left), ful_n_e, ful_n_s, mrr_f_o|o, ful_n_f, ful_o_f, ful_o_x|x,
mod_o_n, mod_o_o. Kept at J2's: ful_b_o, mod_n_n, cnt_o_n, ful_o_e|e
(oe), mod_o_t, and low-smooth (its rule-B set brought ff and fe toward
the font but put knees in ff, fe and the unedited ee, so it was kept by
look). `k962.evar.o` untouched. oe: dist 5.29 -> 8.12 u, peak 0.0799 ->
0.0776, the 1 hook kept, spikes 38 -> 20.

**Census J2 -> B1** (152 pieces, `out20/census_v60.txt`): hooks 12 ->
10 pieces, over budget 40 -> 56, comb spikes 24 -> 15, rough FAIL 57 ->
40, seams not G2 0 -> 0. Worst moved rows: fe 22.55 u, ff 16.55, ot
12.76, fo 9.07 (rough FAIL), oe 8.12 (FAIL, 1 hook), ow / op 8.15, oa
7.35, og 7.32, ba 6.89, ov 6.6; their peaks all <= 0.0342 except ox
0.1365 (J2 0.1998) and oe 0.0776. The top peak is now J2's untouched t
tail (0.1685).

**Harness** (`work20/local/b1/sensitivity.txt`, run 10:27-10:48 on the
final B1 template; `derive_k990.ps1 -Stage b1` re-derived all nine edits,
22 builds, h_add and p_delete included): all nine PASS. Untouched max 0 u
for every edit (0 pieces over 1e-6); words without the edited letter
byte-identical for every edit; drag gain max 1.06 (e_end; d_fused 0.96,
n_retrace 0.92, x_move 1.00; the other five are single-step edits with no
drag series). Touched max: x_move 5.00 u, w_corner 4.02, d_fused 3.66,
e_end 2.52, n_retrace 2.27, p_delete 1.08, r_line 0.82, h_add 0.03,
joins_tick 0. h_add and p_delete pass as derived; nothing needed
re-deriving by hand.

**Unedited build against J2's** (`work20/cmp_j2_b1.txt`): 73 of 510
pieces moved; bodies o, a, p, k, f only (12.14, 11.85, 9.66, 7.26, 6.96
u); the frames those bodies carry (f exit 21.12, a after_o 16.44, a
after_b 14.39, o exit 10.89, p exit 10.67), one split (p@3562, 0.31 u),
the word joins and letters next to them (largest fo 15.22, a 15.04) and
leads b and h; junctions and tails 0.

**Outputs** (`out20/`, all free of images, data: URIs, raster hrefs
and the chart): `cursive_template.svg` (Levi's file to edit, after
Levi's review), `cursive_v60.svg`, `cursive_v60_words.svg`,
`combs_v60.svg` (the 14 sheet words), `letters_v60.svg`,
`census_v60.txt`; the map `work20/template_map_k990.json` (key k990).

**Missing / next stage**
- Combs of the moved pairs outside the 14 sheet words (coffee: of, ff,
  fe, ee; oat: oa; bad: ba) and crops of the lead-ins listed below:
  `pwsh -NoProfile -File work20\dbg\post_k990.ps1` makes both
  (`out20/combs_v60_more.svg`, `work20/crops/Z_lead_*`); not run, one
  Python process at a time while the harness ran. letters_v60.svg's
  coffee, oat and bad rows show those pairs meanwhile.
- Levi's review of `letters_v60.svg` and `cursive_template.svg`,
  above all the o's exit, which now sits lower and flatter than the
  font's (oa, og, ov, ow, op, oe and ot are 6.6-12.8 u from the font;
  of and ox stay near it), and a's
  flatter top.
- The f exit's position and angle (ff, fe float 16.55 and 22.55 u above
  the font; fo dips 9.07 u, rough FAIL): K998.
- Lead-ins with a knee, listed not fixed: e (even), f (fox), l (lazy);
  their crops come from `post_k990.ps1` (above).

