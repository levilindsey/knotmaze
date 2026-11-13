// K1314 s13: with K1314S13_OFF=1 in the environment, every K1314S13 flag off (286ad719's outline = s12). Import it first.
import { K1314S13 } from "../../../src/render/outline/outline";
if (process.env.K1314S13_OFF) for (const k of Object.keys(K1314S13)) (K1314S13 as Record<string, boolean>)[k] = false;
