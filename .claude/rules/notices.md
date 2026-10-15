---
paths:
  - "notices/**"
  - "test/notices/**"
  - "vite.config.ts"
---

# Third-party notices lore

Binding lore for the credits and licenses page (K122, 2026-10-13). The
research, the tooling choice and the verification record are in
`docs/design/K122.md`.

- WHAT SHIPS. `licenses.html` next to index.html, built by
  `notices/vite_plugin.ts` from the modules each output chunk really
  contains (Rolldown's `chunk.modules`, renderedLength > 0; package.json's
  dependency list is never consulted, so the page cannot drift). Per
  package: name, version, license id, project link and the full license
  text with its copyright line; packages with the same words share one
  block. The panel's credit line links to it ("Licenses", a new tab,
  `${BASE_URL}licenses.html`). Every JS chunk carries a one-line pointer to
  the page, and packages' own `/*! */` and `@license` comments are kept
  (`output.comments.legal`; Vite 8 strips them by default, and only
  Tweakpane's one-liner exists, so the page is the real carrier).
- THE GUARD. The build FAILS, and so does `npm test` (it builds in
  memory), when a bundled package has no license text, declares no license
  or one outside ALLOWED_LICENSES, has MIT/ISC/BSD text without a
  copyright line, or when a virtual module that is not Vite/Rolldown
  boilerplate contributes code. A new dependency needs nothing: it appears
  by itself. If the build rejects one: a package with no LICENSE file
  (tweakpane and @pixi/colord today) gets a LICENSE_FALLBACKS entry in
  `notices/credits.ts` - the upstream LICENSE at the packaged version,
  verbatim, with its URL; a license outside the list is Levi's call (edit
  ALLOWED_LICENSES only after he decides). After adding or upgrading a
  dependency, build once before pushing.
- CREDITS. Hand-written entries live in `CREDITS` (credits.ts): courtesy
  credits for techniques the code borrows (Quilez, Jimenez, Perlin, the
  tune) and the notices a license makes us ship (V8's, Hershey's:
  `notice` holds the text, `noticeSource` the URL it was copied from, which
  the page shows under it). A new borrowed technique, tune, asset or ported
  algorithm gets its entry in the commit that adds it.
- PCG2D IS GONE (K154, Levi 2026-10-14: "swap in our own"; the other calls
  were to keep the Perlin and Scarborough Fair credits and, that day, to
  credit no other technique; K277 reversed that last call, see RESEARCH).
  The backgrounds' integer hash is `src/render/hash2d.ts`,
  designed here (see render-hash.md), so nothing about it is credited. test/notices
  fails if the page names PCG, Jarzynski or Olano again; a hash taken from a
  paper or a library needs its credit back in the commit that takes it.
- RESEARCH (K277, Levi 2026-10-14 about 16:07, reversing the K154 call to
  credit no other technique; brief docs/design/K274_K277.md). `RESEARCH`
  (credits.ts) lists the published techniques the code follows, and the
  page shows them in a "Research and techniques" section after the
  packages: the technique, who and when, the citations, what Knotmaze uses
  it for, and the files that use it. WORDING IS FIXED: "uses", "follows",
  "after"; nothing that reads as endorsement or affiliation; no legal
  claims, never "public domain"; a game's title (Wordle) only to say where
  an idea came from, no logo. CITE ONLY WHAT A RECORD CONFIRMED (a DBLP or
  publisher page, the paper itself): leave out a page range, a venue or an
  editor you could not check, and no entry may name Jarzynski, Olano, PCG
  or Hershey (the page test fails on them). CREDIT ONLY WHAT A FILE DOES:
  every entry lists its files, each with a mark (text the file must
  contain), and test/notices fails when a file or its mark is gone, so an
  entry cannot outlive its code; the sources of unbuilt work (K80's puzzle
  rules, K74's maze-psychology reading, Pac-Man and Brogue) wait for the
  code. A new borrowed technique gets its entry in the commit that adds it.
- V8 (hypot2). `hypot2` in `src/util/det_math.ts` (K108) follows V8's
  FastMathHypot (`src/builtins/math.tq`) step for step. It is V8's
  algorithm re-written from exact operations, not V8's text, but it
  mirrors the expression it ports, so the entry "v8-math-hypot" carries
  V8's BSD-3-Clause notice (decided 2026-10-13): the part of V8's LICENSE
  file from its copyright line on, joined into paragraphs for a phone
  (whitespace only; checked word for word against the file at the pinned
  commit in the entry's URLs). test/notices fails if `hypot2` goes while
  the credit stays, and if the credit loses a clause or stops shipping.
- HERSHEY (K115). The Hershey fonts' license allows any use PROVIDED two
  acknowledgements are distributed with the font data (and the data is not
  converted to NTIS's format). The entry "hershey-fonts" holds the exact
  text with `shipped: false`. The commit that adds the font data sets
  `shipped: true`; test/notices fails while any `src/` or `public/` file
  names Hershey (or is a .jhf file) and the flag is still false.
- URLS. Pages 308-redirects `/licenses.html` to `/licenses` (measured
  2026-10-13 on `/404.html`, directly and through the levi.dev proxy,
  which rewrites the Location under `/knotmaze/`). The page's own links are
  relative (`./`), so it reads the same at knotmaze.pages.dev and at
  levi.dev/knotmaze/. The dev server answers `/licenses.html` with a
  placeholder; the package list needs a production build.
- TYPES. `notices/tsconfig.json` (Node types; also covers
  `test/notices` and `vite.config.ts`) is not part of the root tsconfig,
  which is browser-only: `npm run build` runs both.
