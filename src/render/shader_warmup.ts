// K307: THE SHADER WARM-UP. On a cold GPU program cache, pixi links
// each program at its first draw and reads LINK_STATUS at once, so the page
// (and on Windows the whole screen: every present waits on the GPU
// process's main thread) stops for the compile: 2.8 s for section-rgb under
// FXC. The warm-up compiles and links what the intro draws BEFORE the first
// visible frame and deletes each program; pixi's later link of the same
// source is a cache hit (about 25 ms). Lore: .claude/rules/render-shaders.md;
// brief: docs/design/K307_intro_freezes.md, "Stage 2: the warm-up".
//
// IT LINKS LATE-ENABLE (K307 stage 3, branch (b) of K385; Levi's call K517):
// every warm-up link is issued BEFORE KHR_parallel_shader_compile is
// enabled on the context, so Blink attaches no completion query to them;
// only then is the extension enabled and COMPLETION_STATUS_KHR polled once
// a frame, reading LINK_STATUS once each program reports done. That read
// resolves the link inside Chrome's cache scope, so the binary reaches the
// GPU program cache on DISK and a warm restart stays at about 0.8 s, while
// no read ever waits: the trefoil keeps turning through a cold load. (A
// program linked only after the enable - wave 2's, and pixi's own later
// links of any source the registry missed - is wrapped in a query and can
// stay memory-only; the registry therefore has to list every program
// first, which the dev build's unregistered-program check verifies.)
// Without the extension the warm-up falls back to blocking reads, held
// until the trefoil is up (releaseBlocking): every link is submitted at
// once and every status read at the next poll after that, so the wait is
// the longest compile, with the loader shown (frozen) through it.
//
// WAVE 1 (what the current mode's intro draws) GATES the first visible
// frame: main.ts holds the pre-settle (or an instant link's first frame)
// until it completes, fails or times out (15 s). WAVE 2 (every other
// registry program) never gates; main starts it after the reveal or at the
// first sleep, on the poll path only (under the blocking fallback those
// programs link at their first draw, as before, and persist).
//
// The sources are the sites' own GlPrograms' `.vertex` and `.fragment`
// (program_registry.ts), never captured text. A program whose vertex is not
// GLSL ES 3.00 is linked TWICE by pixi (extractAttributesFromGlProgram binds
// the sorted attributes and relinks), so the warm-up does the same. (The
// relink is issued after the enable, so its binary can stay memory-only;
// the three relinked programs are small.)

import type { BackgroundId } from "./background_model";
import { backgroundWarmIds } from "./background";
import { wave1Sources, wave2Sources, type WarmContext, type WarmSource } from "./program_registry";

const VERTEX_SHADER = 0x8b31;
const FRAGMENT_SHADER = 0x8b30;
const COMPILE_STATUS = 0x8b81;
const LINK_STATUS = 0x8b82;
const ACTIVE_ATTRIBUTES = 0x8b89;
const COMPLETION_STATUS_KHR = 0x91b1;

// Pixi's own test (generateProgram.mjs): no ES 3.00 version line on the
// vertex means the attribute relink.
const ES300 = /^[ \t]*#[ \t]*version[ \t]+300[ \t]+es[ \t]*$/m;
const NAME_DEFINE = /#define[ \t]+SHADER_NAME[ \t]+(\S+)/;

// The wave-1 gate gives up after this long (a slow CPU or phone may take
// several times this desktop's 3 s), then pixi's links block as before.
export const WARMUP_TIMEOUT_MS = 15000;

// On: see the header (late enable). Off, the warm-up never asks for the
// extension at all and reads every status blocking, held for the trefoil.
export const PARALLEL_DEFAULT = true;

// The slice of WebGL the warm-up uses (a fake in the tests).
export interface WarmGl {
  createShader(type: number): WebGLShader | null;
  shaderSource(shader: WebGLShader, source: string): void;
  compileShader(shader: WebGLShader): void;
  getShaderParameter(shader: WebGLShader, pname: number): unknown;
  getShaderInfoLog(shader: WebGLShader): string | null;
  deleteShader(shader: WebGLShader | null): void;
  createProgram(): WebGLProgram | null;
  attachShader(program: WebGLProgram, shader: WebGLShader): void;
  linkProgram(program: WebGLProgram): void;
  getProgramParameter(program: WebGLProgram, pname: number): unknown;
  getProgramInfoLog(program: WebGLProgram): string | null;
  getActiveAttrib(program: WebGLProgram, index: number): { name: string } | null;
  bindAttribLocation(program: WebGLProgram, index: number, name: string): void;
  deleteProgram(program: WebGLProgram | null): void;
  getExtension(name: string): unknown;
  isContextLost(): boolean;
}

