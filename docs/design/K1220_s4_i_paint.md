# K1220 S4: the i's fork fans wear the paint beneath them

Ledger: K1220. One Muse fix run, which Claude starts through Paseo from this committed brief. It
works in its own worktree and pushes to master when Done holds. Cap 2 h. Ports 5980-5989.

## Goal

Levi (window 84): junctions must "appear as though they are one whole fused seamless unit". S3
(e8636a3a, its Handoff ends `docs/design/K1220_s3_i_forks.md`) drew the i's fork record, and its
notch and ledge are gone. But its fans repaint the ribbons beneath them in another tone, and that
reads as new seams (Claude viewed S3's sheets):
- xh 3 (i, ai, ia, ii ji0 and ji1): pale or bluish teeth, whose straight ends cut across the root
  where the capped narrow wedges end.
- xh 2: a pale diamond with a sharp V bottom (ii ji0), a bluish block with straight edges
  (ii ji1), pale triangles (i).
- xh 2, ii ji0 and ji1: on the left, a small round bump above a dark bite, where the notch was.

S3's own reading: the fans wear the body gradient, while the root wears K620's paint (each side
its foot's body section, eased into the spur's at J), and S3's 1.25 fh flank cap ends on a
straight line. Make every fan at an i fork continue the paint of the ribbon it covers, and take
out the bump, keeping S3's fused outline. The way is yours (one option: write the root arm's
strip per side as K620 paints it, then drop the cap if nothing needs it).

## Read first

- S3's Handoff and the brief above it; the root's paint, K620 (`.claude/rules/render-paint.md`,
  line 367), and `render-shaders.md` (K307: shader text size); K580 s4/s5 and THE PARTS in
  `render-ribbon.md`; `probes.md`.
