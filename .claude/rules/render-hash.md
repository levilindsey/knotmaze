---
paths:
  - "src/render/hash2d.ts"
  - "src/render/background_shaders.ts"
  - "test/render/hash2d.test.ts"
---

# Render lore: the backgrounds' hash (K154)

Moved verbatim from `render.md` by K173 (2026-10-14), so that it attaches
only with the files it is about; `render.md` lists the area's other files.

- THE BACKGROUNDS' HASH IS OUR OWN (K154, 2026-10-14; Levi: "swap in our
  own", after K122's credit calls). `src/render/hash2d.ts` replaced PCG2D
  (Jarzynski and Olano) in background_shaders.ts, so no credit rides on it
  (notices.md: the `pcg2d-hash` entry is gone). `uvec2 hash2d(uvec2)`: a
  multiply-add per lane, then three rounds of multiply, a CROSS xorshift
  (each lane takes the other's high bits) and a SELF xorshift, all with
  constants drawn from a seeded RNG (multipliers kept to 13-19 set bits,
  top bit set) and picked by an avalanche search (`.claude/probes/
  K154_K169/hash_search3.mjs`: best of 3000, then 0.0058 worst deviation
  from an even flip chance over 4096 input-bit x output-bit cells at
  100000 fresh inputs; the sampling noise is 0.0016 a cell). Two lanes and
  fewer than three rounds fail hard (a one-round table never flips some
  output bits at all). It is a bijection on the 64-bit state (odd
  multipliers; the cross step is I + nilpotent over GF(2)), so distinct
  cells never collide. The mirror (`hash2d(x, y)`: Math.imul, >>>) and the
  GLSL come from ONE table (`HASH2D`, `hash2dGlsl`), so they cannot drift;
  `test/render/hash2d.test.ts` holds the thresholds (each a multiple of its
  test's sampling noise, with the one-round table as the negative
  control): avalanche, neighbour-cell flips, byte and joint-bucket
  chi-square, lag correlations, the dither's triangular mean and variance,
  and the shader text. EFFECT ON THE LOOK: every pixel of the seven effect
  programs differs (a new draw of the same noise: at the pinned frames one
  frame's luma mean moved by up to 2.9 levels, its sd by up to 0.74 and
  silk's p98 from 44 to 38, which is what a new draw does to broad
  structure; the drift clocks are identical, and the lattice values are
  uniform as before), and their sha256 pins moved with it; the blit, the
  fog and the quad do not use the
  hash and did not move (the blit's own interleaved-gradient dither is
  unchanged, and its spectrum is the only structure in a frame: bins at
  ratios 60-80 over their local mean in the old and the new frames alike,
  at the same places). SPECTRA: the hash's own cell grid and the dither's
  pixel grid read 10.9-12.3 on the spike statistic (the largest bin over
  its 11 x 11 neighbourhood; white noise gives ln(250000) = 12.4), also at
  a 3e6 coordinate offset. GPU PARITY (`hash_gpu.mjs`: a WebGL2 page
  compiles HASH2D_GLSL, hashes a 256 x 256 grid at four offsets up to
  +-2147483000 and reads both lanes back): 4 x 131072 words, 0 mismatches
  against the mirror on the RX 6800 XT (ANGLE D3D11). COST (perf lock held;
  RX 6800 XT, 3200x1800, `bg_gpu.mjs` = K79's per-program TIME_ELAPSED
  probe, 4 s x 2 rounds a config, the two builds interleaved A B A B on
  separate pages, so compare the pairs, not the runs; ms per frame as that
  probe sums them): the effect pass costs 37-60% more, PCG2D -> this hash,
  mean of two runs each: vellum-drift 0.352 -> 0.50, mist 0.068 -> 0.105,
  wash 0.089 -> 0.143, silk 0.094 -> 0.129, aurora 0.106 -> 0.159,
  contours 0.052 -> 0.082 (+0.03 .. +0.15 ms a frame; the whole frame
  2.5-2.8 ms, the ribbons' 1.5 .. 1.7 ms moved between runs by more than
  that). It has 8 integer multiplies a call where PCG2D had 6 and about 34
  scalar ops where it had 20. The blit, fan and strip programs did not
  move. Static vellum (the default, one pass per change) pays nothing per
  frame. The phone's price is unmeasured: K79's phone gate (K52) read
  vellum-drift as the pass to watch, and it is the one that grew most. A
  lighter hash is not a tuning of this one (three multiplies per lane fail
  the avalanche test by a wide margin, 0.33); it would be a different shape.
  Probes: `.claude/probes/K154_K169/` (bg_ab.mjs + cases_bg.json: the
  before/after frames, `bare` hides the maze; bg_analyze.mjs and
  hash_spectrum.mjs: histograms, spectra, `out/sheets/`).
