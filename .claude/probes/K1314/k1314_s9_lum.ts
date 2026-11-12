import { buildModel, rasterOutline } from "./k1314_census";
const m = buildModel("g41_user_tw64"); const h = m.scene.look.halfWidth;
const x = +process.argv[2], y = +process.argv[3], W = +process.argv[4] * h, n = 48, ppu = n / W;
const R = rasterOutline(m, Math.round((x - W / 2) * ppu), Math.round((y - W / 2) * ppu), n, n, ppu);
const ch = " .:-=+*%@";
for (let r = 0; r < n; r++) { let s = ""; for (let c = 0; c < n; c++) { const i = r * n + c; if (R.ink[i] > 0.5) { s += "#"; continue; } if (R.rgb[3 * i] < 0) { s += "_"; continue; } const lum = 0.3 * R.rgb[3 * i] + 0.59 * R.rgb[3 * i + 1] + 0.11 * R.rgb[3 * i + 2]; s += ch[Math.max(0, Math.min(8, Math.round((0.75 - lum) * 40)))]; } console.log(s); }
