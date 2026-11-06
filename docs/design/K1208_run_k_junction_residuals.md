# Muse batch 22, Run K: six junction residuals checked on today's master

Ledger: K1208 (batch 22); the items K744, K734, K424, K15, K218 and K678. Chain tag 22K; ports
5980-5989. One Muse run in the main checkout on master. Probes only: nothing in `src/` or `test/`.

## Why

Levi, 2026-11-05 (K1211): "These junctions need to appear as though they are one whole fused
seamless unit." Six residuals filed between 2026-10-12 and 2026-10-24 each describe a seam, a step,
a blip or a gap inside or beside a junction. Each was found on a build that has changed since (G1
removed the over-fills, K81 added the route fans, K1139 the pulses, Run I the one fan layer).
K1211's next stage needs to know which of them still show on today's master, where, and what draws
them. This run answers that with shots, crops and numbers. It fixes nothing.

## Read first

- Batch 22's How to work (`docs/design/K1208_muse_batch22.md`) and the pages it sends you to.
- `.claude/rules/probes.md`: a bare URL is today's daily, not a fresh design; the links, hooks and
  settle times.
- Each item's ledger text (`node $HOME/Repositories/claude-config/tools/ledger.mjs show <ID> --repo .`)
  and the page it points to (Select-String the heading, read that section):
  - K744: `docs/design/K138_s1.md` Handoff, and K749's phone shots in `.claude/probes/K749/out/rules/`:
    dark patches at nearly every junction under the rule colours.
  - K734: `docs/design/K643.md` Handoff: a hairline seam inside the i fork junction at xh 3.
  - K424: `docs/design/K397.md`, Stage 1 handoff: junctions 87 and 160 on `?2gozcj.MgaM` stay
    hidden while one of their arms turns visible.
  - K15: `docs/ledger_notes.md`, `## K15`: a fan opaque beside a striped fill during a reveal.
  - K218: `docs/design/K93_K145.md`, Stage 1 handoff: trail mode's junction cap holds a flat p,
    then steps at its edge.
  - K678: `RibbonMesh.coverPairs` and the cover loop in `src/render/ribbon/joinery.ts`; Select-String
    K678 in `docs/design/` for its stage page.
- K1211's shot tools, to copy from (never edit them): `.claude/probes/K1211/shoot.mjs`, `lib.mjs`,
  `run_shots.ps1` (shots in real time under the perf lock).

## Tasks

For each item, in the order K744, K734, K424, K15, K218, K678:

1. Build its stand from the item's page on today's master (name master's sha once), with
   `&snd=none` and `&phw=0`.
2. Shoot it in real time (never `--virtual-time-budget`) under the perf lock, at dsf 1.5 or the
   page's own size, at the moment the item names (a reveal, a trail fade, a rule colour). Crop the
   spot at 3x.
3. Decide present or gone by a number wherever one exists: the item's own measure (the cap's step
   in p, a patch's colour distance from the colours around it, a seam's contrast across the
   junction, the frames a junction stays hidden while an arm shows). Otherwise give the crop alone
   and say so.
4. Where it is present, name what draws it: the mesh or layer, found by turning it off through a
   probe hook or `window.__knot*` switch where one exists, or a probe-only build flag (say which).
   If it is cheap, name the commit since which it shows: at most four builds an item, only for
   items that are present.
5. K678 is a code path no A/B scene reaches. Find a stand that reaches it (a cover strip with
   fewer than 9 pairs of room) with a probe that counts it over seeds, or say that none of 50
   seeds does.

Looks stay with Claude: put each crop in the table and say what you measured, never whether it
looks right.

## Record

`.claude/probes/K1208/run_k/`: the scripts and `SUMMARY.md`, one table with a row per item (stand,
master's sha, present or gone, the number, the crop, what draws it). Crops tracked with
`git add -f` (PNG, at most 30, each under 300 KB); larger outputs stay untracked.

## Done and close

Done when every item has a row. Commit message:
`K1208: six junction residuals checked on today's master (Muse batch 22 Run K, 22K)`. Pull with
rebase and autostash, then push to master (probes only, so nothing deploys). Leave the ledger to
Claude.

## Report

Plain words: master's sha; per item present or gone, the number, the crop and what draws it;
anything that stopped you; `Ledger items`.
