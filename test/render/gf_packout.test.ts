// K1468: the app's gf programs write ONE output (gf_pass.ts packForm) and the composites read it (packComp). ANGLE's
// D3D11 link compiles a pixel shader for the first output alone; a program with more outputs compiles its real
// variant at its first draw, on the GPU process's main thread (cold: the watchdog's kill). Bit-exactness against the
// RGBA8 targets is a GPU fact, measured by .claude/probes/K1468/exact.mjs, not here.
import { describe, expect, it } from "vitest";
import { gfFs, homeForm } from "../../src/render/gpu_field/gf_glsl";
import { lookForm, LOOK_COMP_FS } from "../../src/render/gpu_field/gf_look";
import { COMP_FS, cornerPlan, GF_TIERS, GfPass, packComp, packForm } from "../../src/render/gpu_field/gf_pass";
import { revealForm } from "../../src/render/gpu_field/gf_reveal";

/** The fragment outputs a program declares once the preprocessor has taken the app's branch (no PROBE, no SPLIT1). */
function appOutputs(src: string): string[] {
  const a = src.indexOf("#ifdef PROBE\nlayout(location = 0) out vec4 o0;");
  const e = src.indexOf("#else\n", src.indexOf("layout(location = MAXP) out uvec2 o3;", a));
  const end = src.indexOf("#endif\n", e);
  return src.slice(e + 6, end).split("\n").filter((l) => /\bout\b/.test(l));
}

const forms: [string, (s: string) => string][] = [
  ["plain", (s) => s],
  ["reveal", revealForm],
  ["look", lookForm],
  ["look+reveal", (s) => lookForm(revealForm(s))],
];

describe("K1468 packForm", () => {
  const srcs: [string, string][] = [];
  for (const home of [false, true]) {
    const hf = home ? homeForm : (s: string): string => s;
    const tiers = [...GF_TIERS.flatMap((t) => cornerPlan(t).map((p) => p.tier)), undefined];
    for (const t of tiers) for (const [n, f] of forms) srcs.push([`${n}${home ? " home" : ""} ${t ? "tier" : "full"}`, f(hf(gfFs(false, true, t)))]);
  }
  it("before it, the look forms declare three outputs (the draw-time variant)", () => {
    expect(appOutputs(srcs.find(([n]) => n.startsWith("look "))![1]).length).toBe(3);
  });
  it.each(srcs)("%s: one RGBA32UI output, written from o0, o1 and o2 at main's end", (_n, src) => {
    const p = packForm(src);
    expect(appOutputs(p)).toEqual(["layout(location = 0) out highp uvec4 oP; // K1468: packForm's one output"]);
    expect(p).toContain("vec4 o0 = vec4(0.0); vec4 o1 = vec4(0.0); vec4 o2 = vec4(0.0);");
    expect(p.split("oP = uvec4(gfB(o0), gfB(o1), gfB(o2), 0u);").length).toBe(2);
    // the write sits after the program's own writes (the last one before the split's depth block)
    expect(p.indexOf("oP = uvec4(")).toBeGreaterThan(p.lastIndexOf("o0 = vec4(oInk, oCov"));
    // the probe and split branches are untouched
    expect(p).toContain("#ifdef PROBE\nlayout(location = 0) out vec4 o0;\nlayout(location = 1) out vec4 o1;\nlayout(location = 2) out vec4 o2;");
  });
  it("throws when the output block moved (a silent no-op would bring the draw-time compile back)", () => {
    expect(() => packForm("void main() {}")).toThrow(/packForm/);
    expect(() => packForm(packForm(srcs[0][1]))).toThrow(/packForm/);
  });
  it("gfB: the fp16 truncation (AMD's colour export) then round, as exact.mjs measured", () => {
    expect(packForm(srcs[0][1])).toContain("uintBitsToFloat(floatBitsToUint(clamp(v, 0.0, 1.0)) & 0xffffe000u)");
  });
});

describe("K1468 packComp", () => {
  it("both composites read one usampler2D, the three targets as its x, y and z words", () => {
    const comp = packComp(LOOK_COMP_FS);
    expect(comp).toContain("uniform highp usampler2D uC;");
    expect(comp).not.toMatch(/\buCo\b|\buHi\b|uniform sampler2D/);
    expect(comp).toContain("vec4 c = gfU8(texelFetch(uC, q, 0).x);");
    expect(comp).toContain("vec4 k = gfU8(texelFetch(uC, q, 0).y);");
    expect(comp).toContain("vec4 hh = gfU8(texelFetch(uC, q, 0).z);");
    expect(comp).toContain("ivec2 sz = textureSize(uC, 0);");
    // K1468 s2: the fringe search tests each tap's alpha byte and converts only the chosen texel
    expect(comp).toContain("highp uint jw = texelFetch(uC, r, 0).y;");
    expect(comp).toContain("if ((jw >> 24) != 0u && dd < bd) { bd = dd; rb = r; }");
    expect(comp).toContain("if (bd < 1e9) { highp uvec2 wb = texelFetch(uC, rb, 0).yz; k = gfU8(wb.x); hh = gfU8(wb.y); }");
    expect(comp).not.toMatch(/\bj\.a\b|k = j;/);
    // the table is k / 255 rounded to float, the RGBA8 fetch's value
    const m = /const float GF_U8\[256\] = float\[256\]\(([^)]*)\);/.exec(comp)!;
    const v = m[1].split(", ").map(Number);
    expect(v.length).toBe(256);
    for (let k = 0; k < 256; k++) expect(Math.fround(v[k])).toBe(Math.fround(k / 255));
  });
});