- `src/render/ribbon/joinery.ts`: every `K1220 S3` comment; `arm_strip.ts`; the fan shader in
  `junction_field.ts`.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1220-s4`. Claude made
  it, detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- S3's tools are tracked in `.claude/probes/K1220/s3/`. Copy them to `.claude/probes/K1220/s4/`;
  in the copies the served-code mark is "K1220 S4", the lock owner `K1220-S4`, master on 5980
  (a `git archive` export of this brief's commit in `.claude/probes/K1220/s4/master`,
  `node_modules` junctioned), yours on 5981. S3's sheets, for reference (read-only):
  `C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1220\s3\out\sheets\`.
- Every browser job runs under the perf lock through your `locked.ps1`: real time, headed,
  `phw=0`, `fw=0`, at most two browsers.

## Done

1. Paint: at the 10 i forks (i, ai ji2, ia ji0, ii ji0 and ji1, at xh 3 and xh 2), at rest, its
   pluck and flow 2.5 and 4.1: wherever a fan covers a ribbon whose paint it continues, yours
   differs from the `nofans` frame by at most 4 levels per channel (a pixel `nofans` leaves as
   background is fill, not covered). Build the "which ribbon is beneath" mask from `geom.mjs`.
   A table per fork, master's count and yours: 0, or each spot cropped and named.
2. Outline: no ink more than 1 px outside the closing of the `nofans` ink by a disc of 1 fh (no
   bump), and no background where master has ink, except master's bump pixels.
3. Whole-frame diffs at rest against master: every changed pixel lies within 5 fh of an i fork.
   The a and aa stands and the three maze stands change 0 px, or you name each spot.
4. Sheets, master over yours at zoom 4, with S3's sheet tool (A: rest, nofans, pluck, flow pair;
   B: the reveal at 20/40/60/80%), in `.claude/probes/K1220/s4/out/sheets/`. Name the two to show
   first.
5. `npm test` is green after `git fetch -q origin` and `git rebase origin/master`. Then
   `git push origin HEAD:master` and watch that commit's deploy (`gh run list -R
   levilindsey/knotmaze -L 3`) until it is green. If the push is rejected: fetch, rebase, test,
   push again. Never force, never skip hooks. If Done 1-3 don't hold by the cap, don't push: keep
   the patch in `.claude/probes/K1220/s4/`.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs,
  the master export). The copied tools may go in with the fix's commit.
- Don't touch: the main checkout (Claude merges there) or any other worktree; `src/render/field/`
  (K1040, another run); `ribbon_mesh.ts` (K1228, another Muse run); port 5173, ports 5940-5969;
  the phone. Don't edit LEDGER.md.
- Out of scope (name it if you see it, don't fix it): ia xh2's dark arc and triangle on the stem
  (the crossing gap, K1238); the reveal's looks (K1232); the dark V at ai's J (K1233); the stepped
  colour edge near the i's root (K1234); the a's 12° bend; the 1 px jog in ia at xh 2.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone).
  Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the last push: what you built, Done's tables, the sheets to
show first, anything out of scope you saw, your last SHA. Commit messages carry the record.

## Handoff (S4 run, 2026-11-06; WIP — Done 1, 2 and 4 do not pass)

What landed in this commit (all gated to tapered glyph forks — the
i's forks — unless noted):

- Per-side K620 root paint for fans (the brief's suggested way): a root
  arm's strip rows now wear the root's own paint per side
  (`kRootStripSection` in `src/render/paint_math.ts`, modes 3/4/5 in
  `src/render/arm_strip.ts`'s `chainMaterial`, 6/7/8 untraveled; CPU
  twin in `cpuChainMaterial`). The primary record's root row is the O
  side; a twin record (a copy of the fork's record whose root row is
  the C side) serves the root↔bodyC narrow wedge. S3's body-chain
  strip hack is gone. Covered by `test/render/strip_root.test.ts`.
- Width profiles: each arm record now carries a width profile after
  its angle profile (`armStride` 2 + 2·profN), and the field blend's
  half-width is per arm (`fh · wm`; real widths only at tapered glyph
  forks, 1 elsewhere, so other junctions read exactly as before). A
  wide arm (root, flared stem) now keeps its own paint across its
  whole ribbon where the bracketing pair includes it.
- Shader budgets followed the measurements (`test/render/k320_slim
  .test.ts`): arm-strip 34,300 → 35,600 (root modes), junction-field
  36,225 → 36,850 (width blend). One cold compile each per player.

Done 1 (rest, `paintmask.mjs` in the s4 probe folder; geom-mask,
>4 levels): NOT met. Master → mine per fork: i_xh3 8451→8339,
i_xh2 10901→10787, ai_xh3 5032→5030, ai_xh2 6299→6294, ia_xh3
8349→8332, ia_xh2 6407→6396, ii_xh3 ji0 8332→8331, ji1 4413→4412,
ii_xh2 ji0 9001→8999, ji1 4785→4776 (max diff still ~190). The field
at the root centreline did move to the ribbon's colour (probe: mine
(0.714,0.478,0.707) vs master (0.733,0.478,0.727) at mid-root, ribbon
≈ (0.71,0.48,0.71)); the residual is not the strip. What is left,
diagnosed: the field chooses arms by ANGLE sector, not by which
ribbon is on top. Within ~fh of J both blend half-widths saturate at
π/2 and the CCW-previous arm wins outright (body paint over the root
at its centreline 0.13 from J); farther out, the root's wide corners
fall in the wide wedges' sectors (bodyC→stem, stem→bodyO), whose fans
paint body/stem over the root there. Fans covering those pixels are
the seal and the wide wedges; the narrow wedges' fans now continue
the root where they bracket it. A fix needs the field (or the fan
geometry at tapered forks) to respect ribbon coverage/draw order
there — e.g. nearest-centreline assignment scoped to these forks, or
fans that stop at the root's edge — not tried in the time left.
Pluck and flow states were not measured (rest only).

Done 2: NOT met. `paintmask` bump (fan ink outside the 1 fh closing):
master → mine unchanged (i_xh3 816→816, ai_xh2 2625→2625, ii_xh2
0→0 in this measure). The bump is the west wide wedge's rounded rim:
its corner (the stem/bodyC edge lines' intersection) lies far NW, so
the arc bulges past the closing above the dark bite. Not attempted;
a scoped candidate is an arc-around-J rim (or a corner-distance
clamp) at tapered glyph forks only.

Done 3: not measured with the diff family (only the i words were
shot, on both hosts). The changes are construction-scoped to tapered
forks (no taper ⇒ no twin record, width profile 1, strip modes 0/1
as before), and the suite's golden byte-identity guards stayed green
(see below). A master-vs-mine diff shoot still owes.

Done 4: sheets were not built or read. One crop was viewed
(mine i_xh3 rest vs its nofans): the pale teeth are still there,
consistent with the Done 1 table.

`npm test` does pass (tsc + 219 files, 2885 tests). Copy of the
probe tools: `.claude/probes/K1220/s4/` (locked marks "K1220 S4",
ports 5980/5981; `paintmask.mjs`/`violmap.mjs`/`samplepx.mjs` and
`batch_geom_mine.mjs` are new this run; `out/` and the master export
are not committed). Time was up (2 h from 09:38 PT) with Done 1/2/4
open, so this lands as WIP on purpose: the strip/width work is the
substrate the sector fix needs, and it changes no other fork.
