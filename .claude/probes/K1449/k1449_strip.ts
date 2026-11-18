import { readFileSync } from "node:fs";
import { writePng } from "../K1314/k1314_crops.ts";
// K1449: 4x strip of k1449_spots.ts panels (.bin, 480 px RGB) side by side.
//   node scripts/run_node.mjs .claude/probes/K1449/k1449_strip.ts <out.png> <a.bin> <b.bin> ...
const [out, ...files] = process.argv.slice(2);
const P = 480, G = 4, W = files.length * P + (files.length - 1) * G;
const img = new Uint8Array(W * P * 3).fill(128);
files.forEach((f, k) => { const b = readFileSync(f); for (let r = 0; r < P; r++) for (let c = 0; c < P; c++) for (let q = 0; q < 3; q++) img[3 * (r * W + k * (P + G) + c) + q] = b[3 * (r * P + c) + q]; });
writePng(out, img, W, P);
console.log(out);