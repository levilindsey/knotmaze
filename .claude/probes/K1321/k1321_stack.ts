// K1321: stack PNGs vertically.  node scripts/run_node.mjs .claude/probes/K1321/k1321_stack.ts <a.png> <b.png> ... <out.png>
import { readPng, writePng } from "../K1314/k1314_crops";
const fs = process.argv.slice(2, -1); const out = process.argv[process.argv.length - 1];
const ims = fs.map((f) => readPng(f)); const W = Math.max(...ims.map((i) => i.W)); const H = ims.reduce((s, i) => s + i.H + 4, -4);
const o = new Uint8Array(W * H * 3).fill(255); let y0 = 0;
for (const im of ims) { for (let r = 0; r < im.H; r++) for (let c = 0; c < im.W; c++) for (let k = 0; k < 3; k++) o[3 * ((y0 + r) * W + c) + k] = im.px[3 * (r * im.W + c) + k]; y0 += im.H + 4; }
writePng(out, o, W, H); console.log(out);
