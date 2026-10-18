// K122: what the credits page says that npm cannot know. TRACKED SOURCE -
// edit this file, never the generated page (dist/licenses.html).
//
// The page itself is built by vite_plugin.ts from the modules that really
// end up in the bundle (notices.ts), so a new dependency shows up by itself.
// This file holds the four things a build cannot work out:
//   1. the LICENSE POLICY: which licenses may ship without asking Levi;
//   2. LICENSE_FALLBACKS: the license text of a bundled package whose npm
//      tarball ships none (the MIT and ISC licenses require the copyright
//      and permission notice with every copy, so the text must come from
//      somewhere);
//   3. CREDITS: courtesy credits for techniques the code borrows, and the
//      notices a license makes us ship with what we took from it (V8's
//      Math.hypot, the Hershey fonts);
//   4. RESEARCH (K277): the published techniques the code follows, each
//      with its citation, what it is used for and the files that use it.
//
// Adding a credit: add it to CREDITS (courtesy credits above the entries
// that carry a license's notice, which come last). Adding data under a
// license that needs an acknowledgement (K115's Hershey font data): set its
// entry's `shipped` to true in the same commit (test/notices guards it).
// Adding a technique from a paper or a book: add it to RESEARCH in the
// commit that adds the code (test/notices greps every listed file for its
// mark, so an entry cannot outlive the code that earned it).

// ---------------------------------------------------------------------------
// 1. License policy
// ---------------------------------------------------------------------------

// SPDX ids that may ship without a decision from Levi. A package under
// anything else (a copyleft license, a custom one, none at all) fails the
// build and the tests until Levi has looked at it and this list says so.
export const ALLOWED_LICENSES: readonly string[] = [
  "MIT",
  "MIT-0",
  "ISC",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "Apache-2.0",
  "0BSD",
  "Unlicense",
  "CC0-1.0",
  "Zlib",
  "BlueOak-1.0.0",
];

// The licenses whose text must carry the author's copyright line (the
// notice they require us to reproduce). A LICENSE file without one is a
// template, not a notice.
export const NEEDS_COPYRIGHT_LINE: readonly string[] = [
  "MIT",
  "ISC",
  "BSD-2-Clause",
  "BSD-3-Clause",
];

// Modules the bundler injects (ids starting with "\0") belong to the build
// tools, not to a dependency: Vite's preload helper and modulepreload
// polyfill, Rolldown's module runtime (together about 4.8 KB of the
// output). They are boilerplate that every Vite build carries, and Vite's
// own build.license skips them too. Anything ELSE virtual with rendered
// code fails the build, so a plugin that starts bundling third-party code
// under a virtual id cannot slip through.
export const TOOLING_VIRTUAL_PREFIXES: readonly string[] = [
  "vite/",
  "rolldown/",
];

// ---------------------------------------------------------------------------
// 2. License texts for packages that ship none
// ---------------------------------------------------------------------------

export interface LicenseFallback {
  // The SPDX id the text was copied under. The build compares it with the
  // package's own `license` field, so a relicensing cannot go unseen.
  license: string;
  // Where the text was copied from, at the packaged version (shown on the
  // page under the text).
  source: string;
  // The upstream LICENSE file, verbatim.
  text: string;
}

// Used ONLY while the package's own directory has no license file: a
// release that starts shipping one wins over the entry here.
export const LICENSE_FALLBACKS: Readonly<Record<string, LicenseFallback>> = {
  // tweakpane 4.0.5: the npm package has dist/tweakpane.js, whose first
  // line says "(c) 2016 cocopon, licensed under the MIT license", but no
  // LICENSE file. Copied from the 4.0.5 tag.
  tweakpane: {
    license: "MIT",
    source: "https://github.com/cocopon/tweakpane/blob/4.0.5/LICENSE.txt",
    text: `Copyright (c) 2016 cocopon <cocopon@me.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`,
  },
  // @pixi/colord 2.9.6: PixiJS's fork of omgovich/colord; the npm package
  // has no LICENSE file. Copied from the fork's v2.9.6 tag.
  "@pixi/colord": {
    license: "MIT",
    source: "https://github.com/pixijs/colord/blob/v2.9.6/LICENSE.md",
    text: `MIT License

Copyright (c) 2020 Vlad Shilov omgovich@ya.ru

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`,
  },
};

