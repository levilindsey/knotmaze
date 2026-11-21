// K1482 s37: the lengths (characters) of the gf shader sources a checkout builds, to compare two checkouts: the
// full fragment program (app and probe), its home form and its retry + home form (what a gfh=1 page compiles).
//   node scripts/run_node.mjs .claude/probes/K1482/s37/srclen37.ts [repo root of another checkout]
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const SRC = process.argv[2] ? resolve(process.argv[2]) : resolve(import.meta.dirname, "../../../..");
const G: any = await import(pathToFileURL(join(SRC, "src/render/gpu_field/gf_glsl.ts")).href);
const row = (name: string, f: () => string): void => { try { console.log(`${String(f().length).padStart(8)}  ${name}`); } catch (e) { console.log(`       -  ${name} (threw: ${String((e as Error).message).slice(0, 80)})`); } };
console.log(SRC);
for (const probe of [false, true]) {
  const tag = probe ? "probe" : "app";
  row(`gfFs(${tag}) full program, base text`, () => G.gfFs(probe, true));
  row(`homeForm(gfFs(${tag}))`, () => G.homeForm(G.gfFs(probe, true)));
  row(`retryForm(homeForm(gfFs(${tag})))`, () => G.retryForm(G.homeForm(G.gfFs(probe, true))));
}
