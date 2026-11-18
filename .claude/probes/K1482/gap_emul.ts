// K1482 s4: the mirror's ink with a CRUDE copy of the look's crossing gap (gf_look.ts lkCut / lkGap, no window,
// no K1458 bake, no fringe pass), to test whether the gap is what the screen has and eval.ts lacks.
//   npx tsx gap_emul.ts <tables.json> <sites.json> <out.json> <names|all> [R=24]
// Cut at a pixel: the label chain's nearest piece key kL; every piece m with pkey > kL + zt cuts by its distance d:
// e = d - h - G, fw = max(F max(sinT, 0.2), 2aa), kk = clamp((e + aa) / fw), cut = (1 - smooth(kk)) ss(h - aa, h + aa, d).
// G = gap + CUT_BIAS (0.04 + 0.03), F = fadeLength 0.14 (link A's values). Writes mirror_tiles' px layout.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [, , tp, sp, op, names, Rs] = process.argv; const R = +(Rs ?? 24);
const SRC = resolve(import.meta.dirname, "../../..");
const { GfEval, ss } = await import(pathToFileURL(join(SRC, "src/render/gpu_field/eval.ts")).href);
const raw = JSON.parse(readFileSync(tp, "utf8")); const T: any = {};
for (const [k, v] of Object.entries<any>(raw)) { if (v && typeof v === "object" && v.__t) { const C = (globalThis as any)[v.__t]; T[k] = C.from(v.v.map((x: any) => (x === "Inf" ? Infinity : x === "-Inf" ? -Infinity : x === "NaN" ? NaN : x))); } else T[k] = v; }
const SJ = JSON.parse(readFileSync(sp, "utf8")); const [a, , , d, e, f] = SJ.toDevA;
const G = 0.04 + 0.03, F = 0.14; const h = T.h, aa = T.aa, zt = T.zt;
const E: any = new GfEval(T); const out: any = {};
const want = names === "all" ? null : new Set(names.split(","));
for (const s of SJ.sites) {
  if (want && !want.has(s.site)) continue;
  const cx = Math.round(s.x), cy = Math.round(s.y); const px: number[][] = [];
  for (let ty = 0; ty < 2 * R; ty++) for (let tx = 0; tx < 2 * R; tx++) {
    const wx = (cx - R + tx + 0.5 - e) / a, wy = (cy - R + ty + 0.5 - f) / d;
    const o = E.eval(wx, wy); let ink = o.ink; let cut = 0;
    if (ink > 0 && o.chain >= 0) {
      let jL = -1; for (let j = 0; j < E.np; j++) if (E.pc[j] === o.chain && (jL < 0 || E.pd[j] < E.pd[jL])) jL = j;
      if (jL >= 0) {
        const kL = E.pkey[jL]; const ul = Math.hypot(E.ptx[jL], E.pty[jL]) || 1;
        for (let m = 0; m < E.np; m++) {
          if (!(E.pkey[m] > kL + zt)) continue;
          const um = Math.hypot(E.ptx[m], E.pty[m]) || 1;
          const sinT = Math.abs((E.ptx[jL] * E.pty[m] - E.pty[jL] * E.ptx[m]) / (ul * um));
          const dd = E.pd[m]; const fw = Math.max(F * Math.max(sinT, 0.2), 2 * aa);
          const kk = Math.min(1, Math.max(0, (dd - h - G + aa) / fw));
          cut = Math.max(cut, (1 - kk * kk * (3 - 2 * kk)) * ss(h - aa, h + aa, dd));
        }
      }
    }
    px.push([ink * (1 - cut), o.cov, o.chain, o.winKind, o.chain, cut]);
  }
  out[s.site] = { cx, cy, R, px };
}
writeFileSync(op, JSON.stringify(out)); console.log("wrote", Object.keys(out).length);
