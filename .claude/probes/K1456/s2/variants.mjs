// K1456 s2: compile-time variants of one gf fragment source, for ctime.mjs.
//   node variants.mjs <in.frag> <outDir> stubs [minBodyChars=1500]   one file per top-level function, its body
//                                                                     replaced by a default return (attribution)
//   node variants.mjs <in.frag> <outDir> list                          the functions and their body sizes
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const [, , inPath, outDir, mode = "list", minArg = "1500", ...names] = process.argv;
// a minimal preprocessor: keeps the active branch of every #if / #ifdef / #ifndef / #elif / #else (object-like
// #defines evaluated as numbers), so brace matching sees one body per function. #define lines stay (macros).
function pp(text) {
  const defs = new Map(); const out = []; const stack = []; // {active, taken, parentActive}
  const live = () => stack.every((s) => s.active);
  const evalExpr = (e) => {
    const x = e.replace(/\/\/.*$/, "").replace(/defined\s*\(\s*(\w+)\s*\)|defined\s+(\w+)/g, (_, a, b) => (defs.has(a ?? b) ? "1" : "0"))
      .replace(/\b[A-Za-z_]\w*\b/g, (n) => { const v = defs.get(n); return v !== undefined && /^-?\d+(\.\d+)?$/.test(v) ? v : "0"; });
    return !!Function(`return (${x});`)();
  };
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*#\s*(\w+)\s*(.*)$/);
    if (m) {
      const [, d, rest] = m;
      if (d === "ifdef" || d === "ifndef") { const on = defs.has(rest.trim().split(/\s/)[0]) === (d === "ifdef"); stack.push({ active: on, taken: on }); continue; }
      if (d === "if") { const on = live() && evalExpr(rest); stack.push({ active: on, taken: on }); continue; }
      if (d === "elif") { const s = stack.at(-1); const pl = stack.slice(0, -1).every((t) => t.active); const on = !s.taken && pl && evalExpr(rest); s.active = on; s.taken ||= on; continue; }
      if (d === "else") { const s = stack.at(-1); s.active = !s.taken; s.taken = true; continue; }
      if (d === "endif") { stack.pop(); continue; }
      if (!live()) continue;
      if (d === "define") { const mm = rest.match(/^(\w+)(\([^)]*\))?\s*(.*)$/); if (mm && !mm[2]) defs.set(mm[1], mm[3].replace(/\/\/.*$/, "").trim()); else if (mm) defs.set(mm[1], "fn"); }
      if (d === "undef") defs.delete(rest.trim());
      out.push(line); continue;
    }
    if (live()) out.push(line);
  }
  return out.join("\n");
}
const src = pp(readFileSync(inPath, "utf8"));
if (mode === "pp") { writeFileSync(outDir, src); process.exit(0); }
// top-level function definitions: a line starting at column 0 with "<type> <name>(" and an opening brace
const re = /^([A-Za-z_][\w]*(?:\s+[A-Za-z_][\w]*)?)\s+([A-Za-z_]\w*)\s*\(([^)]*)\)\s*\{/gm;
const fns = [];
for (let m; (m = re.exec(src)); ) {
  const [all, type, name] = m;
  if (["if", "for", "while", "else", "return"].includes(name) || /^(uniform|in|out|const|precision|struct)\b/.test(type)) continue;
  const open = m.index + all.length - 1;
  let d = 0, i = open;
  for (; i < src.length; i++) { const c = src[i]; if (c === "{") d++; else if (c === "}") { d--; if (d === 0) break; } }
  fns.push({ type: type.trim().split(/\s+/).pop(), name, open, close: i, body: i - open });
}
const def = { float: "0.0", int: "0", uint: "0u", bool: "false", vec2: "vec2(0.0)", vec3: "vec3(0.0)", vec4: "vec4(0.0)", ivec2: "ivec2(0)", ivec3: "ivec3(0)", ivec4: "ivec4(0)", uvec4: "uvec4(0u)", uvec2: "uvec2(0u)", mat2: "mat2(1.0)" };
if (mode === "list") {
  for (const f of [...fns].sort((a, b) => b.body - a.body)) console.log(`${String(f.body).padStart(6)} ${f.type} ${f.name}`);
} else if (mode === "stubs") {
  mkdirSync(outDir, { recursive: true });
  for (const f of fns) {
    if (f.body < +minArg || f.name === "main" || (names.length && !names.includes(f.name))) continue;
    if (f.type !== "void" && !(f.type in def)) { console.log(`skip ${f.name} (${f.type})`); continue; }
    const body = f.type === "void" ? "{ }" : `{ return ${def[f.type]}; }`;
    writeFileSync(`${outDir}/stub_${f.name}.frag`, src.slice(0, f.open) + body + src.slice(f.close + 1));
    console.log(`stub_${f.name} ${f.body}`);
  }
}
