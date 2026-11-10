# K8: rp=sdf draws no crossing gaps (bisect and fix)

Ledger: K8 (G3, SDF ribbons). One Claude Opus agent in its own worktree, on its own branch. Cap 2 h.

## Why

`?rp=sdf` draws the ribbons as SDFs from the shared sample texture (G3-2: K816 70e2fe12, K826
2f6d0ceb, K832 4b02e2dc "SDF crossing gaps"). At 25a52599 it draws no crossing gaps, on the
desktop and on the Pixel alike:
- knot gs 24's weave renders as a flat lattice with stair-stepped edges;
- the dense and max-fabric crossings lose their casing cuts.

Claude's desktop crop: `.claude/probes/rounds/2026-11-09/sdf/desktop/crop4x_knot24_base_sdf.png`
(left without rp=sdf, right with). G3-3 (the SDF default flip), Levi's phone look and the phone's
render-sync numbers all wait on the gaps.

The three links (`scripts/phone_pass/k539_g31.mjs`):
- dense: `?b&gs=24&wd=0.6&brd=0.6`
- max fabric: `?b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5`
- knot gs 24: `?b&gs=24&wd=1&mf=0`

Each one is tested with `&rp=sdf` appended and without it.

## Goal

1. Find the commit where rp=sdf stopped drawing its gaps. First check that 4b02e2dc (K832) drew
   them. If it never did, say so: the work is then to make them draw, not to undo a change.
2. Fix it on your branch, so rp=sdf draws the same crossing gaps as the default path, with the same
   casings, at the same crossings. The technique is yours. If the edges' aliasing has its own cause,
   find it, and fix it if the fix is local.
3. The default path (no rp=sdf) doesn't move.

## Done

1. **The bisect:** the first bad commit and what in it removed the gaps, with one shot of the last
   good and first bad builds of the knot gs 24 link.
2. **Pictures:** the three links, without and with `rp=sdf`, on your branch.
   - Crop each at 4x, the same spot both ways, side by side, under
     `.claude/probes/K8/sdf_gaps/out/`.
   - Every crossing in the crop shows its casing cut with rp=sdf. Claude looks at them.
3. **Same state:** with `rp=sdf`, a same-state pair against the default path on the knot gs 24 link
   (k83's pins, physics frozen by `__knotPhysFreeze` or `phw=0`, a same-build control first: K390)
   shows only sub-pixel casing edges. Attribute any cluster over 2 px.
4. **No regressions:**
   - `gl.getError` is 0, and no context is lost on any of the three links;
   - the default path is unchanged (`test/physics/byte_identity.test.ts` and the paint pins stay
     green with no re-freeze);
   - `npm test` and `npm run build` are green.

## Rules

- PowerShell. Read code through the shell (`Select-String`, ranges of `Get-Content`). Use the Read
  tool only right before an Edit. No helpers.
- Junction `node_modules` from the main checkout (`New-Item -ItemType Junction`). Never run `npm ci`.
- **Builds:** `pwsh scripts/preview.ps1 -Ref <sha> -Root <dir> -BuildOnly` builds any commit into
  its own directory. Serve from ports 5700-5719.
- **Shots:** `node scripts/diag_screenshot.mjs <url> <out.png> [settleMs]`. Use a settle of 20000 ms
  or more: shorter ones can catch the loader. Never use Chrome's `--virtual-time-budget`. A bare URL
  is today's daily, so always use the `?b&...` links above.
- **Your files:** `src/render/` (the SDF path: `fabric_sdf.ts`, `samp_table.ts`, `gap_mask.ts`,
  `ribbon/`, the paint GLSL) and their tests, plus probes in `.claude/probes/K8/sdf_gaps/`. Two other
  agents work only in `.claude/probes/K1240/proto/`. Don't touch `.claude/probes/K1240/`.
- **Commits:** WIP on your branch at each milestone. Use `git add -f` for probe tools, never for
  outputs. Never push, never edit `LEDGER.md`, and never touch the main checkout.
- **Perf lock:** a headed GPU Chrome disturbs the other agents' timings, so take the lock for every
  batch of shots (`$env:TEMP\claude-perf.lock`, one line: owner, start time, what).
  - Keep each hold under 10 minutes, and delete the lock between batches.
  - While someone else holds it, wait inside one blocking command.
  - A lock older than 30 min is stale.
- **Stopping:** stop when Done holds or 2 h after your start (`Get-Date` at the start and at each
  milestone). Then commit WIP, append a handoff to this brief, and report. A compaction is not a
  stop: re-read this brief and `git log`.

## Report

Short and plain:
- the first bad commit and the cause;
- the fix;
- the crops' paths;
- the same-state pair;
- the checks;
- what's left (the aliasing, if it's separate);
- your last SHA.

