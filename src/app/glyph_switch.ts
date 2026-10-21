// K115 stage 9: the #glyphs2 switch for the glyph redesign, read ONCE at
// module load, before main.ts's URL rewrite drops the hash (probes.md,
// the K307 prototype's #seq). `#glyphs2` turns it on ("1");
// `#glyphs2=forks,xh2` adds probe options (glyph_graph.ts). It never
// enters a link, PARAM_DEFAULTS or the codec: off, every scene builds
// exactly as before.

function readGlyphSwitch(): string {
  try {
    const h = typeof location !== "undefined" ? location.hash : "";
    const m = /^#glyphs2(?:=([\w,.-]*))?$/.exec(h);
    if (!m) return "";
    return m[1] !== undefined && m[1] !== "" ? m[1] : "1";
  } catch {
    return "";
  }
}

export const GLYPHS2: string = readGlyphSwitch();
