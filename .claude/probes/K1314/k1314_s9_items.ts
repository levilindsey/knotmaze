// K1314 s9: which fill item paints each spot of a window, and its colour: an ASCII map (one letter per
// item) of a (2 h)-wide window around (x, y), the legend (item kind, chain, piece, junction) and the
// colour along one row, to attribute a hard edge inside the fill to the item boundary under it.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s9_items.ts <scene> <x> <y> [--w=2] [--n=32]
import { buildModel, rasterOutline } from "./k1314_census";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const [nm, xs, ys] = args.filter((a) => !a.startsWith("--"));
const m = buildModel(nm); const x = +xs; const y = +ys; const h = m.scene.look.halfWidth;
const wd = Number(opt("w") ?? 2) * h; const n = Number(opt("n") ?? 32); const ppu = n / wd;
const c0 = Math.round((x - wd / 2) * ppu); const r0 = Math.round((y - wd / 2) * ppu);
const R = rasterOutline(m, c0, r0, n, n, ppu);
const ids = new Map<number, string>(); const L = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const rows: string[] = [];
for (let r = 0; r < n; r++) {
  let s = "";
  for (let c = 0; c < n; c++) {
    const i = r * n + c; const it = R.item[i];
    if (R.ink[i] > 0.5) { s += "#"; continue; }
    if (it < 0) { s += "."; continue; }
    if (!ids.has(it)) ids.set(it, L[ids.size % L.length]);
    s += ids.get(it);
  }
  rows.push(s);
}
console.log(`${nm} (${x}, ${y}) window ${wd.toFixed(3)} n ${n} h ${h} (# = ink > .5)`);
for (const s of rows) console.log("  " + s);
for (const [it, ch] of ids) {
  const I = m.fs.items[it] as unknown as Record<string, unknown>;
  const extra = I.kind === "junc" ? ` ji ${I.ji} owner ${I.owner} arms ${(I.arms as { pi: number; ai: number }[]).map((a) => `c${a.pi}/a${a.ai}`).join(" ")}` : ` pi ${I.pi} piece ${I.piece ?? "-"} iv ${I.iv ?? "-"} arm ${I.arm ?? "-"}`;
  console.log(`${ch} item ${it} ${I.kind}${extra}`);
}
const row = Number(opt("row") ?? n >> 1);
console.log(`row ${row} rgb: ` + Array.from({ length: n }, (_, c) => { const i = row * n + c; return R.rgb[3 * i] < 0 ? "-" : `${Math.round(255 * R.rgb[3 * i])}`; }).join(" "));
