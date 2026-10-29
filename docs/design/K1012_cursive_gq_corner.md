# K1012: Cursive B2, g's and q's top corner (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K863
(`docs/design/K863_trace.md`). Previous stages: B1 (`K990_cursive_bodies.md`),
which made a's top corner, and J3a (`K1009_cursive_ports.md`), whose
ports build this stage builds on. Before anything else, read:
- `K863_trace.md` `## Levi's calls`. Every call there binds this stage.
- B1's `## Coordinator's calls` (call 3: a's corner is exact) and
  `## Handoff` (the a edit), and `NOTES.md` `## K990` for how a's edit was
  made and checked.
- J3a's `## Handoff`, and `NOTES.md` `## K1009` for its build and rerun
  commands.

Ledger item: K1012 (this stage), under K863.

## Why

Levi, 2026-10-28: "I think we need g and q to have the same top right
corner treatment as a". B1 gave a its corner after Levi's v5.8 review:

> "I want the top of the a body, at the point where the stroke abruptly
> turns around and starts overstroking back, to touch the exact top of
> the right-side stroke of a. Right now it's a bit downward from that
> top point. They should form an angle. When we hook this up to threads,
> I'm going to want to have the thread continue seamlessly around this
> sharp corner bend."

Levi accepted a's corner on sight (K1004: "I like the a top corner
now"). g and q have the same bowl-and-stem top as a, so they take the
same corner. How their tops sit today has not been measured: that is
step 2.

What B1 did to a (its handoff): "a: 12 -> 11 cubics. Node 6 is one
180 deg corner shared by the turnaround and the stem top; the bowl
leaves it at -4 deg, 0.71 u above the old stem top. 0.87 -> 8.04 u (the
bowl's first stretch after the corner sits above the font's rounder
top)." The edit is `work20/dbg/edit_k990.py`'s a edit, written through
K930's writer (`tools/fewnode_k930.py`).

## Coordinator's calls (technical)

1. **The edit is B1's a edit, applied to g and q.**
   - The turnaround and the top of the right-side stroke share one
     point, and the bowl and the stem leave it with distinct tangents,
     exactly as a's do (B1 call 3).
   - Each letter's corner sits at the top of its own right-side stroke,
     as a's does. If the three corners end up at different heights,
     report it; don't move a.
   - Every new cubic comes from K930's writer, G2 to its kept
     neighbours. The only tangent break is the corner.
   - Copy what you need from `edit_k990.py` into
     `work22/dbg/edit_k1012.py`. Leave `edit_k990.py` as it is.
2. **One template in, one template out.**
   - In: the template J3a's base build read. Its build log names it; it
     is B1's `out20/cursive_template.svg` unless the log says otherwise.
   - Out: `out22/cursive_template.svg`, Levi's newest file to edit. Only
     g's and q's Letters-layer paths may differ from the input. Check
     that every other path is byte-identical.
3. **The fused entries follow the corner.**
   - g's and q's entries are fused ports, like a's
     (`work21/ports_k1009.json`, y 60 u). From the junction up to the
     body's start, the entry and the body are one thread. In a, the
     body's start is the corner itself (`census_k1009.body_corners`:
     "a start = node N (shared point)").
   - If the edit moves g's or q's start, the fused stretch follows it.
     Check that it stays within 3.0 u of the bowl (K960) and that its
     seam is as J3a built it.
4. **Build on J3a's pipeline, variant A only.**
   - Copy `work21/dbg/build_from_svg.ps1` to `work22/dbg/` and build
     with `-Mode ports -Variant A` into `work22/base`.
   - o's variant waits on Levi. J3b rebuilds whichever Levi picks, so B
     and C are not rebuilt here.
