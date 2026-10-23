// K313: main.ts's side of the boot loader. The inline boot script
// (src/loader/loader_boot.ts) leaves its handle on the window;
// adoptBootLoader takes it over so the lifecycle's show/hide calls land
// on the loader that has been on screen since the first paint. Null
// means the boot loader could not run (no workers / OffscreenCanvas),
// and main falls back to ui/loader.ts's createLoader.

export interface BootLoader {
  show: () => void;
  hide: () => void;
  el: HTMLElement;
}

export function adoptBootLoader(): BootLoader | null {
  const w = window as unknown as { __knotBootLoader?: BootLoader | null };
  const b = w.__knotBootLoader;
  if (!b || typeof b.show !== "function" || typeof b.hide !== "function") return null;
  return b;
}