End with `Ledger items` and K8's handle fields (owner, branch, last commit, evidence, next).

## Handoff 1 (2026-11-10, K8 agent of claude session 09c7a672; branch worktree-agent-a452c354b4fd872ce)

**Bisect: no first bad commit. rp=sdf never drew the gaps.** 4b02e2dc (K832) and a145be26 shoot
the same flat lattice with rp=sdf on knot gs 24 (`.claude/probes/K8/sdf_gaps/out/bisect/`,
`crop_endpoints.png`). Three causes, each fixed in its own commit:
1. **c67a75ff, the turn.** gapKeepAt multiplies its turn by the slot's arcScale (closed: total;
   open: total / 0.45). Since K832 the SDF fragment passed the absolute arc, so every fragment fell
   outside every window and no casing was cut. It now passes the strip's turn (`gTurn`, at
   segK + t1). The explore anchor follows the call.
2. **42900cac, the window scan.** The SDF vertex scanned only a chain's first 16 RANGES entries, so
   most of a long knot strand had no gap ids. Each window entry now carries a reach (the running
   max of kHi, in flags / RANGE_REACH 64). The vertex binary-searches kLo and walks back until the
   reach falls short, which is exact at any window count. The strip path reads only junction
   entries, and its shader text is unchanged.
3. **d70fdf0d, the aliasing (its own cause, local).** Segment boxes overlap by R, so up to three
   quads drew a pixel and their partial alpha compounded, 1 - (1 - a)^n. That gave the hard, narrow
   casing fade and rims stepped per segment. A quad now owns the slab between its two joints'
   bisectors, a hair (oe) past each, and a fold tighter than the box falls back to the nearest cone.
   `fwidth` was hoisted to the top of main. 6a67b330 adds the CPU mirror census (gentle and folded
   curves), pinned in `test/render/sdf_gap_bind.test.ts`.

**Pictures** (`.claude/probes/K8/sdf_gaps/out/crops/`, default left, rp=sdf right, 4x):
- `knot24_center_4x.png`, `knot24_border_4x.png`, `dense_center_4x.png`: same state.
- `maxfab_weave_4x.png`, `maxfab_crumple_4x.png`: not same state (see below).

Every crossing in them shows its casing cut on both paths. In max fabric's crumpled top half,
threads lie on each other with no dark line on both paths. That is mid-settle overlap, not the pass.

**Same state** (`ss/ss_ab.mjs`, build 6a67b330, `&am=instant&snd=none&fw=0&phw=0`, slept, frozen,
k83 pins; A, A2 control, B = rp=sdf):

| Link | Control | State hash | Pair (differing px) | Max delta | Visible px | Visible clusters over 2 px across |
|---|---|---|---|---|---|---|
| knot gs 24 | 0 px | f9dceb21 on all three | 91010, all on edges (0 in flat areas) | 72 | 8778 (6469 clusters: 6428 1 px across, 41 2 px) | 0 |
| dense | 0 px | f4268b15 | 111832 | 104 | 10839 (7855 clusters) | 0 |

The visible clusters are the over ribbon's anti-aliased edge where it meets a casing, as thin
lines: analytic SDF coverage against the strip's MSAA (the largest is a 13 px diagonal line 1 px
across). Max fabric never sleeps (`restMs` -1 after the 30 s `MAXREST` cap), so its three pages
froze in different states. Its pair is pictures only.

**Checks.**
- gl.getError 0, isContextLost false and 0 webglcontextlost events on all three links, with and
  without rp=sdf (the pass is `kK` = SdfPass with rp=sdf, `gK` = StripPass without).
- The default path does not move: a145be26 against 6a67b330, no rp, 0 px on knot gs 24 and on
  dense, with equal hashes (`out/same/xb_*`).
- `npm test` passes (220 files, 2893 tests). `npm run build` passes.
- byte_identity and the paint pins are green with no re-freeze. paint_ring_lap gained one
  reviewed-site entry for `floor(e.w / 64.0)`.

**Left.**
- A same-state max fabric pair needs a sleeping state, or a fixed sim time stepped from one
  capture (`captureScene` / `restoreScene`).
- The 1-2 px edge differences remain (SDF coverage against MSAA).
- A fold tighter than the ribbon's half-width can still double-draw a hair. The mirror test checks
  only for holes there.
- The phone's look and render-sync numbers with rp=sdf are not measured.

Probe tools, committed: `serve.mjs`, `shots.ps1`, `crop.mjs`, `locked.ps1`, `ss/ss_ab.mjs`,
`ss/attr.mjs`, `ss/png.mjs`.