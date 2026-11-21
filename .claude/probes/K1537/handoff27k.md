# Run 27K (K1550) — handoff for Muse (stopping at the 2 h line)

The full gate of `docs/design/K1531_muse_batch27.md` Run K is NOT done and
K1550 stays OPEN. This file says what is landed, what was measured, and the
exact steps left, so no agent re-derives them. Do NOT close K1550 until the
left-over rows below hold.

## Landed (committed, npm test green 3210)

- The fix: `src/main.ts` + `src/app/context_loss.ts`. A WebGL loss that
  begins in the first `GF_EARLY_MS` (10 s) of the page now reloads the page
  ONCE per tab session on restore (`shouldReloadAfterRestore` /
  `lossDuringLoadOf`, session key `knotmaze.earlyRestoreReloads`); a
  settled page's loss keeps Pixi's own restore, and the cover + its Reload
  are unchanged. Unit tests in `test/app/context_loss.test.ts`.
- WHY a reload, not an in-place revive (all tried, all still 8281-in-box
  dead on the tip build): re-dispatching `webglcontextrestored` (Pixi
  recompiles, +9 compiles, still dead), clearing every `_gpuData` by
  traversal, rebuilding the renderers on the same physics with
  `dropFabricPageCaches` (new marker meshes + glow textures), and a full
  `rebuild()` — every one left Pixi drawing nothing. GPU objects dump
  HEALTHY on a broken page (VAOs, buffers `upd==gUpd`, glow tex 128×128,
  no GL error, GL state identical to clean); the death is pipeline-wide
  (today: 1,090,537 px, the whole knot). The poisoned px outside K1537's
  ring box are the same flat `(21,27,40)`: the head glow's halo beyond the
  box plus the exit marker + its glow at bottom-right.
- Probes (tracked): `repro27k.mjs` (the strong repro: lose at the first
  compileShader on the connected app canvas; sessionStorage once-guard so
  a cured load's reload does not lose twice) and `diag27k.mjs` /
  `diag2..diag7_27k.mjs`. Summaries under `out/27K/`.

## Measured

- Master dc6645531 (preview :5480, kept profile, tol 6): hook repro,
  gf clean floor in 0 / out 27 (27 isolated gf thread px), loss
  7/10 broken (each `in 8281 / out 14137`, 15 Pixi console errors,
  `lostCompiles 23`; the 3 clean losses read `lostCompiles 13`). Below
  the 8/10 target, so the fallback gate 4(b) is the one to satisfy.
- Master, today: clean floor 0/0, loss 4/10 broken
  (`in 8281 / out 1090537`), same 15-error signature.
- Fix, gf smoke (`out/27K/fix4_smoke`): clean floor 0/0, hook loss
  4/4 CLEAN (each reloaded; `ctx losses 0` on the new document).
  npm test green (258 files / 3210 tests).

## Left to do (in brief order)

1. Gate 4(b) on a tip build (preview the tip commit): gf hook loads —
   `node .claude/probes/K1537/repro27k.mjs <base> out/27K/gate_gf <profile> gf 2 45`
   under the perf lock; expect 0 off the floor and at least 3 of the 45
   with console-error rows (the first document's 15 Pixi errors).
   Then today: same with `today 2 20`, expect 0 off its floor.
2. Gate 4(c): the late shape (`repro.mjs` mode `late`) at floor
   5/5 gf and 5/5 today — check no late load RELOADS (its
   `ctx` shows losses 1 / restores 1; a new document shows all-zero,
   which fails the shape, not the fix).
3. Gate 4(d): count `pageerror:` rows across both summaries (must be 0).
4. The ordinary-load guards on the fix build (gf early loads are reps):
   `npm run probe:guards`, `npm run probe:lace` (3/3),
   `npm test` (already green for the smoke tip).
5. Crops (Done 6): `clean | master after loss | tip after loss` ×4 at
   the ring box + one outside place (the exit marker), gf and today,
   under `out/27K/` — read them.
6. Watch the deploy of the fix commit go green; only then close K1550
   (leave K1537 open; no load showed K1537's smaller shape — record if one does).
