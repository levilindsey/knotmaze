// K1456 (26A): rp=gf's cold first load. The app's GfPass must not block the main thread compiling its
// 40-63k-char programs: it issues only the program the first frame routes to (the full program, which
// draws every pixel exactly on its own), polls COMPLETION_STATUS_KHR once a frame, and issues the tier
// and the other forms only once that one is ready. Today's renderer stays on screen until then (gf_app).
import { describe, expect, it } from "vitest";
import { GfPass } from "../../src/render/gpu_field/gf_pass";

const COMPLETION = 0x91b1;

/** A WebGL2 stand-in whose programs complete after `after` completion polls (per program). */
function fakeGl(after = 2, linkOk = true) {
  const srcs: string[] = [];
  const polls = new Map<object, number>();
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    createShader: () => ({}),
    shaderSource: (_s: unknown, src: string) => { srcs.push(src); },
    compileShader: () => {},
    getShaderParameter: () => true,
    getShaderInfoLog: () => "shader log",
    createProgram: () => ({}),
    attachShader: () => {},
    deleteShader: () => {},
    deleteProgram: () => {},
    linkProgram: (p: object) => { polls.set(p, 0); },
    getProgramParameter: (p: object, k: number) => {
      if (k === COMPLETION) { const n = (polls.get(p) ?? 0) + 1; polls.set(p, n); return n > after; }
      return linkOk;
    },
    getProgramInfoLog: () => "link log",
    getUniformLocation: () => ({}),
    getExtension: () => ({}),
    createVertexArray: () => ({}),
    deleteVertexArray: () => {},
    createTexture: () => ({}),
    deleteTexture: () => {},
    deleteQuery: () => {},
  };
  return { gl: gl as unknown as WebGL2RenderingContext, srcs };
}

describe("K1456: the app pass compiles without blocking", () => {
  it("issues nothing at construction, then only the full program, then the routed tier", () => {
    const { gl, srcs } = fakeGl();
    const pass = new GfPass(gl, false);
    expect(srcs.length).toBe(0);
    expect(pass.drawReady()).toBe(false);
    pass.pollPrograms();
    // one program issued (vertex + fragment), not yet complete: still not drawable
    expect(srcs.length).toBe(2);
    expect(pass.drawReady()).toBe(false);
    expect(pass.pendingCompile()).toBe(true);
    // let it complete; the full program alone draws the frame exactly
    for (let i = 0; i < 6 && !pass.drawReady(); i++) pass.pollPrograms();
    expect(pass.drawReady()).toBe(true);
    // the routed tier is issued only once the full program is ready (here, in the same poll)
    expect(srcs.length).toBe(4);
    pass.flushPrograms();
    expect(pass.pendingCompile()).toBe(false);
    expect(pass.compileError()).toBeNull();
    // base set: tier (corners), tier (corner-free) and full = 3 programs sharing one vertex source
    // (sealing relinks repeat the same strings, so count distinct sources)
    expect(new Set(srcs).size).toBe(4);
    pass.dispose();
  });

  it("lists every set's sources for the compile worker, the look set first", () => {
    const { gl } = fakeGl();
    const pass = new GfPass(gl, false);
    const sources = pass.compileSources();
    // four sets (plain, look, reveal, look+reveal) of three programs, duplicates removed
    expect(sources.length).toBe(12);
    expect(new Set(sources.map(([, fs]) => fs)).size).toBe(12);
    for (const [vs] of sources) expect(vs).toContain("gl_VertexID");
    pass.dispose();
  });

  it("K1472 s2: the gate holds a link until the compile worker has linked that source", () => {
    const { gl, srcs } = fakeGl();
    const pass = new GfPass(gl, false);
    const allowed = new Set<string>();
    pass.compileGate = (src) => allowed.has(src);
    for (let i = 0; i < 4; i++) pass.pollPrograms();
    expect(srcs.length).toBe(0);
    expect(pass.pendingCompile()).toBe(true);
    const first = pass.issueOrder()[0];
    allowed.add(first);
    pass.pollPrograms();
    expect(srcs).toEqual([expect.any(String), first]);
    pass.dispose();
  });

  it("K1472 s2: during the reveal the set it ends on goes first, then the reveal's own full program", () => {
    const { gl } = fakeGl();
    const pass = new GfPass(gl, false);
    const rest = pass.issueOrder();
    (pass as unknown as { rv: { oK: number } | null }).rv = { oK: 0 };
    const during = pass.issueOrder();
    expect(during[0]).toBe(rest[0]);
    expect(rest).not.toContain(during[1]); // the reveal form's full program, second
    expect(new Set(during).size).toBe(during.length);
    pass.dispose();
  });

  it("a failed link surfaces as a compile error, never a silent blank", () => {
    const { gl } = fakeGl(1, false);
    const pass = new GfPass(gl, false);
    for (let i = 0; i < 8 && !pass.compileError(); i++) pass.pollPrograms();
    expect(pass.compileError()).toContain("link log");
    expect(pass.drawReady()).toBe(false);
    pass.dispose();
  });

  it("the probe pass still compiles synchronously (its readbacks are immediate)", () => {
    const { gl, srcs } = fakeGl();
    const pass = new GfPass(gl, true);
    expect(srcs.length).toBeGreaterThan(0);
    expect(pass.pendingCompile()).toBe(false);
    pass.dispose();
  });
});
