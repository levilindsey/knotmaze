// K115 stage 6c offline generator: Hershey Greek (.jhf) -> src/core/hershey_greek.ts
// Usage: node .claude/probes/K115/gen_greek.mjs
// Parses .claude/probes/K115/data/greek.jhf (the kamalmostafa/hershey-fonts
// distribution of Dr. A. V. Hershey's data, format by James Hurt) and emits
// integer stroke data keyed by Unicode codepoint. No .jhf parsing ships at
// runtime. Re-running reproduces the committed file byte for byte.
//
// The .jhf file is in ASCII order (index = ASCII code - 32, like scripts.jhf),
// but its Greek letters sit at transliteration slots, not alphabet slots:
// the slot letter is the Latin letter of the Greek letter's sound/shape, the
// same in both cases (slot G/g is Gamma, slot Q/q is Theta, slot C/c is Chi).
// Identified from the shipped strokes (case pairs agree on every slot):
//   capitals: A Alpha  B Beta   G Gamma  D Delta  E Epsilon Z Zeta
//             H Eta    Q Theta  I Iota   K Kappa  L Lambda  M Mu
//             N Nu     X Xi     O Omicron P Pi    R Rho     S Sigma
//             T Tau    U Upsilon F Phi   C Chi    Y Psi     W Omega
//   lowercase letters sit at the matching lowercase slots, with the medial
//   sigma at s. Slots J, V, j and v hold no Greek letter (a dot, a top arc
//   and two symbols) and are not emitted.
//
// Codepoint coverage: U+0391-U+03A1, U+03A3-U+03A9 (capitals) and
// U+03B1-U+03C1, U+03C3-U+03C9 (lowercase), plus U+03C2 final sigma.
// Documented gaps -- no glyph is invented for any of these:
//   - U+03AA, U+03AB, U+03CA, U+03CB (dialytika capitals/lowercase): no
//     glyph in the data; the precomposed forms decompose (NFD) to a plain
//     iota/upsilon, whose builder ships the base bare until 6d.
//   - U+03C2 final sigma has no distinct glyph in greek.jhf: the medial
//     sigma glyph (slot s) is emitted for both codepoints, marked below,
//     so word-final and medial sigma draw identically in 6c.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "data", "greek.jhf");
const out = path.resolve(here, "..", "..", "..", "src", "core", "hershey_greek.ts");

function parseJhf(file) {
  const lines = fs.readFileSync(file, "utf8").replace(/\r/g, "").split("\n");
  const glyphs = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i++];
    if (!line.trim()) continue;
    const n = parseInt(line.slice(5, 8), 10);
    let data = line.slice(8);
    while (data.length < 2 * n && i < lines.length) data += lines[i++];
    const R = "R".charCodeAt(0);
    const left = data.charCodeAt(0) - R;
    const right = data.charCodeAt(1) - R;
    const strokes = [];
    let cur = [];
    for (let k = 1; k < n; k++) {
      const a = data[2 * k];
      const b = data[2 * k + 1];
      if (a === " " && b === "R") {
        if (cur.length) strokes.push(cur);
        cur = [];
        continue;
      }
      cur.push([a.charCodeAt(0) - R, b.charCodeAt(0) - R]);
    }
    if (cur.length) strokes.push(cur);
    glyphs.push({ left, right, strokes });
  }
  return glyphs;
}

// Transliteration slot (ASCII char in greek.jhf) -> Unicode codepoint.
const SLOT_TO_CODEPOINT = {
  A: 0x0391, B: 0x0392, G: 0x0393, D: 0x0394, E: 0x0395, Z: 0x0396,
  H: 0x0397, Q: 0x0398, I: 0x0399, K: 0x039a, L: 0x039b, M: 0x039c,
  N: 0x039d, X: 0x039e, O: 0x039f, P: 0x03a0, R: 0x03a1, S: 0x03a3,
  T: 0x03a4, U: 0x03a5, F: 0x03a6, C: 0x03a7, Y: 0x03a8, W: 0x03a9,
  a: 0x03b1, b: 0x03b2, g: 0x03b3, d: 0x03b4, e: 0x03b5, z: 0x03b6,
  h: 0x03b7, q: 0x03b8, i: 0x03b9, k: 0x03ba, l: 0x03bb, m: 0x03bc,
  n: 0x03bd, x: 0x03be, o: 0x03bf, p: 0x03c0, r: 0x03c1, s: 0x03c3,
  t: 0x03c4, u: 0x03c5, f: 0x03c6, c: 0x03c7, y: 0x03c8, w: 0x03c9,
};
const NAMES = {
  0x0391: "Alpha", 0x0392: "Beta", 0x0393: "Gamma", 0x0394: "Delta",
  0x0395: "Epsilon", 0x0396: "Zeta", 0x0397: "Eta", 0x0398: "Theta",
  0x0399: "Iota", 0x039a: "Kappa", 0x039b: "Lambda", 0x039c: "Mu",
  0x039d: "Nu", 0x039e: "Xi", 0x039f: "Omicron", 0x03a0: "Pi",
  0x03a1: "Rho", 0x03a2: "final sigma (capital, unused)",
  0x03a3: "Sigma", 0x03a4: "Tau", 0x03a5: "Upsilon", 0x03a6: "Phi",
  0x03a7: "Chi", 0x03a8: "Psi", 0x03a9: "Omega",
  0x03b1: "alpha", 0x03b2: "beta", 0x03b3: "gamma", 0x03b4: "delta",
  0x03b5: "epsilon", 0x03b6: "zeta", 0x03b7: "eta", 0x03b8: "theta",
  0x03b9: "iota", 0x03ba: "kappa", 0x03bb: "lambda", 0x03bc: "mu",
  0x03bd: "nu", 0x03be: "xi", 0x03bf: "omicron", 0x03c0: "pi",
  0x03c1: "rho", 0x03c2: "final sigma", 0x03c3: "sigma",
  0x03c4: "tau", 0x03c5: "upsilon", 0x03c6: "phi", 0x03c7: "chi",
  0x03c8: "psi", 0x03c9: "omega",
};

