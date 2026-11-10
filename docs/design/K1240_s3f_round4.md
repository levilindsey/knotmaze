# K1240 S3f round 4: the junction corners form B draws and the outline doesn't

Ledger: K1240. One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

K1240 is the redesign: one outline for both looks (`.claude/probes/K1240/proto/outline.ts`). Levi,
2026-11-09: keep it. Junction work is the top priority (Levi, 2026-11-04).

`docs/design/K1240_s3f_fixed_pieces.md` holds S3f's three handoffs. "The coordinator's decisions after
Handoff 3" lists round 4's places, in order. K1247's speed stages ran first (stages 4-7). They
rewrote the corners: each corner now grows in closed form along the medial path. K1257 then gave
form B (`src/render/field/`) the same growth, so form B and the outline agree at every grown corner
(`k1257_sliver.ts`: 0 corners over 0.5 px). The places below are the ones that growth doesn't cover.

## Goal

At each place, the outline draws what form B draws, with local, continuous geometry in frame().
Levi's rule still binds: the structure is decided once (which pieces exist, which corner joins
which arms, sharp or round), and only positions follow the frame. No piece that comes and goes,
and no decision made from positions. The technique is yours.

1. **def B's T junctions j3, j1 and j151.** An open chain's end arm meets a through chain. One
   corner of the end arm is sharp (r = 0, V = ta = tb at the meet), and form B fills that crotch.
   Its worst pixels are there (10.2, 9.2 and 8.7 px at Handoff 3).
2. **g41_ring_tw42 j12's reflex corner.** a37-a38 sweeps 3.192 rad, so it takes the reflex
   fallback, and the ink pokes 3.45 px out at its ta. A reflex corner wants a convex round join: an
   arc of radius h about the junction's centre. Where a corner's sweep passes π, the round join and
   the fillet must meet continuously, with no jump.
3. **The stub corners not yet checked:** ring j4, j5, j7 and j16, and user_tw42.lightpaper j29 and
   j61.
4. **muse_default_tw at 0.1h.**

First re-measure: each place may have moved with stages 4-7.

## Done

The baseline is S3d's code through the same harness (`s3f_exact_s3dbase.ts`; its header
recreates `outline_s3d.ts`). Re-make it against today's form B first, because K1257 changed form
B's corners. Tolerances are `cmp_s3f.mjs`'s: p99 within 0.01, and over2 within max(1, 2%).

1. `s3f_claude_checks.ps1`: the still rows, and the moved rows at 0.1h and 0.5h (consistent S'),
   are within tolerance of the baseline. For each row left over: its place, its cause, and a crop.
   K1258 (the row measure takes a neighbouring arm's term on the paper side of a corner arc) can
   inflate a row; say when it does.
2. Crops of each place before and after, with the outline over form B's fill (`k1247s5_pics.ts`, or
   Handoff 3's crop tool). Claude looks at them.
3. K1247's checks hold, except at corners you changed on purpose (list them):
   - `k1247c_final.ps1 -Base ../../../../muse-k1240-s1/.claude/probes/K1240/out/k1247/base`: every
     step exits 0, verify no worse than 48;
   - `k1247c_coldwarm.ts`: cold = warm within 1e-6 h;
   - `k1247s5_cmp.ts`: no worse than 48/9/0/0;
   - `k1247s5_outside.ts`: run interiors 0 h;
   - `k1257_sliver.ts`: no new corner over 0.5 px.
4. def's frame is no slower. Use a locked pair, master against yours (`_s7_pair.mjs` through
   `run_locked_k1247s4.ps1`), and name the phase any change lands in.
5. `npm test` green.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- Your files: `outline.ts` and the check tools in `.claude/probes/K1240/proto/`. No `src/` changes:
  form B is the reference. Another agent (K1247 stage 8) works in new `k1247s8_*` files there and
  doesn't edit `outline.ts`.
- Commit WIP on your branch at each milestone, with `git add -f` for tools, never for outputs.
  Never push, never edit `LEDGER.md`, and never touch the main checkout.
- Perf lock: `$env:TEMP\claude-perf.lock`, one line (owner, start time, what). Take it only to time
  something, and delete it when you're done. While someone else holds it, wait inside one blocking
  command. A lock older than 30 min is stale.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone). Then
  commit WIP, append a handoff to this brief, and report. A compaction is not a stop: re-read this
  brief and `git log`.

## Report

Short and plain:
- each place: what was wrong, what you changed, and its rows before and after;
- the crops' paths;
- K1247's checks, and def's timing pair;
- what's left;
- your last SHA.

End with `Ledger items` and K1240's handle fields (owner, branch, last commit, evidence, next).
