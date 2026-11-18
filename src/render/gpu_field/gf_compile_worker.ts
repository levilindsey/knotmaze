// K1456 (26A): gf's shader-compile worker. A compile that COMPLETES on a context where
// KHR_parallel_shader_compile was never enabled lands in Chrome's on-disk program cache (the K307
// warm-up's late-enable lesson, K385); one resolved by polling COMPLETION_STATUS_KHR on the app
// context stays in memory only, so every visit recompiled gf's 40-63k-char programs. This worker
// links every gf program once, blocking, on its own OffscreenCanvas context (never asking for the
// extension), off the main thread: the app's own async links (gf_pass.ts) then hit the cache, on the
// first visit as each link lands and on later visits at once. Best-effort: without a worker or
// WebGL2 here, gf still compiles async on the app context, just without the warm restart.
import { compileProgram } from "./gf_pass";

interface CompileMsg { sources: [string, string][] }

const ctx = globalThis as unknown as {
  onmessage: ((e: MessageEvent<CompileMsg>) => void) | null;
  postMessage(m: unknown): void;
};

ctx.onmessage = (e: MessageEvent<CompileMsg>): void => {
  const sources = e.data?.sources ?? [];
  let done = 0;
  try {
    const cv = new OffscreenCanvas(1, 1);
    const gl = cv.getContext("webgl2");
    if (!gl) { ctx.postMessage({ done, error: "no webgl2" }); return; }
    for (const [vs, fs] of sources) {
      try {
        gl.deleteProgram(compileProgram(gl, vs, fs));
      } catch { /* one bad source must not stop the rest */ }
      done++;
    }
    ctx.postMessage({ done, all: true });
  } catch (err) {
    ctx.postMessage({ done, error: err instanceof Error ? err.message : String(err) });
  }
};