const all = parseJhf(src);
if (all.length < 95) throw new Error(`expected at least 95 glyphs, got ${all.length}`);

const byCodepoint = new Map();
for (const [slot, cp] of Object.entries(SLOT_TO_CODEPOINT)) {
  const glyph = all[slot.codePointAt(0) - 32];
  if (!glyph || glyph.strokes.length === 0) {
    throw new Error(`slot ${slot} (U+${cp.toString(16)}) has no strokes`);
  }
  if (!(glyph.right - glyph.left > 0)) {
    throw new Error(`slot ${slot} (U+${cp.toString(16)}) has non-positive advance`);
  }
  byCodepoint.set(cp, { glyph, slot });
}
// Final sigma: no distinct glyph in the data; reuse the medial glyph.
byCodepoint.set(0x03c2, { glyph: byCodepoint.get(0x03c3).glyph, slot: "s (shared)" });

const fmtPt = (p) => `[${p[0]},${p[1]}]`;
const fmtStroke = (s) => `[${s.map(fmtPt).join(",")}]`;
const hex = (cp) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
const lines = [];
lines.push("// K115 stage 6c: Hershey Greek print stroke data, integers in Hershey");
lines.push("// units (baseline y=9, join line y=4, y grows down; print capitals span");
lines.push("// the ascender zone to the baseline, lowercase the x-height zone, like");
lines.push("// src/core/hershey_script.ts).");
lines.push("//");
lines.push("// Source: Dr. A. V. Hershey's single-line fonts (U.S. National Bureau of");
lines.push("// Standards), in the .jhf format created by James Hurt (Cognition, Inc.);");
lines.push("// file data/greek.jhf of the kamalmostafa/hershey-fonts distribution.");
lines.push("// The Hershey licence permits any use provided those acknowledgements");
lines.push("// ship with the data (see the hershey-fonts credit in notices/credits.ts,");
lines.push("// whose single shipped entry already covers this file: no new credit).");
lines.push("//");
lines.push("// The .jhf order is ASCII order; its Greek letters sit at transliteration");
lines.push("// slots (slot G/g is Gamma, Q/q Theta, C/c Chi, F/f Phi, X/x Xi, Y/y Psi,");
lines.push("// W/w Omega, H/h Eta, Z/z Zeta, S/s Sigma, R/r Rho, U/u Upsilon, the rest");
lines.push("// at their initial). The generator (.claude/probes/K115/gen_greek.mjs)");
lines.push("// holds the slot table and identifies each glyph from its strokes.");
lines.push("//");
lines.push("// Coverage: U+0391-U+03A1, U+03A3-U+03A9, U+03B1-U+03C1, U+03C2-U+03C9.");
lines.push("// Gaps (no glyph invented): U+03AA/U+03AB/U+03CA/U+03CB (dialytika) have");
lines.push("// no glyph in the data -- their NFD bases (plain iota/upsilon) ship bare");
lines.push("// until 6d -- and U+03C2 final sigma has no distinct glyph in greek.jhf,");
lines.push("// so it reuses the medial sigma glyph below (both entries are the slot-s");
lines.push("// strokes). Greek tonos likewise ships its base bare in 6c.");
lines.push("//");
lines.push("// GENERATED by .claude/probes/K115/gen_greek.mjs from");
lines.push("// .claude/probes/K115/data/greek.jhf -- do not edit by hand.");
lines.push("");
lines.push('import type { HersheyGlyph } from "./hershey_script";');
lines.push("");
lines.push("// Keyed by Unicode codepoint. A codepoint absent here has no glyph in");
lines.push("// the distribution data (see the gaps above); the builder advances");
lines.push("// past it like any unsupported character.");
lines.push("export const HERSHEY_GREEK: Readonly<Record<number, HersheyGlyph>> = {");
for (const cp of [...byCodepoint.keys()].sort((a, b) => a - b)) {
  const { glyph, slot } = byCodepoint.get(cp);
  const shared = cp === 0x03c2 ? "; final sigma reuses the medial glyph (no distinct glyph in the data)" : "";
  lines.push(
    `  ${cp}: { left: ${glyph.left}, right: ${glyph.right}, strokes: [${glyph.strokes.map(fmtStroke).join(",")}] }, // ${hex(cp)} ${NAMES[cp]} (slot '${slot}')${shared}`
  );
}
lines.push("};");
lines.push("");
fs.writeFileSync(out, lines.join("\n"));
console.log(`wrote ${out}: ${byCodepoint.size} glyphs`);
