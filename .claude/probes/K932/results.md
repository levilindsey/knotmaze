# K932: bench_frame GPU timing recheck (2026-10-29)

Change: scripts/bench_frame.mjs ends each timed frame with a 1-px
readPixels instead of gl.finish() (which K923 showed does not wait for
the GPU in Chrome). K923's runner (sync.mjs, pool.mjs, close_tabs.mjs,
serve.mjs, bench.html, bench.js, count.mjs, summarize.mjs) is folded
into scripts/k923/ and smoke-tested there.

Recheck on this desktop (ANGLE d3d11, RX 6800 XT), default link `?7`,
at rest after asleep (80 frames): old script read finish **0.0 ms**
while the frame cost milliseconds; new script: frame p50 **6.5 ms** =
submit 0.5 + blocked-in-read p50 **6.0 ms**. During load settle the
read blocked 25-32 ms on the first heavy frames. The blocked time is
now the GPU's, as K923's sync=1 method measured it.

Folded runner smoke: `node scripts/k923/serve.mjs 5923` +
`node scripts/k923/sync.mjs --target desk --cells muse_fit --rounds 1
--iter 10` produced its table (floor 0.2, label 0.5, band 0.5, both
0.8 ms median) with no context loss. Raw bench output: after_rest.json,
after2.json, before.json in this folder.