5. **The census names the corners.**
   - Copy `work21/dbg/census_k1009.py` to `work22/dbg/census_k1012.py`
     and add g and q to `DESIGNED_BODY` ("g's top corner (K1012)", "q's
     top corner (K1012)"), so neither the census nor rough counts them
     as kinks.
   - The bowl's first stretch after the corner may leave the font's
     rounder top by more than 2.5 u, as a's did (8.04 u). That is
     Levi's ask: report it, don't budget it.
6. **Locality.**
   - Only g's and q's bodies, the frames they carry and the joins next
     to them may move.
   - Compare `work22/base` with `work21/base` piece by piece, as B1's
     `work20/cmp_j2_b1.txt` did. Everything else moves 0 u, and every
     word without g or q renders byte-identical.
7. **Threads come later.** The thread that runs around the corner
   belongs to the thread-mapping stage (K863's next), not to this one.

## Goal

- `out22/cursive_template.svg`: g and q with a's top corner.
- v6.2 (J3a's ports build, variant A) built on it, with the census and
  the locality check against v6.1 A.
- Sheets, each guarded:
  - `out22/corners_v62.svg`: a, g and q, before (v6.1 A) and after
    (v6.2). Show the whole letter and a zoom on the top right, with the
    corner point marked.
  - `out22/gq_words_v62.svg`: aqua, gag, dog, egg, quiz, equal, bog and
    wig, v6.1 A against v6.2 (`tools/sheet_k1009.py` with two `--col`s).
  - `out22/cursive_v62_words.svg`: J3a's 14 words, v6.1 A against v6.2.

## Order

1. `Get-Date`. Read the calls and the files named at the top. Find how
   `edit_k990.py` made a's corner and how J3a's base build reads the
   template.
2. Measure g's and q's tops today, as B1 measured a's: where the
   turnaround sits against the top of the right-side stroke, and the
   tangents there. Write it down (N1).
3. Write `edit_k1012.py`, make the template, and check that only g and
   q changed.
4. Build v6.2 into `work22/base`, then run the locality check.
5. Run the census and the distances against v6.1 A.
6. Build the sheets and guard them, then crop and look.
7. Append the handoff and report.

## Rules

- **Tools and outputs.**
  - New tools are `work22/dbg/*_k1012.py` (and `.ps1`), copied from
    J3a's (`tools/*_k1009.py`, `work21/dbg/`) and B1's
    (`work20/dbg/edit_k990.py`).
  - Outputs go in `work22/` and `out22/`. The version is v6.2.
  - The record goes in `NOTES.md` `## K1012`, with its rerun commands
    and every list written out.
    - Write each finding there as you get it (N1, N2, ...), not at the
      end. It survives a compaction.
    - Scripts go in `work22/dbg/`, never the session scratchpad.
  - Leave earlier versions' tools and outputs untouched.
- **Software.**
  - Python: `.claude/probes/K863/trace/venv/Scripts/python.exe -I`. It
    has numpy, scipy, fontTools and PIL; nothing else is installed.
  - Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`, from the
    command line only. Never open its window, and don't change its
    preferences.
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`).
  - Downloads: none should be needed. If one is, put it in a new, empty
    directory, and run Python on it with `-I`.
- **Images.** To view one, copy it to `$env:TEMP\k1012_view\` and read
  the copy. A Read under `.claude/probes/**` attaches 51 KB of probe
  lore (K999).
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
  - Don't touch any other tracked file.
- **Other agents.** K868's S3a8b2 (worktree `k868-s3a`, until about
  15:45) and K992's stage 3 (worktree `k992-corners`, until about 15:05)
  take timings under the perf lock on this machine.
  - You time nothing, so never take the lock.
  - Run one Python process at a time, with no multiprocessing pools.
- **Not allowed:**
  - the phone;
  - timing claims;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile.
- **Crop and look** at your own renders before you call a visual result
  done.
- **Levi** is named, never "he" or "his", even where older notes say so.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these
  rules.
- **Stop rule.**
  - Stop when steps 1-7 are done or 2 h after your start, whichever
    comes first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, finish the letter you are on, then run the checks and
    build the sheets for what exists. Write down what is missing; what
    is left becomes the next stage.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## K1012`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - g and q today: the turnaround against the top of the right-side
    stroke (N1);
  - the edit per letter: cubics before and after, the corner's node and
    its tangents, how far the corner moved, and the distance from the
    font's path before and after;
  - the fused entries after the edit;
  - the census against v6.1 A (the worst rows) and the locality check;
  - the crops you looked at, and the outputs;
  - what Levi should look at, in plain words;
  - a `Ledger items` list: follow-ups and residuals. A question for
    Levi only about what shows on screen, in plain words;
  - K863's current handle fields.

## Handoff

B2 stopped at 15:15 (start 14:18:41) with Order steps 1-7 done.
Nothing committed or uploaded; the work is in the untracked
`.claude/probes/K863/trace/` (record: `NOTES.md` `## K1012`, N1-N10,
with every rerun command).

- **Built.** `out22/cursive_template.svg`: only g's and q's
  Letters-layer paths differ from `out20` (`verify_tpl_k1012.py`).
  `work22/base`: v6.2, the ports build, variant A. Tools in
  `work22/dbg/*_k1012.*`; `edit_k1012.py` is B1's edit made per letter,
  and on out18's a it writes out20's a byte for byte.
- **Today's g and q (N1).** a's old spur (12.9 / 12.1 u), the
  turnaround 1.29 / 1.02 u below and right of the stem top T, and the
  bowl's top 3.06 / 2.47 u below T (a's was level with it).
- **The edit (N2).** B1's parameters unchanged (the bowl leaves T 4 deg
  above level). g: 9 -> 8 cubics, corner node 5, turn 178.0 deg, bowl
  and stem 73.3 deg apart. q: 11 -> 10 cubics, corner node 4, turn
  179.7 deg, 70.5 deg apart. Every other joint G2. The corners sit at
  each letter's own T, 122.28 u (g) and 122.21 u (q) above the
  baseline: 1.96 and 1.89 u above a's (120.32 u). a not moved.
- **Fused entries (N5).** The junctions (y 60 u) did not move; the
  turnaround is now the body's start, at T. Junction stretches 0.62 u
  (g) and 0.92 u (q, was 0.31): within 3.0 u. The new tops run 9.2 u
  off the font's (a's 8.0 u since B1): reported, not budgeted.
- **Checks.** Build: J3a's script with a logged fallback to the k962
  word and template writers, since `words_k1009.py` and
  `template_k1009.py` do not exist (N3; the mode picks only those two,
  so the result is the one asked for). Locality PASS: of 575 pieces, 25
  moved, all touching g or q; the 500 that touch neither moved 0 u; the
  11 words without g or q are byte-identical (N4). Census against v6.1
  A: one row changed, og (lazy dog) dmax 19.91 -> 20.74 u, rough FAIL
  before and after; g's and q's seams at about 1e-13 (N6). Bodies
  against the font: g 2.50 -> 9.17 u, q 2.77 -> 9.30 u, both at the new
  top (N7).
- **Sheets (N8).** `out22/corners_v62.svg`, `out22/gq_words_v62.svg`,
  `out22/cursive_v62_words.svg`, v6.1 A against v6.2. Guard: ALL CLEAN
  on all four out22 files. Crops looked at: listed in N8.
- **A reader bug the census misses (N9).** `tools/asdrawn_k980.py`
  `transport` reads Bezier t as an arc fraction at both ends. Where the
  edit merges cubics, the carried high-entry frames land far off: q's
  after_o / after_b moved 36.1 / 34.6 u onto the bowl's left side, so
  the preset joins bq, vq and wq sag onto q's left shoulder (2.2-3.0 ->
  22.9-23.3 u from the font). a has carried the same error since B1
  (16.4 / 14.4 u; ba, va and wa land low, 1.7-1.9 -> 6.8-7.0 u). By true
  arclength they would land 4.3 / 4.2 u (q) and 2.7 / 2.2 u (a) from
  the old places. Check sheets: `work22/sheets/high_into_gq_v62.svg`
  and `high_into_a_v61.svg` (not in out22); no census word holds bq,
  vq or wq. Not fixed here: it moves a's words (call 6). oq's and oa's
  font distances (59.3 and 38.5 u; the census's oa in oat, 39.5 u,
  third worst) are likely measured to the moved frame, not the join
  (inferred from gen_k1009's code, not tested).
- **g's shoulder (N10).** g's new cubic is short (58.9 u against a's
  95.4 and q's 125.2 u) and meets the kept cubic 2 where the bowl
  already turns at radius 42 u: it runs nearly straight from the
  corner, then bends late. No angle or w_pk of the one-cubic edit
  removes it; a fix refits cubic 2 as well.
- **Missing.** The reader fix (N9), g's shoulder (N10), threads
  (call 7).
- **Next.** Fix `transport` (true arclength), rebuild, and recheck ba,
  va, wa, oa, bq, vq, wq and oq; Levi looks at the corners and g's top.
- **Rerun.** From the trace dir: `measure_k1012.py` (N1),
  `edit_k1012.py edit` and `verify_tpl_k1012.py` (N2),
  `build_from_svg.ps1 -Mode ports -Variant A` (N3), `cmp_k1012.py`
  (N4), `fused_k1012.py` (N5), `& work22\dbg\checks_k1012.ps1` (N6-N8:
  census, compare, distances, the two word sheets, guard),
  `corners_k1012.py` (N8), `frames_k1012.py` (N9), `wpk_k1012.py`
  (N10); the full commands are in NOTES.
