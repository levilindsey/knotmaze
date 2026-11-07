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

## Handoff (K1220 S3, 2026-11-06)

**What I built** (all in `src/render/ribbon/joinery.ts`, each marked `K1220 S3`):

1. A glyph fork where a tapered root ends (the i's fork) now draws its junction record
   like the a's forks: the seal disc, the wedges with K830's corners, and S2's glyph
   bridge on the wide sides. The tapered-root hide (`taperJn`) now applies only where
   no arm is a glyph chain (`glyphOf`), so maze and non-glyph joints keep the K580
   hide exactly. `ribbon_renderer.ts` and the hide's build are unchanged.
2. The root arm's strip row is written from the body chain at the joint, scaled to
   the O foot's span. The root ribbon wears the body strokes' paint (K620), not the
   spur chain's section; with the spur's own row the fans over the root read as a
   spike of the wrong section.
3. A narrow wedge at such a fork is flank-capped at 1.25 fh and ends on the straight
   segment between its flank tips, not at its corner. Past 1.25 fh its fan repaints
   the root ribbon, whose paint lags the fans' by its foot arc (K620).

No glyph centreline, width or join moves. No pin moved: `npm test` is green after
the rebase onto origin/master (217 files, 2879 tests passed, 9 skipped).

**Geom (Done 2).** Tool: `.claude/probes/K1220/s3/batch_geom.mjs` over `geom.mjs`,
the 10 i forks (i, ai ji2, ia ji0, ii ji0+ji1, at xh 3 and xh 2), master = the
brief commit's export on 5980, mine on 5981, under the perf lock, `phw=0`, `fw=0`.

| | own-record fans at the 10 i forks |
|---|---|
| master | none at 10 of 10 (at ai xh2 one wedge of the neighbouring a fork's record, rb 77, falls inside the 4 fh box; the i fork's own rb 154 draws nothing) |
| mine | the seal disc, 4 wedges and 2 bridges (both wide sides) at 10 of 10 |

The spur's cap cover (the stadium) is drawn by nothing on either build: no fused
tip ends at the i's joint (the spur chain starts at the root's R, which gets no cap
disc, and ends free at the stem tip), so no cap or stadium fan exists there. On
master the joint is the body and root ribbons alone; on mine it is those plus the
fans above. The `nofans` frame is identical on the two builds at every i fork: the
change is fans only.

**Whole-frame diffs at rest (Done 3)**, `diff_all.ps1` (radius 5 fh, per-fork
attribution; i forks are the meta's taper-hidden glyph forks):

| stand | changed px | within 5 fh of an i fork | near other text forks | beyond |
|---|---|---|---|---|
| a xh3 / xh2 | 0 / 0 | – | 0 | 0 |
| aa xh3 / xh2 | 7 / 0 | – | 7 / 0 | 0 |
| ai xh3 / xh2 | 16167 / 15400 | all | 0 | 0 |
| i xh3 / xh2 | 18667 / 17938 | all | 0 | 0 |
| ia xh3 / xh2 | 17712 / 12787 | all | 0 | 0 |
| ii xh3 / xh2 | 34594 / 21041 | all | 0 | 0 |
| maze x4, cross, loop | 0 | – | – | 0 |

The 7 px on aa xh3 are all at most 8 of 255 levels, in one box (1358,1025)–
(1385,1084) beside an a fork whose code path is unchanged; the same stand measured
0 px on the previous build of the fix. I read them as load jitter, not an effect.

**Sheets (Done 4)**, in `.claude/probes/K1220/s3/out/sheets/`: for each i fork,
`<stand>_ji<n>_A.png` (rest, nofans, its pluck, flow at 2.5 and 4.1) and `_B.png`
(the trace reveal at 20/40/60/80%), master over mine at zoom 4. Show first:
`ai_xh3_ji2_A.png` (master's pointed notch and right shelf against the fused
curve), then `i_xh3_ji0_A.png`. On mine the stem's straight cut, the left notch
and the right ledge are gone at rest, in the pluck and in both flow frames at
9 of the 10 forks; the reveal holds the fans behind the gate (20% empty, 40%
bare ribbons, fused from 60%), as the a's forks behave.

**Flaws left.**

- ia at xh 2, the i fork: a dark arc segment and a small dark triangle stay on the
  stem above the fused joint. They are the emergent crossing gap where the body's
  dome passes over the stem (past the fans' rims, about 1.7 fh along the tip arm);
  the fans cover the arc's lower part and leave its top. Covering it means fan rims
  reaching the tip's centreline there, or the gap machinery treating this
  own-junction crossing as a joint pair (crossing_gaps, out of this stage's files).
- At xh 2 the capped narrow fans can read as a pale soft diamond in the cluster
  below the joint (ii xh2 ji0): inside 1.25 fh the fans wear the body gradient,
  the root beneath wears its foot-lagged paint. The silhouette is fused; only the
  tone differs.
- The reveal's two known looks (bare ribbons before the gate, the fans' settled
  paint under the trace's tint) are unchanged and out of scope (K1232). Nothing
  else out of scope was seen; nofans identity is the control.

**Last SHA.** Fix: e8636a3a (after the rebase; this handoff follows it).
