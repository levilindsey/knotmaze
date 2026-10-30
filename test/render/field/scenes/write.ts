// K868 S1b: regenerates the synthetic scene fixtures beside gen.ts.
//   node scripts/run_node.mjs test/render/field/scenes/write.ts
import { writeFixtures } from "./gen";

console.log(writeFixtures().join(" "));
