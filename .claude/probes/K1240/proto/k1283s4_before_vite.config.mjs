// K1283 s4: k1283_vite.config.mjs with outline and fill_tri taken from src at 9963d239 (k1283s4_before_*.ts):
// the guards' before, on today's tools.
// K1283: the check tools on src/render/outline (the app's code) instead of the prototype.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs <tool.ts> <args...>
// Every import of "./outline", "./draw", "./fill_tri" or "./paint" from a file in the proto
// folder (the tools, and the prototype's own modules) resolves to src/render/outline/<name>.ts,
// so k1279_census.ts, k1277_census.ts and k1247s15_gain.ts score the app's table. The k1279
// base snapshots (k1279_base_*) import nothing at run time and are untouched.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const proto = dirname(fileURLToPath(import.meta.url));
const src = resolve(proto, "../../../../src/render/outline");
const NAMES = new Set(["outline", "draw", "fill_tri", "paint"]);

export default {
  plugins: [
    {
      name: "k1283-outline-src",
      enforce: "pre",
      resolveId(source, importer) {
        if (!importer) return null;
        const m = /^\.\/(\w+)(\.ts)?$/.exec(source);
        if (!m || !NAMES.has(m[1])) return null;
        const imp = importer.split("?")[0];
        if (resolve(dirname(imp)) !== resolve(proto)) return null;
        if (m[1] === "outline") return join(proto, "k1283s4_before_outline.ts");
        if (m[1] === "fill_tri") return join(proto, "k1283s4_before_fill.ts");
        return join(src, `${m[1]}.ts`);
      },
    },
  ],
};

