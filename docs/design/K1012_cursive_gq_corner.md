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
