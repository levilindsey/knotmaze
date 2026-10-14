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
//      acknowledgements a license makes us ship with data (Hershey fonts).
//
// Adding a credit: append to CREDITS. Adding data under a license that
// needs an acknowledgement (K115's Hershey font data): set its entry's
// `shipped` to true in the same commit (test/notices guards it).

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
  // lines separate paragraphs; single newlines are kept as line breaks.
  notice?: string;
  // false = what it credits is not in the app yet, so the page leaves it
  // out. Flip it in the commit that adds the thing.
  shipped: boolean;
}

// Courtesy credits owe the authors a mention rather than a license: the
// shaders use published techniques (a warp of a warp, an integer hash of a
// few lines, a three-multiply expression, a fade curve), not anyone's files.
// (The PCG2D paper is CC BY-ND 3.0 as a document; its supplement lists the
// hash as code.) Each entry names the source the code comments cite. Order
// is the page's order.
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
    id: "pcg2d-hash",
    title: "PCG2D hash",
    by: "Mark Jarzynski and Marc Olano",
    note: "The background effects' noise is built on this integer hash, from “Hash Functions for GPU Rendering” (Journal of Computer Graphics Techniques 9(3), 2020), which builds on Melissa O'Neill's PCG generators.",
    url: "https://jcgt.org/published/0009/03/02/",
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
