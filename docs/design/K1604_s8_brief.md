# K1604 stage 8: beside a junction, the over thread's band cuts the under border clean through (rp=gf)

Read first: `K1604_s7_brief.md` with its `## Handoff (stage 7)` on branch `k1604-s7` (31e4ea175; your base:
its checker and tools in `.claude/probes/K1604/s7/`, the `gfgo` debug switch in `gf_look.ts`). Stage 7's
pages, read only, look at them first: `...\worktrees\k1604-s7\.claude\probes\K1604\s7\out\pg_rows_1.png`,
`pg_rows_2.png`, `pg_worse_1.png`, `sw_rows_a3.png`, `sw_wm_worse.png` (master | prototype | V5).

## Levi, 2026-11-27, on `pg_rows_1.png`

Asked whether rows 5 (A_3 x37) and 6 (A_3 x195) in the prototype column read right: "Yes". That look (a clean
faded gap, no stub touching or merged into the over thread) is the target. His rule stands: the gap cuts
through the border parallel to the over thread, no partial cuts that leave dangling parts. Row 9's thin sliver
beside the over (A_3 x73) he accepted earlier.

## Known (stage 7, observed)

The cut's shape in `lkGap` already follows the over thread. Two gates in the under thread's frame withhold
it: the under's baked window (`wm`; rows 5, 6, 9, 11) and the slot that names the one over allowed to cut
(row 7's lower meeting). Removing both (`gfgo=1`) halves uncut border (802 px against 1445 on A_3, A_4, A_6)
but fails more crossings overall (164 against 132): loose specks and slivers at curled hooks and arm ends.
Window off alone: A_3 41 fails, 291 px, with loose triangles at A_3 x70, x71 and a hairline curl at x230.
Master's failures sit within 1 world of a junction where the under pass is a junction arm.

## This stage

Build the rule properly, in `src/render/gpu_field/`, default on:

1. Within about 1 world of a junction, the under's window no longer gates the cut. In its place, each
   crossing's cut is limited to the under thread's own pass through that crossing (the stretch of the under
   through it, clipped at the joint), so the band cannot reach a hook, an arm end or a neighbouring pass.
2. Keep the slot's hook protection. Where the slot refuses a cut the rule requires (row 7's lower meeting),
   let the per-crossing limit decide instead.
3. Away from junctions nothing changes.

You own the technique; confirm by a patch on the frozen state before building. Out of scope: the hook at the
top of row 7 and row 12 (converging borders, K1632); rows 11 and 13 (a wedge past the band) as far as they
come, not required.

Binding: never remove a thread's border outside a gap; the under pass keeps its width and heading; tight
turns keep today's ball (K1572); K1627's specks stay gone; keep out of the reveal path; do not use today's
(non-gf) border strokes as the bar; no new per-pixel texture reads away from junction pixels. A place with no
problem on master that gains a gap, a dash, a hairline or a loose piece is a fail: list each one left.

## Done

1. Checker (`chk.py`, 21 mazes A_3..A_d, D_1..D_a): fails under master's 560; uncut px well under 5877;
   loose pieces at most master's 65; slivers at most master's 848. Rows 2, 5, 6, 9, 17 pass or read as the
   prototype's rows 5, 6. Say what is left and why.
2. Changed pixels beyond 1.5 world from any junction: 0 on the 21 mazes and his link
   `?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1`.
3. Frame cost on his link and A_3, master against yours, three rounds under the perf lock: gap pass within
   1 ms of master, frame interval unchanged. If not, stop and show the trade.
4. Src, tests, `npm test` green, `npm run build` passes, pins named.
5. For Levi, pages `master | yours`, medium then close zoom, border look, no overlays, same frozen state, real
   time, under 7000 px tall, viewed by you: his nine rows; the 12 largest changes elsewhere; every place that
   scores worse than master, or the 12 worst of them.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1604-s8`, branch `k1604-s8`, from `origin/master`;
take stage 7's tools with `git checkout k1604-s7 -- .claude/probes/K1604` and read its src diff with
`git diff origin/master k1604-s7 -- src/` (never merge that branch); `node_modules` as a directory junction to
the main checkout's (never `npm install`). Write only inside your worktree. Read code through the shell; the
Read tool only just before an Edit, and for images. Real-time captures only, under the perf lock
(`scripts/perf_lock.ps1`; read a lock before touching it, never delete another owner's), ports 5680 to 5684;
refuse a busy port and check the listener is your build; kill your servers and probe processes before you
stop. Commit WIP at every milestone (`git add -f` for probe tools, never their outputs). Never push, never
bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome `--virtual-time-budget`. Helpers on
sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. If the checker cannot beat master without new loose pieces, land nothing and show
the best trade. On stopping: commit WIP, append `## Handoff (stage 8)` here, commit, and report: verdict first
(safe to land or not), page paths, scores, a `Ledger items` list and the handle fields.
