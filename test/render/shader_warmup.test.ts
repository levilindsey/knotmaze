import { describe, it, expect } from "vitest";
import { ShaderWarmup, warmContextFor, type WarmGl } from "../../src/render/shader_warmup";
import type { WarmSource } from "../../src/render/program_registry";

// K307 stage 2: the warm-up's poll, relink, timeout, failure, no-extension
// and context-loss paths against a fake GL. The fake answers
// COMPLETION_STATUS_KHR from a per-program flag the test sets.

const COMPLETION = 0x91b1;
const LINK = 0x8b82;
const ATTRS = 0x8b89;

interface FakeProgram {
  id: number;
  shaders: FakeShader[];
  links: number;
  complete: boolean;
  ok: boolean;
  attribs: string[];
  bound: Array<[number, string]>;
  deleted: boolean;
}
interface FakeShader {
  type: number;
  source: string;
}

class FakeGl implements WarmGl {
  lost = false;
  programs: FakeProgram[] = [];
  completionQueries = 0;
  statusReads = 0;
  failing = new Set<string>();
  attribs: Record<string, string[]> = {};
  constructor(public parallelExt = true) {}
  nameOf(p: FakeProgram): string {
    const fs = p.shaders.find((s) => s.type === 0x8b30)?.source ?? "";
    return /SHADER_NAME (\S+)/.exec(fs)?.[1] ?? "?";
  }
  byName(name: string): FakeProgram {
    const p = this.programs.find((q) => this.nameOf(q) === name);
    if (!p) throw new Error(`no program ${name}`);
    return p;
  }
  finish(...names: string[]): void {
    for (const n of names) this.byName(n).complete = true;
  }
  createShader(type: number): WebGLShader {
    return { type, source: "" } as FakeShader as unknown as WebGLShader;
  }
  shaderSource(sh: WebGLShader, src: string): void {
    (sh as unknown as FakeShader).source = src;
  }
  compileShader(): void {}
  getShaderParameter(): unknown {
    return false;
  }
  getShaderInfoLog(sh: WebGLShader): string {
    return `bad ${(sh as unknown as FakeShader).type === 0x8b30 ? "fragment" : "vertex"}`;
  }
  deleteShader(): void {}
  createProgram(): WebGLProgram {
    const p: FakeProgram = {
      id: this.programs.length,
      shaders: [],
      links: 0,
      complete: false,
      ok: true,
      attribs: [],
      bound: [],
      deleted: false,
    };
    this.programs.push(p);
    return p as unknown as WebGLProgram;
  }
  attachShader(p: WebGLProgram, sh: WebGLShader): void {
    (p as unknown as FakeProgram).shaders.push(sh as unknown as FakeShader);
  }
  linkProgram(p: WebGLProgram): void {
    const fp = p as unknown as FakeProgram;
    fp.links++;
    fp.complete = false;
    const name = this.nameOf(fp);
    fp.ok = !this.failing.has(name);
    fp.attribs = this.attribs[name] ?? [];
  }
  getProgramParameter(p: WebGLProgram, pname: number): unknown {
    const fp = p as unknown as FakeProgram;
    if (fp.deleted) throw new Error("query on a deleted program");
    if (pname === COMPLETION) {
      this.completionQueries++;
      return fp.complete;
    }
    if (pname === LINK) {
      // A blocking read waits the link out.
      this.statusReads++;
      fp.complete = true;
      return fp.ok;
    }
    if (pname === ATTRS) return fp.attribs.length;
    return null;
  }
  getProgramInfoLog(): string {
    return "link error";
  }
  getActiveAttrib(p: WebGLProgram, i: number): { name: string } {
    return { name: (p as unknown as FakeProgram).attribs[i] };
  }
  bindAttribLocation(p: WebGLProgram, i: number, name: string): void {
    (p as unknown as FakeProgram).bound.push([i, name]);
  }
  deleteProgram(p: WebGLProgram | null): void {
    if (p) (p as unknown as FakeProgram).deleted = true;
  }
  getExtension(name: string): unknown {
    return this.parallelExt && name === "KHR_parallel_shader_compile" ? {} : null;
  }
  isContextLost(): boolean {
    return this.lost;
  }
}

