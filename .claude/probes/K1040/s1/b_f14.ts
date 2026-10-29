// K1040 S1c, step 3: S1b F14's mechanism over every #1 deep pixel whose winner
// is a side foot with F_CAP. Reads scenes.ts's dump of every deep pixel
// (DEEPMAX=1000000, its check1deep.sites with ij), and at each one traces the
// winning foot's burial: A (the winner's piece), each burier B of A's surface
// with w = B.ramp * B.selfW * A.ramp (capBoth) and winW(B) at A's outline
// point, and U = max over B of B.ramp * B.selfW * winW (the burial without
// A's own ramp). Classes:
// - own: A.ramp < 1 and U >= 0.99, a full member's tube holds the foot (F14);
// - own+bur: A.ramp < 1 and U < 0.99 (why: the burier's ramp, winW, selfW);
// - bur: A.ramp = 1, the burier's ramp < 1 (the burier is the one leaving);
// - other.
// Run: npx vite-node .claude/probes/K1040/s1/b_f14.ts <dumpDir> [scene...]
// Env: OUT (default out/s1c/f14), TAG, PARAMS (JSON merged into FormBParams).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, T_FOOT, type FormBParams, type Piece } from "../../../../src/render/field/form_b";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.OUT ?? join(here, "out", "s1c", "f14");
mkdirSync(outDir, { recursive: true });
const TAG = process.env.TAG ?? "";
const extra = JSON.parse(process.env.PARAMS ?? "{}") as FormBParams;
const dumpDir = process.argv[2];
const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const scenes = process.argv.slice(3).length ? process.argv.slice(3) : ALL;
const r3 = (v: number) => Math.round(v * 1000) / 1000;

interface Site { at: [number, number]; ij: [number, number]; F: number; ink: number; k: string }
const lines: string[] = [];
const json: Record<string, unknown> = {};
const tot: Record<string, { px: number; ink: number }> = {};
for (const name of scenes) {
  const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const dump = JSON.parse(readFileSync(join(dumpDir, `${name}.json`), "utf8")) as { check1deep: { sites: Site[] } };
  const fb = new FormB(s, extra);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const F = fb as any;
  const [a, b, c, d, e, f] = s.camera.worldToCss;
  const det = a * d - b * c;
  const cls: Record<string, { px: number; ink: number; worst: unknown[] }> = {};
  const P: Piece[] = [];
  for (const site of dump.check1deep.sites) {
    if (!/^foot\+f\d+$/.test(site.k)) continue;
    const fd = Number(site.k.slice(6));
    if (!(fd & 2)) continue;
    const [i, j] = site.ij;
    const u = i + 0.5 - e;
    const v = j + 0.5 - f;
    const x = (d * u - c * v) / det;
    const y = (-b * u + a * v) / det;
    const r = fb.evalPoint(x, y);
    fb.pieces(x, y, P);
    const t = r.term;
    let k = "other";
    let why = "";
    const rec: Record<string, unknown> = { at: [r3(x), r3(y)], F: site.F, ink: r3(r.ink) };
    if (t && t.kind === T_FOOT) {
      const A = P.find((q) => q.chain === t.chain && q.s === t.s);
      if (A) {
        const fx = A.fx + (fb.h * (x - A.fx)) / A.d;
        const fy = A.fy + (fb.h * (y - A.fy)) / A.d;
        let bur = 0;
        let U = 0;
        let Bw: Piece | null = null;
        let BU: Piece | null = null;
        let wwU = 0;
        for (const B of P) {
          if (B === A || B.surf !== A.surf) continue;
          const ww = F.winW(B, fx, fy) as number;
          const wf = B.ramp * B.selfW * A.ramp * ww;
          const wu = B.ramp * B.selfW * ww;
          if (wf > bur) {
            bur = wf;
            Bw = B;
          }
          if (wu > U) {
            U = wu;
            BU = B;
            wwU = ww;
          }
        }
        const burNow = 1 - t.w / A.selfW;
        Object.assign(rec, { A: [A.chain, r3(A.s), r3(A.ramp), r3(A.selfW)], burNow: r3(burNow), burPieces: r3(bur), U: r3(U), B: BU ? [BU.chain, r3(BU.ramp), r3(BU.selfW), r3(wwU)] : null, top: r.top });
        if (burNow > bur + 1e-9) k = "fill/F9";
        else if (A.ramp < 1 && U >= 0.99) k = "own";
        else if (A.ramp < 1) {
          k = "own+bur";
          why = !BU ? "none" : BU.ramp < 0.99 ? "Bramp" : wwU < 0.99 ? "winW" : "selfW";
        } else if (Bw && Bw.ramp < 1) k = "bur";
      }
    }
    const key = why ? `${k}:${why}` : k;
    const e1 = (cls[key] ??= { px: 0, ink: 0, worst: [] });
    e1.px++;
    e1.ink += r.ink;
    e1.worst.push(rec);
    const e2 = (tot[key] ??= { px: 0, ink: 0 });
    e2.px++;
    e2.ink += r.ink;
  }
  for (const v of Object.values(cls)) {
    (v.worst as { F: number }[]).sort((p, q) => q.F - p.F);
    v.worst = v.worst.slice(0, 5);
  }
  json[name] = cls;
  lines.push(`${name}: ${Object.entries(cls).map(([k1, v]) => `${k1} ${v.px}`).join(", ") || "none"}`);
}
lines.push(`All: ${Object.entries(tot).map(([k1, v]) => `${k1} ${v.px} px (mean ink ${(v.ink / v.px).toFixed(3)})`).join(", ")}`);
writeFileSync(join(outDir, `f14${TAG}.txt`), `${lines.join("\n")}\n`);
writeFileSync(join(outDir, `f14${TAG}.json`), JSON.stringify(json, null, 1));
for (const l of lines) console.log(l);
