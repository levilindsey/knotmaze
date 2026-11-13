# K1324 stage 3: the faint seams where an under band meets an over border

Ledgers: K1324 (this), K1337 (c8's seam), K1314 (the census), K1240 (the redesign; the look gate in
`docs/design/K1240_gate.md`). One Claude Opus agent in its own worktree, on its own branch from master. Cap 2 h.
Read first: the s2 handoff at the end of `docs/design/K1324_s2_x22_burial.md` and the s27 handoff at the end of
`docs/design/K1247_s27_c8_gpu_drift.md`.

## Why

Two faint artifacts in rp=outline that form B does not draw, both below the census bar:

- **muse_hash x22's lower join** (31.53, 7.36): at 8x a faint near-black seam where x22's under band meets the
  over border (`.claude/probes/K1324/out/s2/x8_after/spot_001.png`, form B | master before s2 | after; the right
  panel, the soft diagonal at the black band's inner corner). Left over from K1324 s2's `selfBury`.
- **muse_hash c8's under-pass** near its open end (19.41, 14.16): a straight hard edge and a dotted seam line
  across the under-pass shading, where form B shades smoothly (`.claude/probes/K1247/out/s27/after4x/spot_001.png`,
  right panel, x 1215-1240 px). In master before K1247 s27 too.

The end's shape itself (form B's round dot or the square end) is K1315's question and waits on Levi: leave it. If
the hard edge turns out to be that end, say so with a crop and stop on it.

## Goal

Both gone at 8x: the over border runs clean past x22's lower join, and c8's shading has no edge or seam form B
does not have. Fix the cause, never hide it. The technique is yours. Today's look (no `rp=outline`) stays
byte-identical.

## Done

1. **Crops:** form B | master | after at 4x and 8x for both spots, plus every moved census find, in
   `.claude/probes/K1324/out/s3/`. I view them before merging.
2. **Census** (`.claude/probes/K1314/k1314_run.ps1 -Lock`): if `outline_port.test.ts`'s pins move, run master
   first (tag `k1324s3m`; use `census_m1.*` from the main checkout's `.claude/probes/K1314/out/s1/` instead if it
   is there by then), then your branch: no bar kind above master, every moved find named with its crop. Re-pin and
   name the pins in the commit.
3. **The twins:** wherever the GPU path changes (BAND_FS, rec_glsl), `rec_tie.test.ts`, `self_bury.test.ts` and
   the GPU probe (`.claude/probes/K1324/k1324_s2_gpu.ts`) still tie it to the CPU path.
4. **Speed:** no worker part slower than the run-to-run spread (Node is enough unless you change per-frame work;
   then an ABBA under the perf lock, `.claude/probes/K1247/k1247s28_bench.ps1`).
5. `npm test` green, golden snapshots unchanged. Copy `.claude/probes/K868/scenes/g41_ring_tw42.json`,
   `muse_hash.json` and `g41_user_tw64.json` from the main checkout first. They are untracked, so without them
   tests skip.

A failing check is work to do, not a reason to stop. If a fault resists, keep working it until the cap.

## Rules

- PowerShell. Read code through the shell (Select-String, then 40-80 line ranges of Get-Content); never print
  a whole file. Keep each tool output under about 40 lines (write long results to a file and read only the
  lines you need). Use the Read tool only right before an Edit, and to view crops. Junction `node_modules`
  from the main checkout; never `npm ci`.
