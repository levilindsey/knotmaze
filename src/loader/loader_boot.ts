// K313: the loader's boot script (docs/design/K313_loader.md). Bundled
// by src/loader/vite_plugin.ts into a classic inline script in
// index.html, right after the overlay markup, so it runs while the app
// bundle is still downloading. It hands the overlay's canvas to the
// loader worker (whose source the plugin sets as
// window.__KNOT_LOADER_WORKER__), or leaves the static SVG standing
// under reduced motion. main.ts adopts the result through
// window.__knotBootLoader (src/loader/boot_loader.ts); without it, main
// falls back to today's createLoader.
//
// K828: the boot reads the loader mirror the app maintains
// (ui/loader_config.ts) so the trefoil already wears the design's gap,
// thread width and colors at first paint, and the handle takes live
// setConfig updates plus a reviving show() (the panel's "keep loading
// animation" preview) after hide()'s teardown.

import {
  LOADER_MIRROR_KEY,
  readLoaderMirror,
  type LoaderWireCfg,
} from "../ui/loader_config";
import type { BootLoader } from "./boot_loader";

declare const window: Window & {
  __KNOT_LOADER_WORKER__?: string;
  __knotBootLoader?: BootLoader | null;
  __knotLoaderT0?: number;
};

const el = document.getElementById("knot-loading");
if (el) {
  let worker: Worker | null = null;
  let gone = false;
  let fadeTimer = 0;
  let removeTimer = 0;
  let canvasUsed = false;

  let cfg: LoaderWireCfg;
  try {
    cfg = readLoaderMirror(localStorage.getItem(LOADER_MIRROR_KEY));
  } catch {
    cfg = readLoaderMirror(null);
  }
  el.style.background = cfg.bg;

  const reduced = (): boolean => {
    try {
      const pref = localStorage.getItem("knotmaze.motion");
      if (pref === "reduced") return true;
      if (pref === "full") return false;
    } catch {
      // No storage: follow the system, as ui/motion.ts does.
    }
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  };

  const size = (): { w: number; h: number } => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return {
      w: Math.max(1, Math.round(el.clientWidth * dpr)),
      h: Math.max(1, Math.round(el.clientHeight * dpr)),
    };
  };

  const spawnWorker = (): void => {
    if (worker || reduced()) return;
    const src = window.__KNOT_LOADER_WORKER__;
    if (typeof src !== "string") return;
    let canvas = document.getElementById("knot-loading-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    if (typeof canvas.transferControlToOffscreen !== "function" || typeof Worker === "undefined") return;
    try {
      if (canvasUsed) {
        // The first canvas already belongs to a dead worker; a fresh
        // element is the only way back (transfer is one-shot).
        const fresh = document.createElement("canvas");
        fresh.id = "knot-loading-canvas";
        canvas.replaceWith(fresh);
        canvas = fresh;
      }
      const blob = new Blob([src], { type: "text/javascript" });
      worker = new Worker(URL.createObjectURL(blob));
      // Size before the transfer: afterwards the canvas's dimensions
      // belong to the worker.
      const { w, h } = size();
      canvas.width = w;
      canvas.height = h;
      const off = canvas.transferControlToOffscreen();
      canvasUsed = true;
      worker.postMessage({ type: "start", canvas: off, w, h, cfg }, [off]);
      worker.onmessage = (e: MessageEvent) => {
        if ((e.data as { type?: string })?.type === "frame1") {
          window.__knotLoaderT0 = performance.now();
          const svg = document.getElementById("knot-loading-svg");
          if (svg) svg.style.display = "none";
          const c = document.getElementById("knot-loading-canvas");
          if (c) c.style.opacity = "1";
        }
      };
    } catch {
      worker = null;
    }
  };

  const show = (): void => {
    gone = false;
    window.clearTimeout(fadeTimer);
    window.clearTimeout(removeTimer);
    if (!el.isConnected) document.body.appendChild(el);
    el.style.opacity = "1";
    spawnWorker();
  };
  const hide = (): void => {
    if (gone) return;
    gone = true;
    window.clearTimeout(fadeTimer);
    try {
      worker?.postMessage({ type: "stop" });
    } catch {
      // The worker may already be gone.
    }
    worker?.terminate();
    worker = null;
    el.style.opacity = "0";
    removeTimer = window.setTimeout(() => el.remove(), 280);
  };
  const setConfig = (next: LoaderWireCfg): void => {
    cfg = { ...next };
    el.style.background = cfg.bg;
    try {
      worker?.postMessage({ type: "config", cfg });
    } catch {
      // Stopped already; the next start carries the stored cfg.
    }
  };
  window.__knotBootLoader = { show, hide, el, setConfig };

  // The fade-in delay (lifecycle.ts's LOADER_DELAY_MS keeps a fast load
  // from flashing a loader); the timer is a plain script timer here so
  // it runs before the bundle, and hide() cancels it.
  fadeTimer = window.setTimeout(() => {
    if (!gone) show();
  }, 300);

  window.addEventListener("resize", () => {
    const s = size();
    try {
      worker?.postMessage({ type: "resize", w: s.w, h: s.h });
    } catch {
      // Stopped already.
    }
  });

  spawnWorker();
}
