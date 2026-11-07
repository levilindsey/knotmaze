# K1220 S5: the i's fork fans paint the ribbon beneath them

Ledger: K1220. One Muse fix run, which Claude starts through Paseo from this committed brief. It
works in its own worktree and pushes to master when Done holds. Cap 2 h. Ports 5980-5989.

## Goal

Levi (window 84): junctions must "appear as though they are one whole fused seamless unit". At the
i's forks the fans still repaint the ribbons beneath them in another tone (S4's brief lists the
spots: pale or bluish teeth at xh 3; at xh 2 a pale diamond, a bluish block, pale triangles), and
ii at xh 2 keeps a small round bump above a dark bite. S4 (291780c5 and 331f425d, both on master;
its Handoff and two addenda end `docs/design/K1220_s4_i_paint.md`) gave the root arm's strip
K620's paint per side and each arm record a width profile, made the top ribbon paint alone where
two bracketing footprints overlap, and pulled the wide wedges' rims in. The teeth still read as
teeth. The field picks a pixel's arm by its angle sector from J, so the fans paint the wrong
ribbon in the bite at the stem's west edge (three ribbons within a half-width) and along ribbon
edges. Against its master, S4's counts fell at six forks and rose at four (ia xh 2, ii xh 3 ji1,
ii xh 2 ji0 and ji1). At ia xh 2 a dark tooth now shows at the left end of the crossing gap's arc
(Claude viewed `ia_xh2_ji0_A.png`, bottom row). The arc itself is K1238's.

Make every fan at an i fork paint the ribbon beneath it. Take out the bump and the tooth, and keep
S3's fused outline. The way is yours. S4's leads: pick a pixel's arm by its distance to the arms'
centrelines (the profiles' swept points, or the SDF tables the fan shader already binds), scoped
to tapered glyph forks; or clip the fans to the ribbons' footprints.

## Read first

- S4's Handoff and both addenda, and its brief above them; K620 (`.claude/rules/render-paint.md`,
  line 367); `render-shaders.md` (K307: shader text size); THE PARTS in `render-ribbon.md`;
  `probes.md`.
- `src/render/ribbon/joinery.ts` (the `K1220 S3` and `S4` comments), `arm_strip.ts`, the fan
  shader in `junction_field.ts`.

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1220-s5`. Claude made
  it, detached at this brief's commit, with `node_modules` junctioned. Never run `npm ci`.
- S4's tools are tracked in `.claude/probes/K1220/s4/` (`paintmask.mjs` with its ink-gated mask,
  `geom.mjs`, `shoot.mjs`, `sheets_i.ps1`, `diff_all.ps1`, `locked.ps1`, the vite configs). Copy
  them to `.claude/probes/K1220/s5/`. In the copies the served-code mark is "K1220 S5" and the lock
  owner `K1220-S5`. Three servers: the baseline on 5980 (a `git archive` export of 65c2f573, the
  commit before S4, in `.claude/probes/K1220/s5/base`); master as of this brief's commit, which is
  S4's state, on 5982 (an export in `.../s5/s4`); yours on 5981. Junction `node_modules` into
  both exports. Serve only through the copied configs: a plain vite rewrites the shared
  `node_modules\.vite`.
- Every browser job runs under the perf lock through your `locked.ps1`: real time, headed, `phw=0`,
  `fw=0`, at most two browsers. Another Muse run (K1040 S3g) takes the lock too: wait inside one
  blocking command.

## Done

1. Paint: check the 10 i forks (i, ai ji2, ia ji0, ii ji0 and ji1, at xh 3 and xh 2), at rest,
   in its pluck, and in flow 2.5 and 4.1. Wherever a fan covers a ribbon whose paint it
   continues, yours differs from the `nofans` frame by at most 4 levels per channel
   (`paintmask.mjs`; a pixel `nofans` leaves as background is fill, not covered). Give a table per
   fork and state, with three counts: the baseline's, S4's and yours. Yours is 0, or each spot is
   cropped and named.
2. Outline: no ink more than 1 px outside the closing of the `nofans` ink by a disc of 1 fh (no
   bump), and no background where the baseline has ink, except its bump pixels. The second clause
   catches the tooth.
3. Whole-frame diffs at rest against the baseline: every changed pixel lies within 5 fh of an i
   fork. The a and aa stands and the three maze stands change 0 px, or you name each spot (S4 left
   17 px at an aa xh 3 fork).
4. Sheets, the baseline over yours at zoom 4, with `sheets_i.ps1` (A: rest, nofans, pluck, the
   flow pair; B: the reveal at 20/40/60/80%), in `.claude/probes/K1220/s5/out/sheets/`. Name the
   two to show first.
5. Make `npm test` green after `git fetch -q origin` and `git rebase origin/master`. Then run
   `git push origin HEAD:master` and watch that commit's deploy (`gh run list -R
   levilindsey/knotmaze -L 3`) until it is green. If the push is rejected: fetch, rebase, test,
   push again. Never force, never skip hooks. If Done 1-3 don't all hold by the cap, you may push
   a partial change only if, at every fork, Done 1's count is below both the baseline's and S4's,
   no Done 2 count rises over either, and Done 3 passes. Otherwise push nothing, and keep the
   patch in `.claude/probes/K1220/s5/`.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs,
  the exports). The copied tools may go in with the fix's commit.
- Don't touch: the main checkout (Claude commits there) or any other worktree; `src/render/field/`
  and `src/app/frame_loop.ts` (other runs); port 5173, ports 5820-5829 and 5940-5969; the phone.
  Don't edit LEDGER.md.
- Out of scope (name it if you see it, don't fix it): the crossing gap's dark arc and triangle on
  ia xh 2's stem (K1238); the reveal's looks (K1232); the dark V at ai's J (K1233); the stepped
  colour edge near the i's root (K1234); the a's 12° bend; the 1 px jog in ia at xh 2.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone),
  whichever comes first. Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the last push: what you built, Done's tables, the sheets to show
first, anything out of scope you saw, your last SHA. Commit messages carry the record.
