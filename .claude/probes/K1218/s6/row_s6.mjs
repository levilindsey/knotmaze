import { readFileSync } from "node:fs";
import { decodePNG } from "../s5/png.mjs";
const [y, x0, x1, ...files] = process.argv.slice(2);
for (const f of files) { const { W, ch, data } = decodePNG(readFileSync(f)); const out = []; for (let x = +x0; x <= +x1; x++) { const i = (+y * W + x) * ch; out.push(Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2])); } console.log(f.split(/[\\/]/).slice(-3).join("/").padEnd(22), out.join(" ")); }
