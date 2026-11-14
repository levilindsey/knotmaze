// K1362 s15: a minimal GLSL preprocessor (#define flags, #if/#ifdef/#ifndef/#elif/#else/#endif with defined() and
// MAXP-style integer compares) to read a tier's live code. node k1362s15_pp.mjs <in.glsl> <out.glsl>
import { readFileSync, writeFileSync } from "node:fs";
const lines = readFileSync(process.argv[2], "utf8").split("\n");
const defs = new Map();
const out = [];
const stack = []; // {active, taken, parentActive}
const act = () => stack.every((s) => s.active);
function evalCond(e) {
  e = e.replace(/\/\/.*$/, "").trim();
  e = e.replace(/defined\s*\(\s*(\w+)\s*\)/g, (_, n) => (defs.has(n) ? "1" : "0"));
  e = e.replace(/\b([A-Za-z_]\w*)\b/g, (_, n) => (defs.has(n) ? (defs.get(n) || "1") : "0"));
  return !!Function(`return (${e});`)();
}
for (const l of lines) {
  const m = l.match(/^\s*#\s*(\w+)\s*(.*)$/);
  if (m && ["if", "ifdef", "ifndef", "elif", "else", "endif"].includes(m[1])) {
    const [, d, rest] = m;
    const r = rest.replace(/\/\/.*$/, "").trim();
    if (d === "if" || d === "ifdef" || d === "ifndef") {
      const pa = act();
      const c = pa && (d === "ifdef" ? defs.has(r) : d === "ifndef" ? !defs.has(r) : evalCond(r));
      stack.push({ active: c, taken: c });
    } else if (d === "elif") {
      const s = stack[stack.length - 1]; stack.pop(); const pa = act(); stack.push(s);
      const c = pa && !s.taken && evalCond(r); s.active = c; s.taken = s.taken || c;
    } else if (d === "else") {
      const s = stack[stack.length - 1]; stack.pop(); const pa = act(); stack.push(s);
      s.active = pa && !s.taken; s.taken = true;
    } else stack.pop();
    continue;
  }
  if (!act()) continue;
  const dm = l.match(/^\s*#define\s+(\w+)\s*(.*)$/);
  if (dm && !dm[1].includes("(")) { defs.set(dm[1], dm[2].replace(/\/\/.*$/, "").trim()); }
  if (l.trim() === "") continue;
  out.push(l);
}
writeFileSync(process.argv[3], out.join("\n"));
console.log(`${process.argv[3]}: ${out.length} live lines`);
