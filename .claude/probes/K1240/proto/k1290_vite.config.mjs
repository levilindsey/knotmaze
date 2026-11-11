// K1290: the check tools on the forward table. Pass it to the runner:
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1290_vite.config.mjs <tool.ts> <args...>
// Every import of "./outline" from the proto folder (the tools, draw.ts,
// fill_tri.ts) resolves to outline_fwd.ts instead; outline_fwd.ts with
// K1290_FWD=0 is master's outline. k1279's base snapshots are untouched.
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const proto = dirname(fileURLToPath(import.meta.url));
const fwd = join(proto, "outline_fwd.ts");

export default {
  plugins: [
    {
      name: "k1290-outline-fwd",
      enforce: "pre",
      resolveId(source, importer) {
        if (!importer) return null;
        if (source !== "./outline" && source !== "./outline.ts") return null;
        const imp = importer.split("?")[0];
        if (resolve(dirname(imp)) !== resolve(proto)) return null;
        if (resolve(imp) === resolve(fwd)) return null;
        return fwd;
      },
    },
  ],
};