- **Untracked inputs** (censuses, crops, scenes) are in the main checkout's `.claude/probes/`. Copy what you
  need into your worktree and never write there (the census's shared form B cache writes itself).
- **Your files:** `draw.ts`, `outline_app.ts`, `fill_tri.ts`, `rec_glsl.ts`, `chain_frame.ts`, `paint.ts`,
  `outline_model.ts` (all in `src/render/outline/`), tests, and your tools and outputs under
  `.claude/probes/K1324/`. **K1247 s30** owns `outline.ts` and the band files (`band_gpu.ts`, `band_place.ts`,
  `band_rec.ts`); **K1325 s2** owns the census tools. If the fix needs one of theirs, report the cause and the
  change rather than making it.
- **Commits:** WIP on your branch at each milestone, broken or not. `git add -f` for tools, never for
  outputs. Never push, never edit `LEDGER.md`, never touch the main checkout, never kill a process you did not
  start. Never touch the phone.
- **Perf lock:** `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Run the census with `-Lock`
  and hold no lock of your own around it. While someone else holds it, wait inside one blocking command; a lock
  older than 30 min is stale. Agents share the lock, so expect waits.
- **Stop** when Done holds or 2 h after your start, whichever comes first (`Get-Date` at the start and at
  each milestone). Before stopping for the cap, run `Get-Date` and check that 2 h have really passed. Leave
  the last 25 minutes for the checks. Then commit WIP, append a handoff to this brief with your start and stop
  times, and report. Neither a compaction nor context size is a stop; after a compaction, re-read this brief
  and `git log`.

## Report

Under 40 lines:
- each seam: its cause, the fix and where;
- the census counts per kind, master and after, if it ran, and any moved find;
- the crop paths;
- what is left;
- your last SHA.

End with `Ledger items` and K1324's handle fields.

## Handoff (stage 3 agent, 2026-11-12)

Start 09:45:51, stop 10:39:25 (Done holds as far as this stage can take it; the rest is blocked, below).

- **x22's lower join: fixed (draw.ts bandData).** The census band (bandData) took the tie per vertex and
  interpolated it linearly across the partner's border kink (tieAlpha bends at d = h and d = h - W), so the
  join inked .97 where the app's per-pixel tie (BAND_FS) gives 1: a faint seam along the over border. The app
  band was clean; the seam lived in the census and crop raster. bandData now splits a tied triangle's EDGES
  where the ends' ties differ and the midpoint misses the tie by more than REFINE_TOL 0.01, down to
  REFINE_MIN 0.0015 (conforming: a test of the edge alone, so neighbours split a shared edge alike). A first
  per-triangle depth cap left a staircase at g41_user_tw64 j68; the per-edge rule removed it. x22: max
  |app - census| 0.077 -> 0.014 (k1324_s3_app). bandData is census/test-only (no app or worker caller), so no
  worker part is slower; census bandData time muse_hash 4.0 -> 7.4 s, fat 16 -> 28.7 s.
- **c8's hard edge: K1315's end, stopped on it.** The edge is tail p1781's first spoke (chain 8, s 8.185, the
  under-tail's open end): alpha 0 at the corner -> .225 inside, beside run p121 tied at ~.02. Crops
  out/s3/x4x, x8x spot_003.
- **c8's dotted seam: cause found, not mine to fix.** The tail p1781's corner fan folds: its outer cluster
  points jitter by 0.0003-0.0035 against the inner arc's sweep, so slivers overlap and ink twice. It is in
  the APP band too (k1324_s3_appfold UNTIED=1: 76 px at 960 ppu; untied chain-8 triangles 115985-115989,
  outer points (19.4082, 14.1646), (19.4080, 14.1652), (19.4077, 14.1657)). Cause: outline.ts's tail corner
  cluster, plus the shared untied inner rule (inner = pt + W unit(cpt - pt): band_gpu.ts inner(), band_rec.ts
  innerOfP, draw.ts bandData). Change for K1247 s30's files: make the corner cluster one exact point, or skip
  or clamp a quad whose outer step runs against the inner sweep, in all three builders together.
- **Census k1324s3b** (b530a1cb) vs census_k1325s2: bar kinds equal (stray_ink 4, hard_edge 1, paper 0,
  broken_ink 12, k1049 0; each find's px unchanged); tail_look 185 -> 187, owner_only 1241. 22 moved and 2
  new diagnostic finds (tail_look/faded, owner_only wedges); crops out/s3/moved4x, moved8x (7 largest).
  App-vs-census pixels over .01 fell at all four checked: g41_ring_tw64 14622 -> 12267, g41_user_tw64
  13428 -> 12004, muse_hash (4.96, 32.26) 15421 -> 570, (17.93, 29.03) 14434 -> 6057.
- **Pins:** outline_port band f0, f1 on ring and g41_ring_tw42 (24ba08cc). npm test green, goldens unchanged.
- **Left:** the dotted seam (K1247 s30's files); the hard edge (K1315, Levi); a residual own-alpha mismatch
  between bandData and bandGpu at g41_user_tw64 (5.19, 17.60) (census .888 vs app 1.0, max 0.546 on master
  and branch alike; the branch narrowed master's wedge to a needle, out/s3/moved8x spot_003); x22's faint
  trace (16 px under .99 at 960 ppu).