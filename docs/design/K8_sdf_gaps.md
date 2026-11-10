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
