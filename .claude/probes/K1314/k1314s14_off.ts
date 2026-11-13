// K1314 s14: with K1314S14_OFF=1 in the environment, every K1314S13 and K1314S14 flag off (8ff2b01f's outline = master). Import it first.
import { K1314S13, K1314S14 } from "../../../src/render/outline/outline";
if (process.env.K1314S14_OFF) for (const o of [K1314S13, K1314S14] as unknown as Record<string, boolean>[]) for (const k of Object.keys(o)) o[k] = false;
