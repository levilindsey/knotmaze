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
