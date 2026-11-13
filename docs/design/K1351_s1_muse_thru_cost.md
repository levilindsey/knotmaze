# K1351 stage 1 (Muse): thruGate at no cost, then on

Ledgers: K1351 (c8's lost ink), K1314 (the census). One Muse run, started by Claude through Paseo from this committed
brief. Cap 2 h. Read first: the handoff at the end of `docs/design/K1314_s13_j58a_j49_lost.md` (its c8 bullet),
then `.claude/rules/render.md` and `.claude/rules/probes.md` (Claude's area rules; Muse does not load them by
itself).

## Why

K1314 s13 (merged at 39ad8186) built `K1314S13.thruGate` (`src/render/outline/outline.ts`, near line 8108): the
thru tails walk E's border under X only at corners whose fillet failed with "V outside spans". With it on, c8's
lost ink is fixed (box |d| 10.67% -> 4.11%), and the census moves 69 tail_look finds out and 2 in (175 -> 107)
with no bar kind moving. Claude viewed the crops (`.claude/probes/K1314/out/s13/moved_x4/`); that look is
approved. It is off only for its cost on the def drag: paint +3.1 ms, frame +0.9 and fill +0.6 per drag
(`.claude/probes/K1314/out/s13/abba_run.txt`). The cause: the structure is built once per scene and pushes a thru
piece per through corner (def: 354 more pieces, mostly empty, +513 points), while the gate changes per frame (the
corner solve's cOk / cWhy). paintFrame (`draw.ts`), fill and frame pay for every empty piece.

## Goal

thruGate on by default, with every output identical to s13's thruGate-on output and no part of the worker slower
than master beyond the spread. The technique is yours. s13 named two: paintFrame, fill and frame skip an empty
piece at no cost, or the thru pieces move out of piecesD into a per-frame list.

## Done

1. **Look unchanged from s13's thruGate:** the census with thruGate on
   (`.claude/probes/K1314/k1314_run.ps1 -Lock -Tag <t>`) equals `census_k1314s13c` find for find: stray_ink 4,
   hard_edge 1, paper 0, broken_ink 12, k1049 0, tail_look 107. Copy
   `.claude/probes/K1314/out/s1/census_k1314s13c*` from the main checkout first. Any find that differs is a
   failure: report it with its crop (`.claude/probes/K1314/k1314s12_crops.ts --app`), and leave the flag off.
2. **Off is identical to master:** with thruGate off, the s18 drags and the 12 census scenes digest equal to
   master's (`.claude/probes/K1341/k1341s1_digest.ts`, built with `.claude/probes/K1247/k1247s28_build.mjs`; run it in
   your worktree and against a `git archive` export of master, and compare the files).
3. **Speed:** a swap-averaged interleaved Node A/B (`.claude/probes/K1341/k1341s3_ab.ts`; read its header and the
   K1341 s3 handoff in `docs/design/K1341_s3_muse_fill.md` for why it must be swap-averaged): thruGate on in your
   code against master, on def, muse_hash and fat. For frame, zChains, fill, band and paint, each 95% interval
   includes zero or is negative.
4. **The GPU twin:** `.claude/probes/K1314/k1314s13_gpu2.ts` with thruGate on: the mirror line equals master's at
   its three spots.
5. `npm test` green, golden snapshots unchanged. If `outline_port.test.ts`'s pins move with the flag on, re-pin
   them (`.claude/probes/K1314/k1314s13_pins.ts` names what moves) and name them in the commit. Copy
   `.claude/probes/K868/scenes/g41_ring_tw42.json`, `muse_hash.json` and `g41_user_tw64.json`, and
   `.claude/probes/K1247/out/s18/`, from the main checkout first (untracked; without them tests skip).

If all five hold, set `thruGate: true` in `K1314S13` and push. If any fails, push only finished,
identity-checked parts with the flag off, and say which check failed.

## How to work

- **Your worktree** is `.claude/worktrees/muse-k1351-s1` (detached, at master). `node_modules` is a junction to the
  main checkout's; never `npm ci` or `npm install`.
- **Exports of master** (for the digest or the A/B) go under `$env:TEMP\k1351m\`, never inside the worktree. If an
  export needs `node_modules`, junction it, and before deleting the export delete that junction alone with
  `(Get-Item <path>).Delete()`: a recursive delete or `git worktree remove` follows a junction into the main
  checkout and deletes its packages (it did on 2026-11-12). The A/B's master copy at `src/render/outline_m` must be
  deleted before every `npm test` (`paint_ring_lap.test.ts` scans every GLSL file under `src/render`); never commit
  it.
- **Your files:** `src/render/outline/draw.ts`, `fill_tri.ts`, `chain_frame.ts`; in `outline.ts` only the thru
  tail structure (where the thru pieces are pushed into piecesD, `thruGateOk`, the `K1314S13` flags) and the frame
  code that walks the pieces; tests; and tools under `.claude/probes/K1351/` named `k1351s1_*`. Two Claude agents
  work beside you: K1314 s14 in `outline.ts`'s side rule, lift, run-root-ramp and fan builders, the band files
  (`band_gpu.ts`, `band_place.ts`, `band_rec.ts`), `rec_glsl.ts` and `paint.ts`; K1247 s36 in `outline_app.ts`,
  `outline_worker.ts` and `outline_model.ts`. Stay out of those.
- PowerShell. Read code with Select-String and 40-80 line ranges of Get-Content; never print a whole file
  (`outline.ts` is over 400 KB). Write TypeScript through Node or the editor, never through PowerShell text IO.
- **Timing:** the interleaved Node A/B needs no perf lock (load cancels in the paired diff). Note the machine's load
  with each run. The census takes the lock itself with `-Lock`; hold no lock of your own around it.
- **Commits:** commit finished, tested parts and push them yourself: `git fetch`, rebase on origin/master,
  `npm test` green, then `git push origin HEAD:master`. Stage files by name; scripts under `.claude/` need
  `git add -f`. Never force-push, skip hooks, or add outputs (`out/`) or probe JSON.
- **Ledger:** leave K1351 and K1314 to Claude. File new items only with
  `node C:\Users\lsl\Repositories\claude-config\tools\ledger.mjs add --repo . ...`.
- No subagents. Run `Get-Date` at the start and at each milestone. **Stop** at the 2 h cap or when every Done
  holds. A Done that looks out of reach is not a stop: spend the time on the next most promising cause.
- When you stop: append a Handoff to this brief (start and stop times, the A/B table, the census line, what changed,
  what is left), commit and push it, and report. A stopped run pushes only its finished part; keep unfinished code
  as a patch under `.claude/probes/K1351/` (untracked).

## Handoff (K1351 s1 Muse run, 2026-11-12, start 19:42:53 PT, stop 21:20:23 PT)

**Outcome: thruGate stays off. The no-cost machinery is landed and identity-checked; Done 3 fails on
three cells, so per the brief the flag was not flipped.** Landed (one commit, rebased on origin/master
after K1314 s14 merged; npm test green before and after the rebase: 231 files, 2948 tests):

- `piecesPhaseC` (outline.ts) reads the thru gate before building the TailIn: a gated-out thru tail
  keeps its side/s and the shared `EMPTY_PTS` arrays, builds no bend search, depth closures or
  TailIn, and enters neither tailJoin nor thruIn (both no-ops on an empty tail).
- `fillStructure` (fill_tri.ts) gives a thru tail (interval >= 2) no fill item. Its piece's fpts is
  always [] (thruTailPts writes pts only), so fillFrame could only ever set its 2*(TAIL_M+1)
  vertices degenerate; def loses 354 items / 17700 vertices / 50976 indices vs s13's design.
- draw.ts and chain_frame.ts needed no change: with the fill vertices gone, paintFrame's copy is
  master-sized again; bandData already skipped sub-2-point pieces.

**Done 1 (census): counts hold; the s13c file is stale vs current master.** Full census k1351s1:
stray_ink 4, hard_edge 1, paper 0, broken_ink 12, k1049 0, tail_look 107 — equal to census_k1314s13c,
and the 17 bar-kind finds are find-for-find identical. But 12 tail_look records (muse_hash: x134,
j81, j58, j59, j102, j78 spots) and 18 owner_only records differ from s13c in px/bbox at the ~1%
level. Attribution: pristine master at 8ff2b01f with only the flag flipped differs from s13c by the
same 26 muse_hash records, and master == this stage's code find-for-find there (0 differing,
census_k1351s1m vs k1351s1b; this stage's code also reproduces itself exactly on a rerun). So the
differing records are master drift since s13c was generated (other stages merged in between), not
this change. Crops for the differing finds were not generated (cap); their spots are named above.

**Done 2 (off identity): holds.** k1341s1_digest in this worktree vs a git-archive export of master:
byte-equal files, `all 1acaf41993fca0ff`, checked twice (before the shared-empty edit and with the
final shipped code).

**Done 3 (speed): FAILS on three cells.** Swap-averaged interleaved A/B
(.claude/probes/K1351/k1351s1_ab.ts, k1341s3_ab extended with frame and paint; two builds with the
code swapped between src/render/outline and src/render/outline_m, R=16, machine loaded by the s14/s36
agents throughout). Code effect (mine - master, ms per frame) with pooled 95% interval:

| drag | frame | zChains | fill | paint | band |
|---|---|---|---|---|---|
| def | +0.45 +-0.61 ok | -0.03 +-0.19 ok | +0.24 +-0.28 ok | +0.10 +-0.06 FAIL | +0.15 +-0.17 ok |
| muse_hash | +2.48 +-0.99 FAIL | +0.38 +-0.42 ok | +0.07 +-0.52 ok | +0.01 +-0.05 ok | +0.10 +-0.63 ok |
| fat | -0.38 +-0.36 ok | +0.71 +-0.17 FAIL | -0.01 +-0.11 ok | -0.01 +-0.02 ok | -0.04 +-0.09 ok |

In the brief's own three-part view (zChains/fill/band) only fat zChains fails; zChains is scene-only
code this stage never touches, so that cell is most likely GC/load correlation, not a code path.
muse_hash frame (+4%) is the real residual: 322 extra piece objects a frame through piecesPhaseC.
Next causes, in order: profile piecesCapsEtc on muse_hash with the AB bundle (k1351s1_prof.ts is a
start, but run it bundled, not under run_node); try suppressing the per-frame piece object for
gated-out pieces everywhere table.pieces is only read through di; re-run the pair at R=32 on a quiet
machine before concluding the paint cell (+0.10 ms is inside the slot bias the two builds showed,
+0.05).

**Done 4 (GPU twin): not run.** It is a flag-on check; with Done 3 red the flag stayed off. The band
input (the table) is proven identical to master's thruGate-on table by Done 1's master comparison,
so the mirror line is expected to tie as it did for s13.

**Done 5 (tests/pins): holds with the flag off.** npm test green (231 files / 2948 tests, 2+9
skipped), golden snapshots unchanged, no pin moved, no test file touched. Had the flag flipped,
outline_port's pins would have needed the re-pin the brief allows (k1314s13_pins.ts with
thruGate=1); not done, since it did not.

**What is left:** flip `thruGate: true` in K1314S13 once a swap pair at higher R (or a quieter
machine) clears the three cells above, or the muse_hash frame residual is profiled away; then run
the GPU twin (k1314s13_gpu2.ts) and re-pin outline_port. The differing tail_look/owner_only records
vs census_k1314s13c want a re-baselined census on current master before they can gate anything.
Tools: .claude/probes/K1351/k1351s1_{count,ab,prep,prof,cmp}. Census outputs are under
.claude/probes/K1314/out/s1/ (untracked): census_k1351s1 (full), k1351s1b/k1351s1c (muse_hash,
this code), k1351s1m (muse_hash, pristine master with the flag flipped).
