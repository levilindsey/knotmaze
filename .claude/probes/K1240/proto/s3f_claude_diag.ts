// K1240 S3f (Claude): frame()'s diagnostics matching a pattern.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3f_claude_diag.ts <scene> [regex]
import { readFileSync } from "node:fs";
import { structure, frame, type SceneIn } from "./outline";

const name = process.argv[2] ?? "ring";
const re = new RegExp(process.argv[3] ?? "crossing|miss|runs");
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const st = structure(scene);
const t = frame(st, scene);
for (const d of (t.diagnostics ?? []) as string[]) if (re.test(d)) console.log(d.slice(0, 600));
