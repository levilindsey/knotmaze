import { readFileSync } from "node:fs"; import { join } from "node:path"; import { pathToFileURL } from "node:url";
(globalThis as any).__padLog = [];
const [, , cap, under, over] = process.argv;
process.argv = [process.argv[0], process.argv[1], cap, join(process.env.TEMP!, "padlog_tab.json")];
await import(pathToFileURL(process.env.TABDIFF!).href);
for (const r of (globalThis as any).__padLog) if (r[0] === +under && r[1] === +over) console.log(JSON.stringify(r.map((v: number) => (typeof v === "number" ? +v.toFixed(3) : v))));
