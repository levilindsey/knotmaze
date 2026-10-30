# K393 probe: type-checking the tests (2026-10-29, Muse, Option B)

## The decision

Option B (keep the fallback). The default `tsconfig.json` stays src-only;
`npm test`, `.github/workflows/` and `scripts/preview.ps1` run exactly the
commands they ran before. What ships is the groundwork below, so the
fallback only ever shrinks.

## What shipped

- `tsconfig.tests.json`: extends the default, includes `src`, `test` and
  the two root configs, at the default's own strictness (no stricter yet).
- `npm run probe:types` (`scripts/probe_types.mjs`): a soft pass that runs
  that config, names every skipped file with its error count, and always
  exits 0. It gates nothing.
- This file.

## The probe's numbers

`npm run probe:types` (2026-10-29, after this week's new tests were made
clean): **92 errors in 32 files**, all in `test/` (src is clean, as the
gate already proves). By code:

| Code | Count | What it is here |
|---|---|---|
| TS2345 | 24 | argument not assignable (mostly `title`/`glyphs2` missing from scene params) |
| TS2741 | 19 | property missing in a test double |
| TS2353 | 10 | unknown property in a literal (`deadEnds`, removed in codec v7) |
| TS2339 | 9 | property does not exist (`deadEnds` again) |
| TS2352 | 9 | unsafe conversion of a params literal |
| TS2322 | 6 | type not assignable (`seed`/`glyphs2` undefined) |
| TS2341 | 5 | private field read |
| TS2739 | 3 | missing properties |
| TS2305 | 2 | `ShapeName` no longer exported from shapes.ts |
| TS6133 | 2 | unused local |
| TS2551/TS1294/TS2559 | 3 | `closed` for `isClosed`; syntax-only; no common properties |

Worst files: paint_gameplay.test.ts 14, confetti_model.test.ts 11,
maze_plan_identity.test.ts 7, text_pen_order.test.ts 6, tug.test.ts 5.

## Why not Option A

Many errors are stale test code the runtime tolerates (a removed param
read back as undefined, a renamed field, params literals missing fields
the builder defaults). Fixing all 92 is a diffuse edit across 32 test
files, several of them pins (maze_plan_identity, param_codec): exactly
the work the brief reserves for a design pass, not a sweep. Turning the
checks up (strict) was not measured; it can only be larger.

## The way forward (shrinking fallback)

Fix files a few at a time (each file's errors are one kind), rerun
`npm run probe:types`, and when it reaches 0, fold `tsconfig.tests.json`
into `npm test`'s typecheck step. No file is opted out individually: the
probe names skipped files from tsc's own output, so a fixed file drops
off the list by itself.
