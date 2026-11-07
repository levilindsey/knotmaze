# K1220 S3: the i's root forks read as one piece

Ledger: K1220. One Muse fix run, which Claude starts through Paseo from this committed brief. It
works in its own worktree and pushes to master. Cap 2 h. Ports 5980-5989.

## Goal

Levi (window 84): junctions must "appear as though they are one whole fused seamless unit". S2
(2f6353b1) made every text fork write a junction-field record, and the a's attachments now read
as one piece. The i's fork still shows a notch on its left edge and a ledge on its right. That is
10 of the 30 text forks: the i's fork in i, ai, ia and ii, at xh 3 and xh 2. `taperHideJn` hides
their joint (K580: "the root covers the merge, so rebuildFillets draws no web there"), so the
record S2 writes there is never drawn.

Draw the joint at a glyph fork where a tapered root ends, the way S2 draws the a's forks: the
record's seal disc, its wedges with K830's corners, and S2's bridge where the arms step in width.
Do it at glyph forks only (`glyphOf`), so the maze and the other text forks don't change. If the
record is drawn and the sheets still show the notch or the ledge, extend S2's bridge to the root's
width step.

## Read first

- `docs/design/K1220_s2_text_forks.md`, its Handoff (from line 89): what S2 built, its census, its
  tools and the flaws it left.
- `.claude/rules/render-ribbon.md`: the K580 s4 and s5 entries (the tapered root, the cap cover,
  the glyph stadium) and THE PARTS (where things go in `src/render/ribbon/`).
  `render-gaps.md` and `render-shaders.md` also cover `src/render/ribbon/**`: read the parts you
  touch. Read `probes.md` before probing.
- `src/render/ribbon/joinery.ts`: `taperJn` (it skips the cap cover and the records loop; search
  `taperJn[rec.jn]`), `glyphBridge` and `GLYPH_ARM_PROBE`. `src/render/ribbon_renderer.ts`: where
  `taperHideJn` is built (search `the junctions a tapered root ends at`).

## Setup

- Work only in `C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\muse-k1220-s3`. Claude made
  it, detached at this brief's commit, with `node_modules` as a junction to the main checkout's.
  Never run `npm ci`.
- Copy S2's tools (`.claude/probes/K1220/s2/`, tracked) to `.claude/probes/K1220/s3/` and work
  there. In the copies, change the served-code mark to "K1220 S3" (your code carries it in a
  comment; master never does), the lock owner to `K1220-S3`, and the ports to 5980 (master) and
  5981 (yours). Serve master from a `git archive` export of this brief's commit in
  `.claude/probes/K1220/s3/master`, with its `node_modules` junctioned, as S2 did.
- Every browser job (census, geom, shots) runs under the perf lock through your copy of
  `locked.ps1`: real time, headed, `phw=0`, `fw=0`.

## Done

1. The fix, in `joinery.ts` (and `ribbon_renderer.ts` if the hide's build changes), with a
   `K1220 S3` comment where it applies.
2. `geom.mjs` at the 10 i forks, master and yours: the kinds of fan each draws. Yours draws the
   record's seal and wedges (and the bridge where the widths step) at 10 of 10. Say what draws the
   spur's cap cover (the stadium) on each build.
3. Whole-frame diffs at rest (`absdiff_all.ps1`): every changed pixel lies within 5 fh of an i
   fork. The a, aa and three maze stands change 0 px, or you name each changed spot and why.
4. Sheets, master over yours at zoom 4, in `.claude/probes/K1220/s3/out/sheets/`: for each i fork,
   rest, nofans, its pluck, the flow pair, and the trace reveal at 20/40/60/80%. Claude judges
   the look from these. Name the two to show first.
5. `npm test` is green after `git fetch -q origin` and `git rebase origin/master`. Then run
   `git push origin HEAD:master` and watch that commit's deploy (`gh run list -R
   levilindsey/knotmaze -L 3`) until it is green. If the push is rejected: fetch, rebase, test,
   push again. Never force, never skip hooks.

## Rules

- PowerShell. Stage files by name. Never `git add -f` a probe's outputs (PNG, JSON, tables, logs,
  the master export). The copied tools may go in with the fix's commit.
- Don't touch:
  - the main checkout (Claude merges there);
  - the Claude agents' worktrees (K1040 S4a in `src/render/field/`, K863 J3m in the K863 kit);
  - port 5173 or ports 5960-5969;
  - the phone.
- Don't edit LEDGER.md.
- Out of scope (name it if you see it, don't fix it):
  - the reveal's looks: the bare ribbons before the gate opens, and the fans' settled paint under
    the trace's tint (K1232);
  - the dark V at the a's J in ai (K1233);
  - the stepped colour edge near the i's root (K1234);
  - the a's 12° bend;
  - the 1 px jog in ia at xh 2.
- Stop when Done holds or 2 h after your start (`Get-Date` at the start and at each milestone).
  If the fix doesn't hold by then, don't push it: keep it as a patch in `.claude/probes/K1220/s3/`.
  Stop your servers and browsers.

## Report

Append a Handoff to this brief, in the fix's push or one after it:
- what you built;
- the geom counts and the diff table;
- the sheets to show first;
- anything out of scope you saw;
- your last SHA.

Commit messages carry the record.