// ---------------------------------------------------------------------------
// 3. Credits
// ---------------------------------------------------------------------------

export interface Credit {
  // Stable key (tests and diffs); never reused.
  id: string;
  title: string;
  // Who made it.
  by: string;
  // One or two sentences: what it is and what the game does with it.
  note: string;
  // Where to read more (https).
  url?: string;
  // Text a license makes us ship verbatim (shown as a quotation). Blank
  // lines separate paragraphs; single newlines are kept as line breaks, so
  // a license copied from a hard-wrapped file is joined into one line per
  // paragraph or list item first (whitespace only: the words stay the
  // project's own).
  notice?: string;
  // Where `notice` was copied from (https); the page shows it under the
  // text, as it does for a package whose tarball ships no license file.
  noticeSource?: string;
  // false = what it credits is not in the app yet, so the page leaves it
  // out. Flip it in the commit that adds the thing.
  shipped: boolean;
}

// Courtesy credits owe the authors a mention rather than a license: the
// shaders use published techniques (a warp of a warp, a three-multiply
// expression, a fade curve), not anyone's files. (The backgrounds' integer
// hash was PCG2D until K154, 2026-10-14; it is our own now, hash2d.ts, so it
// has no entry.) Each entry names the source the code comments cite. Order
// is the page's order. The entries that carry a `notice` (V8's, Hershey's)
// are different: their licenses require the text to travel with what we
// took, so the text is the project's own and goes last.
export const CREDITS: readonly Credit[] = [
  {
    id: "quilez-domain-warping",
    title: "Domain warping",
    by: "Inigo Quilez",
    note: "The mist background feeds noise through more noise, the technique of his article on warping.",
    url: "https://iquilezles.org/articles/warp/",
    shipped: true,
  },
  {
    id: "jimenez-interleaved-gradient-noise",
    title: "Interleaved gradient noise",
    by: "Jorge Jimenez",
    note: "The background's full-resolution dither uses his three-multiply noise, from “Next Generation Post Processing in Call of Duty: Advanced Warfare” (SIGGRAPH 2014).",
    url: "https://advances.realtimerendering.com/s2014/index.html",
    shipped: true,
  },
  {
    id: "perlin-gradient-noise",
    title: "Gradient noise",
    by: "Ken Perlin",
    note: "The background's base noise is gradient noise with his smoother fade curve (“Improving Noise”, SIGGRAPH 2002).",
    url: "https://mrl.cs.nyu.edu/~perlin/noise/",
    shipped: true,
  },
  {
    id: "scarborough-fair",
    title: "Scarborough Fair",
    by: "Traditional English ballad",
    note: "The tune music mode plays.",
    shipped: true,
  },
  // V8's Math.hypot. hypot2 in src/util/det_math.ts (K108) follows the
  // two-argument path of V8's Math.hypot step for step (FastMathHypot, which
  // MathHypot calls, in src/builtins/math.tq): scale by the larger magnitude,
  // square and add the scaled terms, take the root, rescale. That is V8's
  // algorithm re-written from exact operations rather than V8's text, but
  // it mirrors the expression it ports, so V8's BSD-3-Clause license is
  // honored as if it were a copy (decided 2026-10-13): binary
  // redistributions reproduce its copyright notice, conditions and
  // disclaimer. The text is the V8 project's own, the half of its LICENSE
  // file that covers V8's code (the file opens with a list of externally
  // maintained libraries - PCRE tests, Strongtalk, Valgrind, the Wasm API -
  // none of them involved here), joined into one line per paragraph and
  // bullet for a phone: only whitespace changed. Fetched 2026-10-13 from
  // v8/v8 commit c518b1c (main's head that day). Keep this entry while
  // hypot2 follows V8; test/notices checks that it ships and that
  // det_math.ts still defines hypot2.
  {
    id: "v8-math-hypot",
    title: "Math.hypot",
    by: "The V8 project authors",
    note: "The maze generator measures distances with hypot2, which follows V8's Math.hypot step for step (FastMathHypot in V8's src/builtins/math.tq), so every browser builds the same maze from the same link. V8's license asks that its notice come with the code:",
    url: "https://github.com/v8/v8/blob/c518b1c983fa8e005c8c1c4c80b2d83db6dc0904/src/builtins/math.tq",
    notice: `Copyright 2014, the V8 project authors. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* Neither the name of Google Inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
    noticeSource: "https://github.com/v8/v8/blob/c518b1c983fa8e005c8c1c4c80b2d83db6dc0904/LICENSE",
    shipped: true,
  },
  // K115 (cursive text) ships Hershey Script Simplex data. The Hershey
  // license lets anyone use the fonts for any purpose PROVIDED the two
  // acknowledgements below are distributed with the font data, and that
  // the data is not converted into the NTIS format. The notice is the
  // distribution's own text (hershey.txt, "USE RESTRICTION", condition 1),
  // word for word. K115 sets `shipped: true` in the commit that adds the
  // data; test/notices fails if any source or public file mentions
  // Hershey while this is false.
  {
    id: "hershey-fonts",
    title: "Hershey fonts",
    by: "Dr. A. V. Hershey, U.S. National Bureau of Standards; data format by James Hurt, Cognition, Inc.",
    note: "The single-line cursive letters and Greek print letters that text in the maze is drawn from.",
    url: "https://github.com/kamalmostafa/hershey-fonts",
    notice: `The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the U. S. National Bureau of Standards.

The format of the Font data in this distribution was originally created by
James Hurt
Cognition, Inc.
900 Technology Park Drive
Billerica, MA 01821
(mit-eddie!ci-dandelion!hurt)`,
    shipped: true,
  },
];

// ---------------------------------------------------------------------------
// 4. Research and techniques (K277)
// ---------------------------------------------------------------------------

export interface ResearchSource {
  // Title and venue or book, as plain text. Only what a record confirmed
  // (a DBLP or publisher page, the paper itself): leave out a detail you
  // could not check, such as a page range.
  text: string;
  // https link to that record, when one is confirmed.
  url?: string;
}

export interface ResearchFile {
  // Repo-relative with forward slashes, under src/ or notices/.
  path: string;
  // Text the file must contain, in any case. test/notices greps for it, so
  // an entry cannot outlive the code that earned it. The code comment or the
  // import that names the technique is the usual mark.
  mark: string;
}

export interface ResearchCredit {
  // Stable key (tests and diffs); never reused.
  id: string;
  // What the technique is called.
  technique: string;
  // Who described it, and when.
  by: string;
  // Where to read it.
  sources: readonly ResearchSource[];
  // One sentence: what Knotmaze uses it for.
  use: string;
  // The files that use it.
  files: readonly ResearchFile[];
}

// The wording is fixed (Levi, 2026-10-14): "uses", "follows", "after", and
// nothing that reads as an endorsement or an affiliation. No legal claims
// and never the words "public domain". A game's title is named only to say
// where an idea came from. Credit only what a file in src/ or notices/ does
// today: a source for work that is not built (K80's puzzle rules, K74's
// maze-psychology reading) waits until the code is. Order is the page's.
export const RESEARCH: readonly ResearchCredit[] = [
  {
    id: "pullen-near-misses",
    technique: "Near misses at the goal",
    by: "Walter D. Pullen",
    sources: [{ text: "Think Labyrinth: Maze Algorithms" }],
    use: "The exit corridor keeps junctions near the finish that do not lead in, so the direct approach misleads.",
    files: [{ path: "src/core/maze_plan.ts", mark: "Pullen" }],
  },
  {
    id: "long-blind-alleys",
    technique: "Long blind alleys",
    by: "Walter D. Pullen; Zhao and Marquez, 2013",
    sources: [
      { text: "Think Labyrinth: Maze Algorithms" },
      { text: "Zhao and Marquez, 2013", url: "https://arxiv.org/abs/1307.5713" },
    ],
    use: "Dead ends are placed so each one's free flank runs a long junction-free stretch before it ends.",
    files: [{ path: "src/core/maze_plan.ts", mark: "Zhao and Marquez" }],
  },
  {
    id: "mulberry32",
    technique: "Mulberry32 random numbers",
    by: "Tommy Ettinger, 2017",
    sources: [
      {
        text: "“Mulberry32”, a small seeded random number generator, published as mulberry32.c in a GitHub gist",
        url: "https://gist.github.com/tommyettinger/46a874533244883189143505d203312c",
      },
    ],
    use: "Draws the random numbers behind every maze, so the same link builds the same maze on every device, and the noise in each plucked string.",
    files: [
      { path: "src/util/random.ts", mark: "Mulberry32" },
      { path: "src/core/param_field.ts", mark: "mulberry32" },
      { path: "src/audio/knot_synth.ts", mark: "mulberry32" },
    ],
  },
  {
    id: "fnv-1a",
    technique: "FNV-1a hash",
    by: "Glenn Fowler, Landon Curt Noll and Phong Vo, from 1991",
    sources: [
      {
        text: "“The FNV Non-Cryptographic Hash Algorithm”, RFC 9923, February 2026",
        url: "https://www.rfc-editor.org/rfc/rfc9923.html",
      },
    ],
    use: "Turns the text typed into the seed row into a seed number, and fingerprints a maze's shape so a saved daily attempt can tell when the maze has moved.",
    files: [
      { path: "src/ui/url_state.ts", mark: "FNV-1a" },
      { path: "src/game/daily_attempt.ts", mark: "FNV-1a" },
    ],
  },
  {
    id: "elias-gamma",
    technique: "Elias gamma code",
    by: "Peter Elias, 1975",
    sources: [
      {
        text: "“Universal codeword sets and representations of the integers”, IEEE Transactions on Information Theory 21(2), 194–203",
      },
    ],
    use: "Writes the whole numbers in a link (how many settings changed, which ones, and their values) in as few bits as it can, so links stay short.",
    files: [{ path: "src/ui/param_codec.ts", mark: "Elias gamma" }],
  },
  {
    id: "dijkstra",
    technique: "Shortest paths through a graph",
    by: "Edsger W. Dijkstra, 1959",
    sources: [
      {
        text: "“A note on two problems in connexion with graphs”, Numerische Mathematik 1, 269–271",
        url: "https://doi.org/10.1007/BF01386390",
      },
    ],
    use: "Measures the shortest route from the entrance to the exit (what the efficiency and the stars are measured against), how far every junction is from the exit, when each part of the maze appears, where a cut is routed and how deep each run lies for the section colors.",
    files: [
      { path: "src/core/walk_graph.ts", mark: "Dijkstra" },
      { path: "src/core/reveal_plan.ts", mark: "Dijkstra" },
      { path: "src/core/maze_apply.ts", mark: "Dijkstra" },
      { path: "src/core/section_colors.ts", mark: "Dijkstra" },
    ],
  },
  {
    id: "catmull-rom",
    technique: "Centripetal Catmull-Rom splines",
    by: "Edwin Catmull and Raphael Rom, 1974; Phillip J. Barry and Ronald N. Goldman, 1988; Cem Yuksel, Scott Schaefer and John Keyser, 2011",
    sources: [
      {
        text: "“A class of local interpolating splines”, in Computer Aided Geometric Design, edited by R. E. Barnhill and R. F. Riesenfeld, Academic Press, 1974, pp. 317–326",
      },
      {
        text: "“A recursive evaluation algorithm for a class of Catmull-Rom splines”, Computer Graphics (SIGGRAPH '88) 22, August 1988, pp. 199–204",
      },
      {
        text: "“Parameterization and applications of Catmull-Rom curves”, Computer-Aided Design 43, 2011, pp. 747–755",
        url: "https://cemyuksel.com/research/catmullrom_param/",
      },
    ],
    use: "Draws every thread as a smooth curve through its lattice points: the centripetal form of the curve, evaluated by the recursive method of the second paper.",
    files: [
      { path: "src/geometry/spline_generator.ts", mark: "Catmull-Rom" },
      { path: "src/geometry/spline_generator.ts", mark: "Barry-Goldman" },
      { path: "src/geometry/bend_radius.ts", mark: "Catmull-Rom" },
    ],
  },
  {
    id: "chaikin",
    technique: "Corner cutting for curves",
    by: "George Merrill Chaikin, 1974",
    sources: [
      {
        text: "“An algorithm for high speed curve generation”, Computer Graphics and Image Processing 3(4), 346–349, December 1974",
      },
    ],
    use: "Rounds the corners of the yarn laid along the path you have walked, by cutting each corner off in a pass or two.",
    files: [{ path: "src/render/fabric_maze_renderer.ts", mark: "Chaikin" }],
  },
  {
    id: "verlet",
    technique: "Verlet integration",
    by: "Loup Verlet, 1967",
    sources: [
      {
        text: "“Computer ‘experiments’ on classical fluids. I. Thermodynamical properties of Lennard-Jones molecules”, Physical Review 159(1), 98–103",
        url: "https://doi.org/10.1103/PhysRev.159.98",
      },
    ],
    use: "Moves the particles each thread is made of: a particle steps from its last two positions, with no stored velocity.",
    files: [{ path: "src/physics/particle_system.ts", mark: "Verlet" }],
  },
  {
    id: "position-based-constraints",
    technique: "Position-based constraints",
    by: "Thomas Jakobsen, 2003; Matthias Müller, Bruno Heidelberger, Marcus Hennix and John Ratcliff, 2006–2007",
    sources: [
      {
        text: "“Advanced Character Physics”, Game Developer, 21 January 2003",
        url: "https://gamedeveloper.com/programming/advanced-character-physics",
      },
      {
        text: "“Position based dynamics”, Journal of Visual Communication and Image Representation, 2007 (first presented at VRIPHYS 2006)",
        url: "https://doi.org/10.1016/j.jvcir.2007.01.005",
      },
    ],
    use: "Holds the threads together: springs, bending, crossings and collisions are solved by moving positions directly, pass after pass, in the manner of the first article and after the second.",
    files: [
      { path: "src/physics/forces.ts", mark: "Jakobsen" },
      { path: "src/physics/particle_system.ts", mark: "PBD" },
    ],
  },
  {
    id: "simplex-noise",
    technique: "Simplex noise",
    by: "Ken Perlin, 2001",
    sources: [
      {
        text: "“Noise hardware”, in Real-Time Shading, SIGGRAPH 2001 course notes",
      },
    ],
    use: "Supplies the smooth random drift behind the threads' agitation, the flow along them, the varied parameter fields and the ragged edge of the reveal, through the simplex-noise package listed above.",
    files: [
      { path: "src/physics/particle_system.ts", mark: "simplex" },
      { path: "src/render/ribbon_renderer.ts", mark: "simplex" },
      { path: "src/core/param_field.ts", mark: "simplex" },
      { path: "src/render/reveal.ts", mark: "simplex" },
    ],
  },
  {
    id: "karplus-strong",
    technique: "Plucked-string synthesis",
    by: "Kevin Karplus and Alex Strong, 1983; David A. Jaffe and Julius O. Smith, 1983",
    sources: [
      {
        text: "“Digital synthesis of plucked-string and drum timbres”, Computer Music Journal 7(2), 43–55, Summer 1983",
      },
      {
        text: "“Extensions of the Karplus-Strong plucked-string algorithm”, Computer Music Journal 7(2), Summer 1983",
      },
    ],
    use: "Sounds each plucked thread as a string: a delay loop after the first paper, with extensions of the second such as its pick-position comb, pitched by the thread's length.",
    files: [
      { path: "src/audio/knot_synth.ts", mark: "Karplus-Strong" },
      { path: "src/audio/knot_synth.ts", mark: "Jaffe-Smith" },
    ],
  },
  {
    id: "share-grid",
    technique: "The shared result grid",
    by: "After the way Wordle's players share a result, 2021 on",
    sources: [
      {
        text: "Wordle, the daily word game (Josh Wardle, October 2021)",
        url: "https://en.wikipedia.org/wiki/Wordle",
      },
    ],
    use: "The text a finished daily shares: one colored square per move (green for a step along a shortest route, yellow for a detour, red for a backtrack) shows how the run went, not where it went.",
    files: [
      { path: "src/game/maze_stats.ts", mark: "Wordle" },
      { path: "src/game/share_text.ts", mark: "Wordle" },
    ],
  },
];