export interface WarmupOptions {
  now?: () => number;
  timeoutMs?: number;
  log?: (msg: string) => void;
  // Ask for KHR_parallel_shader_compile (PARALLEL_DEFAULT).
  parallel?: boolean;
}

interface Job {
  src: WarmSource;
  wave: 1 | 2;
  program: WebGLProgram;
  vs: WebGLShader;
  fs: WebGLShader;
  relink: boolean; // the second (attribute-bound) link is in flight
}

interface WaveState {
  names: string[];
  submitAt: number;
  doneAt: number | null;
  left: number;
  timedOut: boolean;
}

export interface WarmupReport {
  parallel: boolean;
  lateEnabled: boolean;
  aborted: string | null;
  gateOpenAt: number | null;
  wave1: Omit<WaveState, "left"> | null;
  wave2: Omit<WaveState, "left"> | null;
  wave2Skipped: string | null;
  submitMs: number[];
  firstPollMs: number | null;
  polls: number;
  pollMsTotal: number;
  pollMsMax: number;
  relinked: string[];
  failures: Array<{ name: string; log: string }>;
  unregistered: string[];
}

function srcKey(vertex: string, fragment: string): string {
  return `${vertex}\u0000${fragment}`;
}

export class ShaderWarmup {
  // Poll COMPLETION_STATUS_KHR (late enable, the header). Provisional from
  // construction until the first submit's enable attempt settles it: asking
  // for the extension any earlier would wrap the very links it must not.
  parallel: boolean;
  private serialReason: string;
  private lateEnabled = false;
  // The blocking fallback's reads wait for the trefoil (releaseBlocking).
  private blockingReleased = false;
  private readonly gl: WarmGl | null;
  private readonly now: () => number;
  private readonly timeoutMs: number;
  private readonly log: (msg: string) => void;
  private readonly submitted = new Set<string>();
  private readonly own = new WeakSet<WebGLProgram>();
  // Pending jobs in poll order: longest source first, relinks at the back.
  private pending: Job[] = [];
  private waves: { 1: WaveState | null; 2: WaveState | null } = { 1: null, 2: null };
  private gateOpen = false;
  private gateOpenAt: number | null = null;
  private callbacks: Array<() => void> = [];
  private aborted: string | null = null;
  private wave2Skipped: string | null = null;
  private wave2Source: (() => WarmSource[]) | null = null;
  private wave2Started = false;
  private submitMs: number[] = [];
  private firstPollMs: number | null = null;
  private polls = 0;
  private pollMsTotal = 0;
  private pollMsMax = 0;
  private relinked: string[] = [];
  private failures: Array<{ name: string; log: string }> = [];
  readonly unregistered: string[] = [];

  constructor(gl: WarmGl | null, opts: WarmupOptions = {}) {
    this.gl = gl;
    this.now = opts.now ?? (() => performance.now());
    this.timeoutMs = opts.timeoutMs ?? WARMUP_TIMEOUT_MS;
    this.log = opts.log ?? ((m) => console.warn(m));
    const want = opts.parallel ?? PARALLEL_DEFAULT;
    // No getExtension here: it enables the extension on the context, and
    // every link issued after that is query-wrapped (the header). The
    // enable attempt happens in submit(), after its links.
    this.parallel = want && !!gl;
    this.serialReason = want ? "no KHR_parallel_shader_compile" : "parallel path off";
    if (!gl) this.abort("no WebGL context");
  }

  // The trefoil is up: the blocking fallback may read its statuses (they
  // freeze it, and the screen, for the longest compile - the header). On
  // the poll path this is a no-op. Called by the lifecycle with its
  // loader.show().
  releaseBlocking(): void {
    this.blockingReleased = true;
  }

  // Wave 1 has completed, failed, timed out or been aborted: the first
  // visible frame may draw.
  get wave1Done(): boolean {
    return this.gateOpen;
  }

  // Nothing left to poll.
  get idle(): boolean {
    return this.pending.length === 0;
  }

  // Run `cb` once wave 1 is done (at once if it is).
  afterWave1(cb: () => void): void {
    if (this.gateOpen) cb();
    else this.callbacks.push(cb);
  }

  // Wave 2's sources, built when it starts (the batcher's count and every
  // variant are fixed at the page's start).
  setWave2(sources: () => WarmSource[]): void {
    this.wave2Source = sources;
  }

