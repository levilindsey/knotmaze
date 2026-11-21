// K1482 s34b: the fragment sources rp=gf's app pass compiles (gf_app.ts: GfPass(g, false, ..., { home, pack, kRetry })),
// in characters, per program and in total: the rest programs, and the look programs (lookForm, what tlk=border draws).
// A fake WebGL2 context; nothing compiles. <srcRoot> is a checkout (or a `git archive` of one) holding src/.
//   npx tsx src34.ts <srcRoot> [dumpDir]     (dumpDir: writes each program's source, for a real compile check)
import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , rootArg, dump] = process.argv;
const root = resolve(rootArg ?? ".");
const { GfPass } = await import(pathToFileURL(join(root, "src/render/gpu_field/gf_pass.ts")).href);
const { GF_VS } = await import(pathToFileURL(join(root, "src/render/gpu_field/gf_glsl.ts")).href);
if (dump) { mkdirSync(dump, { recursive: true }); writeFileSync(join(dump, "vs.vert"), GF_VS); }
const gl: any = new Proxy({ VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4 } as any, {
  get: (t, k) => (k in t ? t[k] : () => ({})),
});
for (const kRetry of [true, false]) {
  const P: any = new GfPass(gl, false, undefined, undefined, false, { home: true, pack: true, kRetry });
  const sets: [string, any[]][] = [["rest", P.progs], ["look", P.lplan(false)]];
  let total = 0; const lines: string[] = [];
  for (const [name, progs] of sets) progs.forEach((p: any, i: number) => {
    const s: string = p.src; total += s.length;
    const h = createHash("md5").update(s).digest("hex").slice(0, 10);
    lines.push(`  ${name}[${i}] ${p.tier ? "tier" : "full"}${p.when ? " " + JSON.stringify(p.when) : ""}: ${s.length} chars ${h}`);
    if (dump) { mkdirSync(dump, { recursive: true }); writeFileSync(join(dump, `${kRetry ? "k" : "k0"}_${name}${i}.frag`), s); }
  });
  console.log(`${root} kRetry ${kRetry}: ${total} chars in ${lines.length} programs`);
  for (const l of lines) console.log(l);
}
