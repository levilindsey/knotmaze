// K313: the loader's boot script (docs/design/K313_loader.md). Bundled
// by src/loader/vite_plugin.ts into a classic inline script in
// index.html, right after the overlay markup, so it runs while the app
// bundle is still downloading. It hands the overlay's canvas to the
// loader worker (whose source the plugin sets as
// window.__KNOT_LOADER_WORKER__), or leaves the static SVG standing
// under reduced motion. main.ts adopts the result through
// window.__knotBootLoader (src/loader/boot_loader.ts); without it, main
// falls back to today's createLoader.

interface BootLoaderHandle {
  show: () => void;
  hide: () => void;
  el: HTMLElement;
}

declare const window: Window & {
  __KNOT_LOADER_WORKER__?: string;
  __knotBootLoader?: BootLoaderHandle | null;
  __knotLoaderT0?: number;
};

const el = document.getElementById("knot-loading");
if (el) {
  let worker: Worker | null = null;
  let shown = false;
  let gone = false;
  let fadeTimer = 0;

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

  const show = (): void => {
    if (gone) return;
    shown = true;
    el.style.opacity = "1";
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
    window.setTimeout(() => el.remove(), 280);
  };
  window.__knotBootLoader = { show, hide, el };

  // The fade-in delay (lifecycle.ts's LOADER_DELAY_MS keeps a fast load
  // from flashing a loader); the timer is a plain script timer here so
  // it runs before the bundle, and hide() cancels it.
  fadeTimer = window.setTimeout(() => {
    if (!gone) show();
  }, 300);

  const canvas = document.getElementById("knot-loading-canvas") as HTMLCanvasElement | null;
  const canWorker =
    !reduced() &&
    canvas !== null &&
    typeof canvas.transferControlToOffscreen === "function" &&
    typeof Worker !== "undefined" &&
    typeof window.__KNOT_LOADER_WORKER__ === "string";
  if (canWorker && canvas) {
    try {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = () => ({
        w: Math.max(1, Math.round(el.clientWidth * dpr)),
        h: Math.max(1, Math.round(el.clientHeight * dpr)),
      });
      const blob = new Blob([window.__KNOT_LOADER_WORKER__ as string], { type: "text/javascript" });
      worker = new Worker(URL.createObjectURL(blob));
      // Size before the transfer: afterwards the canvas's dimensions
      // belong to the worker.
      const { w, h } = size();
      canvas.width = w;
      canvas.height = h;
      const off = canvas.transferControlToOffscreen();
      worker.postMessage({ type: "start", canvas: off, w, h }, [off]);
      worker.onmessage = (e: MessageEvent) => {
        if ((e.data as { type?: string })?.type === "frame1") {
          window.__knotLoaderT0 = performance.now();
          const svg = document.getElementById("knot-loading-svg");
          if (svg) svg.style.display = "none";
          canvas.style.opacity = "1";
        }
      };
      window.addEventListener("resize", () => {
        const s = size();
        try {
          worker?.postMessage({ type: "resize", w: s.w, h: s.h });
        } catch {
          // Stopped already.
        }
      });
      void shown;
    } catch {
      worker = null;
      window.__knotBootLoader = null;
    }
  }
}
