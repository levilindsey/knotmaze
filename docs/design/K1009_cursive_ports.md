# K1009: Cursive J3a, ports and solved joins (agent brief)

Stage brief (coordinator, 2026-10-28). Parent: K863
(`docs/design/K863_trace.md`). Previous stages: J2 (`K962_cursive_joins.md`)
and B1 (`K990_cursive_bodies.md`). Before anything else, read:
- `K863_trace.md` `## Levi's calls`. Every call there binds this stage,
  except where call 1 below revises J2's.
- J2's `## Coordinator's calls` and `## Handoff`, for how a join is built
  today (`gen_k962.assemble`, `params_for`, the frozen join sets).
- B1's `## Handoff`, and `NOTES.md` `## K962` and `## K990` for the rerun
  commands.

Ledger items: K1009 (this stage), under K863. It replaces K1005 and takes
in K991 (cusp entries) and K948 (e after a high exit) for the pairs it
builds. K937, K997 and K1006 wait for J3b.

## Why

Levi, 2026-10-28, on v6.0: "The exit segments from o, to either high or
low entry points on the following letter, are all discontinuous and bad.
In general, making entry and exit segments continuous with the rest of the
letter's strokes seems like something we've been struggling with,
especially as we try to support both high and low transitions for
neighboring letters. Is it worth taking a step back and rethinking how we
support these transitions? Maybe something more flexible and procedural
and less preconfigured?" The coordinator answered yes, and proposed this
design.

What goes wrong today:
- Each letter has fixed exit and entry frames, and two entry modes. A join
  is a G2 curve between the two frames, shaped by a frozen per-class
  setting (a join set) that was picked by fitting to the font's join. The
  seam is G2, but the frame sits where the body was drawn for one kind of
  join. A join that must leave in another direction bends hard just past
  the seam: a hook, an elbow, or a climb.
- A body edit leaves its join sets tuned for the old body. B1's new o left
  every join out of o 6.6-12.8 u off the font, where J2 had them at 1.1-2.3
  u (K1005: oa and og 7.3, ow and op 8.15, ot 12.76, ov 6.6). Levi's hand
  edits (K928, K944) would do the same, with nothing to retune them
  against.
- Every new rule has added more presets.

The coordinator's crops of v6.0: o's exit leaves from a sharp point low on
its right shoulder, with a small hook, and ot climbs from there to the very
top of t's stem. The font's bridge leaves the top of the o and meets t's
stem near the x-height.

Levi, 2026-10-28: "With the o to t segment in knotmaze, I think it might
look better if we had the segment join the t vertical stalk a bit lower
down." Also: "I like the a top corner now" (a is not touched).

## Coordinator's calls (technical)

