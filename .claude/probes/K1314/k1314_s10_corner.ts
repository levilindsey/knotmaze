import { buildModel } from "./k1314_census";
const m = buildModel("muse_hash"); const t = m.table as any;
for (const ci of [109, 110, 111]) { const c = t.corners[ci]; const o: any = {}; for (const k of Object.keys(c)) { const v = c[k]; o[k] = typeof v === "number" ? +v.toFixed(3) : Array.isArray(v) ? v.length > 6 ? `[${v.length}]` : v.map((x: any) => typeof x === "number" ? +x.toFixed(3) : x) : (v && typeof v === "object" ? "{..}" : v); } console.log(ci, JSON.stringify(o)); }
