// K122: the Vite plugin that ships the third-party notices.
//
//   build  generateBundle reads which modules each output chunk really
//          contains, resolves them to npm packages, checks every package
//          against the license policy (notices/credits.ts) and emits
//          licenses.html next to index.html. A package with no usable
//          license text, or a license outside the allowed list, FAILS THE
//          BUILD (npm test builds too, so the deploy workflow stops before
//          publishing). Every JS chunk gets a one-line pointer to the page,
//          and the legal comments a package keeps in its own code (/*! */,
//          @license) are preserved instead of being stripped.
//   serve  /licenses.html answers with a placeholder page: the package
//          list comes from a production build.
//
// Vite 8 has build.license, which writes the same inventory to
// .vite/license.md. It was not enough here: it takes every module the chunk
// lists (not only the ones that render code), keeps the first license file
// only, accepts a package that has none (tweakpane and @pixi/colord ship no
// LICENSE file, so it prints their names with no text), emits Markdown, a
// hidden path, and cannot fail the build.

import type { Plugin } from "vite";
import { CREDITS } from "./credits";
import { gatherNotices } from "./notices";
import type { BundledModule } from "./notices";
import { renderPage } from "./page";

export const NOTICES_FILE = "licenses.html";
export const NOTICES_BANNER = `/*! Third-party licenses and credits: ${NOTICES_FILE}, next to index.html */`;

const shippedCredits = () => CREDITS.filter((c) => c.shipped);

export function notices(): Plugin {
  let build = { version: "?", sha: "?" };
  return {
    name: "knotmaze:notices",

    config() {
      return {
        build: {
          rolldownOptions: {
            output: {
              postBanner: NOTICES_BANNER,
              comments: { legal: true, annotation: false, jsdoc: false },
            },
          },
        },
      };
    },

    configResolved(config) {
      // The same values the panel header shows (vite.config.ts defines).
      const read = (key: string): string => {
        try {
          const v: unknown = JSON.parse(String((config.define as Record<string, unknown> | undefined)?.[key]));
          return typeof v === "string" ? v : "?";
        } catch {
          return "?";
        }
      };
      build = { version: read("__APP_VERSION__"), sha: read("__BUILD_SHA__") };
    },

    generateBundle(_options, bundle) {
      const modules: BundledModule[] = [];
      for (const item of Object.values(bundle)) {
        if (item.type !== "chunk") continue;
        for (const [id, m] of Object.entries(item.modules)) {
          modules.push({ id, renderedLength: m.renderedLength });
        }
      }
      const { packages, problems } = gatherNotices(modules);
      if (problems.length) {
        this.error(
          `Third-party notices (notices/credits.ts) - ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n- ${problems.join("\n- ")}`
        );
      }
      this.emitFile({
        type: "asset",
        fileName: NOTICES_FILE,
        source: renderPage({ packages, credits: shippedCredits(), build }),
      });
    },

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? "").split("?")[0] !== `/${NOTICES_FILE}`) {
          next();
          return;
        }
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(
          renderPage({
            packages: [],
            credits: shippedCredits(),
            build,
            note: "This is the development server. The open-source licenses are listed by a production build (npm run build), from the modules it bundles.",
          })
        );
      });
    },
  };
}
