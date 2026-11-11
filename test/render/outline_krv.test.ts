// K1291 s3: rp=outline's fill and band programs come twice, with the
// reveal, intro FX and thread reveal code (KRV 1) and without it (KRV 0,
// drawn whenever none of the three runs). Without it the fill must have no
// discard (a discard costs the fill its early depth test: stage 2's +2 ms)
// and neither program may read the reveal's state.
import { describe, expect, it } from "vitest";
import { KRV_SHADERS, krvSource } from "../../src/render/outline/outline_app";

/** The KRV directives as the GLSL preprocessor reads them (not nested). */
function pre(src: string): string {
  const on = /^#define KRV (\d)$/m.exec(src);
  if (!on) throw new Error("no KRV define");
  const krv = on[1] === "1";
  const out: string[] = [];
  let keep: boolean | null = null;
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (t === "#if KRV" || t === "#if !KRV") {
      if (keep !== null) throw new Error("nested KRV");
      keep = t === "#if KRV" ? krv : !krv;
    } else if (t === "#else" && keep !== null) keep = !keep;
    else if (t === "#endif" && keep !== null) keep = null;
    else if (keep !== false) out.push(line);
  }
  if (keep !== null) throw new Error("unclosed KRV");
  return out.join("\n");
}
const mainOf = (src: string): string => src.slice(src.indexOf("void main()"));

describe("K1291 s3 KRV program pairs", () => {
  it("puts the define on the line after #version and needs that line", () => {
    const s = krvSource("#version 300 es\nvoid main() {}", false);
    expect(s.split("\n").slice(0, 2)).toEqual(["#version 300 es", "#define KRV 0"]);
    expect(() => krvSource("void main() {}", true)).toThrow(/version/);
  });

  it("the fill without KRV: no discard, no reveal, FX or thread reveal state", () => {
    const lite = pre(krvSource(KRV_SHADERS.APP_FS, false));
    const m = mainOf(lite);
    expect(m).not.toMatch(/\bdiscard\s*;/);
    for (const w of ["uRvOn", "uKFx", "uKExplore", "rvMask", "rvFoot", "uFp"]) expect(m).not.toContain(w);
    const mat = lite.slice(lite.indexOf("vec3 appMaterial("), lite.indexOf("void main()"));
    for (const w of ["kFxColor(", "kExploreAt(", "kExploreLook("]) expect(mat).not.toContain(w);
    expect(m).toContain("o = vec4(col, 1.0);");
  });

  it("the fill with KRV keeps all of it", () => {
    const full = pre(krvSource(KRV_SHADERS.APP_FS, true));
    const m = mainOf(full);
    for (const w of ["discard", "uRvOn", "uKFx", "rvFoot", "uFp"]) expect(m).toContain(w);
    expect(full).toContain("kFxColor(");
    expect(full).toContain("al *= ev;");
    expect(m).not.toContain("o = vec4(col, 1.0);");
  });

  it("the band without KRV: whole, no discard, no reveal or thread reveal reads", () => {
    const m = mainOf(pre(krvSource(KRV_SHADERS.BAND_FS, false)));
    expect(m).not.toMatch(/\bdiscard\s*;/);
    for (const w of ["rvMaskS(vCh", "exVisS("]) expect(m).not.toContain(w);
    const f = mainOf(pre(krvSource(KRV_SHADERS.BAND_FS, true)));
    for (const w of ["discard", "rvMaskS(vCh", "exVisS("]) expect(f).toContain(w);
  });
});
