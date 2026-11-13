import { readPng } from "./.claude/probes/K1314/k1314_crops";
const [a, b] = process.argv.slice(2).map((f) => readPng(f));
let n = 0; let mx = 0; for (let i = 0; i < a.px.length; i += 3) { const d = Math.max(Math.abs(a.px[i] - b.px[i]), Math.abs(a.px[i + 1] - b.px[i + 1]), Math.abs(a.px[i + 2] - b.px[i + 2])); if (d > 8) n++; if (d > mx) mx = d; }
console.log(`${process.argv[2].split(/[\\/]/).pop()} vs ${process.argv[3].split(/[\\/]/).pop()}: ${n} px differ by > 8, max ${mx}`);
