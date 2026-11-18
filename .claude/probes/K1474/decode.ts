// K1474: print the decoded params of a compact link token.
import { paramsFromQuery } from "../../../src/ui/url_state";
const q = process.argv[2];
const p = paramsFromQuery(q);
console.log(JSON.stringify({ background: p.background, backgroundIntensity: p.backgroundIntensity, threadLook: p.threadLook, fadeLength: p.fadeLength, mazePalette: (p as unknown as Record<string, unknown>).mazePalette, sectionScheme: (p as unknown as Record<string, unknown>).sectionScheme }, null, 1));
