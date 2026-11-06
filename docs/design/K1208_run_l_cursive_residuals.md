# Muse batch 22, Run L: the cursive residuals measured on the approved v6.8

Ledger: K1208 (batch 22); the items listed below; K863's trace kit. Chain tag 22L; no server. One
Muse run in the main checkout on master. Probes only. It starts after J3k (K863's stage with the
kit fixes, K1212) has landed; Claude releases its hold.

## Why

Levi kept v6.8's joins and letters (K1119: "the v6.8 versions are WAY better in all cases"; K1197:
"the old one is better"). About thirty cursive residuals were filed against earlier versions, v3
to v6.6, each with a number from its own version. Claude plans the next cursive stages (K863,
K1112) from what v6.8 still owes, so each residual needs v6.8's number: does it still hold?

## Read first

- Batch 22's How to work (`docs/design/K1208_muse_batch22.md`) and the pages it sends you to.
- `docs/design/K863_trace.md`: the kit, the census and "Judging a look".
- `docs/design/K863_cursive_j3j.md` Handoff: `.claude/probes/K863/trace/work33/` is v6.8 rebuilt,
  with its census. Then J3k's Handoff (`docs/design/K863_cursive_j3k.md`): the kit's fixes (K1212's
  g2 angle key, the word lists' repeated ids). If J3k landed a kit-fixed rebuild of v6.8, measure
  that one and say so.
- Each item's ledger text (`node $HOME/Repositories/claude-config/tools/ledger.mjs show <ID> --repo .`)
  and the handoff it points to.

## Items

K903, K912, K913, K927, K937, K938, K947, K948, K949, K951, K961, K977, K978, K982, K986, K987,
K989, K990, K991, K997, K998, K1006, K1014, K1021, K1035, K1036, K1044, K1090, K1116, K1194.

## Tasks

1. For each item, find the measure its claim rests on (a census number, a node count, a curvature
   jump, a distance to the font, a crossing, a solve's status) and take it on v6.8 through the
   kit's own scripts, run on copies in your folder. Never edit work33, out33 or the kit in place.
2. Give each a verdict: holds (v6.8's number beside the item's), gone (v6.8's number), changed
   (both numbers), or not measurable on v6.8 (why: the tool is gone, v6.8 redrew the letter).
3. Where the claim is a shape (a notch, a knee, a hook, an elbow, comb steps, a V), draw the spot
   on v6.8 beside the font at 3x with the kit's sheet tools and list the PNG. Claude views it. Say
   what you measured, never whether it looks right.
4. Where the claim is about the kit itself (K978's guard, K982's crossings never read, K989's
   emulated edits, K997's take rule, K998's coverage, K1036's checks), say whether today's kit
   still has the gap, with the file and line. No fix.

## Record

`.claude/probes/K863/audit_22l/`: the scripts and `SUMMARY.md`, one table with a row per item (the
claim and its version's number, v6.8's number, the verdict, the crop). PNGs tracked with
`git add -f` (at most 40, each under 300 KB).

## Done and close

Done when every item has a row. Commit message:
`K863: the cursive residuals measured on v6.8 (Muse batch 22 Run L, 22L)`. Pull with rebase and
autostash, then push to master (probes only, so nothing deploys). Leave the ledger to Claude.

## Report

Plain words: per item the verdict and the numbers; the crops' paths; anything that stopped you;
`Ledger items`.