  // Start wave 2 (idempotent; never gating). Off the poll path it is
  // skipped: its blocking links would freeze play for programs the player
  // may never draw, where a program's own first draw costs only its own
  // compile. On the poll path its links are issued after the enable, so
  // they can stay memory-only (the header); they still spare this visit's
  // first draws, and wave 1 alone sets the warm restart.
  startWave2(): void {
    if (this.wave2Started) return;
    this.wave2Started = true;
    if (this.aborted) return;
    if (!this.parallel) {
      this.wave2Skipped = this.serialReason;
      return;
    }
    this.submit(2, this.wave2Source?.() ?? []);
  }

  // Whether a source pair is one the warm-up compiled (the dev check).
  hasSubmitted(vertex: string, fragment: string): boolean {
    return this.submitted.has(srcKey(vertex, fragment));
  }

  // Compile and link every source not yet submitted, in the given order,
  // without reading a status.
  submit(wave: 1 | 2, sources: readonly WarmSource[]): void {
    const t0 = this.now();
    const st: WaveState = { names: [], submitAt: t0, doneAt: null, left: 0, timedOut: false };
    this.waves[wave] = st;
    const gl = this.gl;
    if (gl && !this.aborted) {
      for (const src of sources) {
        const key = srcKey(src.vertex, src.fragment);
        if (this.submitted.has(key)) continue;
        this.submitted.add(key);
        const vs = gl.createShader(VERTEX_SHADER);
        const fs = gl.createShader(FRAGMENT_SHADER);
        const program = gl.createProgram();
        if (!vs || !fs || !program) {
          gl.deleteShader(vs);
          gl.deleteShader(fs);
          gl.deleteProgram(program);
          continue;
        }
        gl.shaderSource(vs, src.vertex);
        gl.compileShader(vs);
        gl.shaderSource(fs, src.fragment);
        gl.compileShader(fs);
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        this.own.add(program);
        this.pending.push({ src, wave, program, vs, fs, relink: false });
        st.names.push(src.name);
        st.left++;
      }
      // LATE ENABLE (the header): only now, with this submit's links
      // already issued unwrapped, ask for the extension. A missing one
      // settles the warm-up onto the blocking fallback.
      if (this.parallel && !this.lateEnabled) {
        this.lateEnabled = true;
        if (!gl.getExtension("KHR_parallel_shader_compile")) this.parallel = false;
      }
    }
    this.submitMs.push(this.now() - t0);
    if (st.left === 0) this.waveDone(wave, t0);
  }

  // Once a frame. Poll path: walk the pending programs in order, finishing
  // each one COMPLETION_STATUS_KHR says is done, and stop at the first that
  // is not (each query is a round trip to the GPU process). Blocking: read
  // every status, once released (the wait is the longest compile).
  poll(): void {
    if (this.pending.length === 0 && this.gateOpen) return;
    const gl = this.gl;
    const t0 = this.now();
    if (!gl || gl.isContextLost()) {
      this.abort("context lost");
      return;
    }
    // The blocking fallback holds its reads until the trefoil is up
    // (releaseBlocking): a read now would freeze a still, loader-less page
    // for the longest compile. A timed-out gate releases the hold too.
    const held = !this.parallel && !this.blockingReleased && !this.gateOpen;
    if (!held) {
      if (this.parallel) {
        while (this.pending.length > 0) {
          const job = this.pending[0];
          if (!gl.getProgramParameter(job.program, COMPLETION_STATUS_KHR)) break;
          this.pending.shift();
          this.finish(gl, job, t0);
        }
      } else {
        while (this.pending.length > 0) this.finish(gl, this.pending.shift()!, t0);
      }
    }
    const t1 = this.now();
    const w1 = this.waves[1];
    if (!this.gateOpen && w1 && w1.doneAt === null && t1 - w1.submitAt >= this.timeoutMs) {
      w1.timedOut = true;
      this.log(
        `[K307 warm-up] wave 1 timed out after ${Math.round(t1 - w1.submitAt)} ms; ` +
          `${w1.left} program(s) still compiling, the first frame draws now`
      );
      this.blockingReleased = true;
      this.openGate(t1);
    }
    if (held) return; // No status read: not a counted poll.
    const ms = t1 - t0;
    if (this.firstPollMs === null) this.firstPollMs = ms;
    this.polls++;
    this.pollMsTotal += ms;
    this.pollMsMax = Math.max(this.pollMsMax, ms);
  }

