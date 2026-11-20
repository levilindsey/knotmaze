import { readFileSync, writeFileSync } from "node:fs";
const p = ".claude/probes/K1436/k1436_s3_table.mjs";
let s = readFileSync(p, "utf8");
const dupLines = '    for (const [k, v] of Object.entries(mc)) (tot[k] ??= [0, 0])[0] += v;\r\n    for (const [k, v] of Object.entries(sc)) (tot[k] ??= [0, 0])[1] += v;\r\n';
const idx = s.lastIndexOf(dupLines);
if (idx < 0) { console.log("pattern not found"); process.exit(1); }
s = s.slice(0, idx) + s.slice(idx + dupLines.length);
// mark the duplicate per-scene row and add the totals note
s = s.replace('per.push(`| ${s} |', 'per.push(`| ${s}${dup ? " (dup of " + DEDUP_OF[s] + ", K1479)" : ""} |');
const anchor = 'writeFileSync(out, L.join("\\n"));';
s = s.replace(anchor, 'if (scenes.includes("user_tw42.lightpaper") && scenes.includes("g41_user_tw42")) L.push("", "K1479: user_tw42.lightpaper duplicates g41_user_tw42\'s physics state by design; the totals above count the pair once (its per-scene row still shows its own finds).");\n' + anchor);
writeFileSync(p, s);
console.log("s3 table patched");
