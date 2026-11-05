# K1112 · Cursive J3h: c's exit port (v7.1)

Written by Claude (the coordinating session) on 2026-11-04 for one Claude
Opus agent and one stage. It builds on J3g
(`docs/design/K1119_cursive_j3g.md` and its Handoff), and J3g's brief
applies wherever this one does not say otherwise.

## Why

Levi (2026-11-04): "perfecting all junction and cursive work is always my
main priority". K1112 is one join rule for every pair: the exits are
ported letter by letter, and b, v and w were ported in J3g (v7.0). c is
next, then g, j, k, l, m, p, q, r, s, t, u, x, y and z.

Levi has not judged v7.0 yet (K1119: b's, v's and w's exits, the a/q
dip, e after b, v and w). This stage builds on v7.0 as it stands and
leaves b, v, w, a, q and e as v7.0 has them. c is a low exit (not in
`HIGH = bovw`), so nothing Levi decides about the high exits moves it.

## Goal (v7.1)

1. **c exits through one exit port**, the way J3 ported the low exits
   that `work30/ports_k1119.json` already holds. No per-pair data, no
   presets, no pins: the joins out of c stop reading J2's presets
   (`cnct.*`). The presets stay in the file until K1112's last letter,
   and none of the six pins (og, oe, fo, fv, fr, fs) involves c.
2. **If the port needs c's end to move** for a smooth join, as J3f's
   rounded ends did, only c's end moves. Place it as a designer would
   place the node (K928); nothing else in the template moves.
3. **At most two candidates.** If two placements both pass the gates and
   look right, both go on the sheet for Levi.

## Checks

J3g's checks, ported to `work31/dbg/checks_k1112c.ps1 [step]`, compare
v7.1 against v7.0:
- **Census** of v7.0 and v7.1 on J3g's words and pairs, plus every pair
  out of c and the census words holding one.
  - Only these may move: c's body, the joins out of c, and the words
    holding them.
  - Hooks, spikes, rough FAIL and undesigned seams must not rise.
- **Locality**: `work31/base` against `work30/base`, body by body and
  piece by piece. The untouched pieces stay byte-identical.
- **Solves**: every pair out of c converges.
- **The side test** (K991) on every cusp entry a join out of c makes.
- **Font distance** for c, reported per letter, not chased per pair.
- **Determinism**: a second build and sheet, byte for byte.
- **The guard** (`work20/dbg/check_out_k990.py out31`) before the upload.
- **Sheets**, looked at in crops before they ship, each also rendered to
  PNG in `out31/png/`:
  - `c_v71.svg`: font | v7.0 | v7.1 (| the second candidate), c alone
    and every pair out of c in the census words;
  - the census words that differ, v7.0 | v7.1.

## Outputs

v7.1 goes in the main checkout's `.claude/probes/K863/trace/`:
- `work31/`, `out31/`;
- the tools `work31/dbg/*_k1112c.py` (and `.ps1`);
- the record in `NOTES.md` under `## K1112 c`, with the rerun commands.

The SVG sheets go to Drive `K863/` with `v71` in their names (rclone, as
J3g did). The coordinator sends Levi the PNGs.

## Order

1. Run `Get-Date`: it is the start time. Copy this brief to
   `docs/design/K1112_cursive_j3h.md` in your worktree and commit it
   before anything else.
2. Read J3g's brief and Handoff and `NOTES.md` `## K1119`. Then find how
   J3 ported the low exits (`NOTES.md`, `work30/ports_k1119.json`).
3. c's port: the tool, the builds, the census and the measures; the
   choice.
4. v7.1's template, build and ports; the checks; the sheets and PNGs;
   the crops.
5. The guard, the upload, `NOTES.md` `## K1112 c`, the Handoff.

## Setup

- The repo is `C:\Users\lsl\Repositories\knotmaze`. Your branch and
  worktree are the ones Claude Code made for you.