  // A program's link (or relink) is complete: relink it as pixi will, or
  // read its status and delete it.
  private finish(gl: WarmGl, job: Job, t: number): void {
    const ok = !!gl.getProgramParameter(job.program, LINK_STATUS);
    if (ok && !job.relink && !ES300.test(job.src.vertex)) {
      const n = Number(gl.getProgramParameter(job.program, ACTIVE_ATTRIBUTES)) || 0;
      const names: string[] = [];
      for (let i = 0; i < n; i++) {
        const a = gl.getActiveAttrib(job.program, i);
        if (a && !a.name.startsWith("gl_")) names.push(a.name);
      }
      names.sort((a, b) => (a > b ? 1 : -1));
      for (let i = 0; i < names.length; i++) gl.bindAttribLocation(job.program, i, names[i]);
      gl.linkProgram(job.program);
      job.relink = true;
      this.relinked.push(job.src.name);
      this.pending.push(job);
      return;
    }
    if (!ok) {
      const info = [
        gl.getProgramInfoLog(job.program) ?? "",
        gl.getShaderParameter(job.vs, COMPILE_STATUS) ? "" : `vertex: ${gl.getShaderInfoLog(job.vs) ?? ""}`,
        gl.getShaderParameter(job.fs, COMPILE_STATUS) ? "" : `fragment: ${gl.getShaderInfoLog(job.fs) ?? ""}`,
      ]
        .filter((s) => s.trim() !== "")
        .join("\n");
      this.failures.push({ name: job.src.name, log: info });
      this.log(`[K307 warm-up] ${job.src.name} failed to link: ${info}`);
    }
    gl.deleteShader(job.vs);
    gl.deleteShader(job.fs);
    gl.deleteProgram(job.program);
    const st = this.waves[job.wave];
    if (st && --st.left === 0) this.waveDone(job.wave, t);
  }

  private waveDone(wave: 1 | 2, t: number): void {
    const st = this.waves[wave];
    if (st && st.doneAt === null) st.doneAt = t;
    if (wave === 1) this.openGate(t);
  }

  private openGate(t: number): void {
    if (this.gateOpen) return;
    this.gateOpen = true;
    this.gateOpenAt = t;
    const cbs = this.callbacks;
    this.callbacks = [];
    for (const cb of cbs) cb();
  }

  private abort(reason: string): void {
    if (this.aborted) return;
    this.aborted = reason;
    // A lost context's objects are gone with it: drop the jobs untouched.
    this.pending = [];
    if (reason !== "no WebGL context") this.log(`[K307 warm-up] aborted: ${reason}`);
    this.openGate(this.now());
  }

  // Whether a program is one the warm-up made (the dev check skips them).
  isOwn(program: WebGLProgram): boolean {
    return this.own.has(program);
  }

  report(): WarmupReport {
    const strip = (w: WaveState | null) => {
      if (!w) return null;
      const { left: _left, ...rest } = w;
      return { ...rest, names: [...rest.names] };
    };
    return {
      parallel: this.parallel,
      lateEnabled: this.lateEnabled,
      aborted: this.aborted,
      gateOpenAt: this.gateOpenAt,
      wave1: strip(this.waves[1]),
      wave2: strip(this.waves[2]),
      wave2Skipped: this.wave2Skipped,
      submitMs: [...this.submitMs],
      firstPollMs: this.firstPollMs,
      polls: this.polls,
      pollMsTotal: this.pollMsTotal,
      pollMsMax: this.pollMsMax,
      relinked: [...this.relinked],
      failures: this.failures.map((f) => ({ ...f })),
      unregistered: [...this.unregistered],
    };
  }
}

// What the page's settings need warmed. `background` is the effect the
// scene wears (main.ts look("background"): High contrast wears none).
export interface WarmParams {
  mazeFabric: boolean;
  exploration: string;
  gameMode: string;
  // K137: fragile runs (off | crack | snap); absent reads as off.
  fragile?: string;
  pluckRipple: string;
  backgroundIntensity: number;
  backgroundSpeed: number;
  backgroundScale: number;
  backgroundDetail: number;
  backgroundFibers: number;
  backgroundGrain: number;
  backgroundAngle: number;
}

