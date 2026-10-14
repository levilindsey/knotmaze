// K122: what the credits page says that npm cannot know. TRACKED SOURCE -
// edit this file, never the generated page (dist/licenses.html).
//
// The page itself is built by vite_plugin.ts from the modules that really
// end up in the bundle (notices.ts), so a new dependency shows up by itself.
// This file holds the three things a build cannot work out:
//   1. the LICENSE POLICY: which licenses may ship without asking Levi;
//   2. LICENSE_FALLBACKS: the license text of a bundled package whose npm
//      tarball ships none (the MIT and ISC licenses require the copyright
//      and permission notice with every copy, so the text must come from
//      somewhere);
//   3. CREDITS: courtesy credits for techniques the code borrows, and the
//      notices a license makes us ship with what we took from it (V8's
//      Math.hypot, the Hershey fonts).
//
// Adding a credit: add it to CREDITS (courtesy credits above the entries
// that carry a license's notice, which come last). Adding data under a
// license that needs an acknowledgement (K115's Hershey font data): set its
// entry's `shipped` to true in the same commit (test/notices guards it).

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
    note: "The single-line cursive letters that text in the maze is drawn from.",
    url: "https://github.com/kamalmostafa/hershey-fonts",
    notice: `The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the U. S. National Bureau of Standards.

The format of the Font data in this distribution was originally created by
James Hurt
Cognition, Inc.
900 Technology Park Drive
Billerica, MA 01821
(mit-eddie!ci-dandelion!hurt)`,
    shipped: false,
  },
];