1. **Ports replace the join presets.**
   - A letter declares ports, and the generator solves each join from the
     two ports it connects. No join built by this stage reads a per-pair or
     per-class preset, and nothing is fitted toward the font.
   - The font stays the census's reference: distance per piece is reported
     and shown next to the font in the sheets. It is no longer a gate.
   - This revises J2's "nothing fitted at build time": the build now solves
     each connector. What that call protected still holds: the same
     template gives the same output to the byte, and an edit changes only
     its own letter and the joins that touch it.
   - It is the one entry mechanism recommended under Levi's "Capitals,
     later" call. The two entry modes per letter stay, as two cases of it:
     a join from a baseline exit and one from a high exit (b, o, v, w)
     attach to the same port at different points. The after-high variants
     (`evar_k990.py`'s records) are what the solve replaces.
2. **A port** is a stretch of a letter's body, plus how a connector
   attaches there.
   - **The stretch** is an arc-length range from a named node of the body,
     so a hand edit carries the port along with the letter. A fused
     junction's stretch is one point: 60 u for a, c, d, g and q, and 86 u
     for o (Levi's calls).
   - **Attach kinds:**
     - **merge**: the connector meets the body tangentially, with matched
       curvature (G2), and the stroke continues along the body. This covers
       a plain entry or exit, and a fused junction. There the connector
       merges into the shared path at the junction, and "each pass leaves
       the shared curve tangentially, with continuous curvature" (Levi's
       calls). It also covers o's cusp exit: the connector leaves the
       overstroke's retrace with a G2 merge.
     - **cusp entry** (t, p, i, j, r, s, u, w, y; K991): a merge onto the
       stem, traversed upward. The connector stays on one side of the
       stem's line until it meets it, with its tangent collinear with the
       stem there (Levi's v5.8 note, as `K863_trace.md` reads it). Above
       the meeting point, the stroke runs up the stem to the stem's top
       cusp. The stretch says how far below the top the meeting point may
       slide.
     - **corner**: two tangents at one point (a's top, k's leg). Only
       bodies have corners in this stage; no join attaches at one.
   - **Hints** (optional): a waypoint or band the connector passes (r's dip
     about 50 u below the x-height after a high exit, Levi's K901 "dip"),
     limits on the arrival direction, and a pinned attach point (call 5).
   - **Take-over.** The body between a port's outer end and the attach
     point is replaced by the connector: today's drawn lead-in or exit
     stroke, or a bit of the letter, as the font's variants do (K904).
     Each port bounds it.
   - **Where ports live:** a sidecar JSON keyed by letter
     (`work21/ports_k1009.json`). The template's format does not change in
     this stage. Where the template draws a mode-specific entry stroke, the
     port lies on the part both modes share, and the drawn stroke is what
     the connector takes over.
3. **The solve:** one per pair, deterministic, depending only on the two
   letters' bodies and ports.
   - **Variables:** the attach point on each port, within its stretch, and
     the connector's free shape parameters. Reuse J2's G2 join
     construction, with its frozen shape settings as the variables. If it
     cannot express a call, extend it and say why.
   - **Objective:** the fairness of the whole stroke over a fixed window,
     ∫(dκ/ds)² ds, plus the hint terms. The window runs from a fixed point
     on the left letter's body before its port to a fixed point on the
     right letter's body past its port. A designed cusp or corner ends the
     window early. Over that window, the connector replaces the body it
     takes over. The window length and the hint weights are yours; report
     them.
   - **Constraints:**
     - G2 at every merge, by construction;
     - the cusp entry's side and tangent;
     - a minimum radius on the connector, no tighter than the census's hook
       threshold;
     - no self-crossing, and no crossing of either body except at the
       attach points.
   - **Start:** one fixed geometric start, not a preset, and no random
     restarts. The answer must be continuous in the template: a small edit
     moves the connector a little (call 7's sweep).
   - **Output:** cubic Béziers in the same build, two or three per
     connector (few nodes, as K930 wants), and a sidecar per word listing
     each join's attach points and kinds. The thread mapping will read it.
   - Report the solve time per pair (single process, indicative only).
4. **o's exit: three variants for Levi to pick by look.** All three stay
   within K976 ("an abrupt cusp and then slight overstroke as it leads to
   the exit segment").
   - **A:** B1's o as it is, with solved joins. This shows what the solve
     alone fixes.
   - **B:** the cusp at o's top, where the stroke closes. The overstroke
     runs back along the top, so the connector leaves from the top as the
     font's bridge does. Overstroke about 4 u.
   - **C:** as B, with an overstroke of about 10 u.

   Make B and C as copies of the template, with o's nodes edited as B1's
   `edit_k990.py` does, through K930's writer. `out20/cursive_template.svg`
   changes only once Levi picks.
5. **ot lower.** For each of A, B and C, ot meets t's stem at three
   heights:
   - v6.0's (the top);
   - the font's;
   - halfway between.

   The meeting point is pinned by a hint for these sheets. Once Levi picks,
   the pick becomes t's stretch. Every other join into t solves its
   meeting point freely within that stretch; report where each lands.
6. **Low exits into the same ports, with no new hints:** nt, at, it; na,
   ea, da (the fused junction); ne, he. Against v6.0's joins for the same
   pairs. Together with the o pairs, they show that one port serves both
   entry modes.
7. **The checks.**
   - **The census** (B1's `census_k990.py`, or a copy) on every piece this
     stage builds, against v6.0's same pieces: hooks, seam gaps, peak
     |dκ/ds|, comb spikes, rough, and distance to the font.
   - **Seams:** at every merge, the curvature gap is within the census's
     seam tolerance. At every cusp entry, the angle to the stem is at most
     1°, and the connector stays on its side of the stem's line before the
     meeting point (the minimum signed distance).
   - **Locality:** J2's harness (`work19/dbg/sensitivity_k962.py`, as B1
     ran it): each of its 9 edits changes only its own letter's pieces and
     the joins that touch it.
   - **Continuity:** three sweeps of 20 steps each:
     - t's meeting height, from the top to the font's;
     - one of o's nodes, moved 2 u;
     - one node near n's entry, moved 2 u.

     The connector moves smoothly. Report the largest step-to-step move,
     and flag any step over 3 times the median.
   - **Determinism:** two builds, byte-identical.
   - **The presets path:** the build with the presets reproduces v6.0's
     `out20/` outputs byte for byte.
   - **The look:** crop every o pair under A, B and C, ot at its three
     heights, and the low cases, and look at them before you report. Name
     anything that hooks, elbows or climbs.

## Goal

- **The mechanism.**
  - Ports for all 26 letters' entries, and for the exits of o, a, e, h, i
    and n.
  - A solved connector for every pair this stage builds, reading no
    preset.
  - The presets path unchanged.
- **Levi's sheets,** each next to v6.0's and the font's:
  - `out21/o_exits_v61.svg`: o followed by each letter a-z, under A, B
    and C;
  - `out21/ot_v61.svg`: ot at its three heights under A, B and C, alone
    and in "knotmaze";
  - `out21/low_v61.svg`: call 6's pairs;
  - `out21/cursive_v61<a|b|c>_words.svg`: the 14 words under each
    variant. Joins whose two letters have ports are solved. The rest keep
    B1's presets, and the report lists them.
- **The checks** of call 7:
  - no hooks on this stage's pieces;
  - every merge G2, and every cusp entry on one side of its stem;
  - peaks and combs no worse than v6.0's on the same pieces;
  - locality, continuity, determinism and the presets path hold.

Out of scope (J3b): every other exit, the leads and tails (K1006), f's
lower-loop end into its exit (K990), be, we and ve (K948 beyond oe), and
the removal of the join sets. Capitals are K931.

## Order

1. **Start.** Run `Get-Date`, then read what the top of this brief lists.
   Rebuild v6.0 from the template with B1's commands into `work21/base/`,
   and confirm it matches `out20/` byte for byte.
2. **Ports.** Write the data model and its reader, and the declarations:
   all 26 entries, and the exits of o, a, e, h, i and n. In `NOTES.md`,
   give one line per port saying why it sits where it does.
3. **The solve** (call 3), with the presets path untouched.
4. **o's exits:** A, B and C, the o pairs, and ot at its three heights.
   Crop and look.
5. **The low cases** (call 6). Crop and look.
6. **The checks** (call 7).
7. **The sheets** (Goal), each through the guard, then stop.

## Rules

- **Tools and outputs.**
  - New tools are `tools/*_k1009.py`, copied from B1's latest
    (`tools/*_k990.py`, `work20/dbg/`).
  - `work21/dbg/build_from_svg.ps1`, copied from B1's, runs the whole
    build. It gets a switch between the presets and the ports.
  - Outputs go in `work21/` and `out21/`. The version is v6.1.
  - The record goes in `NOTES.md` `## K1009`, with its rerun commands and
    every list written out.
    - Write each finding there as you get it (N1, N2, ...), not at the
      end. It survives a compaction.
    - Scripts go in `work21/dbg/`, never the session scratchpad.
  - Leave earlier versions' tools and outputs untouched.
- **Software.**
  - Python: `.claude/probes/K863/trace/venv/Scripts/python.exe -I`. It has
    numpy, scipy, fontTools and PIL; nothing else is installed.
  - Inkscape: `C:\Program Files\Inkscape\bin\inkscape.com`, from the
    command line only. Never open its window, and don't change its
    preferences.
  - Read code through the shell (`Select-String`, then `Get-Content |
    Select-Object -Skip -First`).
  - Downloads: none should be needed. If one is, put it in a new, empty
    directory, and run Python on it with `-I`.
- **Images.** To view one, copy it to `$env:TEMP\k1009_view\` and read the
  copy. A Read under `.claude/probes/**` attaches 51 KB of probe lore
  (K999).
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
- **Other agents.** K868's S3a8b (worktree `k868-s3a`, until about 14:05)
  and K1000 (worktree `k992-corners`, until about 13:25) take timings
  under the perf lock on this machine.
  - You time nothing, so never take the lock.
  - Run one Python process at a time, with no multiprocessing pools.
- **Not allowed:**
  - the phone;
  - timing claims beyond call 3's indicative solve times;
  - `npm run build` in the main checkout;
  - processes you did not start;
  - Levi's Chrome profile.
- **Crop and look** at your own renders before you call a visual result
  done.
- **Levi** is named, never "he" or "his", even where older notes say so.
- **Helpers.** Only if needed: `model: sonnet`, a 1 h cap and these rules.
- **Stop rule.**
  - Stop when steps 1-7 are done or 2 h after your start, whichever comes
    first. Run `Get-Date` at the start and at each milestone.
  - At 1 h 30 min, finish the case you are on, then run the checks and
    build the sheets for what exists. Write down what is missing; what is
    left becomes the next stage.
  - A compaction is not a stop. After one, re-read this brief and
    `NOTES.md` `## K1009`.
  - On stopping, append a `## Handoff` to this brief, then report.
- **The final report** gives:
  - the ports: a table of letter, kind, stretch and hints;
  - the solve: its variables, objective, window, constraints and start,
    and the solve time per pair;
  - o's variants (which nodes moved, and how), the o pairs, and ot at its
    three heights, with the crops you looked at;
  - the low cases against v6.0;
  - the census against v6.0 (the worst rows), and the checks;
  - the outputs;
  - what Levi should look at, in plain words;
  - a `Ledger items` list: follow-ups and residuals. A question for Levi
    only about what shows on screen, in plain words;
  - K863's current handle fields.
