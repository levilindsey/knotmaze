// K1456 (26A), reworked by K1472 s2: gf's shader-compile worker, the one place gf's programs reach
// Chrome's on-disk program cache. The app's context has KHR_parallel_shader_compile enabled (the K307
// warm-up enables it), and a link resolved by polling COMPLETION_STATUS_KHR on such a context stays in
// the in-memory cache only: every visit recompiled gf's 40-80k-char programs (35-75 s each, cold).
// The K307 late-enable lesson (render-shaders.md, K385): a link ISSUED before the context enables the
// extension, then polled through COMPLETION_STATUS_KHR, persists to disk and never blocks a read.
// So each program gets a fresh context here: issue the link, enable the extension, poll on a timer,
// read the statuses once complete, lose the context.
//
// It runs from gf's first frame, one program at a time, in the order the app last posted (gf_pass.ts
// issueOrder); the app links a program only once this worker has (GfPass.compileGate), so that link
// reads the cache instead of compiling a second time. K1456's worker ran only after gf's own queue had
// drained: by then every link hit the in-memory cache, nothing was written, and the next visit was
// cold again (K1472 s2, measured: a second visit's first program took 35 s).
//
// Messages in: { sources } once (every program's [vertex, fragment]), then { order } (source indices,
// most wanted first) whenever the app's order changes. Out: { idx, done } per program, then
// { done, all: true }, or { done, error } (the app then compiles on its own context, as before).
import { COMPLETION_STATUS_KHR, finishProgram, startProgram } from "./gf_pass";

interface CompileMsg { sources?: [string, string][]; order?: number[] }

const ctx = globalThis as unknown as {
  onmessage: ((e: MessageEvent<CompileMsg>) => void) | null;
  postMessage(m: unknown): void;
};

let sources: [string, string][] = [];
let order: number[] = [];
const done = new Set<number>();
let running = false;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Link one program on a fresh context, late-enable (see the header). Resolves false without the extension. */
async function linkOne(vs: string, fs: string): Promise<boolean> {
  const cv = new OffscreenCanvas(1, 1);
  const gl = cv.getContext("webgl2");
  if (!gl) throw new Error("no webgl2");
  try {
    const job = startProgram(gl, vs, fs);
    // Enabled only after the link is issued: that is what lets the binary reach the disk cache.
    if (!gl.getExtension("KHR_parallel_shader_compile")) {
      // Without the extension the status read would block the GPU process's main thread for the
      // whole compile (every context's frames stall); leave the compile to the app's own queue.
      return false;
    }
    while (!gl.getProgramParameter(job.prog, COMPLETION_STATUS_KHR)) await sleep(50);
    try { gl.deleteProgram(finishProgram(gl, job)); } catch { /* one bad source must not stop the rest */ }
    return true;
  } finally {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

async function run(): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const i = order.find((k) => !done.has(k)) ?? sources.findIndex((_, k) => !done.has(k));
      if (i < 0 || i >= sources.length) break;
      if (!(await linkOne(sources[i][0], sources[i][1]))) {
        ctx.postMessage({ done: done.size, error: "no KHR_parallel_shader_compile" });
        return;
      }
      done.add(i);
      ctx.postMessage({ idx: i, done: done.size });
    }
    ctx.postMessage({ done: done.size, all: true });
  } catch (err) {
    ctx.postMessage({ done: done.size, error: err instanceof Error ? err.message : String(err) });
  }
}

ctx.onmessage = (e: MessageEvent<CompileMsg>): void => {
  if (e.data?.sources) { sources = e.data.sources; order = sources.map((_, k) => k); }
  if (e.data?.order) order = e.data.order;
  void run();
};
