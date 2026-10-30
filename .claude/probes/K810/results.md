# K810: panel search library comparison (2026-10-29)

The brief's library names (ngraph.search, Graphology, custom-graph) do not
exist for this; the ledger's K810 names the real set, run here: Fuse.js,
uFuzzy (@leeoniya/ufuzzy) and fuzzysort, against the shipped hand-rolled
matcher (src/ui/panel_search.ts). Workload: the 44 fixed queries in
test/ui/panel_search_fixture.ts over its 37 rows. A query passes when the
result satisfies the fixture's expectations (top, has, not, order — the
same checks as test/ui/panel_search.test.ts). Script: compare.ts in this
folder (`npm i fuse.js @leeoniya/ufuzzy fuzzysort tsx` here, then
`node node_modules/tsx/dist/cli.mjs compare.ts`); each library searched
one joined text per row (label, key, tags, options, folders; Fuse with
field weights 1 / 0.6 / 0.6 / 0.3 / 0.25 like the panel's). Timing:
median of 5 rounds, 300 repetitions of all 44 queries per round.

| Matcher | Pass | Time per query |
|---|---|---|
| shipped (panel_search) | 44/44 | 41.4 µs |
| Fuse.js | 35/44 | 207.7 µs |
| uFuzzy | 31/44 | 5.8 µs |
| fuzzysort | 34/44 | 2.3 µs |

Failed queries:
- Fuse.js: density weave, hunter, speed, seed, fire speed, quiet, wave, gs, minotaur speed
- uFuzzy: tempreature, minotuar, mino, colr, sond, lenght, volune, volme, voluume, burn, minotaur speed, minotuar sight, accessibility
- fuzzysort: minotuar, mino, seed, monster, colr, sond, burn, wave, minotuar sight, accessibility

Reading: the libraries are faster per query (fuzzysort ~18x), but none
reproduces the shipped rules — typo tolerance gated on no exact match,
exact-word-never-fuzzes, AND across fields with panel weights, and
panel-order ties are the rules the fixture pins. The shipped matcher
stays; K793's choice holds.
