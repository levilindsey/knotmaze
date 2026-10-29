// K1000 stage 1: run the suite with src/render/field/oracle.ts swapped for a
// probe oracle, without touching src (a census may be serving it):
//   $env:ORACLE19 = "m19"; npx vitest run --config .claude/probes/S3a/vitest19.config.ts [test/render/field]
// ORACLE19=<name> picks .claude/probes/S3a/oracle_<name>.ts (default m19).
// Every import that resolves to the src oracle (the tests' and src's own
// "./oracle") gets the probe instead.
import { resolve } from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

const root = resolve(__dirname, "../../..");
const norm = (p: string): string => p.replace(/\\/g, "/").toLowerCase();
const probe = resolve(__dirname, `oracle_${process.env.ORACLE19 ?? "m19"}.ts`);
const target = norm(resolve(root, "src/render/field/oracle.ts"));

export default defineConfig({
  root,
  plugins: [
    {
      name: "oracle19",
      enforce: "pre",
      async resolveId(source, importer, options) {
        if (!/oracle(\.ts)?$/.test(source)) return null;
        const r = await this.resolve(source, importer, { ...options, skipSelf: true });
        return r && norm(r.id.split("?")[0]) === target ? probe : null;
      },
    },
  ],
  test: {
    exclude: [...configDefaults.exclude, "**/.claude/**"],
    testTimeout: 30000,
  },
});