export function warmContextFor(
  params: WarmParams,
  background: string,
  reduced: boolean,
  maxBatchTextures: number
): WarmContext {
  return {
    fabric: params.mazeFabric,
    explore: params.mazeFabric && params.exploration === "threads",
    fog: params.mazeFabric && params.exploration === "fog",
    // Broader than url_state's fireSettingsOf on purpose (no clock or
    // minotaur test): warming a program the page never draws costs
    // compile time, missing one freezes the first burn. K137: fragile
    // runs too, whose first snap switches every ribbon, strip and fan onto
    // the explore programs as the first burn does (broken runs vanish
    // through the burn's machinery).
    burn:
      params.mazeFabric &&
      (params.gameMode === "burn" || (params.fragile ?? "off") !== "off"),
    reduced,
    ripple: params.pluckRipple !== "off" && !reduced,
    // Mirrors main.ts syncBackground's setShape + configure.
    bgIds: backgroundWarmIds(background as BackgroundId, params.backgroundIntensity, params.backgroundSpeed, {
      scale: params.backgroundScale,
      detail: params.backgroundDetail,
      fibers: params.backgroundFibers,
      grain: params.backgroundGrain,
      angle: params.backgroundAngle,
    }),
    maxBatchTextures,
  };
}

// DEV CHECK: warn when pixi links a source the warm-up never saw (a program
// site missing from the registry: a silent cold link the tests cannot see).
// Wraps the context's shaderSource / attachShader / linkProgram; the name
// comes from pixi's `#define SHADER_NAME`.
function installLinkCheck(gl: WebGL2RenderingContext, warmup: ShaderWarmup, known: Set<string>): void {
  const sources = new WeakMap<WebGLShader, string>();
  const types = new WeakMap<WebGLShader, number>();
  const attached = new WeakMap<WebGLProgram, WebGLShader[]>();
  const checked = new WeakSet<WebGLProgram>();
  const createShader = gl.createShader.bind(gl);
  const shaderSource = gl.shaderSource.bind(gl);
  const attachShader = gl.attachShader.bind(gl);
  const linkProgram = gl.linkProgram.bind(gl);
  gl.createShader = (type: number) => {
    const sh = createShader(type);
    if (sh) types.set(sh, type);
    return sh;
  };
  gl.shaderSource = (sh: WebGLShader, src: string) => {
    sources.set(sh, src);
    shaderSource(sh, src);
  };
  gl.attachShader = (p: WebGLProgram, sh: WebGLShader) => {
    const list = attached.get(p) ?? [];
    list.push(sh);
    attached.set(p, list);
    attachShader(p, sh);
  };
  gl.linkProgram = (p: WebGLProgram) => {
    linkProgram(p);
    if (warmup.isOwn(p) || checked.has(p)) return;
    checked.add(p);
    let vertex = "";
    let fragment = "";
    for (const sh of attached.get(p) ?? []) {
      if (types.get(sh) === VERTEX_SHADER) vertex = sources.get(sh) ?? "";
      else if (types.get(sh) === FRAGMENT_SHADER) fragment = sources.get(sh) ?? "";
    }
    if (known.has(srcKey(vertex, fragment))) return;
    const name = NAME_DEFINE.exec(fragment)?.[1] ?? "(unnamed)";
    warmup.unregistered.push(name);
    console.warn(
      `[K307 warm-up] pixi linked a program the warm-up registry does not list: ${name}. ` +
        "Its first draw links cold; add its site to src/render/program_registry.ts."
    );
  };
}

declare global {
  interface Window {
    __knotWarmup?: () => WarmupReport;
  }
}

// Start the warm-up on the app's renderer: wave 1 now, wave 2 when main
// asks. No WebGL (or a WebGPU renderer) means nothing to warm.
export function startShaderWarmup(
  renderer: unknown,
  ctxOf: (maxBatchTextures: number) => WarmContext,
  opts: WarmupOptions & { checkLinks?: boolean } = {}
): ShaderWarmup {
  const r = renderer as { gl?: WebGL2RenderingContext; limits?: { maxBatchableTextures?: number } };
  const gl = r.gl ?? null;
  const warmup = new ShaderWarmup(gl, opts);
  if (typeof window !== "undefined") window.__knotWarmup = () => warmup.report();
  if (!gl) return warmup;
  const ctx = ctxOf(r.limits?.maxBatchableTextures ?? 16);
  const wave1 = wave1Sources(ctx);
  let wave2: WarmSource[] | null = null;
  const wave2Of = () => (wave2 ??= wave2Sources(ctx));
  if (opts.checkLinks ?? import.meta.env.DEV) {
    const known = new Set<string>();
    for (const s of [...wave1, ...wave2Of()]) known.add(srcKey(s.vertex, s.fragment));
    installLinkCheck(gl, warmup, known);
  }
  warmup.setWave2(wave2Of);
  warmup.submit(1, wave1);
  return warmup;
}
