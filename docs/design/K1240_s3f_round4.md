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

## Handoff (round 4, 2026-11-10 00:25, Done holds)

Commits on `worktree-agent-a6b99b04c9c8fb2ef`: 723514cf (the consistent S' is the only S';
`s3f_claude_checks.ps1` compares against S3d through the same harness), eab8c6db (place 2),
1a8732b0 (place 1), 11d3c9e8 (place 4), ee121074 (tailF early-out, check tools).

Places:
1. def B's T junctions j3/j1/j151. Form B draws the end chain's border on past the corner, over the
   other arm's tube and round the end, where the other arm is its own (cap ramp < 0.5), the end
   chain's key is higher, and the point is inside the other tube by more than W. The outline
   stopped at the corner. Now every corner with an end arm has a `tail` piece (structural;
   degenerate where form B draws none; extent = the first interval of u where that f > 0, both
   ends bisected; builder and frameFast share `endTailPts`). def B over2 11 -> 0, user_tw42.lightpaper
   B 23 -> 0, A 36 -> 6.
2. g41_ring_tw42 j12, the reflex join. The meet fallback's station at w = 0 was the border point
   at the meet's s, not the meet: on the outer side of a sharp bend many border points share one
   s (0.064 off, the 3.45 px spike). Each station now carries the meet's offset, fading out as
   it runs on (1 - g). still A over2 6 -> 3 (= S3d), max 3.45 -> 2.30 px (the inner bend, also in
   S3d). The same fix moved muse_hash corner 119 (ch43's end against ch23): run 371 now stops at
   the meet instead of running 0.15 units past it and back (k1247s5_outside's only nonzero run
   interior, 5.45e-2 h; on purpose).
3. Stub corners ring j4/j5/j7/j16, user_tw42.lightpaper j29/j61: rows already in tolerance, the
   outline follows form B's tie-faded border (ring j7: fade 4, ink 0.17). No change.
4. muse_default_tw at 0.1h. A passed run (its end features crossed, span <= 0) drew one border
   point at the ends' midpoint, inside the neighbouring tube where form B draws no ink (j129
   2.61 px, j150, j162, j163). It now draws nothing (builder and frameFast). 0.1h A 10 -> 5
   (S3d 4), B 25 -> 15 (S3d 20).

Rows (`out/s3f/checks_r4p4.txt`, S3d -> now, over2): muse_default_tw A still 23 -> 4, 0.1h 4 -> 5;
B 26 -> 18, 20 -> 15. def A 29 -> 10 / 24 -> 10 / 24 -> 7 (still / 0.1h / 0.5h), B 11 -> 0 /
13 -> 0 / 11 -> 0. ring A 49 -> 37 / 45 -> 37 / 40 -> 34, B 4 -> 1 / 4 -> 2 / 3 -> 1.
user_tw42.lightpaper A 36 -> 6 / 34 -> 6, B 23 -> 0 / 19 -> 0. g41_ring_tw42 A 3 -> 3 / 12 -> 3,
B 1 -> 0 / 5 -> 0. Every row in tolerance. Whether K1258 inflates a row was not checked
separately this round.

Crops (`.claude/probes/K1240/out/s3f/`): place 1 `r4before_def/` and `r4after_def/`; place 2
`r4p3_before/g41_ring_tw42_A0.png` and `r4p3/g41_ring_tw42_A0.png` (same window; the outer
join's spur is gone), `r4before_g41/`; place 3 `r4p3_before/` and `r4p3/` (ring,
user_tw42.lightpaper); place 4 `r4p4a/`, `r4p4b/`, `r4p4_muse01/`.

K1247's checks: `k1247c_final.ps1` every step exit 0; verify 48 failures (the bar; it needs
`out/k1247c_base`, which this worktree lacked until it was copied from agent-a3deb5723f8c1b194:
without it verify "passes" with 27 missing tables); cold = warm (worst 0); `k1247s5_cmp` 48/9/0/0,
worst 0.0762 h; `k1247s5_outside` run interiors 0 h except muse_hash corner 119 (place 2);
faces "DIFFERENT SET" at g41_def_tw64 and ring 0 predate this round; `k1257_sliver` 0 corners
over 0.5 px. Corners changed on purpose: g41_ring_tw42 j12 and muse_hash corner 119 (place 2),
the tail pieces (place 1), passed runs drawing nothing (place 4). `npm test` green.

K1247 s8's jitter tool (`k1247s8_jitter.ts --d=0.001,0.01 --list=3`, from 8d72dc37, untracked
here), round start -> now: def 8.995 -> 8.995 px at 0.001, 21.835 -> 21.835 at 0.01;
muse_default_tw 8.687 -> 8.687, 24.722 -> 24.722. The round neither causes nor fixes s8's corner
discontinuity. New: def's tail at corner 35 (j15, beside s8's corner 34) jumps 17.3 px at 0.01:
a new positive interval of f opens at the corner and becomes "the first" (`_r4_tailjit.ts`). Any
extent taken from thresholds of a non-monotone f jumps when an interval is born ahead of it;
it belongs to the continuity stage. Pieces over 0.25 px at 0.01: def 19 -> 20, muse 19 -> 20.

Timing (def median, locked, `_s7_pair.mjs`): master 54a6b84d 19.30 / 18.76 ms; round start
18.70 / 19.29; r4p4 21.12 / 20.97; ee121074 20.23 / 20.90. The cost is in piece emission
(`piecesCapsEtc` 1.44 -> 3.2-3.3 ms): the tails' f at 17 grid points, each a foot walk over 8h of
the other arm and a border lookup. Place 2 sits in the corners fallback: `corners` unchanged
(7.2-7.7 ms throughout). Place 4 only removes points.

Left: corner point continuity (s8's corners 34/38/268 and the tails' first-interval rule); the
tails' +1.8 ms (a per-corner bound that rules a tail out before the scan, or fewer grid points
with a conservative test); K1258; muse_default_tw 0.1h's last points over 2 px (j110 x2, also in
the base; j49 run 1.15 beside a fade-16 merge; j94 and j164 arcs ~1.0 at run/arc meets).
