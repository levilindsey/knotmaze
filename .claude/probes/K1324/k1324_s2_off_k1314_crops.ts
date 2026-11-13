// K1324 s2: k1314_crops.ts with the self-pass burial rule off (master's draw.ts), same arguments - the "master" panels.
//   node scripts/run_node.mjs .claude/probes/K1324/k1324_s2_off_k1314_crops.ts (the name keeps k1314_crops main guard) <census tag> --out=<dir> --kinds=none --spots=... --px=480
import * as D from "../../../src/render/outline/draw";
D.buryOpts.on = false;
await import("../K1314/k1314_crops");
