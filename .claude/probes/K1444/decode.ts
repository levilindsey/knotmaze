import { parseParams } from "../../../src/ui/url_state";
const a: any = parseParams("?" + process.argv[2]);
const d: any = parseParams("?3");
for (const k of Object.keys(a)) if (JSON.stringify(a[k]) !== JSON.stringify(d[k])) console.log(k, JSON.stringify(d[k]), "->", JSON.stringify(a[k]));
