// K1362 s6: gf_reg.ts's register-resident transform. The transform is text: a toy program pins its reads, writes and
// nesting exactly; on the real programs (every tier shape, the full program) no converted array is left indexed, and
// the probe program is refused (it keeps its arrays). Exactness on the GPU is the cmp bench's (0 px against full).
import { describe, expect, it } from "vitest";
import { constantLoops, GF_PACK, packArrays, scalarizeArrays } from "../../src/render/gpu_field/gf_reg";
import { gfFs, type GfTier } from "../../src/render/gpu_field/gf_glsl";

describe("gf_reg", () => {
  it("rewrites reads, writes and nested indices on a toy program", () => {
    const src = "float a[N]; IQ int b[2];\nvoid main() { int t[3]; b[0] = 1; a[b[0]] = a[1] + 2.0; t[b[1]] = 0; if (a[0] == a[1]) b[1] = int(a[2]); }";
    const out = scalarizeArrays(src, { N: 3 });
    expect(out).toContain("float a_0, a_1, a_2;");
    expect(out).toContain("IQ int b_0, b_1;");
    expect(out).toContain("int t_0, t_1, t_2;");
    expect(out).toContain("float g_a(int i) { return i == 0 ? a_0 : i == 1 ? a_1 : a_2; }");
    expect(out).toContain("void s_b(int i, IQ int x) { if (i == 0) b_0 = x; else b_1 = x; }");
    expect(out).toContain("s_b(0, 1);");
    expect(out).toContain("s_a(g_b(0), g_a(1) + 2.0);");
    expect(out).toContain("s_t(g_b(1), 0);");
    expect(out).toContain("if (g_a(0) == g_a(1)) s_b(1, int(g_a(2)));");
    expect(out).not.toMatch(/\b(a|b|t)\s*\[/);
  });

  it("leaves no converted array indexed in the real programs", () => {
    const tiers: (GfTier | undefined)[] = [undefined, { p: 3, k: 2, ramps: true }, { p: 2, k: 2, ramps: false }, { p: 4, k: 3, ramps: true }];
    for (const t of tiers) {
      const plain = gfFs(false, true, t, {});
      const reg = gfFs(false, true, t, { reg: true });
      const names = [...plain.matchAll(/\b(?:IQ |FQ )?(?:int|float|bool) (\w+)\[\w+\];/g)].map((m) => m[1]);
      expect(names).toEqual(expect.arrayContaining(["pc", "pd", "kk", "sid", "sord", "tj"]));
      for (const n of names) expect(reg).not.toMatch(new RegExp(`\\b${n}\\s*\\[`));
      expect(reg).toContain("g_pc(");
    }
  });

  it("gives the loops over the per-pixel counts constant trip counts", () => {
    const toy = "for (int j = 0; j < np; j++) a; for (int i = 1; i + 1 < ns && b < 1.0; i++) { c; } for (int c = 0; c <= nr; c++) d; for (int q = c0; q < c0 + cn; q++) e;";
    expect(constantLoops(toy, { np: 3, ns: 5, nr: 2 })).toBe(
      "for (int j = 0; j < 3; j++) if (!(j < np)) break; else a; " +
        "for (int i = 1; i < 5; i++) if (!(i + 1 < ns && b < 1.0)) break; else { c; } " +
        "for (int c = 0; c < 3; c++) if (!(c <= nr)) break; else d; " +
        "for (int q = c0; q < c0 + cn; q++) e;",
    );
    for (const t of [undefined, { p: 3, k: 2, ramps: true }]) {
      const src = gfFs(false, true, t, { unroll: true, reg: true });
      expect(src).not.toMatch(/for \(int \w+ = [^;]+; \w+( \+ 1)? <=? (np|nk|ns|nr|nTj)\b/);
    }
  });

  it("packs the per-piece arrays into one vec4 and one ivec4 array, access for access", () => {
    const toy = "IQ int pc[N]; float pd[N]; float pfx[N]; float pfy[N]; float pkey[N]; IQ int plo[N]; IQ int phi[N]; IQ int pg[N]; float q[N];\n" +
      "void main() { pd[pc[0]] = pfx[1] + q[2]; pg[1] = plo[phi[0]]; pkey[0] = pfy[0]; }";
    expect(packArrays(toy)).toBe(
      "vec4 pPF[N]; IQ ivec4 pPI[N];\n        float q[N];\n" +
        "void main() { pPF[pPI[0].x].x = pPF[1].y + q[2]; pPI[1].w = pPI[pPI[0].z].y; pPF[0].w = pPF[0].z; }",
    );
    expect(() => packArrays(toy.replace("float pd[N]", "float pd[M]"))).toThrow(/pd/);
    expect(() => packArrays(toy.replace("IQ int pg[N];", ""))).toThrow(/pg/);
    // the real programs: no packed field left indexed, and unpacking by text gives back the plain program's body
    const unpack = new Map<string, string>();
    for (const g of GF_PACK) g.fields.forEach((f, i) => unpack.set(`${g.name}.${"xyzw"[i]}`, f));
    for (const t of [undefined, { p: 3, k: 2, ramps: true }, { p: 2, k: 2, ramps: false }]) {
      const plain = gfFs(false, true, t, {});
      const packed = gfFs(false, true, t, { pack: true });
      for (const g of GF_PACK) for (const f of g.fields) expect(packed).not.toMatch(new RegExp(`\\b${f}\\s*\\[`));
      let body = packed.slice(packed.indexOf("void main"));
      for (let k = 0; k < 4; k++) body = body.replace(/\b(pPF|pPI)\[((?:[^[\]]|\[[^[\]]*\])*)\]\.([xyzw])/g, (_a, n: string, i: string, c: string) => `${unpack.get(`${n}.${c}`)}[${i}]`);
      expect(body).toBe(plain.slice(plain.indexOf("void main")));
    }
  });

  it("refuses the probe program", () => {
    expect(() => scalarizeArrays(gfFs(true, true), { MAXP: 8, MAXK: 6, MAXS: 14 })).toThrow(/probe/);
    expect(gfFs(true, true, undefined, { reg: true, unroll: true })).toBe(gfFs(true, true));
  });
});
