# K1627 stage 2: the junction corner's leftovers (colour wedges, the last specks)

Read first: `K1627_s1_brief.md` with its `## Handoff (stage 1)` (on master; stage 1 is landed) and its tools
under `.claude/probes/K1627/`. Stage 1's outputs: `...\worktrees\k1627-s1\.claude\probes\K1627\look\`
(`K1627_s1_sheet.png`, `k1_L_rows.png`, `k1_L_remain.png`), read only. Base: `origin/master`.

## Goal (Levi: "a generally recurring issue we must solve", "pretty important")

A junction's rounded corner reads as one whole piece of thread, on
`?3.FCBQ1H6L4-6NPbeg8HHN09w&rp=gf&gfh=1` and everywhere. Stage 1 stopped the corner's own thread from cutting
it (11 notches filled). Left, on his link frozen at hash 231ba8fa:

1. Colour wedges: each half of a rounded corner takes one flat colour from its nearer thread, so the line
   between the halves is a hard colour edge (a triangle of the wrong colour in the corner). Places (2308,522),
   (2276,842), and where stage 1 filled a notch: (2329,584) his place, (1229,1148), (1815,1150), (1895,1167).
   The cause above is inferred: confirm it by a change before building.
2. Seven specks of 1 to 6 px of paper at corner points: (1377,746), (1199,1250), (1046,494), (1400,523),
   (1644,829), (981,1357), (1547,904), and the 4 px tip at (1141,1638). Stage 1's guess: the corner's other
   thread cuts them, or the cut sits beyond the skipped stretch.

## This stage

Fix both in `src/render/gpu_field/` (source, mirror where one exists, tests); you own the technique. The
corner's colour should run smoothly from one thread's colour to the other's with no visible edge, in every
colour scheme, and equal the threads' colours where the corner meets them. The three real crossing gaps at
(2234,936), (2329,358), (2346,380) stay. Keep out of the reveal path (the fx table, `lkRainbow`, the reveal
alpha) unless the corner colour cannot be right during a reveal without it: then say so first in the handoff.

Binding: never remove a thread's border; the under pass keeps its width and heading; stage 4's angled cut
ends stay; tight turns keep today's ball (K1572); closed sides do not rise. Every changed pixel on the 21
test mazes (A_3..A_d, D_1..D_a) and his link is at a junction corner and is this kind of thing going right:
count them, list the places, view them. Strays elsewhere are a fail: say so. Shader cost: no new texture
reads per pixel outside corner pixels.

## Done

1. Causes confirmed by switch-off or change; counts of wedges and specks, master against yours.
2. Src, tests, `npm test` green, `npm run build` passes, pins named.
3. For Levi: one sheet `master | yours` at 14x of the six wedge places and the eight speck places, plus his
   place at 6x for context, same frozen state both sides, real-time captures, viewed by you; the list of
   every other changed place.
4. `screen.py` counts, master against yours.

## How to work

`Get-Date` first. PowerShell. New worktree `...\worktrees\k1627-s2`, branch `k1627-s2`, from `origin/master`;
`node_modules` as a directory junction to the main checkout's (never `npm install`). Write only inside your
worktree. Read code through the shell; the Read tool only just before an Edit, and for images. Real-time
captures only, under the perf lock (`scripts/perf_lock.ps1`; another agent shares it: wait inside one
blocking command), ports 5660 to 5664. Commit WIP at every milestone (`git add -f` for probe tools, never
their outputs). Never push, never bare `git stash`, never edit LEDGER.md, never touch the phone, no Chrome
`--virtual-time-budget`. Helpers on sonnet, mechanical work only; looks are yours.

## Stop rule

Stop when every Done holds or after 2 h of wall clock, whichever first. A compaction is not a stop: re-read
this brief and `git log`. This is the second stage: if a part cannot be fixed without damage elsewhere, land
nothing of that part and say so with pictures. On stopping: commit WIP, append `## Handoff (stage 2)` here,
commit, and report: verdict first, sheet paths, counts, a `Ledger items` list and the handle fields.

## Handoff (stage 2)

Agent run 2026-11-26 00:07-02:07, branch `k1627-s2` (worktree `.claude/worktrees/k1627-s2`).
Evidence: `.claude/probes/K1627/` (out/ untracked).

**Wedges: fixed, on the branch** (`lkCornerMix` in `src/render/gpu_field/gf_look.ts`, commit 652cb99f6). A
corner-labelled pixel now blends its two arms' colours (gold mixed in), each read at the pixel's projection onto
that arm, weighted by its distances to the two outline lines: arm A's colour alone on A's outline, B's alone on
B's, the mean on the bisector. Only pixels whose winning label is a corner (`lkKib >= 0`) read anything new. Out of
the reveal path (fx, `lkRainbow`, reveal alpha untouched).
- Cause: `p_labviz.json` on master paints each label flat: every wedge edge is the boundary between the corner's
  two flat halves (nearer-arm split on the bisector). The fix itself is the confirming change: all six named wedges
  and Levi's place are gone on L (sheet `out/sheet_s2_1..2.png`, `out/sheet_s2_levi6x_1.png`). `p_cblend.json`
  (the blend patched onto master) did not compile (its insertion point was wrong) - no result from it.
- L, master -> mine: 208 changed places at > 6 levels (20,705 px); the 12 largest viewed
  (`out/sheet_s2_otherL_1.png`), each a junction corner whose flat halves became one smooth run. The three crossing
  gaps (2234,936), (2329,358), (2346,380) are unchanged.
- The other mazes: all 21 captured (out/s2b): 59-208 places each, every step 1-2 levels (single-colour ink: the
  same colour blended with itself); the six largest viewed (`out/amp_s2b.png`), all on corner fillets.
  screen.py (`an.ps1`, out/an_s2b): identical master | mine on all 21 (closed 104, part 245, bare 492, none 24,
  gap 28935; loose pieces 44/10/38/1787 both).
- Residual seen: at (1815,1150) a faint vertical tone step remains where the corner meets the arm piece; under
  6 levels, not on any named place.

**Specks: NOT fixed - dropped (second-stage rule).** Cause confirmed by change: the corner pixel nearer arm A has
key zA - zt, and where arm B rides above A by more than zt, `lkGap` lets B's pieces cut it inside B's outline
margin at the corner's point. Skipping the corner's other arm within sx of its tangent arc (`p_noother.json`,
commit 1be278ced) removed all seven specks and the tip at (1149,1643), but it also closed part of the three real
crossing gaps the brief keeps ((2234,936) most, (2329,358), (2346,380)): those are other-arm cuts at the corner's
own point too, so a distance-to-the-point window will not separate them. Reverted in 06ffde7cc. Pictures:
`out/sheet_s2_speckskip_1..2.png` (master | master + skip | change). Next: separate a real over-pass of the other
arm (its piece crosses this arm's thread) from its outline margin at the point, or take the corner's key from
max(zA, zB) only at the point - back to Levi first (two-stage rule).

Tests: `test/render/gf_corner_mix.test.ts` (new: every program's sites, the one call at the output, the weight
line; `cornerMixW`/`cornerArmS` twins), lookForm must-haves for the two new lines. `npm test` green (252 files),
`npm run build` passes, on 06ffde7cc.
