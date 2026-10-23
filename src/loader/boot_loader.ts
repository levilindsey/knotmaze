// K313: main.ts's side of the boot loader. The inline boot script
// (src/loader/loader_boot.ts) leaves its handle on the window;
// adoptBootLoader takes it over so the lifecycle's show/hide calls land
// on the loader that has been on screen since the first paint. Null
// means the boot loader could not run (no workers / OffscreenCanvas),
// and main falls back to ui/loader.ts's createLoader.
//
// K828: the handle also takes live loader configuration
// (ui/loader_config.ts — the panel's loading rows) and can re-show
// after a hide (the "keep loading animation" preview): show() revives
// the overlay and its worker; hide() is the full teardown.

import type { LoaderWireCfg } from "../ui/loader_config";

export interface BootLoader {
  show: () => void;
  hide: () => void;
  el: HTMLElement;
  setConfig: (cfg: LoaderWireCfg) => void;
}

export function adoptBootLoader(): BootLoader | null {
  const w = window as unknown as { __knotBootLoader?: BootLoader | null };
  const b = w.__knotBootLoader;
  if (!b || typeof b.show !== "function" || typeof b.hide !== "function") return null;
  return b;
}
