---
paths:
  - "src/loader/**"
  - "test/loader/**"
  - "index.html"
---

# Render lore: the inline loader (K313)

The loader lives in `index.html`, not the bundle (docs/design/K313_loader.md).
`src/loader/vite_plugin.ts` bundles `loader_worker.ts` and `loader_boot.ts`
with a nested config-free build and inlines them; a static SVG of the same
trefoil (from `loader_geometry.ts`) covers the worker's start. The worker
draws on an OffscreenCanvas: the head glyph fixed at screen center, the
maze sliding and turning beneath it (half the heading, smoothed), a
fixed-length trail behind the head. First frame measured at ~90-110 ms
on desktop (2026-10-22).

Hard-won constraints:

- Size the canvas BEFORE `transferControlToOffscreen()`; afterwards its
  dimensions belong to the worker, and setting them from the page throws
  (the boot's catch then silently falls back to the CSS loader).
- The worker must take its size from the `start` message as well as
  `resize`; a worker that starts at 0x0 draws nothing and posts no error.
- Boot reads the Motion preference from `localStorage["knotmaze.motion"]`
  (ui/motion.ts's `MOTION_KEY`, pinned by test/loader); reduced motion
  leaves the static SVG standing.
- main.ts adopts the boot loader through `window.__knotBootLoader`
  (src/loader/boot_loader.ts); null means fallback to ui/loader.ts's
  createLoader. The lifecycle's show/hide contract is unchanged.
- A Blob-URL worker needs no CSP allowance today; a future CSP needs
  `worker-src blob:`.
