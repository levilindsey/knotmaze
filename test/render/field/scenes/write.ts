// K868 S1b: regenerates the synthetic scene fixtures beside gen.ts.
//   npx vite-node test/render/field/scenes/write.ts
import { writeFixtures } from "./gen";

console.log(writeFixtures().join(" "));