const ES3 = "#version 300 es\n";
function src(name: string, es300 = true, size = 10): WarmSource {
  return {
    name,
    vertex: `${es300 ? ES3 : ""}#define SHADER_NAME ${name}-vertex\nvoid main(){}`,
    fragment: `${es300 ? ES3 : ""}#define SHADER_NAME ${name}\n${"x".repeat(size)}`,
  };
}

function setup(parallel = true, timeoutMs = 15000) {
  const gl = new FakeGl(parallel);
  let t = 0;
  const logs: string[] = [];
  const w = new ShaderWarmup(gl, { now: () => t, timeoutMs, log: (m) => logs.push(m) });
  return { gl, w, logs, advance: (ms: number) => (t += ms) };
}

describe("shader warm-up (K307)", () => {
  it("links everything at submit and reads nothing until the next poll", () => {
    const { gl, w } = setup();
    w.submit(1, [src("a"), src("b"), src("c")]);
    expect(gl.programs.map((p) => p.links)).toEqual([1, 1, 1]);
    expect(gl.completionQueries + gl.statusReads).toBe(0);
    expect(w.wave1Done).toBe(false);
  });

  it("polls in order and stops at the first program still compiling", () => {
    const { gl, w } = setup();
    let fired = 0;
    w.afterWave1(() => fired++);
    w.submit(1, [src("a"), src("b"), src("c")]);
    w.poll();
    expect(gl.completionQueries).toBe(1);
    gl.finish("b", "c");
    w.poll();
    expect(gl.completionQueries).toBe(2);
    expect(gl.statusReads).toBe(0);
    expect(w.wave1Done).toBe(false);
    gl.finish("a");
    w.poll();
    expect(gl.statusReads).toBe(3);
    expect(gl.programs.every((p) => p.deleted)).toBe(true);
    expect(w.wave1Done).toBe(true);
    expect(fired).toBe(1);
    w.poll();
    expect(fired).toBe(1);
    const r = w.report();
    expect(r.wave1?.names).toEqual(["a", "b", "c"]);
    expect(r.wave1?.doneAt).not.toBeNull();
    expect(r.polls).toBe(3);
  });

  it("relinks a non-ES 3.00 program with its sorted attributes, as pixi does", () => {
    const { gl, w } = setup();
    gl.attribs.old = ["bPos", "gl_VertexID", "aColor"];
    w.submit(1, [src("old", false), src("new")]);
    gl.finish("old", "new");
    w.poll();
    const old = gl.byName("old");
    expect(old.links).toBe(2);
    expect(old.bound).toEqual([
      [0, "aColor"],
      [1, "bPos"],
    ]);
    expect(old.deleted).toBe(false);
    expect(gl.byName("new").links).toBe(1);
    expect(gl.byName("new").deleted).toBe(true);
    expect(w.wave1Done).toBe(false);
    gl.finish("old");
    w.poll();
    expect(old.deleted).toBe(true);
    expect(old.links).toBe(2);
    expect(w.wave1Done).toBe(true);
    expect(w.report().relinked).toEqual(["old"]);
  });

  it("times out wave 1 after 15 s and keeps polling the rest", () => {
    const { gl, w, logs, advance } = setup();
    let fired = 0;
    w.afterWave1(() => fired++);
    w.submit(1, [src("slow"), src("quick")]);
    gl.finish("quick");
    advance(14999);
    w.poll();
    expect(w.wave1Done).toBe(false);
    advance(1);
    w.poll();
    expect(w.wave1Done).toBe(true);
    expect(fired).toBe(1);
    expect(w.report().wave1?.timedOut).toBe(true);
    expect(logs.some((l) => l.includes("timed out"))).toBe(true);
    expect(w.idle).toBe(false);
    gl.finish("slow");
    w.poll();
    expect(w.idle).toBe(true);
    expect(gl.programs.every((p) => p.deleted)).toBe(true);
    expect(fired).toBe(1);
  });

  it("logs a failed link by name and moves on", () => {
    const { gl, w, logs } = setup();
    gl.failing.add("broken");
    w.submit(1, [src("broken"), src("fine")]);
    gl.finish("broken", "fine");
    w.poll();
    expect(w.wave1Done).toBe(true);
    const r = w.report();
    expect(r.failures.map((f) => f.name)).toEqual(["broken"]);
    expect(r.failures[0].log).toContain("link error");
    expect(r.failures[0].log).toContain("bad fragment");
    expect(logs.some((l) => l.includes("broken failed to link"))).toBe(true);
    expect(gl.programs.every((p) => p.deleted)).toBe(true);
  });

  it("without the extension reads every status at the first poll and skips wave 2", () => {
    const { gl, w } = setup(false);
    expect(w.parallel).toBe(false);
    w.setWave2(() => [src("later")]);
    w.submit(1, [src("a"), src("b")]);
    expect(gl.statusReads).toBe(0);
    w.poll();
    expect(gl.completionQueries).toBe(0);
    expect(gl.statusReads).toBe(2);
    expect(w.wave1Done).toBe(true);
    w.startWave2();
    expect(gl.programs.length).toBe(2);
    expect(w.report().wave2Skipped).toContain("KHR_parallel_shader_compile");
  });

  it("aborts on a lost context: the gate opens and no GL call follows", () => {
    const { gl, w, logs } = setup();
    let fired = 0;
    w.afterWave1(() => fired++);
    w.submit(1, [src("a")]);
    gl.lost = true;
    w.poll();
    expect(w.wave1Done).toBe(true);
    expect(fired).toBe(1);
    expect(w.idle).toBe(true);
    expect(gl.completionQueries).toBe(0);
    expect(gl.programs[0].deleted).toBe(false);
    expect(w.report().aborted).toBe("context lost");
    expect(logs.some((l) => l.includes("aborted"))).toBe(true);
    w.startWave2();
    expect(gl.programs.length).toBe(1);
  });

  it("runs wave 2 once, never gating, and skips sources already submitted", () => {
    const { gl, w } = setup();
    w.setWave2(() => [src("a"), src("x")]);
    w.submit(1, [src("a")]);
    gl.finish("a");
    w.poll();
    expect(w.wave1Done).toBe(true);
    w.startWave2();
    w.startWave2();
    expect(gl.programs.map((p) => gl.nameOf(p))).toEqual(["a", "x"]);
    expect(w.report().wave2?.names).toEqual(["x"]);
    expect(w.idle).toBe(false);
    gl.finish("x");
    w.poll();
    expect(w.idle).toBe(true);
    expect(w.report().wave2?.doneAt).not.toBeNull();
    expect(w.hasSubmitted(src("x").vertex, src("x").fragment)).toBe(true);
  });

  it("opens at once with no context or nothing to compile", () => {
    const none = new ShaderWarmup(null, { log: () => {} });
    expect(none.wave1Done).toBe(true);
    let fired = 0;
    none.afterWave1(() => fired++);
    expect(fired).toBe(1);
    none.poll();
    none.startWave2();
    expect(none.report().aborted).toBe("no WebGL context");
    const { w } = setup();
    w.submit(1, []);
    expect(w.wave1Done).toBe(true);
  });

  it("builds the context the page's settings need", () => {
    const daily = {
      mazeFabric: true,
      exploration: "off",
      pluckRipple: "glint",
      backgroundIntensity: 0.5,
      backgroundSpeed: -1,
      backgroundScale: 1,
      backgroundDetail: 1,
      backgroundFibers: 1,
      backgroundGrain: 1,
      backgroundAngle: -1,
    };
    expect(warmContextFor(daily, "vellum", false, 16)).toEqual({
      fabric: true,
      explore: false,
      fog: false,
      reduced: false,
      ripple: true,
      bgIds: ["vellum"],
      maxBatchTextures: 16,
    });
    const c = warmContextFor({ ...daily, exploration: "threads" }, "none", true, 8);
    expect(c).toMatchObject({ explore: true, fog: false, ripple: false, bgIds: [], maxBatchTextures: 8 });
    expect(warmContextFor({ ...daily, exploration: "fog", mazeFabric: false }, "mist", false, 16)).toMatchObject({
      fabric: false,
      explore: false,
      fog: false,
      bgIds: ["mist"],
    });
    expect(warmContextFor({ ...daily, backgroundSpeed: 1 }, "vellum", false, 16).bgIds).toEqual([
      "vellum",
      "vellum-drift",
    ]);
  });
});