- The work is untracked, in the main checkout's
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K863\trace\`.
- Python: `venv\Scripts\python.exe -I`. The font:
  `font\PlaywriteUSTrad[wght].ttf`.
- Set `K926_FINAL_E=shear` and clear `K1009_PINS`, as J3g's scripts do.

## Rules

J3g's "Rules (carried over from J3f)" apply, with this stage's names:
- tools `work31/dbg/*_k1112c.*`; outputs `work31/` and `out31/`;
- the record `NOTES.md` `## K1112 c`;
- view images from copies in `$env:TEMP\k1112c_view\`;
- the version is v7.1.

In short:
- Copy shared tools; don't edit them. Leave the earlier work folders and
  Levi's template files as they are.
- No timing and no perf lock. At most 4 worker processes.
- No subagents. No phone, dev server or browser.
- Muse is committing on master. So never touch the main checkout's
  tracked files or master, and never run git there.
- Don't edit `LEDGER.md`.
- Commit on your branch at every milestone, broken or not. Never push.
- Use PowerShell for commands. Read code through the shell; use the Read
  tool only right before an Edit.

**Stop rule.** Stop at the stage's end or 2 h from the start, whichever
comes first; run `Get-Date` at each milestone. To stop: commit WIP,
append the Handoff to this brief, commit, report. A compaction is not a
stop; after one, re-read this brief and `git log`. This stage is c only.

## Report

- What moved, with numbers.
- The candidates and the sheets' paths.
- A `Ledger items` list: follow-ups and residuals.
- K863's handle fields: owner, branch, last commit, evidence, next,
  brief.

## Later work (not J3h's)

- K1112's next exits, g, j, k, l, m, p, q, r, s, t, u, x, y and z, one
  stage each. Then J2's presets and the six pins are deleted.
- Levi's v7.0 answers (K1119), in their own stage.

## Progress (J3h agent, 18:52)

- Step 3 done: the choice is the port alone (merge at c's end node within
  [0, 10] u, as a, d, h, i and n), with c's template unchanged. Moving c's
  end out along the font's exit (14 u and 20 u, one cubic, P1 kept G2) and
  stretches of 2, 5 and 10 u all gave the same census within 0.2 u of font
  distance and the same look. Trials are in the trace dir's work31\try* and
  work31\census\v_*.
- Step 4 running: work31\dbg\checks_k1112c.ps1.
- Step 4 done 19:14 and step 5 done 19:21 (see the Handoff).

## Handoff

2026-11-04 19:24: the stage is done inside the cap (started 18:14:24,
cap 20:14:24). The work is in the main checkout's
`.claude/probes/K863/trace/` (untracked): `work31/` (ports, builds,
trials, censuses, solves, logs, crops), `out31/` (the template, the
sheets, `png/`), the tools `work31/dbg/*_k1112c.*` and the record in
`NOTES.md` `## K1112 c` (the choice and the checks, with the rerun
commands).

What moved (v7.1 against v7.0):
- **c's exit port** (variant Pc10 of `mk_ports_k1112c.py`): one record
  for c, a merge at c's end node within [0, 10] u back from the end
  (maxfev 8000), the stretch of a, d, h, i and n. Every join out of c is
  solved from it, and none reads a J2 preset. In v7.0 every one did
  (cnct.lop_c_h, cnct.mod_c_n, cnct.ful_c_e and the low groups).
- **c's template is unchanged.** c's drawn end already sits on the
  font's exit path: 4.85 u along it, 0.09 u off, at 2.1 deg. Two other
  things were tried:
  - moving the end out along the font's exit, as a designer would
    place the node (14 u and 20 u, `mk_template_k1112c.py`, one cubic,
    P1 kept G2);
  - stretches of 2, 5 and 10 u.
  Both gave the same census and the same look, within 0.3 u of font
  distance. So v7.1 is the port alone, one candidate.
- b, v, w, a, q and e are as v7.0 has them. bodies.json and
  join_params.json are byte-identical to v7.0's, and so is every
  untouched piece.

The numbers (`work31/census_cmp_v70_v71.txt`,
`work31/census_sum_v70_v71.txt`; J3g's words and pairs plus ca..cz,
595 pieces):
- All pieces: hooks 37 -> 37, spikes 69 -> 62, rough FAIL 128 -> 123,
  undesigned seams 12 -> 16, over budget 321 -> 332.
- The 31 joins out of c: hooks 0 -> 0, spikes 7 -> 0, rough FAIL 5 -> 0
  (ca, cc, cd, cg and coffee's co), seams 0 -> 4, over budget 14 -> 25.
- **The seam gate fails, by 4.**
  - The four: ci, cr and cs (180 deg) and cy (G1, with a curvature
    step of 0.0088 /u). Each attaches at 0 u, the bound of the right
    letter's cusp window.
  - v7.0's low exits already have this class: hi, er and es in the
    census words; in a probe, ai, ar, as, nr, ns, hi, hr, di, dr, er,
    es, ii and ir.
  - Every port trial adds the same four. Only two things would remove
    them: a per-pair bound, which the brief rules out, or a change to
    i's, r's, s's and y's cusp entries for every low exit.
- Font distance for c (the 26 pairs): dmax mean 7.76 -> 11.02 u, dmean
  mean 1.94 -> 4.00 u.
  - The largest are still the fused bowls: ca, cc, cd, cg and cq,
    27.4-27.9 u, the same as in v7.0.
  - Then ce 19.24, cx 14.19, cn 13.44, cv 12.79, cp 11.57, ck 10.78
    and cj 10.43.
  - Nearer the font than v7.0: cr 9.04 -> 3.40, cs 5.30 -> 2.75.
- Locality: PASS.
  - All 1857 untouched pieces of the 385 words are byte-identical.
  - The 32 joins out of c moved (up to 34.2 u, ct), and so did 24 of
    the 30 right-letter stroke 0s.
  - 33 of c's 59 strokes moved, up to 10.0 u: c is cut where the join
    leaves it.
- Solves: 26 of 26 at status 0, max nfev 2604 of 8000. The side test
  passes on all 9 cusp entries (lowest cw -0.0143 u; tolerance -0.05).
- Determinism: a second build is byte-identical in 25 of 33 files,
  bodies.json, join_params.json and the template included. The other 8
  are logs that hold their own paths, and Inkscape stderr. The words
  sheet, redrawn, is byte-identical.
- Guard: ALL CLEAN on out31 and on the upload copies.

The sheets (`out31/`; PNGs in `out31/png/`; on Drive `K863/` under the
same names):
- `c_v71.svg`: font | v7.0 | v7.1, c alone and ca..cz.
- `cursive_v71_words.svg`: the census words with a join out of c
  (cursive, quick brown fox, ice jet even, coffee, which), font | v7.0 |
  v7.1.
- PNGs (48 dpi): `out31/png/c_v71.png` and
  `out31/png/cursive_v71_words.png`. The crops read:
  `work31/sheets/png/zoom_c71_0..2.png`, `zoom_w71a_0.png` and
  `zoom_w71b_0.png` (`work31/dbg/strip_k1112c.py`).
- Drive `K863/` (rclone, 19:15; `rclone check`: 0 differences):
  c_v71.svg and cursive_v71_words.svg.

How it looks:
- c alone is as in v7.0.
- Into b, f, h, i, l, o, r, s and y, the solved joins rise diagonally,
  as the presets did.
- Into the fused bowls (a, c, d, g, q), they run flat along the
  baseline and turn up sharply into the bowl. The presets rose along
  the font.
- Into j, n, p, t, u, v, w and x, they leave c flat and turn up later
  and steeper than the font.
- ce crosses into an e eye lower than the font's.
- ck is an S: it flattens where it crosses k's stem.
- No hooks or kinks.

What is left:
- Levi's look at v7.1's c joins:
  - the flat-then-steep joins into the fused bowls and into j, n, p,
    t, u, v, w and x;
  - ce's lower eye;
  - ck's S.
- The port-cusp seams. ci, cr, cs and cy join ai, ar, as, nr, ns, hi,
  hr, di, dr, er, es, ii and ir at the bound of i's, r's, s's and y's
  cusp windows. That needs one stage for the cusp entries of every low
  exit; for example, a lower bound of about 2 u on the retrace window,
  which J3e's fr and fs pins set per pair.
- 14 of the 26 joins leave c at the 10 u bound of its stretch.
  Stretches of 2 and 5 u looked the same.
- Older, unchanged:
  - c's lead-in is rough FAIL in every c-initial word (facet 0.0098);
  - er and es reach MAXFEV at 3000 in v7.0.

Next: Levi looks at v7.1 (the questions above), then the cusp-entry
stage, then K1112's next exit, g.