describe("K1454 (26D): the composites can draw into the pluck ripple's filter texture", () => {
  // Pixi renders a non-root target with its Y flipped against the canvas
  // (calculateProjection's flipY), so a composite bound for the ripple
  // filter's texture reads its target at the mirrored row; on the canvas
  // (uFlip 0) the read is the old one, texel for texel.
  const FLIP = "if (uFlip > 0.5) q.y = textureSize(uC, 0).y - 1 - q.y;";
  it("both composite shaders flip the fetch row under uFlip", () => {
    for (const fs of [COMP_FS, LOOK_COMP_FS]) {
      expect(fs).toContain("uniform float uFlip;");
      expect(fs).toContain("ivec2 q = ivec2(gl_FragCoord.xy);");
      expect(fs).toContain(FLIP);
      expect(fs.indexOf(FLIP)).toBeLessThan(fs.indexOf("texelFetch(uC, q, 0)"));
    }
    // the flip survives packComp (uC stays uC; textureSize(uC) is its own)
    const packed = packComp(LOOK_COMP_FS);
    expect(packed).toContain(FLIP);
    expect(packed).toContain("vec4 c = gfU8(texelFetch(uC, q, 0).x);");
    expect(packComp(COMP_FS)).toContain(FLIP);
  });
  it("gf_app composites into the bound filter framebuffer, never rebinds the canvas under a filter", async () => {
    const { readFileSync } = await import("node:fs");
    const app = readFileSync(new URL("../../src/render/gpu_field/gf_app.ts", import.meta.url), "utf8");
    expect(app).toContain("flip: true");
    expect(app).not.toContain("bindFramebuffer(g.FRAMEBUFFER, null)");
    // in the filter's texture (cleared to alpha 0, and the filter reads the
    // alpha) the composite writes its own alpha (K1474: on the canvas too, so
    // a transparent backdrop cannot lighten the threads; the no-ripple frame
    const { readFileSync: read2 } = await import("node:fs");
    const pass = read2(new URL("../../src/render/gpu_field/gf_pass.ts", import.meta.url), "utf8");
    expect(pass).toContain("gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);");
  });
});

describe("K1474 (26F): the composite writes its alpha on the canvas too", () => {
  it("never keeps the destination alpha (a transparent backdrop lightened every thread by its colour)", async () => {
    const { readFileSync } = await import("node:fs");
    const pass = readFileSync(new URL("../../src/render/gpu_field/gf_pass.ts", import.meta.url), "utf8");
    // GfComposite.draw's one blend call: rgb and alpha both the standard premultiplied over
    expect(pass).toContain("gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);");
    expect(pass).not.toContain("gl.ZERO, gl.ONE");
    // both composite shaders emit the coverage as the alpha the blend writes
    expect(COMP_FS).toContain("o = vec4(uInk * ink + uFill * cov * (1.0 - ink), ink + (1.0 - ink) * cov);");
    expect(LOOK_COMP_FS).toContain("if (uLook == 0) o = vec4(C * cov, cov);");
  });
});

describe("K1468 GfPass { pack }", () => {
  function fakeGl(srcs: string[]): WebGL2RenderingContext {
    return new Proxy({}, {
      get: (_t, p) => (p === "shaderSource" ? (_s: unknown, src: string) => { srcs.push(src); } : typeof p === "string" && /^[A-Z_0-9]+$/.test(p) ? 1 : () => ({})),
    }) as unknown as WebGL2RenderingContext;
  }
  it("packs every app program, and nothing without the option", () => {
    for (const pack of [true, false]) {
      const srcs: string[] = [];
      const pass = new GfPass(fakeGl(srcs), false, undefined, undefined, false, { pack });
      (pass as unknown as { flushPrograms(): void }).flushPrograms();
      const fs = srcs.filter((s) => s.includes("void main") && s.includes("uMap"));
      expect(fs.length).toBeGreaterThan(0);
      for (const s of fs) expect(s.includes("out highp uvec4 oP;")).toBe(pack);
    }
  });
  it("the probe pass never packs", () => {
    const srcs: string[] = [];
    const pass = new GfPass(fakeGl(srcs), true, undefined, undefined, false, { pack: true });
    expect(pass.pack).toBe(false);
    expect(srcs.some((s) => s.includes("oP"))).toBe(false);
  });
});
