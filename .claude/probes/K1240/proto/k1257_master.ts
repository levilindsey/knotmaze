// K1257: master's form B (54a6b84d, before the closed-form corners) for the
// before/after tools. When formb_master.ts is missing, it is written next to
// this file from git (imports pointed at src/render/field) and the tool runs
// again in a child process: Vite's resolver, already started, does not see a
// file created after it.
import { execFileSync, execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const MASTER = "54a6b84d";
type Ctor = new (scene: never, params: { dpr: number }) => unknown;
export async function masterFormB(): Promise<Ctor> {
  const here = dirname(fileURLToPath(import.meta.url));
  const out = join(here, "formb_master.ts");
  if (!existsSync(out)) {
    const src = execSync(`git show ${MASTER}:src/render/field/form_b.ts`, { cwd: here, encoding: "utf8", maxBuffer: 1 << 26 });
    writeFileSync(out, src.replace(/from "\.\/(scene|geom|depth)"/g, 'from "../../../../src/render/field/$1"'));
    const runner = join(here, "../../../../scripts/run_node.mjs");
    try {
      execFileSync(process.execPath, [runner, ...process.argv.slice(1)], { stdio: "inherit" });
      process.exit(0);
    } catch (e) {
      process.exit((e as { status?: number }).status ?? 1);
    }
  }
  return ((await import("./formb_master")) as { FormB: Ctor }).FormB;
}
