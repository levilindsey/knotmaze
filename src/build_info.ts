// Build identity, injected by vite.config.ts `define`. Guarded so code
// paths without the define (vitest, odd loaders) still get readable
// fallbacks instead of a ReferenceError.
declare const __APP_VERSION__: string;
declare const __BUILD_SHA__: string;
declare const __BUILD_TIME__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";
export const BUILD_SHA: string =
  typeof __BUILD_SHA__ === "string" ? __BUILD_SHA__ : "dev";
// UTC, "YYYY-MM-DD HH:MM".
export const BUILD_TIME: string =
  typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "";
