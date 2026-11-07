// S3f edit helper: applies exact replacements to outline.ts via Node
// (never PowerShell text IO), preserving CRLF line endings.
// Usage: node .claude/probes/K1240/proto/s3f_apply.mjs <edits.json>
// edits.json: [{find, replace}, ...] with LF line endings.
import { readFileSync, writeFileSync } from "node:fs";
const target = ".claude/probes/K1240/proto/outline.ts";
const edits = JSON.parse(readFileSync(process.argv[2], "utf8"));
let text = readFileSync(target, "utf8").replace(/\r\n/g, "\n");
for (const [i, e] of edits.entries()) {
  const n = text.split(e.find).length - 1;
  if (n !== 1) { console.error(`edit ${i}: found ${n} matches for ${JSON.stringify(e.find.slice(0, 80))}`); process.exit(1); }
  text = text.replace(e.find, e.replace);
}
writeFileSync(target, text.replace(/\n/g, "\r\n"));
console.log(`applied ${edits.length} edits`);
