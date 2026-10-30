import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { notices, noticesWorker } from "./notices/vite_plugin";
import { loaderInline } from "./src/loader/vite_plugin";
import { workerPreloadScript } from "./src/loader/worker_preload";

// BUILD IDENTITY for the version readouts (src/build_info.ts): the
// package.json version, the git short SHA ("+" = built with uncommitted
// changes to tracked files) and the build time. Derived at build time,
// never hand-edited - so a phone showing the live site says exactly which
// commit it is running.
const git = (args: string): string => {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
};

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
) as { version: string };
const sha = git("rev-parse --short HEAD") || "nogit";
const dirty = git("status --porcelain --untracked-files=no") !== "";

// Agent worktrees live under .claude/worktrees/ - a checkout there writes
// an index.html and a tsconfig.json, and the dev server answered with a
// forced full reload of every open page (a phone mid-maze lost its game).
// Ignore THIS checkout's .claude/ only: a "**/.claude/**" glob also matched
// a worktree's own sources (their paths run through .claude/worktrees/),
// so a dev server started inside a worktree never saw its own edits and
// kept serving the code it started with.
const claudeDir = fileURLToPath(new URL("./.claude/", import.meta.url));
const inClaudeDir = (path: string): boolean => {
  const rel = relative(claudeDir, resolve(path));
  return !rel.startsWith("..") && !isAbsolute(rel);
};

// K1055 (K414, was K7 stage 7): the physics worker's chunk is
// modulepreloaded only on pages that will run the worker. K414 dropped
// stage 7's static preload for every page because a `phw=0` page
// downloaded the chunk and never ran it; this restores the head start
// (hello 35-55 ms sooner at 40 ms an asset) behind a build-time inline
// script (src/loader/worker_preload.ts, K1060; its decision is pinned
// against parseParams by test/loader/worker_preload.test.ts) that reads `phw` the way the app does (the token blob, then key=value overrides; a legacy key=value link directly) and
// adds the link unless the page will run in-thread. The chunk's file
// name comes from the bundle - a runtime `new URL(...)` resolves to a
// data copy under Rolldown, not the chunk. The build fails when the
// worker stops being its own chunk.
function workerPreload(): Plugin {
  return {
    name: "k7-worker-preload",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const file = Object.keys(ctx.bundle ?? {}).find((k) =>
          /(^|\/)physics_worker-[^/]*\.js$/.test(k)
        );
        if (!file) throw new Error("k7-worker-preload: no physics worker chunk");
        return [
          {
            tag: "script",
            children: workerPreloadScript(`./${file}`),
            injectTo: "head",
          },
        ];
      },
    },
  };
}

export default defineConfig({
  // RELATIVE base: the same build serves at knotmaze.pages.dev/ and,
  // through levi.dev's proxy function, at levi.dev/knotmaze/ (asset URLs
  // resolve against whichever path the page loaded from). The dev server
  // still serves at /.
  base: "./",
  // K122: emits credits.html (credits and third-party notices) from the bundled modules.
  plugins: [notices(), workerPreload(), loaderInline()],
  // K7 stage 3: the physics worker (src/physics/physics_worker.ts, the
  // default host; `phw=0` opts out) is an ES module worker, bundled on its
  // own; noticesWorker() hands its modules to the notices page.
  worker: { format: "es", plugins: () => [noticesWorker()] },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_SHA__: JSON.stringify(dirty ? `${sha}+` : sha),
    __BUILD_TIME__: JSON.stringify(
      new Date().toISOString().slice(0, 16).replace("T", " ")
    ),
  },
  server: { watch: { ignored: [inClaudeDir] } },
});
