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