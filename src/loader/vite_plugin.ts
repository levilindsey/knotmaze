// K313: the plugin that inlines the loader into index.html
// (docs/design/K313_loader.md). It bundles src/loader/loader_worker.ts
// and src/loader/loader_boot.ts once (a nested, config-free build),
// then injects, ahead of the app bundle: the loader's CSS, the overlay
// (a static SVG of the same trefoil, so the first paint already shows
// it), and a classic script that starts the worker. Without workers or
// OffscreenCanvas the boot leaves the SVG standing and main.ts falls
// back to ui/loader.ts's createLoader.

import { fileURLToPath } from "node:url";
import { build } from "vite";
import type { Plugin } from "vite";
import { trefoilShape, trefoilSvgPaths } from "./loader_geometry";

const ENTRY_WORKER = fileURLToPath(new URL("./loader_worker.ts", import.meta.url));
const ENTRY_BOOT = fileURLToPath(new URL("./loader_boot.ts", import.meta.url));

async function bundleEntry(entry: string): Promise<string> {
  const out = await build({
    configFile: false,
    logLevel: "silent",
    build: {
      write: false,
      minify: true,
      target: "es2020",
      lib: { entry, formats: ["iife"], name: "KnotLoaderInline" },
    },
  });
  const first = Array.isArray(out) ? out[0] : out;
  const chunk = (first as { output: Array<{ type: string; code?: string }> }).output.find(
    (o) => o.type === "chunk"
  );
  if (!chunk?.code) throw new Error(`loaderInline: no chunk for ${entry}`);
  return chunk.code.replace(/<\/script/g, "<\\/script");
}

let cache: Promise<{ worker: string; boot: string }> | null = null;
function bundles(): Promise<{ worker: string; boot: string }> {
  cache ??= (async () => ({
    worker: await bundleEntry(ENTRY_WORKER),
    boot: await bundleEntry(ENTRY_BOOT),
  }))();
  return cache;
}

export function loaderSvgMarkup(): string {
  const paths = trefoilSvgPaths(trefoilShape())
    .map((d) => `<path d="${d}"/>`)
    .join("");
  return (
    '<svg id="knot-loading-svg" width="76" height="76" viewBox="-4 -4 8 8" aria-hidden="true">' +
    '<g fill="none" stroke="#e7c56f" stroke-width="0.42" stroke-linecap="round" stroke-linejoin="round">' +
    paths +
    "</g></svg>"
  );
}

const LOADER_CSS =
  "#knot-loading{position:fixed;inset:0;background:#151b28;z-index:15;opacity:0;" +
  "transition:opacity .25s ease;pointer-events:none}" +
  "#knot-loading-svg{position:absolute;left:50%;top:50%;margin:-38px 0 0 -38px;" +
  "animation:knot-loading-spin 3.2s linear infinite;overflow:visible}" +
  "#knot-loading-canvas{position:absolute;inset:0;width:100%;height:100%;opacity:0;" +
  "transition:opacity .25s ease}" +
  "@keyframes knot-loading-spin{to{transform:rotate(360deg)}}" +
  "@media (prefers-reduced-motion: reduce){#knot-loading-svg{animation-duration:12s}}";

export function loaderInline(): Plugin {
  return {
    name: "knotmaze:loader-inline",
    transformIndexHtml: {
      order: "pre",
      async handler() {
        const { worker, boot } = await bundles();
        return [
          { tag: "style", children: LOADER_CSS, injectTo: "head" },
          {
            tag: "div",
            attrs: {
              id: "knot-loading",
              role: "progressbar",
              "aria-busy": "true",
              "aria-label": "Loading",
            },
            children:
              loaderSvgMarkup() + '<canvas id="knot-loading-canvas"></canvas>',
            injectTo: "body-prepend",
          },
          {
            tag: "script",
            children: `window.__KNOT_LOADER_WORKER__=${JSON.stringify(worker)};\n${boot}`,
            injectTo: "body-prepend",
          },
        ];
      },
    },
  };
}
