// K1314 s12: with K1314S12_OFF=1 in the environment, every K1314S12 flag off (91fff3ed's outline). Import it first.
import { K1314S12 } from "../../../src/render/outline/outline";
if (process.env.K1314S12_OFF) for (const k of Object.keys(K1314S12)) (K1314S12 as Record<string, boolean>)[k] = false;
